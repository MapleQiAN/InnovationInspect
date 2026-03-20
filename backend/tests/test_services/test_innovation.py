import pytest
from unittest.mock import AsyncMock, patch

ESSENCE = {
    "problem": {"summary": "农业病虫害识别"},
    "method": {"core_algorithms": ["YOLOv8"]},
    "innovation": {"claims": ["首次在 Android 设备实现实时推理"], "types": ["engineering"]},
}

CANDIDATES = [
    {"title": "基于YOLO的病害检测", "overall_similarity": 0.8},
]

MOCK_INNOVATION = {
    "problem_definition_innovation": 0.3,
    "method_innovation": 0.4,
    "architecture_innovation": 0.5,
    "scenario_migration_innovation": 0.6,
    "engineering_optimization_innovation": 0.8,
    "combination_innovation": 0.3,
    "overall_innovation_score": 0.65,
    "risk_flags": ["核心算法与已有研究高度重叠"],
    "explanation": "工程优化创新度较高，核心方法与已有工作重合度较高",
}


@pytest.mark.asyncio
async def test_evaluate_returns_six_dimensions():
    from app.services.innovation_service import InnovationService, INNOVATION_DIMS
    service = InnovationService()
    with patch.object(service, "_evaluate_with_llm", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_INNOVATION
        result = await service.evaluate(None, "task-1", ESSENCE, CANDIDATES)
    for dim in INNOVATION_DIMS:
        assert dim in result
    assert "overall_innovation_score" in result
    assert "risk_flags" in result
    assert "explanation" in result


@pytest.mark.asyncio
async def test_overall_score_in_range():
    from app.services.innovation_service import InnovationService
    service = InnovationService()
    with patch.object(service, "_evaluate_with_llm", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_INNOVATION
        result = await service.evaluate(None, "task-1", ESSENCE, CANDIDATES)
    assert 0 <= result["overall_innovation_score"] <= 1


@pytest.mark.asyncio
async def test_risk_flags_is_list():
    from app.services.innovation_service import InnovationService
    service = InnovationService()
    with patch.object(service, "_evaluate_with_llm", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_INNOVATION
        result = await service.evaluate(None, "task-1", ESSENCE, CANDIDATES)
    assert isinstance(result["risk_flags"], list)


def test_innovation_prompt_has_six_dimensions():
    from app.services.innovation_service import INNOVATION_PROMPT
    dims = ["problem_definition_innovation", "method_innovation", "architecture_innovation",
            "scenario_migration_innovation", "engineering_optimization_innovation", "combination_innovation"]
    for dim in dims:
        assert dim in INNOVATION_PROMPT
