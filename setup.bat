@echo off
setlocal enabledelayedexpansion
echo ====================================================================
echo   State Cyber Cell MoM Application - Universal Cross-Platform Installer
echo ====================================================================
echo.

set PROJECT_ROOT=%~dp0
set PORTABLE_PY=%PROJECT_ROOT%python-service\python_env\python.exe

echo [1/4] Checking Python environment...

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

rem Check system PATH for python / py
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PY_CMD=python
    echo [OK] Found system Python in PATH
    goto :PYTHON_READY
)

py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PY_CMD=py
    echo [OK] Found Python launcher: py
    goto :PYTHON_READY
)

echo [NOTICE] Python not detected on system. Automatically installing Portable Python 3.11...
mkdir "%PROJECT_ROOT%python-service\python_env" 2>nul
curl.exe -o "%PROJECT_ROOT%python-service\python_env\python.zip" "https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip"
powershell -Command "Expand-Archive -Path '%PROJECT_ROOT%python-service\python_env\python.zip' -DestinationPath '%PROJECT_ROOT%python-service\python_env' -Force; Remove-Item '%PROJECT_ROOT%python-service\python_env\python.zip' -Force"
echo import site >> "%PROJECT_ROOT%python-service\python_env\python311._pth"
curl.exe -o "%PROJECT_ROOT%python-service\python_env\get-pip.py" "https://bootstrap.pypa.io/get-pip.py"
"%PROJECT_ROOT%python-service\python_env\python.exe" "%PROJECT_ROOT%python-service\python_env\get-pip.py"
set PY_CMD="%PORTABLE_PY%"

:PYTHON_READY
echo [2/4] Installing Python ML service dependencies...
cd /d "%PROJECT_ROOT%python-service"
!PY_CMD! -m pip install fastapi uvicorn pydantic python-multipart requests >nul 2>&1
cd /d "%PROJECT_ROOT%"

echo [3/4] Installing Node Backend ^& Frontend dependencies...
cd /d "%PROJECT_ROOT%backend"
call npm install --silent
cd /d "%PROJECT_ROOT%frontend"
call npm install --silent
cd /d "%PROJECT_ROOT%"
call npm install --silent

echo.
echo ====================================================================
echo   SUCCESS! Application fully configured on this PC.
echo   To launch full stack (Node + Python + React), run: npm start
echo ====================================================================
