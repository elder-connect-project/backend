const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, default: "User" },
    lastName: { type: String, default: "" },
    role: {
      type: String,
      enum: ["elder", "family", "driver"],
      required: false, // Not required - user must select role during registration
      // No default - will be undefined for new users until they select a role
    },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Common profile
    address: { type: String },
    age: { type: Number },
    profileImage: { type: String }, // URI

    // Driver-specific fields
    licenseNumber: { type: String },
    licenseImage: { type: String }, // URI
    isAvailable: { type: Boolean, default: true },

    refreshToken: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
