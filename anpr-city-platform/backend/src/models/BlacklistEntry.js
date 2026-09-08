const mongoose = require('mongoose');

const blacklistEntrySchema = new mongoose.Schema(
  {
    plate_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    reason: {
      type: String,
      default: '',
    },
    added_by: {
      type: String,
      default: 'system',
    },
    added_on: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlacklistEntry', blacklistEntrySchema);
