
const mongoose = require("mongoose");

const passwordResetHistorySchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      index: true,
    },

    email: {
      type: String,
      default: "",
    },

    resetMethod: {
      type: String,
      enum: ["email", "phone"],
      required: true,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    verificationStatus: {
      type: String,
      enum: [
        "requested",
        "verified",
        "completed",
        "expired",
        "failed",
        "blocked",
      ],
      default: "requested",
    },

    ipAddress: {
      type: String,
      default: "Unknown",
    },

    browser: {
      type: String,
      default: "Unknown",
    },

    browserVersion: {
      type: String,
      default: "Unknown",
    },

    operatingSystem: {
      type: String,
      default: "Unknown",
    },

    deviceType: {
      type: String,
      enum: ["desktop", "laptop", "tablet", "mobile", "unknown"],
      default: "unknown",
    },

    device: {
      type: String,
      default: "Unknown",
    },

    deliveryStatus: {
      type: String,
      enum: ["not_started", "pending", "sent", "failed"],
      default: "not_started",
    },

    deliveryAttempts: {
      type: Number,
      default: 0,
    },

    passwordUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "PasswordResetHistory",
  passwordResetHistorySchema
);
