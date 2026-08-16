import time
from collections import defaultdict

from fastapi import HTTPException, Request, status


class RateLimiter:
    """Minimal in-memory sliding-window limiter for sensitive endpoints (login, etc).

    Not distributed - fine for a single-process dev/small deployment. Swap for a
    Redis-backed limiter if the app is ever run with multiple worker processes.
    """

    def __init__(self, max_calls: int, period_seconds: int) -> None:
        self.max_calls = max_calls
        self.period_seconds = period_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def __call__(self, request: Request) -> None:
        key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        window_start = now - self.period_seconds
        hits = [t for t in self._hits[key] if t > window_start]
        if len(hits) >= self.max_calls:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Please try again later.")
        hits.append(now)
        self._hits[key] = hits


login_rate_limiter = RateLimiter(max_calls=10, period_seconds=60)
student_login_rate_limiter = RateLimiter(max_calls=20, period_seconds=60)
mcq_parse_rate_limiter = RateLimiter(max_calls=5, period_seconds=60)
