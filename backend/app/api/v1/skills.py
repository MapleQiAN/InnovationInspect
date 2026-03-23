from fastapi import APIRouter, HTTPException
from app.schemas.skill_schemas import SkillMeta, SkillExecuteRequest, SkillExecuteResponse
from app.skills.skill_registry import registry

# Import all skill modules to trigger self-registration
import app.skills.file_fetch_skill  # noqa: F401
import app.skills.web_search_skill  # noqa: F401
import app.skills.ocr_skill  # noqa: F401
import app.skills.doc_parse_skill  # noqa: F401
import app.skills.proposal_essence_skill  # noqa: F401
import app.skills.prior_art_skill  # noqa: F401
import app.skills.solution_aligner_skill  # noqa: F401
import app.skills.novelty_evaluator_skill  # noqa: F401
import app.skills.review_report_skill  # noqa: F401

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("/", response_model=list[SkillMeta])
async def list_skills():
    """列出所有已注册的 OpenClaw Skills。"""
    return registry.list_all()


@router.get("/{skill_name}", response_model=SkillMeta)
async def get_skill(skill_name: str):
    """获取指定 Skill 的元数据与入参 Schema。"""
    skill = registry.get(skill_name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")
    return {
        "name": skill.name,
        "description": skill.description,
        "skill_type": skill.skill_type,
        "input_schema": skill.input_schema,
    }


@router.post("/{skill_name}/execute", response_model=SkillExecuteResponse)
async def execute_skill(skill_name: str, body: SkillExecuteRequest):
    """直接执行指定 Skill（用于前端测试与独立调用）。"""
    skill = registry.get(skill_name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")
    result = await skill.run(**body.inputs)
    return SkillExecuteResponse(
        skill_name=skill_name,
        success=result.success,
        data=result.data,
        error=result.error,
        duration_ms=result.duration_ms,
    )
