from mongoengine import Document, StringField, IntField, FloatField, BooleanField, DateTimeField
from datetime import datetime
import pytz


class User(Document):
    meta = {'collection': 'users'}

    id = IntField(primary_key=True)
    name = StringField(required=True, unique=True, max_length=100)
    email = StringField(required=True, unique=True, max_length=200)
    face_encoding = StringField(default="")
    face_encoding_data = StringField(default="") # Store as base64 or pickle string
    created_at = DateTimeField(default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    is_active = BooleanField(default=True)


class AttendanceLog(Document):
    meta = {
        'collection': 'attendance_logs',
        'indexes': ['user_id', 'check_in_time']
    }

    user_id = IntField(required=True)
    user_name = StringField(required=True)
    check_in_time = DateTimeField(required=True)
    check_out_time = DateTimeField(null=True)
    confidence = FloatField()
    status = StringField(default="checked_in")
    created_at = DateTimeField(default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))


def get_next_user_id():
    last = User.objects.order_by('-id').first()
    return (last.id + 1) if last else 1
