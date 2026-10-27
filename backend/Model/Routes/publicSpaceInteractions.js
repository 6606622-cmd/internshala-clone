
const express = require("express");
const mongoose = require("mongoose");
const { getAuth } = require("firebase-admin/auth");

const { adminApp } = require("../../firebaseAdmin");
const PublicSpacePost = require("../PublicSpacePost");
const PublicSpaceInteraction = require("../PublicSpaceInteraction");

const router = express.Router();
const firebaseAuth = getAuth(adminApp);

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

// Verify the Firebase ID token.
const requireFirebaseAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    req.user = { uid: decoded.uid };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired login." });
  }
});

router.use(requireFirebaseAuth);

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

async function findAvailablePost(postId, uid, res) {
  if (!validId(postId)) {
    res.status(400).json({ message: "Invalid post ID." });
    return null;
  }

  const post = await PublicSpacePost.findOne({
    _id: postId,
    isDeleted: false,
  });

  if (!post) {
    res.status(404).json({ message: "Post not found." });
    return null;
  }

  // This initial version allows interactions with public posts,
  // plus posts authored by the current user.
  if (post.privacy !== "public" && post.authorUid !== uid) {
    res.status(403).json({
      message: "You cannot interact with this private post.",
    });
    return null;
  }

  return post;
}


/**
 * GET MY INTERACTION STATUS
 * Example:
 * /public-space/interactions/status?postIds=id1,id2,id3
 *
 * Returns the current user's liked and saved post IDs.
 */
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const rawPostIds =
      typeof req.query.postIds === "string"
        ? req.query.postIds
        : "";

    const postIds = [
      ...new Set(
        rawPostIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      ),
    ];

    if (postIds.length > 100) {
      return res.status(400).json({
        message: "Maximum 100 post IDs per request.",
      });
    }

    if (postIds.some((id) => !validId(id))) {
      return res.status(400).json({
        message: "One or more post IDs are invalid.",
      });
    }

    if (postIds.length === 0) {
      return res.json({
        likedPostIds: [],
        savedPostIds: [],
      });
    }

    const interactions = await PublicSpaceInteraction.find({
      userUid: req.user.uid,
      postId: { $in: postIds },
      type: { $in: ["like", "save"] },
    })
      .select("postId type")
      .lean();

    const likedPostIds = interactions
      .filter((item) => item.type === "like")
      .map((item) => String(item.postId));

    const savedPostIds = interactions
      .filter((item) => item.type === "save")
      .map((item) => String(item.postId));

    res.json({
      likedPostIds,
      savedPostIds,
    });
  })
);


