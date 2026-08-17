#!/bin/bash
echo "⚡ Starting State Cyber Cell MoM Application..."

if [ -d "venv" ]; then
  source venv/bin/activate
fi

cd python-service && python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
PYTHON_PID=$!
cd ..

cd backend && npm start &
NODE_PID=$!
cd ..

cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

trap "kill $PYTHON_PID $NODE_PID $FRONTEND_PID; exit" INT

echo "✨ Services started! Open http://localhost:5173"
wait
