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
    load_master_data()
    yield
    logger.info("Shutting down backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="AI Product Data Enrichment Platform Backend API",
    lifespan=lifespan
)

# Configure CORS for Live Vercel Frontend and Local Dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits Vercel deployment & local dev connections
    allow_credentials=True,
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

# Serve static frontend files
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.exception_handler(404)
    async def spa_route_handler(request: Request, exc: StarletteHTTPException):
        # API 404s should return JSON
        if request.url.path.startswith("/api/"):
            return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
        
        # Check if the requested file exists in the root of the dist directory
        file_path = frontend_dist / request.url.path.lstrip("/")
        if file_path.is_file():
            return FileResponse(file_path)

        # Otherwise serve index.html for SPA routing
        index_path = frontend_dist / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        
        return JSONResponse({"detail": "Not Found"}, status_code=404)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
