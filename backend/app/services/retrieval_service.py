import json
import logging
from app.llm.client import LLMClient, get_llm_client
from app.config import settings
from app.storage.vector_store import VectorStore
from app.models.candidate import Candidate
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

QUERY_GEN_PROMPT = """
根据以下方案实质信息，生成5个用于互联网搜索和知识库检索的查询语句。
目标：找到与该方案高度相似的已有方案/论文/项目。
要求：
- 针对问题定义、核心技术、架构模式分别生成查询
- 避免使用项目名称
- 用中文
- 返回 JSON 数组格式

返回格式（仅返回 JSON 数组，不要其他内容）：
["查询语句1", "查询语句2", "查询语句3", "查询语句4", "查询语句5"]

方案实质：
"""

WEB_SEARCH_PROMPT = """根据以下查询，搜索互联网上与之相关的学术论文、竞赛项目、开源项目或专利。
重点关注以下来源：arxiv.org、github.com、scholar.google.com、cnki.net、万方数据、IEEE、ACM。

返回 JSON 数组，每项包含 title, url, snippet 字段。最多返回 {limit} 条结果。
仅返回 JSON 数组，不要其他内容。

返回格式示例：
[{{"title": "项目标题", "url": "https://...", "snippet": "简要描述"}}]

查询: {query}"""


class RetrievalService:
    def __init__(self, llm: LLMClient | None = None):
        self.llm = llm or get_llm_client()
        self.vector_store = VectorStore()

    async def _call_llm_for_queries(self, essence: dict) -> list[str]:
        content = self.llm.chat(
            messages=[
                {
                    "role": "user",
                    "content": QUERY_GEN_PROMPT + json.dumps(essence, ensure_ascii=False),
                }
            ],
            max_tokens=512,
        )
        content = content.strip()
        start = content.find("[")
        end = content.rfind("]") + 1
        if start == -1 or end == 0:
            return [essence.get("problem", {}).get("summary", "")]
        return json.loads(content[start:end])

    async def _web_search(self, query: str, limit: int = 3) -> list[dict]:
        """通过 LLM 联网搜索获取互联网上的相似项目。"""
        prompt = WEB_SEARCH_PROMPT.format(query=query, limit=limit)
        try:
            content = self.llm.chat_with_search(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1024,
                search_options={
                    "forced_search": True,
                    "search_strategy": "max",
                },
            )
            content = content.strip()
            start = content.find("[")
            end = content.rfind("]") + 1
            if start == -1 or end == 0:
                return []
            results = json.loads(content[start:end])
            return results[:limit] if isinstance(results, list) else []
        except Exception as e:
            logger.warning("Web search failed for query '%s': %s", query, e)
            return []

    async def generate_queries(self, essence: dict) -> list[str]:
        return await self._call_llm_for_queries(essence)

    async def retrieve(self, db: AsyncSession, task_id: str, essence: dict) -> list[dict]:
        queries = await self.generate_queries(essence)
        candidates = []
        seen_keys: set[str] = set()

        for query in queries:
            # Vector store search (internal historical works)
            vector_results = self.vector_store.search(query, limit=5)
            for vr in vector_results:
                key = vr.get("url") or vr.get("title", query)
                if key not in seen_keys:
                    seen_keys.add(key)
                    candidates.append({
                        "source": "internal",
                        "title": vr.get("title", query),
                        "url": vr.get("url"),
                        "snippet": vr.get("snippet", ""),
                        "score": vr.get("score", 0.0),
                    })

            # Internet search via LLM web search
            web_results = await self._web_search(query, limit=3)
            for wr in web_results:
                key = wr.get("url") or wr.get("title", "")
                if key and key not in seen_keys:
                    seen_keys.add(key)
                    candidates.append({
                        "source": "internet",
                        "title": wr.get("title", ""),
                        "url": wr.get("url"),
                        "snippet": wr.get("snippet", ""),
                        "score": 0.0,
                    })

        # Persist to DB
        for c in candidates:
            db.add(Candidate(
                task_id=task_id,
                source=c["source"],
                title=c["title"],
                url=c.get("url"),
                snippet=c.get("snippet"),
            ))
        await db.commit()
        return candidates
