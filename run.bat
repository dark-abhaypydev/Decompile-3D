@echo off
title Decompile 3D Launcher
cd /d "%~dp0"

echo [1/3] Clearing previous processes if any...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /f /pid %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /f /pid %%a >nul 2>nul

echo [2/3] Starting Backend (port 8000)...
start "Backend" cmd /c "cd /d "%~dp0backend" && ..\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

echo [3/3] Starting Frontend (port 5173)...
start "Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"

powershell -Command "Start-Sleep -Seconds 3"
start http://localhost:5173
