from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status
from fastapi.responses import Response
from app.database.repository import repository
from app.pipeline.delivery_formatter import delivery_generator

router = APIRouter()

@router.post("/export")
@router.get("/export")
async def export_delivery_file(format: Optional[str] = Query("csv")):
    products = repository.get_all_products()
    fmt = (format or "csv").lower().strip()

    if fmt == "csv":
        csv_data = delivery_generator.generate_csv_string(products)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=Unihack_Enriched_Delivery_Format.csv"
            }
        )
    elif fmt in ["excel", "xlsx"]:
        excel_bytes = delivery_generator.generate_excel_bytes(products)
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=Unihack_Enriched_Delivery_Format.xlsx"
            }
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported export format '{fmt}'. Supported formats: csv, excel (xlsx)"
        )
