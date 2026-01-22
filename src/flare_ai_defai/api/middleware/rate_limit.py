import time
from collections import defaultdict
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

import structlog

logger = structlog.get_logger(__name__)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Minimal in-memory rate limiting middleware.
    Limits requests based on client IP.
    """
    
    def __init__(
        self, 
        app: ASGIApp, 
        max_requests: int = 20, 
        window_seconds: int = 60,
        max_body_size: int = 1024 * 50 # 50KB limit for trust payloads
    ):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.max_body_size = max_body_size
        self.requests = defaultdict(list)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 1. Enforce Trust Layer constraints
        if request.url.path.startswith("/api/trust"):
            
            # Check content length if present
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > self.max_body_size:
                return Response("Request entity too large", status_code=413)

            # Rate Limiting Logic via IP
            client_ip = request.client.host if request.client else "unknown"
            now = time.time()
            
            # Clean old requests
            self.requests[client_ip] = [
                req_time for req_time in self.requests[client_ip]
                if req_time > now - self.window_seconds
            ]
            
            if len(self.requests[client_ip]) >= self.max_requests:
                logger.warning("rate_limit_exceeded", ip=client_ip)
                return Response("Too many requests", status_code=429)
                
            self.requests[client_ip].append(now)

        response = await call_next(request)
        return response