// LIKE / UNLIKE
router.post(
  "/:postId/like",
  asyncHandler(async (req, res) => {
    const uid = req.user.uid;
    const post = await findAvailablePost(req.params.postId, uid, res);
    if (!post) return;

    const filter = {
      postId: post._id,
      userUid: uid,
      type: "like",
    };

    const existing = await PublicSpaceInteraction.findOne(filter);

    if (existing) {
      await PublicSpaceInteraction.deleteOne({ _id: existing._id });
    } else {
      try {
        await PublicSpaceInteraction.create(filter);
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }

    const likesCount = await PublicSpaceInteraction.countDocuments({
      postId: post._id,
      type: "like",
    });

    await PublicSpacePost.updateOne(
      { _id: post._id },
      { $set: { likesCount } }
    );

    const liked = Boolean(
      await PublicSpaceInteraction.exists(filter)
    );

    res.json({ liked, likesCount });
  })
);

// ADD COMMENT
router.post(
  "/:postId/comments",
  asyncHandler(async (req, res) => {
    const uid = req.user.uid;
    const post = await findAvailablePost(req.params.postId, uid, res);
    if (!post) return;

    const text = typeof req.body.text === "string"
      ? req.body.text.trim()
      : "";

    if (!text || text.length > 2000) {
      return res.status(400).json({
        message: "Comment must contain 1–2000 characters.",
      });
    }

    const comment = await PublicSpaceInteraction.create({
      postId: post._id,
      userUid: uid,
      type: "comment",
      text,
    });

    const commentsCount = await PublicSpaceInteraction.countDocuments({
      postId: post._id,
      type: "comment",
    });

    await PublicSpacePost.updateOne(
      { _id: post._id },
      { $set: { commentsCount } }
    );

    res.status(201).json({
      comment: {
        id: comment._id,
        userUid: comment.userUid,
        text: comment.text,
        createdAt: comment.createdAt,
      },
      commentsCount,
    });
  })
);

// GET COMMENTS
router.get(
  "/:postId/comments",
  asyncHandler(async (req, res) => {
    const uid = req.user.uid;
    const post = await findAvailablePost(req.params.postId, uid, res);
    if (!post) return;

    const comments = await PublicSpaceInteraction.find({
      postId: post._id,
      type: "comment",
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    res.json({
      comments: comments.map((comment) => ({
        id: comment._id,
        userUid: comment.userUid,
        text: comment.text,
        createdAt: comment.createdAt,
      })),
    });
  })
);

// DELETE YOUR OWN COMMENT
router.delete(
  "/comments/:commentId",
  asyncHandler(async (req, res) => {
    const uid = req.user.uid;

    if (!validId(req.params.commentId)) {
      return res.status(400).json({ message: "Invalid comment ID." });
    }

    const comment = await PublicSpaceInteraction.findOne({
      _id: req.params.commentId,
      userUid: uid,
      type: "comment",
    });

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found or you cannot delete it.",
      });
    }

    await PublicSpaceInteraction.deleteOne({ _id: comment._id });

    const commentsCount = await PublicSpaceInteraction.countDocuments({
      postId: comment.postId,
      type: "comment",
    });

    await PublicSpacePost.updateOne(
      { _id: comment.postId },
      { $set: { commentsCount } }
    );

    res.json({ message: "Comment deleted.", commentsCount });
  })
);

// SAVE / UNSAVE
router.post(
  "/:postId/save",
  asyncHandler(async (req, res) => {
    const uid = req.user.uid;
    const post = await findAvailablePost(req.params.postId, uid, res);
    if (!post) return;

    const filter = {
      postId: post._id,
      userUid: uid,
      type: "save",
    };

    const existing = await PublicSpaceInteraction.findOne(filter);

    if (existing) {
      await PublicSpaceInteraction.deleteOne({ _id: existing._id });
    } else {
      try {
        await PublicSpaceInteraction.create(filter);
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }

    const saved = Boolean(
      await PublicSpaceInteraction.exists(filter)
    );

    res.json({ saved });
  })
);

// LIST SAVED POSTS
router.get(
  "/saved",
  asyncHandler(async (req, res) => {
    const saves = await PublicSpaceInteraction.find({
      userUid: req.user.uid,
      type: "save",
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("postId createdAt")
      .lean();

    const ids = saves.map((item) => item.postId);

    const posts = await PublicSpacePost.find({
      _id: { $in: ids },
      isDeleted: false,
    }).lean();

    const postMap = new Map(
      posts.map((post) => [String(post._id), post])
    );

    res.json({
      posts: saves
        .map((save) => postMap.get(String(save.postId)))
        .filter(Boolean),
    });
  })
);

// REPORT A POST
router.post(
  "/:postId/report",
  asyncHandler(async (req, res) => {
    const uid = req.user.uid;
    const post = await findAvailablePost(req.params.postId, uid, res);
    if (!post) return;

    if (post.authorUid === uid) {
      return res.status(400).json({
        message: "You cannot report your own post.",
      });
    }

    const allowedReasons = [
      "spam",
      "harassment",
      "inappropriate",
      "misinformation",
      "other",
    ];

    const reason = typeof req.body.reason === "string"
      ? req.body.reason.trim().toLowerCase()
      : "";

    if (!allowedReasons.includes(reason)) {
      return res.status(400).json({
        message: "Choose a valid report reason.",
        allowedReasons,
      });
    }

    try {
      await PublicSpaceInteraction.create({
        postId: post._id,
        userUid: uid,
        type: "report",
        reportReason: reason,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "You have already reported this post.",
        });
      }
      throw error;
    }

    res.status(201).json({
      message: "Report submitted for review.",
    });
  })
);

module.exports = router;
