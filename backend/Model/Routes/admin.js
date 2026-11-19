
const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const COOKIE_NAME = "internarea_admin_session";
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

// Compare credentials without a normal early-exit string comparison.
function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) return false;

  return crypto.timingSafeEqual(bufferA, bufferB);
}

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET is missing or too short");
  }

  return secret;
}

function createToken() {
  const payload = {
    role: "admin",
    exp: Date.now() + SESSION_DURATION,
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload)
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  try {
    if (typeof token !== "string") return false;

    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [encodedPayload, receivedSignature] = parts;

    const expectedSignature = crypto
      .createHmac("sha256", getSecret())
      .update(encodedPayload)
      .digest("base64url");

    if (!safeCompare(receivedSignature, expectedSignature)) {
      return false;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    );

    return (
      payload.role === "admin" &&
      typeof payload.exp === "number" &&
      payload.exp > Date.now()
    );
  } catch (error) {
    console.error("Admin session verification failed:", error.message);
    return false;
  }
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";

  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.substring(name.length + 1)) : null;
}

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  };
}

// Middleware for protecting admin-only backend endpoints.
function requireAdmin(req, res, next) {
  try {
    const token = getCookie(req, COOKIE_NAME);

    if (!token || !verifyToken(token)) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
      });
    }

    req.admin = { role: "admin" };
    next();
  } catch (error) {
    console.error("Admin authorization error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid admin session",
    });
  }
}

// ADMIN LOGIN
router.post("/adminlogin", (req, res) => {
  try {
    const { username, password } = req.body || {};

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error("Admin credentials are not configured");

      return res.status(500).json({
        success: false,
        message: "Admin login is not configured",
      });
    }

    if (
      !safeCompare(username, adminUsername) ||
      !safeCompare(password, adminPassword)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const token = createToken();

    res.cookie(COOKIE_NAME, token, cookieOptions());

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
    });
  } catch (error) {
    console.error("Admin login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to process admin login",
    });
  }
});

// VERIFY ADMIN SESSION
router.get("/me", requireAdmin, (req, res) => {
  return res.status(200).json({
    success: true,
    admin: req.admin,
  });
});

// ADMIN LOGOUT
router.post("/logout", (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Admin logged out",
  });
});

// Export middleware for protecting other admin-only API routes.
module.exports = router;
module.exports.requireAdmin = requireAdmin;
