import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../services/api';

function CheckIn() {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraActive, stream]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      setCameraActive(true);
      setMessage('');
    } catch (err) {
      console.error("Camera access error:", err);
      setMessage('Unable to access camera. Please check permissions.');
      setMessageType('error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setCameraActive(false);
  };

  const captureAndCheckIn = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setMessage('Camera not ready. Please try again.');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Mirror the video (flip horizontally for better UX)
      context.save();
      context.scale(-1, 1);
      context.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
      context.restore();
      
      // Wait for canvas to render
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Convert to blob with high quality
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            console.error('Failed to create blob');
            setMessage('Failed to capture image. Please try again.');
            setMessageType('error');
            setLoading(false);
            return;
          }

          console.log(`[DEBUG] Captured image blob size: ${blob.size} bytes`);

          const formData = new FormData();
          formData.append('file', blob, 'check-in.jpg');

          try {
            const response = await apiClient.post('/attendance/check-in', formData, {
              timeout: 30000,
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
            
            console.log('Check-in response:', response.data);
            
            if (response.data.recognized) {
              const msg = response.data.message || '';
              const rawTime = response.data.check_in_time || '';
              const timeStr = rawTime ? (([h, m, s]) => { const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`; })(rawTime.split(':')) : 'Now';
              if (msg.includes('Already')) {
                setMessage(`⚠️ ${msg} (Checked in at ${timeStr})`);
                setMessageType('warning');
              } else {
                setMessage(`✓ Check-in successful! ${response.data.user_name} at ${timeStr}`);
                setMessageType('success');
                setTimeout(() => stopCamera(), 1500);
              }
            } else {
              setMessage(`✗ ${response.data.message}`);
              setMessageType('error');
            }
          } catch (err) {
            console.error("Check-in error:", err);
            const errorMsg = err.response?.data?.detail || err.message || 'Check-in failed. Please try again.';
            setMessage(errorMsg);
            setMessageType('error');
          } finally {
            setLoading(false);
          }
        },
        'image/jpeg',
        0.95 // 95% quality
      );
    } catch (err) {
      console.error('Capture error:', err);
      setMessage('Error capturing image');
      setMessageType('error');
      setLoading(false);
    }
  };

  const alertColor = {
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    error:   'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">📷 Check-In</h2>
        <p className="text-sm text-gray-400 mt-0.5">Capture your face to mark attendance</p>
      </div>

      {message && (
        <div className={`border rounded-lg px-4 py-3 text-sm ${alertColor[messageType] || alertColor.error}`}>{message}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 max-w-xl mx-auto">
        <h3 className="font-semibold text-gray-700 mb-4">📸 Camera Capture</h3>

        {!cameraActive ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-16 mb-4 bg-gray-50">
            <span className="text-5xl mb-3">📷</span>
            <p className="text-sm text-gray-400">Camera feed will appear here</p>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted
            className="w-full rounded-xl mb-4 bg-black" style={{ transform: 'scaleX(-1)' }} />
        )}
        <canvas ref={canvasRef} width={640} height={480} className="hidden" />

        <div className="flex gap-2 justify-center mb-5">
          {!cameraActive ? (
            <button onClick={startCamera} disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              🎥 Start Camera
            </button>
          ) : (
            <>
              <button onClick={captureAndCheckIn} disabled={loading}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {loading ? '⏳ Processing…' : '✓ Check-In Now'}
              </button>
              <button onClick={stopCamera} disabled={loading}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                ✕ Stop
              </button>
            </>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Instructions</p>
          <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
            <li>Click <strong>Start Camera</strong> to activate</li>
            <li>Position your face clearly in the frame</li>
            <li>Click <strong>Check-In Now</strong> to record attendance</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default CheckIn;
