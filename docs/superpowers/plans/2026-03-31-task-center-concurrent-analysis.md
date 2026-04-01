# Task Center Concurrent Analysis Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a task-center workflow where users can keep creating analysis tasks, each task uploads one batch of files, and multiple tasks run concurrently in the worker queue while the homepage shows all task progress.

**Architecture:** Keep `AnalysisTask` as the only task unit and extend the existing FastAPI + Celery backend with a task-list endpoint that returns list-friendly aggregates. Upgrade the Next.js homepage into a task center that combines the upload form and a polling task list, while keeping the existing single-task detail and report pages unchanged.

**Tech Stack:** FastAPI, SQLAlchemy async ORM, Celery, Redis, Next.js 15, React 19, TypeScript, Axios, pytest, ESLint

---

## Spec Reference

- Spec: `docs/superpowers/specs/2026-03-31-concurrent-analysis-tasks-design.md`

## File Map

### Backend files to modify

- `backend/app/api/v1/tasks.py`
  - Add `GET /api/v1/tasks/`
  - Keep `POST /api/v1/tasks/` semantics unchanged
- `backend/app/schemas/task.py`
  - Add task-list response models
- `backend/app/config.py`
  - Add configurable Celery worker concurrency setting
- `backend/app/workers/celery_app.py`
  - Read concurrency-related config into Celery settings if needed by the chosen worker launch approach
- `backend/tests/test_api/test_tasks.py`
  - Add API coverage for the new task-list endpoint

### Frontend files to modify

- `frontend/src/lib/api.ts`
  - Add `TaskListItem` and `listTasks()`
- `frontend/src/app/page.tsx`
  - Turn the homepage into a task-center shell
- `frontend/src/app/layout.tsx`
  - Update nav labeling so the homepage is clearly the task center
- `frontend/src/components/upload/UploadForm.tsx`
  - Stop forcing navigation to a single task page after submit
  - Expose a callback so the page can refresh the task list

### Frontend files to create

- `frontend/src/components/tasks/TaskCenter.tsx`
  - Client orchestration for polling and optimistic refresh after task creation
- `frontend/src/components/tasks/TaskList.tsx`
  - Presentational task list with links to detail and report pages

### Deployment/config files to modify

- `docker-compose.yml`
  - Pass worker concurrency explicitly in the worker command or env
- `.env.example`
  - Document the new concurrency environment variable if the repo already uses `.env.example` as the setup reference

### Verification touchpoints

- `backend/tests/test_api/test_tasks.py`
- `backend/tests/test_workers/test_celery_config.py`
- `frontend/package.json`
  - Reuse existing `npm run lint`

## Testing Strategy

- Backend follows TDD for the new list endpoint and Celery config behavior.
- Frontend currently has no automated component test runner in the repo. Do not add Jest or Vitest in this change. Use `npm run lint` plus browser/manual verification for the task-center UI.
- Keep existing single-task detail and report flows intact; verify them via regression smoke checks after homepage behavior changes.

## Chunk 1: Backend task-list API

### Task 1: Add response models for task-center list items

**Files:**
- Modify: `backend/app/schemas/task.py`
- Test: `backend/tests/test_api/test_tasks.py`

- [ ] **Step 1: Write the failing schema/API test for task listing**

```python
@pytest.mark.asyncio
async def test_list_tasks_returns_task_summaries(client):
    from app.database import get_db
    from app.main import app

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.all.return_value = [
        (
            "task-1",
            TaskStatus.PROCESSING,
            "extracting_essence",
            datetime(2026, 3, 31, 10, 0, 0),
            datetime(2026, 3, 31, 10, 1, 0),
            None,
            3,
            "proposal-a.pdf",
            None,
        )
    ]
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        response = await client.get("/api/v1/tasks/")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    assert response.json()[0]["task_id"] == "task-1"
    assert response.json()[0]["document_count"] == 3
    assert response.json()[0]["primary_filename"] == "proposal-a.pdf"
```

- [ ] **Step 2: Run the focused backend test to confirm the endpoint/model does not exist yet**

Run: `pytest backend/tests/test_api/test_tasks.py::test_list_tasks_returns_task_summaries -v`

