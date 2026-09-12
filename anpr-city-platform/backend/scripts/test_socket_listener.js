const { io } = require('socket.io-client');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';

console.log(`Connecting to Socket.io server at ${SOCKET_URL}...`);

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log(`[${new Date().toISOString()}] Connected to Socket.io server with ID: ${socket.id}`);
  console.log('Listening for real-time alerts on "alerts" channel...\n');
});

socket.on('connect_error', (err) => {
  console.error(`[${new Date().toISOString()}] Socket connection error:`, err.message);
});

socket.on('disconnect', (reason) => {
  console.log(`[${new Date().toISOString()}] Disconnected from server: ${reason}`);
});

socket.on('alerts', (alertData) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚨 REAL-TIME ALERT RECEIVED on "alerts" channel:`);
  console.log(JSON.stringify(alertData, null, 2));
  console.log('--------------------------------------------------');
});
