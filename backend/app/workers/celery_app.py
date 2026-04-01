from celery import Celery
from app.config import settings

celery_app = Celery(
    "ccreview",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.analysis_tasks"],
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Shanghai",
    worker_concurrency=settings.celery_worker_concurrency,
)
