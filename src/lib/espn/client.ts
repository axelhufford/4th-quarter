import { ESPNScoreboardResponse } from "./types";

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

export async function fetchScoreboard(date?: string): Promise<ESPNScoreboardResponse> {
  const url = date
    ? `${ESPN_SCOREBOARD_URL}?dates=${date}`
    : ESPN_SCOREBOARD_URL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`ESPN API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}
