from app.models.task import TaskStatus


def test_task_status_values():
    assert TaskStatus.PENDING == "pending"
    assert TaskStatus.PROCESSING == "processing"
    assert TaskStatus.COMPLETED == "completed"
    assert TaskStatus.FAILED == "failed"
