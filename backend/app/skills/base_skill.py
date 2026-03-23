from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any
import time


@dataclass
class SkillResult:
    success: bool
    data: Any
    error: str | None = None
    duration_ms: int = 0


class BaseSkill(ABC):
    name: str
    description: str
    skill_type: str  # "basic" | "core"
    input_schema: dict  # JSON Schema for inputs

    @abstractmethod
    async def execute(self, **kwargs) -> SkillResult:
        ...

    def to_tool_definition(self) -> dict:
        """Return Anthropic tool definition for this skill."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }

    async def run(self, **kwargs) -> SkillResult:
        """Wrapper that times execution and catches exceptions."""
        start = time.monotonic()
        try:
            result = await self.execute(**kwargs)
            result.duration_ms = int((time.monotonic() - start) * 1000)
            return result
        except Exception as e:
            return SkillResult(
                success=False,
                data=None,
                error=str(e),
                duration_ms=int((time.monotonic() - start) * 1000),
            )
