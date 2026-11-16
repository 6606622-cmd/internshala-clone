
const express = require("express");
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
const MAX_RESENDS = 5;

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
    return crypto.randomInt(0, 1000000)
        .toString()
        .padStart(6, "0");
}

function validEmail(value) {
    return (
        typeof value === "string" &&
        value.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    );
}

function getRequestMetadata(req) {
    const ua = req.get("user-agent") || "";

    return {
        ipAddress: req.ip || "Unknown",
        browser: ua.slice(0, 300) || "Unknown",
        device: ua.slice(0, 300) || "Unknown",
    };
}


async function sendOtpEmail(email, otp) {
    const apiKey = process.env.BREVO_API_KEY;
       const senderEmail =
        process.env.BREVO_OTP_SENDER || process.env.EMAIL_USER;

    if (!apiKey || !senderEmail) {
        throw new Error(
            "Brevo email configuration is missing."
        );
    }

    const response = await fetch(
        "https://api.brevo.com/v3/smtp/email",
        {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": apiKey,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                sender: {
                    name: "InternArea",
                    email: senderEmail,
                },
                to: [
                    {
                        email,
                    },
                ],
                subject: "Your InternArea password recovery code",
                textContent:
                    `Your InternArea verification code is ${otp}.\n\n` +
                    "This code expires in 5 minutes. If you did not request it, ignore this email.",
            }),
            signal: AbortSignal.timeout(20000),
        }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        console.error(
            "Brevo API error:",
            response.status,
            result.message || result.code || "Unknown error"
        );

        throw new Error(
            `Brevo email delivery request failed (${response.status}).`
        );
    }

    console.log("Brevo accepted recovery email:", result.messageId);
}


async function findPasswordAccountByEmail(email) {
    try {
        const user = await auth.getUserByEmail(email);

        const hasPasswordProvider = (user.providerData || []).some(
            (provider) => provider.providerId === "password"
        );

        return hasPasswordProvider ? user : null;
    } catch (error) {
        if (error.code === "auth/user-not-found") {
            return null;
        }

        throw error;
    }
}

async function reserveCooldown(firebaseUid) {
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
                    resetMethod: "email",
                });

                return now;
            } catch (error) {
                if (error.code === 11000) {
                    continue;
                }

                throw error;
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
                    resetMethod: "email",
                },
            },
            { new: true }
        );

        return updated ? updated.lastRequestedAt : false;
    }

    return false;
}

async function releaseCooldown(firebaseUid, reservationTime) {
    if (!(reservationTime instanceof Date)) {
        return;
    }

    await PasswordResetCooldown.updateOne(
        {
            firebaseUid,
            resetMethod: "email",
            lastRequestedAt: reservationTime,
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

async function createHistory(user, req) {
    return PasswordResetHistory.create({
        firebaseUid: user.uid,
        email: user.email || "",
        resetMethod: "email",
        verificationStatus: "requested",
        ...getRequestMetadata(req),
    });
}

async function markHistory(historyId, values) {
    if (!historyId) return;

    await PasswordResetHistory.findByIdAndUpdate(historyId, {
        $set: values,
    });
}

router.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Email password recovery service is available.",
    });
});

// REQUEST EMAIL OTP
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

    let user = null;
    let reservationTime = null;
    let history = null;

    try {
        user = await findPasswordAccountByEmail(email);

        if (!user) {
            return res.json({
                success: true,
                message:
                    "If an eligible account exists, a verification code will be sent.",
            });
        }

        reservationTime = await reserveCooldown(user.uid);

        if (!reservationTime) {
            return res.status(429).json({
                success: false,
                message:
                    "Password recovery is limited to once every 24 hours.",
            });
        }

        history = await createHistory(user, req);

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
            {
                upsert: true,
                new: true,
                runValidators: true,
            }
        );

        await sendOtpEmail(user.email || email, otp);

        return res.json({
            success: true,
            message: "A verification code has been sent to your email.",
        });
    } catch (error) {
        console.error(
            "Email recovery request failed:",
            error.code || error.message
        );

        if (history) {
            await markHistory(history._id, {
                verificationStatus: "failed",
                failureReason: "Email recovery request failed",
            }).catch(() => {});
        }

        if (user && reservationTime) {
            await releaseCooldown(
                user.uid,
                reservationTime
            ).catch(() => {});
        }

        if (user && history) {
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
            ).catch(() => {});
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to send the verification email. Please try again later.",
        });
    }
});

