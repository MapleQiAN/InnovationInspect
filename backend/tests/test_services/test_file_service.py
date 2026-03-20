import pytest
from unittest.mock import MagicMock, patch


@pytest.mark.asyncio
async def test_upload_returns_storage_key():
    with patch("app.services.file_service.minio_client") as mock_minio:
        mock_minio.put_object = MagicMock()
        from app.services.file_service import FileService
        service = FileService()
        key = await service.upload_file(b"content", "test.pdf", "application/pdf")
    assert key.endswith(".pdf")
    assert key.startswith("uploads/")


@pytest.mark.asyncio
async def test_upload_no_extension():
    with patch("app.services.file_service.minio_client") as mock_minio:
        mock_minio.put_object = MagicMock()
        from app.services.file_service import FileService
        service = FileService()
        key = await service.upload_file(b"data", "noext", "application/octet-stream")
    assert key.endswith(".bin")
