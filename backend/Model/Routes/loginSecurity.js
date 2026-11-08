
const express = require("express");
const crypto = require("crypto");
const UAParser = require("ua-parser-js");
const axios = require("axios");

const requireFirebaseAuth = require("../../middleware/requireFirebaseAuth");
const requireVerifiedLogin = require("../../middleware/requireVerifiedLogin");

const LoginActivity = require("../LoginActivity");
const LoginOtp = require("../LoginOtp");
const LoginSession = require("../LoginSession");

const router = express.Router();

const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const IST_TIME_ZONE = "Asia/Kolkata";

// --------------------------------------------------
// DEVICE INFORMATION
// --------------------------------------------------

function getDeviceInfo(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  let deviceType = "unknown";

  if (result.device.type === "mobile") {
    deviceType = "mobile";
  } else if (result.device.type === "tablet") {
    deviceType = "tablet";
  } else if (!result.device.type) {
    deviceType = "desktop";
  }

  return {
    browser: {
      name: result.browser.name || "Unknown",
      version: result.browser.version || "",
    },
    operatingSystem: {
      name: result.os.name || "Unknown",
      version: result.os.version || "",
    },
    device: {
      type: deviceType,
      model: result.device.model || "",
      vendor: result.device.vendor || "",
    },
  };
}

function isChromeBrowser(browserName) {
  return (
    browserName === "Chrome" ||
    browserName === "Mobile Chrome"
  );
}

// --------------------------------------------------
// MOBILE LOGIN TIME RESTRICTION
// --------------------------------------------------

function isWithinMobileLoginHours() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const hour = Number(
    parts.find((part) => part.type === "hour").value
  );

  const minute = Number(
    parts.find((part) => part.type === "minute").value
  );

  const currentMinutes = hour * 60 + minute;

  // 10:00 AM inclusive; 1:00 PM exclusive.
  return currentMinutes >= 600 && currentMinutes < 780;
}

// --------------------------------------------------
// HASHING HELPERS
// --------------------------------------------------

function hashOtp(uid, otp) {
  const pepper = process.env.OTP_PEPPER;

  if (!pepper) {
    throw new Error("OTP_PEPPER is not configured");
  }

  return crypto
    .createHmac("sha256", pepper)
    .update(`${uid}:${otp}`)
    .digest("hex");
}

function hashSessionToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function safeCompareHash(first, second) {
  const firstBuffer = Buffer.from(first, "hex");
  const secondBuffer = Buffer.from(second, "hex");

  return (
    firstBuffer.length === secondBuffer.length &&
    crypto.timingSafeEqual(firstBuffer, secondBuffer)
  );
}

// --------------------------------------------------
// CREATE LOGIN SESSION
// --------------------------------------------------

async function createLoginSession({
  uid,
  email,
  activity,
  userAgent,
  ipAddress,
}) {
  const sessionToken = crypto.randomBytes(48).toString("hex");
  const sessionId = crypto.randomUUID();

  const browserInfo = activity.browser || {};
  const osInfo = activity.operatingSystem || {};
  const deviceInfo = activity.device || {};

  const session = await LoginSession.create({
    firebaseUid: uid,
    email,
    sessionId,
    tokenHash: hashSessionToken(sessionToken),
    browser: browserInfo.name || "Unknown",
    operatingSystem: osInfo.name || "Unknown",
    deviceType: deviceInfo.type || "unknown",
    deviceModel: deviceInfo.model || "",
    userAgent,
    ipAddress,
    active: true,
    verifiedAt: new Date(),
    lastSeenAt: new Date(),
    expiresAt: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ),
  });

  activity.sessionId = session.sessionId;
  await activity.save();

  return {
    sessionId: session.sessionId,
    sessionToken,
  };
}// --------------------------------------------------
// BREVO LOGIN OTP EMAIL
// --------------------------------------------------

