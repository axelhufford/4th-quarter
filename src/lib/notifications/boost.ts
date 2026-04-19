// Adaptive boost polling — shared eligibility check.
//
// A game is "boost-eligible" any time it's live (in_progress or halftime).
// The 60s chain engages from tip-off so every in-game transition
// (halftime_ending, 4th_quarter, close_game, overtime, game_ended) is caught
// within ~60s. The 5-min baseline cron remains a safety net in case the
// chain drops.

interface GameLike {
  status: string;
  period: number;
}

export function isBoostEligible(game: GameLike): boolean {
  if (game.status === "halftime") return true;
  if (game.status === "in_progress") return true;
  return false;
}

// Hard cap on chained boost polls per game. 240 hops × 60s = 4 hours.
// Real games finish in ~2.5h, so this only triggers if a game gets stuck in
// a weird state and ESPN stops advancing it.
export const MAX_BOOST_HOPS = 240;
