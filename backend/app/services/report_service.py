import json
from app.llm.client import LLMClient, get_llm_client
from app.config import settings
from app.models.report import Report
from sqlalchemy.ext.asyncio import AsyncSession

REPORT_PROMPT = """
你是一位资深科技竞赛评审专家。请基于参赛材料全文和已完成的分析结果，撰写一份专业的审核报告摘要。

请利用联网搜索能力，搜索该选题的最新相关研究和竞赛项目，丰富报告内容。

要求：
- 1200字以内，语言专业、客观
- 需具体引用材料原文中的内容作为论据，不要泛泛而谈
- 包含以下章节：
  1. 项目核心内容概述
  2. 选题创新度分析（重点章节）：
     - 列举网络上搜索到的同类选题/方案
     - 逐一对比分析本方案与已有方案的异同
     - 给出选题创新度结论
  3. 相似风险分析
  4. 综合建议

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
        # 使用联网搜索增强的 LLM 调用生成报告
        summary = self.llm.chat_with_search(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000,
            search_options={
                "forced_search": True,
                "search_strategy": "max",
            },
        )
        conclusion = innov_result.get("verdict", "")
        web_refs = innov_result.get("web_references", [])

        report = Report(
            task_id=task_id,
            summary=summary,
            similarity_result=sim_result,
            innovation_result=innov_result,
            conclusion=conclusion,
            web_search_results=web_refs,
        )
        db.add(report)
        await db.commit()
        return report
