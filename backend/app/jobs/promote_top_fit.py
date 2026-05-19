"""Promote each player's top _fits archetype into the canonical
`players.archetype` + `players.archetype_confidence` columns.

The classifier picks via strict pass/fail thresholds, but the partial-match
scorer (which produces `_fits`) often disagrees with it on borderline cases
— Tyler Herro classifies as `floor_general` strictly, but his top fit is
`movement_shooter` at 68%, which is closer to how analysts describe him.

The user asked: "sempre mostre o arquetipo que mais tem sentido (porcentagem)
como o principal". So we make the display column reflect the top fit.

    python -m app.jobs.promote_top_fit [--dry-run]
"""

from __future__ import annotations

import argparse
from typing import Any

from app.core.supabase_client import get_supabase


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    sb = get_supabase()
    # Page through every NBA player whose percentile cache exists. _fits is
    # written by the classifier job, so any NBA player relevant enough to
    # have been classified will have at least one fit.
    rows: list[dict[str, Any]] = []
    page = 1000
    offset = 0
    while True:
        res = (
            sb.table("players")
            .select("id, name, archetype, archetype_confidence, percentiles")
            .eq("is_nba", True)
            .not_.is_("percentiles", "null")
            .range(offset, offset + page - 1)
            .execute()
        )
        chunk = res.data or []
        rows.extend(chunk)
        if len(chunk) < page:
            break
        offset += page

    updates: list[dict[str, Any]] = []
    skipped_no_fits = 0
    unchanged = 0
    for r in rows:
        fits = ((r.get("percentiles") or {}).get("_fits") or [])
        if not fits:
            skipped_no_fits += 1
            continue
        top = fits[0]
        new_arch = top.get("archetype")
        new_conf = top.get("score")
        if not new_arch:
            skipped_no_fits += 1
            continue
        if r.get("archetype") == new_arch and r.get("archetype_confidence") == new_conf:
            unchanged += 1
            continue
        updates.append({
            "id": r["id"],
            "archetype": new_arch,
            "archetype_confidence": new_conf,
        })

    print(f"Total NBA players with percentiles: {len(rows)}")
    print(f"  no _fits:           {skipped_no_fits}")
    print(f"  already promoted:   {unchanged}")
    print(f"  to update:          {len(updates)}")

    if args.dry_run or not updates:
        print("Dry run — nothing written." if args.dry_run else "Nothing to update.")
        return

    # Apply one update per row. Supabase doesn't expose bulk-update with
    # different values per row in a single call, so we just loop. Few hundred
    # writes, runs in seconds.
    written = 0
    for u in updates:
        sb.table("players").update({
            "archetype": u["archetype"],
            "archetype_confidence": u["archetype_confidence"],
        }).eq("id", u["id"]).execute()
        written += 1
        if written % 100 == 0:
            print(f"  {written}/{len(updates)}")
    print(f"\nDone. {written} players promoted.")


if __name__ == "__main__":
    main()
