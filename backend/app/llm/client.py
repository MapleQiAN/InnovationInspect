import os
import litellm
from app.config import settings


class LLMClient:
    """统一 LLM 客户端，通过 litellm 支持所有主流 AI 提供商。

    model 格式: "<provider>/<model-name>"
    例如: "anthropic/claude-sonnet-4-6", "openai/gpt-4o",
          "gemini/gemini-1.5-pro", "deepseek/deepseek-chat"
    """

    def __init__(self, model: str, api_keys: dict):
        self.model = model
        self._configure_keys(api_keys)

    def _configure_keys(self, api_keys: dict) -> None:
        """将 API keys 注入环境变量（litellm 读取标准环境变量）。"""
        key_map = {
            "anthropic_api_key": "ANTHROPIC_API_KEY",
            "openai_api_key": "OPENAI_API_KEY",
            "openai_api_base": "OPENAI_API_BASE",
            "gemini_api_key": "GEMINI_API_KEY",
            "mistral_api_key": "MISTRAL_API_KEY",
            "deepseek_api_key": "DEEPSEEK_API_KEY",
            "azure_api_key": "AZURE_API_KEY",
            "azure_api_base": "AZURE_API_BASE",
            "azure_api_version": "AZURE_API_VERSION",
        }
        for field, env_var in key_map.items():
            value = api_keys.get(field, "")
            if value:
                os.environ[env_var] = value

    def chat(self, messages: list[dict], max_tokens: int) -> str:
        """发送消息并返回文本响应。

        Args:
            messages: OpenAI 格式消息列表，如 [{"role": "user", "content": "..."}]
            max_tokens: 最大输出 token 数

        Returns:
            模型返回的文本内容

        Raises:
            ValueError: messages 为空时
        """
        if not messages:
            raise ValueError("messages cannot be empty")

        response = litellm.completion(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content


def get_llm_client() -> LLMClient:
    """工厂函数，从 settings 创建 LLMClient 实例（用于依赖注入）。"""
    return LLMClient(
        model=settings.llm_model,
        api_keys={
            "anthropic_api_key": settings.anthropic_api_key,
            "openai_api_key": settings.openai_api_key,
            "openai_api_base": settings.openai_api_base,
            "gemini_api_key": settings.gemini_api_key,
            "mistral_api_key": settings.mistral_api_key,
            "deepseek_api_key": settings.deepseek_api_key,
            "azure_api_key": settings.azure_api_key,
            "azure_api_base": settings.azure_api_base,
            "azure_api_version": settings.azure_api_version,
        },
    )
