"""Batch NCAA scraper — drives ncaa_scraper for a manifest of prospects.

A prospect manifest is a JSON file shaped like:

    [
      {
        "name": "Cooper Flagg",
        "sr_slug": "cooper-flagg-1",       # Sports-Reference URL slug
        "position": "F",
        "draft_class": 2025,
        "college": "Duke"
      },
      ...
    ]

Usage:
    python -m app.scrapers.ncaa_batch --manifest prospects/2025.json
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
from pathlib import Path
from typing import Any

from app.core.supabase_client import get_supabase
from app.models.schemas import PlayerSource
from app.scrapers.ncaa_scraper import scrape_player

REQUEST_DELAY_SEC = 1.0  # Sports-Reference is stricter than nba.com; back off more


def _slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def ensure_player(entry: dict[str, Any]) -> str:
    """Upsert the prospect row; return its UUID."""
    sb = get_supabase()
    external_id = f"sr:{entry['sr_slug']}"
    row = {
        "external_id": external_id,
        "source": PlayerSource.ncaa.value,
        "name": entry["name"],
        "slug": _slugify(entry["name"]),
        "is_nba": False,
        "position": entry.get("position"),
        "draft_class": entry.get("draft_class"),
        "college": entry.get("college"),
    }
    sb.table("players").upsert(row, on_conflict="external_id").execute()
    got = sb.table("players").select("id").eq("external_id", external_id).limit(1).execute()
    return got.data[0]["id"]


async def run(manifest_path: Path) -> None:
    entries: list[dict[str, Any]] = json.loads(manifest_path.read_text(encoding="utf-8"))
    print(f"Loaded {len(entries)} prospects from {manifest_path.name}")

    ok = fail = 0
    for i, entry in enumerate(entries, start=1):
        try:
            player_id = ensure_player(entry)
            n = await scrape_player(entry["sr_slug"], player_id)
            print(f"  [{i}/{len(entries)}] {entry['name']:<28} +{n} season rows")
            ok += 1
        except Exception as e:  # noqa: BLE001
            print(f"  [{i}/{len(entries)}] {entry['name']:<28} FAILED: {type(e).__name__}: {e}")
            fail += 1
        await asyncio.sleep(REQUEST_DELAY_SEC)

    print(f"\nDone. {ok} ok, {fail} failed.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()
    asyncio.run(run(args.manifest))


if __name__ == "__main__":
    main()
