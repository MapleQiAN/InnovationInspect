# OpenClaw Framework Integration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 OpenClaw Skills 框架完整落地——后端建立标准化 Skill 基类与注册中心，并将现有服务全部封装为 OpenClaw Skill；新增 Skills API；前端新增技能管理页面，支持查看、配置和执行每个 Skill。

**Architecture:** 后端新增 `skills/` 层统一抽象（BaseSkill + SkillRegistry），所有现有服务以 Skill 形式注册；新增 `/api/v1/skills/` RESTful API 暴露技能元数据与执行接口；前端新增 `/skills` 页面（技能目录）和 `/skills/[name]` 页面（技能详情 + 在线执行），通过轮询跟踪执行状态。

**Tech Stack:** Python 3.11 / FastAPI / SQLAlchemy async / Anthropic SDK (claude-opus-4-6) / Next.js 15 / TypeScript / TailwindCSS

---

## Chunk 1: 后端 OpenClaw 基础框架

### Task 1: BaseSkill 抽象基类

**Files:**
- Create: `backend/app/skills/base_skill.py`
- Modify: `backend/app/skills/__init__.py`

- [ ] **Step 1: 创建 BaseSkill 基类**

```python
# backend/app/skills/base_skill.py
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any
import time


@dataclass
class SkillResult:
    success: bool
    data: Any
    error: str | None = None
    duration_ms: int = 0


class BaseSkill(ABC):
    name: str
    description: str
    skill_type: str  # "basic" | "core"
    input_schema: dict  # JSON Schema for inputs

    @abstractmethod
    async def execute(self, **kwargs) -> SkillResult:
        ...

    def to_tool_definition(self) -> dict:
        """Return Anthropic tool definition for this skill."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }

    async def run(self, **kwargs) -> SkillResult:
        """Wrapper that times execution and catches exceptions."""
        start = time.monotonic()
        try:
            result = await self.execute(**kwargs)
            result.duration_ms = int((time.monotonic() - start) * 1000)
            return result
        except Exception as e:
            return SkillResult(
                success=False,
                data=None,
                error=str(e),
                duration_ms=int((time.monotonic() - start) * 1000),
            )
```

- [ ] **Step 2: 更新 `__init__.py` 导出**

```python
# backend/app/skills/__init__.py
from .base_skill import BaseSkill, SkillResult
```

- [ ] **Step 3: 提交**

```bash
git add backend/app/skills/base_skill.py backend/app/skills/__init__.py
git commit -m "feat(openclaw): add BaseSkill abstract class and SkillResult"
```

---

### Task 2: SkillRegistry 注册中心

**Files:**
- Create: `backend/app/skills/skill_registry.py`

- [ ] **Step 1: 创建 SkillRegistry**

```python
# backend/app/skills/skill_registry.py
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .base_skill import BaseSkill


class SkillRegistry:
    _instance: SkillRegistry | None = None
    _skills: dict[str, "BaseSkill"]

    def __new__(cls) -> SkillRegistry:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._skills = {}
        return cls._instance

    def register(self, skill: "BaseSkill") -> None:
        self._skills[skill.name] = skill

    def get(self, name: str) -> "BaseSkill | None":
        return self._skills.get(name)

    def list_all(self) -> list[dict]:
        return [
            {
                "name": s.name,
                "description": s.description,
                "skill_type": s.skill_type,
                "input_schema": s.input_schema,
            }
            for s in self._skills.values()
        ]

    def tool_definitions(self) -> list[dict]:
        return [s.to_tool_definition() for s in self._skills.values()]


registry = SkillRegistry()
```

- [ ] **Step 2: 导出**

```python
# backend/app/skills/__init__.py
from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry, SkillRegistry
```

- [ ] **Step 3: 提交**

```bash
git add backend/app/skills/skill_registry.py backend/app/skills/__init__.py
git commit -m "feat(openclaw): add SkillRegistry singleton"
```

---

## Chunk 2: 将现有服务封装为 OpenClaw Skills

每个 Skill 文件轻量包装现有 Service，末尾调用 `registry.register()` 自动注册。

### Task 3: 基础能力 Skills（file-fetch / ocr / doc-parse / web-search）

