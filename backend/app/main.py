from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1 import tasks as tasks_router

app = FastAPI(title="竞赛材料查重与创新评估系统", version="0.1.0")

MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    if request.method == "POST":
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_UPLOAD_SIZE:
            return JSONResponse(status_code=413, content={"detail": "文件大小超过 50MB 限制"})
    return await call_next(request)


app.include_router(tasks_router.router, prefix="/api/v1/tasks", tags=["tasks"])


@app.get("/health")
async def health():
    return {"status": "ok"}
