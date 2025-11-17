const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
    },
    elderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pickupLocation: { type: String, required: true },
    dropLocation: { type: String, required: true },
    scheduledTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    // Charge/Payment fields
    distance: { type: Number }, // Distance in kilometers
    charge: { type: Number }, // Charge amount in local currency
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "wallet", "online"],
    },
    completedAt: { type: Date }, // When ride was completed
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", rideSchema);
