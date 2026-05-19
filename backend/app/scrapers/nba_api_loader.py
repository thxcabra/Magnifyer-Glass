"""Pull NBA player data, career stats, and draft-combine measurements via nba_api.

Run as a script:
    python -m app.scrapers.nba_api_loader --start-season 2005-06 --end-season 2024-25
"""

from __future__ import annotations

import argparse
import math
import time
from typing import Any, Callable, TypeVar

from nba_api.stats.endpoints import (
    DraftCombineStats,
    LeagueDashPlayerStats,
    LeagueHustleStatsPlayer,
)
from nba_api.stats.library import http as nba_http

from app.core.supabase_client import get_supabase
from app.models.schemas import PlayerSource

REQUEST_DELAY_SEC = 0.8       # gap between season-level endpoints
COMBINE_DELAY_SEC = 3.0       # gap between Combine years (stricter throttling)
REQUEST_TIMEOUT_SEC = 30
RETRY_ATTEMPTS = 5
RETRY_BACKOFF = 3.0           # 3, 9, 27, 81, 243 s — survives sustained throttling
HUSTLE_FIRST_SEASON = 2015    # 2015-16 onward
UPSERT_BATCH = 500

# Map our schema enum → NBA API's season-type parameter name.
SEASON_TYPE_API = {
    "regular_season": "Regular Season",
    "playoffs": "Playoffs",
}
STATS_CONFLICT = "player_id,season,league,season_type"

# stats.nba.com refuses connections without browser-like headers; nba_api's
# defaults work most of the time but occasionally drop. Override with a fully
# realistic Chrome header set + longer timeout.
nba_http.NBAStatsHTTP.headers = {
    "Host": "stats.nba.com",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.nba.com/",
    "Origin": "https://www.nba.com",
    "Connection": "keep-alive",
    "x-nba-stats-origin": "stats",
    "x-nba-stats-token": "true",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
}

T = TypeVar("T")


def _with_retry(fn: Callable[[], T], label: str) -> T | None:
    last_err: Exception | None = None
    for attempt in range(1, RETRY_ATTEMPTS + 1):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001
            last_err = e
            wait = RETRY_BACKOFF ** attempt
            print(f"  [{label}] attempt {attempt} failed ({type(e).__name__}); retry in {wait:.1f}s")
            time.sleep(wait)
    print(f"  [{label}] giving up after {RETRY_ATTEMPTS} attempts: {last_err}")
    return None


def _slugify(name: str) -> str:
    return (
        name.lower()
        .replace(" ", "-")
        .replace("'", "")
        .replace(".", "")
        .replace(",", "")
    )


def _season_start_year(season: str) -> int:
    """'2024-25' -> 2024."""
    return int(season.split("-")[0])


def _iter_seasons(start: str, end: str) -> list[str]:
    """Inclusive range, e.g. iter_seasons('2005-06', '2007-08') -> ['2005-06','2006-07','2007-08']."""
    s, e = _season_start_year(start), _season_start_year(end)
    if s > e:
        s, e = e, s
    return [f"{y}-{str(y + 1)[-2:]}" for y in range(s, e + 1)]


def _to_float(v: Any) -> float | None:
    if v is None or v == "" or v == "-":
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def _to_int(v: Any) -> int | None:
    if v is None or v == "" or v == "-":
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return int(f)


def _batch(rows: list[dict[str, Any]], size: int = UPSERT_BATCH):
    for i in range(0, len(rows), size):
        yield rows[i : i + size]


def _all_nba_players_by_ext(sb) -> dict[str, str]:
    """Paginated lookup — bypasses Supabase's default 1000-row cap."""
    out: dict[str, str] = {}
    page = 1000
    offset = 0
    while True:
        res = (
            sb.table("players")
            .select("id, external_id")
            .eq("is_nba", True)
            .range(offset, offset + page - 1)
            .execute()
        )
        chunk = res.data or []
        for p in chunk:
            out[p["external_id"]] = p["id"]
        if len(chunk) < page:
            break
        offset += page
    return out


