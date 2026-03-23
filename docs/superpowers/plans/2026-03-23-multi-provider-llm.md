# Multi-Provider LLM Support Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将系统从硬编码 Anthropic Claude 改造为支持所有主流 AI 提供商（OpenAI、Google Gemini、Mistral、DeepSeek、Azure 等）的统一 LLM 接口。

**Architecture:** 引入 `litellm` 作为统一适配层，创建 `backend/app/llm/client.py` 封装单一 `LLMClient` 类，所有服务通过依赖注入获取客户端。配置文件通过 `LLM_PROVIDER` 和 `LLM_MODEL` 环境变量控制使用哪个提供商和模型。

**Tech Stack:** `litellm>=1.50`（统一 LLM 接口）、FastAPI 依赖注入、pydantic-settings（配置管理）

---

## Chunk 1: LLM 抽象层与配置

### Task 1: 更新依赖和配置

**Files:**
- Modify: `backend/pyproject.toml`
- Modify: `backend/app/config.py`
- Modify: `.env.example`

- [ ] **Step 1: 更新 pyproject.toml，添加 litellm 依赖**

```toml
# 在 dependencies 列表中添加（保留 anthropic 以兼容旧有代码迁移期）
"litellm>=1.50",
"openai>=1.30",
"google-generativeai>=0.7",
```

打开 `backend/pyproject.toml`，在 `anthropic>=0.34` 后添加上述三行。

- [ ] **Step 2: 更新 config.py，添加多提供商配置字段**

将 `backend/app/config.py` 替换为：

```python
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
    collection_name: str = "proposals"

    # LLM 提供商配置
    # llm_model 使用 litellm 格式: "anthropic/claude-sonnet-4-6",
    # "openai/gpt-4o", "gemini/gemini-1.5-pro", "mistral/mistral-large-latest",
    # "deepseek/deepseek-chat", "azure/gpt-4o" 等
    llm_model: str = "anthropic/claude-sonnet-4-6"
    llm_max_tokens: int = 2048

    # API Keys（按需填写对应提供商的 key）
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    mistral_api_key: str = ""
    deepseek_api_key: str = ""
    azure_api_key: str = ""
    azure_api_base: str = ""
    azure_api_version: str = "2024-02-01"


settings = Settings()
```

- [ ] **Step 3: 更新 .env.example，展示所有提供商配置**

将 `.env.example` 替换为：

```
DATABASE_URL=postgresql+asyncpg://ccreview:ccreview@postgres:5432/ccreview
REDIS_URL=redis://redis:6379/0
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ccreview
QDRANT_URL=http://qdrant:6333
COLLECTION_NAME=proposals

# LLM 配置（选择一个提供商并填写对应 API Key）
# 格式: <provider>/<model>
# Anthropic: anthropic/claude-sonnet-4-6, anthropic/claude-opus-4-6
# OpenAI:    openai/gpt-4o, openai/gpt-4o-mini
# Google:    gemini/gemini-1.5-pro, gemini/gemini-1.5-flash
# Mistral:   mistral/mistral-large-latest, mistral/mistral-small-latest
# DeepSeek:  deepseek/deepseek-chat, deepseek/deepseek-coder
# Azure:     azure/<your-deployment-name>
LLM_MODEL=anthropic/claude-sonnet-4-6
LLM_MAX_TOKENS=2048

# 按所选提供商填写对应 Key（其余留空即可）
ANTHROPIC_API_KEY=your-anthropic-key-here
OPENAI_API_KEY=
GEMINI_API_KEY=
MISTRAL_API_KEY=
DEEPSEEK_API_KEY=
AZURE_API_KEY=
AZURE_API_BASE=
AZURE_API_VERSION=2024-02-01
```

- [ ] **Step 4: Commit**

```bash
git add backend/pyproject.toml backend/app/config.py .env.example
git commit -m "feat: add multi-provider LLM config (litellm)"
```

---

### Task 2: 创建统一 LLM 客户端

**Files:**
- Create: `backend/app/llm/__init__.py`
- Create: `backend/app/llm/client.py`
- Create: `backend/tests/test_llm/test_client.py`

- [ ] **Step 1: 编写失败测试**

创建 `backend/tests/test_llm/__init__.py`（空文件）

创建 `backend/tests/test_llm/test_client.py`：

