import pytest
import io
from unittest.mock import patch, MagicMock, AsyncMock


@pytest.mark.asyncio
async def test_full_pipeline_mock(client):
    """End-to-end pipeline test with all external dependencies mocked."""
    from app.database import get_db
    from app.main import app

    mock_db = AsyncMock()
    mock_db.flush = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.add = MagicMock()

    import uuid
    from app.models.task import AnalysisTask, TaskStatus

    mock_task = MagicMock(spec=AnalysisTask)
    mock_task.id = str(uuid.uuid4())
    mock_task.status = TaskStatus.PENDING

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db

    with (
        patch("app.api.v1.tasks.file_service.upload_file", new_callable=AsyncMock) as mock_upload,
        patch("app.api.v1.tasks.AnalysisTask", return_value=mock_task),
    ):
        mock_upload.return_value = "uploads/test.pdf"

        # Submit task
        response = await client.post(
            "/api/v1/tasks/",
            files={"files": ("proposal.pdf", io.BytesIO(b"%PDF-1.4 test content"), "application/pdf")},
        )

    app.dependency_overrides.clear()

    assert response.status_code == 201
    data = response.json()
    assert "task_id" in data
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_task_status_polling(client):
    """Test task status endpoint returns proper structure."""
    from app.database import get_db
    from app.main import app
    from app.models.task import AnalysisTask, TaskStatus
    import uuid

    mock_db = AsyncMock()
    task_id = str(uuid.uuid4())

    mock_task = MagicMock(spec=AnalysisTask)
    mock_task.id = task_id
    mock_task.status = TaskStatus.PROCESSING
    mock_task.current_step = "extracting_essence"
    mock_task.error_message = None

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_task
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    response = await client.get(f"/api/v1/tasks/{task_id}")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processing"
    assert data["current_step"] == "extracting_essence"


@pytest.mark.asyncio
async def test_upload_size_limit(client):
    """Test that files over 50MB are rejected."""
    # Create a mock large content-length header
    response = await client.post(
        "/api/v1/tasks/",
        content=b"x" * 100,
        headers={"content-length": str(51 * 1024 * 1024), "content-type": "multipart/form-data; boundary=test"},
    )
    assert response.status_code == 413


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """Smoke test: health endpoint always returns ok."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_nonexistent_report_404(client):
    """Test report 404 handling."""
    from app.database import get_db
    from app.main import app

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    response = await client.get("/api/v1/reports/does-not-exist")
    app.dependency_overrides.clear()

    assert response.status_code == 404
