from fastapi import APIRouter, HTTPException, Query

from app.core.config import get_settings
from app.core.supabase_client import get_supabase

router = APIRouter(prefix="/compare", tags=["compare"])


@router.get("/{slug}")
def compare(
    slug: str,
    top_n: int = Query(default=None, ge=1, le=50),
    w_stats: float = Query(default=None, ge=0, le=1),
    w_phys: float = Query(default=None, ge=0, le=1),
):
    """Return top-N NBA similarity matches for a given prospect.

    Reads from the precomputed similarity_cache table. The actual fit/match
    pipeline is run offline by services.similarity.SimilarityEngine and the
    results are persisted into similarity_cache.
    """
    settings = get_settings()
    top_n = top_n or settings.similarity_top_n

    sb = get_supabase()
    prospect = sb.table("players").select("*").eq("slug", slug).limit(1).execute()
    if not prospect.data:
        raise HTTPException(status_code=404, detail="Prospect not found")
    prospect_row = prospect.data[0]

    weights_payload = {
        "stats": w_stats if w_stats is not None else settings.similarity_weight_stats,
        "phys": w_phys if w_phys is not None else settings.similarity_weight_phys,
    }

    # Default lookup: exact-weights cache. If you change weights at runtime
    # this returns empty and you should trigger an on-demand recompute.
    matches_q = (
        sb.table("similarity_cache")
        .select("match_id, similarity, stats_component, phys_component, weights")
        .eq("prospect_id", prospect_row["id"])
        .order("similarity", desc=True)
        .limit(top_n)
        .execute()
    )

    match_ids = [m["match_id"] for m in matches_q.data]
    if not match_ids:
        return {"prospect": prospect_row, "matches": [], "weights": weights_payload}

    players_q = (
        sb.table("players")
        .select("id, name, slug, position, current_team, is_nba, draft_class")
        .in_("id", match_ids)
        .execute()
    )
    by_id = {p["id"]: p for p in players_q.data}

    matches = [
        {
            "player": by_id.get(m["match_id"]),
            "similarity": m["similarity"],
            "stats_component": m["stats_component"],
            "phys_component": m["phys_component"],
        }
        for m in matches_q.data
    ]

    return {"prospect": prospect_row, "matches": matches, "weights": weights_payload}
