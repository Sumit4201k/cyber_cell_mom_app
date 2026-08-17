#!/bin/bash

echo "===================================================================="
echo "  State Cyber Cell MoM Application - Cross-Platform Installer (macOS/Linux)"
echo "===================================================================="

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# 1. Check Python
if command -v python3 &> /dev/null; then
    PY_CMD="python3"
    echo "[OK] Found Python 3: $(python3 --version)"
elif command -v python &> /dev/null; then
    PY_CMD="python"
    echo "[OK] Found Python: $(python --version)"
else
    echo "[NOTICE] Python 3 not found. Creating virtualenv..."
    sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv || brew install python
    PY_CMD="python3"
fi

# 2. Setup Python virtual environment
echo "[2/4] Setting up Python virtual environment..."
cd "$SCRIPT_DIR/python-service"
$PY_CMD -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install fastapi uvicorn pydantic python-multipart requests
cd "$SCRIPT_DIR"

# 3. Setup Node Backend & Frontend
echo "[3/4] Installing Node.js backend and frontend packages..."
cd "$SCRIPT_DIR/backend" && npm install
cd "$SCRIPT_DIR/frontend" && npm install
cd "$SCRIPT_DIR" && npm install

echo "===================================================================="
echo "  SUCCESS! System setup complete. Run 'npm start' to launch."
echo "===================================================================="
