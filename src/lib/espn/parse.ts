import { ESPNEvent, GameState } from "./types";

function mapStatus(
  statusName: string,
  completed: boolean
): GameState["status"] {
  if (completed) return "finished";
  switch (statusName) {
    case "STATUS_SCHEDULED":
    case "STATUS_POSTPONED":
    case "STATUS_CANCELED":
    case "STATUS_DELAYED":
      return "scheduled";
    case "STATUS_HALFTIME":
      return "halftime";
    case "STATUS_IN_PROGRESS":
    case "STATUS_END_PERIOD":
      return "in_progress";
    case "STATUS_FINAL":
      return "finished";
    default:
      console.warn(`Unknown ESPN status: ${statusName}, treating as scheduled`);
      return "scheduled";
  }
}

export function parseEvent(event: ESPNEvent): GameState {
  const competition = event.competitions?.[0];
  if (!competition) {
    throw new Error(`ESPN event ${event.id} has no competitions`);
  }

  const home = competition.competitors.find((c) => c.homeAway === "home");
  const away = competition.competitors.find((c) => c.homeAway === "away");
  if (!home || !away) {
    throw new Error(`ESPN event ${event.id} missing home or away competitor`);
  }

  return {
    gameId: event.id,
    status: mapStatus(
      event.status.type.name,
      event.status.type.completed
    ),
    period: event.status.period ?? 0,
    endOfPeriod: event.status.type.name === "STATUS_END_PERIOD",
    homeTeamEspnId: home.team.id,
    homeTeamName: home.team.displayName,
    homeTeamAbbr: home.team.abbreviation,
    homeScore: parseInt(home.score, 10) || 0,
    awayTeamEspnId: away.team.id,
    awayTeamName: away.team.displayName,
    awayTeamAbbr: away.team.abbreviation,
    awayScore: parseInt(away.score, 10) || 0,
    startTime: event.date,
  };
}
