import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config.settings import settings
from app.database.models import Base

logger = logging.getLogger("ingest")

def get_engine():
    db_url = settings.DATABASE_URL
    # Ensure sync driver URL for migration/ingestion scripts
    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("sqlite+aiosqlite://", "sqlite://")

    # Try connecting to configured DATABASE_URL (e.g. Postgres)
    if "postgresql" in sync_url:
        try:
            eng = create_engine(sync_url, echo=False, connect_args={"connect_timeout": 3})
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            return eng
        except Exception as e:
            logger.warning(f"Could not connect to PostgreSQL ({e}). Using local SQLite fallback for master data tables.")
            fallback_path = os.path.abspath("master_data.db")
            fallback_url = f"sqlite:///{fallback_path}"
            eng = create_engine(fallback_url, echo=False)
            return eng
    else:
        return create_engine(sync_url, echo=False)

def init_db(engine=None):
    if engine is None:
        engine = get_engine()
    Base.metadata.create_all(bind=engine)
    return engine
