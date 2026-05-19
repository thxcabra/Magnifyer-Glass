# Deployment

The platform is three pieces. Each can be deployed independently.

## Frontend → Vercel

The Next.js app deploys as-is to Vercel.

```bash
cd frontend
npx vercel --prod
```

**Environment variables (Vercel dashboard → Project → Settings → Env vars):**

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_API_BASE` | The deployed backend URL (e.g. `https://magnifyer-api.onrender.com`) |

Set the build command to `npm run build` (Vercel auto-detects). Output directory is `.next` (auto).

## Backend → Render / Fly / Railway

The FastAPI app needs Python 3.12. Render's free Python service is the simplest. Procfile:

```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Environment variables (provider dashboard):**

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | from Supabase Project Settings → API |
| `SUPABASE_SERVICE_KEY` | service-role key (secret) |
| `SUPABASE_ANON_KEY` | anon key (optional, used if frontend later talks to Supabase directly) |
| `API_CORS_ORIGINS` | comma-separated list, e.g. `https://magnifyer.vercel.app` |

Build command: `pip install -r requirements.txt && playwright install chromium`.

## Database → Supabase

Already hosted. Future migrations: paste the file contents from `db/migrations/` into the SQL editor in order. Current head: `012_search_returns_external_id.sql` (not applied; optional — the API enriches search responses application-side as a fallback).

## Nightly refresh

The platform stays fresh by re-pulling the current season + reclassifying. Run nightly:

```bash
python -m app.jobs.daily_refresh
```

**Local scheduling (Windows Task Scheduler):**

```powershell
$action = New-ScheduledTaskAction -Execute "C:\Users\joaov\OneDrive\Documentos\Coding\magnifyer-glass\backend\.venv\Scripts\python.exe" `
    -Argument "-m app.jobs.daily_refresh" `
    -WorkingDirectory "C:\Users\joaov\OneDrive\Documentos\Coding\magnifyer-glass\backend"
$trigger = New-ScheduledTaskTrigger -Daily -At 4am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "MagnifyerDailyRefresh"
```

**Cloud scheduling (recommended for production):**
- Render: add a Cron Job pointing at the same command.
- Supabase: pg_cron with a `pg_net.http_post` call to a deployed cron endpoint.

The refresh job is idempotent — running multiple times in a day is safe.

## Production checklist

- [ ] All migrations 001–011 applied to the Supabase project.
- [ ] Backend deployed, `/health` returns `{"status":"ok"}`.
- [ ] Frontend deployed, `NEXT_PUBLIC_API_BASE` points at the backend.
- [ ] CORS origins on the backend match the frontend domain.
- [ ] Nightly refresh scheduled.
