"""Recent per-game player log, assembled from CDN box scores. Decoupled from
the DB: the frontend passes the player's NBA id + team it already has."""

from fastapi import APIRouter, Query, Response

from app.services import player_gamelog

router = APIRouter(prefix="/game-log", tags=["game-log"])


@router.get("")
def game_log(
    response: Response,
    external_id: str = Query(..., min_length=1, max_length=20),
    team: str = Query(..., min_length=2, max_length=4),
    limit: int = Query(default=12, ge=1, le=25),
):
    response.headers["Cache-Control"] = (
        "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400"
    )
    return {"games": player_gamelog.get_recent_games(external_id, team, limit)}
