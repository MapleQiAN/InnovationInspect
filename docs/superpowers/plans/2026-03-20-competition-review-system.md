# 参赛资料选题实质查重与创新评估系统 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一套面向竞赛材料的智能评审系统，通过方案实质比对（而非标题查重）和多维创新性评估，辅助专家高效完成项目筛选与评审。

**Architecture:** 采用"Skills 编排层 + 核心分析服务层"分离架构：FastAPI 提供异步 REST API，Celery 负责长耗时分析任务调度，PostgreSQL + Qdrant + MinIO 构成混合存储层，Claude API 驱动结构化抽取与分析，Next.js 前端提供上传/对比/报告视图。

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL 15, Redis 7, Celery 5, MinIO, Qdrant, Claude claude-sonnet-4-6 API (anthropic SDK), PyMuPDF, python-docx, python-pptx, PaddleOCR, sentence-transformers, Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Docker Compose, pytest + pytest-asyncio + httpx

---

## 文件结构总览

```
challenge-cup/
├── backend/
│   ├── app/
│   │   ├── main.py                        # FastAPI 入口
│   │   ├── config.py                      # Pydantic Settings
│   │   ├── database.py                    # 异步 SQLAlchemy 引擎
│   │   ├── models/
│   │   │   ├── task.py                    # AnalysisTask ORM
│   │   │   ├── document.py                # Document ORM
│   │   │   ├── essence.py                 # ProposalEssence ORM (JSONB)
│   │   │   ├── candidate.py               # Candidate ORM
│   │   │   └── report.py                  # Report ORM
│   │   ├── schemas/
│   │   │   ├── task.py                    # Task Pydantic schemas
│   │   │   ├── essence.py                 # Essence schemas
│   │   │   ├── similarity.py              # Similarity result schemas
│   │   │   └── report.py                  # Report schemas
│   │   ├── api/v1/
│   │   │   ├── tasks.py                   # POST /tasks, GET /tasks/{id}
│   │   │   ├── results.py                 # GET /tasks/{id}/results
│   │   │   └── reports.py                 # GET /reports/{id}, POST /reports/{id}/review
│   │   ├── services/
│   │   │   ├── file_service.py            # 文件上传 / MinIO 存储
│   │   │   ├── ocr_service.py             # PaddleOCR 封装
│   │   │   ├── doc_parse_service.py       # PDF/DOCX/PPTX → 文本 + 分块
│   │   │   ├── essence_extractor.py       # Claude API 结构化抽取
│   │   │   ├── retrieval_service.py       # 多源检索 + 向量召回
│   │   │   ├── similarity_service.py      # 五维相似度计算
│   │   │   ├── innovation_service.py      # 创新性评估 + 打分
│   │   │   └── report_service.py          # 报告生成
│   │   ├── skills/
│   │   │   ├── web_search_skill.py        # 网页搜索封装
│   │   │   └── file_fetch_skill.py        # 链接下载封装
│   │   ├── workers/
│   │   │   ├── celery_app.py              # Celery 配置
│   │   │   └── analysis_tasks.py          # 异步任务编排
│   │   └── storage/
│   │       ├── minio_client.py            # MinIO client
│   │       └── vector_store.py            # Qdrant client
│   ├── migrations/                        # Alembic 迁移文件
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_api/
│   │   │   ├── test_tasks.py
│   │   │   └── test_reports.py
│   │   └── test_services/
│   │       ├── test_doc_parse.py
│   │       ├── test_essence_extractor.py
│   │       ├── test_similarity.py
│   │       └── test_innovation.py
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                   # 上传页
│   │   │   ├── tasks/[id]/page.tsx        # 任务进度 + 结果
│   │   │   └── reports/[id]/page.tsx      # 审核报告
│   │   ├── components/
│   │   │   ├── upload/UploadForm.tsx
│   │   │   ├── results/SimilarityPanel.tsx
│   │   │   ├── results/InnovationPanel.tsx
│   │   │   └── report/ReportViewer.tsx
│   │   └── lib/api.ts                     # Axios API 客户端
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Chunk 1: 项目基础设施（Docker + DB + FastAPI 骨架）

### Task 1: Docker Compose 开发环境

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: 编写 docker-compose.yml**

```yaml
# docker-compose.yml
version: "3.9"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-ccreview}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-ccreview}
      POSTGRES_DB: ${POSTGRES_DB:-ccreview}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  backend:
    build: ./backend
    env_file: .env
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
      - minio
      - qdrant
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  worker:
    build: ./backend
    env_file: .env
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
    command: celery -A app.workers.celery_app worker --loglevel=info

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend/src:/app/src
    command: npm run dev

volumes:
  postgres_data:
  minio_data:
  qdrant_data:
```

- [ ] **Step 2: 编写 .env.example**

```bash
# .env.example
DATABASE_URL=postgresql+asyncpg://ccreview:ccreview@postgres:5432/ccreview
REDIS_URL=redis://redis:6379/0
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ccreview
QDRANT_URL=http://qdrant:6333
ANTHROPIC_API_KEY=your-key-here
COLLECTION_NAME=proposals
```

- [ ] **Step 3: 验证 docker compose 可以启动**

```bash
cp .env.example .env
docker compose up -d postgres redis minio qdrant
docker compose ps
```
Expected: 4 services 状态为 running

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: add docker compose dev environment"
```

---

### Task 2: Python 后端项目骨架

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/main.py`
- Create: `backend/Dockerfile`

- [ ] **Step 1: 编写 pyproject.toml**

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "ccreview-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.115",
  "uvicorn[standard]>=0.30",
  "sqlalchemy[asyncio]>=2.0",
  "alembic>=1.13",
  "asyncpg>=0.29",
  "pydantic-settings>=2.3",
  "anthropic>=0.34",
  "celery[redis]>=5.4",
  "minio>=7.2",
  "qdrant-client>=1.11",
  "pymupdf>=1.24",
  "python-docx>=1.1",
  "python-pptx>=0.6",
  "paddleocr>=2.7",
  "sentence-transformers>=3.1",
  "httpx>=0.27",
  "python-multipart>=0.0.9",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.3",
  "pytest-asyncio>=0.23",
  "pytest-cov>=5.0",
  "httpx>=0.27",
]
```

- [ ] **Step 2: 编写 config.py**

```python
# backend/app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://ccreview:ccreview@localhost:5432/ccreview"
    redis_url: str = "redis://localhost:6379/0"
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "ccreview"
    qdrant_url: str = "http://localhost:6333"
    anthropic_api_key: str = ""
    collection_name: str = "proposals"


settings = Settings()
```

- [ ] **Step 3: 编写 database.py**

```python
# backend/app/database.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 4: 编写 main.py**

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import tasks, results, reports

app = FastAPI(title="竞赛材料查重与创新评估系统", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
app.include_router(results.router, prefix="/api/v1/tasks", tags=["results"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 5: 编写 Dockerfile**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install hatch
COPY pyproject.toml .
RUN pip install -e ".[dev]"
COPY . .
```

- [ ] **Step 6: 编写空 `__init__.py` 文件**

