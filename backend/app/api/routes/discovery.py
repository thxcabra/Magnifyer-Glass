from fastapi import APIRouter, Query

from app.core.supabase_client import get_supabase
from app.models.schemas import Archetype

router = APIRouter(prefix="/discovery", tags=["discovery"])


@router.get("/prospects")
def list_prospects(
    draft_class: int | None = Query(default=None),
    position: str | None = Query(default=None),
    archetype: Archetype | None = Query(default=None),
    include_nba: bool = Query(default=False),
    has_archetype: bool | None = Query(default=None),
    limit: int = Query(default=120, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """List prospects (or all players when include_nba=True or archetype is set).

    `has_archetype` lets the /players page request classified vs unclassified
    pools explicitly — PostgREST's nullslast wasn't reliably putting archetype
    rows ahead of nulls otherwise.
    """
    sb = get_supabase()
    q = (
        sb.table("players")
        .select(
            "id, external_id, name, slug, position, draft_class, current_team, "
            "source, is_nba, headshot_url, archetype, archetype_confidence, college"
        )
    )
    if not include_nba and archetype is None:
        q = q.eq("is_nba", False)
    if draft_class is not None:
        q = q.eq("draft_class", draft_class)
    if position is not None:
        q = q.eq("position", position)
    if archetype is not None:
        q = q.eq("archetype", archetype.value)
    if has_archetype is True:
        q = q.not_.is_("archetype", "null")
    elif has_archetype is False:
        q = q.is_("archetype", "null")

    if has_archetype is True or archetype is not None:
        q = q.order("archetype_confidence", desc=True)
    else:
        q = q.order("name")
    res = q.range(offset, offset + limit - 1).execute()
    return res.data
