
const mongoose = require("mongoose");

const passwordResetCooldownSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },

    lastRequestedAt: {
      type: Date,
      required: true,
    },

    resetMethod: {
      type: String,
      enum: ["email", "phone"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "PasswordResetCooldown",
  passwordResetCooldownSchema
);
