from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry

ALLOWED_DOMAINS = [
    "arxiv.org", "github.com", "scholar.google.com",
    "patents.google.com", "ieee.org", "acm.org",
    "cnki.net", "wanfangdata.com.cn",
]

MAX_RESULTS = 10
REQUEST_TIMEOUT = 10.0


class WebSearchSkill(BaseSkill):
    name = "web-search-skill"
    description = "在互联网公开资料库中搜索相关内容，返回摘要与链接列表"
    skill_type = "basic"
    input_schema = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "搜索关键词"},
            "limit": {"type": "integer", "description": "返回结果数量，默认 5", "default": 5},
        },
        "required": ["query"],
    }

    async def execute(self, query: str, limit: int = 5, **kwargs) -> SkillResult:
        results = await self.search(query, limit)
        return SkillResult(success=True, data={"results": results, "query": query})

    async def search(self, query: str, limit: int = 5) -> list[dict]:
        from app.config import settings
        if not settings.web_search_api_key:
            return []
        # TODO: Connect to real search API (SerpAPI / Bing Search API)
        # Results must be filtered to allowed domains only
        return []

    def _is_allowed(self, url: str) -> bool:
        return any(domain in url for domain in ALLOWED_DOMAINS)


registry.register(WebSearchSkill())
