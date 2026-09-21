#!/bin/bash
set -e

echo "===================================================================="
echo "  STATE CYBER CELL MANAGEMENT SUITE — INSTALLER (macOS / Linux)"
echo "===================================================================="

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# 1. Detect Python
if command -v python3 &> /dev/null; then
    PY_CMD="python3"
    echo "[OK] Found Python 3: $($PY_CMD --version)"
elif command -v python &> /dev/null; then
    PY_CMD="python"
    echo "[OK] Found Python: $($PY_CMD --version)"
else
    echo "[ERROR] Python 3.10+ is required. Please install Python 3."
    exit 1
fi

# 2. Setup Python virtual environment
echo "[1/3] Setting up Python virtual environment & AI Dependencies..."
cd "$PROJECT_DIR/python-service"
if [ ! -d "venv" ]; then
    $PY_CMD -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python -m spacy download en_core_web_sm
deactivate
cd "$PROJECT_DIR"

# 3. Setup Node Backend & Frontend
echo "[2/3] Installing Node.js dependencies..."
cd "$PROJECT_DIR/backend" && npm install
cd "$PROJECT_DIR/frontend" && npm install
cd "$PROJECT_DIR" && npm install

# 4. Self-QA Verification
echo "[3/3] Running Cryptographic Ledger & RBAC QA Suite..."
node "$PROJECT_DIR/backend/test_qa_suite.js"

echo ""
echo "===================================================================="
echo "  SUCCESS! System setup complete."
echo "  To start the application, run: ./run.sh  or  npm run start:full"
echo "  Or via Docker: npm run docker:up"
echo "===================================================================="
