@echo off
REM AI Attendance System Startup Script for Windows

echo.
echo ==========================================
echo AI-Based Attendance System
echo ==========================================
echo.

REM Check if backend folder exists
if not exist "backend" (
    echo ERROR: backend folder not found!
    echo Please run this script from the attendance_system directory.
    pause
    exit /b 1
)

REM Check if frontend folder exists
if not exist "frontend" (
    echo ERROR: frontend folder not found!
    echo Please run this script from the attendance_system directory.
    pause
    exit /b 1
)

echo Starting Backend...
echo.
cd backend
start cmd /k "pip install -q -r requirements.txt && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001"

timeout /t 3

echo.
echo Starting Frontend...
echo.
cd ..\frontend
start cmd /k "npm install -q && npm start"

cd ..

echo.
echo ==========================================
echo ✓ Backend: http://127.0.0.1:8001
echo ✓ Frontend: http://localhost:3000
echo ✓ API Docs: http://127.0.0.1:8001/docs
echo ==========================================
echo.
echo Both servers are starting in new windows.
echo Close the windows to stop the servers.
echo.
pause
