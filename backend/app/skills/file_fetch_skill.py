import httpx

REQUEST_TIMEOUT = 30.0
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


class FileFetchSkill:
    """Download files from URLs for analysis."""

    async def fetch(self, url: str) -> bytes:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            content = response.content
            if len(content) > MAX_FILE_SIZE:
                raise ValueError(f"File too large: {len(content)} bytes (max {MAX_FILE_SIZE})")
            return content
