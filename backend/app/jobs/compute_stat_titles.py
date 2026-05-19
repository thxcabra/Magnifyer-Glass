"""Derive per-season statistical title winners from `stats_normalized`.

The PlayerAwards endpoint surfaces leader awards for some seasons but is patchy
for others (especially pre-2000 and the most recent year). We can rebuild the
list deterministically from the per-100 dataset we already store.

NBA qualification rules we use (mirrors basketball-reference):
  - scoring title:    >= 58 games  AND  >= 1400 points  (here approximated as
                      games_played >= 58 because pts totals aren't in the table)
  - assists/reb/stl/blk: games_played >= 58 (modern rule of thumb)

We rank by per-game stats since "leading the league" is historically a
per-game concept (kareem, etc.). We only ever record one winner per category
per season — ties broken by minutes (proxy for impact load).

Run:
    python -m app.jobs.compute_stat_titles [--season 2024-25]
                                           [--upsert]   # write to player_awards
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from typing import Iterable

from app.core.supabase_client import get_supabase

# Stat category → (db column on stats_normalized, our enum value)
CATEGORIES: list[tuple[str, str]] = [
    ("pts_per_game", "scoring_title"),
    ("ast_per_game", "assists_title"),
    ("reb_per_game", "rebounding_title"),
    ("stl_per_game", "steals_title"),
    ("blk_per_game", "blocks_title"),
]

# Modern NBA qualification rule for season leader titles.
MIN_GAMES = 58


def fetch_distinct_seasons(sb) -> list[str]:
    res = (
        sb.table("stats_normalized")
        .select("season")
        .eq("season_type", "regular_season")
        .execute()
    )
    return sorted({r["season"] for r in (res.data or [])}, reverse=True)


def fetch_season_rows(sb, season: str) -> list[dict]:
    """Page through stats_normalized for one season (PostgREST caps at 1k)."""
    out: list[dict] = []
    page = 1000
    offset = 0
    columns = (
        "player_id, season, team, games_played, minutes_total, "
        + ", ".join(c for c, _ in CATEGORIES)
    )
    while True:
        res = (
            sb.table("stats_normalized")
            .select(columns)
            .eq("season", season)
            .eq("season_type", "regular_season")
            .gte("games_played", MIN_GAMES)
            .range(offset, offset + page - 1)
            .execute()
        )
        chunk = res.data or []
        out.extend(chunk)
        if len(chunk) < page:
            break
        offset += page
    return out


def pick_winners(rows: list[dict]) -> list[tuple[str, str]]:
    """Return [(player_id, award_enum)] for one season's leaders."""
    out: list[tuple[str, str]] = []
    if not rows:
        return out
    for col, award in CATEGORIES:
        best: dict | None = None
        for r in rows:
            v = r.get(col)
            if v is None:
                continue
            if best is None or v > best.get(col, -1):
                best = r
            elif v == best.get(col):
                # Tie-break by minutes (load) — picks the higher-MPG player.
                if (r.get("minutes_total") or 0) > (best.get("minutes_total") or 0):
                    best = r
        if best:
            out.append((best["player_id"], award))
    return out


def player_team_for(rows: list[dict], player_id: str) -> str | None:
    """Find the team_abbr we should attribute the title to — pick the team
    the player played the most games for that season (mid-season trade case)."""
    by_team: dict[str, int] = defaultdict(int)
    for r in rows:
        if r["player_id"] != player_id or not r.get("team"):
            continue
        by_team[r["team"]] += r.get("games_played") or 0
    if not by_team:
        return None
    return max(by_team.items(), key=lambda kv: kv[1])[0]


def flush(sb, winners: Iterable[dict]) -> int:
    pending = list(winners)
    if not pending:
        return 0
    sb.table("player_awards").upsert(
        pending, on_conflict="player_id,award,season"
    ).execute()
    return len(pending)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", help="Restrict to one season (e.g. 2024-25)")
    parser.add_argument("--upsert", action="store_true", help="Write to player_awards")
    args = parser.parse_args()

    sb = get_supabase()
    seasons = [args.season] if args.season else fetch_distinct_seasons(sb)
    print(f"Computing stat titles for {len(seasons)} season(s)")

    pending: list[dict] = []
    for s in seasons:
        rows = fetch_season_rows(sb, s)
        winners = pick_winners(rows)
        for pid, award in winners:
            team = player_team_for(rows, pid)
            pending.append({
                "player_id": pid,
                "award": award,
                "season": s,
                "team_abbr": team,
                "description": "Computed from season per-game leaders",
            })
        print(f"  {s}: {len(winners)} title(s)")

    if not args.upsert:
        print("\nDry run — pass --upsert to write to player_awards.")
        return

    written = flush(sb, pending)
    print(f"\nDone. Upserted {written} rows.")


if __name__ == "__main__":
    main()