**Files:**
- Modify: `backend/app/skills/file_fetch_skill.py`
- Modify: `backend/app/skills/web_search_skill.py`
- Create: `backend/app/skills/ocr_skill.py`
- Create: `backend/app/skills/doc_parse_skill.py`

- [ ] **Step 1: 重构 FileFetchSkill**

```python
# backend/app/skills/file_fetch_skill.py
import httpx
from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry

REQUEST_TIMEOUT = 30.0
MAX_FILE_SIZE = 50 * 1024 * 1024


class FileFetchSkill(BaseSkill):
    name = "file-fetch-skill"
    description = "从 URL 下载文件内容，返回字节数据"
    skill_type = "basic"
    input_schema = {
        "type": "object",
        "properties": {
            "url": {"type": "string", "description": "文件下载地址"}
        },
        "required": ["url"],
    }

    async def execute(self, url: str, **kwargs) -> SkillResult:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            content = response.content
            if len(content) > MAX_FILE_SIZE:
                raise ValueError(f"文件过大: {len(content)} bytes")
            return SkillResult(success=True, data={"size": len(content), "url": url})

    async def fetch(self, url: str) -> bytes:
        """Legacy interface kept for backward compatibility."""
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            content = response.content
            if len(content) > MAX_FILE_SIZE:
                raise ValueError(f"File too large: {len(content)} bytes")
            return content


registry.register(FileFetchSkill())
```

- [ ] **Step 2: 重构 WebSearchSkill**

```python
# backend/app/skills/web_search_skill.py
from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry

ALLOWED_DOMAINS = [
    "arxiv.org", "github.com", "scholar.google.com",
    "patents.google.com", "ieee.org", "acm.org",
    "cnki.net", "wanfangdata.com.cn",
]


class WebSearchSkill(BaseSkill):
    name = "web-search-skill"
    description = "在互联网公开资料库中搜索相关内容，返回摘要与链接列表"
    skill_type = "basic"
    input_schema = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "搜索关键词"},
            "limit": {"type": "integer", "description": "返回结果数量", "default": 5},
        },
        "required": ["query"],
    }

    async def execute(self, query: str, limit: int = 5, **kwargs) -> SkillResult:
        results = await self.search(query, limit)
        return SkillResult(success=True, data={"results": results, "query": query})

    async def search(self, query: str, limit: int = 5) -> list[dict]:
        # TODO: Connect to SerpAPI / Bing Search API
        return []

    def _is_allowed(self, url: str) -> bool:
        return any(domain in url for domain in ALLOWED_DOMAINS)


registry.register(WebSearchSkill())
```

- [ ] **Step 3: 创建 OcrSkill**

```python
# backend/app/skills/ocr_skill.py
from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class OcrSkill(BaseSkill):
    name = "ocr-skill"
    description = "对图片或 PDF 页面进行 OCR 识别，提取文本内容"
    skill_type = "basic"
    input_schema = {
        "type": "object",
        "properties": {
            "image_bytes_b64": {
                "type": "string",
                "description": "图片的 base64 编码字节",
            }
        },
        "required": ["image_bytes_b64"],
    }

    async def execute(self, image_bytes_b64: str, **kwargs) -> SkillResult:
        import base64
        from app.services.ocr_service import OcrService

        image_bytes = base64.b64decode(image_bytes_b64)
        text = OcrService().extract_text(image_bytes)
        return SkillResult(success=True, data={"text": text})


registry.register(OcrSkill())
```

- [ ] **Step 4: 创建 DocParseSkill**

```python
# backend/app/skills/doc_parse_skill.py
from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class DocParseSkill(BaseSkill):
    name = "doc-parse-skill"
    description = "解析 PDF/DOCX/PPTX/图片文档，抽取并分块文本"
    skill_type = "basic"
    input_schema = {
        "type": "object",
        "properties": {
            "task_id": {
                "type": "string",
                "description": "分析任务 ID，用于查找已上传的文档",
            }
        },
        "required": ["task_id"],
    }

    async def execute(self, task_id: str, **kwargs) -> SkillResult:
        from app.database import AsyncSessionLocal
        from app.services.doc_parse_service import DocParseService

        async with AsyncSessionLocal() as db:
            text = await DocParseService().parse_task_documents(db, task_id)
        return SkillResult(success=True, data={"text": text[:500], "task_id": task_id})


registry.register(DocParseSkill())
```

