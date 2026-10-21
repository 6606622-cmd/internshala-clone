const express = require("express");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { getAuth } = require("firebase-admin/auth");

const adminApp = require("../../firebaseAdmin");
const PasswordResetHistory = require("../PasswordResetHistory");
const PasswordResetChallenge = require("../PasswordResetChallenge");
const PasswordResetCooldown = require("../PasswordResetCooldown");

const router = express.Router();
const auth = getAuth(adminApp);

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const RESET_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function hashSecret(value) {
    const pepper = process.env.OTP_PEPPER;

    if (!pepper || pepper.length < 32) {
        throw new Error("OTP_PEPPER is missing or too short.");
    }

    return crypto
        .createHmac("sha256", pepper)
        .update(value)
        .digest("hex");
}

function safeCompareHex(a, b) {
    if (
        typeof a !== "string" ||
        typeof b !== "string" ||
        !/^[a-f0-9]{64}$/i.test(a) ||
        !/^[a-f0-9]{64}$/i.test(b)
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        Buffer.from(a, "hex"),
        Buffer.from(b, "hex")
    );
}

function createOtp() {
    return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

function getRequestMetadata(req) {
    const ua = req.get("user-agent") || "";

    return {
        ipAddress: req.ip || "Unknown",
        browser: ua.slice(0, 300) || "Unknown",
        device: ua.slice(0, 300) || "Unknown",
    };
}

function emailTransport() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error("Email service is not configured.");
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
}

// Atomically reserves the account's 24-hour recovery window.
async function reserveCooldown(firebaseUid, resetMethod) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - RESET_COOLDOWN_MS);

    for (let attempt = 0; attempt < 2; attempt++) {
        const existing = await PasswordResetCooldown.findOne({
            firebaseUid,
        }).lean();

        if (!existing) {
            try {
                await PasswordResetCooldown.create({
                    firebaseUid,
                    lastRequestedAt: now,
                    resetMethod,
                });

                return true;
            } catch (error) {
                if (error.code !== 11000) throw error;
                continue;
            }
        }

        const updated = await PasswordResetCooldown.findOneAndUpdate(
            {
                firebaseUid,
                lastRequestedAt: { $lte: cutoff },
            },
            {
                $set: {
                    lastRequestedAt: now,
                    resetMethod,
                },
            },
            { new: true }
        );

        return Boolean(updated);
    }

    return false;
}

async function createHistory(user, resetMethod, req) {
    return PasswordResetHistory.create({
        firebaseUid: user.uid,
        email: user.email || "",
        resetMethod,
        verificationStatus: "requested",
        ...getRequestMetadata(req),
    });
}

async function markHistory(historyId, values) {
    await PasswordResetHistory.findByIdAndUpdate(historyId, {
        $set: values,
    });
}

function validEmail(value) {
    return (
        typeof value === "string" &&
        value.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    );
}

function validPhone(value) {
    // Firebase phone numbers must be in E.164 format, e.g. +919876543210.
    return typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value);
}

async function sendOtpEmail(email, otp) {
    const transporter = emailTransport();

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your InternArea password recovery code",
        text:
            `Your InternArea verification code is ${otp}.\n\n` +
            "It expires in 5 minutes. If you did not request this, ignore this email.",
    });
}

// Temporary passwords contain English letters only.
function generateTemporaryPassword(length = 16) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let password = "";

    for (let i = 0; i < length; i++) {
        password += alphabet[crypto.randomInt(0, alphabet.length)];
    }

    return password;
}

async function sendTemporaryPasswordEmail(email, temporaryPassword) {
    const transporter = emailTransport();

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your InternArea temporary password",
        text:
            `Your temporary password is: ${temporaryPassword}\n\n` +
            "Sign in and change this password immediately.\n" +
            "If you did not request this reset, contact support.",
    });
}

