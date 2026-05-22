"""Smoke tests: the app boots, security headers are applied, and the rate
limiter is wired. These guard the middleware stack against regressions like a
misconfigured limiter that only fails at request time."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_security_headers_present():
    res = client.get("/health")
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "strict-transport-security" in res.headers


def test_rate_limiter_wired():
    # slowapi's middleware reads app.state.limiter; if it's missing the
    # @limiter.limit decorators silently no-op.
    assert getattr(app.state, "limiter", None) is not None


def test_expected_routes_registered():
    paths = {getattr(route, "path", None) for route in app.routes}
    for expected in (
        "/health",
        "/discovery/prospects",
        "/live/scoreboard",
        "/live/standings",
        "/live/playoffs",
        "/news",
        "/game-log",
        "/photos/player",
    ):
        assert expected in paths
