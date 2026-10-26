
const mongoose = require("mongoose");

const publicSpaceFriendshipSchema = new mongoose.Schema(
  {
    // Store each pair in a consistent order to prevent duplicate requests.
    userAUid: {
      type: String,
      required: true,
      trim: true,
    },
    userBUid: {
      type: String,
      required: true,
      trim: true,
    },

    requestedByUid: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "blocked"],
      default: "pending",
      index: true,
    },

    respondedAt: {
      type: Date,
      default: null,
    },

    blockedByUid: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// A pair can have only one friendship record.
publicSpaceFriendshipSchema.index(
  { userAUid: 1, userBUid: 1 },
  { unique: true }
);

// Find accepted friendships for either user.
publicSpaceFriendshipSchema.index(
  { userAUid: 1, status: 1 }
);

publicSpaceFriendshipSchema.index(
  { userBUid: 1, status: 1 }
);

module.exports =
  mongoose.models.PublicSpaceFriendship ||
  mongoose.model("PublicSpaceFriendship", publicSpaceFriendshipSchema);