async function sendTemporaryPasswordSms(phoneNumber, temporaryPassword) {
    const {
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        TWILIO_FROM_NUMBER,
    } = process.env;

    if (
        !TWILIO_ACCOUNT_SID ||
        !TWILIO_AUTH_TOKEN ||
        !TWILIO_FROM_NUMBER
    ) {
        throw new Error("SMS delivery is not configured.");
    }

    const body = new URLSearchParams({
        To: phoneNumber,
        From: TWILIO_FROM_NUMBER,
        Body:
            `Your InternArea temporary password is: ${temporaryPassword}. ` +
            "Sign in and change it immediately. If you did not request this, contact support.",
    });

    const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
            method: "POST",
            headers: {
                Authorization:
                    "Basic " +
                    Buffer.from(
                        `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
                    ).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
        }
    );

    if (!response.ok) {
        throw new Error("SMS delivery failed.");
    }
}

async function releaseCooldownAfterDeliveryFailure(
    firebaseUid,
    resetMethod,
    historyId
) {
    const history = await PasswordResetHistory.findById(historyId)
        .select("requestedAt")
        .lean();

    if (!history?.requestedAt) return;

    const requestedAt = new Date(history.requestedAt).getTime();
    const lower = new Date(requestedAt - 10000);
    const upper = new Date(requestedAt + 10000);

    await PasswordResetCooldown.updateOne(
        {
            firebaseUid,
            resetMethod,
            lastRequestedAt: { $gte: lower, $lte: upper },
        },
        {
            $set: {
                lastRequestedAt: new Date(
                    Date.now() - RESET_COOLDOWN_MS - 1000
                ),
            },
        }
    );
}

async function findPasswordAccountByEmail(email) {
    try {
        const user = await auth.getUserByEmail(email);

        // Do not add a password to a Google-only account.
        const hasPasswordProvider = (user.providerData || []).some(
            (provider) => provider.providerId === "password"
        );

        return hasPasswordProvider ? user : null;
    } catch (error) {
        if (error.code === "auth/user-not-found") return null;
        throw error;
    }
}

router.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Password recovery service is available.",
    });
});

// EMAIL: request a verification code.
router.post("/request", async (req, res) => {
    const email =
        typeof req.body.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";

    if (!validEmail(email)) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid email address.",
        });
    }

    try {
        const user = await findPasswordAccountByEmail(email);

        // Avoid revealing whether an account exists.
        if (!user) {
            return res.json({
                success: true,
                message:
                    "If an eligible account exists, a verification code will be sent.",
            });
        }

        const allowed = await reserveCooldown(user.uid, "email");

        if (!allowed) {
            return res.status(429).json({
                success: false,
                message: "You can use this option only once per day.",
            });
        }

        const history = await createHistory(user, "email", req);
        const otp = createOtp();

        await PasswordResetChallenge.findOneAndUpdate(
            { firebaseUid: user.uid },
            {
                $set: {
                    email: user.email || email,
                    resetMethod: "email",
                    otpHash: hashSecret(otp),
                    otpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
                    otpAttempts: 0,
                    otpResendCount: 0,
                    lastOtpSentAt: new Date(),
                    resetTokenHash: "",
                    resetTokenExpiresAt: null,
                    historyId: history._id,
                },
            },
            { upsert: true, new: true, runValidators: true }
        );

        try {
            await sendOtpEmail(user.email || email, otp);
        } catch (error) {
            await markHistory(history._id, {
                verificationStatus: "failed",
                failureReason: "Email delivery failed",
            });

            await PasswordResetChallenge.updateOne(
                {
                    firebaseUid: user.uid,
                    historyId: history._id,
                },
                {
                    $set: {
                        otpHash: "",
                        otpExpiresAt: null,
                    },
                }
            );

            await releaseCooldownAfterDeliveryFailure(
                user.uid,
                "email",
                history._id
            );

            throw error;
        }

        return res.json({
            success: true,
            message: "A verification code has been sent to your email.",
        });
    } catch (error) {
        console.error("Email recovery request failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to process your request right now.",
        });
    }
});
// EMAIL: resend the current OTP, with a 60-second resend cooldown.
router.post("/resend", async (req, res) => {
    const email =
        typeof req.body.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";

    if (!validEmail(email)) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid email address.",
        });
    }

    try {
        const user = await findPasswordAccountByEmail(email);

        if (!user) {
            return res.json({
                success: true,
                message: "If an eligible recovery request exists, a code can be sent.",
            });
        }

        const challenge = await PasswordResetChallenge.findOne({
            firebaseUid: user.uid,
            resetMethod: "email",
        }).select("+otpHash");

        if (!challenge || !challenge.otpHash) {
            return res.status(400).json({
                success: false,
                message: "Start a recovery request before resending a code.",
            });
        }

        if (
            challenge.lastOtpSentAt &&
            Date.now() - challenge.lastOtpSentAt.getTime() < OTP_RESEND_MS
        ) {
            return res.status(429).json({
                success: false,
                message: "Please wait 60 seconds before requesting another code.",
            });
        }

        if (challenge.otpAttempts >= MAX_OTP_ATTEMPTS) {
            return res.status(429).json({
                success: false,
                message: "Too many attempts. Start a new recovery request when allowed.",
            });
        }

        if ((challenge.otpResendCount || 0) >= 5) {
            return res.status(429).json({
                success: false,
                message: "You have reached the resend limit. Please try again later.",
            });
        }

        const otp = createOtp();
        const otpHash = hashSecret(otp);
        const oldSentAt = challenge.lastOtpSentAt;
        const newSentAt = new Date();

        const claimed = await PasswordResetChallenge.findOneAndUpdate(
            {
                _id: challenge._id,
                otpHash: challenge.otpHash,
                lastOtpSentAt: oldSentAt,
                otpAttempts: { $lt: MAX_OTP_ATTEMPTS },
                otpResendCount: { $lt: 5 },
            },
            {
                $set: {
                    lastOtpSentAt: newSentAt,
                    otpHash,
                    otpExpiresAt: new Date(
                        newSentAt.getTime() + OTP_EXPIRY_MS
                    ),
                },
                $inc: {
                    otpResendCount: 1,
                },
            },
            { new: true }
        );

        if (!claimed) {
            return res.status(429).json({
                success: false,
                message: "Please wait before requesting another code.",
            });
        }

        try {
            await sendOtpEmail(user.email || email, otp);

            await markHistory(challenge.historyId, {
                verificationStatus: "requested",
                verifiedAt: null,
                completedAt: null,
                failureReason: "",
            });

            return res.json({
                success: true,
                message: "If eligible, a new verification code has been sent.",
            });
        } catch (error) {
            await PasswordResetChallenge.updateOne(
                {
                    _id: challenge._id,
                    otpHash,
                    historyId: challenge.historyId,
                },
                {
                    $set: {
                        otpHash: "",
                        otpExpiresAt: null,
                    },
                }
            );

            await markHistory(challenge.historyId, {
                verificationStatus: "failed",
                failureReason: "Resend delivery failed",
            });

            throw error;
        }
    } catch (error) {
        console.error("Email OTP resend failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to resend the code right now. Please try again later.",
        });
    }
});

// EMAIL: verify OTP and issue a short-lived, one-time reset token.
router.post("/verify", async (req, res) => {
    const email =
        typeof req.body.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";
    const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";

    if (!validEmail(email) || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({
            success: false,
            message: "Enter your registered email and six-digit code.",
        });
    }

    try {
        const user = await findPasswordAccountByEmail(email);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "The code is invalid or expired. Request a new one.",
            });
        }

        const challenge = await PasswordResetChallenge.findOne({
            firebaseUid: user.uid,
            resetMethod: "email",
        }).select("+otpHash");

        if (!challenge || !challenge.otpHash || !challenge.otpExpiresAt) {
            return res.status(400).json({
                success: false,
                message: "The code is invalid or expired. Request a new one.",
            });
        }

        if (challenge.otpExpiresAt <= new Date()) {
            await markHistory(challenge.historyId, {
                verificationStatus: "expired",
            });

            return res.status(400).json({
                success: false,
                message: "The code has expired. Request a new one.",
            });
        }

        if (challenge.otpAttempts >= MAX_OTP_ATTEMPTS) {
            return res.status(429).json({
                success: false,
                message: "Too many incorrect attempts. Start a new recovery request.",
            });
        }

        const matches = safeCompareHex(
            hashSecret(otp),
            challenge.otpHash
        );

        if (!matches) {
            const updated = await PasswordResetChallenge.findOneAndUpdate(
                {
                    _id: challenge._id,
                    otpHash: challenge.otpHash,
                    otpAttempts: { $lt: MAX_OTP_ATTEMPTS },
                },
                { $inc: { otpAttempts: 1 } },
                { new: true }
            );

            if (updated && updated.otpAttempts >= MAX_OTP_ATTEMPTS) {
                await markHistory(challenge.historyId, {
                    verificationStatus: "blocked",
                    failureReason: "OTP attempt limit reached",
                });
            }

            return res.status(400).json({
                success: false,
                message: "The code is invalid or expired. Request a new one.",
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenHash = hashSecret(resetToken);

        const claimed = await PasswordResetChallenge.findOneAndUpdate(
            {
                _id: challenge._id,
                otpHash: challenge.otpHash,
                otpExpiresAt: { $gt: new Date() },
                otpAttempts: { $lt: MAX_OTP_ATTEMPTS },
            },
            {
                $set: {
                    otpHash: "",
                    otpExpiresAt: null,
                    resetTokenHash,
                    resetTokenExpiresAt: new Date(
                        Date.now() + RESET_TOKEN_EXPIRY_MS
                    ),
                },
            },
            { new: true }
        );

        if (!claimed) {
            return res.status(400).json({
                success: false,
                message: "The code is invalid or expired. Request a new one.",
            });
        }

        await markHistory(challenge.historyId, {
            verificationStatus: "verified",
            verifiedAt: new Date(),
        });

        return res.json({
            success: true,
            resetToken,
            message: "Code verified. You can now continue recovery.",
        });
    } catch (error) {
        console.error("Email OTP verification failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to verify the code right now.",
        });
    }
});

// EMAIL: consume the reset token and send a temporary password.
router.post("/complete-email", async (req, res) => {
    const email =
        typeof req.body.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";
    const resetToken =
        typeof req.body.resetToken === "string" ? req.body.resetToken : "";

    if (!validEmail(email) || !/^[a-f0-9]{64}$/i.test(resetToken)) {
        return res.status(400).json({
            success: false,
            message: "Your recovery session is invalid. Verify your code again.",
        });
    }

    let activeChallenge = null;
    let passwordUpdated = false;

    try {
        const user = await findPasswordAccountByEmail(email);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Your recovery session is invalid or expired.",
            });
        }

        const tokenHash = hashSecret(resetToken);

        const challenge = await PasswordResetChallenge.findOne({
            firebaseUid: user.uid,
            resetMethod: "email",
            resetTokenExpiresAt: { $gt: new Date() },
        }).select("+resetTokenHash");

        if (
            !challenge ||
            !safeCompareHex(tokenHash, challenge.resetTokenHash)
        ) {
            return res.status(400).json({
                success: false,
                message: "Your recovery session is invalid or expired.",
            });
        }

        activeChallenge = challenge;

        const consumed = await PasswordResetChallenge.findOneAndUpdate(
            {
                _id: challenge._id,
                resetTokenHash: challenge.resetTokenHash,
                resetTokenExpiresAt: { $gt: new Date() },
            },
            {
                $set: {
                    resetTokenHash: "",
                    resetTokenExpiresAt: null,
                },
            },
            { new: true }
        );

        if (!consumed) {
            return res.status(400).json({
                success: false,
                message: "Your recovery session is invalid or expired.",
            });
        }

        const temporaryPassword = generateTemporaryPassword();

        await auth.updateUser(user.uid, {
            password: temporaryPassword,
        });
        passwordUpdated = true;

        await auth.setCustomUserClaims(user.uid, {
            ...(user.customClaims || {}),
            mustChangePassword: true,
        });

        try {
            await sendTemporaryPasswordEmail(
                user.email || email,
                temporaryPassword
            );
        } catch (deliveryError) {
            await markHistory(challenge.historyId, {
                verificationStatus: "failed",
                failureReason: "Temporary password email delivery failed",
            });

            await releaseCooldownAfterDeliveryFailure(
                user.uid,
                "email",
                challenge.historyId
            );

            throw deliveryError;
        }

        await markHistory(challenge.historyId, {
            verificationStatus: "completed",
            completedAt: new Date(),
            failureReason: "",
        });

        return res.json({
            success: true,
            mustChangePassword: true,
            message:
                "A temporary password has been sent to your registered email. Sign in and change it immediately.",
        });
    } catch (error) {
        console.error("Email password reset failed:", error.message);

        if (activeChallenge && passwordUpdated) {
            try {
                await releaseCooldownAfterDeliveryFailure(
                    activeChallenge.firebaseUid,
                    "email",
                    activeChallenge.historyId
                );
            } catch (_) {}
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to finish recovery. If delivery failed, start recovery again.",
        });
    }
});
// PHONE: reserve the daily recovery window before Firebase SMS verification.
router.post("/phone/request", async (req, res) => {
    const phoneNumber =
        typeof req.body.phoneNumber === "string"
            ? req.body.phoneNumber.trim()
            : "";

    if (!validPhone(phoneNumber)) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid phone number including the country code.",
        });
    }

    try {
        let user = null;

        try {
            user = await auth.getUserByPhoneNumber(phoneNumber);
        } catch (error) {
            if (error.code !== "auth/user-not-found") throw error;
        }

        if (!user) {
            return res.json({
                success: true,
                message:
                    "If an eligible account exists, continue with Firebase phone verification.",
            });
        }

        const allowed = await reserveCooldown(user.uid, "phone");

        if (!allowed) {
            return res.status(429).json({
                success: false,
                message: "You can use this option only once per day.",
            });
        }

        const history = await createHistory(user, "phone", req);

        await PasswordResetChallenge.findOneAndUpdate(
            { firebaseUid: user.uid },
            {
                $set: {
                    email: user.email || "",
                    resetMethod: "phone",
                    otpHash: "",
                    otpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
                    otpAttempts: 0,
                    otpResendCount: 0,
                    lastOtpSentAt: new Date(),
                    resetTokenHash: "",
                    resetTokenExpiresAt: null,
                    historyId: history._id,
                },
            },
            { upsert: true, new: true, runValidators: true }
        );

        return res.json({
            success: true,
            message:
                "If an eligible account exists, continue with Firebase phone verification.",
        });
    } catch (error) {
        console.error("Phone reset request failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to process phone recovery right now.",
        });
    }
});

// PHONE: verify Firebase's signed-in identity and change its password.
router.post("/phone/complete", async (req, res) => {
    const idToken =
        typeof req.body.idToken === "string" ? req.body.idToken : "";

    if (!idToken || idToken.length > 10000) {
        return res.status(400).json({
            success: false,
            message: "Complete phone verification before continuing.",
        });
    }

    let activePhoneChallenge = null;
    let phonePasswordUpdated = false;

    try {
        const decoded = await auth.verifyIdToken(idToken, true);

        if (decoded.firebase?.sign_in_provider !== "phone") {
            return res.status(403).json({
                success: false,
                message: "Complete phone verification before continuing.",
            });
        }

        const user = await auth.getUser(decoded.uid);

        if (!user.phoneNumber || user.phoneNumber !== decoded.phone_number) {
            return res.status(403).json({
                success: false,
                message: "The verified phone number does not match this account.",
            });
        }

        const challenge = await PasswordResetChallenge.findOne({
            firebaseUid: user.uid,
            resetMethod: "phone",
            otpExpiresAt: { $gt: new Date() },
        });

        if (!challenge) {
            return res.status(400).json({
                success: false,
                message:
                    "The phone recovery session is missing or expired. Start recovery again.",
            });
        }

        activePhoneChallenge = challenge;

        const consumed = await PasswordResetChallenge.findOneAndUpdate(
            {
                _id: challenge._id,
                resetMethod: "phone",
                otpExpiresAt: { $gt: new Date() },
            },
            {
                $set: {
                    otpExpiresAt: null,
                    otpHash: "",
                },
            },
            { new: true }
        );

        if (!consumed) {
            return res.status(400).json({
                success: false,
                message:
                    "The phone recovery session has expired or was already used.",
            });
        }

        await markHistory(challenge.historyId, {
            verificationStatus: "verified",
            verifiedAt: new Date(),
        });

        const temporaryPassword = generateTemporaryPassword();

        await auth.updateUser(user.uid, {
            password: temporaryPassword,
        });
        phonePasswordUpdated = true;

        await auth.setCustomUserClaims(user.uid, {
            ...(user.customClaims || {}),
            mustChangePassword: true,
        });

        try {
            await sendTemporaryPasswordSms(
                user.phoneNumber,
                temporaryPassword
            );
        } catch (deliveryError) {
            await markHistory(challenge.historyId, {
                verificationStatus: "failed",
                failureReason: "Temporary password SMS delivery failed",
            });

            await releaseCooldownAfterDeliveryFailure(
                user.uid,
                "phone",
                challenge.historyId
            );

            throw deliveryError;
        }

        await markHistory(challenge.historyId, {
            verificationStatus: "completed",
            completedAt: new Date(),
            failureReason: "",
        });

        return res.json({
            success: true,
            mustChangePassword: true,
            message:
                "A temporary password has been sent to your verified phone. Sign in and change it immediately.",
        });
    } catch (error) {
        console.error("Phone password reset failed:", error.message);

        if (activePhoneChallenge && phonePasswordUpdated) {
            try {
                await releaseCooldownAfterDeliveryFailure(
                    activePhoneChallenge.firebaseUid,
                    "phone",
                    activePhoneChallenge.historyId
                );
            } catch (_) {}
        }

        return res.status(401).json({
            success: false,
            message:
                "Phone recovery failed or delivery is unavailable. Start recovery again if needed.",
        });
    }
});


/**
 * Complete a forced password change.
 * The authenticated user's identity comes from Firebase ID token,
 * never from a UID supplied by the client.
 */
router.post("/complete-change", async (req, res) => {
    const authorization = req.headers.authorization || "";
    const idToken = authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : "";

    const newPassword = req.body?.newPassword;

    if (!idToken) {
        return res.status(401).json({
            success: false,
            message: "Please log in again.",
        });
    }

    if (
        typeof newPassword !== "string" ||
        newPassword.length < 8 ||
        newPassword.length > 128
    ) {
        return res.status(400).json({
            success: false,
            message: "Password must be between 8 and 128 characters.",
        });
    }

    try {
        // Verify the token and check that it has not been revoked.
        const decoded = await auth.verifyIdToken(idToken, true);
        const user = await auth.getUser(decoded.uid);
        const claims = user.customClaims || {};

        if (
            decoded.mustChangePassword !== true &&
            claims.mustChangePassword !== true
        ) {
            return res.status(403).json({
                success: false,
                message: "A forced password change is not required for this account.",
            });
        }

        // Update the password using Firebase Admin.
        await auth.updateUser(user.uid, {
            password: newPassword,
        });

        // Preserve other custom claims while removing this requirement.
        const updatedClaims = { ...claims };
        delete updatedClaims.mustChangePassword;

        await auth.setCustomUserClaims(user.uid, updatedClaims);

        return res.json({
            success: true,
            message: "Your password has been changed successfully.",
        });
    } catch (error) {
        console.error(
            "Forced password change failed:",
            error.code || error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to complete the password change. Please try again.",
        });
    }
});


module.exports = router;