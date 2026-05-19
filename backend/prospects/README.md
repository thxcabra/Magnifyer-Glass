# Prospect manifests

Each JSON file in this directory is a list of prospect entries for a single draft class. The batch scraper reads them with:

```powershell
python -m app.scrapers.ncaa_batch --manifest prospects\2025.json
```

## Entry shape

```json
{
  "name": "Cooper Flagg",
  "sr_slug": "cooper-flagg-1",
  "position": "F",
  "draft_class": 2025,
  "college": "Duke"
}
```

- `sr_slug` is the URL slug at `sports-reference.com/cbb/players/<slug>.html`. Find it by searching the player's name on Sports-Reference and copying the slug from the URL. The trailing `-1` / `-2` disambiguates namesakes.
- `position` follows the `player_position` enum: `G`, `PG`, `SG`, `SF`, `PF`, `F`, `C`, `G-F`, `F-G`, `F-C`, `C-F`.
- `draft_class` is the year of the draft the player is eligible for.
- International prospects use a separate manifest format wired to `intl_batch` (TBD).
