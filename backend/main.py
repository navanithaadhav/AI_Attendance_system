from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import os
from io import BytesIO
from PIL import Image
import pytz

# MongoDB via mongoengine
from mongoengine import connect, disconnect
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb+srv://navanithaweb_db_user:YH12SXnQ2HU1WKUv@cluster0.2ld6rvl.mongodb.net')
MONGO_DB = os.getenv('MONGODB_DATABASE', 'attendance_db')

from mongo_models import User, AttendanceLog, get_next_user_id
from schemas import (
    UserCreate, UserResponse, AttendanceLogResponse,
    FaceRecognitionRequest, FaceRecognitionResponse, AttendanceStats
)
try:
    from face_recognition_module import FaceRecognitionModule
except ImportError:
    FaceRecognitionModule = None

app = FastAPI(title="AI Attendance System", version="1.0.0")

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

face_module = None

@app.on_event("startup")
def startup_event():
    global face_module
    # Connect to MongoDB
    try:
        connect(MONGO_DB, host=MONGO_URI, retryWrites=True, w="majority")
        print(f"[OK] MongoDB Connected - Database: {MONGO_DB}")
    except Exception as e:
        print(f"[ERROR] MongoDB Connection Failed: {e}")

    if FaceRecognitionModule:
        try:
            face_module = FaceRecognitionModule()
            print("[OK] Face recognition module initialized successfully")
        except Exception as e:
            print(f"[ERROR] Failed to initialize face recognition module: {e}")
            import traceback
            traceback.print_exc()
            face_module = None
    else:
        print("[ERROR] FaceRecognitionModule class not available")

@app.on_event("shutdown")
def shutdown_event():
    disconnect()
    print("[OK] MongoDB disconnected")

@app.get("/")
def read_root():
    return {"message": "AI Attendance System API", "face_recognition_available": face_module is not None}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "face_recognition_available": face_module is not None,
        "face_module": "initialized" if face_module else "not available"
    }

