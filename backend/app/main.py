from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.api.routes import (
    discovery,
    gamelog,
    lists,
    live,
    news,
    photos,
    players,
    teams,
    years,
)
from app.api.routes.players import draft_router
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.core.security_headers import SecurityHeadersMiddleware

settings = get_settings()

app = FastAPI(
    title="Magnifyer Glass API",
    description="NBA scouting engine — prospect similarity, archetypes, and discovery.",
    version="0.1.0",
)

# Order matters: outermost middleware runs first on the request, last on the
# response. We want security headers to wrap *everything* (including the rate
# limit 429 response), and the rate limiter to wrap CORS so preflight requests
# are still counted.
app.state.limiter = limiter
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return a JSON 429 instead of slowapi's default plaintext."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded. Please slow down and try again shortly.",
            "limit": str(exc.detail),
        },
    )


app.include_router(players.router)
app.include_router(discovery.router)
app.include_router(teams.router)
app.include_router(draft_router)
app.include_router(years.router)
app.include_router(lists.router)
app.include_router(live.router)
app.include_router(photos.router)
app.include_router(news.router)
app.include_router(gamelog.router)


@app.get("/health")
def health():
    return {"status": "ok"}
