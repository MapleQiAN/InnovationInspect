from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class PriorArtSkill(BaseSkill):
    name = "prior-art-retriever"
    description = "基于方案实质生成多类查询，从内部知识库与互联网召回候选方案"
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
        from app.services.retrieval_service import RetrievalService
        from app.models.essence import ProposalEssence
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(ProposalEssence).where(ProposalEssence.task_id == task_id)
            )
            essence = result.scalar_one_or_none()
            if not essence:
                raise ValueError(f"No essence found for task {task_id}")
            candidates = await RetrievalService().retrieve(db, task_id, essence)
        return SkillResult(
            success=True,
            data={"candidates_found": len(candidates), "task_id": task_id},
        )


registry.register(PriorArtSkill())
