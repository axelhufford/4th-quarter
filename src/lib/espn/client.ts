import { ESPNScoreboardResponse } from "./types";

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

export async function fetchScoreboard(): Promise<ESPNScoreboardResponse> {
  const res = await fetch(ESPN_SCOREBOARD_URL, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`ESPN API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
