
const express = require("express");
const router = express.Router();

const Post = require("../PublicSpacePost");
const Friendship = require("../PublicSpaceFriendship");
const requireFirebaseAuth = require("../../middleware/requireFirebaseAuth");

const EDIT_WINDOW_MINUTES = Math.max(
  1,
  Number(process.env.PUBLIC_SPACE_EDIT_MINUTES) || 15
);

const DUPLICATE_WINDOW_MINUTES = 10;
const MAX_TEXT_LENGTH = 5000;
const MAX_MEDIA_ITEMS = 4;

function getDailyPostLimit(friendCount) {
  if (friendCount === 0) return 0;
  if (friendCount === 1) return 1;
  if (friendCount <= 5) return 2;
  if (friendCount <= 10) return 5;
  return Infinity;
}

function getMediaType(text, media) {
  if (media.length === 0) return "text";
  if (text && media.length > 0) return "mixed";
  return media[0].type;
}

function getUtcDayStart() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

// Count accepted friends using server-side records.
async function getAcceptedFriendCount(uid) {
  return Friendship.countDocuments({
    status: "accepted",
    $or: [{ userAUid: uid }, { userBUid: uid }],
  });
}

// Create a post.
router.post("/", requireFirebaseAuth, async (req, res) => {
  try {
    const uid = req.firebaseUser.uid;
    const text = typeof req.body.text === "string"
      ? req.body.text.trim()
      : "";

    const privacy = req.body.privacy || "public";
    const rawMedia = req.body.media ?? [];

    if (!["public", "friends"].includes(privacy)) {
      return res.status(400).json({
        success: false,
        message: "Privacy must be public or friends.",
      });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Post text cannot exceed ${MAX_TEXT_LENGTH} characters.`,
      });
    }

    if (!Array.isArray(rawMedia) || rawMedia.length > MAX_MEDIA_ITEMS) {
      return res.status(400).json({
        success: false,
        message: `You can attach up to ${MAX_MEDIA_ITEMS} media items.`,
      });
    }

    if (!text && rawMedia.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add text, an image, or a video to create a post.",
      });
    }

    // Accept only HTTPS media URLs for now.
    // This does not replace secure media uploading or ownership checks.
    const media = [];

    for (const item of rawMedia) {
      if (
        !item ||
        !["image", "video"].includes(item.type) ||
        typeof item.url !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Each media item needs a valid type and URL.",
        });
      }

      let parsedUrl;

      try {
        parsedUrl = new URL(item.url);
      } catch {
        return res.status(400).json({
          success: false,
          message: "A media URL is invalid.",
        });
      }

      if (parsedUrl.protocol !== "https:") {
        return res.status(400).json({
          success: false,
          message: "Media URLs must use HTTPS.",
        });
      }

      media.push({
        type: item.type,
        url: parsedUrl.toString(),
      });
    }

    const friendCount = await getAcceptedFriendCount(uid);
    const dailyLimit = getDailyPostLimit(friendCount);

    if (dailyLimit === 0) {
      return res.status(403).json({
        success: false,
        message: "You need at least one accepted friend to publish posts.",
        friendCount,
        dailyLimit: 0,
      });
    }

    const dayStart = getUtcDayStart();

    if (Number.isFinite(dailyLimit)) {
      const postsToday = await Post.countDocuments({
        authorUid: uid,
        isDeleted: false,
        createdAt: { $gte: dayStart },
      });

      if (postsToday >= dailyLimit) {
        return res.status(429).json({
          success: false,
          message: "You have reached your daily posting limit.",
          friendCount,
          dailyLimit,
          postsToday,
        });
      }
    }

    // Prevent an identical post by this author within 10 minutes.
    const duplicateSince = new Date(
      Date.now() - DUPLICATE_WINDOW_MINUTES * 60 * 1000
    );

    const mediaSignature = media
      .map((item) => `${item.type}:${item.url}`)
      .sort()
      .join("|");

    const recentPosts = await Post.find({
      authorUid: uid,
      isDeleted: false,
      createdAt: { $gte: duplicateSince },
    })
      .select("text media")
      .lean();

    const duplicate = recentPosts.some((post) => {
      const previousSignature = (post.media || [])
        .map((item) => `${item.type}:${item.url}`)
        .sort()
        .join("|");

      return (
        (text || "") === (post.text || "") &&
        mediaSignature === previousSignature
      );
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "This looks like a duplicate of a recent post.",
      });
    }

    const editUntil = new Date(
      Date.now() + EDIT_WINDOW_MINUTES * 60 * 1000
    );

    const post = await Post.create({
      authorUid: uid,

      // Profile details will be connected to a trusted profile model later.
      authorProfile: {
        displayName: "",
        username: "",
        photoURL: "",
      },

      friendCountAtPosting: friendCount,
      text,
      media,
      mediaType: getMediaType(text, media),
      privacy,
      editUntil,
    });

    return res.status(201).json({
      success: true,
      message: "Post created successfully.",
      post,
      friendCount,
      dailyLimit: Number.isFinite(dailyLimit) ? dailyLimit : null,
    });
  } catch (error) {
    console.error("Create Public Space post error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not create post.",
    });
  }
});

// View recent public posts.
router.get("/", requireFirebaseAuth, async (req, res) => {
  try {
    const posts = await Post.find({
      privacy: "public",
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error) {
    console.error("Load Public Space posts error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load posts.",
    });
  }
});

// Edit an existing post.
router.patch("/:postId", requireFirebaseAuth, async (req, res) => {
  try {
    const uid = req.firebaseUser.uid;
    const { postId } = req.params;

    if (!require("mongoose").Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

    // Find only an active post belonging to the signed-in author.
    const post = await Post.findOne({
      _id: postId,
      authorUid: uid,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found or you are not its author.",
      });
    }

    if (!post.editUntil || new Date() > post.editUntil) {
      return res.status(403).json({
        success: false,
        message: "The editing time limit has expired.",
      });
    }

    const { text, media, privacy } = req.body;

    // Require the complete text and media fields for an edit.
    if (typeof text !== "string" || !Array.isArray(media)) {
      return res.status(400).json({
        success: false,
        message: "Provide text and a media array.",
      });
    }

    const cleanText = text.trim();

    if (cleanText.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Post text cannot exceed 5000 characters.",
      });
    }

    if (media.length > 4) {
      return res.status(400).json({
        success: false,
        message: "You can attach up to 4 media items.",
      });
    }

    if (!cleanText && media.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A post must contain text, an image, or a video.",
      });
    }

    if (
      privacy !== undefined &&
      !["public", "friends"].includes(privacy)
    ) {
      return res.status(400).json({
        success: false,
        message: "Privacy must be public or friends.",
      });
    }

    const cleanMedia = [];

    for (const item of media) {
      if (
        !item ||
        !["image", "video"].includes(item.type) ||
        typeof item.url !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Each media item needs a valid type and URL.",
        });
      }

      let parsedUrl;

      try {
        parsedUrl = new URL(item.url);
      } catch {
        return res.status(400).json({
          success: false,
          message: "A media URL is invalid.",
        });
      }

      if (parsedUrl.protocol !== "https:") {
        return res.status(400).json({
          success: false,
          message: "Media URLs must use HTTPS.",
        });
      }

      cleanMedia.push({
        type: item.type,
        url: parsedUrl.toString(),
      });
    }

    // Update only fields the author is allowed to change.
    post.text = cleanText;
    post.media = cleanMedia;
    post.mediaType =
      cleanMedia.length === 0
        ? "text"
        : cleanText
          ? "mixed"
          : cleanMedia[0].type;

    if (privacy !== undefined) {
      post.privacy = privacy;
    }

    await post.save();

    return res.json({
      success: true,
      message: "Post updated successfully.",
      post,
    });
  } catch (error) {
    console.error("Edit Public Space post error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update post.",
    });
  }
});

// Soft-delete a post.
router.delete("/:postId", requireFirebaseAuth, async (req, res) => {
  try {
    const uid = req.firebaseUser.uid;
    const { postId } = req.params;

    if (!require("mongoose").Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

    const post = await Post.findOneAndUpdate(
      {
        _id: postId,
        authorUid: uid,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found or you are not its author.",
      });
    }

    return res.json({
      success: true,
      message: "Post deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Public Space post error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not delete post.",
    });
  }
});

module.exports = router;
