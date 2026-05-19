"""RealGM (international) scraper using Playwright.

RealGM organizes player pages by `<id>/<slug>`. We scrape the per-game and
"advanced" tables, then derive per-100 metrics in normalization since RealGM
doesn't publish them directly.
"""

from __future__ import annotations

import argparse
import asyncio
from typing import Any

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

from app.core.supabase_client import get_supabase
from app.models.schemas import PlayerSource
from app.services.normalization import estimate_possessions, to_per_100

BASE = "https://basketball.realgm.com"
USER_AGENT = "Mozilla/5.0 (compatible; MagnifyerGlassBot/0.1; +https://magnifyer.glass)"


async def fetch_html(url: str) -> str:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(user_agent=USER_AGENT)
        page = await ctx.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        html = await page.content()
        await browser.close()
        return html


def parse_totals_table(html: str) -> list[dict[str, Any]]:
    """Extract the 'Totals' table off a RealGM player profile."""
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table", class_="tablesaw")
    if not table:
        return []

    headers = [th.get_text(strip=True) for th in table.select("thead th")]
    out = []
    for tr in table.select("tbody tr"):
        cells = [td.get_text(strip=True) for td in tr.find_all("td")]
        if len(cells) != len(headers):
            continue
        out.append(dict(zip(headers, cells, strict=False)))
    return out


def _to_float(v: Any) -> float | None:
    try:
        return float(v) if v not in (None, "", "-") else None
    except (TypeError, ValueError):
        return None


def map_row(player_id: str, row: dict[str, Any]) -> dict[str, Any] | None:
    season = row.get("Season")
    if not season:
        return None

    gp = int(row.get("GP") or 0)
    if gp == 0:
        return None

    pts = _to_float(row.get("PTS")) or 0.0
    ast = _to_float(row.get("AST")) or 0.0
    reb = _to_float(row.get("TRB")) or _to_float(row.get("REB")) or 0.0
    stl = _to_float(row.get("STL")) or 0.0
    blk = _to_float(row.get("BLK")) or 0.0
    tov = _to_float(row.get("TOV")) or 0.0
    fga = _to_float(row.get("FGA")) or 0.0
    fta = _to_float(row.get("FTA")) or 0.0
    tpa = _to_float(row.get("3PA")) or 0.0
    tpm = _to_float(row.get("3PM")) or 0.0
    oreb = _to_float(row.get("ORB")) or 0.0

    poss_per_game = estimate_possessions(fga=fga, fta=fta, tov=tov, oreb=oreb)
    poss_total = poss_per_game * gp

    return {
        "player_id": player_id,
        "season": season,
        "league": PlayerSource.international.value,
        "team": row.get("Team"),
        "games_played": gp,
        "pts_per100": to_per_100(pts * gp, poss_total),
        "ast_per100": to_per_100(ast * gp, poss_total),
        "reb_per100": to_per_100(reb * gp, poss_total),
        "stl_per100": to_per_100(stl * gp, poss_total),
        "blk_per100": to_per_100(blk * gp, poss_total),
        "tov_per100": to_per_100(tov * gp, poss_total),
        "fga_per100": to_per_100(fga * gp, poss_total),
        "fta_per100": to_per_100(fta * gp, poss_total),
        "tpa_per100": to_per_100(tpa * gp, poss_total),
        "tpm_per100": to_per_100(tpm * gp, poss_total),
        "fg_pct": _to_float(row.get("FG%")),
        "tp_pct": _to_float(row.get("3P%")),
        "ft_pct": _to_float(row.get("FT%")),
    }


async def scrape_player(realgm_id: int, slug: str, player_id: str) -> int:
    url = f"{BASE}/player/{slug}/Summary/{realgm_id}"
    html = await fetch_html(url)
    rows = [map_row(player_id, r) for r in parse_totals_table(html)]
    rows = [r for r in rows if r]
    if rows:
        sb = get_supabase()
        sb.table("stats_normalized").upsert(
            rows, on_conflict="player_id,season,league"
        ).execute()
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--realgm-id", type=int, required=True)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--player-id", required=True)
    args = parser.parse_args()
    n = asyncio.run(scrape_player(args.realgm_id, args.slug, args.player_id))
    print(f"Upserted {n} season rows for {args.slug}")


if __name__ == "__main__":
    main()
