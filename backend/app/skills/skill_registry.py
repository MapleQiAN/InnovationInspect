from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .base_skill import BaseSkill


class SkillRegistry:
    _instance: SkillRegistry | None = None
    _skills: dict[str, "BaseSkill"]

    def __new__(cls) -> SkillRegistry:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._skills = {}
        return cls._instance

    def register(self, skill: "BaseSkill") -> None:
        self._skills[skill.name] = skill

    def get(self, name: str) -> "BaseSkill | None":
        return self._skills.get(name)

    def list_all(self) -> list[dict]:
        return [
            {
                "name": s.name,
                "description": s.description,
                "skill_type": s.skill_type,
                "input_schema": s.input_schema,
            }
            for s in self._skills.values()
        ]

    def tool_definitions(self) -> list[dict]:
        return [s.to_tool_definition() for s in self._skills.values()]


registry = SkillRegistry()
