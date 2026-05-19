"""Per-player awards backfill via nba_api's PlayerAwards endpoint.

PlayerAwards returns a row per (award, season) — MVP, All-Star, All-NBA,
Finals MVP, NBA Champion, HOF, etc. We map the free-text DESCRIPTION
field to our controlled `award_type` enum and persist.

    python -m app.scrapers.awards_loader [--force]
"""

from __future__ import annotations

import argparse
import re
import time
from typing import Any

from nba_api.stats.endpoints import PlayerAwards

from app.core.supabase_client import get_supabase
from app.jobs.normalize_team_abbr import CITY10_TO_ABBR, resolve_la
from app.scrapers.nba_api_loader import (
    REQUEST_DELAY_SEC,
    REQUEST_TIMEOUT_SEC,
    _with_retry,
)

BATCH_WRITE = 500


# Map the free-text "DESCRIPTION" from PlayerAwards to our enum.
# Order matters: more specific keys first (so "All-Defensive Team First"
# matches before any vaguer "All-Defensive").
DESCRIPTION_MAP: list[tuple[str, str]] = [
    ("NBA Most Valuable Player", "mvp"),
    ("NBA Finals Most Valuable Player", "finals_mvp"),
    ("NBA Defensive Player of the Year", "dpoy"),
    ("NBA Rookie of the Year", "roy"),
    ("NBA Sixth Man of the Year", "sixth_man"),
    ("NBA Most Improved Player", "most_improved"),
    ("NBA Clutch Player of the Year", "clutch_player"),
    ("NBA All-Star Most Valuable Player", "all_star_mvp"),
    ("NBA All-Star", "all_star"),
    ("All-NBA", "all_nba_first"),         # refined below via TEAM number
    ("All-Defensive Team", "all_defensive_first"),
    ("All-Rookie Team", "all_rookie_first"),
    ("NBA Champion", "champion"),
    ("Hall of Fame", "hof_inductee"),
    ("Scoring Leader", "scoring_title"),
    ("Assists Leader", "assists_title"),
    ("Rebounds Leader", "rebounding_title"),
    ("Steals Leader", "steals_title"),
    ("Blocks Leader", "blocks_title"),
]


def _classify_award(row: dict[str, Any]) -> str:
    """Best-effort mapping from PlayerAwards row → our award_type enum."""
    desc = (row.get("DESCRIPTION") or "").strip()
    team_no = row.get("ALL_NBA_TEAM_NUMBER") or row.get("TEAM")  # endpoint varies

    if "All-NBA" in desc:
        if str(team_no) in ("1", "First"): return "all_nba_first"
        if str(team_no) in ("2", "Second"): return "all_nba_second"
        if str(team_no) in ("3", "Third"): return "all_nba_third"
        return "all_nba_first"  # legacy seasons without a number → assume first team
    if "All-Defensive" in desc:
        if str(team_no) in ("1", "First"): return "all_defensive_first"
        if str(team_no) in ("2", "Second"): return "all_defensive_second"
        return "all_defensive_first"
    if "All-Rookie" in desc:
        if str(team_no) in ("1", "First"): return "all_rookie_first"
        if str(team_no) in ("2", "Second"): return "all_rookie_second"
        return "all_rookie_first"

    for needle, label in DESCRIPTION_MAP:
        if needle in desc:
            return label
    return "other"


_SEASON_RE = re.compile(r"^(?P<y>\d{4})-(?P<n>\d{2})$")


def _normalize_season(raw: Any) -> str | None:
    """PlayerAwards returns season as 'YYYY-YY' or just a single year for HOF."""
    if raw is None or raw == "":
        return None
    s = str(raw).strip()
    if _SEASON_RE.match(s):
        return s
    # Sometimes a 4-digit year sneaks in (e.g. "1996" for an MVP); convert to season form.
    if re.fullmatch(r"\d{4}", s):
        y = int(s)
        return f"{y - 1}-{str(y)[-2:]}"
    return None


