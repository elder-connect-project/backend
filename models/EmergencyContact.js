const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  elderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  relation: { type: String, required: true },
  priority: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

emergencyContactSchema.index({ elderId: 1, priority: 1 });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
