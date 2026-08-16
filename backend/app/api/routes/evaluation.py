from fastapi import APIRouter
from app.services.evaluation.evaluation_service import evaluation_service

router = APIRouter()

@router.get("/evaluation")
async def get_evaluation():
    return evaluation_service.evaluate()

@router.get("/evaluation/schema-breakdown")
async def get_schema_breakdown():
    return evaluation_service.get_252_column_schema_breakdown()
