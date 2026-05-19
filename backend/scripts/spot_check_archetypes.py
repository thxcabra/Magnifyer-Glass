"""Spot-check archetype assignments for well-known players."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.supabase_client import get_supabase  # noqa: E402


NAMES = [
    "Shaquille O'Neal",
    "Hakeem Olajuwon",
    "Kareem Abdul",
    "Tim Duncan",
    "Bill Russell",
    "Wilt Chamberlain",
    "Michael Jordan",
    "Larry Bird",
    "Magic Johnson",
    "Kobe Bryant",
    "Scottie Pippen",
    "Karl Malone",
    "Charles Barkley",
    "Dennis Rodman",
    "Patrick Ewing",
    "David Robinson",
    "Dwyane Wade",
    "Steve Nash",
    "Chris Paul",
    "Kevin Garnett",
    "Dirk Nowitzki",
    "Reggie Miller",
    "Ray Allen",
    "Allen Iverson",
    "LeBron James",
    "Stephen Curry",
    "Kevin Durant",
    "Russell Westbrook",
    "James Harden",
    "Nikola Jokić",
    "Joel Embiid",
    "Giannis Antetokounmpo",
    "Luka Don",
    "Victor Wembanyama",
    "Klay Thompson",
    "Rudy Gobert",
    "Anthony Davis",
    "Draymond Green",
    "Bam Adebayo",
    "Jrue Holiday",
    "Marcus Smart",
    "Mikal Bridges",
    "Lou Williams",
    "Jamal Crawford",
]


def main() -> None:
    sb = get_supabase()
    print(f"{'PLAYER':<26} {'POS':<5} {'ARCHETYPE':<24} {'CONF':>5}")
    print("-" * 64)
    for q in NAMES:
        r = (
            sb.table("players")
            .select("name, position, archetype, archetype_confidence")
            .ilike("name", f"%{q}%")
            .limit(2)
            .execute()
        )
        for x in r.data:
            arch = x["archetype"] or "(none)"
            conf = x["archetype_confidence"]
            conf_str = f"{conf:.2f}" if conf is not None else "—"
            pos = x["position"] or "—"
            print(f"  {x['name']:<24} {pos:<5} {arch:<24} {conf_str:>5}")


if __name__ == "__main__":
    main()
