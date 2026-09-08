const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const path = require('path');

const Camera = require('./models/Camera');
const DetectionEvent = require('./models/DetectionEvent');
const BlacklistEntry = require('./models/BlacklistEntry');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle invalid JSON payload syntax errors cleanly as JSON responses
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON format in request body' });
  }
  next(err);
});

// Multer temporary disk storage setup
const upload = multer({ dest: os.tmpdir() });

/**
 * Converts a HH:MM:SS.mmm timestamp string into a JavaScript Date object using today's date.
 */
function parseTimestampToDate(tsStr) {
  const date = new Date();
  if (!tsStr || typeof tsStr !== 'string') return date;

  try {
    const [hStr, mStr, sFull] = tsStr.split(':');
    const [sStr, msStr] = (sFull || '0.0').split('.');

    date.setHours(parseInt(hStr || '0', 10));
    date.setMinutes(parseInt(mStr || '0', 10));
    date.setSeconds(parseInt(sStr || '0', 10));
    date.setMilliseconds(parseInt((msStr || '0').padEnd(3, '0').slice(0, 3), 10));
  } catch (err) {
    console.error(`Timestamp parse error for '${tsStr}':`, err);
  }

  return date;
}

// ==========================================
// Video Processing Endpoint
// ==========================================
app.post('/api/videos/process', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided in multipart upload' });
  }

  const cameraId = req.body.camera_id || 'CAM_01';
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  try {
    const formData = new FormData();
    formData.append('video', fs.createReadStream(req.file.path), {
      filename: req.file.originalname || 'video.mp4',
      contentType: req.file.mimetype || 'video/mp4',
    });
    formData.append('camera_id', cameraId);

    const mlResponse = await axios.post(`${mlServiceUrl}/process-video`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const mlData = mlResponse.data;
    const eventsToSave = (mlData.events || []).map((evt) => ({
      plate_number: evt.plate_text,
      camera_id: evt.camera_id || cameraId,
      timestamp: parseTimestampToDate(evt.first_seen_timestamp),
      confidence: typeof evt.confidence === 'number' ? evt.confidence : parseFloat(evt.confidence),
      matched_format: Boolean(evt.matched_format),
    }));

    let savedEvents = [];
    if (eventsToSave.length > 0) {
      savedEvents = await DetectionEvent.insertMany(eventsToSave);
    }

    return res.status(200).json(savedEvents);

  } catch (error) {
    console.error('Error processing video through ML service:', error.message);
    const errorMessage = error.response && error.response.data
      ? error.response.data
      : error.message;
    return res.status(500).json({ error: 'Failed to process video', details: errorMessage });

  } finally {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error deleting temp uploaded file:', cleanupError);
      }
    }
  }
});

// ==========================================
// Camera Endpoints
// ==========================================
app.post('/api/cameras', async (req, res) => {
  try {
    const { camera_id, name, latitude, longitude, status } = req.body;
    if (!camera_id || !name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'camera_id, name, latitude, and longitude are required' });
    }

    const camera = new Camera({
      camera_id,
      name,
      latitude,
      longitude,
      status: status || 'active',
    });

    const savedCamera = await camera.save();
    return res.status(201).json(savedCamera);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Camera ID already exists' });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/cameras', async (req, res) => {
  try {
    const cameras = await Camera.find();
    return res.status(200).json(cameras);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Detection Event Queries
// ==========================================
app.get('/api/events', async (req, res) => {
  try {
    const { plate } = req.query;
    const filter = {};
    if (plate) {
      filter.plate_number = plate;
    }

    const events = await DetectionEvent.find(filter).sort({ timestamp: 1 });
    return res.status(200).json(events);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  return res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;
