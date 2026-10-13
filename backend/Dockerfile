# Slim web image — no Chromium/pandas (those live in the jobs, which
# run off-platform). Small + fast cold starts, friendly to free tiers.
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements-web.txt .
RUN pip install -r requirements-web.txt

COPY app ./app

EXPOSE 8000

# $PORT is injected by most hosts (Render/Railway/Fly); default to 8000 locally.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
