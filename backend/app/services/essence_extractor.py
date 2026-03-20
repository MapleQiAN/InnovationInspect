import json
import anthropic
from app.config import settings
from app.models.essence import ProposalEssence
from sqlalchemy.ext.asyncio import AsyncSession

EXTRACTION_PROMPT = """
请从以下竞赛参赛材料中提取方案实质信息，以 JSON 格式返回，结构严格如下：
{
  "problem": {
    "summary": "核心问题一句话描述",
    "category": "问题类别",
    "target": "目标对象",
    "constraints": ["约束条件列表"]
  },
  "method": {
    "core_algorithms": ["核心算法/技术列表"],
    "pipeline": ["处理流程步骤"],
    "models": ["使用的模型"]
  },
  "architecture": {
    "modules": ["系统模块列表"],
    "interfaces": ["关键接口"],
    "deployment": "部署方式描述"
  },
  "innovation": {
    "claims": ["申报创新点列表"],
    "types": ["创新类型: problem_definition/method/architecture/engineering/combination"]
  },
  "evidence": {
    "references": ["参考文献或数据来源"]
  }
}

注意：仅分析实质内容，忽略宣传性表达和标题包装。

材料内容：
"""


class EssenceExtractor:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def _call_llm(self, text: str) -> dict:
        message = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            messages=[
                {"role": "user", "content": EXTRACTION_PROMPT + text[:8000]}
            ],
        )
        content = message.content[0].text
        # Extract JSON block
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON found in LLM response")
        return json.loads(content[start:end])

    async def extract_from_text(self, text: str) -> dict:
        return await self._call_llm(text)

    async def extract(self, db: AsyncSession, task_id: str, text: str) -> dict:
        essence_data = await self.extract_from_text(text)
        essence = ProposalEssence(
            task_id=task_id,
            problem=essence_data.get("problem", {}),
            method=essence_data.get("method", {}),
            architecture=essence_data.get("architecture", {}),
            innovation=essence_data.get("innovation", {}),
            evidence=essence_data.get("evidence", {}),
        )
        db.add(essence)
        await db.commit()
        return essence_data
