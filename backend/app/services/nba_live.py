"""Live NBA data via the public CDN (cdn.nba.com).

Why a proxy and not persistence: live data is ephemeral and self-expiring.
Persisting it would mean a constant write loop with no benefit. Instead we
fetch on demand and hold a tiny in-memory TTL cache so a burst of viewers
during a game collapses into one CDN hit every ~15s.

Why this works from the cloud: the CDN blocks by *header*, not by IP (unlike
stats.nba.com which blocks datacenter ranges). Sending a browser User-Agent +
Referer/Origin returns 200 from anywhere. The nba_api `live` module uses the
same CDN.

All getters are defensive (`.get()` everywhere) and never raise on a bad
shape — callers get an empty-but-valid structure so the UI degrades to an
empty state instead of a 500.
"""

from __future__ import annotations

import time
from typing import Any

import httpx

_LIVE_BASE = "https://cdn.nba.com/static/json/liveData/{endpoint}"
_SCHEDULE_URL = "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.nba.com/",
    "Origin": "https://www.nba.com",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
}

_TIMEOUT = httpx.Timeout(8.0)

# url -> (monotonic_ts, payload)
_cache: dict[str, tuple[float, Any]] = {}


def _cached_get(url: str, ttl: float) -> Any | None:
    """GET with an in-memory TTL cache. On network error, serve stale if we
    have it; otherwise return None (callers turn that into an empty payload)."""
    now = time.monotonic()
    hit = _cache.get(url)
    if hit and now - hit[0] < ttl:
        return hit[1]
    try:
        with httpx.Client(timeout=_TIMEOUT, headers=_HEADERS, http2=False) as client:
            resp = client.get(url)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return hit[1] if hit else None
    _cache[url] = (now, data)
    return data


# ---- normalizers ----------------------------------------------------------


def _team_brief(t: dict) -> dict:
    return {
        "tricode": t.get("teamTricode"),
        "name": t.get("teamName"),
        "city": t.get("teamCity"),
        "wins": t.get("wins"),
        "losses": t.get("losses"),
        "score": t.get("score"),
    }


def _leader(lead: dict | None) -> dict | None:
    if not lead:
        return None
    return {
        "name": lead.get("name"),
        "tricode": lead.get("teamTricode"),
        "points": lead.get("points"),
        "rebounds": lead.get("rebounds"),
        "assists": lead.get("assists"),
    }


def get_scoreboard() -> dict:
    """Today's games. Status: 1=pre, 2=live, 3=final."""
    raw = _cached_get(
        _LIVE_BASE.format(endpoint="scoreboard/todaysScoreboard_00.json"), ttl=15
    )
    sb = (raw or {}).get("scoreboard", {}) if raw else {}
    games = []
    for g in sb.get("games", []) or []:
        leaders = g.get("gameLeaders") or {}
        games.append(
            {
                "game_id": g.get("gameId"),
                "status": g.get("gameStatus"),
                "status_text": g.get("gameStatusText"),
                "period": g.get("period"),
                "game_clock": g.get("gameClock"),
                "game_time_utc": g.get("gameTimeUTC"),
                "home": _team_brief(g.get("homeTeam") or {}),
                "away": _team_brief(g.get("awayTeam") or {}),
                "leaders": {
                    "home": _leader(leaders.get("homeLeaders")),
                    "away": _leader(leaders.get("awayLeaders")),
                },
            }
        )
    return {"game_date": sb.get("gameDate"), "games": games}


def _player_line(p: dict) -> dict:
    s = p.get("statistics") or {}
    return {
        "person_id": p.get("personId"),
        "name": p.get("name") or p.get("nameI"),
        "jersey": p.get("jerseyNum"),
        "position": p.get("position"),
        "starter": p.get("starter") == "1",
        "oncourt": p.get("oncourt") == "1",
        "played": p.get("played") == "1",
        "minutes": s.get("minutes"),
        "points": s.get("points"),
        "rebounds": s.get("reboundsTotal", s.get("rebounds")),
        "assists": s.get("assists"),
        "steals": s.get("steals"),
        "blocks": s.get("blocks"),
        "fgm": s.get("fieldGoalsMade"),
        "fga": s.get("fieldGoalsAttempted"),
        "tpm": s.get("threePointersMade"),
        "tpa": s.get("threePointersAttempted"),
        "ftm": s.get("freeThrowsMade"),
        "fta": s.get("freeThrowsAttempted"),
        "plus_minus": s.get("plusMinusPoints"),
    }


def _box_team(t: dict) -> dict:
    return {
        "tricode": t.get("teamTricode"),
        "name": t.get("teamName"),
        "city": t.get("teamCity"),
        "score": t.get("score"),
        "players": [_player_line(p) for p in (t.get("players") or [])],
    }


def get_boxscore(game_id: str) -> dict | None:
    raw = _cached_get(
        _LIVE_BASE.format(endpoint=f"boxscore/boxscore_{game_id}.json"), ttl=20
    )
    if not raw:
        return None
    g = raw.get("game") or {}
    if not g:
        return None
    return {
        "game_id": g.get("gameId"),
        "status": g.get("gameStatus"),
        "status_text": g.get("gameStatusText"),
        "period": g.get("period"),
        "game_clock": g.get("gameClock"),
        "arena": (g.get("arena") or {}).get("arenaName"),
        "home": _box_team(g.get("homeTeam") or {}),
        "away": _box_team(g.get("awayTeam") or {}),
    }


