from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class SolutionAlignerSkill(BaseSkill):
    name = "solution-aligner"
    description = "执行五维实质相似度分析，输出问题/方法/架构/流程/证据对齐得分"
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
        from app.services.similarity_service import SimilarityService
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
            sim_result = await SimilarityService().analyze(essence, list(candidates))
        return SkillResult(
            success=True,
            data={"overall_similarity": sim_result.get("overall_similarity"), "task_id": task_id},
        )


registry.register(SolutionAlignerSkill())
