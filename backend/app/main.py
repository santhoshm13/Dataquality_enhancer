import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.api.routes import health, upload, products, dashboard, export, evaluation, chat, pipeline
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

# Register API Routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(upload.router, prefix="/api", tags=["CSV Upload"])
app.include_router(products.router, prefix="/api", tags=["Products"])
app.include_router(pipeline.router, prefix="/api", tags=["Pipeline"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(export.router, prefix="/api", tags=["Export"])
app.include_router(evaluation.router, prefix="/api", tags=["Evaluation"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
