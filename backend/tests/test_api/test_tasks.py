import pytest
import io
from datetime import datetime
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
    mock_db.add = MagicMock()

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


@pytest.mark.asyncio
async def test_list_tasks_returns_task_summaries(client):
    """Task list should include list-friendly summary fields."""
    from app.models.task import TaskStatus

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.all.return_value = [
        (
            "task-1",
            TaskStatus.PROCESSING,
            "extracting_essence",
            datetime(2026, 3, 31, 10, 0, 0),
            datetime(2026, 3, 31, 10, 1, 0),
            None,
            3,
            "proposal-a.pdf",
            None,
        )
    ]
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = await client.get("/api/v1/tasks/")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    body = response.json()
    assert body[0]["task_id"] == "task-1"
    assert body[0]["document_count"] == 3
    assert body[0]["primary_filename"] == "proposal-a.pdf"
    assert body[0]["report_id"] is None


@pytest.mark.asyncio
async def test_list_tasks_orders_newest_first_and_includes_report_id(client):
    """Task list should preserve newest-first ordering and report links."""
    from app.models.task import TaskStatus

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.all.return_value = [
        (
            "task-new",
            TaskStatus.COMPLETED,
            None,
            datetime(2026, 3, 31, 11, 0, 0),
            datetime(2026, 3, 31, 11, 5, 0),
            None,
            2,
            "new.docx",
            "report-9",
        ),
        (
            "task-old",
            TaskStatus.PENDING,
            None,
            datetime(2026, 3, 31, 9, 0, 0),
            datetime(2026, 3, 31, 9, 0, 0),
            None,
            1,
            "old.pdf",
            None,
        ),
    ]
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = await client.get("/api/v1/tasks/")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    body = response.json()
    assert [item["task_id"] for item in body] == ["task-new", "task-old"]
    assert body[0]["report_id"] == "report-9"
