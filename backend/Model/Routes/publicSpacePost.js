
const express = require("express");
const mongoose = require("mongoose");
const { getAuth } = require("firebase-admin/auth");

const router = express.Router();

const Post = require("../PublicSpacePost");
const Friendship = require("../PublicSpaceFriendship");
const requireFirebaseAuth = require("../../middleware/requireFirebaseAuth");
const adminApp = require("../../firebaseAdmin");

const firebaseAuth = getAuth(adminApp);

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

function extractHashtags(text) {
  return [
    ...new Set(
      (text.match(/#[\p{L}\p{N}_]+/gu) || []).map((tag) =>
        tag.slice(1).toLowerCase()
      )
    ),
  ].slice(0, 50);
}

function extractMentions(text) {
  return [
    ...new Set(
      (text.match(/@[\p{L}\p{N}_]+/gu) || []).map((mention) =>
        mention.slice(1).toLowerCase()
      )
    ),
  ].slice(0, 50);
}

// Firebase user records provide displayName and photoURL.
// Firebase does not have a native username field, so username is
// generated from the display name as a fallback.
async function getAuthorProfile(uid) {
  try {
    console.log("Public Space author profile:", {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
    });
    const user = await firebaseAuth.getUser(uid);

    const displayName = user.displayName || "";
    const username = displayName
      ? displayName
        .normalize("NFKD")
        .replace(/[^\p{L}\p{N}_]+/gu, "")
        .toLowerCase()
        .slice(0, 30)
      : "";

    return {
      displayName,
      username,
      photoURL: user.photoURL || "",
    };
  } catch (error) {
   console.error("Could not load Public Space author profile:", {
  code: error.code,
  message: error.message,
  uid,
});
    return {
      displayName: "",
      username: "",
      photoURL: "",
    };
  }
}

async function getAcceptedFriendCount(uid) {
  return Friendship.countDocuments({
    status: "accepted",
    $or: [{ userAUid: uid }, { userBUid: uid }],
  });
}

function validateMedia(rawMedia) {
  if (!Array.isArray(rawMedia) || rawMedia.length > MAX_MEDIA_ITEMS) {
    return {
      error: `You can attach up to ${MAX_MEDIA_ITEMS} media items.`,
    };
  }

  const media = [];

  for (const item of rawMedia) {
    if (
      !item ||
      !["image", "video"].includes(item.type) ||
      typeof item.url !== "string"
    ) {
      return { error: "Each media item needs a valid type and URL." };
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(item.url);
    } catch {
      return { error: "A media URL is invalid." };
    }

    if (parsedUrl.protocol !== "https:") {
      return { error: "Media URLs must use HTTPS." };
    }

    media.push({
      type: item.type,
      url: parsedUrl.toString(),
    });
  }

  return { media };
}

function mediaSignature(media = []) {
  return media
    .map((item) => `${item.type}:${item.url}`)
    .sort()
    .join("|");
}

// Create a post.
router.post("/", requireFirebaseAuth, async (req, res) => {
  try {
    const uid = req.firebaseUser.uid;

    const text =
      typeof req.body.text === "string" ? req.body.text.trim() : "";

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

    const mediaResult = validateMedia(rawMedia);

    if (mediaResult.error) {
      return res.status(400).json({
        success: false,
        message: mediaResult.error,
      });
    }

    const media = mediaResult.media;

    if (!text && media.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add text, an image, or a video to create a post.",
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

    const duplicateSince = new Date(
      Date.now() - DUPLICATE_WINDOW_MINUTES * 60 * 1000
    );

    const recentPosts = await Post.find({
      authorUid: uid,
      isDeleted: false,
      createdAt: { $gte: duplicateSince },
    })
      .select("text media")
      .lean();

    const signature = mediaSignature(media);

    const duplicate = recentPosts.some(
      (post) =>
        text === (post.text || "") &&
        signature === mediaSignature(post.media || [])
    );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "This looks like a duplicate of a recent post.",
      });
    }

    const authorProfile = await getAuthorProfile(uid);

    const editUntil = new Date(
      Date.now() + EDIT_WINDOW_MINUTES * 60 * 1000
    );

    const post = await Post.create({
      authorUid: uid,
      authorProfile,
      friendCountAtPosting: friendCount,
      text,
      media,
      mediaType: getMediaType(text, media),
      privacy,
      hashtags: extractHashtags(text),
      mentions: extractMentions(text),
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

    // Refresh author profiles from Firebase for older posts too.
    const profileCache = new Map();

    const postsWithProfiles = await Promise.all(
      posts.map(async (post) => {
        if (!profileCache.has(post.authorUid)) {
          profileCache.set(
            post.authorUid,
            getAuthorProfile(post.authorUid)
          );
        }

        const authorProfile = await profileCache.get(post.authorUid);

        return {
          ...post,
          authorProfile,
        };
      })
    );

    return res.json({
      success: true,
      count: postsWithProfiles.length,
      posts: postsWithProfiles,
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

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

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

    if (typeof text !== "string" || !Array.isArray(media)) {
      return res.status(400).json({
        success: false,
        message: "Provide text and a media array.",
      });
    }

    const cleanText = text.trim();

    if (cleanText.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Post text cannot exceed ${MAX_TEXT_LENGTH} characters.`,
      });
    }

    const mediaResult = validateMedia(media);

    if (mediaResult.error) {
      return res.status(400).json({
        success: false,
        message: mediaResult.error,
      });
    }

    const cleanMedia = mediaResult.media;

    if (!cleanText && cleanMedia.length === 0) {
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

    post.text = cleanText;
    post.media = cleanMedia;
    post.mediaType = getMediaType(cleanText, cleanMedia);
    post.hashtags = extractHashtags(cleanText);
    post.mentions = extractMentions(cleanText);

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

    if (!mongoose.Types.ObjectId.isValid(postId)) {
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
