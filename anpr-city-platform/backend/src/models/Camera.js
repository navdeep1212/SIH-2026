const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema(
  {
    camera_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'simulated'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Camera', cameraSchema);