def get_playbyplay(game_id: str) -> dict:
    raw = _cached_get(
        _LIVE_BASE.format(endpoint=f"playbyplay/playbyplay_{game_id}.json"), ttl=20
    )
    actions = ((raw or {}).get("game") or {}).get("actions") or []
    out = [
        {
            "action_number": a.get("actionNumber"),
            "clock": a.get("clock"),
            "period": a.get("period"),
            "team_tricode": a.get("teamTricode"),
            "description": a.get("description"),
            "score_home": a.get("scoreHome"),
            "score_away": a.get("scoreAway"),
            "action_type": a.get("actionType"),
        }
        for a in actions
    ]
    # Newest first reads better in a live feed.
    out.reverse()
    return {"game_id": game_id, "actions": out}


def _sched_team(t: dict) -> dict:
    return {
        "tricode": t.get("teamTricode"),
        "name": t.get("teamName"),
        "city": t.get("teamCity"),
        "wins": t.get("wins"),
        "losses": t.get("losses"),
        "score": t.get("score"),
    }


_EAST = {
    "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DET", "IND",
    "MIA", "MIL", "NYK", "ORL", "PHI", "TOR", "WAS",
}


def get_standings() -> dict:
    """Current-season standings, computed from completed regular-season games
    in the schedule (game ids starting with '002'). No stats.nba.com needed."""
    sched = get_schedule()
    rec: dict[str, dict] = {}
    for gd in sched.get("game_dates", []):
        for g in gd.get("games", []):
            if g.get("status") != 3:
                continue
            gid = g.get("game_id") or ""
            if not gid.startswith("002"):  # regular season only
                continue
            h, a = g.get("home") or {}, g.get("away") or {}
            hs, as_ = h.get("score"), a.get("score")
            if hs is None or as_ is None or hs == as_:
                continue
            for team, mine, theirs in ((h, hs, as_), (a, as_, hs)):
                tc = team.get("tricode")
                if not tc:
                    continue
                r = rec.setdefault(
                    tc,
                    {"tricode": tc, "name": team.get("name"), "city": team.get("city"), "wins": 0, "losses": 0},
                )
                if mine > theirs:
                    r["wins"] += 1
                else:
                    r["losses"] += 1

    def finalize(rows: list[dict]) -> list[dict]:
        for r in rows:
            played = r["wins"] + r["losses"]
            r["win_pct"] = round(r["wins"] / played, 3) if played else 0.0
        rows.sort(key=lambda r: (r["win_pct"], r["wins"]), reverse=True)
        for i, r in enumerate(rows):
            r["rank"] = i + 1
        return rows

    east = finalize([r for r in rec.values() if r["tricode"] in _EAST])
    west = finalize([r for r in rec.values() if r["tricode"] not in _EAST])
    return {"east": east, "west": west}


def get_playoffs() -> dict:
    """Current-season playoff bracket from the schedule. Playoff game ids look
    like 004{YY}0{R}{SS}{G}; the round digit (1=first round, 2=conf semis,
    3=conf finals, 4=Finals) is at index 7 and the series key is gid[5:9]."""
    sched = get_schedule()
    series: dict[str, dict] = {}
    for gd in sched.get("game_dates", []):
        for g in gd.get("games", []):
            gid = g.get("game_id") or ""
            if not gid.startswith("004") or len(gid) < 10:
                continue
            try:
                rnd = int(gid[7])
            except ValueError:
                continue
            if rnd < 1 or rnd > 4:
                continue
            h, a = g.get("home") or {}, g.get("away") or {}
            ht, at = h.get("tricode"), a.get("tricode")
            if not ht or not at:
                continue  # not-yet-determined matchup
            s = series.setdefault(gid[5:9], {"round": rnd, "order": [], "wins": {}})
            for tri in (ht, at):
                if tri not in s["order"]:
                    s["order"].append(tri)
            if g.get("status") == 3:
                hs, as_ = h.get("score"), a.get("score")
                if hs is not None and as_ is not None and hs != as_:
                    w = ht if hs > as_ else at
                    s["wins"][w] = s["wins"].get(w, 0) + 1

    out: list[dict] = []
    for s in series.values():
        teams = s["order"][:2]
        if len(teams) < 2:
            continue
        winner = next((tri for tri in teams if s["wins"].get(tri, 0) >= 4), None)
        conf = "Finals" if s["round"] == 4 else ("East" if teams[0] in _EAST else "West")
        out.append(
            {
                "round": s["round"],
                "conference": conf,
                "teams": [
                    {"tricode": tri, "wins": s["wins"].get(tri, 0)} for tri in teams
                ],
                "winner": winner,
            }
        )
    out.sort(key=lambda x: (x["round"], x["conference"]))
    return {"series": out}


def get_schedule() -> dict:
    """Full league schedule grouped by date. Cached 1h (changes rarely)."""
    raw = _cached_get(_SCHEDULE_URL, ttl=3600)
    league = (raw or {}).get("leagueSchedule", {}) if raw else {}
    dates = []
    for gd in league.get("gameDates", []) or []:
        games = [
            {
                "game_id": g.get("gameId"),
                "game_time_utc": g.get("gameDateTimeUTC") or g.get("gameDateUTC"),
                "status": g.get("gameStatus"),
                "status_text": g.get("gameStatusText"),
                "home": _sched_team(g.get("homeTeam") or {}),
                "away": _sched_team(g.get("awayTeam") or {}),
            }
            for g in (gd.get("games") or [])
        ]
        dates.append({"game_date": gd.get("gameDate"), "games": games})
    return {"game_dates": dates}