// RESEND EMAIL OTP
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
                message: "If eligible, a new verification code can be sent.",
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

        if ((challenge.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
            return res.status(429).json({
                success: false,
                message: "Too many attempts. Please try again later.",
            });
        }

        if ((challenge.otpResendCount || 0) >= MAX_RESENDS) {
            return res.status(429).json({
                success: false,
                message: "You have reached the resend limit.",
            });
        }

        const otp = createOtp();
        const otpHash = hashSecret(otp);
        const newSentAt = new Date();

        const claimed = await PasswordResetChallenge.findOneAndUpdate(
            {
                _id: challenge._id,
                otpHash: challenge.otpHash,
                otpAttempts: { $lt: MAX_OTP_ATTEMPTS },
                otpResendCount: { $lt: MAX_RESENDS },
                lastOtpSentAt: challenge.lastOtpSentAt,
            },
            {
                $set: {
                    otpHash,
                    lastOtpSentAt: newSentAt,
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
                failureReason: "",
            });

            return res.json({
                success: true,
                message: "A new verification code has been sent.",
            });
        } catch (error) {
            await PasswordResetChallenge.updateOne(
                {
                    _id: challenge._id,
                    otpHash,
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
                failureReason: "OTP resend delivery failed",
            });

            throw error;
        }
    } catch (error) {
        console.error("Email OTP resend failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to resend the code right now.",
        });
    }
});

// VERIFY EMAIL OTP
router.post("/verify", async (req, res) => {
    const email =
        typeof req.body.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";

    const otp =
        typeof req.body.otp === "string"
            ? req.body.otp.trim()
            : "";

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
                message: "The code is invalid or expired.",
            });
        }

        const challenge = await PasswordResetChallenge.findOne({
            firebaseUid: user.uid,
            resetMethod: "email",
        }).select("+otpHash");

        if (
            !challenge ||
            !challenge.otpHash ||
            !challenge.otpExpiresAt
        ) {
            return res.status(400).json({
                success: false,
                message: "The code is invalid or expired.",
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

        if ((challenge.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
            return res.status(429).json({
                success: false,
                message: "Too many incorrect attempts.",
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
                {
                    $inc: { otpAttempts: 1 },
                },
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
                message: "The code is invalid or expired.",
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
                message: "The code is invalid or expired.",
            });
        }

        await markHistory(challenge.historyId, {
            verificationStatus: "verified",
            verifiedAt: new Date(),
        });

        return res.json({
            success: true,
            resetToken,
            message: "Email verified. You can now set a new password.",
        });
    } catch (error) {
        console.error("Email OTP verification failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to verify the code right now.",
        });
    }
});

// COMPLETE EMAIL PASSWORD RESET
router.post("/complete-email", async (req, res) => {
    const email =
        typeof req.body.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";

    const resetToken =
        typeof req.body.resetToken === "string"
            ? req.body.resetToken
            : "";

    const newPassword = req.body.newPassword;

    if (
        !validEmail(email) ||
        !/^[a-f0-9]{64}$/i.test(resetToken) ||
        typeof newPassword !== "string" ||
        newPassword.length < 8 ||
        newPassword.length > 128
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid recovery details or password.",
        });
    }

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

        try {
            await auth.updateUser(user.uid, {
                password: newPassword,
            });

            const latestUser = await auth.getUser(user.uid);
            const updatedClaims = { ...(latestUser.customClaims || {}) };

            delete updatedClaims.mustChangePassword;

            await auth.setCustomUserClaims(user.uid, updatedClaims);
            await auth.revokeRefreshTokens(user.uid);
        } catch (updateError) {
            console.error(
                "Firebase password update failed:",
                updateError.code || updateError.message
            );

            throw updateError;
        }

        await markHistory(challenge.historyId, {
            verificationStatus: "completed",
            completedAt: new Date(),
            passwordUpdatedAt: new Date(),
            failureReason: "",
        });

        return res.json({
            success: true,
            message: "Your password has been updated successfully.",
        });
    } catch (error) {
        console.error(
            "Email password reset failed:",
            error.code || error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to finish recovery. Please try again.",
        });
    }
});

// COMPLETE A FORCED PASSWORD CHANGE AFTER LOGIN
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
        const decoded = await auth.verifyIdToken(idToken, true);
        const user = await auth.getUser(decoded.uid);
        const claims = user.customClaims || {};

        if (
            decoded.mustChangePassword !== true &&
            claims.mustChangePassword !== true
        ) {
            return res.status(403).json({
                success: false,
                message: "A forced password change is not required.",
            });
        }

        await auth.updateUser(user.uid, {
            password: newPassword,
        });

        const updatedClaims = { ...claims };
        delete updatedClaims.mustChangePassword;

        await auth.setCustomUserClaims(user.uid, updatedClaims);
        await auth.revokeRefreshTokens(user.uid);

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
            message: "Unable to complete the password change.",
        });
    }
});

module.exports = router;
