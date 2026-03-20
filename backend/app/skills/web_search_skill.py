ALLOWED_DOMAINS = [
    "arxiv.org", "github.com", "scholar.google.com",
    "patents.google.com", "ieee.org", "acm.org",
    "cnki.net", "wanfangdata.com.cn",
]

MAX_RESULTS = 10
REQUEST_TIMEOUT = 10.0


class WebSearchSkill:
    """
    Web search skill. In production, connect to SerpAPI / Bing Search API.
    Returns empty list in development (no API key configured).
    """

    async def search(self, query: str, limit: int = 5) -> list[dict]:
        # TODO: Connect to real search API (SerpAPI / Bing Search API)
        # Results must be filtered to allowed domains only
        return []

    def _is_allowed(self, url: str) -> bool:
        return any(domain in url for domain in ALLOWED_DOMAINS)
