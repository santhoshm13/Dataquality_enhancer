from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.database.repository import repository
from app.utils.file_parser import parse_file_to_dataframe
from app.schemas.upload import CSVUploadResponse, CSVUploadPreviewRow

router = APIRouter()

ALLOWED_EXTENSIONS = {"csv", "xlsx", "xls"}

@router.post("/upload", response_model=CSVUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename or ""
    ext = filename.lower().split(".")[-1] if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{ext}'. Supported formats: CSV, XLSX, XLS"
        )

    try:
        content = await file.read()
        df, errors = parse_file_to_dataframe(content, filename)

        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file contains no data rows."
            )

        # Convert DataFrame to list of dict records for normalized DB import
        records = df.to_dict(orient="records")

        # Create dataset
        dataset = repository.add_dataset(name=filename, file_type=ext, total_rows=len(records))
        dataset_id = dataset["id"]

        # Import into PostgreSQL repository
        imported = repository.bulk_add_products(records, dataset_id=dataset_id)

        preview = []
        for r in records[:5]:
            preview.append(CSVUploadPreviewRow(
                mfg_part_num=str(r.get("Mfg_Part_Num", "")).strip(),
                part_desc=str(r.get("Part_Desc", "")).strip(),
                e1_brand=str(r.get("E1_Brand", "")).strip(),
                unilog_brand=str(r.get("Unilog_Brand", "")).strip(),
                dib_brand=str(r.get("DIB_Brand", "")).strip(),
                part_manuf=str(r.get("Part_Manuf", "")).strip()
            ))

        return CSVUploadResponse(
            message=f"File successfully parsed using Pandas and ingested into PostgreSQL repository.",
            dataset_id=dataset_id,
            filename=filename,
            total_rows=len(records),
            imported_count=len(imported),
            failed_count=len(errors),
            preview_rows=preview,
            errors=errors
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process uploaded file: {str(e)}"
        )
