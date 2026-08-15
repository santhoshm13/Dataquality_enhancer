from fastapi import APIRouter
from app.services.evaluation.evaluation_service import evaluation_service

router = APIRouter()

@router.get("/evaluation")
async def get_evaluation():
    return evaluation_service.evaluate()
