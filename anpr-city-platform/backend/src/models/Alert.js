const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DetectionEvent',
      required: true,
    },
    type: {
      type: String,
      enum: ['blacklist_match', 'route_anomaly'],
      required: true,
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
