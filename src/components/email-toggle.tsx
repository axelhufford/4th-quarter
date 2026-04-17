"use client";

import { useState } from "react";

interface EmailToggleProps {
  enabled: boolean;
  email: string;
}

export function EmailToggle({ enabled: initialEnabled, email }: EmailToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { kind: "sent" } | { kind: "failed"; message: string } | null
  >(null);

  const toggle = async () => {
    const newValue = !enabled;
    setEnabled(newValue);
    setSaving(true);

    try {
      const res = await fetch("/api/email-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newValue }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch {
      setEnabled(!newValue); // revert on failure
    }

    setSaving(false);
  };

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-email", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTestResult({ kind: "sent" });
      } else {
        // Surface the server's message (covers 429 cooldown, 500, etc.)
        // so users don't just see "Failed" when it's a temporary limit.
        setTestResult({
          kind: "failed",
          message: data.error || "Failed — try again",
        });
      }
    } catch {
      setTestResult({ kind: "failed", message: "Failed — try again" });
    }
    setTesting(false);
  };

  return (
    <div className="space-y-3">
      <div
        className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
          enabled
            ? "border-orange-500/30 bg-orange-500/5"
            : "border-zinc-800 bg-zinc-900"
        }`}
      >
        <div>
          <div className="font-medium text-zinc-100">Email Notifications</div>
          <div className="text-sm text-zinc-400">
            {enabled
              ? `Alerts will be sent to ${email}`
              : "Get game alerts delivered to your email"}
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle Email Notifications"
          className={`relative w-12 h-7 rounded-full transition-colors ${
            enabled ? "bg-orange-500" : "bg-zinc-700"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <button
          onClick={sendTest}
          disabled={testing}
          className="w-full p-3 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {testing
            ? "Sending..."
            : testResult?.kind === "sent"
            ? "✓ Test email sent! Check your inbox"
            : testResult?.kind === "failed"
            ? testResult.message
            : "Send Test Email"}
        </button>
      )}
    </div>
  );
}
