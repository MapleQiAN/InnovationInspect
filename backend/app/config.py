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
    collection_name: str = "proposals"
    celery_worker_concurrency: int = 2

    # LLM 提供商配置
    # llm_model 使用 litellm 格式: "anthropic/claude-sonnet-4-6",
    # "openai/gpt-4o", "gemini/gemini-1.5-pro", "mistral/mistral-large-latest",
    # "deepseek/deepseek-chat", "azure/gpt-4o" 等
    llm_model: str = "anthropic/claude-sonnet-4-6"
    llm_max_tokens: int = 2048

    # API Keys（按需填写对应提供商的 key）
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    openai_api_base: str = ""  # OpenAI 兼容 API 端点（如 https://api.deepseek.com/v1）
    gemini_api_key: str = ""
    mistral_api_key: str = ""
    deepseek_api_key: str = ""
    azure_api_key: str = ""
    azure_api_base: str = ""
    azure_api_version: str = "2024-02-01"

    # Web 搜索 API（可选，不配置则跳过互联网搜索）
    web_search_api_key: str = ""  # SerpAPI 或 Bing Search API key


settings = Settings()
