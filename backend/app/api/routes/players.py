import unicodedata
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException, Query, Response

from app.core.supabase_client import get_supabase

# Shared executor for parallel Supabase queries on the profile endpoint.
# Five-query fan-out is dominated by network latency, so threads are plenty.
_EXEC = ThreadPoolExecutor(max_workers=8, thread_name_prefix="sb-fan")


def _strip_diacritics(s: str) -> str:
    """`nikola-jokić` → `nikola-jokic`. Used as a fuzzy fallback when an
    encoded URL doesn't decode back to the exact stored slug."""
    return "".join(
        c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c)
    )


def _find_player(sb, slug: str):
    """Exact-match by slug, then fall back to diacritic-stripped match.

    Handles three URL shapes:
      1. The exact stored slug (e.g. "luka-dončić")
      2. The diacritic-stripped form (e.g. "luka-doncic" → matches "luka-dončić")
      3. URL-encoded stored slug (browser unescapes that for us)
    """
    res = sb.table("players").select("*").eq("slug", slug).limit(1).execute()
    if res.data:
        return res.data[0]

    # If the input has accents, try the ASCII version against the stored slug
    # (in case the DB normalized them out at some point).
    ascii_slug = _strip_diacritics(slug)
    if ascii_slug != slug:
        res = (
            sb.table("players")
            .select("*")
            .ilike("slug", ascii_slug)
            .limit(1)
            .execute()
        )
        if res.data:
            return res.data[0]

    # Reverse direction: input is plain ASCII but the stored slug has accents
    # (e.g. URL "luka-doncic" but DB row "luka-dončić"). Search the whole NBA
    # roster for any slug whose stripped form matches. Cheap — slugs are short.
    candidates = (
        sb.table("players")
        .select("id, slug, name, external_id, position, draft_class, "
                "draft_round, draft_number, jersey_number, height_inches, "
                "current_team, is_nba, source, college, country, headshot_url, "
                "archetype, archetype_confidence, percentiles")
        .ilike("slug", f"{slug.split('-')[0]}-%")
        .execute()
    )
    for row in candidates.data or []:
        if _strip_diacritics(row["slug"]) == slug:
            return row
    return None

router = APIRouter(prefix="/players", tags=["players"])


# ---------------------------------------------------------------------------
# Draft class lookup — surfaces every drafted player (NBA or not) in a year,
# ordered by pick number. Used by the /draft/[year] frontend route.
# ---------------------------------------------------------------------------
draft_router = APIRouter(prefix="/draft", tags=["draft"])


@draft_router.get("/{year}")
def get_draft_class(year: int):
    """Drafted players ordered by pick. For each player we also resolve the
    team that drafted them - inferred from the earliest regular-season row in
    `stats_normalized` (= rookie season team), which is correct for ~all picks
    since trade-on-draft-night players still get a "first season" row with
    their new team. The fallback to `current_team` only kicks in for players
    who never played a regular-season game we have data for.
    """
    sb = get_supabase()
    res = (
        sb.table("players")
        .select(
            "id, external_id, name, slug, position, draft_class, draft_round, "
            "draft_number, current_team, is_nba, source, headshot_url, "
            "archetype, archetype_confidence"
        )
        .eq("draft_class", year)
        .order("draft_number", desc=False, nullsfirst=False)
        .execute()
    )
    rows = res.data or []
    drafted = [r for r in rows if r.get("draft_number")]
    undrafted = [r for r in rows if not r.get("draft_number")]

    # Derive draft_team for the drafted batch. One round-trip via in_(id list)
    # and we filter to the rookie season (start year = draft year) so we don't
    # have to sort/paginate per-player.
    if drafted:
        ids = [d["id"] for d in drafted]
        rookie_season = f"{year}-{str(year + 1)[-2:]}"
        rookie_rows = (
            sb.table("stats_normalized")
            .select("player_id, team, games_played")
            .eq("season", rookie_season)
            .eq("season_type", "regular_season")
            .in_("player_id", ids)
            .execute()
        )
        # If a player got traded mid-season as a rookie there can be multiple
        # rows; keep the one with the most games (their primary rookie team).
        team_by_pid: dict[str, dict] = {}
        for r in rookie_rows.data or []:
            prev = team_by_pid.get(r["player_id"])
            if prev is None or (r.get("games_played") or 0) > (prev.get("games_played") or 0):
                team_by_pid[r["player_id"]] = r
        for d in drafted:
            row = team_by_pid.get(d["id"])
            d["draft_team"] = (row or {}).get("team") or d.get("current_team")

    return {"year": year, "drafted": drafted, "undrafted_count": len(undrafted)}


