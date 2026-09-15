const mongoose = require('mongoose');
const { ALLOWED_VEHICLE_TYPES, ALLOWED_VEHICLE_COLORS } = require('../constants');

const detectionEventSchema = new mongoose.Schema(
  {
    plate_number: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    vehicle_type: {
      type: String,
      enum: ALLOWED_VEHICLE_TYPES,
      default: 'unknown',
      index: true,
    },
    vehicle_color: {
      type: String,
      enum: ALLOWED_VEHICLE_COLORS,
      default: 'unknown',
      index: true,
    },
    color_confidence: {
      type: Number,
      default: 0.0,
    },
    camera_id: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    confidence: {
      type: Number,
      required: true,
    },
    matched_format: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DetectionEvent', detectionEventSchema);
