// Cloudflare Worker that fires the 4th Quarter scheduler every 5 minutes.
//
// Why this exists: Vercel Hobby blocks sub-daily crons and GitHub Actions
// throttles free-tier scheduled workflows to ~2-hour intervals. Cloudflare
// Workers honors */5 reliably on the free tier (100k requests/day allotment,
// of which we use ~288).

const SCHEDULER_URL = "https://4th-quarter-sooty.vercel.app/api/scheduler";

export default {
  // Triggered by the cron in wrangler.toml.
  async scheduled(event, env, ctx) {
    const res = await fetch(SCHEDULER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CRON_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    if (!res.ok) {
      // Logged in `wrangler tail` and Workers dashboard. Throwing also flags
      // the run as failed in the dashboard's invocation list.
      console.error(`scheduler ${res.status}: ${text}`);
      throw new Error(`scheduler returned ${res.status}`);
    }
    console.log(`scheduler ok: ${text.slice(0, 200)}`);
  },

  // Optional manual trigger for sanity-testing without waiting for cron tick.
  // Hit https://<worker>.<subdomain>.workers.dev/run from a browser; returns
  // the scheduler's JSON response.
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/run") {
      const res = await fetch(SCHEDULER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CRON_SECRET}`,
          "Content-Type": "application/json",
        },
      });
      return new Response(await res.text(), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      "4th Quarter cron worker — scheduled invocation only. Use /run to trigger manually.",
      { status: 200 }
    );
  },
};
