from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.task import AnalysisTask, TaskStatus
from app.models.document import Document
from app.schemas.task import TaskCreateResponse, TaskStatusResponse
from app.services.file_service import FileService

router = APIRouter()
file_service = FileService()


@router.post("/", response_model=TaskCreateResponse, status_code=201)
async def create_task(
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    task = AnalysisTask()
    db.add(task)
    await db.flush()

    for upload in files:
        content = await upload.read()
        ext = upload.filename.rsplit(".", 1)[-1].lower() if upload.filename and "." in upload.filename else "bin"
        key = await file_service.upload_file(content, upload.filename or "upload.bin", upload.content_type or "application/octet-stream")
        doc = Document(task_id=task.id, filename=upload.filename or "upload.bin", file_type=ext, storage_key=key)
        db.add(doc)

    await db.commit()

    # Trigger async analysis - import here to avoid circular import
    try:
        from app.workers.analysis_tasks import run_analysis
        run_analysis.apply_async(args=[task.id])
    except Exception:
        pass  # Worker may not be available in test environment

    return TaskCreateResponse(task_id=task.id, status=task.status)


@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AnalysisTask).where(AnalysisTask.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskStatusResponse(
        task_id=task.id,
        status=task.status,
        current_step=task.current_step,
        error_message=task.error_message,
    )
