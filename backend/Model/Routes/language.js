const express = require("express");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { getAuth } = require("firebase-admin/auth");
const adminApp = require("../../firebaseAdmin");
const UserLanguage = require("../UserLanguage");

const router = express.Router();

const supportedLanguages = ["en", "es", "hi", "pt", "zh", "fr"];
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const otpStore = new Map();
const otpRequestStore = new Map();

const emailTranslations = {
  en: {
    subject: "Internarea - French Language Verification",
    message: (otp) =>
      `Your Internarea verification code is ${otp}. This code will expire in 5 minutes.`,
  },
  es: {
    subject: "Internarea - Verificación del idioma francés",
    message: (otp) =>
      `Tu código de verificación de Internarea es ${otp}. Este código expirará en 5 minutos.`,
  },
  hi: {
    subject: "Internarea - फ़्रेंच भाषा सत्यापन",
    message: (otp) =>
      `आपका Internarea सत्यापन कोड ${otp} है। यह कोड 5 मिनट में समाप्त हो जाएगा।`,
  },
  pt: {
    subject: "Internarea - Verificação do idioma francês",
    message: (otp) =>
      `Seu código de verificação do Internarea é ${otp}. Este código expirará em 5 minutos.`,
  },
  zh: {
    subject: "Internarea - 法语语言验证",
    message: (otp) =>
      `您的 Internarea 验证码是 ${otp}。此验证码将在 5 分钟后过期。`,
  },
  fr: {
    subject: "Internarea - Vérification de la langue française",
    message: (otp) =>
      `Votre code OTP de vérification Internarea est ${otp}. Ce code expirera dans 5 minutes.`,
  },
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ---------------- AUTHENTICATION ----------------

const verifyUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing",
      });
    }

    req.user = await getAuth(adminApp).verifyIdToken(token);
    return next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

// ---------------- DEVICE INFORMATION ----------------

const getDeviceInfo = (req) => {
  const userAgent = req.headers["user-agent"] || "Unknown";

  let browser = "Unknown";
  let device = "Desktop";

  if (/Edg/i.test(userAgent)) {
    browser = "Microsoft Edge";
  } else if (/OPR|Opera/i.test(userAgent)) {
    browser = "Opera";
  } else if (/Firefox/i.test(userAgent)) {
    browser = "Mozilla Firefox";
  } else if (/Chrome/i.test(userAgent)) {
    browser = "Google Chrome";
  } else if (/Safari/i.test(userAgent)) {
    browser = "Safari";
  }

  if (/iPad|Tablet/i.test(userAgent)) {
    device = "Tablet";
  } else if (/Mobile|Android|iPhone/i.test(userAgent)) {
    device = "Mobile";
  }

  return { browser, device };
};

// ---------------- IP ADDRESS ----------------

const getIpAddress = (req) =>
  req.ip || req.socket?.remoteAddress || "Unknown";

// ---------------- SAVE LANGUAGE ----------------

const saveLanguagePreference = async (req, language, page = "") => {
  const firebaseUid = req.user.uid;
  const email = req.user.email || "";
  const { browser, device } = getDeviceInfo(req);

  let userLanguage = await UserLanguage.findOne({ firebaseUid });

  if (!userLanguage) {
    userLanguage = new UserLanguage({
      firebaseUid,
      email,
      preferredLanguage: "en",
      pageLanguages: {},
      languageHistory: [],
    });
  }

 userLanguage.email = email;

if (!userLanguage.pageLanguages) {
  userLanguage.pageLanguages = new Map();
}

if (page) {
  userLanguage.pageLanguages.set(page, language);
} else {
  userLanguage.preferredLanguage = language;
}
  userLanguage.languageHistory.push({
    language,
    page,
    timestamp: new Date(),
    ip: getIpAddress(req),
    browser,
    device,
  });

  await userLanguage.save();

  return userLanguage;
};

// ---------------- GET LANGUAGE PREFERENCE ----------------