async function sendLoginOtpEmail(email, otp) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    throw new Error("Brevo email configuration is missing");
  }

  const response = await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: {
        name: "InternArea",
        email: senderEmail,
      },
      to: [
        {
          email: email,
        },
      ],
      subject: "InternArea Login Verification Code",
      textContent: `Your InternArea login verification code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #2563eb;">InternArea Login Verification</h2>
          <p>Your login verification code is:</p>
          <h1 style="letter-spacing: 8px; color: #111827;">${otp}</h1>
          <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p style="color: #6b7280;">Do not share this code with anyone.</p>
        </div>
      `,
    },
    {
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 15000,
    }
  );

  return response.data;
}
// --------------------------------------------------
// START LOGIN SECURITY
// --------------------------------------------------

router.post("/start", requireFirebaseAuth, async (req, res) => {
  let activity;
  let stage = "initializing";

  try {
    stage = "reading Firebase user";

    const uid = req.firebaseUser.uid;
    const email = req.firebaseUser.email || "";
    const userAgent = req.get("user-agent") || "";
    const deviceInfo = getDeviceInfo(userAgent);
    const ipAddress = req.ip || "";

    stage = "creating login activity";

    activity = await LoginActivity.create({
      firebaseUid: uid,
      email,
      eventType: "LOGIN_ATTEMPT",
      loginStatus: "PENDING",
      verificationMethod: "NONE",
      verificationStatus: "PENDING",
      userAgent,
      ipAddress,
      ...deviceInfo,
    });

    stage = "checking mobile login hours";

    if (
      deviceInfo.device.type === "mobile" &&
      !isWithinMobileLoginHours()
    ) {
      activity.eventType = "LOGIN_BLOCKED";
      activity.loginStatus = "BLOCKED";
      activity.verificationStatus = "FAILED";
      activity.failureReason =
        "Mobile login is permitted only between 10:00 AM and 1:00 PM IST.";

      stage = "saving mobile login restriction";
      await activity.save();

      return res.status(403).json({
        success: false,
        code: "MOBILE_LOGIN_TIME_RESTRICTED",
        message:
          "Mobile login is allowed only between 10:00 AM and 1:00 PM IST.",
      });
    }

    // Non-Chrome browsers do not require email OTP.
    if (!isChromeBrowser(deviceInfo.browser.name)) {
      stage = "creating non-Chrome login session";

      const sessionCredentials = await createLoginSession({
        uid,
        email,
        activity,
        userAgent,
        ipAddress,
      });

      activity.eventType = "LOGIN_SUCCESS";
      activity.loginStatus = "SUCCESS";
      activity.verificationStatus = "NOT_REQUIRED";
      activity.verificationMethod = "NONE";

      stage = "saving non-Chrome login success";
      await activity.save();

      return res.json({
        success: true,
        otpRequired: false,
        ...sessionCredentials,
        activityId: activity._id,
        message: "Login successful.",
      });
    }

    if (!email) {
      activity.eventType = "LOGIN_BLOCKED";
      activity.loginStatus = "BLOCKED";
      activity.failureReason =
        "No registered email is available.";

      stage = "saving missing email status";
      await activity.save();

      return res.status(400).json({
        success: false,
        message:
          "A registered email is required for Chrome verification.",
      });
    }

    stage = "deleting old OTP challenges";

    await LoginOtp.deleteMany({
      firebaseUid: uid,
      verifiedAt: null,
    });

    stage = "generating OTP";

    const otp = crypto
      .randomInt(100000, 1000000)
      .toString();

    stage = "creating OTP challenge";

    const challenge = await LoginOtp.create({
      firebaseUid: uid,
      email,
      otpHash: hashOtp(uid, otp),
      loginActivityId: activity._id,
      expiresAt: new Date(
        Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
      ),
    });
    try {
      stage = "sending OTP through Brevo API";

      await sendLoginOtpEmail(email, otp);
    } catch (mailError) {
      console.error("BREVO OTP DELIVERY FAILED:", {
        message: mailError.message,
        code: mailError.code,
        response: mailError.response?.data,
        status: mailError.response?.status,
      });

      try {
        await LoginOtp.deleteOne({
          _id: challenge._id,
        });
      } catch (cleanupError) {
        console.error("FAILED TO CLEAN OTP CHALLENGE:", {
          message: cleanupError.message,
        });
      }

      activity.eventType = "LOGIN_BLOCKED";
      activity.loginStatus = "BLOCKED";
      activity.verificationStatus = "FAILED";
      activity.failureReason =
        "Email verification could not be delivered.";

      try {
        await activity.save();
      } catch (saveError) {
        console.error("FAILED TO SAVE EMAIL DELIVERY FAILURE:", {
          message: saveError.message,
          name: saveError.name,
        });
      }

      return res.status(502).json({
        success: false,
        code: "OTP_EMAIL_DELIVERY_FAILED",
        message:
          "Unable to send the verification email. Please try again later.",
      });
    }

    return res.json({
      success: true,
      otpRequired: true,
      activityId: activity._id,
      message: "Verification code sent to your registered email.",
    });

  } catch (error) {
    console.error("LOGIN SECURITY START FAILED:", {
      stage,
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      response: error.response?.data,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to start login verification.",
      stage,
    });
  }
});

