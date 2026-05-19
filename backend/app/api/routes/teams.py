from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException, Query, Response

from app.core.supabase_client import get_supabase

_EXEC = ThreadPoolExecutor(max_workers=8, thread_name_prefix="sb-team")

router = APIRouter(prefix="/teams", tags=["teams"])

# Static conference/division map — the static team list doesn't include it.
# Mapping reflects 2024-25 alignment.
CONFERENCE: dict[str, dict[str, str]] = {
    # East — Atlantic
    "BOS": {"conference": "East", "division": "Atlantic"},
    "BKN": {"conference": "East", "division": "Atlantic"},
    "NYK": {"conference": "East", "division": "Atlantic"},
    "PHI": {"conference": "East", "division": "Atlantic"},
    "TOR": {"conference": "East", "division": "Atlantic"},
    # East — Central
    "CHI": {"conference": "East", "division": "Central"},
    "CLE": {"conference": "East", "division": "Central"},
    "DET": {"conference": "East", "division": "Central"},
    "IND": {"conference": "East", "division": "Central"},
    "MIL": {"conference": "East", "division": "Central"},
    # East — Southeast
    "ATL": {"conference": "East", "division": "Southeast"},
    "CHA": {"conference": "East", "division": "Southeast"},
    "MIA": {"conference": "East", "division": "Southeast"},
    "ORL": {"conference": "East", "division": "Southeast"},
    "WAS": {"conference": "East", "division": "Southeast"},
    # West — Northwest
    "DEN": {"conference": "West", "division": "Northwest"},
    "MIN": {"conference": "West", "division": "Northwest"},
    "OKC": {"conference": "West", "division": "Northwest"},
    "POR": {"conference": "West", "division": "Northwest"},
    "UTA": {"conference": "West", "division": "Northwest"},
    # West — Pacific
    "GSW": {"conference": "West", "division": "Pacific"},
    "LAC": {"conference": "West", "division": "Pacific"},
    "LAL": {"conference": "West", "division": "Pacific"},
    "PHX": {"conference": "West", "division": "Pacific"},
    "SAC": {"conference": "West", "division": "Pacific"},
    # West — Southwest
    "DAL": {"conference": "West", "division": "Southwest"},
    "HOU": {"conference": "West", "division": "Southwest"},
    "MEM": {"conference": "West", "division": "Southwest"},
    "NOP": {"conference": "West", "division": "Southwest"},
    "SAS": {"conference": "West", "division": "Southwest"},
}


def _attach_conference(t: dict) -> dict:
    meta = CONFERENCE.get(t.get("abbreviation"))
    if meta:
        t["conference"] = meta["conference"]
        t["division"] = meta["division"]
    else:
        t["conference"] = None
        t["division"] = None
    return t


@router.get("")
def list_teams(include_legacy: bool = False):
    sb = get_supabase()
    q = sb.table("teams").select("*").order("full_name")
    if not include_legacy:
        q = q.eq("is_active", True)
    return [_attach_conference(t) for t in q.execute().data]


@router.get("/{abbreviation}")
def get_team(
    abbreviation: str,
    response: Response,
    season: str | None = Query(default=None, description="e.g. 2024-25"),
):
    """Team + roster. If `season` is omitted, returns the most-recent season we have."""
    sb = get_supabase()
    abbr = abbreviation.upper()

    def q_team():
        return sb.table("teams").select("*").eq("abbreviation", abbr).limit(1).execute()

    def q_latest():
        return (
            sb.table("stats_normalized").select("season").eq("team", abbr)
            .order("season", desc=True).limit(1).execute()
        )

    def q_titles():
        return (
            sb.table("player_awards").select("season, team_abbr")
            .eq("award", "champion").eq("team_abbr", abbr).execute()
        )

    def q_all_seasons():
        return (
            sb.table("stats_normalized").select("season").eq("team", abbr)
            .order("season", desc=True).execute()
        )

    team_f = _EXEC.submit(q_team)
    latest_f = _EXEC.submit(q_latest)
    titles_f = _EXEC.submit(q_titles)
    seasons_f = _EXEC.submit(q_all_seasons)

    team_res = team_f.result()
    if not team_res.data:
        raise HTTPException(status_code=404, detail="Team not found")
    team = _attach_conference(team_res.data[0])

    if season is None:
        latest = latest_f.result()
        season = latest.data[0]["season"] if latest.data else None

    roster: list[dict] = []
    if season:
        rows = (
            sb.table("stats_normalized")
            .select(
                "player_id, season, team, season_type, games_played, minutes_total, "
                "pts_per_game, ast_per_game, reb_per_game, usg_pct, ts_pct"
            )
            .eq("team", abbr)
            .eq("season", season)
            .eq("season_type", "regular_season")
            .order("minutes_total", desc=True)
            .execute()
        )
        # Dedupe: a mid-season trade can produce two rows per player for the
        # same team (the stints stitch back together oddly in NBA Stats).
        # Keep the row with the most games_played per player_id.
        if rows.data:
            seen: dict[str, dict] = {}
            for r in rows.data:
                pid = r["player_id"]
                prev = seen.get(pid)
                if prev is None or (r.get("games_played") or 0) > (prev.get("games_played") or 0):
                    seen[pid] = r
            rows.data = sorted(seen.values(), key=lambda r: r.get("minutes_total") or 0, reverse=True)
            player_ids = [r["player_id"] for r in rows.data]
            players = (
                sb.table("players")
                .select(
                    "id, name, slug, external_id, position, jersey_number, height_inches, archetype, archetype_confidence"
                )
                .in_("id", player_ids)
                .execute()
            )
            by_id = {p["id"]: p for p in players.data}
            roster = [
                {
                    "player": by_id.get(r["player_id"]),
                    "season_stats": {
                        "games_played": r["games_played"],
                        "minutes_total": r["minutes_total"],
                        "pts_per_game": r.get("pts_per_game"),
                        "ast_per_game": r.get("ast_per_game"),
                        "reb_per_game": r.get("reb_per_game"),
                        "usg_pct": r.get("usg_pct"),
                        "ts_pct": r.get("ts_pct"),
                    },
                }
                for r in rows.data
                if by_id.get(r["player_id"])
            ]

    seasons_res = seasons_f.result()
    seasons = sorted({r["season"] for r in seasons_res.data}, reverse=True)

    champ_q = titles_f.result()
    title_seasons = sorted(
        {r["season"] for r in (champ_q.data or []) if r.get("season")},
        reverse=True,
    )
    is_champion_this_season = season in title_seasons if season else False

    response.headers["Cache-Control"] = "public, max-age=120, s-maxage=120, stale-while-revalidate=600"
    return {
        "team": team,
        "season": season,
        "seasons": seasons,
        "title_seasons": title_seasons,
        "is_champion_this_season": is_champion_this_season,
        "roster": roster,
    }


@router.get("/champions/{season}")
def get_champions(season: str, response: Response):
    """Return the team that won the championship in the given season,
    plus the full roster of that title team."""
    sb = get_supabase()
    champ_q = (
        sb.table("player_awards")
        .select("team_abbr")
        .eq("award", "champion")
        .eq("season", season)
        .limit(1)
        .execute()
    )
    if not champ_q.data:
        raise HTTPException(status_code=404, detail="No champion recorded for that season")
    abbr = champ_q.data[0]["team_abbr"]
    if not abbr:
        raise HTTPException(status_code=404, detail="Champion known but no team abbreviation")
    return get_team(abbr, response, season=season)
