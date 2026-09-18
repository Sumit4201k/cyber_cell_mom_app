@echo off
setlocal enabledelayedexpansion
title State Cyber Cell MoM Application - Launcher
echo ====================================================================
echo   STATE CYBER CELL MINUTES OF MEETING APP - ONE-CLICK LAUNCHER
echo ====================================================================
echo.

set PROJECT_ROOT=%~dp0
set PORTABLE_PY=%PROJECT_ROOT%python-service\python_env\python.exe

rem Python Environment Detection
if exist "%PORTABLE_PY%" (
    set PY_CMD="%PORTABLE_PY%"
) else if exist "C:\Users\hp\python311\python.exe" (
    set PY_CMD="C:\Users\hp\python311\python.exe"
) else (
    set PY_CMD=python
)

echo [*] Target Microservices Configuration:
echo     - Python ML Service : Port 8000 (FastAPI / Whisper / Presidio)
echo     - Node.js API Server: Port 5000 (Express / SHA-256 Ledger)
echo     - React Frontend UI : Port 5173 (Vite / Dashboard)
echo.

rem Check for port conflicts and clear orphan processes if requested
echo [*] Checking port availability...
powershell -Command "$conns = Get-NetTCPConnection -LocalPort 5000, 8000, 5173 -State Listen -ErrorAction SilentlyContinue; if ($conns) { Write-Host 'Detected existing processes on ports:' ($conns.LocalPort | Select-Object -Unique) -ForegroundColor Yellow; foreach ($c in $conns) { try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} } Write-Host 'Ports cleared successfully.' -ForegroundColor Green } else { Write-Host 'All ports are clear and ready.' -ForegroundColor Green }"

echo.
echo [*] Booting all 3 microservices concurrently...
echo     Opening http://localhost:5173 in browser...
echo.

rem Launch default browser after 3 seconds in background
start "" /B powershell -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5173'"

rem Launch full stack concurrently
cd /d "%PROJECT_ROOT%"
call npm run start:full