Expected: FAIL with `404 Not Found`, response validation error, or missing fields such as `document_count`

- [ ] **Step 3: Add list-response schemas**

Implement minimal models in `backend/app/schemas/task.py`:

```python
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
```

- [ ] **Step 4: Run the focused test again**

Run: `pytest backend/tests/test_api/test_tasks.py::test_list_tasks_returns_task_summaries -v`

Expected: FAIL because the `/api/v1/tasks/` route still does not return the new structure

- [ ] **Step 5: Commit the schema slice**

```bash
git add backend/app/schemas/task.py backend/tests/test_api/test_tasks.py
git commit -m "feat: add task list response schema"
```

### Task 2: Implement `GET /api/v1/tasks/` with aggregate fields

**Files:**
- Modify: `backend/app/api/v1/tasks.py`
- Modify: `backend/app/schemas/task.py`
- Test: `backend/tests/test_api/test_tasks.py`

- [ ] **Step 1: Add a second failing test for sort order and report linkage**

```python
@pytest.mark.asyncio
async def test_list_tasks_orders_newest_first_and_includes_report_id(client):
    from app.database import get_db
    from app.main import app

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.all.return_value = [
        (
            "task-new",
            TaskStatus.COMPLETED,
            None,
            datetime(2026, 3, 31, 11, 0, 0),
            datetime(2026, 3, 31, 11, 5, 0),
            None,
            2,
            "new.docx",
            "report-9",
        ),
        (
            "task-old",
            TaskStatus.PENDING,
            None,
            datetime(2026, 3, 31, 9, 0, 0),
            datetime(2026, 3, 31, 9, 0, 0),
            None,
            1,
            "old.pdf",
            None,
        ),
    ]
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        response = await client.get("/api/v1/tasks/")
    finally:
        app.dependency_overrides.pop(get_db, None)

    body = response.json()
    assert [item["task_id"] for item in body] == ["task-new", "task-old"]
    assert body[0]["report_id"] == "report-9"
```

- [ ] **Step 2: Run the two list-endpoint tests**

Run: `pytest backend/tests/test_api/test_tasks.py -k "list_tasks" -v`

Expected: FAIL because the route implementation is still missing or incomplete

- [ ] **Step 3: Implement the list endpoint in `backend/app/api/v1/tasks.py`**

Use a single grouped query if practical; if the query becomes unreadable, use one main task query plus small aggregate lookups, but keep the response fields exact.

Minimal target shape:

```python
@router.get("/", response_model=list[TaskListItem])
async def list_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(task_list_query)
    rows = result.all()
    return [
        TaskListItem(
            task_id=row.id,
            status=row.status,
            current_step=row.current_step,
            error_message=row.error_message,
            created_at=row.created_at,
            updated_at=row.updated_at,
            document_count=row.document_count,
            primary_filename=row.primary_filename,
            report_id=row.report_id,
        )
        for row in rows
    ]
```

Query requirements:

- Order by newest `created_at` first
- Include document count per task
- Include a stable `primary_filename` for list display
- Include `report_id` when a report exists

- [ ] **Step 4: Run the focused list tests**

Run: `pytest backend/tests/test_api/test_tasks.py -k "list_tasks" -v`

Expected: PASS

- [ ] **Step 5: Run the full task API test file**

Run: `pytest backend/tests/test_api/test_tasks.py -v`

Expected: PASS for the existing task creation/status tests and the new list tests

- [ ] **Step 6: Commit the endpoint slice**

```bash
git add backend/app/api/v1/tasks.py backend/app/schemas/task.py backend/tests/test_api/test_tasks.py
git commit -m "feat: add task center list endpoint"
```

## Chunk 2: Worker concurrency configuration

### Task 3: Make worker concurrency explicit and configurable

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/app/workers/celery_app.py`
- Modify: `backend/tests/test_workers/test_celery_config.py`
- Modify: `docker-compose.yml`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing config test**

Add a test in `backend/tests/test_workers/test_celery_config.py` similar to:

```python
def test_celery_worker_concurrency_uses_settings(monkeypatch):
    monkeypatch.setenv("CELERY_WORKER_CONCURRENCY", "4")

    from importlib import reload
    import app.config as config_module
    reload(config_module)

    assert config_module.settings.celery_worker_concurrency == 4
