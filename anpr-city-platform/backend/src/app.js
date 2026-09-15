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
const Alert = require('./models/Alert');

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

// Concurrency Lock for Video Processing Pipeline
let isVideoProcessingBusy = false;

// ==========================================
// Health Check Endpoint (Backend + ML Engine)
// ==========================================
app.get('/api/health', async (req, res) => {
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
  let mlStatus = 'offline';
  try {
    const mlRes = await axios.get(`${mlServiceUrl}/health`, { timeout: 2000 });
    if (mlRes.data && (mlRes.data.status === 'ok' || mlRes.status === 200)) {
      mlStatus = 'online';
    }
  } catch (err) {
    mlStatus = 'offline';
  }

  return res.status(200).json({
    status: 'ok',
    server: 'online',
    ml: mlStatus,
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// Video Processing Endpoint
// ==========================================
app.post('/api/videos/process', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided in multipart upload' });
  }

  // Prevent concurrent CPU overload by checking processing lock
  if (isVideoProcessingBusy) {
    if (req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(429).json({
      error: 'Video processing pipeline is currently busy analyzing another video. Please wait a few seconds and retry.'
    });
  }

  isVideoProcessingBusy = true;
  const cameraId = req.body.camera_id || 'CAM_01';
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

  const startTime = Date.now();
  console.log(`[Backend] Starting video processing for camera: ${cameraId}, file: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)...`);

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
      timeout: 600000, // 10 minutes timeout for CPU video processing
    });

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Backend] ML processing completed successfully in ${elapsedSeconds}s!`);

    const mlData = mlResponse.data;
    const eventsToSave = (mlData.events || []).map((evt) => ({
      plate_number: evt.plate_text,
      vehicle_type: evt.vehicle_type || 'unknown',
      vehicle_color: evt.vehicle_color || 'unknown',
      color_confidence: typeof evt.color_confidence === 'number' ? evt.color_confidence : 0,
      camera_id: evt.camera_id || cameraId,
      timestamp: parseTimestampToDate(evt.first_seen_timestamp),
      confidence: typeof evt.confidence === 'number' ? evt.confidence : parseFloat(evt.confidence),
      matched_format: Boolean(evt.matched_format),
    }));

    let savedEvents = [];
    if (eventsToSave.length > 0) {
      try {
        if (mongoose.connection.readyState === 1) {
          savedEvents = await DetectionEvent.insertMany(eventsToSave);
        } else {
          console.warn('MongoDB not connected (readyState !== 1). Saving events to in-memory store.');
          savedEvents = eventsToSave.map((evt, idx) => ({
            ...evt,
            _id: 'mem_evt_' + Date.now() + '_' + idx,
            createdAt: new Date(),
            updatedAt: new Date()
          }));
          memoryStore.events.push(...savedEvents);
        }
      } catch (dbErr) {
        console.error('MongoDB insertMany failed:', dbErr.message, '. Falling back to in-memory store.');
        savedEvents = eventsToSave.map((evt, idx) => ({
          ...evt,
          _id: 'mem_evt_' + Date.now() + '_' + idx,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        memoryStore.events.push(...savedEvents);
      }

      // Check each saved event against BlacklistEntry and trigger alerts if matched
      const io = req.app.get('io');
      for (const event of savedEvents) {
        try {
          let blacklistMatch = null;
          if (mongoose.connection.readyState === 1) {
            blacklistMatch = await BlacklistEntry.findOne({ plate_number: event.plate_number });
          } else {
            blacklistMatch = memoryStore.blacklist.find(b => b.plate_number === event.plate_number);
          }

          if (blacklistMatch) {
            const alertData = {
              _id: 'alert_' + Date.now(),
              event_id: event._id,
              type: 'blacklist_match',
              acknowledged: false,
              createdAt: new Date()
            };
            if (mongoose.connection.readyState === 1) {
              const alertObj = new Alert(alertData);
              await alertObj.save();
            }
            if (io) {
              io.emit('alerts', alertData);
            }
          }
        } catch (alertErr) {
          console.warn('Alert match check warning:', alertErr.message);
        }
      }
    }

    return res.status(200).json(savedEvents);

  } catch (error) {
    console.error('Error processing video through ML service:', error);
    const rawError = error.response && error.response.data ? error.response.data : error.message;
    const detailMsg = typeof rawError === 'object' ? JSON.stringify(rawError) : String(rawError);
    return res.status(500).json({ error: 'Failed to process video', details: detailMsg });

  } finally {
    isVideoProcessingBusy = false;
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

const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);

// In-memory fallback stores if MongoDB connection is unavailable
const memoryStore = {
  cameras: [
    { camera_id: 'CAM_01', name: 'NH48 Highway Toll Plaza', latitude: 28.6139, longitude: 77.2090, status: 'active' },
    { camera_id: 'CAM_02', name: 'City Center Main Junction', latitude: 28.5355, longitude: 77.3910, status: 'active' },
  ],
  events: [],
  blacklist: [
    { plate_number: 'KA 03 X 9981', reason: 'Stolen Vehicle', added_by: 'police_dept' }
  ]
};

app.get('/api/cameras', async (req, res) => {
  try {
    const cameras = await Camera.find();
    return res.status(200).json(cameras);
  } catch (error) {
    console.warn('DB Query failed, serving in-memory camera store:', error.message);
    return res.status(200).json(memoryStore.cameras);
  }
});

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
    memoryStore.cameras.push(savedCamera);
    return res.status(201).json(savedCamera);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Camera ID already exists' });
    }
    // If DB is disconnected, save to memory store
    const { camera_id, name, latitude, longitude, status } = req.body;
    const newCam = { camera_id, name, latitude, longitude, status: status || 'active', _id: 'mem_' + Date.now() };
    memoryStore.cameras.push(newCam);
    return res.status(201).json(newCam);
  }
});

// ==========================================
// Blacklist Endpoints
// ==========================================
app.post('/api/blacklist', async (req, res) => {
  try {
    const { plate_number, reason, added_by } = req.body;
    if (!plate_number) {
      return res.status(400).json({ error: 'plate_number is required' });
    }

    const entry = new BlacklistEntry({
      plate_number,
      reason: reason || '',
      added_by: added_by || 'system',
    });

    const savedEntry = await entry.save();
    return res.status(201).json(savedEntry);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Plate number is already blacklisted' });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/blacklist', async (req, res) => {
  try {
    const entries = await BlacklistEntry.find();
    return res.status(200).json(entries);
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
    console.warn('DB Query failed, serving memoryStore events:', error.message);
    const { plate } = req.query;
    let filtered = memoryStore.events;
    if (plate) {
      filtered = memoryStore.events.filter((e) => e.plate_number.toLowerCase().includes(plate.toLowerCase()));
    }
    return res.status(200).json(filtered);
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
