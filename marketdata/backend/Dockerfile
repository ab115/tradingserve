# Context: Project Root (../../)

# ====================
# BASE
# ====================
FROM python:3.11-slim as base
WORKDIR /app
# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*
ENV PYTHONUNBUFFERED=1

# ====================
# DEV
# ====================
FROM base as dev
COPY marketdata/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY packages/py-core /packages/py-core
RUN pip install -e /packages/py-core
CMD ["python", "main.py"]

# ====================
# BUILDER (Prod)
# ====================
FROM base as builder
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY marketdata/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install shared package (non-editable)
COPY packages/py-core /packages/py-core
RUN pip install --no-cache-dir /packages/py-core

# ====================
# PROD
# ====================
FROM python:3.11-slim as prod
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY marketdata/backend .
RUN mkdir -p log
EXPOSE 9001
CMD ["python", "main.py"]
