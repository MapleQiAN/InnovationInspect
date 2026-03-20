import pytest
from unittest.mock import AsyncMock, patch, MagicMock


SAMPLE_TEXT = """
本项目旨在解决农业病虫害识别效率低的问题。
核心技术：YOLOv8目标检测模型 + ResNet特征提取。
系统架构：移动端采集 -> 云端推理 -> 专家复核。
创新点：首次将轻量化模型部署到低配 Android 设备。
"""

MOCK_ESSENCE = {
    "problem": {"summary": "农业病虫害识别", "category": "图像识别", "target": "农民", "constraints": []},
    "method": {"core_algorithms": ["YOLOv8", "ResNet"], "pipeline": ["采集", "推理", "复核"], "models": ["YOLOv8"]},
    "architecture": {"modules": ["移动端", "云端", "专家系统"], "interfaces": [], "deployment": "移动+云端"},
    "innovation": {"claims": ["轻量化模型部署"], "types": ["engineering"]},
    "evidence": {"references": []},
}


@pytest.mark.asyncio
async def test_extract_from_text_returns_essence():
    from app.services.essence_extractor import EssenceExtractor
    extractor = EssenceExtractor()
    with patch.object(extractor, "_call_llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = MOCK_ESSENCE
        result = await extractor.extract_from_text(SAMPLE_TEXT)
    assert "problem" in result
    assert "method" in result
    assert "architecture" in result
    assert "innovation" in result
    assert "evidence" in result


@pytest.mark.asyncio
async def test_extract_saves_to_db():
    from app.services.essence_extractor import EssenceExtractor
    extractor = EssenceExtractor()
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()

    with patch.object(extractor, "_call_llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = MOCK_ESSENCE
        result = await extractor.extract(mock_db, "task-123", SAMPLE_TEXT)

    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    assert result["problem"]["summary"] == "农业病虫害识别"


def test_extractor_has_prompt():
    from app.services.essence_extractor import EXTRACTION_PROMPT
    assert "problem" in EXTRACTION_PROMPT
    assert "method" in EXTRACTION_PROMPT
    assert "innovation" in EXTRACTION_PROMPT
