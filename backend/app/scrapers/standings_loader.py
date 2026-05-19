"""End-of-season standings backfill via nba_api's LeagueStandings endpoint.

LeagueStandings returns a row per franchise per call with W/L, conference rank,
home/road splits, streak, etc. We call it once per season and persist to the
`team_standings` table.

    python -m app.scrapers.standings_loader [--season 2024-25] [--from 1996-97]
"""

from __future__ import annotations

import argparse
import math
import time
from typing import Any

from nba_api.stats.endpoints import LeagueStandings

from app.core.supabase_client import get_supabase
from app.scrapers.nba_api_loader import (
    REQUEST_DELAY_SEC,
    REQUEST_TIMEOUT_SEC,
    _with_retry,
)


def _seasons_default() -> list[str]:
    """Every regular-season string from 1996-97 → 2025-26."""
    out = []
    for y in range(1996, 2026):
        out.append(f"{y}-{str(y + 1)[-2:]}")
    return out


def _f(v: Any) -> float | None:
    if v is None or v == "":
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(f):
        return None
    return f


def _i(v: Any) -> int | None:
    f = _f(v)
    return int(f) if f is not None else None


def _conference(c: Any) -> str | None:
    if not c:
        return None
    s = str(c).strip().lower()
    if s.startswith("e"):
        return "East"
    if s.startswith("w"):
        return "West"
    return None


_TEAM_ABBR_CACHE: dict[int, str] = {}


def _team_abbr(sb, team_id: int) -> str:
    """Resolve team_id → abbreviation. LeagueStandings exposes city/name but
    not the 3-letter code, so we look it up from our teams table once."""
    if not _TEAM_ABBR_CACHE:
        teams = sb.table("teams").select("id, abbreviation").execute().data or []
        for t in teams:
            _TEAM_ABBR_CACHE[t["id"]] = t["abbreviation"]
    return _TEAM_ABBR_CACHE.get(team_id, "")


def fetch_standings_for(season: str) -> list[dict]:
    endpoint = _with_retry(
        lambda: LeagueStandings(season=season, timeout=REQUEST_TIMEOUT_SEC),
        f"standings {season}",
    )
    if endpoint is None:
        return []
    try:
        df = endpoint.standings.get_data_frame()
    except Exception:
        return []
    if df.empty:
        return []

    sb = get_supabase()
    rows: list[dict] = []
    for _, r in df.iterrows():
        d = r.to_dict()
        tid = int(d["TeamID"])
        rows.append({
            "team_id": tid,
            "team_abbr": _team_abbr(sb, tid),
            "season": season,
            "conference": _conference(d.get("Conference")),
            "division": (d.get("Division") or "").strip() or None,
            "wins": _i(d.get("WINS")),
            "losses": _i(d.get("LOSSES")),
            "win_pct": _f(d.get("WinPCT")),
            "conference_rank": _i(d.get("PlayoffRank") or d.get("ConferenceRank")),
            "division_rank": _i(d.get("DivisionRank")),
            "games_back": _f(d.get("ConferenceGamesBack") or d.get("GamesBack")),
            "home_record": (d.get("HOME") or d.get("HomeRecord") or "") or None,
            "road_record": (d.get("ROAD") or d.get("RoadRecord") or "") or None,
            "last_10": (d.get("L10") or d.get("Last10") or "") or None,
            "streak": (d.get("CurrentStreak") or d.get("Streak") or "") or None,
            "points_pg": _f(d.get("PointsPG")),
            "opp_points_pg": _f(d.get("OppPointsPG")),
            "point_diff_pg": _f(d.get("DiffPointsPG") or d.get("PointDiffPG")),
            "playoff_seed": _i(d.get("PlayoffSeeding") or d.get("PlayoffRank")),
        })
    return rows


def flush(sb, rows: list[dict]) -> None:
    if not rows:
        return
    sb.table("team_standings").upsert(rows, on_conflict="team_id,season").execute()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", help="Single season to fetch")
    parser.add_argument("--from", dest="from_season", help="Start season (inclusive)")
    parser.add_argument("--to", dest="to_season", help="End season (inclusive)")
    args = parser.parse_args()

    sb = get_supabase()
    if args.season:
        seasons = [args.season]
    else:
        all_seasons = _seasons_default()
        start = args.from_season or all_seasons[0]
        end = args.to_season or all_seasons[-1]
        seasons = [s for s in all_seasons if start <= s <= end]

    print(f"Fetching standings for {len(seasons)} season(s)")
    written_total = 0
    for s in seasons:
        rows = fetch_standings_for(s)
        if rows:
            flush(sb, rows)
            written_total += len(rows)
            print(f"  {s}: {len(rows)} teams")
        else:
            print(f"  {s}: no data")
        time.sleep(REQUEST_DELAY_SEC)

    print(f"\nDone. {written_total} rows upserted.")


if __name__ == "__main__":
    main()
