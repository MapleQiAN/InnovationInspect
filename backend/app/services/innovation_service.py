import json
from app.llm.client import LLMClient, get_llm_client
from app.config import settings
from sqlalchemy.ext.asyncio import AsyncSession

INNOVATION_PROMPT = """
你是一位资深科技竞赛评审专家。请通读以下参赛材料全文，结合已有相似方案，对该作品的创新性进行综合评判。

请利用你的联网搜索能力，主动搜索该选题相关的最新研究、竞赛项目和行业动态。
在评估中：
- 对比网络上已有的类似选题和方案，判断该方案的独创程度
- 引用具体的网络搜索结果作为对比依据
- 关注该领域最新的技术进展和研究趋势

请自由、深入地分析，不要局限于固定维度。重点关注：
- 该方案到底解决了什么问题？解决方式有何独到之处？
- 与已有方案相比，真正的新贡献是什么？是否存在实质性突破？
- 技术选型、系统设计、应用场景等方面是否有亮点？
- 是否存在"换皮"、"套壳"、夸大创新等风险？
- 与网络上搜索到的同类项目相比，创新程度如何？

返回 JSON（仅返回 JSON，不要其他内容），结构如下：
{{
  "overall_innovation_score": 0.0,
  "verdict": "通过/待复核/不建议通过",
  "assessment": "800字以内的综合创新性评价，需具体引用材料中的内容作为论据，并引用网络搜索到的对比项目",
  "strengths": ["亮点1", "亮点2", ...],
  "weaknesses": ["不足1", "不足2", ...],
  "risk_flags": ["风险提示1", ...],
  "web_references": [{{"title": "搜索到的相关项目/论文标题", "url": "链接", "relevance": "与本方案的关联说明"}}]
}}

评分说明：
- overall_innovation_score 取值 0.0-1.0，代表综合创新水平
- 0.7 以上：有明确的实质性创新突破
- 0.4-0.7：有一定创新但不够突出，或创新点存在争议
- 0.4 以下：创新性不足或与已有方案高度雷同

===== 参赛材料全文 =====
{full_text}

===== 结构化摘要 =====
{essence}

===== 最相似已有方案（Top-3）=====
{top_candidates}
"""


class InnovationService:
    def __init__(self, llm: LLMClient | None = None):
        self.llm = llm or get_llm_client()

    async def _evaluate_with_llm(
        self, full_text: str, essence: dict, top_candidates: list[dict]
    ) -> dict:
        prompt = INNOVATION_PROMPT.format(
            full_text=full_text,
            essence=json.dumps(essence, ensure_ascii=False),
            top_candidates=json.dumps(top_candidates[:3], ensure_ascii=False),
        )
        # 使用联网搜索增强的 LLM 调用
        content = self.llm.chat_with_search(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2048,
            search_options={
                "forced_search": True,
                "search_strategy": "max",
            },
        )
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == 0:
            return {
                "overall_innovation_score": 0.0,
                "verdict": "待复核",
                "assessment": "解析失败，请重试",
                "strengths": [],
                "weaknesses": [],
                "risk_flags": [],
                "web_references": [],
            }
        try:
            result = json.loads(content[start:end])
        except (json.JSONDecodeError, ValueError):
            return {
                "overall_innovation_score": 0.0,
                "verdict": "待复核",
                "assessment": "JSON 解析失败，请重试",
                "strengths": [],
                "weaknesses": [],
                "risk_flags": [],
                "web_references": [],
            }
        # 确保 web_references 字段存在
        if "web_references" not in result:
            result["web_references"] = []
        return result

    async def evaluate(
        self,
        db: AsyncSession,
        task_id: str,
        full_text: str,
        essence: dict,
        candidates: list[dict],
    ) -> dict:
        return await self._evaluate_with_llm(full_text, essence, candidates)
