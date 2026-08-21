"""
Active-Learning LOV Suggestion Engine API

GET  /api/suggestions          — list suggestions above threshold
POST /api/suggestions/approve  — approve a suggestion, write into master LOV
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from app.database.repository import repository

router = APIRouter()


class ApproveRequest(BaseModel):
    category: str
    field_name: str
    suggested_value: str


@router.get("/suggestions")
async def get_suggestions(threshold: int = Query(default=3, description="Min occurrences to surface")):
    """Return active-learning LOV suggestions aggregated from human corrections."""
    suggestions = repository.get_lov_suggestions(threshold=threshold)
    return {
        "threshold": threshold,
        "total": len(suggestions),
        "suggestions": suggestions
    }


@router.post("/suggestions/approve")
async def approve_suggestion(req: ApproveRequest):
    """Approve a suggestion and write it into the master LOV table."""
    result = repository.approve_lov_suggestion(
        category=req.category,
        field_name=req.field_name,
        suggested_value=req.suggested_value
    )
    return result
