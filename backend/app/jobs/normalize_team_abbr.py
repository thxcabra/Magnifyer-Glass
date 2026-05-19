"""One-shot fix: convert the broken truncated city names in
`player_awards.team_abbr` (e.g. "Oklahoma C", "Los Angele") to the canonical
3-letter abbreviations ("OKC", "LAL"/"LAC", etc.).

PlayerAwards from nba_api exposes the team CITY in its TEAM column rather than
the abbreviation, and earlier ingest truncated it to fit a 10-char column.
This script reads existing rows, resolves the abbr via a curated lookup that
covers franchise relocations (Seattle → OKC, New Jersey → BKN, Vancouver →
MEM, etc.), and upserts the cleaned values.

For ambiguous Los-Angeles rows, we use the player's `current_team` as a
tiebreaker — it's not perfect for players who switched LAL↔LAC, but it gets
the common case right.

    python -m app.jobs.normalize_team_abbr [--dry-run]
"""

from __future__ import annotations

import argparse
from collections import defaultdict

from app.core.supabase_client import get_supabase


# Maps the first 10 chars of the team city/name field PlayerAwards exposes
# to the canonical NBA abbreviation. Includes the relocations so a 1990s
# Seattle Supersonics MVP rolls forward to OKC's lineage, etc.
# Lookup by the city/name prefix as it shows up in the truncated team_abbr
# field. Keys are pre-stripped of trailing whitespace, so we don't have to
# write both 'Charlotte' and 'Charlotte '.
CITY10_TO_ABBR: dict[str, str] = {
    "Atlanta Ha": "ATL",
    "Boston Cel": "BOS",
    "Brooklyn N": "BKN",
    "New Jersey": "BKN",
    "Charlotte": "CHA",
    "Chicago Bu": "CHI",
    "Cleveland": "CLE",
    "Dallas Mav": "DAL",
    "Denver Nug": "DEN",
    "Detroit Pi": "DET",
    "Golden Sta": "GSW",
    "Houston Ro": "HOU",
    "Indiana Pa": "IND",
    "LA Clipper": "LAC",
    "Memphis Gr": "MEM",
    "Vancouver": "MEM",
    "Miami Heat": "MIA",
    "Milwaukee": "MIL",
    "Minnesota": "MIN",
    "New Orlean": "NOP",
    "New York K": "NYK",
    "Oklahoma C": "OKC",
    "Seattle Su": "OKC",
    "Orlando Ma": "ORL",
    "Philadelph": "PHI",
    "Phoenix Su": "PHX",
    "Portland T": "POR",
    "Sacramento": "SAC",
    "San Antoni": "SAS",
    "San Diego": "SAS",     # Spurs played as San Diego Rockets pre-1976; close enough
    "Toronto Ra": "TOR",
    "Utah Jazz": "UTA",
    "Washington": "WAS",
}


# Disambiguation for the Los Angeles franchises. PlayerAwards returns
# "Los Angeles Lakers" or "Los Angeles Clippers" — both truncate to the same
# 10-char prefix. We resolve via the player's current_team when possible and
# fall back to LAL (the historically dominant franchise) if both options
# look equally likely.
def resolve_la(player_current_team: str | None) -> str:
    if player_current_team and player_current_team.upper() == "LAC":
        return "LAC"
    return "LAL"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    sb = get_supabase()

    # Page through every award row that looks suspicious (length > 4 or starts
    # with a known prefix). Anything already 3 chars is left alone.
    rows: list[dict] = []
    page = 1000
    offset = 0
    while True:
        res = (
            sb.table("player_awards")
            .select("id, team_abbr, player_id")
            .neq("team_abbr", None)
            .range(offset, offset + page - 1)
            .execute()
        )
        chunk = res.data or []
        rows.extend(chunk)
        if len(chunk) < page:
            break
        offset += page

    # Get player current_team values for the LA disambiguation. Same paginated
    # pattern because PostgREST caps at 1k.
    player_ids = list({r["player_id"] for r in rows if r["team_abbr"]})
    current_team_by_id: dict[str, str | None] = {}
    for i in range(0, len(player_ids), page):
        sub = player_ids[i : i + page]
        if not sub:
            break
        res = sb.table("players").select("id, current_team").in_("id", sub).execute()
        for p in res.data or []:
            current_team_by_id[p["id"]] = p["current_team"]

    changes: list[tuple[str, str, str]] = []  # (id, old, new)
    skipped: dict[str, int] = defaultdict(int)
    for r in rows:
        old = (r.get("team_abbr") or "").strip()
        if not old:
            continue
        # Already canonical — skip.
        if len(old) <= 3 and old.isupper():
            continue
        # Strip trailing whitespace so 'Charlotte' and 'Charlotte ' both hit.
        key = old.rstrip()
        if key.startswith("Los Angele"):
            new = resolve_la(current_team_by_id.get(r["player_id"]))
        else:
            new = CITY10_TO_ABBR.get(key, "")
        if not new:
            skipped[old] += 1
            continue
        if new != old:
            changes.append((r["id"], old, new))

    print(f"To update: {len(changes)}")
    if skipped:
        print("Unmapped values (left as-is):")
        for k, v in sorted(skipped.items(), key=lambda x: -x[1])[:20]:
            print(f"  {v:5d}  {k!r}")

    if args.dry_run:
        print("Dry run — not writing.")
        return

    # Batch updates: PostgREST doesn't support bulk update by id, so we
    # group by new value and upsert in 500-row chunks.
    by_new: dict[str, list[str]] = defaultdict(list)
    for row_id, _old, new in changes:
        by_new[new].append(row_id)

    written = 0
    for new, ids in by_new.items():
        for i in range(0, len(ids), 500):
            chunk = ids[i : i + 500]
            sb.table("player_awards").update({"team_abbr": new}).in_("id", chunk).execute()
            written += len(chunk)
            print(f"  {new}: +{len(chunk)} (total {written}/{len(changes)})")
    print(f"\nDone. {written} rows updated.")


if __name__ == "__main__":
    main()