- [ ] **Step 5: 提交**

```bash
git add backend/app/skills/
git commit -m "feat(openclaw): wrap basic skills (file-fetch, web-search, ocr, doc-parse)"
```

---

### Task 4: 核心能力 Skills（essence / retrieval / similarity / innovation / report）

**Files:**
- Create: `backend/app/skills/proposal_essence_skill.py`
- Create: `backend/app/skills/prior_art_skill.py`
- Create: `backend/app/skills/solution_aligner_skill.py`
- Create: `backend/app/skills/novelty_evaluator_skill.py`
- Create: `backend/app/skills/review_report_skill.py`

- [ ] **Step 1: ProposalEssenceSkill**

```python
# backend/app/skills/proposal_essence_skill.py
from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class ProposalEssenceSkill(BaseSkill):
    name = "proposal-essence-extractor"
    description = "从原始文本中抽取方案实质（问题定义、关键技术、系统架构、创新点）"
    skill_type = "core"
    input_schema = {
        "type": "object",
        "properties": {
            "task_id": {"type": "string", "description": "分析任务 ID"},
            "text": {"type": "string", "description": "已解析的文档原始文本"},
        },
        "required": ["task_id", "text"],
    }

    async def execute(self, task_id: str, text: str, **kwargs) -> SkillResult:
        from app.database import AsyncSessionLocal
        from app.services.essence_extractor import EssenceExtractor

        async with AsyncSessionLocal() as db:
            essence = await EssenceExtractor().extract(db, task_id, text)
        return SkillResult(success=True, data={"essence_extracted": True, "task_id": task_id})


registry.register(ProposalEssenceSkill())
```

- [ ] **Step 2: PriorArtSkill**

```python
# backend/app/skills/prior_art_skill.py
from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class PriorArtSkill(BaseSkill):
    name = "prior-art-retriever"
    description = "基于方案实质生成多类查询，从内部知识库与互联网召回候选方案"
    skill_type = "core"
    input_schema = {
        "type": "object",
        "properties": {
            "task_id": {"type": "string", "description": "分析任务 ID"},
        },
        "required": ["task_id"],
    }

    async def execute(self, task_id: str, **kwargs) -> SkillResult:
        from app.database import AsyncSessionLocal
        from app.services.retrieval_service import RetrievalService
        from app.models.essence import ProposalEssence
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(ProposalEssence).where(ProposalEssence.task_id == task_id)
            )
            essence = result.scalar_one_or_none()
            if not essence:
                raise ValueError(f"No essence found for task {task_id}")
            candidates = await RetrievalService().retrieve(db, task_id, essence)
        return SkillResult(
            success=True,
            data={"candidates_found": len(candidates), "task_id": task_id},
        )


registry.register(PriorArtSkill())
```

- [ ] **Step 3: SolutionAlignerSkill**

```python
# backend/app/skills/solution_aligner_skill.py
from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class SolutionAlignerSkill(BaseSkill):
    name = "solution-aligner"
    description = "执行五维实质相似度分析，输出问题/方法/架构/流程/证据对齐得分"
    skill_type = "core"
    input_schema = {
        "type": "object",
        "properties": {
            "task_id": {"type": "string", "description": "分析任务 ID"},
        },
        "required": ["task_id"],
    }

    async def execute(self, task_id: str, **kwargs) -> SkillResult:
        from app.database import AsyncSessionLocal
        from app.services.similarity_service import SimilarityService
        from app.models.essence import ProposalEssence
        from app.models.candidate import Candidate
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            essence_result = await db.execute(
                select(ProposalEssence).where(ProposalEssence.task_id == task_id)
            )
            essence = essence_result.scalar_one_or_none()
            cand_result = await db.execute(
                select(Candidate).where(Candidate.task_id == task_id)
            )
            candidates = cand_result.scalars().all()
            sim_result = await SimilarityService().analyze(essence, candidates)
        return SkillResult(
            success=True,
            data={"overall_similarity": sim_result.get("overall_similarity"), "task_id": task_id},
        )


registry.register(SolutionAlignerSkill())
```

