from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

class AttendanceLogBase(BaseModel):
    user_id: int
    user_name: str
    confidence: float
    status: str = "checked_in"

class AttendanceLogCreate(AttendanceLogBase):
    pass

class AttendanceLogResponse(AttendanceLogBase):
    id: str
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FaceRecognitionRequest(BaseModel):
    image_base64: str

class FaceRecognitionResponse(BaseModel):
    recognized: bool
    user_name: Optional[str]
    confidence: Optional[float]
    message: str
    check_in_time: Optional[str] = None  # Formatted time string (HH:MM:SS)
    check_in_hour: Optional[int] = None  # Just the hour (0-23)
    check_out_time: Optional[str] = None  # Formatted checkout time (HH:MM:SS)
    check_out_hour: Optional[int] = None  # Checkout hour (0-23)
    duration: Optional[str] = None  # Work duration (HH:MM:SS)

class AttendanceStats(BaseModel):
    total_users: int
    present_today: int
    absent_today: int
    average_arrival_time: Optional[str]
