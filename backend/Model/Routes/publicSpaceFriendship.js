
const express = require("express");
const router = express.Router();

const Friendship = require("../PublicSpaceFriendship");
const requireFirebaseAuth = require("../../middleware/requireFirebaseAuth");

// Keep the pair in a consistent order.
function getPair(uid1, uid2) {
  return [uid1, uid2].sort();
}

// Send a friend request.
router.post("/request/:targetUid", requireFirebaseAuth, async (req, res) => {
  try {
    const requesterUid = req.firebaseUser.uid;
    const targetUid = String(req.params.targetUid || "").trim();

    if (!targetUid || targetUid === requesterUid) {
      return res.status(400).json({
        success: false,
        message: "Invalid friend request target.",
      });
    }

    const [userAUid, userBUid] = getPair(requesterUid, targetUid);

    const existing = await Friendship.findOne({ userAUid, userBUid });

    if (existing) {
      if (existing.status === "accepted") {
        return res.status(409).json({
          success: false,
          message: "You are already friends.",
        });
      }

      if (existing.status === "pending") {
        return res.status(409).json({
          success: false,
          message: "A friend request already exists.",
        });
      }

      if (existing.status === "blocked") {
        return res.status(403).json({
          success: false,
          message: "This friendship cannot be requested.",
        });
      }

      // Allow a new request after a previous request was rejected.
      existing.status = "pending";
      existing.requestedByUid = requesterUid;
      existing.respondedAt = null;
      existing.blockedByUid = "";
      await existing.save();

      return res.status(200).json({
        success: true,
        message: "Friend request sent.",
      });
    }

    await Friendship.create({
      userAUid,
      userBUid,
      requestedByUid: requesterUid,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Friend request sent.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A friendship record already exists.",
      });
    }

    console.error("Friend request error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not send friend request.",
    });
  }
});

// Accept or reject a request.
router.patch("/:friendshipId/respond", requireFirebaseAuth, async (req, res) => {
  try {
    const currentUid = req.firebaseUser.uid;
    const { action } = req.body;

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be accept or reject.",
      });
    }

    const friendship = await Friendship.findById(req.params.friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Friend request not found.",
      });
    }

    const isParticipant =
      friendship.userAUid === currentUid ||
      friendship.userBUid === currentUid;

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You cannot respond to this request.",
      });
    }

    if (friendship.requestedByUid === currentUid) {
      return res.status(403).json({
        success: false,
        message: "You cannot respond to your own request.",
      });
    }

    if (friendship.status !== "pending") {
      return res.status(409).json({
        success: false,
        message: "This request is no longer pending.",
      });
    }

    friendship.status = action === "accept" ? "accepted" : "rejected";
    friendship.respondedAt = new Date();

    await friendship.save();

    return res.json({
      success: true,
      message:
        action === "accept"
          ? "Friend request accepted."
          : "Friend request rejected.",
      status: friendship.status,
    });
  } catch (error) {
    console.error("Friend request response error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not respond to friend request.",
    });
  }
});

// List accepted friends.
router.get("/friends", requireFirebaseAuth, async (req, res) => {
  try {
    const uid = req.firebaseUser.uid;

    const friendships = await Friendship.find({
      status: "accepted",
      $or: [{ userAUid: uid }, { userBUid: uid }],
    })
      .select("userAUid userBUid createdAt")
      .sort({ updatedAt: -1 })
      .lean();

    const friends = friendships.map((friendship) =>
      friendship.userAUid === uid
        ? friendship.userBUid
        : friendship.userAUid
    );

    return res.json({
      success: true,
      count: friends.length,
      friends,
    });
  } catch (error) {
    console.error("Friends list error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not load friends.",
    });
  }
});

// List incoming pending requests.
router.get("/requests/incoming", requireFirebaseAuth, async (req, res) => {
  try {
    const uid = req.firebaseUser.uid;

    const requests = await Friendship.find({
      status: "pending",
      requestedByUid: { $ne: uid },
      $or: [{ userAUid: uid }, { userBUid: uid }],
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Incoming requests error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not load friend requests.",
    });
  }
});


// TEMPORARY: Debug friendship records for the signed-in user.
router.get("/debug", requireFirebaseAuth, async (req, res) => {
  try {
    const uid = req.firebaseUser.uid;

    const records = await Friendship.find({
      $or: [{ userAUid: uid }, { userBUid: uid }],
    })
      .select(
        "_id userAUid userBUid requestedByUid status createdAt"
      )
      .lean();

    return res.json({
      success: true,
      uid,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error("Friendship debug error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not inspect friendship records.",
    });
  }
});
module.exports = router;