# ---------------------------------------------------------------------------
# Players (derived from each season's dashboard, not pre-loaded)
# ---------------------------------------------------------------------------
def upsert_players_from_dashboard(df, sb) -> dict[str, str]:
    """Upsert players from a dashboard frame, return {external_id: uuid}."""
    rows: list[dict[str, Any]] = []
    for _, r in df.iterrows():
        name = str(r.get("PLAYER_NAME") or "").strip()
        if not name:
            continue
        rows.append(
            {
                "external_id": str(int(r["PLAYER_ID"])),
                "source": PlayerSource.nba.value,
                "name": name,
                "slug": _slugify(name),
                "is_nba": True,
                "current_team": r.get("TEAM_ABBREVIATION"),
            }
        )

    for chunk in _batch(rows):
        sb.table("players").upsert(chunk, on_conflict="external_id").execute()

    ext_ids = [r["external_id"] for r in rows]
    by_ext: dict[str, str] = {}
    for chunk_ids in _batch(ext_ids):
        got = sb.table("players").select("id, external_id").in_("external_id", chunk_ids).execute()
        for p in got.data:
            by_ext[p["external_id"]] = p["id"]
    return by_ext


# ---------------------------------------------------------------------------
# Per-100 league dashboard
# ---------------------------------------------------------------------------
def load_league_dashboard(season: str, season_type: str = "regular_season") -> int:
    sb = get_supabase()
    api_season_type = SEASON_TYPE_API[season_type]
    dash = _with_retry(
        lambda: LeagueDashPlayerStats(
            season=season,
            season_type_all_star=api_season_type,
            per_mode_detailed="Per100Possessions",
            timeout=REQUEST_TIMEOUT_SEC,
        ),
        f"dashboard {season} {season_type}",
    )
    if dash is None:
        return 0
    df = dash.get_data_frames()[0]
    if df.empty:
        return 0

    # Playoffs runs piggy-back on the player rows the regular-season run upserted.
    if season_type == "regular_season":
        by_ext = upsert_players_from_dashboard(df, sb)
    else:
        by_ext = _all_nba_players_by_ext(sb)

    rows: list[dict[str, Any]] = []
    for _, r in df.iterrows():
        ext = str(int(r["PLAYER_ID"]))
        pid = by_ext.get(ext)
        if not pid:
            continue
        rows.append(
            {
                "player_id": pid,
                "season": season,
                "league": PlayerSource.nba.value,
                "season_type": season_type,
                "team": r.get("TEAM_ABBREVIATION"),
                "games_played": int(r.get("GP") or 0),
                "games_started": _to_int(r.get("GS")),
                "minutes_total": _to_float(r.get("MIN")),
                "pts_per100": _to_float(r.get("PTS")),
                "ast_per100": _to_float(r.get("AST")),
                "reb_per100": _to_float(r.get("REB")),
                "stl_per100": _to_float(r.get("STL")),
                "blk_per100": _to_float(r.get("BLK")),
                "tov_per100": _to_float(r.get("TOV")),
                "fga_per100": _to_float(r.get("FGA")),
                "fta_per100": _to_float(r.get("FTA")),
                "tpa_per100": _to_float(r.get("FG3A")),
                "tpm_per100": _to_float(r.get("FG3M")),
                "fg_pct": _to_float(r.get("FG_PCT")),
                "tp_pct": _to_float(r.get("FG3_PCT")),
                "ft_pct": _to_float(r.get("FT_PCT")),
            }
        )

    n = 0
    for chunk in _batch(rows):
        sb.table("stats_normalized").upsert(chunk, on_conflict=STATS_CONFLICT).execute()
        n += len(chunk)
    return n


