"""Historical lists — every MVP, every DPOY, every Finals MVP, etc.

Surfaced by the /lists frontend page. One generic endpoint that the page
calls per award type.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Response

from app.core.supabase_client import get_supabase
from app.models.schemas import Archetype  # noqa: F401  -- shares enum module

router = APIRouter(prefix="/lists", tags=["lists"])


# Awards exposed via /lists/{award}. Keep this in sync with the enum.
ALLOWED_AWARDS = {
    "mvp",
    "finals_mvp",
    "dpoy",
    "roy",
    "sixth_man",
    "most_improved",
    "clutch_player",
    "all_star_mvp",
    "all_nba_first",
    "all_nba_second",
    "all_nba_third",
    "all_defensive_first",
    "all_defensive_second",
    "all_rookie_first",
    "all_rookie_second",
    "champion",
    "scoring_title",
    "assists_title",
    "rebounding_title",
    "steals_title",
    "blocks_title",
    "hof_inductee",
}


@router.get("/{award}")
def get_award_history(award: str, response: Response, limit: int = Query(500, le=2000)):
    if award not in ALLOWED_AWARDS:
        raise HTTPException(status_code=404, detail=f"Unknown award: {award}")
    sb = get_supabase()
    rows = (
        sb.table("player_awards")
        .select("season, team_abbr, player_id")
        .eq("award", award)
        .order("season", desc=True)
        .limit(limit)
        .execute()
    )
    if not rows.data:
        return {"award": award, "entries": []}

    player_ids = list({r["player_id"] for r in rows.data})
    players = (
        sb.table("players")
        .select(
            "id, external_id, name, slug, position, current_team, is_nba, "
            "headshot_url, archetype"
        )
        .in_("id", player_ids)
        .execute()
    )
    by_id = {p["id"]: p for p in players.data}

    entries = [
        {
            "season": r.get("season"),
            "team_abbr": r.get("team_abbr"),
            "player": by_id.get(r["player_id"]),
        }
        for r in rows.data
        if r["player_id"] in by_id
    ]

    response.headers["Cache-Control"] = "public, max-age=600, s-maxage=600, stale-while-revalidate=1800"
    return {"award": award, "entries": entries}


@router.get("")
def list_award_types():
    """Enumerate available award lists with counts so the /lists index can
    render quick chips."""
    sb = get_supabase()
    res = (
        sb.table("player_awards")
        .select("award", count="exact")
        .execute()
    )
    counts: dict[str, int] = {}
    for r in res.data or []:
        a = r["award"]
        if a in ALLOWED_AWARDS:
            counts[a] = counts.get(a, 0) + 1
    return [{"award": a, "count": c} for a, c in sorted(counts.items(), key=lambda kv: -kv[1])]


# Awards grouped per season for the by-year view. Excludes statistical titles
# (those live on /years) and HOF (career honor, not annual). The order here
# drives display order on the frontend.
_BY_YEAR_AWARDS = [
    "champion",
    "mvp",
    "finals_mvp",
    "dpoy",
    "roy",
    "sixth_man",
    "most_improved",
    "clutch_player",
    "all_star_mvp",
    "all_nba_first",
    "all_nba_second",
    "all_nba_third",
    "all_defensive_first",
    "all_defensive_second",
    "all_rookie_first",
    "all_rookie_second",
]


@router.get("/by-year/index")
def list_awards_by_year(response: Response, limit: int = Query(80, le=120)):
    """Every season we have, with every individual award honoree grouped under it.

    Powers the new /lists frontend: one card per season with the MVP / DPOY /
    ROY / 6MOY / MIP / Clutch winners plus full All-NBA, All-Defensive and
    All-Rookie squads, so users can scan an entire year of accolades at once
    and search across all of it.
    """
    sb = get_supabase()
    # Pull every award row for the by-year awards, newest seasons first
    rows = (
        sb.table("player_awards")
        .select("season, team_abbr, award, player_id")
        .in_("award", _BY_YEAR_AWARDS)
        .order("season", desc=True)
        .limit(limit * 30)  # plenty of headroom for ~30 honorees/year
        .execute()
    )
    rows_data = rows.data or []
    if not rows_data:
        return {"seasons": []}

    player_ids = list({r["player_id"] for r in rows_data})
    players = (
        sb.table("players")
        .select(
            "id, external_id, name, slug, position, current_team, "
            "is_nba, headshot_url, archetype, archetype_confidence"
        )
        .in_("id", player_ids)
        .execute()
    )
    by_id = {p["id"]: p for p in players.data}

    # Group rows by season -> award -> [player rows], preserving the canonical
    # award-display order from _BY_YEAR_AWARDS.
    grouped: dict[str, dict[str, list[dict]]] = {}
    for r in rows_data:
        if r["player_id"] not in by_id:
            continue
        season = r.get("season") or "—"
        award = r["award"]
        grouped.setdefault(season, {}).setdefault(award, []).append({
            "team_abbr": r.get("team_abbr"),
            "player": by_id[r["player_id"]],
        })

    seasons_sorted = sorted(grouped.keys(), reverse=True)[:limit]
    out_seasons = []
    for s in seasons_sorted:
        awards_for_year = []
        for award_key in _BY_YEAR_AWARDS:
            entries = grouped[s].get(award_key)
            if not entries:
                continue
            awards_for_year.append({"award": award_key, "entries": entries})
        out_seasons.append({"season": s, "awards": awards_for_year})

    response.headers["Cache-Control"] = "public, max-age=600, s-maxage=600, stale-while-revalidate=1800"
    return {"seasons": out_seasons}
