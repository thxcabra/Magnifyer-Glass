"""Per-player NBA bio + position backfill via CommonPlayerInfo.

The bulk dashboards don't return position, and the classifier needs it to
unlock six archetypes (point_forward, stretch_big, rim_protector, post_up_hub,
mobile_big, slashing_wing). While we're calling CommonPlayerInfo per player,
we also pull country, college, birthdate, and draft info — the entire bio.

Idempotent: skips players who already have a position. Writes progress
every batch so a crash doesn't lose work.

    python -m app.scrapers.nba_bio_loader [--force]
"""

from __future__ import annotations

import argparse
import time
from datetime import datetime
from typing import Any

from nba_api.stats.endpoints import CommonPlayerInfo

# Reuse the loader's header config + retry helpers so we're polite to stats.nba.com.
from app.scrapers.nba_api_loader import (
    REQUEST_DELAY_SEC,
    REQUEST_TIMEOUT_SEC,
    _to_int,
    _with_retry,
)
from app.core.supabase_client import get_supabase

BATCH_WRITE = 50

# NBA position strings are sometimes things like "Forward-Guard". We map those
# down to our `player_position` enum.
_POSITION_MAP = {
    "Guard": "G",
    "Forward": "F",
    "Center": "C",
    "Guard-Forward": "G-F",
    "Forward-Guard": "F-G",
    "Forward-Center": "F-C",
    "Center-Forward": "C-F",
    "G": "G", "F": "F", "C": "C",
}


def _parse_position(raw: str | None) -> str | None:
    if not raw:
        return None
    return _POSITION_MAP.get(raw.strip(), None)


def _parse_birthdate(raw: str | None) -> str | None:
    if not raw:
        return None
    # Format: "1984-12-30T00:00:00"
    try:
        return datetime.fromisoformat(raw.split("T")[0]).date().isoformat()
    except (TypeError, ValueError):
        return None


def _parse_height(raw: str | None) -> float | None:
    """`HEIGHT` is formatted "6-9" (feet-inches). Return total inches."""
    if not raw or not isinstance(raw, str) or "-" not in raw:
        return None
    try:
        ft, inch = raw.split("-")
        return float(ft) * 12 + float(inch)
    except (TypeError, ValueError):
        return None


def _str_or_none(v: Any) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def _fetch_player_info(external_id: str) -> dict[str, Any] | None:
    endpoint = _with_retry(
        lambda: CommonPlayerInfo(player_id=external_id, timeout=REQUEST_TIMEOUT_SEC),
        f"bio {external_id}",
    )
    if endpoint is None:
        return None
    df = endpoint.common_player_info.get_data_frame()
    if df.empty:
        return None
    row = df.iloc[0]
    return {
        "position": _parse_position(row.get("POSITION")),
        "country": _str_or_none(row.get("COUNTRY")),
        "college": _str_or_none(row.get("SCHOOL")),
        "born_on": _parse_birthdate(row.get("BIRTHDATE")),
        "draft_class": _to_int(row.get("DRAFT_YEAR")),
        "draft_round": _to_int(row.get("DRAFT_ROUND")),
        "draft_number": _to_int(row.get("DRAFT_NUMBER")),
        "jersey_number": _str_or_none(row.get("JERSEY")),
        "height_inches": _parse_height(_str_or_none(row.get("HEIGHT"))),
        "current_team": _str_or_none(row.get("TEAM_ABBREVIATION")),
        "team_id": _to_int(row.get("TEAM_ID")),
        # CDN headshot URL — same for everyone, built from external_id.
        "headshot_url": (
            f"https://cdn.nba.com/headshots/nba/latest/1040x760/{external_id}.png"
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-fetch players who already have a position set.",
    )
    args = parser.parse_args()

    sb = get_supabase()
    # Pull all NBA player ids — paginated.
    rows: list[dict[str, Any]] = []
    page = 1000
    offset = 0
    while True:
        res = (
            sb.table("players")
            .select("id, external_id, name, position, jersey_number, height_inches")
            .eq("is_nba", True)
            .range(offset, offset + page - 1)
            .execute()
        )
        chunk = res.data or []
        rows.extend(chunk)
        if len(chunk) < page:
            break
        offset += page

    if not args.force:
        # Skip only when every field this loader writes is already present.
        rows = [
            r for r in rows
            if not (r.get("position") and r.get("jersey_number") and r.get("height_inches"))
        ]

    print(f"Targets: {len(rows)} player{'s' if len(rows) != 1 else ''} to backfill")

    pending: list[dict[str, Any]] = []
    fail = 0
    for i, r in enumerate(rows, start=1):
        info = _fetch_player_info(r["external_id"])
        if info is None:
            fail += 1
        else:
            update = {k: v for k, v in info.items() if v is not None}
            if update:
                # NOT NULL fields travel with every upsert.
                pending.append(
                    {
                        "id": r["id"],
                        "name": r["name"],
                        **update,
                    }
                )

        if len(pending) >= BATCH_WRITE:
            _flush(sb, pending)
            pending = []

        if i % 25 == 0 or i == len(rows):
            print(f"  [{i}/{len(rows)}] ok={i - fail} fail={fail}")

        time.sleep(REQUEST_DELAY_SEC)

    if pending:
        _flush(sb, pending)

    print(f"\nDone. {len(rows) - fail} players updated, {fail} failed.")


def _flush(sb, pending: list[dict[str, Any]]) -> None:
    # We need slug + source for the upsert because they're NOT NULL. Fetch them
    # in one call for this batch.
    ids = [p["id"] for p in pending]
    got = sb.table("players").select("id, slug, source").in_("id", ids).execute()
    by_id = {p["id"]: p for p in got.data}
    payload = []
    for p in pending:
        meta = by_id.get(p["id"])
        if not meta:
            continue
        payload.append({**p, "slug": meta["slug"], "source": meta["source"]})
    if payload:
        sb.table("players").upsert(payload, on_conflict="id").execute()


if __name__ == "__main__":
    main()
