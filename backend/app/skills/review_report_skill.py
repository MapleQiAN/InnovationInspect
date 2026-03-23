from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class ReviewReportSkill(BaseSkill):
    name = "review-report-writer"
    description = "汇总分析结果，生成可供专家直接使用的结构化审核报告"
    skill_type = "core"
    input_schema = {
        "type": "object",
        "properties": {
            "task_id": {"type": "string", "description": "分析任务 ID"},
        },
        "required": ["task_id"],
    }

    async def execute(self, task_id: str, **kwargs) -> SkillResult:
        from app.database import AsyncSessionLocal
        from app.services.report_service import ReportService
        from app.models.essence import ProposalEssence
        from app.models.report import Report
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            essence_result = await db.execute(
                select(ProposalEssence).where(ProposalEssence.task_id == task_id)
            )
            essence = essence_result.scalar_one_or_none()
            if not essence:
                raise ValueError(f"No essence found for task {task_id}")
            report = await ReportService().generate(db, task_id, essence, {}, {})
            report_id = str(report.id) if report else None
        return SkillResult(success=True, data={"report_id": report_id, "task_id": task_id})


registry.register(ReviewReportSkill())
