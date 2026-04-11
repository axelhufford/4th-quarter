"use client";

import { useState } from "react";

interface Team {
  id: number;
  name: string;
  abbreviation: string;
  espnId: string;
  conference: string;
}

interface TeamPickerProps {
  teams: Team[];
  selectedIds: number[];
  onSave: (teamIds: number[]) => void;
}

export function TeamPicker({ teams, selectedIds, onSave }: TeamPickerProps) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(selectedIds)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (id: number) => {
    setSaved(false);
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(Array.from(selected));
    setSaving(false);
    setSaved(true);
  };

  const eastTeams = teams.filter((t) => t.conference === "East");
  const westTeams = teams.filter((t) => t.conference === "West");

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Eastern Conference
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {eastTeams.map((team) => (
            <button
              key={team.id}
              onClick={() => toggle(team.id)}
              className={`px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                selected.has(team.id)
                  ? "bg-orange-500 text-white ring-2 ring-orange-400"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {team.abbreviation}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Western Conference
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {westTeams.map((team) => (
            <button
              key={team.id}
              onClick={() => toggle(team.id)}
              className={`px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                selected.has(team.id)
                  ? "bg-orange-500 text-white ring-2 ring-orange-400"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {team.abbreviation}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || selected.size === 0}
        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
          saved
            ? "bg-green-600 text-white"
            : "bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
      >
        {saving
          ? "Saving..."
          : saved
          ? "Saved!"
          : `Save (${selected.size} team${selected.size !== 1 ? "s" : ""} selected)`}
      </button>
    </div>
  );
}
