import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config.settings import settings
from app.api.routes import health, upload, products, dashboard, export, evaluation, chat, pipeline
from app.api.routes.corrections import router as corrections_router
from app.api.routes.suggestions import router as suggestions_router
from app.api.routes.coverage import router as coverage_router
from app.database.master_data_loader import load_master_data

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("app.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} backend in {settings.ENV} mode...")

    # Fail fast in production if DATABASE_URL still points to localhost (the default)
    if settings.ENV == "production" and "localhost" in settings.DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL still points to localhost in production mode. "
            "Set DATABASE_URL to your real Supabase/Postgres connection string in Render env vars."
        )

    # Warn loudly if LLM_PROVIDER is gemini/openai but the key is missing
    if settings.LLM_PROVIDER != "mock" and not settings.get_api_key():
        logger.warning(
            f"LLM_PROVIDER={settings.LLM_PROVIDER!r} but no API key found "
            f"(GEMINI_API_KEY / OPENAI_API_KEY). Falling back to mock provider — "
            f"enrichment accuracy will be degraded."
        )

    load_master_data()
    yield
    logger.info("Shutting down backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="AI Product Data Enrichment Platform Backend API",
    lifespan=lifespan
)

# Configure CORS — use explicit allow_origins from settings (comma-separated ALLOWED_ORIGINS env var)
# Never combine allow_origins=["*"] with allow_credentials=True (browsers reject this)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=False,  # No cookies/JWT used; set True only if you add auth
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(upload.router, prefix="/api", tags=["CSV Upload"])
app.include_router(products.router, prefix="/api", tags=["Products"])
app.include_router(pipeline.router, prefix="/api", tags=["Pipeline"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(export.router, prefix="/api", tags=["Export"])
app.include_router(evaluation.router, prefix="/api", tags=["Evaluation"])
app.include_router(corrections_router, prefix="/api", tags=["Corrections"])
app.include_router(suggestions_router, prefix="/api", tags=["Suggestions"])
app.include_router(coverage_router, prefix="/api", tags=["Coverage"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

# Serve static frontend files (auto-detects local frontend/dist, embedded static_dist, etc.)
def find_frontend_dist() -> Path | None:
    candidates = [
        Path(__file__).resolve().parent.parent / "static_dist",
        Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
        Path.cwd() / "static_dist",
        Path.cwd() / "frontend" / "dist",
        Path.cwd().parent / "frontend" / "dist",
        Path(__file__).resolve().parent.parent / "dist",
    ]
    for c in candidates:
        if c.exists() and (c / "index.html").exists():
            return c
    return None

frontend_dist = find_frontend_dist()

if frontend_dist:
    logger.info(f"Serving frontend static files from: {frontend_dist}")
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    async def serve_root():
        index_path = frontend_dist / "index.html"
        return FileResponse(index_path)

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api" or full_path == "docs" or full_path == "openapi.json":
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
            
        index_path = frontend_dist / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
            
        return JSONResponse({"detail": "Not Found"}, status_code=404)
else:
    @app.get("/", include_in_schema=False)
    async def serve_api_welcome():
        return {
            "status": "online",
            "message": "AI Product Data Enrichment Backend API is running.",
            "docs": "/docs",
            "health": "/api/health"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
