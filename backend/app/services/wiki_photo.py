"""Free, legally-usable player photos from Wikimedia Commons.

Pipeline per player name:
  1. Wikipedia REST summary -> lead image (often an in-game action shot) +
     a short description we use to guard against same-name false matches.
  2. Commons imageinfo -> author + license (CC-BY / CC-BY-SA usually), which
     we MUST surface as attribution.

Everything is cached in-memory with a long TTL (images rarely change) and the
service degrades to None on any failure, so the UI just falls back to the
team-colored banner.
"""

from __future__ import annotations

import re
import time
from typing import Any
from urllib.parse import quote, unquote

import httpx

_UA = "MagnifyerGlass/1.0 (NBA fan site; contact: admin@magnifyerglass.app)"
_HEADERS = {"User-Agent": _UA, "Accept": "application/json"}
_TIMEOUT = httpx.Timeout(6.0)
_TTL = 60 * 60 * 24  # 24h

# name -> (monotonic_ts, payload|None)
_cache: dict[str, tuple[float, Any]] = {}

_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(s: str | None) -> str | None:
    if not s:
        return None
    text = _TAG_RE.sub("", s).strip()
    return text or None


def _commons_license(image_url: str) -> dict[str, Any]:
    """Fetch author + license for a Commons file from its upload URL."""
    filename = unquote(image_url.rsplit("/", 1)[-1])
    out: dict[str, Any] = {
        "author": None,
        "license": None,
        "license_url": None,
        "source_url": f"https://commons.wikimedia.org/wiki/File:{quote(filename)}",
    }
    try:
        with httpx.Client(timeout=_TIMEOUT, headers=_HEADERS) as client:
            r = client.get(
                "https://commons.wikimedia.org/w/api.php",
                params={
                    "action": "query",
                    "prop": "imageinfo",
                    "iiprop": "extmetadata",
                    "titles": f"File:{filename}",
                    "format": "json",
                },
            )
            r.raise_for_status()
            pages = (r.json().get("query") or {}).get("pages") or {}
            for page in pages.values():
                info = (page.get("imageinfo") or [{}])[0]
                meta = info.get("extmetadata") or {}
                out["author"] = _strip_html((meta.get("Artist") or {}).get("value"))
                out["license"] = (meta.get("LicenseShortName") or {}).get("value")
                out["license_url"] = (meta.get("LicenseUrl") or {}).get("value")
                break
    except Exception:
        pass
    return out


def get_player_photo(name: str) -> dict[str, Any] | None:
    key = name.strip()
    if not key:
        return None
    now = time.monotonic()
    hit = _cache.get(key)
    if hit and now - hit[0] < _TTL:
        return hit[1]

    result: dict[str, Any] | None = None
    try:
        with httpx.Client(timeout=_TIMEOUT, headers=_HEADERS) as client:
            r = client.get(
                f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(key.replace(' ', '_'))}"
            )
            if r.status_code == 200:
                data = r.json()
                img = (data.get("originalimage") or {}).get("source")
                thumb = (data.get("thumbnail") or {}).get("source")
                # Guard against same-name non-athletes: the article should be
                # about basketball.
                blob = f"{data.get('description', '')} {data.get('extract', '')}".lower()
                if img and "basketball" in blob:
                    lic = _commons_license(img)
                    result = {
                        "url": img,
                        "thumb_url": thumb,
                        "author": lic["author"],
                        "license": lic["license"],
                        "license_url": lic["license_url"],
                        "source_url": lic["source_url"],
                        "wiki_url": (data.get("content_urls") or {})
                        .get("desktop", {})
                        .get("page"),
                    }
    except Exception:
        result = None

    _cache[key] = (now, result)
    return result
