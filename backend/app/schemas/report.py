from pydantic import BaseModel


class ReviewComment(BaseModel):
    comment: str


class ReportResponse(BaseModel):
    id: str
    task_id: str
    summary: str | None = None
    similarity_result: dict = {}
    innovation_result: dict = {}
    conclusion: str | None = None
    reviewer_comment: str | None = None
