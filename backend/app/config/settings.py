import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Product Enrichment Platform"
    ENV: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/postgres"
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # LLM - Primary key + multiple rotation keys
    LLM_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_API_KEYS: str = ""  # Comma-separated list of Gemini API keys
    GEMINI_API_KEY_2: str = ""
    GEMINI_API_KEY_3: str = ""
    GEMINI_API_KEY_4: str = ""
    GEMINI_API_KEY_5: str = ""
    GEMINI_API_KEY_6: str = ""
    GEMINI_API_KEY_7: str = ""
    GEMINI_API_KEY_8: str = ""
    GEMINI_API_KEY_9: str = ""
    GEMINI_API_KEY_10: str = ""
    GEMINI_API_KEY_11: str = ""
    GEMINI_API_KEY_12: str = ""
    GEMINI_API_KEY_13: str = ""
    GEMINI_API_KEY_14: str = ""
    GEMINI_API_KEY_15: str = ""
    GEMINI_API_KEY_16: str = ""
    GEMINI_API_KEY_17: str = ""
    GEMINI_API_KEY_18: str = ""
    GEMINI_API_KEY_19: str = ""
    GEMINI_API_KEY_20: str = ""
    OPENAI_API_KEY: str = ""
    LLM_PROVIDER: str = "gemini"  # 'mock', 'openai', 'gemini'

    # Scraping
    FIRECRAWL_API_KEY: str = ""  # get one free at https://www.firecrawl.dev/app/api-keys
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://*.vercel.app"

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_api_key(self) -> str:
        """Return the primary Gemini API key."""
        keys = self.get_api_keys()
        return keys[0] if keys else ""

    def get_api_keys(self) -> List[str]:
        """Return all configured Gemini API keys for round-robin automatic rotation."""
        candidates = []
        if self.GEMINI_API_KEYS:
            candidates.extend([k.strip() for k in self.GEMINI_API_KEYS.split(",") if k.strip()])
            
        candidates.extend([
            self.GEMINI_API_KEY,
            self.LLM_API_KEY,
            os.environ.get("GEMINI_API_KEY", ""),
            os.environ.get("GOOGLE_API_KEY", ""),
            self.GEMINI_API_KEY_2,
            self.GEMINI_API_KEY_3,
            self.GEMINI_API_KEY_4,
            self.GEMINI_API_KEY_5,
            self.GEMINI_API_KEY_6,
            self.GEMINI_API_KEY_7,
            self.GEMINI_API_KEY_8,
            self.GEMINI_API_KEY_9,
            self.GEMINI_API_KEY_10,
            self.GEMINI_API_KEY_11,
            self.GEMINI_API_KEY_12,
            self.GEMINI_API_KEY_13,
            self.GEMINI_API_KEY_14,
            self.GEMINI_API_KEY_15,
            self.GEMINI_API_KEY_16,
            self.GEMINI_API_KEY_17,
            self.GEMINI_API_KEY_18,
            self.GEMINI_API_KEY_19,
            self.GEMINI_API_KEY_20,
        ])
        
        # Deduplicate while preserving order, skip empty strings
        seen = set()
        keys = []
        for k in candidates:
            if k and k.strip() and k not in seen:
                seen.add(k.strip())
                keys.append(k.strip())
        return keys


    @property
    def origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()
