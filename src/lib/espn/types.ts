// Types for the ESPN Scoreboard API response
// Endpoint: site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard

export interface ESPNScoreboardResponse {
  events: ESPNEvent[];
}

export interface ESPNEvent {
  id: string;
  date: string; // ISO date string
  status: {
    type: {
      id: string;
      name: string; // "STATUS_SCHEDULED" | "STATUS_IN_PROGRESS" | "STATUS_HALFTIME" | "STATUS_END_PERIOD" | "STATUS_FINAL"
      completed: boolean;
    };
    period: number; // current quarter (1-4, 5+ for OT)
    displayClock: string; // e.g., "5:30"
  };
  competitions: ESPNCompetition[];
}

export interface ESPNCompetition {
  id: string;
  competitors: ESPNCompetitor[];
}

export interface ESPNCompetitor {
  id: string; // ESPN team ID
  homeAway: "home" | "away";
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    logo: string;
  };
  score: string; // score as string, e.g. "102"
}

// Our normalized game state
export interface GameState {
  gameId: string;
  status: "scheduled" | "in_progress" | "halftime" | "finished";
  period: number;
  // True when ESPN reports STATUS_END_PERIOD (between quarters). Used to
  // fire the 4th_quarter notification at Q3 end instead of waiting for Q4 tip.
  endOfPeriod: boolean;
  homeTeamEspnId: string;
  homeTeamName: string;
  homeTeamAbbr: string;
  homeScore: number;
  awayTeamEspnId: string;
  awayTeamName: string;
  awayTeamAbbr: string;
  awayScore: number;
  startTime: string;
}
