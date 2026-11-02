const mongoose = require("mongoose");

const LoginOtpSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, index: true },
    email: { type: String, required: true },
    otpHash: { type: String, required: true },
    loginActivityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoginActivity",
      required: true,
    },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

LoginOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.LoginOtp ||
  mongoose.model("LoginOtp", LoginOtpSchema);