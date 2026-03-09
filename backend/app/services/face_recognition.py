import cv2
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
    print("[OK] MediaPipe loaded successfully")
except ImportError as e:
    MEDIAPIPE_AVAILABLE = False
    mp = None
    print(f"[WARN] MediaPipe not available, using OpenCV cascade fallback: {e}")
import numpy as np
from typing import Tuple, Optional, List
import pickle
import os
import base64
from sklearn.metrics.pairwise import cosine_distances

class FaceRecognitionModule:
    def __init__(self, tolerance=0.6, model='cnn'):
        self.tolerance = tolerance
        self.model = model
        self.known_face_encodings = []
        self.known_face_names = []
        self.encoding_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "face_encodings.pkl")
        
        # Use MediaPipe for face detection (if available)
        self.face_detector = None
        if MEDIAPIPE_AVAILABLE:
            self.mp_face_detection = mp.solutions.face_detection
            self.face_detector = self.mp_face_detection.FaceDetection(
                model_selection=0, min_detection_confidence=0.3
            )
            print("[OK] MediaPipe face detector initialized")
        else:
            print("[WARN] MediaPipe not available, using OpenCV cascade only")
        
        # Also load OpenCV cascade as fallback
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        self.load_encodings()
    
    def load_encodings(self):
        if os.path.exists(self.encoding_file):
            print(f"[OK] Loading encodings from local file: {self.encoding_file}")
            with open(self.encoding_file, 'rb') as f:
                data = pickle.load(f)
                self.known_face_encodings = data.get('encodings', [])
                self.known_face_names = data.get('names', [])
        
        # Backup: Load from MongoDB if local file is missing or empty
        if not self.known_face_encodings:
            try:
                from ..models.mongo import User
                db_users = User.objects(face_encoding_data__ne="")
                if db_users:
                    print(f"[OK] Restoring {len(db_users)} face encodings from MongoDB...")
                    for u in db_users:
                        # Convert base64 string back to numpy array
                        enc_bytes = base64.b64decode(u.face_encoding_data)
                        enc_arr = pickle.loads(enc_bytes)
                        self.known_face_encodings.append(enc_arr)
                        self.known_face_names.append(u.name)
                    self.save_encodings() # Sync back to local file
            except Exception as e:
                print(f"[ERROR] Could not restore from MongoDB: {e}")
    
    def save_encodings(self):
        data = {
            'encodings': self.known_face_encodings,
            'names': self.known_face_names
        }
        os.makedirs(os.path.dirname(self.encoding_file), exist_ok=True)
        with open(self.encoding_file, 'wb') as f:
            pickle.dump(data, f)
    
    def _extract_face_features(self, image: np.ndarray, face_location) -> Optional[np.ndarray]:
        try:
            h, w = image.shape[:2]
            y_min = int(face_location.location_data.relative_bounding_box.ymin * h)
            x_min = int(face_location.location_data.relative_bounding_box.xmin * w)
            width = int(face_location.location_data.relative_bounding_box.width * w)
            height = int(face_location.location_data.relative_bounding_box.height * h)
            
            y_min = max(0, y_min)
            x_min = max(0, x_min)
            y_max = min(h, y_min + height)
            x_max = min(w, x_min + width)
            
            face_roi = image[y_min:y_max, x_min:x_max]
            if face_roi.size == 0:
                return None
            
            face_resized = cv2.resize(face_roi, (128, 128))
            face_flat = face_resized.flatten().astype(np.float32) / 255.0
            
            return face_flat
        except Exception as e:
            print(f"Error extracting face features: {e}")
            return None
    
    def encode_face(self, image_path: str) -> Optional[np.ndarray]:
        try:
            image = cv2.imread(image_path)
            if image is None:
                print(f"[DEBUG] Failed to read image for encoding: {image_path}")
                return None
            
            # Try MediaPipe first (if available)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            if self.face_detector:
                results = self.face_detector.process(image_rgb)
                
                if results.detections:
                    print("[DEBUG] MediaPipe detected face for encoding")
                    encoding = self._extract_face_features(image, results.detections[0])
                    return encoding
            
            # Fallback to cascade classifier
            print("[DEBUG] MediaPipe failed, trying cascade classifier for encoding")
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) > 0:
                print(f"[DEBUG] Cascade found {len(faces)} face(s) for encoding")
                x, y, w, h = faces[0]
                face_roi = image[y:y+h, x:x+w]
                face_resized = cv2.resize(face_roi, (128, 128))
                face_flat = face_resized.flatten().astype(np.float32) / 255.0
                return face_flat
            
            print("[DEBUG] No face detected for encoding")
            return None
        except Exception as e:
            print(f"Error encoding face: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def register_user(self, name: str, image_path: str) -> Optional[np.ndarray]:
        encoding = self.encode_face(image_path)
        if encoding is not None:
            self.known_face_encodings.append(encoding)
            self.known_face_names.append(name)
            self.save_encodings()
            return encoding
        return None
    
    def recognize_faces(self, image_path: str) -> List[Tuple[str, float]]:
        try:
            image = cv2.imread(image_path)
            if image is None:
                print(f"[DEBUG] Failed to read image: {image_path}")
                return []
            
            print(f"[DEBUG] Image shape: {image.shape}")
            
            # Try MediaPipe first (if available)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            detections = []
            if self.face_detector:
                results = self.face_detector.process(image_rgb)
                detections = results.detections if results.detections else []
                print(f"[DEBUG] MediaPipe detections: {len(detections)}")
            
            # If MediaPipe not available or doesn't find faces, try cascade classifier
            if not detections:
                print("[DEBUG] MediaPipe found no faces, trying cascade classifier...")
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
                print(f"[DEBUG] Cascade detector found: {len(faces)} faces")
                
                # Convert cascade results to mediapipe-like detections
                if len(faces) > 0:
                    # Create mock detections from cascade results
                    for (x, y, w, h) in faces:
                        class MockDetection:
                            def __init__(self, x, y, w, h, img_h, img_w):
                                self.x = x
                                self.y = y
                                self.w = w
                                self.h = h
                                self.img_h = img_h
                                self.img_w = img_w
                            
                            @property
                            def location_data(self):
                                class LocationData:
                                    class BBox:
                                        def __init__(self, x, y, w, h, img_h, img_w):
                                            self.xmin = x / img_w
                                            self.ymin = y / img_h
                                            self.width = w / img_w
                                            self.height = h / img_h
                                    
                                    def __init__(self, x, y, w, h, img_h, img_w):
                                        self.relative_bounding_box = self.BBox(x, y, w, h, img_h, img_w)
                                
                                return LocationData(self.x, self.y, self.w, self.h, self.img_h, self.img_w)
                        
                        h_img, w_img = image.shape[:2]
                        detections.append(MockDetection(x, y, w, h, h_img, w_img))
            
            if not detections:
                print("[DEBUG] No faces detected by either method")
                return []
            
            results_list = []
            for i, detection in enumerate(detections):
                print(f"[DEBUG] Processing detection {i+1}")
                face_encoding = self._extract_face_features(image, detection)
                if face_encoding is None:
                    print(f"[DEBUG] Failed to extract features for detection {i+1}")
                    continue
                
                if len(self.known_face_encodings) == 0:
                    print("[DEBUG] No known face encodings stored")
                    continue
                
                encodings_array = np.array(self.known_face_encodings)
                distances = cosine_distances([face_encoding], encodings_array)[0]
                
                best_match_index = np.argmin(distances)
                distance = distances[best_match_index]
                
                print(f"[DEBUG] Best match distance: {distance}, tolerance threshold: {1 - self.tolerance}")
                
                if distance < (1 - self.tolerance):
                    name = self.known_face_names[best_match_index]
                    confidence = 1 - distance
                    results_list.append((name, float(confidence)))
                    print(f"[DEBUG] Match found: {name} (confidence: {confidence})")
                else:
                    print(f"[DEBUG] No match above threshold")
            
            return results_list
        except Exception as e:
            print(f"Error recognizing faces: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def detect_faces(self, image_path: str) -> List[Tuple[int, int, int, int]]:
        try:
            image = cv2.imread(image_path)
            if image is None:
                return []
            
            h, w = image.shape[:2]
            
            # Try MediaPipe first (if available)
            if self.face_detector:
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                results = self.face_detector.process(image_rgb)
                
                if results.detections:
                    face_locations = []
                    for detection in results.detections:
                        bbox = detection.location_data.relative_bounding_box
                        x_min = int(bbox.xmin * w)
                        y_min = int(bbox.ymin * h)
                        x_max = int((bbox.xmin + bbox.width) * w)
                        y_max = int((bbox.ymin + bbox.height) * h)
                        face_locations.append((y_min, x_max, y_max, x_min))
                    return face_locations
            
            # Fallback to OpenCV cascade
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            face_locations = []
            for (x, y, fw, fh) in faces:
                face_locations.append((y, x + fw, y + fh, x))
            return face_locations
        except Exception as e:
            print(f"Error detecting faces: {e}")
            return []
