"""Recent per-game log for a player, assembled from the public CDN.

Why not stats.nba.com PlayerGameLog: it blocks datacenter IPs AND times out
intermittently even locally. Instead we read the player's line straight from
each game's box score on cdn.nba.com (reliable + cloud-safe), walking back from
the team's most recent completed games. This covers the current season's recent
games; the season-by-season totals live in the SeasonLog already.

The assembled result is cached for an hour (boxscores of finished games never
change), so the handful of CDN fetches happen at most once per player/hour.
"""

from __future__ import annotations

import time

from app.services import nba_live

_TTL = 3600
_cache: dict[str, tuple[float, list[dict]]] = {}


def get_recent_games(
    person_id: str | int,
    team_tricode: str,
    limit: int = 12,
) -> list[dict]:
    pid = str(person_id)
    tc = (team_tricode or "").upper()
    key = f"{pid}|{tc}|{limit}"
    now = time.monotonic()
    hit = _cache.get(key)
    if hit and now - hit[0] < _TTL:
        return hit[1]

    if not pid or not tc:
        return []

    sched = nba_live.get_schedule()
    team_games = []
    for gd in sched.get("game_dates", []):
        for g in gd.get("games", []):
            if g.get("status") != 3:
                continue
            gid = g.get("game_id") or ""
            if not (gid.startswith("002") or gid.startswith("004")):
                continue  # regular season + playoffs only
            h, a = g.get("home") or {}, g.get("away") or {}
            if tc in (h.get("tricode"), a.get("tricode")):
                team_games.append(g)
    team_games.sort(key=lambda g: g.get("game_time_utc") or "", reverse=True)

    out: list[dict] = []
    for g in team_games:
        if len(out) >= limit:
            break
        box = nba_live.get_boxscore(g["game_id"])
        if not box:
            continue
        home, away = box.get("home") or {}, box.get("away") or {}
        is_home = (home.get("tricode") == tc)
        mine, opp = (home, away) if is_home else (away, home)
        line = next(
            (p for p in (mine.get("players") or []) if str(p.get("person_id")) == pid),
            None,
        )
        if not line:
            continue
        my_score = mine.get("score")
        opp_score = opp.get("score")
        wl = None
        if my_score is not None and opp_score is not None:
            wl = "W" if my_score > opp_score else "L"
        out.append(
            {
                "game_id": box.get("game_id"),
                "date": g.get("game_time_utc"),
                "matchup": f"{tc} {'vs' if is_home else '@'} {opp.get('tricode')}",
                "wl": wl,
                "team_score": my_score,
                "opp_score": opp_score,
                "min": line.get("minutes"),
                "pts": line.get("points"),
                "reb": line.get("rebounds"),
                "ast": line.get("assists"),
                "stl": line.get("steals"),
                "blk": line.get("blocks"),
                "tov": None,
                "fgm": line.get("fgm"),
                "fga": line.get("fga"),
                "tpm": line.get("tpm"),
                "tpa": line.get("tpa"),
                "ftm": line.get("ftm"),
                "fta": line.get("fta"),
                "plus_minus": line.get("plus_minus"),
            }
        )

    _cache[key] = (now, out)
    return out
