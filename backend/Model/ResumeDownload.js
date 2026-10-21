const mongoose = require("mongoose");

const resumeDownloadSchema = new mongoose.Schema({
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  downloadedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

resumeDownloadSchema.index({ userId: 1, downloadedAt: -1 });

module.exports =
  mongoose.models.ResumeDownload ||
  mongoose.model("ResumeDownload", resumeDownloadSchema);