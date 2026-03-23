import httpx
from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry

REQUEST_TIMEOUT = 30.0
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


class FileFetchSkill(BaseSkill):
    name = "file-fetch-skill"
    description = "从 URL 下载文件内容，返回字节大小与来源信息"
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
                raise ValueError(f"文件过大: {len(content)} bytes (max {MAX_FILE_SIZE})")
            return SkillResult(success=True, data={"size": len(content), "url": url})

    async def fetch(self, url: str) -> bytes:
        """Legacy interface kept for backward compatibility."""
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            content = response.content
            if len(content) > MAX_FILE_SIZE:
                raise ValueError(f"File too large: {len(content)} bytes (max {MAX_FILE_SIZE})")
            return content


registry.register(FileFetchSkill())
