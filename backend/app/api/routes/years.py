"""Per-season summary — champion, headline awards, draft class.

Aggregates rows from player_awards + players for a given NBA season string
(e.g. "2015-16") or for a draft class (e.g. 2003) so the /years frontend
can render a single overview page.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException, Query, Response

from app.core.supabase_client import get_supabase

router = APIRouter(prefix="/years", tags=["years"])
_EXEC = ThreadPoolExecutor(max_workers=6, thread_name_prefix="sb-year")


# Single-winner season awards we look up by season string for the headline row.
_AWARD_LABELS = {
    "mvp": "Most Valuable Player",
    "finals_mvp": "Finals MVP",
    "dpoy": "Defensive Player of the Year",
    "roy": "Rookie of the Year",
    "sixth_man": "Sixth Man of the Year",
    "most_improved": "Most Improved Player",
    "clutch_player": "Clutch Player of the Year",
    "all_star_mvp": "All-Star Game MVP",
}

# Statistical title winners (one per category per season).
_STAT_TITLES = {
    "scoring_title": "Scoring Title",
    "assists_title": "Assists Title",
    "rebounding_title": "Rebounding Title",
    "steals_title": "Steals Title",
    "blocks_title": "Blocks Title",
}

# Multi-honoree team awards we pull a full squad for.
_TEAM_AWARDS = [
    "all_nba_first",
    "all_nba_second",
    "all_nba_third",
    "all_defensive_first",
    "all_defensive_second",
    "all_rookie_first",
    "all_rookie_second",
]


def _player_card(sb, player_ids: list[str]) -> dict[str, dict]:
    if not player_ids:
        return {}
    res = (
        sb.table("players")
        .select(
            "id, external_id, name, slug, position, current_team, "
            "is_nba, headshot_url, archetype, archetype_confidence"
        )
        .in_("id", player_ids)
        .execute()
    )
    return {p["id"]: p for p in res.data}


@router.get("/{season}")
def get_year_summary(season: str, response: Response):
    """`season` accepts both `2015-16` style and bare `2015` (treated as the
    draft year — surfaces the draft class as the headline)."""
    sb = get_supabase()

    # Normalize input: "2015" → draft-year mode, "2015-16" → season mode.
    if "-" in season:
        season_str = season
        draft_year = int(season.split("-")[0]) + 1   # draft happens in the offseason after
    else:
        season_str = f"{int(season) - 1}-{season[-2:]}"
        draft_year = int(season)

    def q_awards_season():
        wanted = (
            list(_AWARD_LABELS.keys())
            + ["champion"]
            + _TEAM_AWARDS
            + list(_STAT_TITLES.keys())
        )
        return (
            sb.table("player_awards")
            .select("award, season, team_abbr, player_id")
            .eq("season", season_str)
            .in_("award", wanted)
            .execute()
        )

    def q_hof_inductees():
        # HOF inductees use the induction year (e.g. "2020") rather than a
        # season string. We surface them as "year context" — the players
        # inducted around the time of this season.
        induction_year = season.split("-")[0] if "-" in season else season
        return (
            sb.table("player_awards")
            .select("award, season, team_abbr, player_id")
            .eq("award", "hof_inductee")
            .eq("season", induction_year)
            .execute()
        )

    def q_draft_class():
        return (
            sb.table("players")
            .select(
                "id, external_id, name, slug, position, draft_class, draft_round, "
                "draft_number, current_team, is_nba, headshot_url, archetype, archetype_confidence"
            )
            .eq("draft_class", draft_year)
            .order("draft_number", desc=False, nullsfirst=False)
            .execute()
        )

    def q_standings():
        # Standings live in their own table (see migration 013). If the table
        # hasn't been provisioned yet, the API call fails — we swallow and
        # return [] so the year page still renders the awards portion.
        try:
            return (
                sb.table("team_standings")
                .select("team_abbr, conference, division, wins, losses, "
                        "win_pct, conference_rank, division_rank, "
                        "games_back, playoff_seed")
                .eq("season", season_str)
                .order("conference_rank", desc=False)
                .execute()
            )
        except Exception:
            return None

    def q_playoff_series():
        try:
            return (
                sb.table("playoff_series")
                .select("round, conference, higher_seed_abbr, lower_seed_abbr, "
                        "winner_abbr, result, series_order")
                .eq("season", season_str)
                .order("series_order", desc=False)
                .execute()
            )
        except Exception:
            return None

    awards_f = _EXEC.submit(q_awards_season)
    hof_f = _EXEC.submit(q_hof_inductees)
    draft_f = _EXEC.submit(q_draft_class)
    standings_f = _EXEC.submit(q_standings)
    playoff_f = _EXEC.submit(q_playoff_series)
    awards_res = awards_f.result()
    hof_res = hof_f.result()
    draft_res = draft_f.result()
    standings_res = standings_f.result()
    playoff_res = playoff_f.result()

    awards_rows = (awards_res.data or []) + (hof_res.data or [])
    by_award: dict[str, list[dict]] = {}
    for a in awards_rows:
        by_award.setdefault(a["award"], []).append(a)

    all_player_ids = list({a["player_id"] for a in awards_rows})
    cards = _player_card(sb, all_player_ids)

    # Single-winner headline awards
    headlines: list[dict] = []
    for key, label in _AWARD_LABELS.items():
        rows = by_award.get(key, [])
        if not rows:
            continue
        winner = cards.get(rows[0]["player_id"])
        if winner:
            headlines.append({
                "award": key,
                "label": label,
                "winner": winner,
                "team_abbr": rows[0].get("team_abbr"),
            })

    # Statistical titles
    stat_titles: list[dict] = []
    for key, label in _STAT_TITLES.items():
        rows = by_award.get(key, [])
        if not rows:
            continue
        winner = cards.get(rows[0]["player_id"])
        if winner:
            stat_titles.append({
                "award": key,
                "label": label,
                "winner": winner,
                "team_abbr": rows[0].get("team_abbr"),
            })

    # Champion roster
    champion_team = None
    champion_roster: list[dict] = []
    if "champion" in by_award:
        champion_team = by_award["champion"][0].get("team_abbr")
        champion_roster = [
            cards[r["player_id"]]
            for r in by_award["champion"]
            if r["player_id"] in cards
        ]

    # All squad-style awards in one structured map
    team_squads: dict[str, list[dict]] = {}
    for award in _TEAM_AWARDS:
        squad = [
            cards[r["player_id"]]
            for r in by_award.get(award, [])
            if r["player_id"] in cards
        ]
        if squad:
            team_squads[award] = squad

    # HOF inductees during this calendar year
    hof_inductees = [
        cards[r["player_id"]]
        for r in by_award.get("hof_inductee", [])
        if r["player_id"] in cards
    ]

    draft = draft_res.data or []
    drafted = [d for d in draft if d.get("draft_number")]

    # Split standings into east/west and surface the order the frontend wants.
    standings_rows = (standings_res.data if standings_res else None) or []
    east = [r for r in standings_rows if (r.get("conference") or "").lower().startswith("e")]
    west = [r for r in standings_rows if (r.get("conference") or "").lower().startswith("w")]

    playoff_rows = (playoff_res.data if playoff_res else None) or []

    response.headers["Cache-Control"] = "public, max-age=300, s-maxage=300, stale-while-revalidate=900"
    return {
        "season": season_str,
        "draft_year": draft_year,
        "headlines": headlines,
        "stat_titles": stat_titles,
        "champion": {"team_abbr": champion_team, "roster": champion_roster} if champion_team else None,
        # Backwards-compatible single squad keys (existing frontend uses them)
        "all_nba_first": team_squads.get("all_nba_first", []),
        "all_defensive_first": team_squads.get("all_defensive_first", []),
        # Full picture of every All- squad
        "team_squads": team_squads,
        "hof_inductees": hof_inductees,
        "draft_size": len(drafted),
        "top_picks": drafted[:14],
        "standings": {"east": east, "west": west},
        "playoff_series": playoff_rows,
    }


@router.get("")
def list_years():
    """Distinct seasons we have data for, newest first."""
    sb = get_supabase()
    res = (
        sb.table("stats_normalized")
        .select("season")
        .eq("season_type", "regular_season")
        .execute()
    )
    seasons = sorted({r["season"] for r in res.data}, reverse=True)
    return seasons


# Stat categories surfaced by /years/{season}/leaders. Same set the
# compute_stat_titles job uses, so the leader-board is a direct extension of
# the existing "Statistical titles" cards on the year page.
_LEADER_CATEGORIES: dict[str, tuple[str, str]] = {
    # award_enum -> (stats_normalized column, frontend display key)
    "scoring_title": ("pts_per_game", "points"),
    "assists_title": ("ast_per_game", "assists"),
    "rebounding_title": ("reb_per_game", "rebounds"),
    "steals_title": ("stl_per_game", "steals"),
    "blocks_title": ("blk_per_game", "blocks"),
}

# Modern NBA qualification rule shared with the title-computation job.
_LEADER_MIN_GAMES = 58


@router.get("/{season}/leaders")
def get_season_leaders(season: str, response: Response, limit: int = Query(10, le=50)):
    """Top-N leaders per stat category for a single season.

    Powers the click-through from `Statistical titles` cards on /years/[season]
    so the user can see the full top-10 in scoring/assists/rebounds/steals/blocks
    rather than just the season winner.
    """
    sb = get_supabase()
    # Pull the rows once (paginated) and rank in-Python. This is cheaper than
    # one query per category and keeps PostgREST happy with a single round-trip.
    columns = (
        "player_id, team, games_played, minutes_total, "
        + ", ".join(c for c, _ in _LEADER_CATEGORIES.values())
    )
    rows: list[dict] = []
    page = 1000
    offset = 0
    while True:
        res = (
            sb.table("stats_normalized")
            .select(columns)
            .eq("season", season)
            .eq("season_type", "regular_season")
            .gte("games_played", _LEADER_MIN_GAMES)
            .range(offset, offset + page - 1)
            .execute()
        )
        chunk = res.data or []
        rows.extend(chunk)
        if len(chunk) < page:
            break
        offset += page

    # Dedupe trade-on-season players by keeping the (player_id, max games) row.
    # Otherwise a guy who got traded mid-season would show up twice.
    by_pid: dict[str, dict] = {}
    for r in rows:
        prev = by_pid.get(r["player_id"])
        if prev is None or (r.get("games_played") or 0) > (prev.get("games_played") or 0):
            by_pid[r["player_id"]] = r
    deduped = list(by_pid.values())

    # Score each category and grab the top N.
    leaders: dict[str, list[dict]] = {}
    all_player_ids: set[str] = set()
    for award, (col, key) in _LEADER_CATEGORIES.items():
        ranked = [r for r in deduped if r.get(col) is not None]
        ranked.sort(
            key=lambda r: (r.get(col) or 0, r.get("minutes_total") or 0),
            reverse=True,
        )
        top = ranked[:limit]
        leaders[key] = top
        for r in top:
            all_player_ids.add(r["player_id"])

    # Single round-trip for player cards.
    players_res = (
        sb.table("players")
        .select(
            "id, external_id, name, slug, position, current_team, "
            "is_nba, headshot_url, archetype, archetype_confidence"
        )
        .in_("id", list(all_player_ids))
        .execute()
        if all_player_ids
        else None
    )
    cards = {p["id"]: p for p in (players_res.data if players_res else [])}

    # Project: rank, value, team_abbr, player card.
    out: dict[str, list[dict]] = {}
    for award, (col, key) in _LEADER_CATEGORIES.items():
        entries = []
        for i, r in enumerate(leaders[key], start=1):
            p = cards.get(r["player_id"])
            if not p:
                continue
            entries.append({
                "rank": i,
                "value": r.get(col),
                "games_played": r.get("games_played"),
                "team_abbr": r.get("team"),
                "player": p,
            })
        out[key] = entries

    response.headers["Cache-Control"] = "public, max-age=600, s-maxage=600, stale-while-revalidate=1800"
    return {"season": season, "leaders": out}
