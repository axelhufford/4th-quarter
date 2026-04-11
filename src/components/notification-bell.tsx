"use client";

import { useState, useEffect } from "react";

export function NotificationBell() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const subscribe = async () => {
    setSubscribing(true);
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setSubscribing(false);
        return;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Send subscription to server
      const sub = subscription.toJSON();
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
        }),
      });
    } catch (err) {
      console.error("Push subscription failed:", err);
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

  if (permission === "granted") {
    return (
      <div className="p-4 rounded-lg bg-green-900/30 border border-green-700/30 text-green-400 text-sm flex items-center gap-2">
        <span className="text-lg">&#x2713;</span>
        Notifications enabled — you'll be alerted when your games matter!
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
