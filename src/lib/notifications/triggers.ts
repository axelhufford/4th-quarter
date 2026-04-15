import { GameState } from "@/lib/espn/types";

export type EventType =
  | "game_starting"
  | "4th_quarter"
  | "halftime_ending"
  | "close_game"
  | "overtime"
  | "game_ended";

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
 *
 * `closeGameThreshold` is the maximum point differential that counts as a
 * "close game". Callers should pass the highest threshold across all users
 * subscribed to either team — per-user filtering happens downstream.
 */
export function detectTriggers(
  prev: PreviousState,
  current: GameState,
  closeGameThreshold: number = 5
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

  // Close game: in 4th quarter (or OT) and score difference is within threshold
  // This one can fire multiple times (once per period) via different dedup keys
  if (current.period >= 4 && current.status === "in_progress") {
    const diff = Math.abs(current.homeScore - current.awayScore);
    if (diff <= closeGameThreshold) {
      const closeKey = `close_game_p${current.period}`;
      if (!sent.has(closeKey)) {
        triggered.push("close_game");
      }
    }
  }

  // Overtime: period increased beyond 4 (entering OT1, OT2, etc.)
  if (
    current.period > prev.period &&
    current.period > 4 &&
    current.status === "in_progress"
  ) {
    const otKey = `overtime_p${current.period}`;
    if (!sent.has(otKey)) {
      triggered.push("overtime");
    }
  }

  // Game ended: was not finished, now finished
  if (prev.status !== "finished" && current.status === "finished") {
    if (!sent.has("game_ended")) {
      triggered.push("game_ended");
    }
  }

  return triggered;
}

/**
 * Returns the dedup key to store in notificationsSent after sending.
 */
export function dedupKey(event: EventType, period: number): string {
  if (event === "close_game") return `close_game_p${period}`;
  if (event === "overtime") return `overtime_p${period}`;
  return event;
}
