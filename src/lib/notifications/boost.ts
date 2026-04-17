// Adaptive boost polling — shared eligibility check.
//
// A game is "boost-eligible" when it's close enough to a user-visible trigger
// moment (halftime_ending, 4th_quarter, close_game, overtime, game_ended) that
// the 5-min baseline cron's worst-case lag would feel bad.
//
// We intentionally do NOT look at the clock — period + status are enough and
// keep the check cheap. The 5-min cron still runs as a safety net in case the
// chain drops.

interface GameLike {
  status: string;
  period: number;
}

export function isBoostEligible(game: GameLike): boolean {
  // Halftime: next ESPN update will flip to Q3 and fire halftime_ending.
  if (game.status === "halftime") return true;
  // Q3 onward (while playing): catches 4th_quarter, close_game, overtime, game_ended.
  if (game.status === "in_progress" && game.period >= 3) return true;
  return false;
}

// Hard cap on chained boost polls per game. 240 hops × 60s = 4 hours.
// Real games finish in ~2.5h, so this only triggers if a game gets stuck in
// a weird state and ESPN stops advancing it.
export const MAX_BOOST_HOPS = 240;
