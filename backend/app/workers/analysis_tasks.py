import asyncio
from app.workers.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.task import AnalysisTask, TaskStatus
from sqlalchemy import select


def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


@celery_app.task(name="run_analysis", bind=True, max_retries=2)
def run_analysis(self, task_id: str):
    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(AnalysisTask).where(AnalysisTask.id == task_id)
            )
            task = result.scalar_one_or_none()
            if not task:
                return

            try:
                task.status = TaskStatus.PROCESSING
                await db.commit()

                # Step 1: Parse documents
                task.current_step = "parsing"
                await db.commit()
                from app.services.doc_parse_service import DocParseService
                text = await DocParseService().parse_task_documents(db, task_id)

                # Step 2: Extract essence
                task.current_step = "extracting_essence"
                await db.commit()
                from app.services.essence_extractor import EssenceExtractor
                essence = await EssenceExtractor().extract(db, task_id, text)

                # Step 3: Retrieve candidates
                task.current_step = "retrieving_candidates"
                await db.commit()
                from app.services.retrieval_service import RetrievalService
                candidates = await RetrievalService().retrieve(db, task_id, essence)

                # Step 4: Similarity analysis
                task.current_step = "analyzing_similarity"
                await db.commit()
                from app.services.similarity_service import SimilarityService
                sim_result = await SimilarityService().analyze(essence, candidates)

                # Step 5: Innovation evaluation
                task.current_step = "evaluating_innovation"
                await db.commit()
                from app.services.innovation_service import InnovationService
                innov_result = await InnovationService().evaluate(
                    db, task_id, text, essence, candidates
                )

                # Step 6: Generate report
                task.current_step = "generating_report"
                await db.commit()
                from app.services.report_service import ReportService
                await ReportService().generate(db, task_id, text, essence, sim_result, innov_result)

                task.status = TaskStatus.COMPLETED
                task.current_step = None
                await db.commit()

            except Exception as e:
                await db.rollback()
                # rollback 后 session 中的对象已过期，需重新加载
                result = await db.execute(
                    select(AnalysisTask).where(AnalysisTask.id == task_id)
                )
                task = result.scalar_one_or_none()
                if task:
                    task.status = TaskStatus.FAILED
                    task.error_message = str(e)[:500]
                    task.current_step = None
                    await db.commit()
                raise self.retry(exc=e, countdown=30)

    run_async(_run())
