// Adaptive boost polling — shared eligibility check.
//
// A game is "boost-eligible" any time it's live (in_progress or halftime),
// or within the pre-game window so game_starting fires within ~60s of tipoff.
// The 5-min baseline cron remains a safety net in case the chain drops.

const PRE_GAME_BOOST_MINUTES = 10;
// Extra buffer past scheduled start to handle late tip-offs.
const PRE_GAME_LATE_BUFFER_MINUTES = 15;

interface GameLike {
  status: string;
  period: number;
  startTime?: string;
}

export function isBoostEligible(game: GameLike): boolean {
  if (game.status === "halftime") return true;
  if (game.status === "in_progress") return true;
  // Pre-game window: boost for 10 min before tipoff through 15 min after (catches late starts).
  if (game.status === "scheduled" && game.startTime) {
    const now = Date.now();
    const tip = new Date(game.startTime).getTime();
    if (
      now >= tip - PRE_GAME_BOOST_MINUTES * 60_000 &&
      now <= tip + PRE_GAME_LATE_BUFFER_MINUTES * 60_000
    ) {
      return true;
    }
  }
  return false;
}

// Hard cap on chained boost polls per game. 240 hops × 60s = 4 hours.
// Real games finish in ~2.5h, so this only triggers if a game gets stuck in
// a weird state and ESPN stops advancing it.
export const MAX_BOOST_HOPS = 240;
