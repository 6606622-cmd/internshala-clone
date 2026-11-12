
const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_]+$/,
    },
    displayName: {
      type: String,
      default: "",
      trim: true,
    },
    photoURL: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);
module.exports =
  mongoose.models.UserProfile ||
  mongoose.model("UserProfile", userProfileSchema);
