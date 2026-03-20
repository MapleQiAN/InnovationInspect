from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.report import Report
from app.models.essence import ProposalEssence
from app.models.candidate import Candidate
from app.models.task import AnalysisTask

router = APIRouter()


@router.get("/{task_id}/results")
async def get_task_results(task_id: str, db: AsyncSession = Depends(get_db)):
    task_result = await db.execute(
        select(AnalysisTask).where(AnalysisTask.id == task_id)
    )
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    essence = (
        await db.execute(
            select(ProposalEssence).where(ProposalEssence.task_id == task_id)
        )
    ).scalar_one_or_none()

    candidates = (
        await db.execute(select(Candidate).where(Candidate.task_id == task_id))
    ).scalars().all()

    report = (
        await db.execute(select(Report).where(Report.task_id == task_id))
    ).scalar_one_or_none()

    return {
        "task_id": task_id,
        "status": task.status,
        "essence": {
            "problem": essence.problem,
            "method": essence.method,
            "architecture": essence.architecture,
            "innovation": essence.innovation,
        } if essence else None,
        "top_candidates": [
            {
                "title": c.title,
                "source": c.source,
                "similarity": c.overall_similarity,
            }
            for c in sorted(candidates, key=lambda x: x.overall_similarity, reverse=True)[:5]
        ],
        "report_id": report.id if report else None,
    }
