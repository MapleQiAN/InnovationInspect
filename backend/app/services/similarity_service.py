import json
from app.llm.client import LLMClient, get_llm_client
from app.config import settings

SIMILARITY_PROMPT = """
请对以下"待评估方案"和"候选方案"进行五维相似度分析，返回 JSON（仅返回 JSON，不要其他内容）：
{
  "problem_similarity": 0.0,
  "method_similarity": 0.0,
  "architecture_similarity": 0.0,
  "flow_similarity": 0.0,
  "evidence_alignment": 0.0,
  "explanation": "解释说明"
}

评分说明：
- 1.0 = 完全相同，0.0 = 完全无关
- 忽略标题差异和宣传性表达，聚焦实质内容
- explanation 需指出具体相似点或差异

待评估方案实质：
{essence}

候选方案摘要：
{candidate}
"""

SCORE_KEYS = [
    "problem_similarity",
    "method_similarity",
    "architecture_similarity",
    "flow_similarity",
    "evidence_alignment",
]


class SimilarityService:
    def __init__(self, llm: LLMClient | None = None):
        self.llm = llm or get_llm_client()

    async def _score_with_llm(self, essence: dict, candidate: dict) -> dict:
        prompt = SIMILARITY_PROMPT.format(
            essence=json.dumps(essence, ensure_ascii=False),
            candidate=json.dumps(candidate, ensure_ascii=False),
        )
        content = self.llm.chat(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
        )
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == 0:
            return {k: 0.0 for k in SCORE_KEYS} | {"explanation": "解析失败"}
        return json.loads(content[start:end])

    async def analyze(self, essence: dict, candidates: list[dict]) -> dict:
        results = []
        for candidate in candidates:
            scores = await self._score_with_llm(essence, candidate)
            overall = sum(scores.get(k, 0.0) for k in SCORE_KEYS) / len(SCORE_KEYS)
            results.append({
                "candidate": candidate,
                "scores": scores,
                "overall_similarity": round(overall, 3),
            })
        results.sort(key=lambda x: x["overall_similarity"], reverse=True)
        return {"candidates": results}
