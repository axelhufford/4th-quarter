# 4q-scheduler-cron

Cloudflare Worker that POSTs to `/api/scheduler` every 5 minutes.

> **Status (June 2026): deployed and serving as the production scheduler trigger.**
> Live at `https://4q-scheduler-cron.axelhufford.workers.dev` — the `/api/health`
> heartbeat lands seconds after each 5-minute boundary, which is this worker's cron.
> The GitHub Actions workflow (`.github/workflows/scheduler-cron.yml`) stays on as a
> throttled backup, and `scripts/setup-qstash-scheduler.mjs` is an unused alternative.

## Why a Cloudflare Worker?

- Vercel Hobby plan blocks sub-daily crons.
- GitHub Actions free tier throttles `*/5` schedules to roughly every 2 hours.
- Cloudflare Workers honors `*/5` reliably on the free plan (100k req/day; we use ~288).

The worker is a single file that fetches the scheduler endpoint with the `CRON_SECRET` Bearer token. The Vercel route's `verifyCronSecret` already accepts that header.

## One-time setup

```bash
cd cloudflare-worker
npx wrangler login                          # browser OAuth
npx wrangler secret put CRON_SECRET         # paste the secret value
npx wrangler deploy
```

After `deploy`, the worker is live and fires every 5 minutes.

## Verify

```bash
npx wrangler tail                           # streams worker logs in real time
```

Or hit the manual endpoint:

```bash
curl https://4q-scheduler-cron.<your-subdomain>.workers.dev/run
```

## Disabling cron-job.org

Once the worker has fired successfully for ~30 min, disable the cron-job.org job — the worker is now the primary trigger.
