#!/bin/bash

echo ""
echo "=========================================="
echo "AI-Based Attendance System"
echo "=========================================="
echo ""

if [ ! -d "backend" ]; then
    echo "ERROR: backend folder not found!"
    echo "Please run this script from the attendance_system directory."
    exit 1
fi

if [ ! -d "frontend" ]; then
    echo "ERROR: frontend folder not found!"
    echo "Please run this script from the attendance_system directory."
    exit 1
fi

echo "Starting Backend..."
echo ""
cd backend
pip install -q -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001 &
BACKEND_PID=$!

sleep 3

echo ""
echo "Starting Frontend..."
echo ""
cd ../frontend
npm install -q
npm start &
FRONTEND_PID=$!

cd ..

echo ""
echo "=========================================="
echo "✓ Backend: http://127.0.0.1:8001"
echo "✓ Frontend: http://localhost:3000"
echo "✓ API Docs: http://127.0.0.1:8001/docs"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop both servers..."
echo ""

wait $BACKEND_PID $FRONTEND_PID