```bash
touch backend/app/__init__.py
touch backend/app/api/__init__.py
touch backend/app/api/v1/__init__.py
touch backend/app/models/__init__.py
touch backend/app/schemas/__init__.py
touch backend/app/services/__init__.py
touch backend/app/skills/__init__.py
touch backend/app/workers/__init__.py
touch backend/app/storage/__init__.py
touch backend/tests/__init__.py
```

- [ ] **Step 7: 写 /health 端点测试**

```python
# backend/tests/test_api/test_health.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 8: 编写 conftest.py**

```python
# backend/tests/conftest.py
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
```

- [ ] **Step 9: 运行测试验证通过**

```bash
cd backend
pytest tests/test_api/test_health.py -v
```
Expected: PASSED

- [ ] **Step 10: Commit**

```bash
git add backend/
git commit -m "feat: add FastAPI backend skeleton with config and health endpoint"
```

---

### Task 3: 数据库模型与迁移

**Files:**
- Create: `backend/app/models/task.py`
- Create: `backend/app/models/document.py`
- Create: `backend/app/models/essence.py`
- Create: `backend/app/models/candidate.py`
- Create: `backend/app/models/report.py`
- Create: `backend/migrations/env.py`

- [ ] **Step 1: 编写 task.py 模型**

```python
# backend/app/models/task.py
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisTask(Base):
    __tablename__ = "analysis_tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status: Mapped[TaskStatus] = mapped_column(SAEnum(TaskStatus), default=TaskStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    current_step: Mapped[str | None] = mapped_column(String, nullable=True)
```

- [ ] **Step 2: 编写 document.py 模型**

```python
# backend/app/models/document.py
import uuid
from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(String, ForeignKey("analysis_tasks.id"))
    filename: Mapped[str] = mapped_column(String)
    file_type: Mapped[str] = mapped_column(String)          # pdf/docx/pptx/image
    storage_key: Mapped[str] = mapped_column(String)        # MinIO key
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- [ ] **Step 3: 编写 essence.py 模型（JSONB 存储方案实质对象）**

```python
# backend/app/models/essence.py
import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ProposalEssence(Base):
    __tablename__ = "proposal_essences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(String, ForeignKey("analysis_tasks.id"), unique=True)
    # 方案实质四层对象
    problem: Mapped[dict] = mapped_column(JSONB, default=dict)       # 问题层
    method: Mapped[dict] = mapped_column(JSONB, default=dict)        # 方法层
    architecture: Mapped[dict] = mapped_column(JSONB, default=dict)  # 架构层
    innovation: Mapped[dict] = mapped_column(JSONB, default=dict)    # 创新层
    evidence: Mapped[dict] = mapped_column(JSONB, default=dict)      # 证据层
```

- [ ] **Step 4: 编写 candidate.py 模型**

```python
# backend/app/models/candidate.py
import uuid
from sqlalchemy import String, ForeignKey, Float, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(String, ForeignKey("analysis_tasks.id"))
    source: Mapped[str] = mapped_column(String)            # internet / internal / patent
    title: Mapped[str] = mapped_column(String)
    url: Mapped[str | None] = mapped_column(String, nullable=True)
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    similarity_scores: Mapped[dict] = mapped_column(JSONB, default=dict)  # 五维分值
    overall_similarity: Mapped[float] = mapped_column(Float, default=0.0)
```

- [ ] **Step 5: 编写 report.py 模型**

```python
# backend/app/models/report.py
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(String, ForeignKey("analysis_tasks.id"), unique=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    similarity_result: Mapped[dict] = mapped_column(JSONB, default=dict)
    innovation_result: Mapped[dict] = mapped_column(JSONB, default=dict)
    conclusion: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewer_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 6: 初始化 Alembic**

```bash
cd backend
alembic init migrations
```

更新 `migrations/env.py`，导入所有模型并使用异步引擎：
```python
# 在 env.py 中添加
from app.database import Base
from app.models import task, document, essence, candidate, report  # noqa
target_metadata = Base.metadata
```

- [ ] **Step 7: 生成并执行初始迁移**

```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```
Expected: 5 张表创建成功

- [ ] **Step 8: 编写模型测试**

```python
# backend/tests/test_services/test_models.py
import pytest
from app.models.task import TaskStatus

def test_task_status_values():
    assert TaskStatus.PENDING == "pending"
    assert TaskStatus.PROCESSING == "processing"
    assert TaskStatus.COMPLETED == "completed"
    assert TaskStatus.FAILED == "failed"
```

- [ ] **Step 9: Commit**

```bash
git add backend/app/models/ backend/migrations/ backend/tests/
git commit -m "feat: add database models and alembic migrations"
```

---

## Chunk 2: 文件接入与文档解析管道

### Task 4: MinIO 对象存储客户端

**Files:**
- Create: `backend/app/storage/minio_client.py`
- Test: `backend/tests/test_services/test_file_service.py`

- [ ] **Step 1: 编写测试（先写测试）**

```python
# backend/tests/test_services/test_file_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.file_service import FileService


@pytest.mark.asyncio
async def test_upload_returns_storage_key():
    with patch("app.services.file_service.minio_client") as mock_minio:
        mock_minio.put_object = MagicMock()
        service = FileService()
        key = await service.upload_file(b"content", "test.pdf", "application/pdf")
    assert key.endswith(".pdf")
    assert "/" in key  # 包含任务路径前缀
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_services/test_file_service.py -v
```
Expected: FAIL - ImportError

- [ ] **Step 3: 实现 minio_client.py**

```python
# backend/app/storage/minio_client.py
from minio import Minio
from app.config import settings

minio_client = Minio(
    settings.minio_endpoint,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=False,
)


def ensure_bucket():
    if not minio_client.bucket_exists(settings.minio_bucket):
        minio_client.make_bucket(settings.minio_bucket)
```

- [ ] **Step 4: 实现 file_service.py**

```python
# backend/app/services/file_service.py
import uuid
import io
from app.storage.minio_client import minio_client
from app.config import settings


class FileService:
    async def upload_file(self, content: bytes, filename: str, content_type: str) -> str:
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
        key = f"uploads/{uuid.uuid4()}.{ext}"
        minio_client.put_object(
            settings.minio_bucket,
            key,
            io.BytesIO(content),
            length=len(content),
            content_type=content_type,
        )
        return key

    async def download_file(self, key: str) -> bytes:
        response = minio_client.get_object(settings.minio_bucket, key)
        return response.read()
```

- [ ] **Step 5: 运行测试**

```bash
pytest tests/test_services/test_file_service.py -v
```
Expected: PASSED

- [ ] **Step 6: Commit**

```bash
git add backend/app/storage/ backend/app/services/file_service.py backend/tests/
git commit -m "feat: add MinIO file service"
```

---

### Task 5: 文档解析服务（PDF / DOCX / PPTX / 图片）

**Files:**
- Create: `backend/app/services/doc_parse_service.py`
- Create: `backend/app/services/ocr_service.py`
- Test: `backend/tests/test_services/test_doc_parse.py`

- [ ] **Step 1: 编写解析测试**

```python
# backend/tests/test_services/test_doc_parse.py
import pytest
from app.services.doc_parse_service import DocParseService