- [ ] **Step 4: NoveltyEvaluatorSkill**

```python
# backend/app/skills/novelty_evaluator_skill.py
from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class NoveltyEvaluatorSkill(BaseSkill):
    name = "novelty-evaluator"
    description = "六维创新性评估，输出各维度得分、综合创新分与风险标记"
    skill_type = "core"
    input_schema = {
        "type": "object",
        "properties": {
            "task_id": {"type": "string", "description": "分析任务 ID"},
        },
        "required": ["task_id"],
    }

    async def execute(self, task_id: str, **kwargs) -> SkillResult:
        from app.database import AsyncSessionLocal
        from app.services.innovation_service import InnovationService
        from app.models.essence import ProposalEssence
        from app.models.candidate import Candidate
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            essence_result = await db.execute(
                select(ProposalEssence).where(ProposalEssence.task_id == task_id)
            )
            essence = essence_result.scalar_one_or_none()
            cand_result = await db.execute(
                select(Candidate).where(Candidate.task_id == task_id)
            )
            candidates = cand_result.scalars().all()
            innov = await InnovationService().evaluate(db, task_id, essence, candidates)
        return SkillResult(
            success=True,
            data={"overall_innovation_score": innov.get("overall_innovation_score"), "task_id": task_id},
        )


registry.register(NoveltyEvaluatorSkill())
```

- [ ] **Step 5: ReviewReportSkill**

```python
# backend/app/skills/review_report_skill.py
from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class ReviewReportSkill(BaseSkill):
    name = "review-report-writer"
    description = "汇总分析结果，生成可供专家直接使用的结构化审核报告"
    skill_type = "core"
    input_schema = {
        "type": "object",
        "properties": {
            "task_id": {"type": "string", "description": "分析任务 ID"},
        },
        "required": ["task_id"],
    }

    async def execute(self, task_id: str, **kwargs) -> SkillResult:
        from app.database import AsyncSessionLocal
        from app.services.report_service import ReportService
        from app.models.essence import ProposalEssence
        from app.models.candidate import Candidate
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            essence_result = await db.execute(
                select(ProposalEssence).where(ProposalEssence.task_id == task_id)
            )
            essence = essence_result.scalar_one_or_none()
            # Sim and innov results are read from report_service internally
            report = await ReportService().generate(db, task_id, essence, {}, {})
        return SkillResult(success=True, data={"report_id": str(report.id) if report else None})


registry.register(ReviewReportSkill())
```

- [ ] **Step 6: 提交**

```bash
git add backend/app/skills/
git commit -m "feat(openclaw): wrap core skills (essence, retrieval, similarity, innovation, report)"
```

---

## Chunk 3: Skills API 后端接口

### Task 5: Skills Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/skill_schemas.py`

- [ ] **Step 1: 创建 Schemas**

```python
# backend/app/schemas/skill_schemas.py
from pydantic import BaseModel
from typing import Any


class SkillMeta(BaseModel):
    name: str
    description: str
    skill_type: str
    input_schema: dict


class SkillExecuteRequest(BaseModel):
    inputs: dict[str, Any]


class SkillExecuteResponse(BaseModel):
    skill_name: str
    success: bool
    data: Any
    error: str | None
    duration_ms: int
```

- [ ] **Step 2: 提交**

```bash
git add backend/app/schemas/skill_schemas.py
git commit -m "feat(openclaw): add skill API schemas"
```

---

### Task 6: Skills API Router

**Files:**
- Create: `backend/app/api/v1/skills.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: 创建 Skills Router**

```python
# backend/app/api/v1/skills.py
from fastapi import APIRouter, HTTPException
from app.schemas.skill_schemas import SkillMeta, SkillExecuteRequest, SkillExecuteResponse
from app.skills.skill_registry import registry

# Import all skills to trigger registration
import app.skills.file_fetch_skill  # noqa
import app.skills.web_search_skill  # noqa
import app.skills.ocr_skill  # noqa
import app.skills.doc_parse_skill  # noqa
import app.skills.proposal_essence_skill  # noqa
import app.skills.prior_art_skill  # noqa
import app.skills.solution_aligner_skill  # noqa
import app.skills.novelty_evaluator_skill  # noqa
import app.skills.review_report_skill  # noqa

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("/", response_model=list[SkillMeta])
async def list_skills():
    """列出所有已注册的 OpenClaw Skills。"""
    return registry.list_all()


