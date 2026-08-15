from fastapi import APIRouter
from app.database.repository import repository

router = APIRouter()

@router.get("/dashboard/stats")
async def get_dashboard_stats():
    return repository.get_stats()