def test_parse_plain_text_bytes():
    service = DocParseService()
    # 模拟纯文本 fallback
    result = service._split_into_chunks("这是一段测试文本。" * 100, chunk_size=200)
    assert len(result) > 1
    assert all(isinstance(c, str) for c in result)


def test_chunk_overlap():
    service = DocParseService()
    text = "A" * 500
    chunks = service._split_into_chunks(text, chunk_size=200, overlap=50)
    # 每个 chunk 不超过 chunk_size
    assert all(len(c) <= 200 for c in chunks)
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_services/test_doc_parse.py -v
```
Expected: FAIL

- [ ] **Step 3: 实现 ocr_service.py**

```python
# backend/app/services/ocr_service.py
from paddleocr import PaddleOCR

_ocr = None


def get_ocr():
    global _ocr
    if _ocr is None:
        _ocr = PaddleOCR(use_angle_cls=True, lang="ch", show_log=False)
    return _ocr


class OcrService:
    def extract_text_from_image_bytes(self, image_bytes: bytes) -> str:
        import numpy as np
        import cv2
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        ocr = get_ocr()
        result = ocr.ocr(img, cls=True)
        lines = []
        for page in result:
            if page:
                for line in page:
                    lines.append(line[1][0])
        return "\n".join(lines)
```

- [ ] **Step 4: 实现 doc_parse_service.py**

```python
# backend/app/services/doc_parse_service.py
import io
import fitz  # PyMuPDF
from docx import Document as DocxDocument
from pptx import Presentation
from app.services.ocr_service import OcrService


class DocParseService:
    def __init__(self):
        self.ocr = OcrService()

    def parse(self, content: bytes, file_type: str) -> str:
        """返回从文档中抽取的纯文本"""
        if file_type == "pdf":
            return self._parse_pdf(content)
        elif file_type == "docx":
            return self._parse_docx(content)
        elif file_type == "pptx":
            return self._parse_pptx(content)
        elif file_type in ("jpg", "jpeg", "png", "bmp"):
            return self.ocr.extract_text_from_image_bytes(content)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    def _parse_pdf(self, content: bytes) -> str:
        doc = fitz.open(stream=content, filetype="pdf")
        pages = []
        for page in doc:
            text = page.get_text()
            if len(text.strip()) < 50:  # 图片 PDF 走 OCR
                pix = page.get_pixmap()
                text = self.ocr.extract_text_from_image_bytes(pix.tobytes("png"))
            pages.append(text)
        return "\n".join(pages)

    def _parse_docx(self, content: bytes) -> str:
        doc = DocxDocument(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

    def _parse_pptx(self, content: bytes) -> str:
        prs = Presentation(io.BytesIO(content))
        texts = []
        for slide in prs.slides:
            for shape in slide.shapes:
                if shape.has_text_frame:
                    for para in shape.text_frame.paragraphs:
                        texts.append(para.text)
        return "\n".join(t for t in texts if t.strip())

    def _split_into_chunks(self, text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
        chunks = []
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunks.append(text[start:end])
            start = end - overlap if end < len(text) else end
        return chunks
```

- [ ] **Step 5: 运行测试**

```bash
pytest tests/test_services/test_doc_parse.py -v
```
Expected: PASSED

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/doc_parse_service.py backend/app/services/ocr_service.py
git commit -m "feat: add document parsing service (PDF/DOCX/PPTX/OCR)"
```

---

### Task 6: 任务提交 API

**Files:**
- Create: `backend/app/schemas/task.py`
- Create: `backend/app/api/v1/tasks.py`
- Test: `backend/tests/test_api/test_tasks.py`

- [ ] **Step 1: 编写 API 测试**

```python
# backend/tests/test_api/test_tasks.py
import pytest
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_create_task_returns_task_id(client):
    with patch("app.api.v1.tasks.analysis_tasks.apply_async") as mock_task:
        mock_task.return_value.id = "celery-task-id"
        import io
        data = {"files": ("test.pdf", io.BytesIO(b"%PDF-1.4 test content"), "application/pdf")}
        response = await client.post("/api/v1/tasks/", files=data)
    assert response.status_code == 201
    body = response.json()
    assert "task_id" in body
    assert body["status"] == "pending"


@pytest.mark.asyncio
async def test_get_task_status(client):
    response = await client.get("/api/v1/tasks/nonexistent-id")
    assert response.status_code == 404
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_api/test_tasks.py -v
```
Expected: FAIL

- [ ] **Step 3: 编写 schemas/task.py**

```python
# backend/app/schemas/task.py
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
```

- [ ] **Step 4: 编写 api/v1/tasks.py**

```python
# backend/app/api/v1/tasks.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.task import AnalysisTask, TaskStatus
from app.models.document import Document
from app.schemas.task import TaskCreateResponse, TaskStatusResponse
from app.services.file_service import FileService
from app.workers.analysis_tasks import run_analysis

router = APIRouter()
file_service = FileService()


@router.post("/", response_model=TaskCreateResponse, status_code=201)
async def create_task(
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    task = AnalysisTask()
    db.add(task)
    await db.flush()

    for upload in files:
        content = await upload.read()
        ext = upload.filename.rsplit(".", 1)[-1].lower() if "." in upload.filename else "bin"
        key = await file_service.upload_file(content, upload.filename, upload.content_type)
        doc = Document(task_id=task.id, filename=upload.filename, file_type=ext, storage_key=key)
        db.add(doc)

    await db.commit()
    run_analysis.apply_async(args=[task.id])
    return TaskCreateResponse(task_id=task.id, status=task.status)


@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AnalysisTask).where(AnalysisTask.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskStatusResponse(
        task_id=task.id,
        status=task.status,
        current_step=task.current_step,
        error_message=task.error_message,
    )
```

- [ ] **Step 5: 运行测试**

```bash
pytest tests/test_api/test_tasks.py -v
```
Expected: PASSED

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/task.py backend/app/api/v1/tasks.py backend/tests/test_api/
git commit -m "feat: add task submission and status query API"
```

---

## Chunk 3: 智能分析核心服务

### Task 7: Celery 任务队列配置

**Files:**
- Create: `backend/app/workers/celery_app.py`
- Create: `backend/app/workers/analysis_tasks.py`

- [ ] **Step 1: 实现 celery_app.py**

```python
# backend/app/workers/celery_app.py
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
)
```

- [ ] **Step 2: 实现 analysis_tasks.py（编排流水线）**

```python
# backend/app/workers/analysis_tasks.py
import asyncio
from app.workers.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.task import AnalysisTask, TaskStatus
from sqlalchemy import select


def run_async(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(name="run_analysis", bind=True, max_retries=2)
def run_analysis(self, task_id: str):
    from app.services.file_service import FileService
    from app.services.doc_parse_service import DocParseService
    from app.services.essence_extractor import EssenceExtractor
    from app.services.retrieval_service import RetrievalService
    from app.services.similarity_service import SimilarityService
    from app.services.innovation_service import InnovationService
    from app.services.report_service import ReportService

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(AnalysisTask).where(AnalysisTask.id == task_id))
            task = result.scalar_one_or_none()
            if not task:
                return

            try:
                task.status = TaskStatus.PROCESSING

                # Step 1: 解析文档
                task.current_step = "parsing"
                await db.commit()
                text = await DocParseService().parse_task_documents(db, task_id)

                # Step 2: 提取方案实质
                task.current_step = "extracting_essence"
                await db.commit()
                essence = await EssenceExtractor().extract(db, task_id, text)

                # Step 3: 多源检索
                task.current_step = "retrieving_candidates"
                await db.commit()
                candidates = await RetrievalService().retrieve(db, task_id, essence)

                # Step 4: 相似度分析
                task.current_step = "analyzing_similarity"
                await db.commit()
                sim_result = await SimilarityService().analyze(essence, candidates)

                # Step 5: 创新性评估
                task.current_step = "evaluating_innovation"
                await db.commit()
                innov_result = await InnovationService().evaluate(db, task_id, essence, candidates)

                # Step 6: 生成报告
                task.current_step = "generating_report"
                await db.commit()
                await ReportService().generate(db, task_id, essence, sim_result, innov_result)

                task.status = TaskStatus.COMPLETED
                task.current_step = None
                await db.commit()

            except Exception as e:
                task.status = TaskStatus.FAILED
                task.error_message = str(e)
                await db.commit()
                raise self.retry(exc=e, countdown=30)

    run_async(_run())
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/workers/
git commit -m "feat: add Celery task queue and analysis pipeline orchestration"
```

---

### Task 8: 方案实质提取服务（Claude API）

**Files:**
- Create: `backend/app/services/essence_extractor.py`
- Test: `backend/tests/test_services/test_essence_extractor.py`

- [ ] **Step 1: 编写测试**

```python
# backend/tests/test_services/test_essence_extractor.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.essence_extractor import EssenceExtractor


SAMPLE_TEXT = """
本项目旨在解决农业病虫害识别效率低的问题。
核心技术：YOLOv8目标检测模型 + ResNet特征提取。
系统架构：移动端采集 -> 云端推理 -> 专家复核。
创新点：首次将轻量化模型部署到低配 Android 设备。
"""


@pytest.mark.asyncio
async def test_extract_returns_essence_object():
    extractor = EssenceExtractor()
    with patch.object(extractor, "_call_llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = {
            "problem": {"summary": "农业病虫害识别", "target": "农民"},
            "method": {"core_algorithms": ["YOLOv8", "ResNet"], "pipeline": []},
            "architecture": {"modules": ["移动端", "云端", "专家系统"]},
            "innovation": {"claims": ["轻量化模型部署"], "types": ["engineering"]},
            "evidence": {"references": []},
        }
        result = await extractor.extract_from_text(SAMPLE_TEXT)
    assert "problem" in result
    assert "method" in result
    assert result["problem"]["summary"] == "农业病虫害识别"
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_services/test_essence_extractor.py -v
```
Expected: FAIL

- [ ] **Step 3: 实现 essence_extractor.py**

```python
# backend/app/services/essence_extractor.py
import json
import anthropic
from app.config import settings
from app.models.essence import ProposalEssence
from sqlalchemy.ext.asyncio import AsyncSession

EXTRACTION_PROMPT = """
请从以下竞赛参赛材料中提取方案实质信息，以 JSON 格式返回，结构严格如下：
{
  "problem": {
    "summary": "核心问题一句话描述",
    "category": "问题类别",
    "target": "目标对象",
    "constraints": ["约束条件列表"]
  },
  "method": {
    "core_algorithms": ["核心算法/技术列表"],
    "pipeline": ["处理流程步骤"],
    "models": ["使用的模型"]
  },
  "architecture": {
    "modules": ["系统模块列表"],
    "interfaces": ["关键接口"],
    "deployment": "部署方式描述"
  },
  "innovation": {
    "claims": ["申报创新点列表"],
    "types": ["innovation_type: problem_definition/method/architecture/engineering/combination"]
  },
  "evidence": {
    "references": ["参考文献或数据来源"]
  }
}

材料内容（仅分析实质内容，忽略宣传性表达）：
"""


class EssenceExtractor:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def _call_llm(self, text: str) -> dict:
        message = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            messages=[{"role": "user", "content": EXTRACTION_PROMPT + text[:8000]}],
        )
        content = message.content[0].text
        # 提取 JSON 块
        start = content.find("{")
        end = content.rfind("}") + 1
        return json.loads(content[start:end])

    async def extract_from_text(self, text: str) -> dict:
        return await self._call_llm(text)

    async def extract(self, db: AsyncSession, task_id: str, text: str) -> dict:
        essence_data = await self.extract_from_text(text)
        essence = ProposalEssence(
            task_id=task_id,
            problem=essence_data.get("problem", {}),
            method=essence_data.get("method", {}),
            architecture=essence_data.get("architecture", {}),
            innovation=essence_data.get("innovation", {}),
            evidence=essence_data.get("evidence", {}),
        )
        db.add(essence)
        await db.commit()
        return essence_data
