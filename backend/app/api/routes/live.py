"""Live data endpoints — thin proxies over cdn.nba.com with short edge caches.

These never 500 on upstream failure: the service returns an empty-but-valid
payload so the UI shows an empty state instead of an error.
"""

from fastapi import APIRouter, Response

from app.services import nba_live

router = APIRouter(prefix="/live", tags=["live"])


def _cache(response: Response, max_age: int, swr: int) -> None:
    response.headers["Cache-Control"] = (
        f"public, max-age={max_age}, s-maxage={max_age}, "
        f"stale-while-revalidate={swr}"
    )


@router.get("/scoreboard")
def scoreboard(response: Response):
    _cache(response, max_age=15, swr=30)
    return nba_live.get_scoreboard()


@router.get("/games/{game_id}")
def game_boxscore(game_id: str, response: Response):
    _cache(response, max_age=20, swr=40)
    data = nba_live.get_boxscore(game_id)
    return data if data is not None else {"game_id": game_id, "home": None, "away": None}


@router.get("/games/{game_id}/playbyplay")
def game_playbyplay(game_id: str, response: Response):
    _cache(response, max_age=20, swr=40)
    return nba_live.get_playbyplay(game_id)


@router.get("/schedule")
def schedule(response: Response):
    _cache(response, max_age=3600, swr=21600)
    return nba_live.get_schedule()


@router.get("/standings")
def standings(response: Response):
    _cache(response, max_age=300, swr=900)
    return nba_live.get_standings()


@router.get("/playoffs")
def playoffs(response: Response):
    _cache(response, max_age=300, swr=900)
    return nba_live.get_playoffs()