# ---------------------------------------------------------------------------
# Per-game dashboard — pulls Basketball-Reference-style PPG/APG/RPG numbers
# alongside MPG. We use MPG as the "bench gate" for Microwave Scorer
# (NBA Stats doesn't expose GS in any dashboard mode).
# ---------------------------------------------------------------------------
def load_per_game_dashboard(season: str, season_type: str = "regular_season") -> int:
    sb = get_supabase()
    api_season_type = SEASON_TYPE_API[season_type]
    dash = _with_retry(
        lambda: LeagueDashPlayerStats(
            season=season,
            season_type_all_star=api_season_type,
            measure_type_detailed_defense="Base",
            per_mode_detailed="PerGame",
            timeout=REQUEST_TIMEOUT_SEC,
        ),
        f"per_game {season} {season_type}",
    )
    if dash is None:
        return 0
    df = dash.get_data_frames()[0]
    if df.empty or "MIN" not in df.columns:
        return 0

    by_ext = _all_nba_players_by_ext(sb)

    rows: list[dict[str, Any]] = []
    for _, r in df.iterrows():
        ext = str(int(r["PLAYER_ID"]))
        pid = by_ext.get(ext)
        if not pid:
            continue
        rows.append({
            "player_id": pid,
            "season": season,
            "league": PlayerSource.nba.value,
            "season_type": season_type,
            # `minutes_total` semantically holds MPG now; see load_per_game_dashboard
            # docstring at git blame for context.
            "minutes_total":   _to_float(r.get("MIN")),
            "pts_per_game":    _to_float(r.get("PTS")),
            "ast_per_game":    _to_float(r.get("AST")),
            "reb_per_game":    _to_float(r.get("REB")),
            "oreb_per_game":   _to_float(r.get("OREB")),
            "dreb_per_game":   _to_float(r.get("DREB")),
            "stl_per_game":    _to_float(r.get("STL")),
            "blk_per_game":    _to_float(r.get("BLK")),
            "tov_per_game":    _to_float(r.get("TOV")),
            "fga_per_game":    _to_float(r.get("FGA")),
            "fgm_per_game":    _to_float(r.get("FGM")),
            "fta_per_game":    _to_float(r.get("FTA")),
            "ftm_per_game":    _to_float(r.get("FTM")),
            "tpa_per_game":    _to_float(r.get("FG3A")),
            "tpm_per_game":    _to_float(r.get("FG3M")),
            "plus_minus_per_game": _to_float(r.get("PLUS_MINUS")),
        })

    n = 0
    for chunk in _batch(rows):
        sb.table("stats_normalized").upsert(chunk, on_conflict=STATS_CONFLICT).execute()
        n += len(chunk)
    return n


# Backwards-compatible alias — older invocations may still call this name.
load_minutes_per_game = load_per_game_dashboard


# ---------------------------------------------------------------------------
# Advanced metrics — usage, true-shooting, percentile rates, BPM
# Merges into the same stats_normalized row by player_id+season+league.
# ---------------------------------------------------------------------------
def load_advanced_dashboard(season: str, season_type: str = "regular_season") -> int:
    sb = get_supabase()
    api_season_type = SEASON_TYPE_API[season_type]
    dash = _with_retry(
        lambda: LeagueDashPlayerStats(
            season=season,
            season_type_all_star=api_season_type,
            measure_type_detailed_defense="Advanced",
            per_mode_detailed="PerGame",
            timeout=REQUEST_TIMEOUT_SEC,
        ),
        f"advanced {season} {season_type}",
    )
    if dash is None:
        return 0
    df = dash.get_data_frames()[0]
    if df.empty:
        return 0

    by_ext = _all_nba_players_by_ext(sb)

    # NBA Advanced endpoint returns most rates as 0..1 fractions already.
    # Only TM_TOV_PCT is on the 0..100 scale and needs normalization.
    rate_as_fraction = {
        "ts_pct": "TS_PCT",
        "efg_pct": "EFG_PCT",
        "usg_pct": "USG_PCT",
        "ast_pct": "AST_PCT",
        "reb_pct": "REB_PCT",
        "oreb_pct": "OREB_PCT",
        "dreb_pct": "DREB_PCT",
    }

    def _from_percent(v: Any) -> float | None:
        f = _to_float(v)
        return None if f is None else f / 100.0

    rows: list[dict[str, Any]] = []
    for _, r in df.iterrows():
        ext = str(int(r["PLAYER_ID"]))
        pid = by_ext.get(ext)
        if not pid:
            continue
        row = {
            "player_id": pid,
            "season": season,
            "league": PlayerSource.nba.value,
            "season_type": season_type,
        }
        for our_col, api_col in rate_as_fraction.items():
            row[our_col] = _to_float(r.get(api_col))
        row["tov_pct"] = _from_percent(r.get("TM_TOV_PCT"))
        rows.append(row)

    n = 0
    for chunk in _batch(rows):
        sb.table("stats_normalized").upsert(chunk, on_conflict=STATS_CONFLICT).execute()
        n += len(chunk)
    return n


