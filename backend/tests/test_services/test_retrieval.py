import pytest
from unittest.mock import AsyncMock, patch, MagicMock


SAMPLE_ESSENCE = {
    "problem": {"summary": "农业病虫害图像识别"},
    "method": {"core_algorithms": ["YOLOv8", "CNN"]},
    "architecture": {"modules": ["移动端", "云端"]},
    "innovation": {"claims": ["轻量化部署"]},
}


@pytest.mark.asyncio
async def test_generate_queries_returns_list():
    from app.services.retrieval_service import RetrievalService
    with patch("app.services.retrieval_service.VectorStore") as MockVS:
        MockVS.return_value = MagicMock()
        MockVS.return_value.search.return_value = []
        service = RetrievalService()
        with patch.object(service, "_call_llm_for_queries", new_callable=AsyncMock) as mock:
            mock.return_value = ["YOLOv8 农业病虫害检测", "轻量化目标检测模型部署"]
            queries = await service.generate_queries(SAMPLE_ESSENCE)
    assert len(queries) >= 1
    assert all(isinstance(q, str) for q in queries)


@pytest.mark.asyncio
async def test_retrieve_saves_candidates():
    from app.services.retrieval_service import RetrievalService
    with patch("app.services.retrieval_service.VectorStore") as MockVS:
        MockVS.return_value = MagicMock()
        MockVS.return_value.search.return_value = []

        service = RetrievalService()
        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()

        with (
            patch.object(service, "generate_queries", new_callable=AsyncMock) as mock_queries,
            patch.object(service.web_search, "search", new_callable=AsyncMock) as mock_web,
        ):
            mock_queries.return_value = ["test query"]
            mock_web.return_value = [
                {"title": "相关论文", "url": "https://arxiv.org/test", "snippet": "摘要内容"}
            ]
            candidates = await service.retrieve(mock_db, "task-123", SAMPLE_ESSENCE)

    assert isinstance(candidates, list)
    mock_db.commit.assert_called_once()
