
const mongoose = require("mongoose");

const loginWakitChallengeSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      index: true,
    },
    loginActivityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoginActivity",
      required: true,
      index: true,
    },
    wakitChallengeId: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

loginWakitChallengeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports =
  mongoose.models.LoginWakitChallenge ||
  mongoose.model("LoginWakitChallenge", loginWakitChallengeSchema);