# ---------------------------------------------------------------------------
# Hustle (2015-16 onward)
# ---------------------------------------------------------------------------
def load_hustle_stats(season: str, season_type: str = "regular_season") -> int:
    if _season_start_year(season) < HUSTLE_FIRST_SEASON:
        return 0

    sb = get_supabase()
    api_season_type = SEASON_TYPE_API[season_type]
    endpoint = _with_retry(
        lambda: LeagueHustleStatsPlayer(
            season=season,
            season_type_all_star=api_season_type,
            per_mode_time="PerGame",
            timeout=REQUEST_TIMEOUT_SEC,
        ),
        f"hustle {season} {season_type}",
    )
    if endpoint is None:
        return 0
    df = endpoint.get_data_frames()[0]
    if df.empty:
        return 0

    by_ext = _all_nba_players_by_ext(sb)

    rows: list[dict[str, Any]] = []
    for _, r in df.iterrows():
        ext = str(int(r["PLAYER_ID"]))
        pid = by_ext.get(ext)
        if not pid:
            continue
        rows.append(
            {
                "player_id": pid,
                "season": season,
                "games_played": int(r.get("G") or 0),
                "deflections_per_game": _to_float(r.get("DEFLECTIONS")),
                "screen_assists_per_game": _to_float(r.get("SCREEN_ASSISTS")),
                "contested_shots_per_game": _to_float(r.get("CONTESTED_SHOTS")),
                "loose_balls_recovered_per_game": _to_float(r.get("LOOSE_BALLS_RECOVERED")),
                "charges_drawn_per_game": _to_float(r.get("CHARGES_DRAWN")),
                "box_outs_per_game": _to_float(r.get("BOX_OUTS")),
            }
        )

    n = 0
    for chunk in _batch(rows):
        sb.table("hustle_metrics").upsert(chunk, on_conflict="player_id,season").execute()
        n += len(chunk)
    return n