@router.get("/{skill_name}", response_model=SkillMeta)
async def get_skill(skill_name: str):
    """获取指定 Skill 的元数据与入参 Schema。"""
    skill = registry.get(skill_name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")
    return {
        "name": skill.name,
        "description": skill.description,
        "skill_type": skill.skill_type,
        "input_schema": skill.input_schema,
    }


@router.post("/{skill_name}/execute", response_model=SkillExecuteResponse)
async def execute_skill(skill_name: str, body: SkillExecuteRequest):
    """直接执行指定 Skill（用于前端测试与独立调用）。"""
    skill = registry.get(skill_name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")
    result = await skill.run(**body.inputs)
    return SkillExecuteResponse(
        skill_name=skill_name,
        success=result.success,
        data=result.data,
        error=result.error,
        duration_ms=result.duration_ms,
    )
```

- [ ] **Step 2: 注册路由到 main.py**

在 `backend/app/main.py` 中，找到现有 `include_router` 语句后追加：

```python
from app.api.v1 import skills as skills_router
app.include_router(skills_router.router, prefix="/api/v1")
```

- [ ] **Step 3: 提交**

```bash
git add backend/app/api/v1/skills.py backend/app/main.py
git commit -m "feat(openclaw): add /api/v1/skills REST endpoints"
```

---

## Chunk 4: 前端 Skills 管理页面

### Task 7: API Client 扩展

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: 新增 Skills 类型与 API 方法**

在 `frontend/src/lib/api.ts` 末尾追加：

```typescript
// ---- OpenClaw Skills ----

export interface SkillMeta {
  name: string;
  description: string;
  skill_type: "basic" | "core";
  input_schema: Record<string, unknown>;
}

export interface SkillExecuteResponse {
  skill_name: string;
  success: boolean;
  data: unknown;
  error: string | null;
  duration_ms: number;
}

export async function listSkills(): Promise<SkillMeta[]> {
  const res = await axios.get(`${API_BASE}/skills/`);
  return res.data;
}

export async function getSkill(name: string): Promise<SkillMeta> {
  const res = await axios.get(`${API_BASE}/skills/${name}`);
  return res.data;
}

export async function executeSkill(
  name: string,
  inputs: Record<string, unknown>
): Promise<SkillExecuteResponse> {
  const res = await axios.post(`${API_BASE}/skills/${name}/execute`, { inputs });
  return res.data;
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(openclaw): add skills API client methods"
```

---

### Task 8: Skills 目录页面 `/skills`

**Files:**
- Create: `frontend/src/app/skills/page.tsx`

- [ ] **Step 1: 创建技能目录页**

```tsx
// frontend/src/app/skills/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listSkills, SkillMeta } from "@/lib/api";

const TYPE_LABEL: Record<string, string> = {
  basic: "基础能力",
  core: "核心能力",
};

const TYPE_COLOR: Record<string, string> = {
  basic: "bg-blue-100 text-blue-700",
  core: "bg-purple-100 text-purple-700",
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSkills()
      .then(setSkills)
      .finally(() => setLoading(false));
  }, []);

  const basic = skills.filter((s) => s.skill_type === "basic");
  const core = skills.filter((s) => s.skill_type === "core");

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">OpenClaw Skills</h1>
        <p className="mt-2 text-gray-500">
          已注册 {skills.length} 个技能 · 点击技能查看详情并在线执行
        </p>
      </div>

      {[
        { label: "基础能力 Skills", items: basic },
        { label: "核心能力 Skills", items: core },
      ].map(({ label, items }) => (
        <section key={label} className="mb-10">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">{label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((skill) => (
              <Link
                key={skill.name}
                href={`/skills/${encodeURIComponent(skill.name)}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-400 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-mono text-sm font-semibold text-gray-800">
                    {skill.name}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[skill.skill_type]}`}
                  >
                    {TYPE_LABEL[skill.skill_type]}
                  </span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {skill.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/app/skills/page.tsx
git commit -m "feat(openclaw): add /skills catalog page"
```

---

### Task 9: Skill 详情 + 执行页面 `/skills/[name]`

**Files:**
- Create: `frontend/src/app/skills/[name]/page.tsx`

- [ ] **Step 1: 创建详情执行页**

```tsx
// frontend/src/app/skills/[name]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSkill, executeSkill, SkillMeta, SkillExecuteResponse } from "@/lib/api";

export default function SkillDetailPage() {
  const { name } = useParams<{ name: string }>();
  const skillName = decodeURIComponent(name);
  const [skill, setSkill] = useState<SkillMeta | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SkillExecuteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    getSkill(skillName)
      .then(setSkill)
      .catch(() => setFetchError("Skill not found"));
  }, [skillName]);

  if (fetchError)
    return <div className="p-10 text-red-500">{fetchError}</div>;
  if (!skill)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );

  const properties = (skill.input_schema as any)?.properties ?? {};
  const required: string[] = (skill.input_schema as any)?.required ?? [];

  const handleExecute = async () => {
    setLoading(true);
    setResult(null);
    try {
      const parsed: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(inputs)) {
        // Try to parse numbers/booleans
        if (v === "true") parsed[k] = true;
        else if (v === "false") parsed[k] = false;
        else if (!isNaN(Number(v)) && v !== "") parsed[k] = Number(v);
        else parsed[k] = v;
      }
      const res = await executeSkill(skillName, parsed);
      setResult(res);
    } catch (e: any) {
      setResult({
        skill_name: skillName,
        success: false,
        data: null,
        error: e?.response?.data?.detail ?? e.message,
        duration_ms: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <a href="/skills" className="text-sm text-blue-600 hover:underline">← 返回技能列表</a>
      <div className="mt-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-mono text-gray-900">{skill.name}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${skill.skill_type === "core" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
            {skill.skill_type === "core" ? "核心能力" : "基础能力"}
          </span>
        </div>
        <p className="mt-2 text-gray-500">{skill.description}</p>
      </div>

      {/* Input Form */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">执行参数</h2>
        {Object.keys(properties).length === 0 ? (
          <p className="text-sm text-gray-400">此技能无需输入参数</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(properties).map(([key, prop]: [string, any]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key}
                  {required.includes(key) && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                {prop.description && (
                  <p className="text-xs text-gray-400 mb-1">{prop.description}</p>
                )}
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  placeholder={prop.type === "integer" ? "数字" : "输入值..."}
                  value={inputs[key] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleExecute}
          disabled={loading}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          )}
          {loading ? "执行中..." : "执行 Skill"}
        </button>
      </section>

      {/* Result */}
      {result && (
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">执行结果</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{result.duration_ms} ms</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${result.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {result.success ? "成功" : "失败"}
              </span>
            </div>
          </div>
          {result.error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {result.error}
            </div>
          )}
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs overflow-auto max-h-80 text-gray-800">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/app/skills/
git commit -m "feat(openclaw): add /skills/[name] detail and execute page"
```

---

### Task 10: 导航栏添加 Skills 入口

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: 在 layout 中加 Skills 导航链接**

在现有 `<body>` 内容顶部或导航区域添加：

```tsx
<nav className="bg-white border-b border-gray-200 px-6 py-3 flex gap-6 text-sm">
  <a href="/" className="text-gray-600 hover:text-blue-600 font-medium">首页</a>
  <a href="/skills" className="text-gray-600 hover:text-blue-600 font-medium">OpenClaw Skills</a>
</nav>
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/app/layout.tsx
git commit -m "feat(openclaw): add Skills nav entry in layout"
```

---

## 验收标准

1. `GET /api/v1/skills/` 返回 9 个已注册技能的元数据列表
2. `GET /api/v1/skills/file-fetch-skill` 返回该技能的 schema
3. `POST /api/v1/skills/web-search-skill/execute` 返回 `{"success": true, "data": {"results": [], ...}}`
4. 前端 `/skills` 页面显示基础能力 4 个、核心能力 5 个
5. 前端 `/skills/web-search-skill` 页面可填写 `query` 参数并执行，显示结果
6. 导航栏有 "OpenClaw Skills" 链接
