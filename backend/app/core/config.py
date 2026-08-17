from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    API_KEY: str = "default_dev_key_change_in_production"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OCR_MODEL: str = "glm-ocr:latest"
    EMBEDDING_MODEL: str = "nomic-embed-text:latest"
    CHAT_MODEL: str = "llama3.1:8b"
    
    model_config = {"env_file": ".env"}

@lru_cache()
def get_settings():
    return Settings()
