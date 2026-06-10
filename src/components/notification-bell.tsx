"use client";

import { useState, useSyncExternalStore } from "react";

// Notification.permission is external browser state, so we mirror it with
// useSyncExternalStore instead of effect-synced useState. Re-checks happen
// when the tab regains visibility (covers revoking access in browser
// settings) and on any re-render (covers requestPermission resolving).
function subscribePermission(onChange: () => void) {
  const onVisibility = () => {
    if (document.visibilityState === "visible") onChange();
  };
  document.addEventListener("visibilitychange", onVisibility);
  return () => document.removeEventListener("visibilitychange", onVisibility);
}

function getPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return "unsupported";
  }
  return Notification.permission;
}

export function NotificationBell() {
  const permission = useSyncExternalStore(
    subscribePermission,
    getPermission,
    () => "default" as const
  );
  const [subscribing, setSubscribing] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const subscribe = async () => {
    setSubscribing(true);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        alert("Push notifications aren't configured on this server. Please contact support.");
        setSubscribing(false);
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Request notification permission. No manual state update needed:
      // the setSubscribing re-render below re-reads Notification.permission.
      const perm = await Notification.requestPermission();

      if (perm !== "granted") {
        setSubscribing(false);
        return;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      // Send subscription to server
      const sub = subscription.toJSON();
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Couldn't save your subscription. Please try again.");
      }
    } catch (err) {
      console.error("Push subscription failed:", err);
      alert("Couldn't enable push notifications. Please try again.");
    }
    setSubscribing(false);
  };

  if (permission === "unsupported") {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    return (
      <div className="p-4 rounded-lg bg-zinc-800 text-zinc-400 text-sm">
        {isIOS ? (
          <>
            <p className="font-semibold text-zinc-200 mb-1">To get notifications on iPhone:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open this page in <span className="text-zinc-200">Safari</span> (required on iOS)</li>
              <li>Tap the <span className="text-zinc-200">Share</span> button (bottom of Safari)</li>
              <li>Tap <span className="text-zinc-200">Add to Home Screen</span></li>
              <li>Open the app from your home screen</li>
              <li>Come back here and enable notifications</li>
            </ol>
          </>
        ) : (
          "Push notifications are not supported in this browser."
        )}
      </div>
    );
  }

  const sendTest = async () => {
    setSubscribing(true);
    setTestStatus(null);
    try {
      const res = await fetch("/api/test-notification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestStatus(data.error || "Failed to send test");
      } else {
        setTestStatus(`Sent to ${data.sent} of ${data.total} device${data.total === 1 ? "" : "s"}`);
      }
    } catch {
      setTestStatus("Failed to send test notification");
    }
    setSubscribing(false);
  };

  if (permission === "granted") {
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-lg bg-green-900/30 border border-green-700/30 text-green-400 text-sm flex items-center gap-2">
          <span className="text-lg">&#x2713;</span>
          Notifications enabled — you&apos;ll be alerted when your games matter!
        </div>
        <button
          onClick={sendTest}
          disabled={subscribing}
          className="w-full p-3 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {subscribing ? "Sending..." : testStatus ?? "Send Test Notification"}
        </button>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="p-4 rounded-lg bg-zinc-800 text-zinc-400 text-sm">
        <p className="font-semibold text-zinc-200 mb-1">Notifications are blocked</p>
        <p>
          Enable them in your browser settings (lock icon in the address bar →
          allow notifications), then reload this page.
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={subscribing}
      className="w-full p-4 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
    >
      {subscribing
        ? "Enabling..."
        : "Enable Push Notifications"}
    </button>
  );
}
