const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coords: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  accuracy: { type: Number },
  address: { type: String },
  role: { type: String, enum: ['elder', 'family', 'driver'] },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

locationSchema.index({ coords: '2dsphere' });
locationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Location', locationSchema);
