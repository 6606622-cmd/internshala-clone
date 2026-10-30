
const express = require("express");
const mongoose = require("mongoose");
const { getAuth } = require("firebase-admin/auth");

const { adminApp } = require("../../firebaseAdmin");
const Friendship = require("../PublicSpaceFriendship");
const PublicSpaceNotification = require("../PublicSpaceNotification");

const router = express.Router();
const auth = getAuth(adminApp);

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const requireFirebaseAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = { uid: decoded.uid };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired login.",
    });
  }
});

router.use(requireFirebaseAuth);

async function createNotification({
  recipientUid,
  actorUid,
  type,
  message,
  friendshipId,
}) {
  if (!recipientUid || !actorUid || recipientUid === actorUid) return;

  try {
    await PublicSpaceNotification.create({
      recipientUid,
      actorUid,
      type,
      message,
      friendshipId,
    });
  } catch (error) {
    // Notification failures should not cancel a successful friend action.
    console.error("Friend notification creation failed:", error.message);
  }
}

function getPair(uid1, uid2) {
  return [uid1, uid2].sort();
}

// SEND FRIEND REQUEST
router.post(
  "/request/:targetUid",
  asyncHandler(async (req, res) => {
    const uid = req.user.uid;
    const targetUid = String(req.params.targetUid || "").trim();

    if (!targetUid || targetUid === uid) {
      return res.status(400).json({
        message: "You cannot send a friend request to yourself.",
      });
    }

    // Confirm that the target is a valid Firebase user.
    try {
      await auth.getUser(targetUid);
    } catch {
      return res.status(404).json({
        message: "The target user was not found.",
      });
    }

    const [userAUid, userBUid] = getPair(uid, targetUid);

    let friendship = await Friendship.findOne({
      userAUid,
      userBUid,
    });

    if (friendship) {
      if (friendship.status === "accepted") {
        return res.status(409).json({
          message: "You are already friends.",
          friendship,
        });
      }

      if (friendship.status === "pending") {
        return res.status(409).json({
          message: "A friend request is already pending.",
          friendship,
        });
      }

      if (friendship.status === "blocked") {
        return res.status(403).json({
          message: "This friendship request cannot be sent.",
        });
      }

      // Permit a new request after a previous request was rejected.
      friendship.requestedByUid = uid;
      friendship.status = "pending";
      friendship.respondedAt = null;
      friendship.blockedByUid = null;
      await friendship.save();
    } else {
      friendship = await Friendship.create({
        userAUid,
        userBUid,
        requestedByUid: uid,
        status: "pending",
      });
    }

    await createNotification({
      recipientUid: targetUid,
      actorUid: uid,
      type: "friend_request",
      message: "You received a new friend request.",
      friendshipId: friendship._id,
    });

    return res.status(201).json({
      message: "Friend request sent.",
      friendship,
    });
  })
);

// ACCEPT OR REJECT AN INCOMING REQUEST
router.patch(
  "/:friendshipId/respond",
  asyncHandler(async (req, res) => {
    const uid = req.user.uid;
    const { friendshipId } = req.params;
    const action =
      typeof req.body.action === "string"
        ? req.body.action.trim().toLowerCase()
        : "";

    if (!mongoose.Types.ObjectId.isValid(friendshipId)) {
      return res.status(400).json({
        message: "Invalid friendship ID.",
      });
    }

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        message: "Action must be accept or reject.",
      });
    }

    const friendship = await Friendship.findOne({
      _id: friendshipId,
      status: "pending",
    });

    if (!friendship) {
      return res.status(404).json({
        message: "Pending friend request not found.",
      });
    }

    if (
      friendship.requestedByUid === uid ||
      (friendship.userAUid !== uid && friendship.userBUid !== uid)
    ) {
      return res.status(403).json({
        message: "You cannot respond to this friend request.",
      });
    }

    friendship.status = action === "accept" ? "accepted" : "rejected";
    friendship.respondedAt = new Date();
    await friendship.save();

    if (action === "accept") {
      await createNotification({
        recipientUid: friendship.requestedByUid,
        actorUid: uid,
        type: "friend_accepted",
        message: "Your friend request was accepted.",
        friendshipId: friendship._id,
      });
    }

    return res.json({
      message:
        action === "accept"
          ? "Friend request accepted."
          : "Friend request rejected.",
      friendship,
    });
  })
);

// LIST ACCEPTED FRIENDS
router.get(
  "/friends",
  asyncHandler(async (req, res) => {
    const uid = req.user.uid;

    const friendships = await Friendship.find({
      status: "accepted",
      $or: [{ userAUid: uid }, { userBUid: uid }],
    })
      .sort({ respondedAt: -1 })
      .lean();

    const friends = friendships.map((friendship) => ({
      friendshipId: friendship._id,
      uid:
        friendship.userAUid === uid
          ? friendship.userBUid
          : friendship.userAUid,
      since: friendship.respondedAt,
    }));

    return res.json({ friends });
  })
);

// LIST INCOMING PENDING REQUESTS
router.get(
  "/requests/incoming",
  asyncHandler(async (req, res) => {
    const uid = req.user.uid;

    const requests = await Friendship.find({
      status: "pending",
      requestedByUid: { $ne: uid },
      $or: [{ userAUid: uid }, { userBUid: uid }],
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ requests });
  })
);


// UNFOLLOW / REMOVE FRIEND
router.delete(
  "/:friendshipId",
  asyncHandler(async (req, res) => {
    const uid = req.user.uid;
    const { friendshipId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(friendshipId)) {
      return res.status(400).json({
        message: "Invalid friendship ID.",
      });
    }

    const friendship = await Friendship.findOne({
      _id: friendshipId,
      status: "accepted",
      $or: [{ userAUid: uid }, { userBUid: uid }],
    });

    if (!friendship) {
      return res.status(404).json({
        message: "Friendship not found or already removed.",
      });
    }

    await Friendship.deleteOne({ _id: friendship._id });

    return res.json({
      message: "Friend removed successfully.",
    });
  })
);


module.exports = router;