```

- [ ] **Step 2: Run the worker config test**

Run: `pytest backend/tests/test_workers/test_celery_config.py -v`

Expected: FAIL because `celery_worker_concurrency` is not defined yet

- [ ] **Step 3: Add the setting and thread it into runtime config**

Implement the setting in `backend/app/config.py`:

```python
celery_worker_concurrency: int = 2
```

Then choose one runtime path and keep it simple:

- Preferred: set the worker command in `docker-compose.yml` to `celery -A app.workers.celery_app worker --loglevel=info --concurrency=${CELERY_WORKER_CONCURRENCY:-2}`
- Optional: also mirror the value into `celery_app.conf.worker_concurrency` for consistency

Update `.env.example` with:

```env
CELERY_WORKER_CONCURRENCY=2
```

- [ ] **Step 4: Re-run the worker config test**

Run: `pytest backend/tests/test_workers/test_celery_config.py -v`

Expected: PASS

- [ ] **Step 5: Smoke-check compose syntax**

Run: `docker compose config`

Expected: PASS and the worker command shows the new concurrency flag expansion

- [ ] **Step 6: Commit the concurrency slice**

```bash
git add backend/app/config.py backend/app/workers/celery_app.py backend/tests/test_workers/test_celery_config.py docker-compose.yml .env.example
git commit -m "chore: configure celery worker concurrency"
```

## Chunk 3: Frontend task-center homepage

### Task 4: Add frontend API types for the task list

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add the new list item type and API helper**

Add:

```ts
export interface TaskListItem {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  current_step?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  primary_filename?: string | null;
  report_id?: string | null;
}

export const listTasks = async (): Promise<TaskListItem[]> => {
  const res = await api.get<TaskListItem[]>("/tasks/");
  return res.data;
};
```

- [ ] **Step 2: Run frontend lint before page work**

Run: `npm --prefix frontend run lint`

Expected: PASS or only pre-existing warnings unrelated to `api.ts`

- [ ] **Step 3: Commit the API type slice**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add frontend task list api client"
```

### Task 5: Refactor the upload form so task creation refreshes the center instead of redirecting

**Files:**
- Modify: `frontend/src/components/upload/UploadForm.tsx`
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/src/components/tasks/TaskCenter.tsx`

- [ ] **Step 1: Refactor `UploadForm` API surface**

Change the component contract to:

```ts
type UploadFormProps = {
  onTaskCreated?: (task: TaskStatus) => void | Promise<void>;
};
```

Update submit behavior:

- Keep the existing loading/error handling
- Remove `router.push(`/tasks/${task.task_id}`)`
- Call `await onTaskCreated?.(task)` after a successful submit
- Clear selected files after success so users can start another task immediately

- [ ] **Step 2: Build the client task-center controller**

Create `frontend/src/components/tasks/TaskCenter.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { listTasks, TaskListItem, TaskStatus } from "@/lib/api";
import { UploadForm } from "@/components/upload/UploadForm";
import { TaskList } from "@/components/tasks/TaskList";

