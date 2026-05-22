"""Recent game-log assembly from schedule + box scores (both mocked)."""

from app.services import nba_live, player_gamelog


def _box(gid, home_tri, home_score, away_tri, away_score, players):
    return {
        "game_id": gid,
        "home": {"tricode": home_tri, "score": home_score, "players": players if home_tri == "DEN" else []},
        "away": {"tricode": away_tri, "score": away_score, "players": players if away_tri == "DEN" else []},
    }


def test_recent_games_assembles_player_lines(monkeypatch):
    schedule = {
        "game_dates": [
            {
                "games": [
                    {
                        "game_id": "0022500050",
                        "status": 3,
                        "game_time_utc": "2026-01-10T00:00:00Z",
                        "home": {"tricode": "DEN"},
                        "away": {"tricode": "LAL"},
                    },
                    {
                        "game_id": "0042500160",
                        "status": 3,
                        "game_time_utc": "2026-05-01T00:00:00Z",
                        "home": {"tricode": "MIN"},
                        "away": {"tricode": "DEN"},
                    },
                    # Different team — must be ignored
                    {
                        "game_id": "0022500051",
                        "status": 3,
                        "game_time_utc": "2026-01-12T00:00:00Z",
                        "home": {"tricode": "BOS"},
                        "away": {"tricode": "NYK"},
                    },
                ]
            }
        ]
    }
    jokic_line = {
        "person_id": 203999, "name": "Nikola Jokić", "minutes": "PT35M00.00S",
        "points": 30, "rebounds": 12, "assists": 10, "steals": 1, "blocks": 1,
        "fgm": 11, "fga": 18, "tpm": 1, "tpa": 3, "ftm": 7, "fta": 8, "plus_minus": 12,
    }
    boxes = {
        "0022500050": _box("0022500050", "DEN", 120, "LAL", 110, [jokic_line]),
        "0042500160": _box("0042500160", "MIN", 105, "DEN", 99, [jokic_line]),
    }
    monkeypatch.setattr(nba_live, "get_schedule", lambda: schedule)
    monkeypatch.setattr(nba_live, "get_boxscore", lambda gid: boxes.get(gid))
    player_gamelog._cache.clear()

    games = player_gamelog.get_recent_games(203999, "DEN", limit=10)
    assert len(games) == 2
    # Most recent first (2026-05-01 before 2026-01-10)
    assert games[0]["game_id"] == "0042500160"
    assert games[0]["matchup"] == "DEN @ MIN"
    assert games[0]["wl"] == "L"  # DEN 99 < MIN 105
    assert games[1]["matchup"] == "DEN vs LAL"
    assert games[1]["wl"] == "W"  # DEN 120 > LAL 110
    assert games[0]["pts"] == 30 and games[0]["ast"] == 10


def test_recent_games_empty_without_team(monkeypatch):
    monkeypatch.setattr(nba_live, "get_schedule", lambda: {"game_dates": []})
    player_gamelog._cache.clear()
    assert player_gamelog.get_recent_games(203999, "", limit=5) == []