router.get("/preference", verifyUser, async (req, res) => {
  try {
    const userLanguage = await UserLanguage.findOne({
      firebaseUid: req.user.uid,
    });

    const page =
      typeof req.query.page === "string" ? req.query.page.trim() : "";

    const pageLanguage = page
      ? userLanguage?.pageLanguages?.get(page)
      : null;

    return res.json({
      success: true,
      language:
        pageLanguage ||
        userLanguage?.preferredLanguage ||
        "en",
      page,
    });
  } catch (error) {
    console.error("Get language error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get language preference",
    });
  }
});

// ---------------- CHANGE LANGUAGE ----------------

router.put("/preference", verifyUser, async (req, res) => {
  try {
    const { language, page } = req.body || {};

    if (
      typeof language !== "string" ||
      !supportedLanguages.includes(language)
    ) {
      return res.status(400).json({
        success: false,
        message: "Unsupported language",
      });
    }

    if (typeof page !== "string" || !page.trim()) {
      return res.status(400).json({
        success: false,
        message: "Page is required",
      });
    }

    if (language === "fr") {
      return res.status(403).json({
        success: false,
        message: "French language requires OTP verification",
      });
    }

    await saveLanguagePreference(req, language, page.trim());

    return res.json({
      success: true,
      language,
      page: page.trim(),
      message: "Language preference updated successfully",
    });
  } catch (error) {
    console.error("Language update error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update language preference",
    });
  }
});

// ---------------- REQUEST FRENCH OTP ----------------

router.post("/request-french-otp", verifyUser, async (req, res) => {
  const uid = req.user.uid;

  try {
    const email = req.user.email;
    const page =
      typeof req.body?.page === "string" && req.body.page.trim()
        ? req.body.page.trim()
        : "/";

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Registered email not found",
      });
    }

    const lastRequestedAt = otpRequestStore.get(uid);

    if (
      lastRequestedAt &&
      Date.now() - lastRequestedAt < OTP_RESEND_MS
    ) {
      const waitSeconds = Math.ceil(
        (OTP_RESEND_MS - (Date.now() - lastRequestedAt)) / 1000
      );

      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting another OTP`,
      });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("EMAIL_USER or EMAIL_PASS is not configured");

      return res.status(500).json({
        success: false,
        message: "Email service is not configured",
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    const userLanguage = await UserLanguage.findOne({
      firebaseUid: uid,
    });

    const emailLanguage = userLanguage?.preferredLanguage || "en";
    const emailText =
      emailTranslations[emailLanguage] || emailTranslations.en;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: emailText.subject,
      text: emailText.message(otp),
    });

    // Start the cooldown only after successful email delivery.
    otpRequestStore.set(uid, Date.now());

    otpStore.set(uid, {
      otp,
      page,
      createdAt: Date.now(),
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      attempts: 0,
    });

    return res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("OTP email error:", error.message);

    otpStore.delete(uid);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again later.",
    });
  }
});

// ---------------- VERIFY FRENCH OTP ----------------

router.post("/verify-french-otp", verifyUser, async (req, res) => {
  const uid = req.user.uid;

  try {
    const { otp, page } = req.body || {};

    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid six-digit OTP",
      });
    }

    const stored = otpStore.get(uid);

    if (!stored) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new OTP",
      });
    }

    if (Date.now() >= stored.expiresAt) {
      otpStore.delete(uid);

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP",
      });
    }

    // Require the same page used when requesting the OTP.
    if (
      typeof page !== "string" ||
      !page.trim() ||
      page.trim() !== stored.page
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP verification page mismatch",
      });
    }

    if (stored.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(uid);

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new OTP",
      });
    }

    if (stored.otp !== otp) {
      stored.attempts += 1;

      if (stored.attempts >= MAX_OTP_ATTEMPTS) {
        otpStore.delete(uid);

        return res.status(429).json({
          success: false,
          message: "Too many incorrect attempts. Please request a new OTP",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        attemptsRemaining: MAX_OTP_ATTEMPTS - stored.attempts,
      });
    }

    await saveLanguagePreference(req, "fr", stored.page);

    otpStore.delete(uid);

    return res.json({
      success: true,
      verified: true,
      language: "fr",
      page: stored.page,
      message: "French language verified successfully",
    });
  } catch (error) {
    console.error("OTP verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
});

// ---------------- LANGUAGE API TEST ----------------

router.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Language API is working",
    languages: supportedLanguages,
  });
});

module.exports = router;