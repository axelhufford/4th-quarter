import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:test@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushSubscriptionData {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: object
): Promise<{ success: boolean; gone?: boolean }> {
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
