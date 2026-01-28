# Level 2: The Container (Docker)

> **Job Track**: 📦 DevOps / Platform Engineer

## Objective
**Containerize your Bot.**
"It works on my machine" is not a valid excuse in Finance. You need to package your trading bot into a standard unit (Container) that runs identically on your laptop, the server, and the cloud.

## 🎯 Skills Learned
- `Dockerfile`
- `Docker Compose`
- `Container Lifecycle`
- `Environment Variables`

## The Mission
You wrote a bot in Level 1. Now, package it so we can ship it.

## Lab Instructions

### Step 1: Create a Dockerfile
In your `algo-bot` repository, create a file named `Dockerfile` (no extension):

```dockerfile
# Use a lightweight Python image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements (if any)
# COPY requirements.txt .
# RUN pip install -r requirements.txt

# Copy the bot code
COPY bot.py .

# Command to run the bot
CMD ["python", "bot.py"]
```

### Step 2: Build the Image
```bash
docker build -t my-algo-bot .
```

### Step 3: Run the Container
```bash
docker run --rm my-algo-bot
```
It should print your bot's output and exit.

### Step 4: Define Services (Docker Compose)
Real apps have dependencies. Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  bot:
    build: .
    environment:
      - SIGNAL_THRESHOLD=100
    # Keep it running for inspection
    command: python -c "import time; time.sleep(3600)"
```

### Step 5: Boot Up
```bash
docker compose up -d
docker compose ps
```

## Outcome
Your code is now portable. You can run `docker compose up` on any machine to start your trading system.