```python
import pytest
from unittest.mock import patch, MagicMock
from app.llm.client import LLMClient


def make_mock_response(text: str):
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = text
    return mock_response


@patch("app.llm.client.litellm.completion")
def test_chat_returns_text(mock_completion):
    mock_completion.return_value = make_mock_response("hello world")
    client = LLMClient(model="openai/gpt-4o-mini", api_keys={})
    result = client.chat([{"role": "user", "content": "hi"}], max_tokens=100)
    assert result == "hello world"
    mock_completion.assert_called_once()


@patch("app.llm.client.litellm.completion")
def test_chat_passes_correct_model(mock_completion):
    mock_completion.return_value = make_mock_response("ok")
    client = LLMClient(model="gemini/gemini-1.5-flash", api_keys={"gemini_api_key": "test"})
    client.chat([{"role": "user", "content": "test"}], max_tokens=50)
    call_kwargs = mock_completion.call_args
    assert call_kwargs.kwargs["model"] == "gemini/gemini-1.5-flash"


@patch("app.llm.client.litellm.completion")
def test_chat_empty_message_raises(mock_completion):
    client = LLMClient(model="openai/gpt-4o", api_keys={})
    with pytest.raises(ValueError, match="messages cannot be empty"):
        client.chat([], max_tokens=100)
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd backend && python -m pytest tests/test_llm/test_client.py -v
```

期望输出：`ImportError: cannot import name 'LLMClient'`

- [ ] **Step 3: 实现 LLM 客户端**

创建 `backend/app/llm/__init__.py`（空文件）

创建 `backend/app/llm/client.py`：

```python
import os
import litellm
from app.config import settings


class LLMClient:
    """统一 LLM 客户端，通过 litellm 支持所有主流 AI 提供商。

    model 格式: "<provider>/<model-name>"
    例如: "anthropic/claude-sonnet-4-6", "openai/gpt-4o",
          "gemini/gemini-1.5-pro", "deepseek/deepseek-chat"
    """

    def __init__(self, model: str, api_keys: dict):
        self.model = model
        self._configure_keys(api_keys)

    def _configure_keys(self, api_keys: dict) -> None:
        """将 API keys 注入环境变量（litellm 读取标准环境变量）。"""
        key_map = {
            "anthropic_api_key": "ANTHROPIC_API_KEY",
            "openai_api_key": "OPENAI_API_KEY",
            "gemini_api_key": "GEMINI_API_KEY",
            "mistral_api_key": "MISTRAL_API_KEY",
            "deepseek_api_key": "DEEPSEEK_API_KEY",
            "azure_api_key": "AZURE_API_KEY",
            "azure_api_base": "AZURE_API_BASE",
            "azure_api_version": "AZURE_API_VERSION",
        }
        for field, env_var in key_map.items():
            value = api_keys.get(field, "")
            if value:
                os.environ[env_var] = value

    def chat(self, messages: list[dict], max_tokens: int) -> str:
        """发送消息并返回文本响应。

        Args:
            messages: OpenAI 格式消息列表，如 [{"role": "user", "content": "..."}]
            max_tokens: 最大输出 token 数

        Returns:
            模型返回的文本内容

        Raises:
            ValueError: messages 为空时
        """
        if not messages:
            raise ValueError("messages cannot be empty")

        response = litellm.completion(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content


def get_llm_client() -> LLMClient:
    """工厂函数，从 settings 创建 LLMClient 实例（用于依赖注入）。"""
    return LLMClient(
        model=settings.llm_model,
        api_keys={
            "anthropic_api_key": settings.anthropic_api_key,
            "openai_api_key": settings.openai_api_key,
            "gemini_api_key": settings.gemini_api_key,
            "mistral_api_key": settings.mistral_api_key,
            "deepseek_api_key": settings.deepseek_api_key,
            "azure_api_key": settings.azure_api_key,
            "azure_api_base": settings.azure_api_base,
            "azure_api_version": settings.azure_api_version,
        },
    )
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd backend && python -m pytest tests/test_llm/test_client.py -v
```

期望输出：3 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/llm/ backend/tests/test_llm/
git commit -m "feat: add unified LLMClient via litellm"
```

---

## Chunk 2: 迁移所有服务

### Task 3: 迁移 EssenceExtractor

**Files:**
- Modify: `backend/app/services/essence_extractor.py`

- [ ] **Step 1: 将 EssenceExtractor 改为使用 LLMClient**

将 `backend/app/services/essence_extractor.py` 修改为：

```python
import json
from app.llm.client import LLMClient, get_llm_client
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
    "types": ["创新类型: problem_definition/method/architecture/engineering/combination"]
  },
  "evidence": {
    "references": ["参考文献或数据来源"]
  }
}

注意：仅分析实质内容，忽略宣传性表达和标题包装。

