const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/anpr_db';
  try {
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`Primary MongoDB Connection Warning (${error.message}). Attempting fallback to local MongoDB...`);
    try {
      const localUri = 'mongodb://127.0.0.1:27017/anpr_db';
      const conn = await mongoose.connect(localUri, { serverSelectionTimeoutMS: 3000 });
      console.log(`Fallback local MongoDB Connected: ${conn.connection.host}`);
    } catch (localErr) {
      console.error(`MongoDB Unavailable (${localErr.message}). Server running with in-memory DB capability.`);
    }
  }
};

module.exports = connectDB;
