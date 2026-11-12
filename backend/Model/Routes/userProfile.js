
const express = require("express");
const { getAuth } = require("firebase-admin/auth");

const router = express.Router();

const UserProfile = require("../UserProfile");
const requireFirebaseAuth = require("../../middleware/requireFirebaseAuth");
const requireVerifiedLogin = require("../../middleware/requireVerifiedLogin");
const adminApp = require("../../firebaseAdmin");

const firebaseAuth = getAuth(adminApp);

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

function cleanUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function usernameFromName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}_]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .slice(0, 24);
}

async function generateUniqueUsername(displayName, uid) {
  const base = usernameFromName(displayName) || "internarea_user";

  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix =
      attempt === 0
        ? ""
        : String(Math.floor(1000 + Math.random() * 9000));

    const candidate = `${base.slice(0, 30 - suffix.length)}${suffix}`;

    const existing = await UserProfile.findOne({
      username: candidate,
    }).lean();

    if (!existing) return candidate;
  }

  return `user_${uid.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}_${Date.now()
    .toString()
    .slice(-5)}`.toLowerCase();
}

async function getFirebaseProfile(uid) {
  const user = await firebaseAuth.getUser(uid);

  return {
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
  };
}

// Get current user's profile.
router.get(
  "/me",
  requireFirebaseAuth,
  requireVerifiedLogin,
  async (req, res) => {
    try {
      const uid = req.firebaseUser.uid;

      let profile = await UserProfile.findOne({
        firebaseUid: uid,
      }).lean();

      if (!profile) {
        const firebaseProfile = await getFirebaseProfile(uid);

        return res.json({
          success: true,
          profile: null,
          needsUsername: true,
          displayName: firebaseProfile.displayName,
          photoURL: firebaseProfile.photoURL,
        });
      }

      return res.json({
        success: true,
        profile,
        needsUsername: false,
      });
    } catch (error) {
      console.error("Get user profile error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Could not load your profile.",
      });
    }
  }
);

// Check username availability.
router.get(
  "/check-username",
  requireFirebaseAuth,
  requireVerifiedLogin,
  async (req, res) => {
    try {
      const username = cleanUsername(req.query.username);

      if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({
          success: false,
          available: false,
          message:
            "Username must contain 3–30 lowercase letters, numbers or underscores.",
        });
      }

      const existing = await UserProfile.findOne({
        username,
        firebaseUid: { $ne: req.firebaseUser.uid },
      }).lean();

      return res.json({
        success: true,
        available: !existing,
        username,
      });
    } catch (error) {
      console.error("Check username error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Could not check username.",
      });
    }
  }
);

// Create a username: custom or automatically generated.
router.post(
  "/setup",
  requireFirebaseAuth,
  requireVerifiedLogin,
  async (req, res) => {
    try {
      const uid = req.firebaseUser.uid;
      const mode = req.body.mode;

      if (!["custom", "generate"].includes(mode)) {
        return res.status(400).json({
          success: false,
          message: "Choose custom or generate mode.",
        });
      }

      const existingProfile = await UserProfile.findOne({
        firebaseUid: uid,
      });

      if (existingProfile) {
        return res.status(409).json({
          success: false,
          message: "Your username is already set.",
          profile: existingProfile,
        });
      }

      const firebaseProfile = await getFirebaseProfile(uid);

      let username;

      if (mode === "custom") {
        username = cleanUsername(req.body.username);

        if (!USERNAME_REGEX.test(username)) {
          return res.status(400).json({
            success: false,
            message:
              "Username must contain 3–30 lowercase letters, numbers or underscores.",
          });
        }
      } else {
        username = await generateUniqueUsername(
          firebaseProfile.displayName,
          uid
        );
      }

      const profile = await UserProfile.create({
        firebaseUid: uid,
        username,
        displayName: firebaseProfile.displayName,
        photoURL: firebaseProfile.photoURL,
      });

      return res.status(201).json({
        success: true,
        message: "Username created successfully.",
        profile,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "That username is already taken. Try another one.",
        });
      }

      console.error("Create username error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Could not create username.",
      });
    }
  }
);

// Change username later.
router.patch(
  "/username",
  requireFirebaseAuth,
  requireVerifiedLogin,
  async (req, res) => {
    try {
      const uid = req.firebaseUser.uid;
      const username = cleanUsername(req.body.username);

      if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({
          success: false,
          message:
            "Username must contain 3–30 lowercase letters, numbers or underscores.",
        });
      }

      const profile = await UserProfile.findOneAndUpdate(
        { firebaseUid: uid },
        { $set: { username } },
        { new: true, runValidators: true }
      );

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Set up your username first.",
        });
      }

      return res.json({
        success: true,
        message: "Username updated successfully.",
        profile,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "That username is already taken.",
        });
      }

      console.error("Update username error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Could not update username.",
      });
    }
  }
);

// Search users for @mention suggestions.
router.get(
  "/search",
  requireFirebaseAuth,
  requireVerifiedLogin,
  async (req, res) => {
    try {
      const query = cleanUsername(req.query.q);

      if (query.length < 2) {
        return res.json({
          success: true,
          users: [],
        });
      }

      const users = await UserProfile.find({
        firebaseUid: { $ne: req.firebaseUser.uid },
        username: { $regex: `^${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` },
      })
        .select("firebaseUid username displayName photoURL")
        .sort({ username: 1 })
        .limit(10)
        .lean();

      return res.json({
        success: true,
        users,
      });
    } catch (error) {
      console.error("Search users error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Could not search users.",
      });
    }
  }
);
// Get an exact public profile by username.
router.get(
  "/:username",
  requireFirebaseAuth,
  requireVerifiedLogin,
  async (req, res) => {
    try {
      const username = cleanUsername(req.params.username);

      if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({
          success: false,
          message: "Invalid username.",
        });
      }

      const profile = await UserProfile.findOne({ username })
        .select("firebaseUid username displayName photoURL")
        .lean();

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "User profile not found.",
        });
      }

      return res.json({
        success: true,
        profile,
      });
    } catch (error) {
      console.error("Get public profile error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Could not load this profile.",
      });
    }
  }
);

module.exports = router;