// --------------------------------------------------
// VERIFY LOGIN OTP
// --------------------------------------------------

router.post("/verify", requireFirebaseAuth, async (req, res) => {
  try {
    const uid = req.firebaseUser.uid;
    const { activityId, otp } = req.body;

    if (
      !activityId ||
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid six-digit verification code.",
      });
    }

    const challenge = await LoginOtp.findOne({
      firebaseUid: uid,
      loginActivityId: activityId,
      verifiedAt: null,
    });

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message:
          "Verification request not found or already used.",
      });
    }

    const activity = await LoginActivity.findOne({
      _id: activityId,
      firebaseUid: uid,
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Login activity not found.",
      });
    }

    // Ensure OTP is verified from the browser that requested it.
    // IP changes are allowed because mobile networks can change IP addresses.
    const currentUserAgent = req.get("user-agent") || "";

    if (activity.userAgent !== currentUserAgent) {
      await LoginOtp.deleteOne({
        _id: challenge._id,
      });

      activity.eventType = "OTP_FAILED";
      activity.loginStatus = "BLOCKED";
      activity.verificationStatus = "FAILED";
      activity.failureReason =
        "Browser changed during login verification.";

      await activity.save();

      return res.status(403).json({
        success: false,
        code: "LOGIN_BROWSER_CHANGED",
        message:
          "Your browser changed during verification. Please start login again.",
      });
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await LoginOtp.deleteOne({
        _id: challenge._id,
      });

      activity.eventType = "OTP_FAILED";
      activity.loginStatus = "FAILED";
      activity.verificationStatus = "FAILED";
      activity.failureReason = "Verification code expired.";

      await activity.save();

      return res.status(400).json({
        success: false,
        code: "OTP_EXPIRED",
        message:
          "Your verification code has expired. Start login again.",
      });
    }

    if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
      await LoginOtp.deleteOne({
        _id: challenge._id,
      });

      activity.eventType = "OTP_FAILED";
      activity.loginStatus = "BLOCKED";
      activity.verificationStatus = "FAILED";
      activity.failureReason =
        "Maximum OTP attempts exceeded.";

      await activity.save();

      return res.status(429).json({
        success: false,
        message:
          "Too many incorrect attempts. Start login again.",
      });
    }

    const submittedHash = hashOtp(uid, otp);

    if (!safeCompareHash(challenge.otpHash, submittedHash)) {
      challenge.attempts += 1;
      await challenge.save();

      activity.eventType = "OTP_FAILED";
      activity.loginStatus = "FAILED";
      activity.verificationStatus = "FAILED";
      activity.failureReason = "Incorrect verification code.";

      await activity.save();

      return res.status(400).json({
        success: false,
        message: "Incorrect verification code.",
        remainingAttempts: Math.max(
          0,
          MAX_OTP_ATTEMPTS - challenge.attempts
        ),
      });
    }

    challenge.verifiedAt = new Date();
    await challenge.save();

    const userAgent = req.get("user-agent") || "";
    const ipAddress = req.ip || "";

    const sessionCredentials = await createLoginSession({
      uid,
      email: req.firebaseUser.email || activity.email || "",
      activity,
      userAgent,
      ipAddress,
    });

    activity.eventType = "LOGIN_SUCCESS";
    activity.loginStatus = "SUCCESS";
    activity.verificationStatus = "VERIFIED";
    activity.verificationMethod = "EMAIL_PASSWORD";
    activity.deviceTrusted = false;
    activity.failureReason = "";

    await activity.save();

    await LoginOtp.deleteOne({
      _id: challenge._id,
    });

    return res.json({
      success: true,
      verified: true,
      ...sessionCredentials,
      message: "Email verification successful.",
    });
  } catch (error) {
    console.error("Login OTP verification error:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to verify the code.",
    });
  }
});

