import webpush from "web-push";

// Lazy VAPID setup: configuring at module scope would throw at import time
// when the env vars are missing, taking down every route that imports this
// module (scheduler included) instead of just failing the push send.
let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.error("VAPID keys are not set — skipping push send");
    return false;
  }
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:test@example.com",
    publicKey,
    privateKey
  );
  vapidConfigured = true;
  return true;
}

interface PushSubscriptionData {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: object
): Promise<{ success: boolean; gone?: boolean }> {
  if (!ensureVapid()) {
    return { success: false };
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dhKey,
          auth: subscription.authKey,
        },
      },
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    // 404 or 410 = subscription no longer valid, should be deleted
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { success: false, gone: true };
    }
    console.error("Push notification failed:", error.statusCode, error.message);
    return { success: false };
  }
}
