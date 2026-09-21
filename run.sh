#!/bin/bash
echo "===================================================================="
echo "  STATE CYBER CELL MANAGEMENT SUITE — LAUNCHER (macOS / Linux)"
echo "===================================================================="

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$PROJECT_DIR"

# 1. Start Python ML Microservice
echo "[*] Starting Python AI Microservice on Port 8000..."
if [ -d "$PROJECT_DIR/python-service/venv" ]; then
  source "$PROJECT_DIR/python-service/venv/bin/activate"
fi
cd "$PROJECT_DIR/python-service"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
PYTHON_PID=$!
cd "$PROJECT_DIR"

# 2. Start Express Backend
echo "[*] Starting Node.js Backend API on Port 5000..."
cd "$PROJECT_DIR/backend"
npm start &
NODE_PID=$!
cd "$PROJECT_DIR"

# 3. Start Vite Frontend
echo "[*] Starting React Frontend on Port 5173..."
cd "$PROJECT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
cd "$PROJECT_DIR"

trap "echo 'Shutting down services...'; kill $PYTHON_PID $NODE_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM EXIT

echo ""
echo "===================================================================="
echo "  All 3 Microservices Online!"
echo "  Web Terminal UI: http://localhost:5173"
echo "  Press Ctrl+C to terminate all services."
echo "===================================================================="
echo ""

wait

