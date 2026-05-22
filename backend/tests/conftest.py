"""Shared test setup.

`app.main` calls `get_settings()` at import time, which requires the Supabase
env vars to exist. We set harmless dummy values here — collected before any
test module imports `app.main` — so imports succeed. The smoke tests only hit
`/health`, which never constructs a Supabase client, so the dummy values are
never used to make a real connection.
"""

import os

os.environ.setdefault("SUPABASE_URL", "https://dummy.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "dummy-service-key")