@app.post("/users/register", response_model=UserResponse)
def register_user(user: UserCreate):
    if User.objects(email=user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if User.objects(name=user.name).first():
        raise HTTPException(status_code=400, detail="Name already registered")

    new_id = get_next_user_id()
    ist = pytz.timezone('Asia/Kolkata')
    db_user = User(
        id=new_id,
        name=user.name,
        email=user.email,
        face_encoding="",
        created_at=datetime.now(ist),
        is_active=True
    )
    db_user.save()
    return UserResponse(
        id=db_user.id,
        name=db_user.name,
        email=db_user.email,
        created_at=db_user.created_at,
        is_active=db_user.is_active
    )

@app.post("/users/register-face")
def register_face(
    user_id: int = Form(...),
    file: UploadFile = File(...)
):
    try:
        if not face_module:
            raise HTTPException(status_code=503, detail="Face recognition module not available")

        user = User.objects(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        contents = file.file.read()
        image = Image.open(BytesIO(contents))
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        temp_path = f"temp_{user_id}.jpg"
        image.save(temp_path)

        success = face_module.register_user(user.name, temp_path)

        if os.path.exists(temp_path):
            os.remove(temp_path)

        if success:
            user.face_encoding = "registered"
            user.save()
            return {"message": "Face registered successfully"}
        else:
            raise HTTPException(status_code=400, detail="No face detected in image")

    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback
        print(f"Error in register_face: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users", response_model=list[UserResponse])
def get_users():
    users = User.objects.all()
    return [UserResponse(id=u.id, name=u.name, email=u.email, created_at=u.created_at, is_active=u.is_active) for u in users]

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int):
    user = User.objects(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(id=user.id, name=user.name, email=user.email, created_at=user.created_at, is_active=user.is_active)

@app.post("/attendance/check-in", response_model=FaceRecognitionResponse)
def check_in(file: UploadFile = File(...)):
    try:
        if not face_module:
            return FaceRecognitionResponse(
                recognized=False, user_name=None, confidence=None,
                message="Face recognition module not available"
            )

        contents = file.file.read()
        image = Image.open(BytesIO(contents))
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        temp_path = "temp_check_in.jpg"
        image.save(temp_path)

        results = face_module.recognize_faces(temp_path)
        if os.path.exists(temp_path):
            os.remove(temp_path)

        if not results:
            return FaceRecognitionResponse(
                recognized=False, user_name=None, confidence=None,
                message="No face detected"
            )

        user_name, confidence = results[0]
        if confidence < 0.6:
            return FaceRecognitionResponse(
                recognized=False, user_name=None, confidence=None,
                message="Face confidence too low"
            )

        user = User.objects(name=user_name).first()
        if not user:
            return FaceRecognitionResponse(
                recognized=False, user_name=None, confidence=None,
                message="User not found"
            )

        ist = pytz.timezone('Asia/Kolkata')
        now_ist = datetime.now(ist)
        day_start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        existing_log = AttendanceLog.objects(
            user_id=user.id,
            check_in_time__gte=day_start,
            check_in_time__lt=day_end
        ).first()

        if existing_log:
            existing_time_str = existing_log.check_in_time.strftime('%H:%M:%S')
            existing_hour = existing_log.check_in_time.hour
            already_msg = "Already checked in and checked out today" if existing_log.check_out_time else "Already checked in today"
            return FaceRecognitionResponse(
                recognized=True, user_name=user_name,
                confidence=round(confidence, 4), message=already_msg,
                check_in_time=existing_time_str, check_in_hour=existing_hour
            )

        log = AttendanceLog(
            user_id=user.id, user_name=user_name,
            check_in_time=now_ist, confidence=confidence, status="checked_in"
        )
        log.save()

        return FaceRecognitionResponse(
            recognized=True, user_name=user_name,
            confidence=round(confidence, 4), message="Check-in successful",
            check_in_time=now_ist.strftime('%H:%M:%S'), check_in_hour=now_ist.hour
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/attendance/check-out")
def check_out(user_id: int):
    try:
        ist = pytz.timezone('Asia/Kolkata')
        now_ist = datetime.now(ist)
        day_start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        log = AttendanceLog.objects(
            user_id=user_id,
            check_in_time__gte=day_start,
            check_in_time__lt=day_end
        ).first()
        if not log:
            raise HTTPException(status_code=404, detail="No check-in found today")

        log.check_out_time = now_ist
        log.status = "checked_out"
        log.save()

        return {
            "message": "Check-out successful",
            "check_out_time": now_ist.strftime('%H:%M:%S'),
            "check_out_hour": now_ist.hour,
            "user_id": user_id
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/attendance/check-out-face", response_model=FaceRecognitionResponse)
def check_out_face(file: UploadFile = File(...)):
    try:
        if not face_module:
            return FaceRecognitionResponse(
                recognized=False, user_name=None, confidence=None,
                message="Face recognition module not available"
            )

        contents = file.file.read()
        image = Image.open(BytesIO(contents))
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        temp_path = "temp_check_out.jpg"
        image.save(temp_path)

        results = face_module.recognize_faces(temp_path)
        if os.path.exists(temp_path):
            os.remove(temp_path)

        if not results:
            return FaceRecognitionResponse(
                recognized=False, user_name=None, confidence=None,
                message="No face detected"
            )

        user_name, confidence = results[0]
        if confidence < 0.6:
            return FaceRecognitionResponse(
                recognized=False, user_name=None, confidence=None,
                message="Face confidence too low"
            )

        user = User.objects(name=user_name).first()
        if not user:
            return FaceRecognitionResponse(
                recognized=False, user_name=None, confidence=None,
                message="User not found"
            )

        ist = pytz.timezone('Asia/Kolkata')
        now_ist = datetime.now(ist)
        day_start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        log = AttendanceLog.objects(
            user_id=user.id,
            check_in_time__gte=day_start,
            check_in_time__lt=day_end
        ).first()

        if not log:
            return FaceRecognitionResponse(
                recognized=False, user_name=None, confidence=None,
                message="No check-in found today"
            )

        if log.check_out_time:
            return FaceRecognitionResponse(
                recognized=True, user_name=user_name,
                confidence=round(confidence, 4), message="Already checked out today"
            )

        log.check_out_time = now_ist
        log.status = "checked_out"
        log.save()

        checkin_time = log.check_in_time
        if checkin_time.tzinfo is None:
            checkin_time = pytz.utc.localize(checkin_time)

        duration = now_ist - checkin_time
        h, rem = divmod(int(duration.total_seconds()), 3600)
        m, s = divmod(rem, 60)

        return FaceRecognitionResponse(
            recognized=True, user_name=user_name,
            confidence=round(confidence, 4), message="Check-out successful",
            check_out_time=now_ist.strftime('%H:%M:%S'), check_out_hour=now_ist.hour,
            duration=f"{h:02d}:{m:02d}:{s:02d}"
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/attendance/logs", response_model=list[AttendanceLogResponse])
def get_attendance_logs(user_id: int = None, date: str = None):
    ist = pytz.timezone('Asia/Kolkata')

    def to_ist(dt):
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = pytz.utc.localize(dt)
        return dt.astimezone(ist)

    query = AttendanceLog.objects()
    if user_id:
        query = query.filter(user_id=user_id)
    if date:
        try:
            d = datetime.strptime(date, "%Y-%m-%d")
            day_start = ist.localize(d)
            day_end = day_start + timedelta(days=1)
            query = query.filter(check_in_time__gte=day_start, check_in_time__lt=day_end)
        except ValueError:
            pass
    logs = query.order_by('-check_in_time')
    result = []
    for log in logs:
        result.append(AttendanceLogResponse(
            id=str(log.id),
            user_id=log.user_id,
            user_name=log.user_name,
            check_in_time=to_ist(log.check_in_time),
            check_out_time=to_ist(log.check_out_time),
            confidence=log.confidence,
            status=log.status,
            created_at=to_ist(log.created_at)
        ))
    return result

@app.get("/attendance/stats", response_model=AttendanceStats)
def get_attendance_stats():
    ist = pytz.timezone('Asia/Kolkata')
    now_ist = datetime.now(ist)
    day_start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)

    total_users = User.objects.count()
    logs_today = AttendanceLog.objects(
        check_in_time__gte=day_start,
        check_in_time__lt=day_end
    )
    present_today = logs_today.count()
    absent_today = total_users - present_today

    average_arrival_time = None
    if present_today > 0:
        def to_ist_dt(dt):
            if dt.tzinfo is None:
                dt = pytz.utc.localize(dt)
            return dt.astimezone(ist)
        total_seconds = sum(
            (to_ist_dt(log.check_in_time).hour * 3600 +
             to_ist_dt(log.check_in_time).minute * 60 +
             to_ist_dt(log.check_in_time).second)
            for log in logs_today
        )
        avg_s = total_seconds / present_today
        average_arrival_time = f"{int(avg_s // 3600):02d}:{int((avg_s % 3600) // 60):02d}"

    return AttendanceStats(
        total_users=total_users,
        present_today=present_today,
        absent_today=absent_today,
        average_arrival_time=average_arrival_time
    )

@app.delete("/users/{user_id}")
def delete_user(user_id: int):
    user = User.objects(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    AttendanceLog.objects(user_id=user_id).delete()
    user.delete()
    return {"message": "User deleted successfully"}

@app.put("/users/{user_id}")
def update_user(user_id: int, is_active: bool):
    user = User.objects(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = is_active
    user.save()
    return {"message": "User updated successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
