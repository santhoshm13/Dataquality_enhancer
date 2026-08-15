import os
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config.settings import settings

logger = logging.getLogger("app.database")

# Convert standard postgresql:// to postgresql+asyncpg:// for SQLAlchemy async
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

try:
    engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
except Exception as e:
    logger.warning(f"Failed to initialize PostgreSQL engine: {e}")
    engine = None
    async_session = None

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    if async_session is None:
        yield None
        return
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
