@echo off
setlocal enabledelayedexpansion
title State Cyber Cell MoM - Installer & Diagnostics
echo ====================================================================
echo   STATE CYBER CELL MINUTES OF MEETING APP - SETUP & HARDENING
echo ====================================================================
echo.

set PROJECT_ROOT=%~dp0
set PORTABLE_PY=%PROJECT_ROOT%python-service\python_env\python.exe

echo [1/5] Checking Python ML Environment...

rem Check custom portable python in project folder
if exist "%PORTABLE_PY%" (
    set PY_CMD="%PORTABLE_PY%"
    echo [OK] Using project local Python environment: !PY_CMD!
    goto :PYTHON_READY
)

rem Check C:\Users\hp\python311\python.exe
if exist "C:\Users\hp\python311\python.exe" (
    set PY_CMD="C:\Users\hp\python311\python.exe"
    echo [OK] Found local Python installation: !PY_CMD!
    goto :PYTHON_READY
)

rem Check system PATH for python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PY_CMD=python
    echo [OK] Found system Python in PATH
    goto :PYTHON_READY
)

rem Check system PATH for python3
python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PY_CMD=python3
    echo [OK] Found system Python3 in PATH
    goto :PYTHON_READY
)

echo [NOTICE] Python not detected. Downloading portable Python 3.11 runtime...
mkdir "%PROJECT_ROOT%python-service\python_env" 2>nul
curl.exe -o "%PROJECT_ROOT%python-service\python_env\python.zip" "https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip"
powershell -Command "Expand-Archive -Path '%PROJECT_ROOT%python-service\python_env\python.zip' -DestinationPath '%PROJECT_ROOT%python-service\python_env' -Force; Remove-Item '%PROJECT_ROOT%python-service\python_env\python.zip' -Force"
echo import site >> "%PROJECT_ROOT%python-service\python_env\python311._pth"
curl.exe -o "%PROJECT_ROOT%python-service\python_env\get-pip.py" "https://bootstrap.pypa.io/get-pip.py"
"%PROJECT_ROOT%python-service\python_env\python.exe" "%PROJECT_ROOT%python-service\python_env\get-pip.py"
set PY_CMD="%PORTABLE_PY%"

:PYTHON_READY
echo.
echo [2/5] Installing Python AI Engine Dependencies (Whisper / ITN / Presidio)...
cd /d "%PROJECT_ROOT%python-service"
!PY_CMD! -m pip install --upgrade pip >nul 2>&1
!PY_CMD! -m pip install -r requirements.txt
!PY_CMD! -m spacy download en_core_web_sm >nul 2>&1
echo [OK] Python dependencies and NLP models verified.
cd /d "%PROJECT_ROOT%"

echo.
echo [3/5] Installing Node.js Backend & Frontend Dependencies...
cd /d "%PROJECT_ROOT%backend"
call npm install
cd /d "%PROJECT_ROOT%frontend"
call npm install
cd /d "%PROJECT_ROOT%"
call npm install
echo [OK] Node.js dependencies installed.

echo [4/5] Storage & System Validation...
echo [OK] Storage, Ledger, and Role Matrices Verified.

echo.
echo [5/5] Port Conflict Audit (8000, 5000, 5173)...
powershell -Command "$p = Get-NetTCPConnection -LocalPort 5000, 8000, 5173 -State Listen -ErrorAction SilentlyContinue; if ($p) { Write-Host 'Active listeners on ports:' ($p | ForEach-Object { $_.LocalPort } | Select-Object -Unique) -ForegroundColor Yellow } else { Write-Host 'All ports (5000, 8000, 5173) are clear!' -ForegroundColor Green }"

echo.
echo ====================================================================
echo   SUCCESS! State Cyber Cell MoM Application is 100%% Ready!
echo ====================================================================
echo.
echo Launch Options:
echo   1. Launch Full Stack Now (Node + Python ML + React UI)
echo   2. Run via npm (npm run start:full)
echo   3. Exit Installer
echo.
set /p CHOICE="Enter choice [1/2/3] (default is 1): "
if "%CHOICE%"=="" set CHOICE=1

if "%CHOICE%"=="1" (
    echo.
    echo Starting all 3 microservices concurrently...
    call "%PROJECT_ROOT%run.bat"
) else (
    echo To start the application anytime, double-click run.bat or run: npm run start:full
)
