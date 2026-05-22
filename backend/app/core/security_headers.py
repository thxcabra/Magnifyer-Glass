"""ASGI middleware that adds common security response headers.

The API doesn't render HTML, so we skip Content-Security-Policy (no scripts
to lock down) and X-XSS-Protection (deprecated). The remaining headers are
defensive: they protect against MIME sniffing, clickjacking, and over-eager
referrer leakage, and they hint to browsers + proxies that responses are
always meant to be served over HTTPS in production.
"""

from starlette.types import ASGIApp, Message, Receive, Scope, Send


_HEADERS: list[tuple[bytes, bytes]] = [
    (b"strict-transport-security", b"max-age=63072000; includeSubDomains"),
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"strict-origin-when-cross-origin"),
    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
    (b"cross-origin-opener-policy", b"same-origin"),
    (b"cross-origin-resource-policy", b"cross-origin"),
]


class SecurityHeadersMiddleware:
    """Append a fixed set of security headers to every HTTP response."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                existing = {k.lower(): v for k, v in message.get("headers", [])}
                merged = list(message.get("headers", []))
                for name, value in _HEADERS:
                    if name not in existing:
                        merged.append((name, value))
                message["headers"] = merged
            await send(message)

        await self.app(scope, receive, send_with_headers)
