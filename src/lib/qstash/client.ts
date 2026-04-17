// Thin wrapper around @upstash/qstash for the adaptive boost-polling chain.
//
// Why this exists:
//   - Scheduler and poll-game both need to publish delayed messages to
//     /api/poll-game?gameId=X with the same shape. Centralizing here keeps
//     headers, delay, and URL construction consistent.
//   - `Client` lazily reads QSTASH_TOKEN from env, but constructing it at
//     module scope would fail on local builds without the token. We lazy-init
//     inside the helper instead.
//
// We intentionally DON'T use deduplicationId — trigger detection already
// dedupes via CAS on gameStates.notificationsSent, so a duplicate poll costs
// one cheap DB read and nothing else.

import { Client } from "@upstash/qstash";

let clientInstance: Client | null = null;

function getClient(): Client {
  if (!clientInstance) {
    clientInstance = new Client({ token: process.env.QSTASH_TOKEN });
  }
  return clientInstance;
}

function getBaseUrl(): string {
  // NEXT_PUBLIC_APP_URL is the canonical app origin (already set in .env for
  // OAuth redirects). VERCEL_URL is Vercel's per-deployment host (no scheme).
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  throw new Error(
    "No base URL configured: set NEXT_PUBLIC_APP_URL or rely on VERCEL_URL"
  );
}

/**
 * Schedules a delayed one-shot poll of a single game.
 *
 * Delivered to `/api/poll-game?gameId=<id>` after `delaySeconds` (default 60),
 * carrying the shared CRON_SECRET so verifyCronSecret() accepts it.
 *
 * Throws on publish failure — callers should catch and log; the 5-min baseline
 * cron is the safety net.
 */
export async function scheduleBoostPoll(
  gameId: string,
  hopCount: number,
  delaySeconds: number = 60
): Promise<void> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    throw new Error("CRON_SECRET is not set");
  }

  const url = `${getBaseUrl()}/api/poll-game?gameId=${encodeURIComponent(gameId)}`;

  await getClient().publishJSON({
    url,
    body: { hopCount },
    delay: delaySeconds,
    headers: { "x-cron-secret": cronSecret },
  });
}
