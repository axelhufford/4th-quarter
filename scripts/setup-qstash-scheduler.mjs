/**
 * NOT CURRENTLY IN USE — kept as a fallback scheduler option.
 *
 * The production /api/scheduler trigger is the Cloudflare Worker in
 * cloudflare-worker/ (see its README). QStash has no recurring schedules;
 * it only carries the per-game boost-poll chain. If the worker ever goes
 * away, running this script is the one-command way to switch the 5-minute
 * trigger to QStash.
 *
 * One-time setup: creates a QStash recurring schedule that calls /api/scheduler
 * every 5 minutes. Run this once from your local machine; QStash handles it
 * from there.
 *
 * Usage:
 *   NEXT_PUBLIC_APP_URL=https://4th-quarter-sooty.vercel.app node scripts/setup-qstash-scheduler.mjs
 *
 * Or: temporarily set NEXT_PUBLIC_APP_URL in .env.local to the production URL,
 * run the script, then restore it to http://localhost:3000.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Client } from "@upstash/qstash";

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, "..", ".env.local");

function parseEnv(path) {
  const env = {};
  try {
    const lines = readFileSync(path, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = val;
    }
  } catch {
    console.error(`Could not read ${path}`);
    process.exit(1);
  }
  return env;
}

const env = parseEnv(envPath);
const QSTASH_TOKEN = env.QSTASH_TOKEN;
const CRON_SECRET = env.CRON_SECRET;
const APP_URL = (env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

const missing = [];
if (!QSTASH_TOKEN) missing.push("QSTASH_TOKEN");
if (!CRON_SECRET) missing.push("CRON_SECRET");
if (missing.length) {
  console.error(`Missing env vars in .env.local: ${missing.join(", ")}`);
  process.exit(1);
}
if (!APP_URL || APP_URL.includes("localhost")) {
  console.error(
    "\nNEXT_PUBLIC_APP_URL is still set to localhost.\n" +
      "Temporarily change it to the production URL before running:\n" +
      "  NEXT_PUBLIC_APP_URL=https://4th-quarter-sooty.vercel.app\n"
  );
  process.exit(1);
}

const SCHEDULER_URL = `${APP_URL}/api/scheduler`;
const client = new Client({ token: QSTASH_TOKEN });

// Remove any existing /api/scheduler schedules to avoid duplicates
console.log("Fetching existing QStash schedules…");
const existing = await client.schedules.list();
const dupes = (existing || []).filter((s) =>
  s.destination?.includes("/api/scheduler")
);

if (dupes.length > 0) {
  console.log(`Found ${dupes.length} existing scheduler schedule(s) — removing…`);
  for (const s of dupes) {
    await client.schedules.delete(s.scheduleId);
    console.log(`  Deleted ${s.scheduleId}`);
  }
}

// Create the recurring schedule
console.log(`\nCreating schedule → ${SCHEDULER_URL} every 5 minutes…`);
const schedule = await client.schedules.create({
  destination: SCHEDULER_URL,
  cron: "*/5 * * * *",
  headers: { "x-cron-secret": CRON_SECRET },
});

console.log(`\nSchedule created!`);
console.log(`  ID:          ${schedule.scheduleId}`);
console.log(`  Destination: ${SCHEDULER_URL}`);
console.log(`  Cron:        */5 * * * *`);
console.log(`\nDone. QStash will call ${SCHEDULER_URL} every 5 minutes.`);
console.log(
  `Restore NEXT_PUBLIC_APP_URL=http://localhost:3000 in .env.local if you changed it.`
);
