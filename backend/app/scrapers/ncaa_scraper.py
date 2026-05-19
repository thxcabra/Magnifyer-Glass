"""Sports-Reference (NCAA) scraper using Playwright.

We target the per-100-possessions table on each player page. Sports-Reference
already publishes a `players_per_poss` table, so we can map fields directly
to stats_normalized without re-deriving possessions.
"""

from __future__ import annotations

import argparse
import asyncio
from typing import Any

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

from app.core.supabase_client import get_supabase
from app.models.schemas import PlayerSource

BASE = "https://www.sports-reference.com/cbb"
USER_AGENT = "Mozilla/5.0 (compatible; MagnifyerGlassBot/0.1; +https://magnifyer.glass)"


async def fetch_html(url: str) -> str:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(user_agent=USER_AGENT)
        page = await ctx.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        # Sports-Reference hides some tables inside HTML comments — render then read.
        html = await page.content()
        await browser.close()
        return html


def parse_per_poss_table(html: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "lxml")
    # Sports-Reference wraps secondary tables in HTML comments; unwrap them.
    for comment in soup.find_all(string=lambda s: isinstance(s, str) and "table" in s):
        try:
            inner = BeautifulSoup(comment, "lxml")
            comment.replace_with(inner)
        except Exception:  # noqa: BLE001
            continue

    table = soup.select_one("table#players_per_poss")
    if not table:
        return []

    rows: list[dict[str, Any]] = []
    for tr in table.select("tbody tr"):
        if tr.get("class") and "thead" in tr.get("class"):
            continue
        cells = {c.get("data-stat"): c.get_text(strip=True) for c in tr.find_all(["td", "th"])}
        rows.append(cells)
    return rows


def map_row(player_id: str, season_cells: dict[str, Any]) -> dict[str, Any]:
    def f(k: str) -> float | None:
        v = season_cells.get(k)
        try:
            return float(v) if v not in (None, "", "-") else None
        except (TypeError, ValueError):
            return None

    return {
        "player_id": player_id,
        "season": season_cells.get("season") or "",
        "league": PlayerSource.ncaa.value,
        "team": season_cells.get("school_name"),
        "games_played": int(season_cells.get("g") or 0) if season_cells.get("g") else None,
        "pts_per100": f("pts_per_poss"),
        "ast_per100": f("ast_per_poss"),
        "reb_per100": f("trb_per_poss"),
        "stl_per100": f("stl_per_poss"),
        "blk_per100": f("blk_per_poss"),
        "tov_per100": f("tov_per_poss"),
        "fga_per100": f("fga_per_poss"),
        "fta_per100": f("fta_per_poss"),
        "tpa_per100": f("fg3a_per_poss"),
        "tpm_per100": f("fg3_per_poss"),
        "fg_pct": f("fg_pct"),
        "tp_pct": f("fg3_pct"),
        "ft_pct": f("ft_pct"),
    }


async def scrape_player(slug: str, player_id: str) -> int:
    url = f"{BASE}/players/{slug}.html"
    html = await fetch_html(url)
    rows = [map_row(player_id, r) for r in parse_per_poss_table(html)]
    rows = [r for r in rows if r["season"]]
    if rows:
        sb = get_supabase()
        sb.table("stats_normalized").upsert(
            rows, on_conflict="player_id,season,league"
        ).execute()
    return len(rows)


async def main_async(slug: str, player_id: str) -> None:
    n = await scrape_player(slug, player_id)
    print(f"Upserted {n} season rows for {slug}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True, help="Sports-Reference slug, e.g. 'cooper-flagg-1'")
    parser.add_argument("--player-id", required=True, help="UUID from players table")
    args = parser.parse_args()
    asyncio.run(main_async(args.slug, args.player_id))


if __name__ == "__main__":
    main()