```

- [ ] **Step 4: 运行测试**

```bash
pytest tests/test_services/test_essence_extractor.py -v
```
Expected: PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/essence_extractor.py backend/tests/
git commit -m "feat: add proposal essence extractor using Claude API"
```

---

### Task 9: 向量存储与多源检索服务

**Files:**
- Create: `backend/app/storage/vector_store.py`
- Create: `backend/app/services/retrieval_service.py`
- Test: `backend/tests/test_services/test_retrieval.py`

- [ ] **Step 1: 编写检索测试**

```python
# backend/tests/test_services/test_retrieval.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.retrieval_service import RetrievalService


SAMPLE_ESSENCE = {
    "problem": {"summary": "农业病虫害图像识别"},
    "method": {"core_algorithms": ["YOLOv8", "CNN"]},
    "architecture": {"modules": ["移动端", "云端"]},
    "innovation": {"claims": ["轻量化部署"]},
}


@pytest.mark.asyncio
async def test_generate_queries_returns_list():
    service = RetrievalService()
    with patch.object(service, "_call_llm_for_queries", new_callable=AsyncMock) as mock:
        mock.return_value = ["YOLOv8 农业病虫害检测", "轻量化目标检测模型部署"]
        queries = await service.generate_queries(SAMPLE_ESSENCE)
    assert len(queries) >= 1
    assert all(isinstance(q, str) for q in queries)
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_services/test_retrieval.py -v
```

- [ ] **Step 3: 实现 vector_store.py**

```python
# backend/app/storage/vector_store.py
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
from app.config import settings
import uuid

VECTOR_DIM = 384
_model = None


def get_embedding_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    return _model


class VectorStore:
    def __init__(self):
        self.client = QdrantClient(url=settings.qdrant_url)
        self._ensure_collection()

    def _ensure_collection(self):
        collections = [c.name for c in self.client.get_collections().collections]
        if settings.collection_name not in collections:
            self.client.create_collection(
                collection_name=settings.collection_name,
                vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
            )

    def embed(self, text: str) -> list[float]:
        model = get_embedding_model()
        return model.encode(text).tolist()

    def upsert(self, text: str, metadata: dict) -> str:
        point_id = str(uuid.uuid4())
        vector = self.embed(text)
        self.client.upsert(
            collection_name=settings.collection_name,
            points=[PointStruct(id=point_id, vector=vector, payload=metadata)],
        )
        return point_id

    def search(self, query: str, limit: int = 10) -> list[dict]:
        vector = self.embed(query)
        results = self.client.search(
            collection_name=settings.collection_name,
            query_vector=vector,
            limit=limit,
        )
        return [{"score": r.score, **r.payload} for r in results]
```

