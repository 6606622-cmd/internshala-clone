const mongoose = require("mongoose");

const LoginActivitySchema = new mongoose.Schema(
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

    eventType: {
      type: String,
      enum: [
        "LOGIN_ATTEMPT",
        "OTP_SENT",
        "OTP_VERIFIED",
        "OTP_FAILED",
        "LOGIN_SUCCESS",
        "LOGIN_BLOCKED",
        "LOGOUT",
        "SESSION_REVOKED",
      ],
      required: true,
    },

    loginStatus: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "BLOCKED"],
      default: "PENDING",
    },

    browser: {
      name: String,
      version: String,
    },

    operatingSystem: {
      name: String,
      version: String,
    },

    device: {
      type: {
        type: String,
        enum: ["desktop", "laptop", "tablet", "mobile", "unknown"],
        default: "unknown",
      },
      model: String,
      vendor: String,
    },

    ipAddress: {
      type: String,
      default: "",
    },

    location: {
      country: String,
      region: String,
      city: String,
    },

    userAgent: {
      type: String,
      default: "",
    },

    verificationMethod: {
      type: String,
      enum: ["GOOGLE", "EMAIL_PASSWORD", "PHONE", "NONE"],
      default: "NONE",
    },

    verificationStatus: {
      type: String,
      enum: ["NOT_REQUIRED", "PENDING", "VERIFIED", "FAILED"],
      default: "PENDING",
    },

    deviceTrusted: {
      type: Boolean,
      default: false,
    },

    failureReason: {
      type: String,
      default: "",
    },

    sessionId: {
      type: String,
      default: "",
    },

    loginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

LoginActivitySchema.index({ firebaseUid: 1, loginAt: -1 });
LoginActivitySchema.index({ sessionId: 1 });

module.exports =
  mongoose.models.LoginActivity ||
  mongoose.model("LoginActivity", LoginActivitySchema);
