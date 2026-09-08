const mongoose = require('mongoose');

const detectionEventSchema = new mongoose.Schema(
  {
    plate_number: {
      type: String,
      required: true,
      index: true,
      trim: true,
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