- [ ] **Step 4: 实现 retrieval_service.py**

```python
# backend/app/services/retrieval_service.py
import json
import anthropic
from app.config import settings
from app.storage.vector_store import VectorStore
from app.models.candidate import Candidate
from app.skills.web_search_skill import WebSearchSkill
from sqlalchemy.ext.asyncio import AsyncSession

QUERY_GEN_PROMPT = """
根据以下方案实质信息，生成5个用于互联网搜索和知识库检索的查询语句。
目标：找到与该方案高度相似的已有方案/论文/项目。
要求：针对问题定义、核心技术、架构模式分别生成查询；避免使用项目名称；用中文。
返回 JSON 数组：["query1", "query2", ...]

方案实质：
"""


class RetrievalService:
    def __init__(self):
        self.llm = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.vector_store = VectorStore()
        self.web_search = WebSearchSkill()

    async def _call_llm_for_queries(self, essence: dict) -> list[str]:
        msg = self.llm.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[{"role": "user", "content": QUERY_GEN_PROMPT + json.dumps(essence, ensure_ascii=False)}],
        )
        content = msg.content[0].text
        start, end = content.find("["), content.rfind("]") + 1
        return json.loads(content[start:end])

    async def generate_queries(self, essence: dict) -> list[str]:
        return await self._call_llm_for_queries(essence)

    async def retrieve(self, db: AsyncSession, task_id: str, essence: dict) -> list[dict]:
        queries = await self.generate_queries(essence)
        candidates = []

        for query in queries:
            # 向量库检索（内部历史作品）
            vector_results = self.vector_store.search(query, limit=5)
            for vr in vector_results:
                candidates.append({
                    "source": "internal",
                    "title": vr.get("title", query),
                    "url": vr.get("url"),
                    "snippet": vr.get("snippet", ""),
                    "score": vr["score"],
                })

            # 互联网检索
            web_results = await self.web_search.search(query, limit=3)
            for wr in web_results:
                candidates.append({
                    "source": "internet",
                    "title": wr.get("title", ""),
                    "url": wr.get("url"),
                    "snippet": wr.get("snippet", ""),
                    "score": 0.0,
                })

        # 去重并保存
        seen_urls = set()
        unique = []
        for c in candidates:
            key = c.get("url") or c["title"]
            if key not in seen_urls:
                seen_urls.add(key)
                unique.append(c)
                db.add(Candidate(
                    task_id=task_id,
                    source=c["source"],
                    title=c["title"],
                    url=c.get("url"),
                    snippet=c.get("snippet"),
                ))

        await db.commit()
        return unique
```

- [ ] **Step 5: 实现 web_search_skill.py**

```python
# backend/app/skills/web_search_skill.py
import httpx


class WebSearchSkill:
    """
    封装网页搜索能力。生产环境接入 Bing/Google Search API 或 SerpAPI。
    开发阶段返回 mock 数据。
    """

    async def search(self, query: str, limit: int = 5) -> list[dict]:
        # TODO: 替换为真实搜索 API（SerpAPI / Bing Search API）
        return []
```

- [ ] **Step 6: 运行测试**

```bash
pytest tests/test_services/test_retrieval.py -v
```
Expected: PASSED

- [ ] **Step 7: Commit**

```bash
git add backend/app/storage/vector_store.py backend/app/services/retrieval_service.py backend/app/skills/
git commit -m "feat: add vector store and multi-source retrieval service"
```

---

### Task 10: 五维相似度分析服务

**Files:**
- Create: `backend/app/services/similarity_service.py`
- Test: `backend/tests/test_services/test_similarity.py`

- [ ] **Step 1: 编写相似度测试**

```python
# backend/tests/test_services/test_similarity.py
import pytest
from unittest.mock import AsyncMock, patch
from app.services.similarity_service import SimilarityService

ESSENCE = {
    "problem": {"summary": "农业病虫害图像识别"},
    "method": {"core_algorithms": ["YOLOv8"]},
    "architecture": {"modules": ["移动端", "云端"]},
    "innovation": {"claims": ["低功耗部署"]},
    "evidence": {},
}

CANDIDATES = [
    {"title": "基于YOLO的作物病害检测系统", "snippet": "使用YOLOv5检测农业病害，部署于移动设备", "source": "internet"},
]


@pytest.mark.asyncio
async def test_analyze_returns_five_dimensions():
    service = SimilarityService()
    with patch.object(service, "_score_with_llm", new_callable=AsyncMock) as mock:
        mock.return_value = {
            "problem_similarity": 0.85,
            "method_similarity": 0.75,
            "architecture_similarity": 0.70,
            "flow_similarity": 0.60,
            "evidence_alignment": 0.80,
            "explanation": "两者均解决农业病虫害识别问题，技术路线高度相近",
        }
        result = await service.analyze(ESSENCE, CANDIDATES)
    assert "candidates" in result
    assert len(result["candidates"]) == 1
    scores = result["candidates"][0]["scores"]
    assert "problem_similarity" in scores
    assert all(0 <= v <= 1 for v in scores.values() if isinstance(v, float))
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_services/test_similarity.py -v
```

- [ ] **Step 3: 实现 similarity_service.py**

```python
# backend/app/services/similarity_service.py
import json
import anthropic
from app.config import settings

SIMILARITY_PROMPT = """
请对以下"待评估方案"和"候选方案"进行五维相似度分析，返回 JSON：
{
  "problem_similarity": 0.0-1.0,     // 问题相似度：是否解决同类问题
  "method_similarity": 0.0-1.0,      // 方法相似度：技术路线是否接近
  "architecture_similarity": 0.0-1.0,// 架构相似度：系统结构是否同构
  "flow_similarity": 0.0-1.0,        // 流程相似度：处理步骤是否接近
  "evidence_alignment": 0.0-1.0,     // 证据对齐：片段映射强度
  "explanation": "解释说明"
}

注意：
- 1.0 = 完全相同，0.0 = 完全无关
- 忽略标题差异和宣传性表达，聚焦实质内容
- explanation 需指出具体相似点

待评估方案实质：
{essence}

候选方案摘要：
{candidate}
"""


class SimilarityService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def _score_with_llm(self, essence: dict, candidate: dict) -> dict:
        prompt = SIMILARITY_PROMPT.format(
            essence=json.dumps(essence, ensure_ascii=False),
            candidate=json.dumps(candidate, ensure_ascii=False),
        )
        msg = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        content = msg.content[0].text
        start, end = content.find("{"), content.rfind("}") + 1
        return json.loads(content[start:end])

    async def analyze(self, essence: dict, candidates: list[dict]) -> dict:
        results = []
        for candidate in candidates:
            scores = await self._score_with_llm(essence, candidate)
            overall = sum([
                scores.get("problem_similarity", 0),
                scores.get("method_similarity", 0),
                scores.get("architecture_similarity", 0),
                scores.get("flow_similarity", 0),
                scores.get("evidence_alignment", 0),
            ]) / 5
            results.append({
                "candidate": candidate,
                "scores": scores,
                "overall_similarity": round(overall, 3),
            })
        # 按总相似度降序排列
        results.sort(key=lambda x: x["overall_similarity"], reverse=True)
        return {"candidates": results}
```

