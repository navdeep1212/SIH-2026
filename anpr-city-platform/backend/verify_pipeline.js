const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function verifyAll() {
  console.log('=== STEP 1: Testing GET http://localhost:8000/health ===');
  try {
    const res = await axios.get('http://localhost:8000/health');
    console.log('FastAPI Health Status:', res.status, res.data);
  } catch (err) {
    console.error('FastAPI Health Failed:', err.message);
  }

  console.log('\n=== STEP 2: Testing GET http://localhost:5000/api/cameras ===');
  try {
    const res = await axios.get('http://localhost:5000/api/cameras');
    console.log('Backend Cameras Status:', res.status, 'Count:', res.data.length);
    console.log('Cameras:', res.data);
  } catch (err) {
    console.error('Backend Cameras Failed:', err.message);
  }

  console.log('\n=== STEP 3: Testing POST http://localhost:5000/api/videos/process with test1.mp4 ===');
  const videoPath = 'c:/Users/navde/OneDrive/Desktop/SIH 2026/anpr-city-platform/ml-service/test_video/test1.mp4';
  if (!fs.existsSync(videoPath)) {
    console.error('Error: video path does not exist:', videoPath);
    return;
  }

  const formData = new FormData();
  formData.append('video', fs.createReadStream(videoPath), 'test1.mp4');
  formData.append('camera_id', 'CAM_01');

  const startTime = Date.now();
  console.log('Sending request to Express backend (waiting for ML processing ~300s)...');
  try {
    const res = await axios.post('http://localhost:5000/api/videos/process', formData, {
      headers: formData.getHeaders(),
      timeout: 600000
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nBackend Process Response Status: ${res.status} (Elapsed: ${elapsed}s)`);
    console.log('Returned Detection Events:', JSON.stringify(res.data, null, 2));

    console.log('\n=== STEP 4: Testing GET http://localhost:5000/api/events?plate=CH01AF1502 ===');
    const searchRes = await axios.get('http://localhost:5000/api/events?plate=CH01AF1502');
    console.log('Plate Search Response Status:', searchRes.status);
    console.log('Search Results:', JSON.stringify(searchRes.data, null, 2));

  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`Process Error after ${elapsed}s:`, err.response ? err.response.status : 'No Response');
    console.error('Error Data:', err.response ? err.response.data : err.message);
  }
}

verifyAll();
