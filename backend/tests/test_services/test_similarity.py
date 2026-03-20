import pytest
from unittest.mock import AsyncMock, patch

ESSENCE = {
    "problem": {"summary": "农业病虫害图像识别"},
    "method": {"core_algorithms": ["YOLOv8"]},
    "architecture": {"modules": ["移动端", "云端"]},
    "innovation": {"claims": ["低功耗部署"]},
    "evidence": {},
}

CANDIDATES = [
    {"title": "基于YOLO的作物病害检测系统", "snippet": "使用YOLOv5检测农业病害，部署于移动设备", "source": "internet"},
    {"title": "无关项目", "snippet": "完全不同的内容", "source": "internet"},
]

MOCK_SCORES = {
    "problem_similarity": 0.85,
    "method_similarity": 0.75,
    "architecture_similarity": 0.70,
    "flow_similarity": 0.60,
    "evidence_alignment": 0.80,
    "explanation": "两者均解决农业病虫害识别问题，技术路线高度相近",
}


@pytest.mark.asyncio
async def test_analyze_returns_five_dimensions():
    from app.services.similarity_service import SimilarityService
    service = SimilarityService()
    with patch.object(service, "_score_with_llm", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_SCORES
        result = await service.analyze(ESSENCE, CANDIDATES)
    assert "candidates" in result
    assert len(result["candidates"]) == 2
    scores = result["candidates"][0]["scores"]
    assert "problem_similarity" in scores
    assert "method_similarity" in scores
    assert "architecture_similarity" in scores
    assert "flow_similarity" in scores
    assert "evidence_alignment" in scores


@pytest.mark.asyncio
async def test_results_sorted_by_overall_similarity():
    from app.services.similarity_service import SimilarityService
    service = SimilarityService()
    call_count = 0
    async def mock_score(essence, candidate):
        nonlocal call_count
        score = 0.9 if call_count == 0 else 0.3
        call_count += 1
        return {k: score for k in ["problem_similarity", "method_similarity",
                                    "architecture_similarity", "flow_similarity", "evidence_alignment"]}

    with patch.object(service, "_score_with_llm", side_effect=mock_score):
        result = await service.analyze(ESSENCE, CANDIDATES)

    similarities = [r["overall_similarity"] for r in result["candidates"]]
    assert similarities == sorted(similarities, reverse=True)


@pytest.mark.asyncio
async def test_overall_similarity_is_average():
    from app.services.similarity_service import SimilarityService
    service = SimilarityService()
    with patch.object(service, "_score_with_llm", new_callable=AsyncMock) as mock:
        mock.return_value = {k: 0.5 for k in ["problem_similarity", "method_similarity",
                                               "architecture_similarity", "flow_similarity",
                                               "evidence_alignment"]}
        result = await service.analyze(ESSENCE, [CANDIDATES[0]])
    assert result["candidates"][0]["overall_similarity"] == 0.5