- [ ] **Step 4: 运行测试**

```bash
pytest tests/test_services/test_similarity.py -v
```
Expected: PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/similarity_service.py backend/tests/
git commit -m "feat: add five-dimensional similarity analysis service"
```

---

### Task 11: 创新性评估服务

**Files:**
- Create: `backend/app/services/innovation_service.py`
- Test: `backend/tests/test_services/test_innovation.py`

- [ ] **Step 1: 编写创新性测试**

```python
# backend/tests/test_services/test_innovation.py
import pytest
from unittest.mock import AsyncMock, patch
from app.services.innovation_service import InnovationService


ESSENCE = {
    "problem": {"summary": "农业病虫害识别"},
    "method": {"core_algorithms": ["YOLOv8"]},
    "innovation": {"claims": ["首次在 Android 设备实现实时推理"], "types": ["engineering"]},
}

CANDIDATES = [
    {"title": "基于YOLO的病害检测", "scores": {"method_similarity": 0.8}},
]


@pytest.mark.asyncio
async def test_evaluate_returns_six_dimensions():
    service = InnovationService()
    with patch.object(service, "_evaluate_with_llm", new_callable=AsyncMock) as mock:
        mock.return_value = {
            "problem_definition_innovation": 0.3,
            "method_innovation": 0.4,
            "architecture_innovation": 0.5,
            "scenario_migration_innovation": 0.6,
            "engineering_optimization_innovation": 0.8,
            "combination_innovation": 0.3,
            "overall_innovation_score": 0.65,
            "risk_flags": [],
            "explanation": "工程优化创新度较高，核心方法与已有工作重合度较高",
        }
        result = await service.evaluate(None, "task-1", ESSENCE, CANDIDATES)
    assert "overall_innovation_score" in result
    assert 0 <= result["overall_innovation_score"] <= 1
    assert "explanation" in result
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_services/test_innovation.py -v
```

- [ ] **Step 3: 实现 innovation_service.py**

```python
# backend/app/services/innovation_service.py
import json
import anthropic
from app.config import settings
from sqlalchemy.ext.asyncio import AsyncSession

INNOVATION_PROMPT = """
请对以下参赛材料申报的创新点进行六维评估，返回 JSON：
{
  "problem_definition_innovation": 0.0-1.0,    // 问题定义创新
  "method_innovation": 0.0-1.0,                // 方法创新
  "architecture_innovation": 0.0-1.0,          // 架构创新
  "scenario_migration_innovation": 0.0-1.0,    // 场景迁移创新
  "engineering_optimization_innovation": 0.0-1.0, // 工程优化创新
  "combination_innovation": 0.0-1.0,           // 组合创新
  "overall_innovation_score": 0.0-1.0,         // 综合创新得分（含重叠惩罚）
  "risk_flags": ["风险提示列表"],
  "explanation": "详细说明"
}

评估规则：
- 若创新点与候选方案高度重叠，对应维度得分应低于 0.3
- 若存在明确新增机制或显著性能突破，得分可达 0.7 以上
- overall_innovation_score = 六维加权均值 - 重叠惩罚项
- risk_flags 列举可能被质疑为套壳的具体点

方案实质：
{essence}

最相似候选方案（Top-3）：
{top_candidates}
"""


class InnovationService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def _evaluate_with_llm(self, essence: dict, top_candidates: list[dict]) -> dict:
        prompt = INNOVATION_PROMPT.format(
            essence=json.dumps(essence, ensure_ascii=False),
            top_candidates=json.dumps(top_candidates[:3], ensure_ascii=False),
        )
        msg = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        content = msg.content[0].text
        start, end = content.find("{"), content.rfind("}") + 1
        return json.loads(content[start:end])

    async def evaluate(
        self, db: AsyncSession, task_id: str, essence: dict, candidates: list[dict]
    ) -> dict:
        return await self._evaluate_with_llm(essence, candidates)
```

- [ ] **Step 4: 运行测试**

```bash
pytest tests/test_services/test_innovation.py -v
```
Expected: PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/innovation_service.py backend/tests/
git commit -m "feat: add six-dimensional innovation assessment service"
```

---

### Task 12: 报告生成服务与结果查询 API

**Files:**
- Create: `backend/app/services/report_service.py`
- Create: `backend/app/api/v1/results.py`
- Create: `backend/app/api/v1/reports.py`
- Test: `backend/tests/test_api/test_reports.py`

- [ ] **Step 1: 编写报告 API 测试**

```python
# backend/tests/test_api/test_reports.py
import pytest


@pytest.mark.asyncio
async def test_get_nonexistent_report_returns_404(client):
    response = await client.get("/api/v1/reports/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_post_review_comment(client):
    response = await client.post(
        "/api/v1/reports/nonexistent-id/review",
        json={"comment": "专家复核意见：确认创新点有效"},
    )
    assert response.status_code == 404  # 报告不存在
```

- [ ] **Step 2: 实现 report_service.py**

```python
# backend/app/services/report_service.py
import json
import anthropic
from app.config import settings
from app.models.report import Report
from sqlalchemy.ext.asyncio import AsyncSession

REPORT_PROMPT = """
请根据以下分析结果，生成一份专业审核报告摘要（中文，500字以内），包含：
1. 项目核心技术摘要
2. 主要相似风险（若有）
3. 创新性评估结论
4. 建议处置意见

方案实质：{essence}
相似度分析：{similarity}
创新性评估：{innovation}
"""


class ReportService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def generate(
        self,
        db: AsyncSession,
        task_id: str,
        essence: dict,
        sim_result: dict,
        innov_result: dict,
    ) -> Report:
        prompt = REPORT_PROMPT.format(
            essence=json.dumps(essence, ensure_ascii=False),
            similarity=json.dumps(sim_result, ensure_ascii=False)[:2000],
            innovation=json.dumps(innov_result, ensure_ascii=False),
        )
        msg = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        summary = msg.content[0].text
        conclusion = innov_result.get("explanation", "")

        report = Report(
            task_id=task_id,
            summary=summary,
            similarity_result=sim_result,
            innovation_result=innov_result,
            conclusion=conclusion,
        )
        db.add(report)
        await db.commit()
        return report
```

- [ ] **Step 3: 实现 api/v1/reports.py**

```python
# backend/app/api/v1/reports.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database import get_db
from app.models.report import Report

router = APIRouter()


class ReviewComment(BaseModel):
    comment: str


@router.get("/{report_id}")
async def get_report(report_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "id": report.id,
        "task_id": report.task_id,
        "summary": report.summary,
        "similarity_result": report.similarity_result,
        "innovation_result": report.innovation_result,
        "conclusion": report.conclusion,
        "reviewer_comment": report.reviewer_comment,
    }


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
```

- [ ] **Step 4: 实现 api/v1/results.py**

