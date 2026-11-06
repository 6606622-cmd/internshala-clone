const mongoose = require("mongoose");

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["bronze", "silver", "gold"],
      required: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    razorpayPaymentId: {
      type: String,
      default: "",
      unique: true,
      sparse: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["created", "paid", "failed", "cancelled"],
      default: "created",
    },

    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    paidAt: Date,

    validFrom: Date,

    validUntil: Date,
  },
  { timestamps: true }
);

subscriptionPaymentSchema.index({
  firebaseUid: 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.SubscriptionPayment ||
  mongoose.model("SubscriptionPayment", subscriptionPaymentSchema);