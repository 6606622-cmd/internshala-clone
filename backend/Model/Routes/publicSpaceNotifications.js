
const express = require("express");
const mongoose = require("mongoose");
const { getAuth } = require("firebase-admin/auth");

const { adminApp } = require("../../firebaseAdmin");
const Notification = require("../PublicSpaceNotification");

const router = express.Router();
const firebaseAuth = getAuth(adminApp);

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
    const decoded = await firebaseAuth.verifyIdToken(token);
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

// GET notifications, newest first.
// Example: GET /api/public-space/notifications?limit=20&unreadOnly=true
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const uid = req.user.uid;

    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 50)
      : 20;

    const filter = { recipientUid: uid };

    if (req.query.unreadOnly === "true") {
      filter.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),

      Notification.countDocuments({
        recipientUid: uid,
        isRead: false,
      }),
    ]);

    res.json({
      success: true,
      notifications,
      unreadCount,
    });
  })
);

// GET unread count for the notification badge.
router.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const unreadCount = await Notification.countDocuments({
      recipientUid: req.user.uid,
      isRead: false,
    });

    res.json({ success: true, unreadCount });
  })
);

// Mark one notification as read.
router.patch(
  "/:notificationId/read",
  asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipientUid: req.user.uid,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.json({ success: true, notification });
  })
);

// Mark all of the current user's notifications as read.
router.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    const result = await Notification.updateMany(
      {
        recipientUid: req.user.uid,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  })
);

// Delete one of the current user's notifications.
router.delete(
  "/:notificationId",
  asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const result = await Notification.deleteOne({
      _id: notificationId,
      recipientUid: req.user.uid,
    });

    if (!result.deletedCount) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.json({ success: true, message: "Notification deleted." });
  })
);

module.exports = router;
