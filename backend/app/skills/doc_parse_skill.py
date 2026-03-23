from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class DocParseSkill(BaseSkill):
    name = "doc-parse-skill"
    description = "解析 PDF/DOCX/PPTX/图片文档，抽取并分块文本"
    skill_type = "basic"
    input_schema = {
        "type": "object",
        "properties": {
            "task_id": {
                "type": "string",
                "description": "分析任务 ID，用于查找已上传的文档",
            }
        },
        "required": ["task_id"],
    }

    async def execute(self, task_id: str, **kwargs) -> SkillResult:
        from app.database import AsyncSessionLocal
        from app.services.doc_parse_service import DocParseService

        async with AsyncSessionLocal() as db:
            text = await DocParseService().parse_task_documents(db, task_id)
        return SkillResult(success=True, data={"text_preview": text[:500], "task_id": task_id})


registry.register(DocParseSkill())