def _team_to_abbr(raw: Any, current_team: str | None) -> str | None:
    """Normalize PlayerAwards' free-text TEAM field to a 3-letter NBA abbr.

    PlayerAwards returns the city/team name (e.g. "Oklahoma City Thunder").
    We slice the prefix the same way the existing data was truncated so the
    CITY10_TO_ABBR lookup hits cleanly, with a Los-Angeles disambiguation
    that defers to the player's current team.
    """
    raw_text = (raw or "").strip()
    if not raw_text:
        return None
    key = raw_text[:10].rstrip()
    if key.startswith("Los Angele"):
        return resolve_la(current_team)
    abbr = CITY10_TO_ABBR.get(key)
    if abbr:
        return abbr
    # Last-resort: if the raw_text is already a 2-3 char ALLCAPS abbr, take it.
    if 2 <= len(raw_text) <= 4 and raw_text.isupper():
        return raw_text
    return None


def fetch_player_awards(external_id: str, current_team: str | None = None) -> list[dict[str, Any]]:
    endpoint = _with_retry(
        lambda: PlayerAwards(player_id=external_id, timeout=REQUEST_TIMEOUT_SEC),
        f"awards {external_id}",
    )
    if endpoint is None:
        return []
    try:
        df = endpoint.player_awards.get_data_frame()
    except Exception:  # noqa: BLE001
        return []
    if df.empty:
        return []

    out: list[dict[str, Any]] = []
    for _, r in df.iterrows():
        row = r.to_dict()
        award = _classify_award(row)
        if award == "other":
            continue
        out.append({
            "award": award,
            "season": _normalize_season(row.get("SEASON")),
            "team_abbr": _team_to_abbr(row.get("TEAM"), current_team),
            "description": (row.get("DESCRIPTION") or "")[:200] or None,
        })
    return out


def _paginate_players(sb) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    page = 1000
    offset = 0
    while True:
        res = (
            sb.table("players")
            .select("id, external_id, name, current_team")
            .eq("is_nba", True)
            .range(offset, offset + page - 1)
            .execute()
        )
        chunk = res.data or []
        out.extend(chunk)
        if len(chunk) < page:
            break
        offset += page
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-fetch players who already have at least one award recorded.",
    )
    args = parser.parse_args()

    sb = get_supabase()
    players = _paginate_players(sb)

    if not args.force:
        # Skip players who already have any awards rows.
        existing = (
            sb.table("player_awards")
            .select("player_id", count="exact")
            .execute()
        )
        existing_ids = {r["player_id"] for r in existing.data}
        players = [p for p in players if p["id"] not in existing_ids]

    print(f"Targets: {len(players)} player{'s' if len(players) != 1 else ''}")

    written = 0
    fail = 0
    pending: list[dict[str, Any]] = []

    for i, p in enumerate(players, start=1):
        awards = fetch_player_awards(p["external_id"], p.get("current_team"))
        if awards is None:
            fail += 1
        else:
            for a in awards:
                pending.append({**a, "player_id": p["id"]})
            written += len(awards)

        if len(pending) >= BATCH_WRITE:
            _flush(sb, pending)
            pending = []

        if i % 25 == 0 or i == len(players):
            print(f"  [{i}/{len(players)}] awards written: {written}  failed players: {fail}")

        time.sleep(REQUEST_DELAY_SEC)

    if pending:
        _flush(sb, pending)

    print(f"\nDone. {written} award rows written for {len(players)} players.")


def _flush(sb, pending: list[dict[str, Any]]) -> None:
    if not pending:
        return
    # Single proper unique constraint added in migration 011. Awards without a
    # season (HOF-style) get the '_lifetime_' sentinel so the constraint applies.
    for r in pending:
        if not r.get("season"):
            r["season"] = "_lifetime_"
    sb.table("player_awards").upsert(
        pending, on_conflict="player_id,award,season"
    ).execute()


if __name__ == "__main__":
    main()