材料内容：
"""


class EssenceExtractor:
    def __init__(self, llm: LLMClient | None = None):
        self.llm = llm or get_llm_client()

    async def _call_llm(self, text: str) -> dict:
        content = self.llm.chat(
            messages=[{"role": "user", "content": EXTRACTION_PROMPT + text[:8000]}],
            max_tokens=settings.llm_max_tokens,
        )
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON found in LLM response")
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

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/essence_extractor.py
git commit -m "refactor: migrate EssenceExtractor to LLMClient"
```

---

### Task 4: 迁移 SimilarityService

**Files:**
- Modify: `backend/app/services/similarity_service.py`

- [ ] **Step 1: 将 SimilarityService 改为使用 LLMClient**

将 `backend/app/services/similarity_service.py` 修改为：

```python
import json
from app.llm.client import LLMClient, get_llm_client
from app.config import settings

SIMILARITY_PROMPT = """
请对以下"待评估方案"和"候选方案"进行五维相似度分析，返回 JSON（仅返回 JSON，不要其他内容）：
{
  "problem_similarity": 0.0,
  "method_similarity": 0.0,
  "architecture_similarity": 0.0,
  "flow_similarity": 0.0,
  "evidence_alignment": 0.0,
  "explanation": "解释说明"
}

评分说明：
- 1.0 = 完全相同，0.0 = 完全无关
- 忽略标题差异和宣传性表达，聚焦实质内容
- explanation 需指出具体相似点或差异

待评估方案实质：
{essence}

候选方案摘要：
{candidate}
"""

SCORE_KEYS = [
    "problem_similarity",
    "method_similarity",
    "architecture_similarity",
    "flow_similarity",
    "evidence_alignment",
]


class SimilarityService:
    def __init__(self, llm: LLMClient | None = None):
        self.llm = llm or get_llm_client()

    async def _score_with_llm(self, essence: dict, candidate: dict) -> dict:
        prompt = SIMILARITY_PROMPT.format(
            essence=json.dumps(essence, ensure_ascii=False),
            candidate=json.dumps(candidate, ensure_ascii=False),
        )
        content = self.llm.chat(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
        )
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == 0:
            return {k: 0.0 for k in SCORE_KEYS} | {"explanation": "解析失败"}
        return json.loads(content[start:end])

    async def analyze(self, essence: dict, candidates: list[dict]) -> dict:
        results = []
        for candidate in candidates:
            scores = await self._score_with_llm(essence, candidate)
            overall = sum(scores.get(k, 0.0) for k in SCORE_KEYS) / len(SCORE_KEYS)
            results.append({
                "candidate": candidate,
                "scores": scores,
                "overall_similarity": round(overall, 3),
            })
        results.sort(key=lambda x: x["overall_similarity"], reverse=True)
        return {"candidates": results}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/similarity_service.py
git commit -m "refactor: migrate SimilarityService to LLMClient"
```

---

### Task 5: 迁移 InnovationService

**Files:**
- Modify: `backend/app/services/innovation_service.py`

- [ ] **Step 1: 将 InnovationService 改为使用 LLMClient**

将 `backend/app/services/innovation_service.py` 修改为：

```python
import json
from app.llm.client import LLMClient, get_llm_client
from app.config import settings
from sqlalchemy.ext.asyncio import AsyncSession

INNOVATION_PROMPT = """
请对以下参赛材料申报的创新点进行六维评估，返回 JSON（仅返回 JSON，不要其他内容）：
{
  "problem_definition_innovation": 0.0,
  "method_innovation": 0.0,
  "architecture_innovation": 0.0,
  "scenario_migration_innovation": 0.0,
  "engineering_optimization_innovation": 0.0,
  "combination_innovation": 0.0,
  "overall_innovation_score": 0.0,
  "risk_flags": ["风险提示列表"],
  "explanation": "详细说明"
}

评估规则：
- 各维度 0.0-1.0 分值
- 若创新点与候选方案高度重叠，对应维度得分低于 0.3
- 若存在明确新增机制或显著性能突破，得分可达 0.7 以上
- overall_innovation_score = 六维加权均值 - 重叠惩罚项（取值范围 0-1）
- risk_flags 列举可能被质疑为套壳的具体点

方案实质：
{essence}

