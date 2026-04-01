from datetime import datetime
from pydantic import BaseModel
from app.models.task import TaskStatus


class TaskCreateResponse(BaseModel):
    task_id: str
    status: TaskStatus


class TaskStatusResponse(BaseModel):
    task_id: str
    status: TaskStatus
    current_step: str | None = None
    error_message: str | None = None


class TaskListItem(BaseModel):
    task_id: str
    status: TaskStatus
    current_step: str | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
    document_count: int
    primary_filename: str | None = None
    report_id: str | None = None
