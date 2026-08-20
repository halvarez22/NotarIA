from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    API_KEY: str = "default_dev_key_change_in_production"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OCR_MODEL: str = "glm-ocr:latest"
    EMBEDDING_MODEL: str = "nomic-embed-text:latest"
    CHAT_MODEL: str = "llama3.1:8b"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    model_config = {"env_file": ".env", "extra": "ignore"}

@lru_cache()
def get_settings():
    return Settings()