最相似候选方案（Top-3）：
{top_candidates}
"""

INNOVATION_DIMS = [
    "problem_definition_innovation",
    "method_innovation",
    "architecture_innovation",
    "scenario_migration_innovation",
    "engineering_optimization_innovation",
    "combination_innovation",
]


class InnovationService:
    def __init__(self, llm: LLMClient | None = None):
        self.llm = llm or get_llm_client()

    async def _evaluate_with_llm(self, essence: dict, top_candidates: list[dict]) -> dict:
        prompt = INNOVATION_PROMPT.format(
            essence=json.dumps(essence, ensure_ascii=False),
            top_candidates=json.dumps(top_candidates[:3], ensure_ascii=False),
        )
        content = self.llm.chat(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
        )
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == 0:
            return {d: 0.0 for d in INNOVATION_DIMS} | {
                "overall_innovation_score": 0.0,
                "risk_flags": [],
                "explanation": "解析失败",
            }
        return json.loads(content[start:end])

    async def evaluate(
        self,
        db: AsyncSession,
        task_id: str,
        essence: dict,
        candidates: list[dict],
    ) -> dict:
        return await self._evaluate_with_llm(essence, candidates)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/innovation_service.py
git commit -m "refactor: migrate InnovationService to LLMClient"
```

---

### Task 6: 迁移 RetrievalService 和 ReportService

**Files:**
- Modify: `backend/app/services/retrieval_service.py`
- Modify: `backend/app/services/report_service.py`

- [ ] **Step 1: 迁移 RetrievalService**

将 `backend/app/services/retrieval_service.py` 中的：

```python
import anthropic
from app.config import settings
```

替换为：

```python
from app.llm.client import LLMClient, get_llm_client
from app.config import settings
```

将类定义中的 `__init__` 方法替换为：

```python
def __init__(self, llm: LLMClient | None = None):
    self.llm = llm or get_llm_client()
    self.vector_store = VectorStore()
    self.web_search = WebSearchSkill()
```

将 `_call_llm_for_queries` 方法中的 LLM 调用替换为：

```python
async def _call_llm_for_queries(self, essence: dict) -> list[str]:
    content = self.llm.chat(
        messages=[
            {
                "role": "user",
                "content": QUERY_GEN_PROMPT + json.dumps(essence, ensure_ascii=False),
            }
        ],
        max_tokens=512,
    )
    content = content.strip()
    start = content.find("[")
    end = content.rfind("]") + 1
    if start == -1 or end == 0:
        return [essence.get("problem", {}).get("summary", "")]
    return json.loads(content[start:end])
```

- [ ] **Step 2: 迁移 ReportService**

将 `backend/app/services/report_service.py` 中的：

```python
import anthropic
from app.config import settings
```

替换为：

```python
from app.llm.client import LLMClient, get_llm_client
from app.config import settings
```

将类 `__init__` 改为：

```python
def __init__(self, llm: LLMClient | None = None):
    self.llm = llm or get_llm_client()
```

将 `generate` 方法中的 LLM 调用替换为：

```python
summary = self.llm.chat(
    messages=[{"role": "user", "content": prompt}],
    max_tokens=1024,
)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/retrieval_service.py backend/app/services/report_service.py
git commit -m "refactor: migrate RetrievalService and ReportService to LLMClient"
```

---

## Chunk 3: 验证与文档

### Task 7: 运行现有测试套件

- [ ] **Step 1: 安装新依赖**

```bash
cd backend && pip install litellm openai google-generativeai
```

- [ ] **Step 2: 运行所有测试**

```bash
cd backend && python -m pytest tests/ -v --tb=short
```

期望：所有现有测试通过（`import anthropic` 直接调用已被替换）

- [ ] **Step 3: 检查无遗漏的 anthropic 直接调用**

```bash
grep -r "anthropic.Anthropic\|self.client = anthropic" backend/app/
```

期望：无输出（所有直接 anthropic 调用已被迁移）

- [ ] **Step 4: Commit（如有修复）**

```bash
git add -p
git commit -m "fix: resolve remaining anthropic direct usage"
```

---

### Task 8: 更新 CLAUDE.md 和 USAGE.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `USAGE.md`（如存在）

- [ ] **Step 1: 更新 CLAUDE.md 中的 LLM 配置说明**

在 CLAUDE.md 中添加：

```markdown
## LLM 提供商配置

系统通过 `LLM_MODEL` 环境变量支持任意 AI 提供商，格式为 `<provider>/<model>`：

| 提供商 | 示例值 | 所需 Key |
|--------|--------|----------|
| Anthropic | `anthropic/claude-sonnet-4-6` | `ANTHROPIC_API_KEY` |
| OpenAI | `openai/gpt-4o` | `OPENAI_API_KEY` |
| Google | `gemini/gemini-1.5-pro` | `GEMINI_API_KEY` |
| Mistral | `mistral/mistral-large-latest` | `MISTRAL_API_KEY` |
| DeepSeek | `deepseek/deepseek-chat` | `DEEPSEEK_API_KEY` |
| Azure OpenAI | `azure/<deployment>` | `AZURE_API_KEY` + `AZURE_API_BASE` |

完整提供商列表见 [litellm 文档](https://docs.litellm.ai/docs/providers)。
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add multi-provider LLM configuration guide"
```
