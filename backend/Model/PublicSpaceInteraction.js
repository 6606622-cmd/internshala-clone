
const mongoose = require("mongoose");

const publicSpaceInteractionSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PublicSpacePost",
      required: true,
      index: true,
    },
    userUid: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["like", "comment", "save", "report"],
      required: true,
      index: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    reportReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true }
);

// One like, save, or report per user per post.
// A user can leave multiple comments on a post.
publicSpaceInteractionSchema.index(
  { postId: 1, userUid: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: { $in: ["like", "save", "report"] },
    },
  }
);

publicSpaceInteractionSchema.index({
  userUid: 1,
  type: 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.PublicSpaceInteraction ||
  mongoose.model("PublicSpaceInteraction", publicSpaceInteractionSchema);
