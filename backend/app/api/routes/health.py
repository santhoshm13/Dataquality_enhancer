from fastapi import APIRouter
from app.config.settings import settings
from app.database.repository import repository

router = APIRouter()

@router.get("/health")
async def get_health():
    stats = repository.get_stats()
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENV,
        "database": "postgresql",
        "total_products_stored": stats["total_products"]
    }
