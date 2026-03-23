from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class NoveltyEvaluatorSkill(BaseSkill):
    name = "novelty-evaluator"
    description = "六维创新性评估，输出各维度得分、综合创新分与风险标记"
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
        from app.services.innovation_service import InnovationService
        from app.models.essence import ProposalEssence
        from app.models.candidate import Candidate
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            essence_result = await db.execute(
                select(ProposalEssence).where(ProposalEssence.task_id == task_id)
            )
            essence = essence_result.scalar_one_or_none()
            if not essence:
                raise ValueError(f"No essence found for task {task_id}")
            cand_result = await db.execute(
                select(Candidate).where(Candidate.task_id == task_id)
            )
            candidates = cand_result.scalars().all()
            innov = await InnovationService().evaluate(db, task_id, essence, list(candidates))
        return SkillResult(
            success=True,
            data={"overall_innovation_score": innov.get("overall_innovation_score"), "task_id": task_id},
        )


registry.register(NoveltyEvaluatorSkill())
