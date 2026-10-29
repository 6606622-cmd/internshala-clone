
const mongoose = require("mongoose");

const publicSpaceNotificationSchema = new mongoose.Schema(
  {
    recipientUid: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    actorUid: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "like",
        "comment",
        "share",
        "friend_request",
        "friend_accepted",
        "mention",
      ],
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PublicSpacePost",
      default: null,
    },

    friendshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PublicSpaceFriendship",
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

publicSpaceNotificationSchema.index({
  recipientUid: 1,
  isRead: 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.PublicSpaceNotification ||
  mongoose.model(
    "PublicSpaceNotification",
    publicSpaceNotificationSchema
  );
