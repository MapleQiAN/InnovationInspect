import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.mark.asyncio
async def test_get_nonexistent_report_returns_404(client):
    from app.database import get_db
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    from app.main import app
    async def override_db():
        yield mock_db
    app.dependency_overrides[get_db] = override_db

    response = await client.get("/api/v1/reports/nonexistent-report-id")
    app.dependency_overrides.clear()
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_add_review_comment_to_nonexistent_report(client):
    from app.database import get_db
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    from app.main import app
    async def override_db():
        yield mock_db
    app.dependency_overrides[get_db] = override_db

    response = await client.post(
        "/api/v1/reports/nonexistent-id/review",
        json={"comment": "专家意见"},
    )
    app.dependency_overrides.clear()
    assert response.status_code == 404
