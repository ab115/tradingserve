# Market Maker Application - Developer Guide

This document provides technical details for developers working on the `marketmaker` application.

## Overview
The **Market Maker** application simulates a market making desk. It consumes real-time market data, manages specific stock positions, allows adding new tickers, and displays PnL updates in real-time via a reactive UI.

## Architecture

### Backend (`/backend`)
- **Framework**: Python FastAPI
- **Data Source**: Redis PubSub (`market_data_updates` channel) from `marketdata` service.
- **Storage**: Redis Hashes (`marketmaker:position:{ticker}`) for persisting position state (quantity, avg price).
- **Communication**:
    - **REST API**: For managing positions (`/positions`, `/positions/add`, `/positions/update`) running on internal port `8001` (mapped to host `9000`).
    - **WebSockets**: For broadcasting real-time PnL and price updates to the frontend (`/ws`).
- **Key Components**:
    - `market_data_worker.py`: Subscribes to Redis and updates position values atomically.
    - `market_data_service.py`: Fetches initial price snapshots.
    - `position_manager.py`: CRUD operations for positions.

### Frontend (`/frontend`)
- **Framework**: React + Vite + TypeScript
- **State Management**: React Hooks (`useState`, `useEffect`)
- **Grid Component**: AG Grid React for the blotter.
- **Styling**: Standard CSS with `flash-green`/`flash-red` animations for price ticks.
- **Proxy**: Vite proxy handles `/api` and `/ws` requests, forwarding them to the backend service.

### Infrastructure
- **Docker Compose**: Orchestrates `marketmaker-backend` and `marketmaker-ui`.
- **Network**: Connects to `fintech_net` (external) to reach the shared Redis instance (`fintech_redis`).

## Setup & Running

### Prerequisites
- Docker & Docker Compose
- `fintech_redis` container running (part of shared infrastructure).

### Quick Start
1. **Start Infrastructure**: Ensure Redis is up.
   ```bash
   docker start fintech_redis
   ```
2. **Launch App**:
   ```bash
   cd tmpscalegrad/tradingserver/marketmaker
   docker-compose up -d --build
   ```
3. **Access**:
   - UI: [http://localhost:3002](http://localhost:3002)
   - API Docs: [http://localhost:9000/docs](http://localhost:9000/docs)

## Key Workflows

### 1. Market Data Ingestion
The app does **not** fetch data from external APIs (like Yahoo Finance) directly. Instead:
1. The `marketdata` infrastructure service fetches prices and publishes them to the `market_data_updates` Redis channel.
2. `MarketDataWorker` (in `backend/market_data_worker.py`) subscribes to this channel.
3. On receiving an update:
   - It calculates the new PnL based on current Quantity and Avg Price.
   - Updates the Redis Hash `marketmaker:position:{ticker}`.
   - Broadcasts the updated Position object to connected WebSocket clients.

### 2. Adding a Ticker
1. User enters a ticker (e.g., "AAPL") in the UI.
2. Frontend calls `POST /positions/add`.
3. Backend initializes the position in Redis with default quantity/price if not exists.
4. `MarketDataWorker` will pick up updates for this ticker from the Redis stream automatically.

## Debugging

### Logs
Check backend logs for subscription status:
```bash
docker logs -f marketmaker-backend
```
*Expected: "Subscribed to Redis channel: market_data_updates"*

### Common Issues
- **No Data / Stale Prices**:
  - Check if `marketdata-backend` is running and publishing.
  - Restart it: `docker restart marketdata-backend`.
- **WebSocket Error**:
  - Ensure you are accessing via `localhost:3002` (Frontend) so the proxy works. accessing `localhost:9000` directly for WS might fail due to CORS or network routing if not configured.

## Configuration
Environment variables in `docker-compose.yml`:
- `REDIS_HOST`: Hostname of the Redis service (`fintech_redis`).
- `BACKEND_URL`: URL for the frontend proxy to verify (internal docker service name).
