const mongoose = require("mongoose");

const loginSessionSchema = new mongoose.Schema(
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

    sessionId: {
      type: String,
      required: true,
      unique: true,
    },

    tokenHash: {
      type: String,
      required: true,
      select: false,
    },

    browser: String,
    operatingSystem: String,
    deviceType: String,
    deviceModel: String,

    userAgent: String,
    ipAddress: String,

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    verifiedAt: {
      type: Date,
      required: true,
    },

    lastSeenAt: { 
      type: Date, 
      default: Date.now 
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revokedAt: Date,
    revokedReason: String,
  },
  { timestamps: true }
);

loginSessionSchema.index({ firebaseUid: 1, active: 1 });
loginSessionSchema.index({ firebaseUid: 1, createdAt: -1 });
loginSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model("LoginSession", loginSessionSchema);