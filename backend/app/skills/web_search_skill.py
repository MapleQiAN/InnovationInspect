import json
import logging
from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry

logger = logging.getLogger(__name__)

ALLOWED_DOMAINS = [
    "arxiv.org", "github.com", "scholar.google.com",
    "patents.google.com", "ieee.org", "acm.org",
    "cnki.net", "wanfangdata.com.cn",
]

MAX_RESULTS = 10
REQUEST_TIMEOUT = 10.0

WEB_SEARCH_PROMPT = """根据以下查询，搜索互联网上的相关内容。
返回 JSON 数组，每项包含 title, url, snippet 字段。最多返回 {limit} 条结果。
仅返回 JSON 数组，不要其他内容。

查询: {query}"""


class WebSearchSkill(BaseSkill):
    name = "web-search-skill"
    description = "通过 LLM 联网搜索在互联网公开资料库中搜索相关内容，返回摘要与链接列表"
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
        from app.llm.client import get_llm_client
        llm = get_llm_client()
        prompt = WEB_SEARCH_PROMPT.format(query=query, limit=limit)
        try:
            content = llm.chat_with_search(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1024,
                search_options={"forced_search": True, "search_strategy": "max"},
            )
            content = content.strip()
            start = content.find("[")
            end = content.rfind("]") + 1
            if start == -1 or end == 0:
                return []
            results = json.loads(content[start:end])
            return results[:limit] if isinstance(results, list) else []
        except Exception as e:
            logger.warning("WebSearchSkill failed for query '%s': %s", query, e)
            return []

    def _is_allowed(self, url: str) -> bool:
        return any(domain in url for domain in ALLOWED_DOMAINS)


registry.register(WebSearchSkill())
