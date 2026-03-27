from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.report import Report
from app.schemas.report import ReviewComment, ReportResponse, ReportListItem

router = APIRouter()


@router.get("/", response_model=list[ReportListItem])
async def list_reports(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).order_by(Report.created_at.desc()))
    reports = result.scalars().all()
    return [
        ReportListItem(
            id=r.id,
            task_id=r.task_id,
            summary=r.summary,
            overall_score=(r.innovation_result or {}).get("overall_innovation_score"),
            reviewer_comment=r.reviewer_comment,
            created_at=r.created_at,
        )
        for r in reports
    ]


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
        web_search_results=report.web_search_results or [],
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
