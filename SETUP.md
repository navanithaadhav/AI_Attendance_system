# AI-Based Attendance System - Setup Guide

## Project Overview
This is a comprehensive AI-based attendance system with facial recognition capabilities, built with FastAPI (backend) and React (frontend). It's designed as a college project for real-time attendance tracking.

## Features
- **Face Recognition**: Uses `face-recognition` library for identifying users
- **Real-time Check-in/Check-out**: Live camera integration for attendance
- **User Management**: Register and manage users with face data
- **Attendance Analytics**: Dashboard with real-time statistics
- **Reports & Export**: Generate attendance reports in CSV format
- **Responsive UI**: Works on desktop and mobile devices

---

## Prerequisites

### System Requirements
- **Python 3.8+**
- **Node.js 14+** and npm
- **Git**
- **Webcam** (for face recognition)

### Face Recognition Dependencies (Windows)
For face-recognition to work on Windows, you may need:
1. **Visual C++ Build Tools** (for dlib compilation)
2. Install from: https://visualstudio.microsoft.com/visual-cpp-build-tools/

---

## Backend Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

If you face issues with `face-recognition` or `dlib`, try:
```bash
pip install --no-cache-dir face-recognition
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` if needed (default settings work for development).

### 3. Run Backend Server

```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: **http://localhost:8000**

**API Documentation**: http://localhost:8000/docs

---

## Frontend Setup

### 1. Install Node Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm start
```

Frontend will be available at: **http://localhost:3000**

---

## API Endpoints

### User Management
- `POST /users/register` - Register new user
- `POST /users/register-face` - Register face for user
- `GET /users` - Get all users
- `GET /users/{user_id}` - Get specific user
- `DELETE /users/{user_id}` - Delete user
- `PUT /users/{user_id}` - Update user status

### Attendance
- `POST /attendance/check-in` - Check-in with face recognition
- `POST /attendance/check-out` - Manual check-out
- `GET /attendance/logs` - Get attendance logs with filters
- `GET /attendance/stats` - Get daily statistics

---

## Usage Workflow

### 1. Register a User
1. Go to **Users** page
2. Fill in name and email
3. Click "Register User"
4. Upload a clear photo of the user
5. Click "Register Face"

### 2. Check-in
1. Go to **Check-In** page
2. Click "Start Camera"
3. Position your face clearly in the camera
4. Click "Check-In"
5. System will recognize and log your check-in

### 3. View Dashboard
1. Dashboard shows real-time statistics
2. Recent check-ins are displayed in a table
3. Auto-refreshes every 10 seconds

### 4. View Reports
1. Filter by user or date
2. View detailed attendance logs
3. Export data as CSV

---

## Troubleshooting

### Face Recognition Not Working
- Ensure good lighting
- Face must be clearly visible
- Try registering with a better photo
- Increase camera resolution if possible

### Backend Connection Error
- Check if backend is running: `http://localhost:8000/docs`
- Verify CORS settings in `main.py`
- Check firewall settings

### Database Issues
- Delete `attendance.db` file to reset database
- Check SQLite is accessible

### Camera Permission Denied
- Browser needs camera permission
- Check browser settings
- Try HTTPS if using production

---

## Project Structure

```
attendance_system/
├── backend/
│   ├── main.py                    # FastAPI app
│   ├── models.py                  # Database models
│   ├── schemas.py                 # Pydantic schemas
│   ├── database.py                # Database config
│   ├── face_recognition_module.py # Face recognition logic
│   ├── requirements.txt           # Python dependencies
│   └── .env.example              # Environment template
│
└── frontend/
    ├── src/
    │   ├── App.js                 # Main app component
    │   ├── App.css                # Global styles
    │   ├── index.js               # React entry point
    │   └── pages/
    │       ├── Dashboard.js       # Dashboard page
    │       ├── CheckIn.js         # Check-in page
    │       ├── UserManagement.js  # User management page
    │       └── Reports.js         # Reports page
    ├── public/
    │   └── index.html             # HTML template
    └── package.json               # Node dependencies
```

---

## Development Tips

### Adding New Features

1. **Backend**: Add endpoints in `main.py`
2. **Frontend**: Create new pages in `src/pages/`
3. **Database**: Update models in `models.py`
4. **Styling**: Use consistent CSS from App.css

### Testing Endpoints

Use **Swagger UI** at `http://localhost:8000/docs` to test all API endpoints interactively.

### Performance Optimization

- Face encodings are cached in `face_encodings.pkl`
- Database queries use indexes on `user_id` and `check_in_time`
- Frontend uses polling with 10-second intervals

---

## Deployment

### Production Backend (Gunicorn)

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

### Production Frontend

```bash
npm run build
# Deploy the 'build' folder to a static hosting service
```

---

## Security Considerations

- Use HTTPS in production
- Set proper CORS origins
- Validate all API inputs
- Store face encodings securely
- Use environment variables for sensitive data
- Implement user authentication

---

## Common Errors & Solutions

| Error | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'face_recognition'` | `pip install face-recognition` |
| `CORS error` | Check API_URL in frontend matches backend URL |
| `No face detected` | Ensure good lighting and clear face view |
| `Database locked` | Restart backend and delete `.db-journal` |
| `Port 8000 already in use` | `netstat -ano \| findstr :8000` (Windows) or use different port |

---

## Future Enhancements

- [ ] Multi-camera support
- [ ] Liveness detection (prevent spoofing)
- [ ] Email notifications
- [ ] Mobile app
- [ ] Integration with college systems
- [ ] Advanced analytics and heatmaps
- [ ] QR code backup check-in
- [ ] Real-time notifications

---

## License
This project is open source and available for educational purposes.

---

## Support
For issues or questions, please create an issue in the repository.
