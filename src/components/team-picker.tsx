"use client";

import { useState } from "react";

interface Team {
  id: number;
  name: string;
  abbreviation: string;
  espnId: string;
  conference: string;
  logoUrl?: string | null;
}

interface TeamPickerProps {
  teams: Team[];
  selectedIds: number[];
  onSave: (teamIds: number[]) => Promise<void>;
  liveEspnIds?: string[];
}

export function TeamPicker({ teams, selectedIds, onSave, liveEspnIds = [] }: TeamPickerProps) {
  const liveSet = new Set(liveEspnIds);
  const [selected, setSelected] = useState<Set<number>>(
    new Set(selectedIds)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  const toggle = (id: number) => {
    setSaved(false);
    setError(false);
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
    setError(false);
    try {
      await onSave(Array.from(selected));
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
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
            <TeamButton key={team.id} team={team} selected={selected.has(team.id)} live={liveSet.has(team.espnId)} onToggle={() => toggle(team.id)} />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Western Conference
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {westTeams.map((team) => (
            <TeamButton key={team.id} team={team} selected={selected.has(team.id)} live={liveSet.has(team.espnId)} onToggle={() => toggle(team.id)} />
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
          error
            ? "bg-red-600 text-white"
            : saved
            ? "bg-green-600 text-white"
            : "bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
      >
        {saving
          ? "Saving..."
          : error
          ? "Failed — try again"
          : saved
          ? "Saved!"
          : `Save (${selected.size} team${selected.size !== 1 ? "s" : ""} selected)`}
      </button>
    </div>
  );
}

function TeamButton({ team, selected, live, onToggle }: { team: Team; selected: boolean; live: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
        selected
          ? "bg-orange-500 text-white ring-2 ring-orange-400"
          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
      }`}
    >
      {team.logoUrl ? (
        <img
          src={team.logoUrl}
          alt={team.name}
          className="w-8 h-8 object-contain"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold">
          {team.abbreviation}
        </div>
      )}
      <span className="text-[11px]">{team.abbreviation}</span>
      {live && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
      )}
    </button>
  );
}