# ---------------------------------------------------------------------------
# Draft Combine history (independent of season loop)
# ---------------------------------------------------------------------------
def load_combine_history(start_year: int, end_year: int) -> int:
    sb = get_supabase()
    by_ext = _all_nba_players_by_ext(sb)

    rows: list[dict[str, Any]] = []
    for year in range(start_year, end_year + 1):
        season_str = f"{year - 1}-{str(year)[-2:]}"
        endpoint = _with_retry(
            lambda s=season_str: DraftCombineStats(
                season_all_time=s, timeout=REQUEST_TIMEOUT_SEC
            ),
            f"combine {year}",
        )
        if endpoint is None:
            continue
        df = endpoint.get_data_frames()[0]
        for _, r in df.iterrows():
            ext = str(int(r["PLAYER_ID"]))
            pid = by_ext.get(ext)
            if not pid:
                continue
            rows.append(
                {
                    "player_id": pid,
                    "is_official": True,
                    "source_event": f"{year} NBA Draft Combine",
                    "height_no_shoes_in": _to_float(r.get("HEIGHT_WO_SHOES")),
                    "height_with_shoes_in": _to_float(r.get("HEIGHT_W_SHOES")),
                    "weight_lbs": _to_float(r.get("WEIGHT")),
                    "wingspan_in": _to_float(r.get("WINGSPAN")),
                    "standing_reach_in": _to_float(r.get("STANDING_REACH")),
                    "hand_length_in": _to_float(r.get("HAND_LENGTH")),
                    "hand_width_in": _to_float(r.get("HAND_WIDTH")),
                    "body_fat_pct": _to_float(r.get("BODY_FAT_PCT")),
                    "vertical_leap_max_in": _to_float(r.get("MAX_VERTICAL_LEAP")),
                    "vertical_leap_std_in": _to_float(r.get("STANDING_VERTICAL_LEAP")),
                    "lane_agility_sec": _to_float(r.get("LANE_AGILITY_TIME")),
                    "three_quarter_sprint_sec": _to_float(r.get("THREE_QUARTER_SPRINT")),
                    "bench_press_reps": _to_int(r.get("BENCH_PRESS")),
                }
            )
        time.sleep(COMBINE_DELAY_SEC)

    n = 0
    for chunk in _batch(rows):
        sb.table("physical_profiles").upsert(
            chunk, on_conflict="player_id,source_event"
        ).execute()
        n += len(chunk)
    return n


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-season", default="2005-06")
    parser.add_argument("--end-season", default="2024-25")
    parser.add_argument("--combine-start", type=int, default=2000)
    parser.add_argument("--combine-end", type=int, default=2025)
    parser.add_argument("--skip-combine", action="store_true")
    parser.add_argument("--skip-stats", action="store_true")
    parser.add_argument("--skip-advanced", action="store_true")
    parser.add_argument("--skip-hustle", action="store_true")
    parser.add_argument("--skip-mpg", action="store_true")
    parser.add_argument(
        "--season-type",
        choices=["regular_season", "playoffs"],
        default="regular_season",
        help="Which slate of games to ingest. Run twice (once each) to populate both.",
    )
    args = parser.parse_args()

    seasons = _iter_seasons(args.start_season, args.end_season)
    print(f"Seasons: {len(seasons)} ({seasons[0]} -> {seasons[-1]}) — {args.season_type}")

    total_stats = total_advanced = total_hustle = total_mpg = 0
    for season in seasons:
        print(f"\n[{season}]")
        if not args.skip_stats:
            n = load_league_dashboard(season, args.season_type)
            total_stats += n
            print(f"  stats: +{n}")
            time.sleep(REQUEST_DELAY_SEC)
        if not args.skip_mpg:
            n = load_per_game_dashboard(season, args.season_type)
            total_mpg += n
            print(f"  per_game: +{n}")
            time.sleep(REQUEST_DELAY_SEC)
        if not args.skip_advanced:
            n = load_advanced_dashboard(season, args.season_type)
            total_advanced += n
            print(f"  advanced: +{n}")
            time.sleep(REQUEST_DELAY_SEC)
        if not args.skip_hustle:
            n = load_hustle_stats(season, args.season_type)
            total_hustle += n
            print(f"  hustle: +{n}")
            time.sleep(REQUEST_DELAY_SEC)

    total_combine = 0
    if not args.skip_combine:
        print(f"\n[combine {args.combine_start}-{args.combine_end}]")
        total_combine = load_combine_history(args.combine_start, args.combine_end)
        print(f"  combine: +{total_combine}")

    print(
        f"\nDone. stats={total_stats}  mpg={total_mpg}  "
        f"advanced={total_advanced}  hustle={total_hustle}  combine={total_combine}"
    )


if __name__ == "__main__":
    main()
