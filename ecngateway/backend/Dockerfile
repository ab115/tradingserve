# Context must be: Project Root (../../)

# ====================
# BASE
# ====================
FROM python:3.11-slim as base
WORKDIR /app
# Install system deps (gcc for QuickFIX, etc)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*
ENV PYTHONUNBUFFERED=1

# ====================
# DEV
# ====================
FROM base as dev
# Install dependencies from requirements
COPY ecngateway/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Copy and install shared package in editable mode
# We assume the 'packages' directory is mounted or copied in context
COPY packages/py-core /packages/py-core
RUN pip install -e /packages/py-core

# CMD is overridden by docker-compose usually, but provide a default
CMD ["python", "main.py"]

# ====================
# BUILDER (for Prod)
# ====================
FROM base as builder
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY ecngateway/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install shared package (non-editable)
COPY packages/py-core /packages/py-core
RUN pip install --no-cache-dir /packages/py-core

# ====================
# PROD
# ====================
FROM python:3.11-slim as prod
WORKDIR /app

# Copy venv
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY ecngateway/backend .

# Create log/store directories
RUN mkdir -p log store

# Expose ports
EXPOSE 8000
EXPOSE 9898

# Default command (can be overridden)
CMD ["python", "main.py"]
