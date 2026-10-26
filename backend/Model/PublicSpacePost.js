
const mongoose = require("mongoose");

const publicSpacePostSchema = new mongoose.Schema(
  {
    authorUid: {
      type: String,
      required: true,
      index: true,
    },

    authorProfile: {
      displayName: { type: String, default: "" },
      username: { type: String, default: "" },
      photoURL: { type: String, default: "" },
    },

    friendCountAtPosting: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    text: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    media: [
      {
        type: {
          type: String,
          enum: ["image", "video"],
          required: true,
        },
        url: { type: String, required: true },
        storageKey: { type: String, default: "" },
        contentHash: { type: String, default: "" },
      },
    ],

    mediaType: {
      type: String,
      enum: ["text", "image", "video", "mixed"],
      required: true,
      default: "text",
    },

    privacy: {
      type: String,
      enum: ["public", "friends"],
      default: "public",
    },

    hashtags: [{ type: String, lowercase: true, trim: true }],
    mentions: [{ type: String, trim: true }],

    likesCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    sharesCount: { type: Number, default: 0, min: 0 },
    viewsCount: { type: Number, default: 0, min: 0 },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    editUntil: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

publicSpacePostSchema.index({ authorUid: 1, createdAt: -1 });
publicSpacePostSchema.index({ privacy: 1, createdAt: -1 });
publicSpacePostSchema.index({ hashtags: 1, createdAt: -1 });

module.exports =
  mongoose.models.PublicSpacePost ||
  mongoose.model("PublicSpacePost", publicSpacePostSchema);
