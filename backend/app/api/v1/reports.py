from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.report import Report
from app.schemas.report import ReviewComment, ReportResponse

router = APIRouter()


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportResponse(
        id=report.id,
        task_id=report.task_id,
        summary=report.summary,
        similarity_result=report.similarity_result or {},
        innovation_result=report.innovation_result or {},
        conclusion=report.conclusion,
        reviewer_comment=report.reviewer_comment,
    )


@router.post("/{report_id}/review")
async def add_review_comment(
    report_id: str,
    body: ReviewComment,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.reviewer_comment = body.comment
    await db.commit()
    return {"status": "ok"}
