import { GameState } from "@/lib/espn/types";

export type EventType =
  | "game_starting"
  | "4th_quarter"
  | "halftime_ending"
  | "close_game";

interface PreviousState {
  status: string;
  period: number;
  homeScore: number;
  awayScore: number;
  notificationsSent: string[];
}

/**
 * Compare previous and current game state to determine which notification
 * events should fire. Returns only events that haven't already been sent.
 */
export function detectTriggers(
  prev: PreviousState,
  current: GameState
): EventType[] {
  const triggered: EventType[] = [];
  const sent = new Set(prev.notificationsSent);

  // Game starting: was scheduled, now in progress
  if (prev.status === "scheduled" && current.status === "in_progress") {
    if (!sent.has("game_starting")) {
      triggered.push("game_starting");
    }
  }

  // Halftime ending: period changed from 2 to 3
  if (prev.period <= 2 && current.period >= 3 && current.status === "in_progress") {
    if (!sent.has("halftime_ending")) {
      triggered.push("halftime_ending");
    }
  }

  // 4th quarter starting: period changed from 3 to 4
  if (prev.period <= 3 && current.period >= 4) {
    if (!sent.has("4th_quarter")) {
      triggered.push("4th_quarter");
    }
  }

  // Close game: in 4th quarter (or OT) and score difference is small
  // This one can fire multiple times so we use a different dedup key
  if (current.period >= 4 && current.status === "in_progress") {
    const diff = Math.abs(current.homeScore - current.awayScore);
    if (diff <= 5) {
      const closeKey = `close_game_p${current.period}`;
      if (!sent.has(closeKey)) {
        triggered.push("close_game");
      }
    }
  }

  return triggered;
}

/**
 * Returns the dedup key to store in notificationsSent after sending.
 */
export function dedupKey(event: EventType, period: number): string {
  if (event === "close_game") return `close_game_p${period}`;
  return event;
}
