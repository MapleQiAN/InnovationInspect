import json
from app.llm.client import LLMClient, get_llm_client
from app.config import settings
from app.models.report import Report
from sqlalchemy.ext.asyncio import AsyncSession

REPORT_PROMPT = """
你是一位资深科技竞赛评审专家。请基于参赛材料全文和已完成的分析结果，撰写一份专业的审核报告摘要。

要求：
- 800字以内，语言专业、客观
- 需具体引用材料原文中的内容作为论据，不要泛泛而谈
- 包含：项目核心内容概述、创新性评价、相似风险分析、综合建议

===== 参赛材料全文 =====
{full_text}

===== 结构化摘要 =====
{essence}

===== 相似度分析结果 =====
{similarity}

===== 创新性评估结果 =====
{innovation}
"""


class ReportService:
    def __init__(self, llm: LLMClient | None = None):
        self.llm = llm or get_llm_client()

    async def generate(
        self,
        db: AsyncSession,
        task_id: str,
        full_text: str,
        essence: dict,
        sim_result: dict,
        innov_result: dict,
    ) -> Report:
        prompt = REPORT_PROMPT.format(
            full_text=full_text,
            essence=json.dumps(essence, ensure_ascii=False),
            similarity=json.dumps(sim_result, ensure_ascii=False),
            innovation=json.dumps(innov_result, ensure_ascii=False),
        )
        summary = self.llm.chat(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2048,
        )
        conclusion = innov_result.get("verdict", "")

        report = Report(
            task_id=task_id,
            summary=summary,
            similarity_result=sim_result,
            innovation_result=innov_result,
            conclusion=conclusion,
        )
        db.add(report)
        await db.commit()
        return report
