"""NBA news (Google News RSS, pt-BR). One endpoint powers general, team and
player feeds via the `q` query."""

from fastapi import APIRouter, Query, Response

from app.services import news as news_service

router = APIRouter(prefix="/news", tags=["news"])


@router.get("")
def news(
    response: Response,
    q: str = Query(default="NBA", max_length=120),
    limit: int = Query(default=12, ge=1, le=30),
    lang: str = Query(default="pt-BR"),
):
    response.headers["Cache-Control"] = (
        "public, max-age=900, s-maxage=900, stale-while-revalidate=3600"
    )
    return {"items": news_service.get_news(q, limit, lang)}