export function TaskCenter() {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTasks = async () => {
    const next = await listTasks();
    setTasks(next);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const next = await listTasks();
      if (!cancelled) {
        setTasks(next);
        setLoading(false);
        setTimeout(poll, 4000);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <UploadForm onTaskCreated={refreshTasks} />
      <TaskList tasks={tasks} loading={loading} />
    </>
  );
}
```

- [ ] **Step 3: Build the presentational task list**

Create `frontend/src/components/tasks/TaskList.tsx` that:

- Shows empty state when there are no tasks
- Renders task title from `primary_filename` plus `document_count`
- Shows status badge and current step
- Links to `/tasks/${task.task_id}`
- Conditionally links to `/reports/${task.report_id}`

- [ ] **Step 4: Render the task center from the homepage**

Change `frontend/src/app/page.tsx` so the hero remains but the lower section renders `TaskCenter` instead of a standalone `UploadForm`.

- [ ] **Step 5: Run frontend lint**

Run: `npm --prefix frontend run lint`

Expected: PASS

- [ ] **Step 6: Commit the homepage task-center slice**

```bash
git add frontend/src/components/upload/UploadForm.tsx frontend/src/components/tasks/TaskCenter.tsx frontend/src/components/tasks/TaskList.tsx frontend/src/app/page.tsx
git commit -m "feat: add homepage task center"
```

### Task 6: Update navigation copy and status affordances

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/components/tasks/TaskList.tsx`

- [ ] **Step 1: Update nav labels**

Adjust the primary nav so `/` is clearly the task center, for example:

```tsx
<a href="/" ...>任务中心</a>
```

Keep existing history and skills links unchanged unless there is a layout regression.

- [ ] **Step 2: Add clear list-state affordances**

Ensure `TaskList.tsx` covers:

- Loading state
- Empty state
- Failed task message preview
- Completed task CTA to open the report directly when `report_id` exists

- [ ] **Step 3: Run frontend lint again**

Run: `npm --prefix frontend run lint`

Expected: PASS

- [ ] **Step 4: Commit the nav/polish slice**

```bash
git add frontend/src/app/layout.tsx frontend/src/components/tasks/TaskList.tsx
git commit -m "feat: polish task center navigation"
```

## Chunk 4: End-to-end regression and manual validation

### Task 7: Run backend regression for task and report flows

**Files:**
- Test: `backend/tests/test_api/test_tasks.py`
- Test: `backend/tests/test_api/test_reports.py`
- Test: `backend/tests/test_workers/test_celery_config.py`

- [ ] **Step 1: Run the backend regression subset**

Run:

```bash
pytest backend/tests/test_api/test_tasks.py backend/tests/test_api/test_reports.py backend/tests/test_workers/test_celery_config.py -v
```

Expected: PASS

- [ ] **Step 2: Fix any regressions before moving to UI verification**

Do not proceed if task creation, report review, or worker config tests are failing.

- [ ] **Step 3: Commit any regression-only fixes**

```bash
git add backend
git commit -m "fix: resolve task center regression issues"
```

### Task 8: Manually verify concurrent task creation in the browser

**Files:**
- Modify only if bugs are found during validation

- [ ] **Step 1: Start the app stack**

Run:

```bash
docker compose up --build
```

Expected:

- Backend available on `http://localhost:8000`
- Frontend available on `http://localhost:3000`
- Worker starts with the configured concurrency

- [ ] **Step 2: Create Task A from the homepage**

Manual check:

- Upload a batch of files
- Confirm the homepage stays on `/`
- Confirm Task A appears at the top of the task list with `pending` or `processing`

- [ ] **Step 3: Create Task B before Task A completes**

Manual check:

- Upload another batch of files
- Confirm Task B appears without losing Task A from the list
- Confirm both tasks continue to update on the homepage

- [ ] **Step 4: Verify detail and report links**

Manual check:

- Open `/tasks/{id}` from the list and confirm the existing step timeline still works
- Open the report link once a task completes and confirm the report page still renders

- [ ] **Step 5: Capture any defects and fix them before finalizing**

Likely fixes, if needed:

- Polling cleanup bugs
- Upload form state not resetting
- Missing status labels for failed tasks
- Task title formatting edge cases when filename is absent

- [ ] **Step 6: Commit final bug fixes**

```bash
git add backend frontend
git commit -m "fix: finalize concurrent task center workflow"
```

## Final Verification Checklist

- [ ] `GET /api/v1/tasks/` returns newest-first task summaries with `document_count`, `primary_filename`, and `report_id`
- [ ] `POST /api/v1/tasks/` still creates exactly one task for one uploaded batch
- [ ] The homepage stays on `/` after creating a task
- [ ] Users can create a second task while the first is still processing
- [ ] The homepage shows both tasks updating over time
- [ ] Existing single-task detail and report pages still work
- [ ] Worker concurrency is configurable through environment/config rather than hard-coded

## Notes for the Implementer

- Do not introduce a new batch model or split one task into multiple child tasks.
- Do not add frontend testing infrastructure in this change.
- Prefer keeping the task list query understandable over forcing a clever SQLAlchemy abstraction.
- If you add `display_name`, treat it as a follow-up only after the core task-center flow is working.
- Keep commits small and aligned with the chunks above.
