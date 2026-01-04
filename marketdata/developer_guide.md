# Market Data Module - Developer Guide

This module provides real-time market data (simulated or proxy) via a FastAPI backend and visualizes it using a React/Vite frontend.

## 📂 Project Structure

```text
marketdata/
├── backend/            # FastAPI Server (Python)
│   ├── main.py         # Entry point
│   ├── provider.py     # Data fetching logic
│   └── ...
├── ui/                 # Frontend App (React + Vite)
│   ├── src/            # Components & Logic
│   └── ...
├── tests/              # Test scripts & Debug tools
└── docker-compose.yml  # Container orchestration
```

## 🚀 Getting Started (Docker)

The easiest way to run the entire stack is using Docker Compose.

### Prerequisites
*   Docker & Docker Compose installed.

### Run Command
From the `marketdata` directory:
```bash
docker-compose up --build
```

### Access Points
*   **UI Dashboard**: [http://localhost:3001](http://localhost:3001)
*   **API Docs**: [http://localhost:9001/docs](http://localhost:9001/docs)
*   **API Health**: [http://localhost:9001/health](http://localhost:9001/health)

---

## 🛠 Manual Setup (Local Development)

If you prefer to run services locally without Docker:

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 9001 --reload
```

### 2. Frontend
```bash
cd ui
npm install
npm run dev -- --port 3001
```

---

## 🧪 Testing

Test scripts are located in the `tests/` directory.

### Running Tests
Make sure the backend is running (either via Docker or locally), then:

```bash
cd tests
python test_all_endpoints.py
```

### Debugging News/YahooQuery
Scripts like `debug_news_data.py` help isolate issues with the external data provider.

---

## 🧩 Architecture Notes

### Backend
*   **Framework**: FastAPI
*   **Data Source**: `yahooquery` (acting as a proxy for Yahoo Finance data).
*   **WebSockets**:
    *   `/ws/marketdata`: Streaming price updates.
    *   `/ws/news/{ticker}`: Real-time news headlines.
    *   `/ws/sector/{ticker}`: Static company profile data.
*   **Architecture**: Uses a cyclic fetching loop in `main.py` (via `provider.py`) to batch update tickers and broadcast diffs.

### Frontend
*   **Framework**: React (Vite)
*   **State**: Local component state (lifted to `App.tsx` for selection).
*   **Communication**: `react-use-websocket` connects to backend WS endpoints.
*   **Charting**: TradingView Advanced Real-Time Chart Widget.
