const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relation: { type: String, default: "other" },
    isEmergency: { type: Boolean, default: false },
  },
  { timestamps: true }
);

contactSchema.index({ userId: 1 });

module.exports = mongoose.model("Contact", contactSchema);