@router.get("/search")
def search_players(q: str = Query(..., min_length=1), limit: int = Query(10, ge=1, le=50)):
    """K-bar style fuzzy search: diacritic-insensitive, prefix-prioritized."""
    sb = get_supabase()
    res = sb.rpc("search_players", {"q": q, "lim": limit}).execute()
    hits = res.data or []
    if not hits:
        return hits

    # The RPC predates the headshot UI work and doesn't return external_id or
    # jersey_number. Enrich here so the K-bar can render NBA-CDN headshots.
    ids = [h["id"] for h in hits]
    extras = (
        sb.table("players")
        .select("id, external_id, jersey_number, headshot_url")
        .in_("id", ids)
        .execute()
    )
    by_id = {e["id"]: e for e in extras.data or []}
    for h in hits:
        meta = by_id.get(h["id"])
        if meta:
            h["external_id"] = meta.get("external_id")
            h["jersey_number"] = meta.get("jersey_number")
            h["headshot_url"] = meta.get("headshot_url")
    return hits


@router.get("/{slug}")
def get_player(slug: str):
    sb = get_supabase()
    player = _find_player(sb, slug)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.get("/{slug}/profile")
def get_full_profile(slug: str, response: Response):
    """Player + physical + stats + play_types + hustle + awards.

    Fans out the five player-scoped queries in parallel so the page load
    stays under a single network round-trip's worth of latency.
    """
    sb = get_supabase()
    player_row = _find_player(sb, slug)
    if not player_row:
        raise HTTPException(status_code=404, detail="Player not found")
    player_id = player_row["id"]

    def q_physical():
        return (
            sb.table("physical_profiles").select("*").eq("player_id", player_id)
            .order("is_official", desc=True).order("measured_on", desc=True)
            .limit(1).execute()
        )

    def q_stats():
        return (
            sb.table("stats_normalized").select("*").eq("player_id", player_id)
            .order("season", desc=True).order("season_type", desc=True).execute()
        )

    def q_play_types():
        return sb.table("play_type_data").select("*").eq("player_id", player_id).execute()

    def q_hustle():
        return (
            sb.table("hustle_metrics").select("*").eq("player_id", player_id)
            .order("season", desc=True).limit(1).execute()
        )

    def q_awards():
        return (
            sb.table("player_awards")
            .select("award, season, team_abbr, description")
            .eq("player_id", player_id).order("season", desc=True).execute()
        )

    physical, stats, play_types, hustle, awards = (
        f.result() for f in [
            _EXEC.submit(q_physical),
            _EXEC.submit(q_stats),
            _EXEC.submit(q_play_types),
            _EXEC.submit(q_hustle),
            _EXEC.submit(q_awards),
        ]
    )

    # Cache for 60s at the edge — profile data only changes on backfill runs.
    response.headers["Cache-Control"] = "public, max-age=60, s-maxage=60, stale-while-revalidate=300"
    return {
        "player": player_row,
        "physical": physical.data[0] if physical.data else None,
        "stats": stats.data,
        "play_types": play_types.data,
        "hustle": hustle.data[0] if hustle.data else None,
        "awards": awards.data,
    }
