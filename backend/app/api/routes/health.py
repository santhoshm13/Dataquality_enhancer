from fastapi import APIRouter
from app.config.settings import settings
from app.database.repository import repository

router = APIRouter()

@router.get("/health")
async def get_health():
    stats = repository.get_stats()
    datasets = repository.get_all_datasets()

    # Determine API key status honestly
    api_key = settings.get_api_key() if hasattr(settings, "get_api_key") else None
    api_key_status = "configured" if api_key and len(api_key) > 10 else "not_configured"

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENV,
        "llm_provider": settings.LLM_PROVIDER,
        "api_key_status": api_key_status,
        "database": "in_memory_sqlite_fallback",
        "total_products_stored": stats["total_products"],
        "total_datasets": len(datasets),
        "processed_products": stats["processed"],
        "needs_review": stats["needs_review"],
        "lov_pass_rate": stats.get("lov_pass_rate")
    }
