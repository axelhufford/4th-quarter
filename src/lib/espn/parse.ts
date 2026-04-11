import { ESPNEvent, GameState } from "./types";

function mapStatus(
  statusName: string,
  completed: boolean
): GameState["status"] {
  if (completed) return "finished";
  switch (statusName) {
    case "STATUS_SCHEDULED":
      return "scheduled";
    case "STATUS_HALFTIME":
      return "halftime";
    case "STATUS_IN_PROGRESS":
    case "STATUS_END_PERIOD":
      return "in_progress";
    case "STATUS_FINAL":
      return "finished";
    default:
      return "in_progress";
  }
}

export function parseEvent(event: ESPNEvent): GameState {
  const competition = event.competitions[0];
  const home = competition.competitors.find((c) => c.homeAway === "home")!;
  const away = competition.competitors.find((c) => c.homeAway === "away")!;

  return {
    gameId: event.id,
    status: mapStatus(
      event.status.type.name,
      event.status.type.completed
    ),
    period: event.status.period,
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
