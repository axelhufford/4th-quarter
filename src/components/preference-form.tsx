"use client";

import { useState } from "react";

interface Preference {
  eventType: string;
  enabled: boolean;
  threshold?: number | null;
}

const EVENT_TYPES = [
  {
    type: "game_starting",
    label: "Game Starting",
    description: "Get notified when your team's game tips off",
  },
  {
    type: "halftime_ending",
    label: "2nd Half Starting",
    description: "Get notified when halftime ends and the 2nd half begins",
  },
  {
    type: "4th_quarter",
    label: "4th Quarter Starting",
    description: "Get notified when the 4th quarter is about to begin",
  },
  {
    type: "close_game",
    label: "Close Game Alert",
    description: "Get notified when the game is close in the 4th quarter",
    hasThreshold: true,
  },
  {
    type: "overtime",
    label: "Overtime Alert",
    description: "Get notified when a game goes to overtime",
  },
  {
    type: "game_ended",
    label: "Final Score",
    description: "Get the final score when your team's game ends",
  },
];

interface PreferenceFormProps {
  preferences: Preference[];
}

export function PreferenceForm({ preferences }: PreferenceFormProps) {
  const [prefs, setPrefs] = useState<Record<string, { enabled: boolean; threshold?: number }>>(
    () => {
      const map: Record<string, { enabled: boolean; threshold?: number }> = {};
      // Default: 4th_quarter enabled
      for (const et of EVENT_TYPES) {
        const existing = preferences.find((p) => p.eventType === et.type);
        map[et.type] = {
          enabled: existing ? existing.enabled : ["4th_quarter", "game_ended", "overtime"].includes(et.type),
          threshold: existing?.threshold ?? 5,
        };
      }
      return map;
    }
  );
  const [saving, setSaving] = useState<string | null>(null);

  const togglePref = async (eventType: string) => {
    const current = prefs[eventType];
    const newEnabled = !current.enabled;

    // Optimistic update
    setPrefs((prev) => ({
      ...prev,
      [eventType]: { ...prev[eventType], enabled: newEnabled },
    }));

    setSaving(eventType);
    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          enabled: newEnabled,
          threshold: current.threshold,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
    } catch {
      // Revert on failure
      setPrefs((prev) => ({
        ...prev,
        [eventType]: { ...prev[eventType], enabled: !newEnabled },
      }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-3">
      {EVENT_TYPES.map((et) => {
        const pref = prefs[et.type];
        return (
          <div
            key={et.type}
            className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
              pref.enabled
                ? "border-orange-500/30 bg-orange-500/5"
                : "border-zinc-800 bg-zinc-900"
            }`}
          >
            <div>
              <div className="font-medium text-zinc-100">{et.label}</div>
              <div className="text-sm text-zinc-400">{et.description}</div>
            </div>
            <button
              onClick={() => togglePref(et.type)}
              disabled={saving === et.type}
              role="switch"
              aria-checked={pref.enabled}
              aria-label={`Toggle ${et.label} notifications`}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                pref.enabled ? "bg-orange-500" : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
                  pref.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
