"""NBA news via Google News RSS (free, no key, supports pt-BR queries).

We use the RSS *search* endpoint so the same code powers general, per-team and
per-player feeds just by changing the query. Results are cached briefly.
"""

from __future__ import annotations

import time
from email.utils import parsedate_to_datetime
from urllib.parse import quote
from xml.etree import ElementTree as ET

import httpx

_TTL = 900  # 15 min
_TIMEOUT = httpx.Timeout(8.0)
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
}

# Google News locale params per UI language.
_LOCALES = {
    "pt-BR": "hl=pt-BR&gl=BR&ceid=BR:pt-419",
    "en": "hl=en-US&gl=US&ceid=US:en",
}

# (query, limit, lang) -> (ts, items)
_cache: dict[str, tuple[float, list[dict]]] = {}


def _to_iso(rfc822: str | None) -> str | None:
    if not rfc822:
        return None
    try:
        return parsedate_to_datetime(rfc822).isoformat()
    except Exception:
        return None


def get_news(query: str, limit: int = 12, lang: str = "pt-BR") -> list[dict]:
    q = (query or "").strip() or "NBA"
    loc = _LOCALES.get(lang, _LOCALES["pt-BR"])
    key = f"{q}|{limit}|{lang}"
    now = time.monotonic()
    hit = _cache.get(key)
    if hit and now - hit[0] < _TTL:
        return hit[1]

    url = f"https://news.google.com/rss/search?q={quote(q)}&{loc}"
    items: list[dict] = []
    try:
        with httpx.Client(timeout=_TIMEOUT, headers=_HEADERS) as client:
            r = client.get(url)
            r.raise_for_status()
            root = ET.fromstring(r.content)
        for item in root.iter("item"):
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            if not title or not link:
                continue
            source_el = item.find("source")
            source = source_el.text.strip() if source_el is not None and source_el.text else None
            pub = item.findtext("pubDate")
            # Google News titles end with " - Source"; trim it when we already
            # have the source separately, for a cleaner headline.
            if source and title.endswith(f" - {source}"):
                title = title[: -(len(source) + 3)].strip()
            items.append(
                {
                    "title": title,
                    "link": link,
                    "source": source,
                    "published": _to_iso(pub),
                }
            )
            if len(items) >= limit:
                break
    except Exception:
        return hit[1] if hit else []

    _cache[key] = (now, items)
    return items
