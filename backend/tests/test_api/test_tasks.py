import pytest
import io
from unittest.mock import patch, MagicMock, AsyncMock
from app.main import app
from app.database import get_db


@pytest.mark.asyncio
async def test_create_task_returns_task_id(client):
    """Test task creation with mocked DB and file service."""
    import uuid
    from app.models.task import TaskStatus, AnalysisTask

    mock_task_id = str(uuid.uuid4())
    mock_task = MagicMock(spec=AnalysisTask)
    mock_task.id = mock_task_id
    mock_task.status = TaskStatus.PENDING

    mock_db = AsyncMock()
    mock_db.flush = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.add = AsyncMock()

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        with (
            patch("app.api.v1.tasks.AnalysisTask", return_value=mock_task),
            patch("app.api.v1.tasks.Document"),
            patch("app.api.v1.tasks.file_service.upload_file", new_callable=AsyncMock, return_value="uploads/test.pdf"),
        ):
            response = await client.post(
                "/api/v1/tasks/",
                files={"files": ("test.pdf", io.BytesIO(b"%PDF-1.4 test"), "application/pdf")},
            )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 201
    body = response.json()
    assert "task_id" in body
    assert body["task_id"] == mock_task_id
    assert "status" in body


@pytest.mark.asyncio
async def test_get_nonexistent_task_returns_404(client):
    """Test that getting a non-existent task returns 404."""
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = await client.get("/api/v1/tasks/nonexistent-id-12345")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found"
