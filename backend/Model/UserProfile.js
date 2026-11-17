
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

    // True only after the user chooses or accepts a username.
    usernameChosen: {
      type: Boolean,
      default: false,
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

    // Verified mobile number in E.164 format.
    phoneNumber: {
      type: String,
      default: null,
      trim: true,
      match: /^\+[1-9]\d{7,14}$/,
      unique: true,
      sparse: true,
    },

    // True only after successful Firebase phone verification.
    phoneVerified: {
      type: Boolean,
      default: false,
    },

    contactPhoneNumber: {
      type: String,
      default: null,
      trim: true,
    },

    contactPhoneVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.UserProfile ||
  mongoose.model("UserProfile", userProfileSchema);
