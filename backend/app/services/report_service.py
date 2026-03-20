import json
import anthropic
from app.config import settings
from app.models.report import Report
from sqlalchemy.ext.asyncio import AsyncSession

REPORT_PROMPT = """
请根据以下分析结果，生成一份专业审核报告摘要（中文，500字以内），包含：
1. 项目核心技术摘要（2-3句）
2. 主要相似风险（若有）
3. 创新性评估结论
4. 建议处置意见（通过/待复核/不建议通过）

方案实质：{essence}

相似度分析（Top候选）：{similarity}

创新性评估：{innovation}
"""


class ReportService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def generate(
        self,
        db: AsyncSession,
        task_id: str,
        essence: dict,
        sim_result: dict,
        innov_result: dict,
    ) -> Report:
        prompt = REPORT_PROMPT.format(
            essence=json.dumps(essence, ensure_ascii=False)[:1000],
            similarity=json.dumps(sim_result, ensure_ascii=False)[:2000],
            innovation=json.dumps(innov_result, ensure_ascii=False)[:1000],
        )
        msg = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        summary = msg.content[0].text
        conclusion = innov_result.get("explanation", "")

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
