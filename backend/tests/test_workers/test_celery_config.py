def test_celery_app_name():
    from app.workers.celery_app import celery_app
    assert celery_app.main == "ccreview"


def test_celery_task_registered():
    """run_analysis task should be importable."""
    from app.workers.analysis_tasks import run_analysis
    assert run_analysis.name == "run_analysis"


def test_pipeline_steps_defined():
    """Verify the task pipeline has correct step names."""
    import inspect
    from app.workers import analysis_tasks
    source = inspect.getsource(analysis_tasks)
    steps = ["parsing", "extracting_essence", "retrieving_candidates",
             "analyzing_similarity", "evaluating_innovation", "generating_report"]
    for step in steps:
        assert step in source, f"Step '{step}' not found in analysis_tasks"


def test_celery_worker_concurrency_uses_settings(monkeypatch):
    from importlib import reload
    import app.config as config_module
    import app.workers.celery_app as celery_module

    monkeypatch.setenv("CELERY_WORKER_CONCURRENCY", "4")

    reload(config_module)
    reload(celery_module)

    assert config_module.settings.celery_worker_concurrency == 4
    assert celery_module.celery_app.conf.worker_concurrency == 4
