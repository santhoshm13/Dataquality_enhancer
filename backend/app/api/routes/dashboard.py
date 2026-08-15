from fastapi import APIRouter
from app.database.repository import repository

router = APIRouter()

@router.get("/dashboard/stats")
async def get_dashboard_stats(dataset_id: int = None):
    return repository.get_stats(dataset_id=dataset_id)
