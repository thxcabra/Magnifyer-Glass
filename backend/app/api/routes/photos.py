"""Free player photos from Wikimedia Commons (with attribution).

Decoupled from the DB: the frontend already has the player's name, so it
passes it directly. Long edge cache since photos rarely change.
"""

from fastapi import APIRouter, Query, Response

from app.services import wiki_photo

router = APIRouter(prefix="/photos", tags=["photos"])


@router.get("/player")
def player_photo(response: Response, name: str = Query(..., min_length=2, max_length=80)):
    response.headers["Cache-Control"] = (
        "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
    )
    return wiki_photo.get_player_photo(name) or {"url": None}
