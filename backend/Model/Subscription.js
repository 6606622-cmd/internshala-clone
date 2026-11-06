
const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["free", "bronze", "silver", "gold"],
      default: "free",
    },

    status: {
      type: String,
      enum: ["active", "pending", "cancelled", "expired"],
      default: "active",
    },

    monthlyLimit: {
      type: Number,
      default: 1, // -1 means unlimited
    },

    applicationsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    quotaMonth: {
      type: String,
      default: "",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    pendingPlan: {
      type: String,
      enum: ["free", "bronze", "silver", "gold", null],
      default: null,
    },

    lastPaymentId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);
  