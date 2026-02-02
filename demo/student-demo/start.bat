@echo off
echo Starting Student Demo Environment...

echo [1/2] Starting Backend (Port 8001)...
start "Demo Backend" cmd /k "cd backend && pip install fastapi uvicorn redis confluent-kafka && python main.py"

echo [2/2] Starting UI (Port 3000)...
start "Demo UI" cmd /k "cd ui && npm install && npm run dev"

echo Done! Access the demo at http://localhost:3000
