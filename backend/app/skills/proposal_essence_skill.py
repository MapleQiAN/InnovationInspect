from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class ProposalEssenceSkill(BaseSkill):
    name = "proposal-essence-extractor"
    description = "从原始文本中抽取方案实质（问题定义、关键技术、系统架构、创新点）"
    skill_type = "core"
    input_schema = {
        "type": "object",
        "properties": {
            "task_id": {"type": "string", "description": "分析任务 ID"},
            "text": {"type": "string", "description": "已解析的文档原始文本"},
        },
        "required": ["task_id", "text"],
    }

    async def execute(self, task_id: str, text: str, **kwargs) -> SkillResult:
        from app.database import AsyncSessionLocal
        from app.services.essence_extractor import EssenceExtractor

        async with AsyncSessionLocal() as db:
            await EssenceExtractor().extract(db, task_id, text)
        return SkillResult(success=True, data={"essence_extracted": True, "task_id": task_id})


registry.register(ProposalEssenceSkill())
