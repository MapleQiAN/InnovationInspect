from pydantic import BaseModel
from typing import Any


class SkillMeta(BaseModel):
    name: str
    description: str
    skill_type: str
    input_schema: dict


class SkillExecuteRequest(BaseModel):
    inputs: dict[str, Any]


class SkillExecuteResponse(BaseModel):
    skill_name: str
    success: bool
    data: Any
    error: str | None
    duration_ms: int