```python
# backend/app/api/v1/results.py
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
    task = (await db.execute(select(AnalysisTask).where(AnalysisTask.id == task_id))).scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    essence = (await db.execute(select(ProposalEssence).where(ProposalEssence.task_id == task_id))).scalar_one_or_none()
    candidates = (await db.execute(select(Candidate).where(Candidate.task_id == task_id))).scalars().all()
    report = (await db.execute(select(Report).where(Report.task_id == task_id))).scalar_one_or_none()

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
            {"title": c.title, "source": c.source, "similarity": c.overall_similarity}
            for c in sorted(candidates, key=lambda x: x.overall_similarity, reverse=True)[:5]
        ],
        "report_id": report.id if report else None,
    }
```

- [ ] **Step 5: 运行测试**

```bash
pytest tests/test_api/test_reports.py -v
```
Expected: PASSED

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/report_service.py backend/app/api/v1/
git commit -m "feat: add report generation service and result/report query APIs"
```

---

## Chunk 4: 前端界面

### Task 13: Next.js 前端骨架与上传页

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`
- Create: `frontend/src/components/upload/UploadForm.tsx`
- Create: `frontend/src/lib/api.ts`

- [ ] **Step 1: 初始化 Next.js 项目**

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
npx shadcn@latest init -d
npx shadcn@latest add button card progress badge table
```

- [ ] **Step 2: 实现 API 客户端 (src/lib/api.ts)**

```typescript
// frontend/src/lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
});

export interface TaskStatus {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  current_step?: string;
  error_message?: string;
}

export interface TaskResults {
  task_id: string;
  status: string;
  essence?: {
    problem: Record<string, unknown>;
    method: Record<string, unknown>;
    architecture: Record<string, unknown>;
    innovation: Record<string, unknown>;
  };
  top_candidates: Array<{
    title: string;
    source: string;
    similarity: number;
  }>;
  report_id?: string;
}

export const submitTask = async (files: File[]): Promise<TaskStatus> => {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await api.post<TaskStatus>("/tasks/", formData);
  return res.data;
};

export const getTaskStatus = async (taskId: string): Promise<TaskStatus> => {
  const res = await api.get<TaskStatus>(`/tasks/${taskId}`);
  return res.data;
};

export const getTaskResults = async (taskId: string): Promise<TaskResults> => {
  const res = await api.get<TaskResults>(`/tasks/${taskId}/results`);
  return res.data;
};

export const getReport = async (reportId: string) => {
  const res = await api.get(`/reports/${reportId}`);
  return res.data;
};

export const addReviewComment = async (reportId: string, comment: string) => {
  const res = await api.post(`/reports/${reportId}/review`, { comment });
  return res.data;
};
```

- [ ] **Step 3: 实现上传表单 (src/components/upload/UploadForm.tsx)**

```tsx
// frontend/src/components/upload/UploadForm.tsx
"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitTask } from "@/lib/api";

