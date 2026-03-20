import uuid
import io
from app.storage.minio_client import minio_client
from app.config import settings


class FileService:
    async def upload_file(self, content: bytes, filename: str, content_type: str) -> str:
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
        key = f"uploads/{uuid.uuid4()}.{ext}"
        minio_client.put_object(
            settings.minio_bucket,
            key,
            io.BytesIO(content),
            length=len(content),
            content_type=content_type,
        )
        return key

    async def download_file(self, key: str) -> bytes:
        response = minio_client.get_object(settings.minio_bucket, key)
        return response.read()
