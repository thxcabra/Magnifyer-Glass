"""News RSS parsing — network mocked with a sample feed."""

from app.services import news as news_service

SAMPLE_RSS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>NBA - Google News</title>
<item>
  <title>Jokic shines in win - ESPN</title>
  <link>https://news.google.com/articles/aaa</link>
  <pubDate>Wed, 20 May 2026 12:00:00 GMT</pubDate>
  <source url="http://espn.com">ESPN</source>
</item>
<item>
  <title>Trade rumors heat up - Lance!</title>
  <link>https://news.google.com/articles/bbb</link>
  <pubDate>Wed, 20 May 2026 10:00:00 GMT</pubDate>
  <source url="http://lance.com.br">Lance!</source>
</item>
</channel></rss>"""


class _FakeResp:
    content = SAMPLE_RSS

    def raise_for_status(self):
        return None


class _FakeClient:
    def __init__(self, *a, **k):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def get(self, url):
        _FakeClient.last_url = url
        return _FakeResp()


def test_news_parses_and_trims_source(monkeypatch):
    monkeypatch.setattr(news_service.httpx, "Client", _FakeClient)
    news_service._cache.clear()

    items = news_service.get_news("Nikola Jokic", limit=10, lang="pt-BR")
    assert len(items) == 2
    # " - Source" suffix trimmed from the headline
    assert items[0]["title"] == "Jokic shines in win"
    assert items[0]["source"] == "ESPN"
    assert items[0]["link"].endswith("aaa")
    # pubDate parsed to ISO
    assert items[0]["published"] and items[0]["published"].startswith("2026-05-20")
    # pt-BR locale params used in the request
    assert "hl=pt-BR" in _FakeClient.last_url


def test_news_locale_switches_to_english(monkeypatch):
    monkeypatch.setattr(news_service.httpx, "Client", _FakeClient)
    news_service._cache.clear()
    news_service.get_news("NBA", limit=5, lang="en")
    assert "hl=en-US" in _FakeClient.last_url


def test_news_respects_limit(monkeypatch):
    monkeypatch.setattr(news_service.httpx, "Client", _FakeClient)
    news_service._cache.clear()
    items = news_service.get_news("NBA", limit=1, lang="pt-BR")
    assert len(items) == 1
