const crypto = require("crypto");
const LoginSession = require("../Model/LoginSession");

const requireVerifiedLogin = async (req, res, next) => {
  try {
    const firebaseUser = req.firebaseUser || req.user;
    const firebaseUid = firebaseUser?.uid;

    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: "Firebase authentication required.",
      });
    }

    const sessionToken = req.headers["x-login-session"];

    if (!sessionToken || typeof sessionToken !== "string") {
      return res.status(401).json({
        success: false,
        code: "LOGIN_SESSION_REQUIRED",
        message: "Please complete login verification.",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const session = await LoginSession.findOne({
      firebaseUid,
      tokenHash,
      active: true,
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        code: "LOGIN_SESSION_INVALID",
        message: "Your login session is invalid or has been signed out.",
      });
    }

    session.lastSeenAt = new Date();
    await session.save();

    req.loginSession = session;
    next();
  } catch (error) {
    console.error("Verified login middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify your login session.",
    });
  }
};

module.exports = requireVerifiedLogin;