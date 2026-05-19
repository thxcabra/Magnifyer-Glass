# Magnifyer Glass

Pro-level NBA scouting platform. Compares prospects (NCAA / international) against current and historical NBA players using weighted cosine similarity across stats and biometrics, then classifies every player into one of 14 tactical archetypes.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 14 (App Router), TailwindCSS, ShadcnUI, Recharts |
| Backend | FastAPI (Python) |
| Database | Supabase (PostgreSQL, cloud) |
| Data ingest | `nba_api` + Playwright/BeautifulSoup |
| Math | scikit-learn (`MinMaxScaler`, cosine similarity) |

## Layout

```
magnifyer-glass/
├── backend/                # FastAPI service
│   ├── app/
│   │   ├── core/           # config + supabase client
│   │   ├── api/routes/     # players, compare, discovery
│   │   ├── services/       # similarity, normalization, archetypes
│   │   ├── scrapers/       # nba_api, NCAA (Sports-Reference), RealGM
│   │   ├── models/         # pydantic schemas
│   │   └── main.py
│   ├── requirements.txt
│   └── .env.example
├── db/migrations/          # Supabase SQL migrations
├── frontend/               # Next.js (initialized separately)
└── README.md
```

## Local setup

### 1. Database

Create a Supabase project, copy the URL + service-role key, then run [db/migrations/001_init_schema.sql](db/migrations/001_init_schema.sql) in the SQL editor.

### 2. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
copy .env.example .env  # then edit
uvicorn app.main:app --reload
```

Health check: `GET http://localhost:8000/health` → `{"status":"ok"}`.

### 3. Frontend

See [frontend/README.md](frontend/README.md).

## Data ingest

```powershell
# Bulk NBA load (active players, per-100 dashboard, hustle, combine history)
python -m app.scrapers.nba_api_loader --season 2024-25

# NCAA player (Sports-Reference slug)
python -m app.scrapers.ncaa_scraper --slug cooper-flagg-1 --player-id <uuid>

# International player (RealGM)
python -m app.scrapers.intl_scraper --realgm-id 12345 --slug Some-Player --player-id <uuid>
```

## Similarity engine

`Similarity = w_stats · cosine(stats_vec) + w_phys · cosine(phys_vec)` — default weights `0.70 / 0.30`. Vectors are MinMax-scaled per corpus. Physical metrics where lower is better (lane agility, three-quarter sprint) are inverted post-scaling so `1.0` always means "elite".

## Archetypes

14 percentile-threshold classifications: Helio-Centric Creator, Floor General, Microwave Scorer, 3-and-D, Lockdown POA Defender, Movement Shooter, Slashing Wing, Point Forward, Connective Glue, Stretch Big, Rim Protector, Post-Up Hub, Mobile Big, Glass Cleaner. See [backend/app/services/archetypes.py](backend/app/services/archetypes.py).

## Roadmap

1. ✅ Project skeleton, DB schema, similarity & archetype engines, route stubs, scrapers
2. ⏳ Wire NBA loader end-to-end on real Supabase project
3. ⏳ NCAA + International scrapers — batch runner for full draft class
4. ⏳ Precompute `similarity_cache` for every prospect
5. ⏳ Build Next.js UI: K-bar, comparison page (radar + body comp + percentile bars), discovery
6. ⏳ Cron jobs to refresh NBA daily, prospects weekly
