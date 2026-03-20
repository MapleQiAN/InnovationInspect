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
