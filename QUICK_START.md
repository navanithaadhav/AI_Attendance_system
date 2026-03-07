# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Terminal 1: Backend
```bash
cd attendance_system\backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
✅ Backend runs at: **http://localhost:8000**

### Terminal 2: Frontend
```bash
cd attendance_system\frontend
npm install
npm start
```
✅ Frontend runs at: **http://localhost:3000**

---

## 📋 First Steps

1. **Register a User**
   - Go to: http://localhost:3000/users
   - Enter name and email
   - Upload a clear face photo
   - Click "Register Face"

2. **Check-in**
   - Go to: http://localhost:3000/check-in
   - Click "Start Camera"
   - Let system recognize your face
   - Click "Check-In"

3. **View Dashboard**
   - Go to: http://localhost:3000
   - See real-time statistics

4. **Generate Reports**
   - Go to: http://localhost:3000/reports
   - Filter and export attendance data

---

## 📁 Project Structure

```
attendance_system/
├── backend/
│   ├── main.py                    ← API endpoints
│   ├── models.py                  ← Database tables
│   ├── face_recognition_module.py ← Face detection logic
│   └── requirements.txt           ← Install: pip install -r
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.js      ← Main statistics
│   │   │   ├── CheckIn.js        ← Face recognition
│   │   │   ├── UserManagement.js ← Add/remove users
│   │   │   └── Reports.js        ← Analytics & export
│   │   └── App.js                ← Navigation
│   └── package.json              ← Install: npm install
│
├── SETUP.md                       ← Detailed setup
└── QUICK_START.md                 ← This file
```

---

## 🔗 API Endpoints

**Swagger Docs**: http://localhost:8000/docs

```
POST   /users/register              - Register user
POST   /users/register-face         - Add face photo
GET    /users                       - List all users
DELETE /users/{id}                  - Remove user

POST   /attendance/check-in         - Face check-in
POST   /attendance/check-out        - Manual check-out
GET    /attendance/logs             - View logs
GET    /attendance/stats            - Dashboard stats
```

---

## ⚠️ Troubleshooting

**Backend won't start?**
```bash
pip install --no-cache-dir face-recognition
```

**Camera not working?**
- Allow browser camera access
- Check lighting conditions
- Face must be clearly visible

**Port already in use?**
```bash
# Backend on different port
python -m uvicorn main:app --port 8001

# Frontend on different port
PORT=3001 npm start
```

**CORS Error?**
- Check backend and frontend URLs match in App.js

---

## 📚 Full Documentation

See `SETUP.md` for detailed information.

---

**Ready? Start the backend and frontend, then visit http://localhost:3000!**
