import { io } from 'socket.io-client';

const API_BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

/**
 * Fetch list of registered cameras from Node backend (MongoDB)
 */
export async function getCameras() {
  const response = await fetch(`${API_BASE_URL}/cameras`);
  if (!response.ok) {
    throw new Error(`Failed to fetch cameras: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Register a new camera
 */
export async function createCamera(cameraData) {
  const response = await fetch(`${API_BASE_URL}/cameras`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cameraData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create camera`);
  }
  return response.json();
}

/**
 * Process a video file through Node Backend -> ML FastAPI Service
 * @param {File} videoFile - The video file object
 * @param {string} cameraId - Camera identifier
 */
export async function processVideo(videoFile, cameraId = 'CAM_01') {
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('camera_id', cameraId);

  const response = await fetch(`${API_BASE_URL}/videos/process`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || `Failed to process video`);
  }

  // Returns array of saved DetectionEvent documents
  return response.json();
}

/**
 * Fetch detection events filtered by plate number or return all events
 * @param {string} plateNumber
 */
export async function getDetectionEvents(plateNumber = '') {
  const url = plateNumber
    ? `${API_BASE_URL}/events?plate=${encodeURIComponent(plateNumber)}`
    : `${API_BASE_URL}/events`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch detection events: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Initialize Socket.io connection listening for real-time blacklist alerts
 * @param {function} onAlertCallback
 */
export function connectAlertsSocket(onAlertCallback) {
  const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket.io] Connected to backend alert server:', socket.id);
  });

  socket.on('alerts', (alertData) => {
    console.log('[Socket.io] Received blacklist alert:', alertData);
    if (onAlertCallback) {
      onAlertCallback(alertData);
    }
  });

  socket.on('disconnect', () => {
    console.log('[Socket.io] Disconnected from backend alert server');
  });

  return socket;
}
