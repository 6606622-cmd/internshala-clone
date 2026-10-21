const mongoose = require("mongoose");

const languageHistorySchema = new mongoose.Schema(
  {
    language: {
      type: String,
      required: true,
      enum: ["en", "es", "hi", "pt", "zh", "fr"],
    },

    page: {
      type: String,
      default: "",
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },

    ip: {
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
  },
  { _id: false }
);

const userLanguageSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    email: {
      type: String,
      default: "",
    },

    preferredLanguage: {
      type: String,
      enum: ["en", "es", "hi", "pt", "zh", "fr"],
      default: "en",
    },

    pageLanguages: {
      type: Map,
      of: String,
      default: {},
    },

    languageHistory: {
      type: [languageHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.UserLanguage ||
  mongoose.model("UserLanguage", userLanguageSchema);