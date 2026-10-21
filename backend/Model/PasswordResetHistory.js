
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
    device: {
      type: String,
      default: "Unknown",
    },
    failureReason: {
      type: String,
      default: "",
    },
        otpHash: {
      type: String,
      default: "",
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    lastOtpSentAt: {
      type: Date,
      default: null,
    },
    resetTokenHash: {
      type: String,
      default: "",
      select: false,
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
    resetTokenUsedAt: {
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
