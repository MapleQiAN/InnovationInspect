import json
from app.llm.client import LLMClient, get_llm_client
from app.config import settings
from sqlalchemy.ext.asyncio import AsyncSession

INNOVATION_PROMPT = """
请对以下参赛材料申报的创新点进行六维评估，返回 JSON（仅返回 JSON，不要其他内容）：
{
  "problem_definition_innovation": 0.0,
  "method_innovation": 0.0,
  "architecture_innovation": 0.0,
  "scenario_migration_innovation": 0.0,
  "engineering_optimization_innovation": 0.0,
  "combination_innovation": 0.0,
  "overall_innovation_score": 0.0,
  "risk_flags": ["风险提示列表"],
  "explanation": "详细说明"
}

评估规则：
- 各维度 0.0-1.0 分值
- 若创新点与候选方案高度重叠，对应维度得分低于 0.3
- 若存在明确新增机制或显著性能突破，得分可达 0.7 以上
- overall_innovation_score = 六维加权均值 - 重叠惩罚项（取值范围 0-1）
- risk_flags 列举可能被质疑为套壳的具体点

方案实质：
{essence}

最相似候选方案（Top-3）：
{top_candidates}
"""

INNOVATION_DIMS = [
    "problem_definition_innovation",
    "method_innovation",
    "architecture_innovation",
    "scenario_migration_innovation",
    "engineering_optimization_innovation",
    "combination_innovation",
]


class InnovationService:
    def __init__(self, llm: LLMClient | None = None):
        self.llm = llm or get_llm_client()

    async def _evaluate_with_llm(self, essence: dict, top_candidates: list[dict]) -> dict:
        prompt = INNOVATION_PROMPT.format(
            essence=json.dumps(essence, ensure_ascii=False),
            top_candidates=json.dumps(top_candidates[:3], ensure_ascii=False),
        )
        content = self.llm.chat(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
        )
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == 0:
            return {d: 0.0 for d in INNOVATION_DIMS} | {
                "overall_innovation_score": 0.0,
                "risk_flags": [],
                "explanation": "解析失败",
            }
        return json.loads(content[start:end])

    async def evaluate(
        self,
        db: AsyncSession,
        task_id: str,
        essence: dict,
        candidates: list[dict],
    ) -> dict:
        return await self._evaluate_with_llm(essence, candidates)
