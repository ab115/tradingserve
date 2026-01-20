# Context: Project Root (../../)

FROM python:3.11-slim as base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*
ENV PYTHONUNBUFFERED=1

FROM base as dev
COPY exchange/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY packages/py-core /packages/py-core
RUN pip install -e /packages/py-core
CMD ["python", "main.py"]

FROM base as builder
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY exchange/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY packages/py-core /packages/py-core
RUN pip install --no-cache-dir /packages/py-core

FROM python:3.11-slim as prod
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY exchange/backend .
# Create log dir if needed
RUN mkdir -p log
EXPOSE 8000
CMD ["python", "main.py"]
