from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.task import AnalysisTask, TaskStatus
from app.models.document import Document
from app.models.report import Report
from app.schemas.task import TaskCreateResponse, TaskStatusResponse, TaskListItem
from app.services.file_service import FileService

router = APIRouter()
file_service = FileService()


@router.get("/", response_model=list[TaskListItem])
async def list_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            AnalysisTask.id.label("task_id"),
            AnalysisTask.status,
            AnalysisTask.current_step,
            AnalysisTask.created_at,
            AnalysisTask.updated_at,
            AnalysisTask.error_message,
            func.count(Document.id).label("document_count"),
            func.min(Document.filename).label("primary_filename"),
            Report.id.label("report_id"),
        )
        .outerjoin(Document, Document.task_id == AnalysisTask.id)
        .outerjoin(Report, Report.task_id == AnalysisTask.id)
        .group_by(
            AnalysisTask.id,
            AnalysisTask.status,
            AnalysisTask.current_step,
            AnalysisTask.created_at,
            AnalysisTask.updated_at,
            AnalysisTask.error_message,
            Report.id,
        )
        .order_by(AnalysisTask.created_at.desc())
    )

    items: list[TaskListItem] = []
    for row in result.all():
        mapping = row._mapping if hasattr(row, "_mapping") else None
        items.append(
            TaskListItem(
                task_id=(mapping["task_id"] if mapping else row[0]),
                status=(mapping["status"] if mapping else row[1]),
                current_step=(mapping["current_step"] if mapping else row[2]),
                created_at=(mapping["created_at"] if mapping else row[3]),
                updated_at=(mapping["updated_at"] if mapping else row[4]),
                error_message=(mapping["error_message"] if mapping else row[5]),
                document_count=(mapping["document_count"] if mapping else row[6]),
                primary_filename=(mapping["primary_filename"] if mapping else row[7]),
                report_id=(mapping["report_id"] if mapping else row[8]),
            )
        )
    return items


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
