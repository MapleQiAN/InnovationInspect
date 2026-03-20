from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://ccreview:ccreview@localhost:5432/ccreview"
    redis_url: str = "redis://localhost:6379/0"
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "ccreview"
    qdrant_url: str = "http://localhost:6333"
    anthropic_api_key: str = ""
    collection_name: str = "proposals"


settings = Settings()