export function UploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setFiles(Array.from(e.dataTransfer.files));
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async () => {
    if (!files.length) return;
    setLoading(true);
    setError(null);
    try {
      const task = await submitTask(files);
      router.push(`/tasks/${task.task_id}`);
    } catch (err: unknown) {
      setError("提交失败，请检查文件格式后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>上传参赛材料</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary"
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.zip"
            className="hidden"
            id="file-input"
            onChange={onFileChange}
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <p className="text-sm text-muted-foreground">
              拖拽或点击上传（支持 PDF / DOCX / PPTX / 图片 / ZIP）
            </p>
          </label>
          {files.length > 0 && (
            <ul className="mt-2 text-sm text-left">
              {files.map((f) => <li key={f.name}>✓ {f.name}</li>)}
            </ul>
          )}
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button onClick={handleSubmit} disabled={!files.length || loading} className="w-full">
          {loading ? "分析中..." : "提交分析"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: 实现首页 (src/app/page.tsx)**

```tsx
// frontend/src/app/page.tsx
import { UploadForm } from "@/components/upload/UploadForm";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-2">参赛材料查重与创新评估系统</h1>
      <p className="text-muted-foreground mb-8">上传材料，获取实质相似度与创新性评估报告</p>
      <UploadForm />
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: add Next.js frontend with file upload form"
```

---

### Task 14: 任务进度页与报告视图

**Files:**
- Create: `frontend/src/app/tasks/[id]/page.tsx`
- Create: `frontend/src/components/results/SimilarityPanel.tsx`
- Create: `frontend/src/components/results/InnovationPanel.tsx`
- Create: `frontend/src/app/reports/[id]/page.tsx`
- Create: `frontend/src/components/report/ReportViewer.tsx`

- [ ] **Step 1: 实现相似度面板**

```tsx
// frontend/src/components/results/SimilarityPanel.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Candidate {
  title: string;
  source: string;
  similarity: number;
}

export function SimilarityPanel({ candidates }: { candidates: Candidate[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>相似方案候选</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {candidates.length === 0 && <p className="text-muted-foreground text-sm">未发现高相似候选方案</p>}
        {candidates.map((c, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate max-w-xs">{c.title}</span>
              <Badge variant={c.similarity > 0.7 ? "destructive" : c.similarity > 0.4 ? "secondary" : "outline"}>
                {(c.similarity * 100).toFixed(0)}%
              </Badge>
            </div>
            <Progress value={c.similarity * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">来源：{c.source}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 实现创新性面板**

```tsx
// frontend/src/components/results/InnovationPanel.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DIMENSION_LABELS: Record<string, string> = {
  problem_definition_innovation: "问题定义创新",
  method_innovation: "方法创新",
  architecture_innovation: "架构创新",
  scenario_migration_innovation: "场景迁移创新",
  engineering_optimization_innovation: "工程优化创新",
  combination_innovation: "组合创新",
};

export function InnovationPanel({ innovation }: { innovation: Record<string, unknown> }) {
  const overall = innovation.overall_innovation_score as number;
  const flags = innovation.risk_flags as string[] || [];
  const explanation = innovation.explanation as string;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          创新性评估
          <span className="ml-2 text-lg font-bold text-primary">
            {overall !== undefined ? `${(overall * 100).toFixed(0)}分` : "--"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
          const score = innovation[key] as number;
          return score !== undefined ? (
            <div key={key} className="flex items-center gap-2">
              <span className="text-sm w-36 shrink-0">{label}</span>
              <div className="flex-1 bg-secondary rounded h-2">
                <div className="bg-primary h-2 rounded" style={{ width: `${score * 100}%` }} />
              </div>
              <span className="text-xs w-8 text-right">{(score * 100).toFixed(0)}</span>
            </div>
          ) : null;
        })}
        {flags.length > 0 && (
          <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">
            <p className="font-medium text-destructive">风险提示</p>
            <ul className="list-disc list-inside">
              {flags.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}
        {explanation && <p className="text-sm text-muted-foreground mt-2">{explanation}</p>}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: 实现任务进度页**

```tsx
// frontend/src/app/tasks/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTaskStatus, getTaskResults, TaskStatus, TaskResults } from "@/lib/api";
import { SimilarityPanel } from "@/components/results/SimilarityPanel";
import { InnovationPanel } from "@/components/results/InnovationPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEP_LABELS: Record<string, string> = {
  parsing: "解析文档...",
  extracting_essence: "提取方案实质...",
  retrieving_candidates: "多源检索候选方案...",
  analyzing_similarity: "五维相似度分析...",
  evaluating_innovation: "创新性评估...",
  generating_report: "生成审核报告...",
};

export default function TaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [results, setResults] = useState<TaskResults | null>(null);

  useEffect(() => {
    const poll = async () => {
      const s = await getTaskStatus(id);
      setStatus(s);
      if (s.status === "completed") {
        const r = await getTaskResults(id);
        setResults(r);
      } else if (s.status === "pending" || s.status === "processing") {
        setTimeout(poll, 3000);
      }
    };
    poll();
  }, [id]);

  if (!status) return <div className="flex items-center justify-center h-screen">加载中...</div>;

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">分析任务</h1>
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm">状态：<strong>{status.status}</strong></p>
          {status.current_step && (
            <p className="text-sm text-muted-foreground mt-1">
              {STEP_LABELS[status.current_step] || status.current_step}
            </p>
          )}
          {status.error_message && (
            <p className="text-destructive text-sm mt-1">{status.error_message}</p>
          )}
        </CardContent>
      </Card>

      {results && (
        <>
          {results.top_candidates.length > 0 && (
            <SimilarityPanel candidates={results.top_candidates} />
          )}
          {results.essence?.innovation && (
            <InnovationPanel innovation={results.essence.innovation} />
          )}
          {results.report_id && (
            <Button onClick={() => router.push(`/reports/${results.report_id}`)}>
              查看完整审核报告
            </Button>
          )}
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 4: 实现报告视图**

```tsx
// frontend/src/components/report/ReportViewer.tsx
"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addReviewComment } from "@/lib/api";

interface Report {
  id: string;
  summary: string;
  conclusion: string;
  reviewer_comment?: string;
  similarity_result: Record<string, unknown>;
  innovation_result: Record<string, unknown>;
}

export function ReportViewer({ report }: { report: Report }) {
  const [comment, setComment] = useState(report.reviewer_comment || "");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await addReviewComment(report.id, comment);
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>审核摘要</CardTitle></CardHeader>
        <CardContent><p className="whitespace-pre-wrap text-sm">{report.summary}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>评估结论</CardTitle></CardHeader>
        <CardContent><p className="text-sm">{report.conclusion}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>专家复核意见</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <textarea
            className="w-full border rounded p-2 text-sm min-h-24"
            value={comment}
            onChange={(e) => { setComment(e.target.value); setSaved(false); }}
            placeholder="请输入复核意见..."
          />
          <Button onClick={handleSave} size="sm">{saved ? "已保存" : "保存意见"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

```tsx
// frontend/src/app/reports/[id]/page.tsx
import { getReport } from "@/lib/api";
import { ReportViewer } from "@/components/report/ReportViewer";

export default async function ReportPage({ params }: { params: { id: string } }) {
  const report = await getReport(params.id);
  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">审核报告</h1>
      <ReportViewer report={report} />
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: add task progress page, similarity/innovation panels, and report viewer"
```

---

## Chunk 5: 集成测试与安全加固

### Task 15: 端到端集成测试

**Files:**
- Create: `backend/tests/test_integration.py`

- [ ] **Step 1: 编写集成测试**

```python
# backend/tests/test_integration.py
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import io


@pytest.mark.asyncio
async def test_full_pipeline_mock(client):
    """端到端流程测试（所有外部依赖均 mock）"""
    with (
        patch("app.services.file_service.minio_client") as mock_minio,
        patch("app.workers.analysis_tasks.run_analysis.apply_async") as mock_celery,
    ):
        mock_minio.put_object = MagicMock()
        mock_celery.return_value.id = "fake-celery-id"

        response = await client.post(
            "/api/v1/tasks/",
            files={"files": ("test.pdf", io.BytesIO(b"%PDF-1.4 fake content"), "application/pdf")},
        )

    assert response.status_code == 201
    data = response.json()
    assert "task_id" in data
    assert data["status"] == "pending"

    # 验证状态查询
    task_id = data["task_id"]
    status_response = await client.get(f"/api/v1/tasks/{task_id}")
    assert status_response.status_code == 200
    assert status_response.json()["task_id"] == task_id
```

- [ ] **Step 2: 运行全部测试套件**

```bash
cd backend
pytest tests/ -v --cov=app --cov-report=term-missing
```
Expected: 所有测试 PASSED，coverage > 60%

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_integration.py
git commit -m "test: add end-to-end integration test"
```

---

### Task 16: 安全加固

**Files:**
- Modify: `backend/app/skills/web_search_skill.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: 给 web_search_skill 添加白名单与超时控制**

```python
# backend/app/skills/web_search_skill.py
import httpx

ALLOWED_DOMAINS = [
    "arxiv.org", "github.com", "scholar.google.com",
    "patents.google.com", "ieee.org", "acm.org",
]

MAX_RESULTS = 10
REQUEST_TIMEOUT = 10.0


class WebSearchSkill:
    async def search(self, query: str, limit: int = 5) -> list[dict]:
        # TODO: 接入真实 Search API（SerpAPI / Bing）
        # 结果须过滤非白名单域名，设置超时
        return []

    def _is_allowed(self, url: str) -> bool:
        return any(domain in url for domain in ALLOWED_DOMAINS)
```

- [ ] **Step 2: 添加请求大小限制**

```python
# 在 backend/app/main.py 中增加文件大小限制
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB

@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    if request.method == "POST":
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_UPLOAD_SIZE:
            return JSONResponse(status_code=413, content={"detail": "文件大小超过 50MB 限制"})
    return await call_next(request)
```

- [ ] **Step 3: 运行测试确认无回归**

```bash
pytest tests/ -v
```
Expected: 全部 PASSED

- [ ] **Step 4: Commit**

```bash
git add backend/app/skills/ backend/app/main.py
git commit -m "security: add upload size limit and web search domain whitelist"
```

---

## 运行说明

```bash
# 1. 启动基础设施
cp .env.example .env
# 填写 ANTHROPIC_API_KEY
docker compose up -d postgres redis minio qdrant

# 2. 执行数据库迁移
cd backend && alembic upgrade head

# 3. 启动后端 + Worker
docker compose up backend worker

# 4. 启动前端
docker compose up frontend

# 访问
# 前端: http://localhost:3000
# API:  http://localhost:8000/docs
# MinIO Console: http://localhost:9001
```

## 关键配置项

| 变量 | 说明 |
|------|------|
| `ANTHROPIC_API_KEY` | Claude API 密钥（必填） |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `MINIO_*` | 对象存储配置 |
| `QDRANT_URL` | 向量库地址 |

## 下一步扩展建议

1. **接入真实搜索 API**：在 `web_search_skill.py` 中替换 SerpAPI / Bing Search
2. **内部作品库导入**：使用 `VectorStore.upsert()` 批量导入历届获奖作品
3. **权限系统集成**：在 API 层添加 JWT 中间件，对接甲方 SSO
4. **导出 PDF 报告**：在 `report_service.py` 中集成 `weasyprint` 或 `reportlab`
5. **批量任务**：支持一次性提交多份材料并发分析
