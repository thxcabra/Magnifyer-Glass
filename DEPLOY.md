# Deployment

Three pieces, deployed independently. The web API is intentionally lightweight
(no Chromium / pandas — those only run in the offline jobs), so
it ships as a small, cheap, fast-booting container.

## Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

**Environment variables** (Vercel → Project → Settings → Env vars), set for
Production **and** Preview:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_API_BASE` | deployed backend URL, e.g. `https://magnifyer-api.onrender.com` |
| `NEXT_PUBLIC_SITE_URL` | the public site URL, e.g. `https://magnifyerglass.com` |

Both are required — `lib/api.ts` and `lib/site.ts` have no production fallback.
Build command `npm run build` (auto-detected). `next.config.ts` already
allowlists the image hosts (`cdn.nba.com`, `images.unsplash.com`,
`upload.wikimedia.org`).

## Backend → Render / Railway / Fly (always-on)

Uses the slim [backend/Dockerfile](backend/Dockerfile) (Python 3.12, installs
`requirements-web.txt` only). Any Docker host works.

**Zero-surprise-billing options:**
- **Render Free** — $0, impossible to be charged; sleeps after 15 min idle
  (~50 s cold start). Pair with an UptimeRobot ping to keep warm.
- **Render Starter** — $7/mo flat, no usage overage, always-on. Recommended.
- **Fly / Cloud Run** — generous free tiers; set a hard budget cap.

**Environment variables:**

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | service-role key (secret) |
| `API_CORS_ORIGINS` | comma-separated, e.g. `https://magnifyerglass.com,https://<project>.vercel.app` |
| `PORT` | injected by the host |

Health check path: `/health` → `{"status":"ok"}`.

## Database → Supabase (already hosted)

Schema migrations apply by pasting `db/migrations/*.sql` into the SQL editor in
order (PostgREST/service-key can't run DDL). The live features (scores,
schedule, standings, playoffs, box scores, player photos, news, recent game
logs) need **no schema** — they proxy public CDNs / RSS at request time with
short caches.

## Live data & cloud-safety

- **Works from the cloud:** everything served by the web API — it reads
  `cdn.nba.com` (header-gated, not IP-gated) and Google News RSS. Scores,
  schedule, standings, playoff bracket, box scores, play-by-play, recent game
  logs, player photos (Wikimedia) and news all run fine on any host.
- **Does NOT work from the cloud:** `stats.nba.com` (used by the nightly
  loaders / scrapers) blocks datacenter IPs. Run those off-platform.

## Keeping data fresh (the nightly/weekly jobs)

The catalog tables (players, season stats, awards, standings history) are
refreshed by jobs that use `nba_api` (stats.nba.com) + Playwright scrapers —
these must run from a **residential IP**:

- **Self-hosted GitHub runner** on your machine: set `runs-on: self-hosted` in
  [.github/workflows/cron-daily.yml](.github/workflows/cron-daily.yml).
- or **Windows Task Scheduler** running `python -m app.jobs.daily_refresh`.
- [.github/workflows/cron-weekly.yml](.github/workflows/cron-weekly.yml)
  (Supabase-only: `compute_stat_titles`) runs fine on
  hosted runners.

## Monitoring

- **UptimeRobot** (free): monitor the backend `/health` and the frontend URL.
- App logs: the host captures stdout from uvicorn.

## Production checklist

- [ ] Backend deployed (Docker), `/health` returns ok.
- [ ] `API_CORS_ORIGINS` includes the exact frontend domain(s).
- [ ] Frontend deployed; `NEXT_PUBLIC_API_BASE` + `NEXT_PUBLIC_SITE_URL` set.
- [ ] `curl https://<backend>/live/scoreboard` returns today's games.
- [ ] Nightly refresh scheduled on a residential IP.
- [ ] UptimeRobot monitors green.
