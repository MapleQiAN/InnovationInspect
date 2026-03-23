# 参赛资料查重与创新评估系统 - 使用文档

**版本**: v0.1.0 (2026-03-23)
**系统名称**: Challenge Cup Competition Review System (CC-Review)

---

## 📋 目录

1. [系统概述](#系统概述)
2. [快速开始](#快速开始)
3. [功能说明](#功能说明)
4. [用户界面指南](#用户界面指南)
5. [API 文档](#api-文档)
6. [常见问题](#常见问题)
7. [故障排查](#故障排查)

---

## 系统概述

### 什么是 CC-Review？

**CC-Review** 是一套智能化的参赛资料评审系统，专为挑战杯竞赛设计。它使用 AI 技术帮助专家评审团队：

- **查重**: 检测参赛作品与已有作品的相似度
- **创新度评估**: 从 6 个维度评价创新程度
- **智能检索**: 自动查找相关领域的已有研究和方案
- **专家协作**: 支持专家添加评审意见和结论

### 核心功能

| 功能 | 说明 |
|------|------|
| 📤 **文件上传** | 支持 PDF、Word、PPT、图片等多种格式 |
| 🔍 **内容解析** | 自动提取并整理文档内容 |
| 🧠 **实质提取** | AI 识别方案的核心要素（问题、方法、架构等） |
| 🔎 **相似度分析** | 对标已有作品，计算 5 个维度的相似度评分 |
| ⭐ **创新度评估** | 6 个维度综合评价创新程度及风险 |
| 📊 **生成报告** | 自动整理分析结果为专业报告 |
| 👥 **专家审核** | 专家可添加评论和最终结论 |

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面 (Next.js)                      │
│                     (浏览器: 3000 端口)                      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                   后端 API (FastAPI)                         │
│                   (8000 端口)                                │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  任务管理      │  │  报告生成    │  │  技能框架    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 文档解析     │  │ 相似度分析   │  │ 创新度评估   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬─────────────┐
        ↓            ↓            ↓             ↓
    PostgreSQL    Redis        MinIO         Qdrant
    (数据库)     (消息队列)   (文件存储)    (向量库)
```

---

## 快速开始

### 前置要求

- **操作系统**: Windows / macOS / Linux
- **软件依赖**:
  - Docker & Docker Compose (推荐)
  - 或者: Python 3.11+ / Node.js 20+ / PostgreSQL 15 / Redis 7

### 方案 A: 使用 Docker (推荐)

#### 1. 配置环境变量

复制 `.env.example` 为 `.env`:

```bash
cp .env.example .env
```

编辑 `.env` 文件，关键配置项:

```env
# Anthropic API (必需，用于 LLM 分析)
ANTHROPIC_API_KEY=your_api_key_here

# 数据库
DATABASE_URL=postgresql+asyncpg://ccreview:ccreview@postgres:5432/ccreview

# MinIO (对象存储)
MINIO_URL=http://minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Qdrant (向量数据库)
QDRANT_URL=http://qdrant:6333

# Redis
REDIS_URL=redis://redis:6379/0

# Frontend API 地址
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

#### 2. 启动所有服务

```bash
docker-compose up
```

服务启动顺序:
1. PostgreSQL (数据库)
2. Redis (消息队列)
3. MinIO (对象存储)
4. Qdrant (向量库)
5. Backend API (FastAPI)
6. Worker (Celery)
7. Frontend (Next.js)

#### 3. 初始化数据库

在另一个终端执行:

```bash
docker-compose exec backend alembic upgrade head
```

#### 4. 访问系统

打开浏览器访问: **http://localhost:3000**

---

### 方案 B: 本地开发环境

#### 后端部分

```bash
# 1. 进入后端目录
cd backend

# 2. 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 安装依赖
pip install -e .

# 4. 初始化数据库
alembic upgrade head

# 5. 启动 FastAPI 服务
uvicorn app.main:app --reload --port 8000
```

#### Worker 部分 (在新终端)

```bash
cd backend
source venv/bin/activate
celery -A app.workers.celery_app worker -l info
```

#### 前端部分 (在新终端)

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问: **http://localhost:3000**

---

## 功能说明

### 6 步分析流程

系统会自动执行以下步骤，每步可在前端实时看到进度:

#### 1️⃣ **文档解析** (parsing)

系统自动识别并提取上传文件的内容:

- **PDF**: 使用 PyMuPDF 提取文本
- **Word/PPT**: 使用 python-docx / python-pptx 提取
- **图片**: 使用 PaddleOCR 识别中文文字
- **混合格式**: 自动降级至 OCR

**输出**: 解析后的完整文本

---

#### 2️⃣ **实质提取** (extracting_essence)

AI 分析文档，提取核心要素，结构化为:

```json
{
  "problem": {
    "summary": "问题描述",
    "category": "问题分类",
    "target": "目标群体",
    "constraints": "约束条件"
  },
  "method": {
    "core_algorithms": ["算法1", "算法2"],
    "pipeline": "方案流程图描述",
    "models": "涉及的模型"
  },
  "architecture": {
    "modules": "系统模块组成",
    "interfaces": "接口说明",
    "deployment": "部署架构"
  },
  "innovation": {
    "claims": ["创新亮点1", "创新亮点2"],
    "types": ["算法创新", "应用创新"]
  },
  "evidence": {
    "references": ["参考1", "参考2"]
  }
}
```

**输出**: 结构化的方案实质

---

#### 3️⃣ **检索相似作品** (retrieving_candidates)

系统在两个来源查找相似的已有作品:

- **内部库**: 历年挑战杯获奖作品 (向量相似度搜索)
- **互联网**: 相关论文、开源项目、专利等

**搜索策略**:
- 从核心要素生成 5 条搜索查询
- 向量化检索 (Qdrant 向量库)
- Web 搜索 (Google / Bing 等)
- 自动去重，返回 Top 10 候选

**输出**: 相关作品列表 (标题、链接、摘要)

---

#### 4️⃣ **相似度分析** (analyzing_similarity)

对标每个候选作品，计算 5 个维度的相似度:

| 维度 | 说明 | 评分 |
|------|------|------|
| **问题相似度** | 解决的问题是否一样 | 0-100 |
| **方法相似度** | 采用的技术方法是否相似 | 0-100 |
| **架构相似度** | 系统设计方案是否相似 | 0-100 |
| **流程相似度** | 解决流程是否相近 | 0-100 |
| **证据一致性** | 参考资料和依据重合度 | 0-100 |

**综合相似度** = 5 个维度的加权平均

**输出**: 相似度评分矩阵

---

#### 5️⃣ **创新度评估** (evaluating_innovation)

从 6 个维度评价方案的创新程度:

| 维度 | 评估内容 |
|------|----------|
| **问题定义创新** | 是否定义了新的问题领域 |
| **方法创新** | 采用了哪些新技术或新思路 |
| **架构创新** | 系统设计的新颖性 |
| **场景迁移** | 是否适配到新场景或新领域 |
| **工程优化** | 实现的工程优化点 |
| **组合创新** | 现有技术的新组合方式 |

**创新度分数** = 综合评估 + 相似度惩罚

**风险标记** = 如果多个候选相似度高则标记风险

**输出**: 创新度评分和风险评估

---

#### 6️⃣ **生成报告** (generating_report)

系统综合前 5 步的结果，生成专业评审报告:

- **执行摘要**: AI 生成的 500 字核心总结
- **相似度结论**: 与已有作品的对标结果
- **创新度结论**: 6 个维度的创新评分和排名
- **风险提示**: 如有，标记潜在重复或风险点

**输出**: 完整评审报告

---

### 5 维相似度计算逻辑

```
整体相似度 = 0.2×问题 + 0.2×方法 + 0.25×架构 + 0.2×流程 + 0.15×证据
```

- **绿色** (0-20): 基本不相似，创新度较好
- **黄色** (20-50): 部分相似，有改进空间
- **红色** (50+): 高度相似，需要标记风险

---

### 6 维创新度评分

```
创新度 = 基础评分 × (1 - 相似度惩罚因子)

其中:
- 基础评分 = 6个维度加权评分
- 惩罚因子 = min(最高候选相似度, 0.8)
```

**评分含义**:
- **80+**: 优秀创新，完全新方向
- **60-80**: 较好创新，有明显新意
- **40-60**: 中等创新，改进空间大
- **20-40**: 创新度有限，重复度高
- **<20**: 低创新，建议重新评估

---

## 用户界面指南

### 主页面 - 文件上传

**URL**: http://localhost:3000

**界面功能**:

```
┌────────────────────────────────────────────┐
│  参赛资料查重与创新评估系统               │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │                                      │ │
│  │   拖拽文件到此处                     │ │
│  │   或点击选择文件                     │ │
│  │                                      │ │
│  │  支持格式: PDF / DOCX / PPTX        │ │
│  │           JPG / PNG / ZIP            │ │
│  │                                      │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ☑ 已选择 sample.pdf (2.3 MB)            │
│  ☑ 已选择 proposal.docx (1.1 MB)         │
│                                            │
│  [ 开始分析 ]                             │
│                                            │
└────────────────────────────────────────────┘
```

**使用步骤**:

1. **选择文件** (3 种方式):
   - 点击上传区域
   - 拖拽文件到上传区
   - 一次选择多个文件

2. **支持的文件类型**:
   - `*.pdf` - PDF 文档
   - `*.docx` - Word 文档
   - `*.pptx` - PowerPoint
   - `*.jpg`, `*.png` - 图片 (自动 OCR)
   - `*.zip` - 压缩包 (自动解压)

3. **点击 "开始分析"** - 跳转到进度页面

---

### 进度页面 - 分析进行中

**URL**: http://localhost:3000/tasks/{task_id}

**实时显示分析进度**:

```
┌────────────────────────────────────────────┐
│  任务编号: cc-task-20260323-001            │
│  状态: 处理中 ⏳                           │
├────────────────────────────────────────────┤
│                                            │
│  当前步骤: 相似度分析中...                 │
│                                            │
│  ✓ 文档解析           [完成]              │
│  ✓ 实质提取           [完成]              │
│  ✓ 相似作品检索       [完成]              │
│  ⏳ 相似度分析        [进行中]            │
│   ○ 创新度评估       [等待中]            │
│   ○ 生成报告         [等待中]            │
│                                            │
│  预计剩余时间: 2-3 分钟                   │
│                                            │
└────────────────────────────────────────────┘
```

**功能说明**:

- **实时刷新** - 每 3 秒自动更新进度
- **6 步跟踪** - 清晰展示当前所在阶段
- **错误提示** - 如分析失败会显示具体错误信息

**分析完成后**:

```
┌────────────────────────────────────────────┐
│  任务编号: cc-task-20260323-001            │
│  状态: 分析完成 ✓                         │
├────────────────────────────────────────────┤
│                                            │
│  📊 分析结果                               │
│                                            │
│  相似度评估:                               │
│  ┌──────────────────────────────────────┐ │
│  │ 候选 1: 智能家居系统                 │ │
│  │ 相似度: ███████░░░ 65% 📍           │ │
│  │ 来源: 2023 挑战杯全国一等奖          │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ 候选 2: 智能监测平台                 │ │
│  │ 相似度: █████░░░░░ 45% 📍           │ │
│  │ 来源: arXiv 论文                     │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  [查看详细报告]                           │
│                                            │
└────────────────────────────────────────────┘
```

---

### 报告页面 - 详细分析结果

**URL**: http://localhost:3000/reports/{report_id}

**报告结构**:

```
┌────────────────────────────────────────────┐
│  评审报告                                  │
│  报告编号: report-20260323-001             │
├────────────────────────────────────────────┤
│                                            │
│  📄 执行摘要                               │
│  ┌──────────────────────────────────────┐ │
│  │ 本方案针对校园安全监管提出了一套    │ │
│  │ 集感知、分析、预警于一体的智能化    │ │
│  │ 解决方案。经对标分析，与 2-3 个     │ │
│  │ 已有作品存在中等程度相似...          │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ⭐ 创新度评估 (总分: 72/100)              │
│  ┌──────────────────────────────────────┐ │
│  │ 问题定义创新度      ███████░░ 70   │ │
│  │ 方法创新度          ████████░ 75   │ │
│  │ 架构创新度          ███████░░ 70   │ │
│  │ 场景迁移能力        ██████░░░ 65   │ │
│  │ 工程优化能力        █████░░░░ 60   │ │
│  │ 组合创新能力        ███████░░ 72   │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  🔍 相似度分析 (与最相似作品对比)          │
│  ┌──────────────────────────────────────┐ │
│  │ 问题相似度          ████░░░░░ 35   │ │
│  │ 方法相似度          █████░░░░ 48   │ │
│  │ 架构相似度          ████░░░░░ 42   │ │
│  │ 流程相似度          ███░░░░░░ 30   │ │
│  │ 证据一致性          ██░░░░░░░ 20   │ │
│  │                                    │ │
│  │ 综合相似度          ████░░░░░ 38   │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ⚠️ 风险提示                               │
│  无风险标记，创新度充分。                 │
│                                            │
│  👤 专家评审                               │
│  ┌──────────────────────────────────────┐ │
│  │ 评审意见:                            │ │
│  │                                      │ │
│  │ [   输入您的评审意见...    ]          │ │
│  │                                      │ │
│  │                      [保存] [提交]  │ │
│  │                                      │ │
│  │ 已保存: 2026-03-23 14:30            │ │
│  └──────────────────────────────────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

**报告各部分说明**:

| 部分 | 说明 |
|------|------|
| **执行摘要** | AI 自动生成的 500 字核心总结 |
| **创新度评估** | 6 个维度的分数，总分 100 |
| **相似度分析** | 与最相似作品的 5 维对比 |
| **风险提示** | 是否存在高度重复或其他风险 |
| **专家评审** | 专家输入反馈和最终结论 |

---

### 技能浏览页面

**URL**: http://localhost:3000/skills

**功能**:

- 查看系统注册的所有 AI 技能
- 分为 **基础能力** 和 **核心能力** 两类
- 点击技能卡片进入详细页

**示例技能列表**:

```
基础能力
├─ 文件下载 (file-fetch)
├─ 图片识别 (ocr)
├─ 文档解析 (doc-parse)
└─ 网络搜索 (web-search)

核心能力
├─ 实质提取 (proposal-essence-extractor)
├─ 相似检索 (prior-art-retriever)
├─ 相似度分析 (solution-aligner)
└─ 创新评估 (novelty-evaluator)
```

---

### 技能执行页面

**URL**: http://localhost:3000/skills/{skill_name}

**功能**:

- 查看技能详细信息 (描述、输入参数)
- 手动执行技能进行测试
- 查看执行结果

**示例**:

```
技能: 网络搜索 (web-search)
┌────────────────────────────────────────────┐
│ 描述: 在互联网上搜索相关资料               │
│                                            │
│ 输入参数:                                  │
│                                            │
│ 搜索查询:                                  │
│ [  在线教育平台设计  ]                     │
│                                            │
│ 结果数量:                                  │
│ [  5  ]                                    │
│                                            │
│  [ 执行技能 ]                             │
│                                            │
├────────────────────────────────────────────┤
│ 执行结果 (用时: 2.3s) ✓                    │
│                                            │
│ 找到 5 个结果:                             │
│ 1. https://example.com/edu-platform       │
│ 2. https://github.com/project/learning    │
│ ...                                        │
│                                            │
└────────────────────────────────────────────┘
```

---

## API 文档

### 基础信息

- **Base URL**: `http://localhost:8000/api/v1`
- **认证**: 当前无认证 (后续可加 JWT)
- **Response Format**: JSON
- **Charset**: UTF-8

---

### 1. 任务管理

#### 创建分析任务

```http
POST /tasks
Content-Type: multipart/form-data

Request:
{
  "files": [
    (binary file),
    (binary file)
  ]
}

Response (201):
{
  "task_id": "cc-task-20260323-001",
  "status": "pending",
  "created_at": "2026-03-23T10:30:00Z",
  "message": "任务创建成功，已加入分析队列"
}

Response (400):
{
  "detail": "上传文件过大（最大 50MB）"
}
```

---

#### 查询任务状态

```http
GET /tasks/{task_id}

Response (200):
{
  "task_id": "cc-task-20260323-001",
  "status": "processing",
  "current_step": "analyzing_similarity",
  "created_at": "2026-03-23T10:30:00Z",
  "updated_at": "2026-03-23T10:35:15Z",
  "error_message": null
}

状态值:
- pending: 待处理
- processing: 处理中
- completed: 已完成
- failed: 失败
```

---

### 2. 结果查询

#### 获取任务结果

```http
GET /tasks/{task_id}/results

Response (200):
{
  "task_id": "cc-task-20260323-001",
  "essence": {
    "problem": {
      "summary": "校园安全监管",
      "category": "公共安全"
    },
    "method": { ... },
    "architecture": { ... },
    "innovation": { ... }
  },
  "top_candidates": [
    {
      "title": "智能家居系统",
      "url": "https://example.com",
      "similarity_scores": {
        "problem": 35,
        "method": 48,
        "architecture": 42,
        "flow": 30,
        "evidence": 20
      },
      "overall_similarity": 38
    }
  ],
  "report_id": "report-20260323-001"
}

Response (404):
{
  "detail": "任务不存在"
}
```

---

### 3. 报告管理

#### 获取报告

```http
GET /reports/{report_id}

Response (200):
{
  "report_id": "report-20260323-001",
  "task_id": "cc-task-20260323-001",
  "summary": "本方案针对校园安全...",
  "similarity_result": {
    "problem_similarity": 35,
    "method_similarity": 48,
    "architecture_similarity": 42,
    "flow_similarity": 30,
    "evidence_alignment": 20,
    "overall_similarity": 38
  },
  "innovation_result": {
    "problem_definition": 70,
    "method": 75,
    "architecture": 70,
    "scenario_migration": 65,
    "engineering_optimization": 60,
    "combination": 72,
    "overall_innovation_score": 72,
    "risk_flags": []
  },
  "conclusion": "创新度充分",
  "reviewer_comment": null,
  "created_at": "2026-03-23T10:40:00Z"
}
```

---

#### 添加专家评论

```http
POST /reports/{report_id}/review

Request:
{
  "reviewer_comment": "创新思路清晰，建议补充海外文献参考"
}

Response (200):
{
  "report_id": "report-20260323-001",
  "reviewer_comment": "创新思路清晰，建议补充海外文献参考",
  "updated_at": "2026-03-23T11:00:00Z"
}
```

---

### 4. 技能管理

#### 列出所有技能

```http
GET /skills

Response (200):
{
  "skills": [
    {
      "name": "file-fetch",
      "type": "basic",
      "description": "从 URL 下载文件",
      "input_schema": {
        "type": "object",
        "properties": {
          "url": { "type": "string" },
          "timeout": { "type": "integer" }
        }
      }
    },
    ...
  ]
}
```

---

#### 获取技能详情

```http
GET /skills/{skill_name}

Example: GET /skills/web-search

Response (200):
{
  "name": "web-search",
  "type": "basic",
  "description": "在互联网上搜索",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "limit": { "type": "integer", "default": 10 }
    },
    "required": ["query"]
  }
}
```

---

#### 执行技能

```http
POST /skills/{skill_name}/execute

Request:
{
  "inputs": {
    "query": "在线教育平台",
    "limit": 5
  }
}

Response (200):
{
  "skill_name": "web-search",
  "status": "success",
  "execution_time_ms": 2345,
  "result": {
    "results": [
      {
        "title": "XXX 在线教育",
        "url": "https://example.com",
        "summary": "..."
      }
    ]
  }
}

Response (400):
{
  "detail": "输入参数无效"
}
```

---

### 5. 系统健康检查

```http
GET /health

Response (200):
{
  "status": "ok",
  "timestamp": "2026-03-23T11:00:00Z"
}
```

---

## 常见问题

### Q1: 分析失败，显示 "Anthropic API Key 无效"

**A**:
1. 检查 `.env` 中 `ANTHROPIC_API_KEY` 是否配置
2. 确保 API Key 有效且未过期
3. 检查网络是否能访问 `api.anthropic.com`

```bash
# 验证 API Key
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.anthropic.com/v1/models
```

---

### Q2: 上传文件后没有反应

**A**:
1. 检查文件大小是否超过 50MB
2. 查看浏览器控制台是否有错误信息
3. 检查后端日志: `docker-compose logs backend`
4. 检查 MinIO 是否正常: `http://localhost:9001` (默认用户: minioadmin/minioadmin)

---

### Q3: 搜索结果为空

**A**:
1. 检查网络搜索 API 配置 (当前是占位符，需对接真实搜索接口)
2. 检查 Qdrant 向量库是否有数据
3. 查看后端日志了解具体原因

---

### Q4: 报告页面加载缓慢

**A**:
1. 检查 Qdrant 向量库性能: `http://localhost:6333/health`
2. 检查数据库连接: `docker-compose logs postgres`
3. 尝试增加 Worker 数量: `docker-compose up -d --scale worker=3`

---

### Q5: 如何重新开始分析？

**A**:
直接回到首页 (`http://localhost:3000`) 上传新文件，系统会自动分配新的 task_id。

---

### Q6: 如何导出报告？

**A**:
目前没有导出功能，可以：
1. 使用浏览器的 "打印" 功能，另存为 PDF
2. 或通过 API 获取报告 JSON 数据自行处理

---

### Q7: 支持多语言吗？

**A**:
当前系统主要优化中文文档。OCR 和文本分析都针对中文进行了优化。英文文档也可处理但效果可能一般。

---

### Q8: 分析一个文件需要多长时间？

**A**:
取决于文件大小和系统负载：
- **小文件** (< 2MB): 2-5 分钟
- **中等文件** (2-10MB): 5-10 分钟
- **大文件** (10-50MB): 10-20 分钟

可通过增加 Worker 数量加速。

---

## 故障排查

### 问题: Docker 启动失败

```bash
# 查看详细日志
docker-compose logs -f

# 重建镜像
docker-compose down
docker-compose build --no-cache
docker-compose up

# 清理所有数据并重新开始
docker-compose down -v
docker-compose up
```

---

### 问题: 数据库连接失败

```bash
# 检查 PostgreSQL
docker-compose exec postgres psql -U ccreview -d ccreview -c "SELECT 1"

# 检查连接字符串
echo $DATABASE_URL

# 重启数据库服务
docker-compose restart postgres
docker-compose exec backend alembic upgrade head
```

---

### 问题: 内存占用过高

```bash
# 查看各容器内存使用
docker stats

# 限制容器内存 (编辑 docker-compose.yml)
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G

# 重启应用
docker-compose up -d
```

---

### 问题: Worker 处理任务卡住

```bash
# 查看 Worker 状态
docker-compose exec worker celery -A app.workers.celery_app inspect active

# 查看 Worker 统计
docker-compose exec worker celery -A app.workers.celery_app inspect stats

# 重启 Worker
docker-compose restart worker

# 查看失败任务
docker-compose exec worker celery -A app.workers.celery_app inspect reserved
```

---

### 问题: API 返回 500 错误

```bash
# 查看后端日志
docker-compose logs -f backend

# 检查关键服务状态
curl http://localhost:8000/health
curl http://localhost:6333/health  # Qdrant
curl http://localhost:9000/health  # MinIO
```

---

## 高级配置

### 扩展 Worker 数量

```bash
# 启动 3 个 Worker 实例
docker-compose up -d --scale worker=3

# 查看 Worker 状态
docker-compose ps
```

---

### 修改分析超时时间

编辑 `backend/app/workers/analysis_tasks.py`:

```python
@celery_app.task(
    bind=True,
    max_retries=2,
    time_limit=1800,  # 修改此值 (秒)
    soft_time_limit=1700
)
def run_analysis(self, task_id: str):
    ...
```

---

### 调整 API 请求超时

编辑 `frontend/src/lib/api.ts`:

```typescript
const client = axios.create({
  baseURL: NEXT_PUBLIC_API_URL,
  timeout: 30000,  // 修改此值 (毫秒)
});
```

---

### 增加文件上传大小限制

编辑 `backend/app/main.py`:

```python
app = FastAPI()

# 修改此值 (字节)
@app.post("/api/v1/tasks/")
async def create_task(
    file: UploadFile = File(..., max_size=100*1024*1024)  # 100MB
):
    ...
```

---

## 获取帮助

如遇到问题，请：

1. **查看日志**: `docker-compose logs [service_name]`
2. **检查配置**: 确认 `.env` 文件配置正确
3. **测试 API**: 使用 Postman 或 curl 测试端点
4. **重启服务**: `docker-compose restart [service_name]`
5. **报告问题**: 提交 GitHub Issue

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 0.1.0 | 2026-03-23 | 初始版本，完成核心功能和 UI |

---

**最后更新**: 2026-03-23
**维护团队**: CC-Review 开发组
