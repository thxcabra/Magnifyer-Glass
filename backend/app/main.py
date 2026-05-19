from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import compare, discovery, lists, players, teams, years
from app.api.routes.players import draft_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Magnifyer Glass API",
    description="NBA scouting engine — prospect similarity, archetypes, and discovery.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router)
app.include_router(compare.router)
app.include_router(discovery.router)
app.include_router(teams.router)
app.include_router(draft_router)
app.include_router(years.router)
app.include_router(lists.router)


@app.get("/health")
def health():
    return {"status": "ok"}

