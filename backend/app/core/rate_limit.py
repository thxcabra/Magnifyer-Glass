"""Rate limiter shared across routes.

We define the Limiter in a tiny module of its own so that route files can
import the decorator without importing main.py (which would cause circular
imports). The limiter uses the client IP as the key.

NOTE on architecture: the Next.js frontend renders server-side, so all SSR
fetches reach this API from a *single* IP (the Next.js server), not the end
user. A global `default_limits` would therefore throttle the whole site's
SSR traffic collectively. We deliberately leave the global limit off and
apply per-route limits only on the heaviest / most abuse-prone public
endpoints (`/discovery`). If you deploy behind a proxy and want
true per-user limits, forward the real client IP via `X-Forwarded-For` and
swap `get_remote_address` for a header-aware key function, or whitelist the
SSR server's IP.

Mount in main.py with:
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# headers_enabled is deliberately OFF: when on, slowapi's per-route decorator
# tries to inject X-RateLimit-* headers directly into the endpoint return value
# and requires every decorated route to declare a `response: Response`
# parameter, raising at runtime otherwise. We don't need those advisory headers
# (the 429 body + status is enough), so we leave them off and keep route
# signatures clean.
limiter = Limiter(
    key_func=get_remote_address,
    headers_enabled=False,
)
