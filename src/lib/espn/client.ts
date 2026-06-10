import { ESPNScoreboardResponse } from "./types";

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

async function fetchOnce(url: string): Promise<ESPNScoreboardResponse> {
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

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchScoreboard(date?: string): Promise<ESPNScoreboardResponse> {
  const url = date
    ? `${ESPN_SCOREBOARD_URL}?dates=${date}`
    : ESPN_SCOREBOARD_URL;

  try {
    return await fetchOnce(url);
  } catch {
    // ESPN blips are common around tipoff when load spikes; one quick retry
    // absorbs most of them. Each attempt keeps its own 10s abort timeout.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return fetchOnce(url);
  }
}
