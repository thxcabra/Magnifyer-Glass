"""Unit tests for the live-data normalizers and the standings/playoffs
derivations. Network is mocked so these run anywhere, fast and deterministic.
"""

from app.services import nba_live


def test_scoreboard_normalizes(monkeypatch):
    raw = {
        "scoreboard": {
            "gameDate": "2026-05-20",
            "games": [
                {
                    "gameId": "0042500301",
                    "gameStatus": 2,
                    "gameStatusText": "Q3",
                    "period": 3,
                    "gameClock": "PT05M12.00S",
                    "gameTimeUTC": "2026-05-20T23:30:00Z",
                    "homeTeam": {
                        "teamTricode": "OKC", "teamName": "Thunder",
                        "teamCity": "Oklahoma City", "wins": 1, "losses": 0, "score": 70,
                    },
                    "awayTeam": {
                        "teamTricode": "SAS", "teamName": "Spurs",
                        "teamCity": "San Antonio", "wins": 0, "losses": 1, "score": 65,
                    },
                    "gameLeaders": {
                        "homeLeaders": {"name": "Shai Gilgeous-Alexander", "teamTricode": "OKC", "points": 28, "rebounds": 5, "assists": 6},
                        "awayLeaders": {"name": "Victor Wembanyama", "teamTricode": "SAS", "points": 24, "rebounds": 12, "assists": 3},
                    },
                }
            ],
        }
    }
    monkeypatch.setattr(nba_live, "_cached_get", lambda url, ttl: raw)

    sb = nba_live.get_scoreboard()
    assert sb["game_date"] == "2026-05-20"
    assert len(sb["games"]) == 1
    g = sb["games"][0]
    assert g["game_id"] == "0042500301"
    assert g["status"] == 2
    assert g["home"]["tricode"] == "OKC" and g["home"]["score"] == 70
    assert g["away"]["tricode"] == "SAS"
    assert g["leaders"]["home"]["name"] == "Shai Gilgeous-Alexander"


def test_scoreboard_empty_on_missing_data(monkeypatch):
    monkeypatch.setattr(nba_live, "_cached_get", lambda url, ttl: None)
    sb = nba_live.get_scoreboard()
    assert sb["games"] == []


def _sched(games):
    return {"game_dates": [{"game_date": "01/01/2026", "games": games}]}


def _reg(gid, home, hs, away, as_):
    return {
        "game_id": gid,
        "status": 3,
        "home": {"tricode": home, "name": home, "city": home, "score": hs},
        "away": {"tricode": away, "name": away, "city": away, "score": as_},
    }


def test_standings_counts_only_regular_season(monkeypatch):
    games = [
        _reg("0022500001", "BOS", 110, "NYK", 100),  # regular: BOS W, NYK L
        _reg("0022500002", "BOS", 99, "MIA", 105),  # regular: MIA W, BOS L
        _reg("0012500099", "LAL", 120, "GSW", 80),  # PRESEASON — must be ignored
        _reg("0022500003", "OKC", 130, "SAS", 120),  # West
    ]
    monkeypatch.setattr(nba_live, "get_schedule", lambda: _sched(games))

    st = nba_live.get_standings()
    east = {r["tricode"]: r for r in st["east"]}
    west = {r["tricode"]: r for r in st["west"]}
    assert east["BOS"]["wins"] == 1 and east["BOS"]["losses"] == 1
    assert east["NYK"]["losses"] == 1 and east["NYK"]["wins"] == 0
    assert east["MIA"]["wins"] == 1
    assert west["OKC"]["wins"] == 1 and west["SAS"]["losses"] == 1
    # Preseason ignored: LAL/GSW absent
    assert "LAL" not in west and "GSW" not in west
    # ranks assigned, sorted by win pct
    assert st["east"][0]["rank"] == 1


def test_playoffs_groups_series_and_winner(monkeypatch):
    # Round 1 East series NYK vs ATL, NYK wins 4-1
    games = [_reg(f"004250012{i}", "NYK", 110, "ATL", 100) for i in range(1, 5)]
    games.append(_reg("0042500125", "ATL", 100, "NYK", 90))  # ATL wins one
    monkeypatch.setattr(nba_live, "get_schedule", lambda: _sched(games))

    po = nba_live.get_playoffs()
    assert len(po["series"]) == 1
    s = po["series"][0]
    assert s["round"] == 1
    assert s["conference"] == "East"
    wins = {t["tricode"]: t["wins"] for t in s["teams"]}
    assert wins["NYK"] == 4 and wins["ATL"] == 1
    assert s["winner"] == "NYK"