// --------------------------------------------------
// LOGIN HISTORY
// --------------------------------------------------

router.get(
  "/history",
  requireFirebaseAuth,
  requireVerifiedLogin,
  async (req, res) => {
    try {
      const history = await LoginActivity.find({
        firebaseUid: req.firebaseUser.uid,
      })
        .sort({ loginAt: -1 })
        .limit(100)
        .select("-__v");

      return res.json({
        success: true,
        history,
      });
    } catch (error) {
      console.error("Login history error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to load login history.",
      });
    }
  }
);

// --------------------------------------------------
// ACTIVE LOGIN SESSIONS
// --------------------------------------------------

router.get(
  "/sessions",
  requireFirebaseAuth,
  requireVerifiedLogin,
  async (req, res) => {
    try {
      const sessions = await LoginSession.find({
        firebaseUid: req.firebaseUser.uid,
        active: true,
      })
        .select("-tokenHash -__v")
        .sort({ lastSeenAt: -1 });

      return res.json({
        success: true,
        currentSessionId: req.loginSession.sessionId,
        sessions,
      });
    } catch (error) {
      console.error("Active sessions error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to load active sessions.",
      });
    }
  }
);

// --------------------------------------------------
// REVOKE ONE SESSION
// --------------------------------------------------

router.post(
  "/sessions/:sessionId/revoke",
  requireFirebaseAuth,
  requireVerifiedLogin,
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      if (sessionId === req.loginSession.sessionId) {
        return res.status(400).json({
          success: false,
          message: "Use logout to end your current session.",
        });
      }

      const session = await LoginSession.findOne({
        sessionId,
        firebaseUid: req.firebaseUser.uid,
        active: true,
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Active session not found.",
        });
      }

      session.active = false;
      session.revokedAt = new Date();
      session.revokedReason =
        "Signed out by account owner";

      await session.save();

      return res.json({
        success: true,
        message: "Selected device has been signed out.",
      });
    } catch (error) {
      console.error("Session revoke error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to sign out this device.",
      });
    }
  }
);

// --------------------------------------------------
// REVOKE ALL OTHER SESSIONS
// --------------------------------------------------

router.post(
  "/sessions/revoke-others",
  requireFirebaseAuth,
  requireVerifiedLogin,
  async (req, res) => {
    try {
      const result = await LoginSession.updateMany(
        {
          firebaseUid: req.firebaseUser.uid,
          active: true,
          sessionId: {
            $ne: req.loginSession.sessionId,
          },
        },
        {
          $set: {
            active: false,
            revokedAt: new Date(),
            revokedReason:
              "Signed out from another device",
          },
        }
      );

      return res.json({
        success: true,
        revokedCount: result.modifiedCount,
        message: "All other devices have been signed out.",
      });
    } catch (error) {
      console.error("Revoke other sessions error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to sign out other devices.",
      });
    }
  }
);

// --------------------------------------------------
// LOGOUT CURRENT SESSION
// --------------------------------------------------

router.post(
  "/logout",
  requireFirebaseAuth,
  requireVerifiedLogin,
  async (req, res) => {
    try {
      req.loginSession.active = false;
      req.loginSession.revokedAt = new Date();
      req.loginSession.revokedReason = "User logged out";

      await req.loginSession.save();

      return res.json({
        success: true,
        message: "Session signed out successfully.",
      });
    } catch (error) {
      console.error("Logout session error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to revoke login session.",
      });
    }
  }
);

module.exports = router;
