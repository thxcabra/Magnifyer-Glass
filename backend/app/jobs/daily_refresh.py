"""Daily refresh: keep the current NBA season + classifier output up to date.

Intended to run nightly via cron / Task Scheduler / Supabase pg_cron. Each
loader is idempotent (upsert with conflict targets), so re-running is safe.

What runs:
  1. Current season stats (Per100, advanced, hustle, per-game, MPG).
  2. Awards backfill, but only for players who don't have any awards rows yet
     (so newly-added rookies pick up their All-Rookie selections, etc.).
  3. Archetype classifier — re-evaluates every player with the fresh data.

Run:
    python -m app.jobs.daily_refresh [--season 2024-25]
"""

from __future__ import annotations

import argparse
import time
from datetime import datetime

from app.scrapers.nba_api_loader import (
    REQUEST_DELAY_SEC,
    load_advanced_dashboard,
    load_hustle_stats,
    load_league_dashboard,
    load_per_game_dashboard,
)


def _now() -> str:
    return datetime.now().strftime("%H:%M:%S")


def _current_season() -> str:
    """NBA season starts in October. Anything from Oct onward = season Y-(Y+1)."""
    now = datetime.now()
    if now.month >= 10:
        y = now.year
    else:
        y = now.year - 1
    return f"{y}-{str(y + 1)[-2:]}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", default=_current_season())
    parser.add_argument(
        "--skip-classify", action="store_true",
        help="Skip the classifier rerun (faster; useful for mid-day refreshes).",
    )
    args = parser.parse_args()
    season = args.season

    print(f"[{_now()}] Daily refresh — season {season}")

    for season_type in ("regular_season", "playoffs"):
        print(f"\n[{_now()}] {season_type}")

        n = load_league_dashboard(season, season_type)
        print(f"  stats: +{n}")
        time.sleep(REQUEST_DELAY_SEC)

        n = load_per_game_dashboard(season, season_type)
        print(f"  per_game: +{n}")
        time.sleep(REQUEST_DELAY_SEC)

        n = load_advanced_dashboard(season, season_type)
        print(f"  advanced: +{n}")
        time.sleep(REQUEST_DELAY_SEC)

        n = load_hustle_stats(season, season_type)
        print(f"  hustle: +{n}")
        time.sleep(REQUEST_DELAY_SEC)

    if not args.skip_classify:
        print(f"\n[{_now()}] Reclassifying archetypes...")
        from app.jobs.classify_archetypes import run as run_classifier
        run_classifier()

    print(f"\n[{_now()}] Daily refresh complete.")


if __name__ == "__main__":
    main()
