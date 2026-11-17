
const express = require("express");
const crypto = require("crypto");
const { getAuth } = require("firebase-admin/auth");
const UserProfile = require("../UserProfile");

const adminApp = require("../../firebaseAdmin");
const PasswordResetHistory = require("../PasswordResetHistory");
const PasswordResetChallenge = require("../PasswordResetChallenge");
const PasswordResetCooldown = require("../PasswordResetCooldown");

const router = express.Router();
const ContactPhoneVerificationChallenge = require("../ContactPhoneVerificationChallenge");
const auth = getAuth(adminApp);
const PhonePasswordResetChallenge = require("../PhonePasswordResetChallenge");

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
    return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

function validEmail(value) {
    return (
        typeof value === "string" &&
        value.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    );
}

function validNewPassword(value) {
    return (
        typeof value === "string" &&
        value.length >= 8 &&
        value.length <= 128
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
        throw new Error("Brevo email configuration is missing.");
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            accept: "application/json",
            "api-key": apiKey,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            sender: {
                name: "InternArea",
                email: senderEmail,
            },
            to: [{ email }],
            subject: "Your InternArea password recovery code",
            textContent:
                `Your InternArea verification code is ${otp}.\n\n` +
                "This code expires in 5 minutes. If you did not request it, ignore this email.",
        }),
        signal: AbortSignal.timeout(20000),
    });

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

    console.log(
        "Brevo accepted recovery email:",
        result.messageId || "message accepted"
    );
}


async function sendWakitOtp(phoneNumber) {
    const apiKey = process.env.WAKIT_API_KEY;

    if (!apiKey) {
        throw new Error("WAKIT_API_KEY is not configured.");
    }

    const response = await fetch(
        "https://wakit.in/api/v1/otp/send",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                to: phoneNumber,
                code_length: 6,
            }),
            signal: AbortSignal.timeout(20000),
        }
    );

    const result = await response.json().catch(() => ({}));

    if (
        !response.ok ||
        result.success !== true
    ) {
        console.error(
            "Wakit OTP send failed:",
            response.status,
            result.message || result.error || "Unknown error"
        );

        throw new Error("Wakit OTP delivery failed.");
    }

    const challengeId =
        result.id ||
        result.data?.id ||
        result.data?.challenge_id;

    if (!challengeId || typeof challengeId !== "string") {
        throw new Error("Wakit did not return a challenge ID.");
    }

    return challengeId;
}

async function verifyWakitOtp(challengeId, otp) {
    const apiKey = process.env.WAKIT_API_KEY;

    if (!apiKey) {
        throw new Error("WAKIT_API_KEY is not configured.");
    }

    const response = await fetch(
        "https://wakit.in/api/v1/otp/verify",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: challengeId,
                code: otp,
            }),
            signal: AbortSignal.timeout(20000),
        }
    );

    const result = await response.json().catch(() => ({}));

    if (response.status === 400 || response.status === 422) {
        return { valid: false };
    }

    if (!response.ok) {
        throw new Error(
            `Wakit verification request failed (${response.status}).`
        );
    }

    return { valid: result.success === true };
}

async function findPasswordAccountByUid(firebaseUid) {
    try {
        const user = await auth.getUser(firebaseUid);

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


// One cooldown per Firebase account, shared by email and phone recovery.
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
                    resetMethod,
                },
            },
            { new: true }
        );

        return updated ? updated.lastRequestedAt : false;
    }

    return false;
}

async function releaseCooldown(firebaseUid, resetMethod, reservationTime) {
    if (!(reservationTime instanceof Date)) {
        return;
    }

    await PasswordResetCooldown.updateOne(
        {
            firebaseUid,
            resetMethod,
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
    if (!historyId) {
        return;
    }

    await PasswordResetHistory.findByIdAndUpdate(
        historyId,
        { $set: values }
    );
}

async function clearChallengeForHistory(firebaseUid, historyId) {
    if (!firebaseUid || !historyId) {
        return;
    }

    await PasswordResetChallenge.updateOne(
        { firebaseUid, historyId },
        {
            $set: {
                otpHash: "",
                otpExpiresAt: null,
                resetTokenHash: "",
                resetTokenExpiresAt: null,
            },
        }
    );
}

// Update the password first. Cleanup failures must not falsely report that
// the password update itself failed.
async function finishFirebasePasswordChange(uid, newPassword) {
    await auth.updateUser(uid, { password: newPassword });

    try {
        const latestUser = await auth.getUser(uid);
        const updatedClaims = { ...(latestUser.customClaims || {}) };

        delete updatedClaims.mustChangePassword;

        await auth.setCustomUserClaims(uid, updatedClaims);
    } catch (error) {
        console.error(
            "Password changed, but custom-claim cleanup failed:",
            error.code || error.message
        );
    }

    try {
        await auth.revokeRefreshTokens(uid);
    } catch (error) {
        console.error(
            "Password changed, but refresh-token revocation failed:",
            error.code || error.message
        );
    }
}

router.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Password recovery service is available.",
    });
});

// -----------------------------------------------------------------------------
// EMAIL RECOVERY: request OTP
// -----------------------------------------------------------------------------
router.post("/request", async (req, res) => {
    const email =
        typeof req.body?.email === "string"
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

        reservationTime = await reserveCooldown(user.uid, "email");

        if (!reservationTime) {
            return res.status(429).json({
                success: false,
                message:
                    "Password recovery is limited to once every 24 hours.",
            });
        }

        history = await createHistory(user, "email", req);

        const otp = createOtp();
        const otpHash = hashSecret(otp);
        const sentAt = new Date();

        await PasswordResetChallenge.findOneAndUpdate(
            {
                firebaseUid: user.uid,
                resetMethod: "email",
            },
            {
                $set: {
                    email: user.email || email,
                    resetMethod: "email",
                    otpHash,
                    otpExpiresAt: new Date(
                        sentAt.getTime() + OTP_EXPIRY_MS
                    ),
                    otpAttempts: 0,
                    otpResendCount: 0,
                    lastOtpSentAt: sentAt,
                    resetTokenHash: "",
                    resetTokenExpiresAt: null,
                    historyId: history._id,
                    deliveryStatus: "pending",
                    deliveryAttempts: 1,
                    passwordUpdatedAt: null,
                    temporaryPasswordEncrypted: "",
                    temporaryPasswordIv: "",
                    temporaryPasswordAuthTag: "",
                },
            },
            {
                upsert: true,
                new: true,
                runValidators: true,
            }
        );

        try {
            await sendOtpEmail(user.email || email, otp);
        } catch (deliveryError) {
            await clearChallengeForHistory(
                user.uid,
                history._id
            ).catch(() => { });

            await markHistory(history._id, {
                verificationStatus: "failed",
                deliveryStatus: "failed",
                failureReason: "Email recovery delivery failed",
            }).catch(() => { });

            await releaseCooldown(
                user.uid,
                "email",
                reservationTime
            ).catch(() => { });

            return res.status(502).json({
                success: false,
                message:
                    "Unable to send the verification email. Please try again later.",
            });
        }

        await PasswordResetChallenge.updateOne(
            {
                firebaseUid: user.uid,
                resetMethod: "email",
                historyId: history._id,
            },
            {
                $set: {
                    deliveryStatus: "sent",
                },
            }
        ).catch((error) => {
            console.error(
                "Could not update email challenge delivery status:",
                error.message
            );
        });

        await markHistory(history._id, {
            deliveryStatus: "sent",
        }).catch((error) => {
            console.error(
                "Could not update email delivery history:",
                error.message
            );
        });

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
            }).catch(() => { });
        }

        if (user && reservationTime) {
            await releaseCooldown(
                user.uid,
                "email",
                reservationTime
            ).catch(() => { });
        }

        if (user && history) {
            await clearChallengeForHistory(
                user.uid,
                history._id
            ).catch(() => { });
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to process your recovery request right now.",
        });
    }
});

// -----------------------------------------------------------------------------
// EMAIL RECOVERY: resend OTP
// -----------------------------------------------------------------------------
router.post("/resend", async (req, res) => {
    const email =
        typeof req.body?.email === "string"
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
                message:
                    "If eligible, a new verification code can be sent.",
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
                message:
                    "Start a recovery request before resending a code.",
            });
        }

        if (
            challenge.lastOtpSentAt &&
            Date.now() - challenge.lastOtpSentAt.getTime() < OTP_RESEND_MS
        ) {
            return res.status(429).json({
                success: false,
                message:
                    "Please wait 60 seconds before requesting another code.",
            });
        }

        if ((challenge.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
            return res.status(429).json({
                success: false,
                message:
                    "Too many attempts. Start a new recovery request later.",
            });
        }

        if ((challenge.otpResendCount || 0) >= MAX_RESENDS) {
            return res.status(429).json({
                success: false,
                message: "You have reached the resend limit.",
            });
        }

        const previousOtpHash = challenge.otpHash;
        const previousOtpExpiresAt = challenge.otpExpiresAt;
        const previousLastSentAt = challenge.lastOtpSentAt;
        const previousResendCount = challenge.otpResendCount || 0;
        const previousDeliveryStatus = challenge.deliveryStatus || "sent";
        const previousDeliveryAttempts = challenge.deliveryAttempts || 0;

        const otp = createOtp();
        const newOtpHash = hashSecret(otp);
        const newSentAt = new Date();
        const reservationId = crypto.randomUUID();

        // Reserve this resend without invalidating the old OTP.
        const claimed = await PasswordResetChallenge.findOneAndUpdate(
            {
                _id: challenge._id,
                otpHash: previousOtpHash,
                otpExpiresAt: previousOtpExpiresAt,
                otpAttempts: { $lt: MAX_OTP_ATTEMPTS },
                otpResendCount: { $lt: MAX_RESENDS },
                lastOtpSentAt: previousLastSentAt,
            },
            {
                $set: {
                    lastOtpSentAt: newSentAt,
                    deliveryStatus: "pending",
                    resendReservationId: reservationId,
                },
                $inc: {
                    otpResendCount: 1,
                    deliveryAttempts: 1,
                },
            },
            { new: true }
        );

        if (!claimed) {
            return res.status(429).json({
                success: false,
                message:
                    "Another request is being processed. Please try again shortly.",
            });
        }

        try {
            await sendOtpEmail(user.email || email, otp);
        } catch (deliveryError) {
            // Restore the previous OTP and counters only if this request
            // still owns the resend reservation.
            await PasswordResetChallenge.updateOne(
                {
                    _id: challenge._id,
                    resendReservationId: reservationId,
                    otpHash: previousOtpHash,
                },
                {
                    $set: {
                        otpHash: previousOtpHash,
                        otpExpiresAt: previousOtpExpiresAt,
                        lastOtpSentAt: previousLastSentAt,
                        otpResendCount: previousResendCount,
                        deliveryStatus: previousDeliveryStatus,
                        deliveryAttempts: previousDeliveryAttempts,
                    },
                    $unset: {
                        resendReservationId: "",
                    },
                }
            ).catch((error) => {
                console.error(
                    "Could not restore previous OTP after resend failure:",
                    error.message
                );
            });

            await markHistory(challenge.historyId, {
                failureReason: "OTP resend delivery failed",
            }).catch(() => { });

            return res.status(502).json({
                success: false,
                message:
                    "Unable to resend the code right now. Your previous code may still be used if it has not expired.",
            });
        }

        // Activate the new OTP only after the email provider accepts it.
        const activated = await PasswordResetChallenge.updateOne(
            {
                _id: challenge._id,
                resendReservationId: reservationId,
                otpHash: previousOtpHash,
            },
            {
                $set: {
                    otpHash: newOtpHash,
                    otpExpiresAt: new Date(
                        newSentAt.getTime() + OTP_EXPIRY_MS
                    ),
                    deliveryStatus: "sent",
                },
                $unset: {
                    resendReservationId: "",
                },
            }
        );

        if (!activated.modifiedCount) {
            console.error(
                "Brevo accepted an OTP resend, but the challenge could not be activated."
            );

            return res.status(500).json({
                success: false,
                message:
                    "The email was accepted but the recovery session could not be updated. Please start a new recovery request later.",
            });
        }

        await markHistory(challenge.historyId, {
            verificationStatus: "requested",
            deliveryStatus: "sent",
            failureReason: "",
        }).catch((error) => {
            console.error(
                "Could not update resend history:",
                error.message
            );
        });

        return res.json({
            success: true,
            message: "A new verification code has been sent.",
        });
    } catch (error) {
        console.error(
            "Email OTP resend failed:",
            error.code || error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to resend the code right now.",
        });
    }
});

// -----------------------------------------------------------------------------
// EMAIL RECOVERY: verify OTP and issue short-lived reset token
// -----------------------------------------------------------------------------
router.post("/verify", async (req, res) => {
    const email =
        typeof req.body?.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";

    const otp =
        typeof req.body?.otp === "string"
            ? req.body.otp.trim()
            : "";

    if (!validEmail(email) || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({
            success: false,
            message:
                "Enter your registered email and six-digit code.",
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
            }).catch(() => { });

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
                { $inc: { otpAttempts: 1 } },
                { new: true }
            );

            if (updated && updated.otpAttempts >= MAX_OTP_ATTEMPTS) {
                await markHistory(challenge.historyId, {
                    verificationStatus: "blocked",
                    failureReason: "OTP attempt limit reached",
                }).catch(() => { });
            }

            return res.status(400).json({
                success: false,
                message: "The code is invalid or expired.",
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenHash = hashSecret(resetToken);
        const tokenExpiresAt = new Date(
            Date.now() + RESET_TOKEN_EXPIRY_MS
        );

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
                    resetTokenExpiresAt: tokenExpiresAt,
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
        }).catch((error) => {
            console.error(
                "Could not update verification history:",
                error.message
            );
        });

        return res.json({
            success: true,
            resetToken,
            message:
                "Email verified. You can now set a new password.",
        });
    } catch (error) {
        console.error(
            "Email OTP verification failed:",
            error.code || error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to verify the code right now.",
        });
    }
});

// -----------------------------------------------------------------------------
// EMAIL RECOVERY: complete password reset
// -----------------------------------------------------------------------------
router.post("/complete-email", async (req, res) => {
    const email =
        typeof req.body?.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";

    const resetToken =
        typeof req.body?.resetToken === "string"
            ? req.body.resetToken
            : "";

    const newPassword = req.body?.newPassword;

    if (
        !validEmail(email) ||
        !/^[a-f0-9]{64}$/i.test(resetToken) ||
        !validNewPassword(newPassword)
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid recovery details or password.",
        });
    }

    let challenge = null;
    let tokenHash = "";
    let passwordChanged = false;

    try {
        const user = await findPasswordAccountByEmail(email);

        if (!user) {
            return res.status(400).json({
                success: false,
                message:
                    "Your recovery session is invalid or expired.",
            });
        }

        tokenHash = hashSecret(resetToken);

        challenge = await PasswordResetChallenge.findOne({
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
                message:
                    "Your recovery session is invalid or expired.",
            });
        }

        // Atomically claim the token to prevent concurrent reuse.
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
                message:
                    "Your recovery session is invalid or expired.",
            });
        }

        try {
            await finishFirebasePasswordChange(user.uid, newPassword);
            passwordChanged = true;
        } catch (updateError) {
            // Restore the same still-valid token if Firebase did not update it.
            await PasswordResetChallenge.updateOne(
                {
                    _id: challenge._id,
                    resetTokenHash: "",
                    resetTokenExpiresAt: null,
                },
                {
                    $set: {
                        resetTokenHash: tokenHash,
                        resetTokenExpiresAt: challenge.resetTokenExpiresAt,
                    },
                }
            ).catch(() => { });

            throw updateError;
        }

        const completedAt = new Date();

        await markHistory(challenge.historyId, {
            verificationStatus: "completed",
            completedAt,
            passwordUpdatedAt: completedAt,
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

        if (passwordChanged) {
            const completedAt = new Date();

            await markHistory(challenge?.historyId, {
                verificationStatus: "completed",
                completedAt,
                passwordUpdatedAt: completedAt,
                failureReason: "",
            }).catch(() => { });

            return res.json({
                success: true,
                message: "Your password has been updated successfully.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to finish recovery. Please try again.",
        });
    }
});


/* ---------------------------------------------------------------------------
   PHONE RECOVERY: request OTP
--------------------------------------------------------------------------- */

router.post("/phone/request", async (req, res) => {
    const phoneNumber =
        typeof req.body?.phoneNumber === "string"
            ? req.body.phoneNumber.trim()
            : "";

    if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid phone number with country code.",
        });
    }

    let user = null;
    let reservationTime = null;
    let history = null;

    try {
        const profile = await UserProfile.findOne({
            phoneNumber,
            phoneVerified: true,
        });

        if (!profile) {
            return res.status(400).json({
                success: false,
                message: "No verified account was found for this number.",
            });
        }

        user = await findPasswordAccountByUid(profile.firebaseUid);

        if (!user) {
            return res.status(400).json({
                success: false,
                message:
                    "This account is not eligible for password recovery using a password login.",
            });
        }

        reservationTime = await reserveCooldown(user.uid, "phone");

        if (!reservationTime) {
            return res.status(429).json({
                success: false,
                message:
                    "Password recovery is limited to once every 24 hours.",
            });
        }

        history = await createHistory(user, "phone", req);

        // Invalidate any previous WhatsApp recovery challenge for this account.
        await PhonePasswordResetChallenge.deleteMany({
            firebaseUid: user.uid,
        });

        const wakitChallengeId = await sendWakitOtp(phoneNumber);
        const sentAt = new Date();

        await PhonePasswordResetChallenge.create({
            firebaseUid: user.uid,
            phoneNumber,
            wakitChallengeId,
            historyId: history._id,
            attempts: 0,
            resendCount: 0,
            lastSentAt: sentAt,
            expiresAt: new Date(sentAt.getTime() + OTP_EXPIRY_MS),
        });

        await markHistory(history._id, {
            deliveryStatus: "sent",
        }).catch(() => {});

        return res.json({
            success: true,
            channel: "phone",
            message: "A verification code has been sent to your WhatsApp.",
        });
    } catch (error) {
        console.error(
            "Phone recovery request failed:",
            error.code || error.message
        );

        if (history) {
            await markHistory(history._id, {
                verificationStatus: "failed",
                deliveryStatus: "failed",
                failureReason: "WhatsApp recovery delivery failed",
            }).catch(() => {});
        }

        if (user && reservationTime) {
            await releaseCooldown(
                user.uid,
                "phone",
                reservationTime
            ).catch(() => {});
        }

        return res.status(502).json({
            success: false,
            message:
                "Unable to send the phone verification code right now.",
        });
    }
});


/* ---------------------------------------------------------------------------
   PHONE RECOVERY: resend OTP
--------------------------------------------------------------------------- */

router.post("/phone/resend", async (req, res) => {
    const phoneNumber =
        typeof req.body?.phoneNumber === "string"
            ? req.body.phoneNumber.trim()
            : "";

    if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid phone number with country code.",
        });
    }

    try {
        const profile = await UserProfile.findOne({
            phoneNumber,
            phoneVerified: true,
        });

        if (!profile) {
            return res.status(400).json({
                success: false,
                message: "The recovery session is invalid or expired.",
            });
        }

        const challenge = await PhonePasswordResetChallenge.findOne({
            firebaseUid: profile.firebaseUid,
            phoneNumber,
            verifiedAt: null,
        });

        if (!challenge || challenge.expiresAt <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "Start a new recovery request.",
            });
        }

        if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
            return res.status(429).json({
                success: false,
                message: "Too many attempts. Start a new recovery request later.",
            });
        }

        if (
            Date.now() - challenge.lastSentAt.getTime() <
            OTP_RESEND_MS
        ) {
            return res.status(429).json({
                success: false,
                message: "Please wait 60 seconds before requesting another code.",
            });
        }

        if (challenge.resendCount >= MAX_RESENDS) {
            return res.status(429).json({
                success: false,
                message: "You have reached the resend limit.",
            });
        }

        // Send first. Replace the stored challenge only after Wakit accepts it.
        const newChallengeId = await sendWakitOtp(phoneNumber);
        const sentAt = new Date();

        challenge.wakitChallengeId = newChallengeId;
        challenge.lastSentAt = sentAt;
        challenge.expiresAt = new Date(sentAt.getTime() + OTP_EXPIRY_MS);
        challenge.resendCount += 1;
        challenge.attempts = 0;

        await challenge.save();

        return res.json({
            success: true,
            channel: "phone",
            message: "A new phone verification code has been sent.",
        });
    } catch (error) {
        console.error(
            "Phone OTP resend failed:",
            error.code || error.message
        );

        return res.status(502).json({
            success: false,
            message: "Unable to resend the WhatsApp code right now.",
        });
    }
});


/* ---------------------------------------------------------------------------
   PHONE RECOVERY: verify OTP and issue reset token
--------------------------------------------------------------------------- */

router.post("/phone/verify", async (req, res) => {
    const phoneNumber =
        typeof req.body?.phoneNumber === "string"
            ? req.body.phoneNumber.trim()
            : "";

    const otp =
        typeof req.body?.otp === "string"
            ? req.body.otp.trim()
            : "";

    if (
        !/^\+[1-9]\d{7,14}$/.test(phoneNumber) ||
        !/^\d{6}$/.test(otp)
    ) {
        return res.status(400).json({
            success: false,
            message: "Enter your registered phone number and six-digit code.",
        });
    }

    try {
        const profile = await UserProfile.findOne({
            phoneNumber,
            phoneVerified: true,
        });

        if (!profile) {
            return res.status(400).json({
                success: false,
                message: "The code is invalid or expired.",
            });
        }

        const user = await findPasswordAccountByUid(profile.firebaseUid);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "The code is invalid or expired.",
            });
        }

        const challenge = await PhonePasswordResetChallenge.findOne({
            firebaseUid: user.uid,
            phoneNumber,
            verifiedAt: null,
        });

        if (!challenge || challenge.expiresAt <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "The code has expired. Request a new one.",
            });
        }

        if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
            return res.status(429).json({
                success: false,
                message: "Too many incorrect attempts.",
            });
        }

        let verification;

        try {
            verification = await verifyWakitOtp(
                challenge.wakitChallengeId,
                otp
            );
        } catch (providerError) {
            console.error(
                "Wakit verification unavailable:",
                providerError.message
            );

            return res.status(502).json({
                success: false,
                message: "Unable to verify the code right now. Please try again.",
            });
        }

        if (!verification.valid) {
            challenge.attempts += 1;
            await challenge.save();

            if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
                await markHistory(challenge.historyId, {
                    verificationStatus: "blocked",
                    failureReason: "Phone OTP attempt limit reached",
                }).catch(() => {});
            }

            return res.status(400).json({
                success: false,
                message: "The code is invalid or expired.",
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenHash = hashSecret(resetToken);
        const verifiedAt = new Date();

        // Claim this challenge only once.
        const claimed = await PhonePasswordResetChallenge.findOneAndUpdate(
            {
                _id: challenge._id,
                verifiedAt: null,
                expiresAt: { $gt: verifiedAt },
                attempts: { $lt: MAX_OTP_ATTEMPTS },
            },
            {
                $set: {
                    verifiedAt,
                    resetTokenHash,
                    resetTokenExpiresAt: new Date(
                        verifiedAt.getTime() + RESET_TOKEN_EXPIRY_MS
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
            verifiedAt,
        }).catch(() => {});

        return res.json({
            success: true,
            resetToken,
            message: "	Phone number verified. You can now set a new password.",
        });
    } catch (error) {
        console.error(
            "Phone OTP verification failed:",
            error.code || error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to verify the code right now.",
        });
    }
});


/* ---------------------------------------------------------------------------
   PHONE RECOVERY: complete password reset
--------------------------------------------------------------------------- */

router.post("/phone/complete", async (req, res) => {
    const phoneNumber =
        typeof req.body?.phoneNumber === "string"
            ? req.body.phoneNumber.trim()
            : "";

    const resetToken =
        typeof req.body?.resetToken === "string"
            ? req.body.resetToken
            : "";

    const newPassword = req.body?.newPassword;

    if (
        !/^\+[1-9]\d{7,14}$/.test(phoneNumber) ||
        !/^[a-f0-9]{64}$/i.test(resetToken) ||
        !validNewPassword(newPassword)
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid recovery details or password.",
        });
    }

    let challenge = null;
    let tokenHash = "";
    let passwordChanged = false;

    try {
        const profile = await UserProfile.findOne({
            phoneNumber,
            phoneVerified: true,
        });

        if (!profile) {
            return res.status(400).json({
                success: false,
                message: "Your recovery session is invalid or expired.",
            });
        }

        const user = await findPasswordAccountByUid(profile.firebaseUid);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Your recovery session is invalid or expired.",
            });
        }

        tokenHash = hashSecret(resetToken);

        challenge = await PhonePasswordResetChallenge.findOne({
            firebaseUid: user.uid,
            phoneNumber,
            verifiedAt: { $ne: null },
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

        // Atomically consume the reset token to prevent reuse.
        const consumed = await PhonePasswordResetChallenge.findOneAndUpdate(
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
            await finishFirebasePasswordChange(user.uid, newPassword);
            passwordChanged = true;
        } catch (updateError) {
            // Restore the token only if Firebase did not change the password.
            await PhonePasswordResetChallenge.updateOne(
                {
                    _id: challenge._id,
                    resetTokenHash: "",
                    resetTokenExpiresAt: null,
                },
                {
                    $set: {
                        resetTokenHash: tokenHash,
                        resetTokenExpiresAt: challenge.resetTokenExpiresAt,
                    },
                }
            ).catch(() => {});

            throw updateError;
        }

        const completedAt = new Date();

        await markHistory(challenge.historyId, {
            verificationStatus: "completed",
            completedAt,
            passwordUpdatedAt: completedAt,
            failureReason: "",
        }).catch(() => {});

        await PhonePasswordResetChallenge.deleteOne({
            _id: challenge._id,
        }).catch(() => {});

        return res.json({
            success: true,
            message: "Your password has been updated successfully.",
        });
    } catch (error) {
        console.error(
            "WhatsApp password reset failed:",
            error.code || error.message
        );

        if (passwordChanged) {
            await markHistory(challenge?.historyId, {
                verificationStatus: "completed",
                completedAt: new Date(),
                failureReason: "",
            }).catch(() => {});

            return res.json({
                success: true,
                message: "Your password has been updated successfully.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to finish recovery. Please try again.",
        });
    }
});


router.post("/phone/contact", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!idToken) {
      return res.status(401).json({
        success: false,
        message: "Please sign in again.",
      });
    }

    const decoded = await auth.verifyIdToken(idToken, true);

    let phoneNumber = req.body.phoneNumber;

    if (typeof phoneNumber !== "string") {
      return res.status(400).json({
        success: false,
        message: "Enter a valid mobile number.",
      });
    }

    phoneNumber = phoneNumber.trim();

    if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid mobile number with country code.",
      });
    }

    const profile = await UserProfile.findOne({
      firebaseUid: decoded.uid,
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "InternArea profile not found.",
      });
    }

    if (profile.contactPhoneNumber !== phoneNumber) {
  profile.contactPhoneNumber = phoneNumber;
  profile.contactPhoneVerified = false;
}

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Mobile contact number saved successfully.",
      contactPhoneNumber: phoneNumber,
     contactPhoneVerified: profile.contactPhoneVerified === true, 
    });
  } catch (error) {
    console.error("Contact phone save error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save mobile number right now.",
    });
  }
});

router.get("/phone/contact", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!idToken) {
      return res.status(401).json({
        success: false,
        message: "Please sign in again.",
      });
    }

    const decoded = await auth.verifyIdToken(idToken, true);

    const profile = await UserProfile.findOne({
      firebaseUid: decoded.uid,
    }).select("contactPhoneNumber contactPhoneVerified");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "InternArea profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      contactPhoneNumber: profile.contactPhoneNumber || "",
      contactPhoneVerified: profile.contactPhoneVerified === true,
    });
  } catch (error) {
    console.error("Contact phone fetch error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load mobile number right now.",
    });
  }
});


const CONTACT_WIDGET_SESSION_EXPIRY_MS = 20 * 60 * 1000;

// Authenticate the Firebase user and load their InternArea profile.
async function getAuthenticatedContactProfile(req) {
  const authorization = req.headers.authorization || "";
  const idToken = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!idToken) {
    const error = new Error("Please sign in again.");
    error.status = 401;
    throw error;
  }

  const decoded = await auth.verifyIdToken(idToken, true);

  const profile = await UserProfile.findOne({
    firebaseUid: decoded.uid,
  });

  if (!profile) {
    const error = new Error("InternArea profile not found.");
    error.status = 404;
    throw error;
  }

  return { decoded, profile };
}

function normalizePhoneForComparison(value) {
  return typeof value === "string"
    ? value.replace(/\D/g, "")
    : "";
}

// Validate the access token with MSG91.
// The account Authkey must remain on the backend.
async function verifyMsg91WidgetAccessToken(accessToken) {
  const authKey = process.env.MSG91_AUTHKEY;

  if (!authKey) {
    throw new Error("MSG91_AUTHKEY is not configured.");
  }

  const response = await fetch(
    "https://control.msg91.com/api/v5/widget/verifyAccessToken",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authkey: authKey,
        "access-token": accessToken,
      }),
      signal: AbortSignal.timeout(20000),
    }
  );

  const result = await response.json().catch(() => ({}));

  // MSG91 may return HTTP 200 with an error in the response body.
  if (!response.ok || result.type !== "success") {
    console.error(
      "MSG91 access-token verification failed:",
      response.status,
      result.message || result.type || "Unknown error"
    );

    throw new Error("MSG91 could not verify the access token.");
  }

  // MSG91's successful response identifies the verified number.
  const verifiedIdentifier =
    typeof result.message === "string"
      ? result.message
      : result.data?.identifier;

  if (!verifiedIdentifier) {
    throw new Error(
      "MSG91 did not return the verified mobile number."
    );
  }

  return verifiedIdentifier;
}


// CREATE A CONTACT VERIFICATION SESSION
// The frontend sends the OTP through the MSG91 Web SDK.
router.post("/phone/contact/request", async (req, res) => {
  try {
    const { decoded, profile } =
      await getAuthenticatedContactProfile(req);

    const phoneNumber = profile.contactPhoneNumber;

    if (!phoneNumber || !/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Save a valid contact number first.",
      });
    }

    if (profile.contactPhoneVerified === true) {
      return res.json({
        success: true,
        verified: true,
        message: "This mobile number is already verified.",
      });
    }

    const sessionId = crypto.randomBytes(32).toString("hex");
    const now = new Date();

    const expiresAt = new Date(
      now.getTime() + CONTACT_WIDGET_SESSION_EXPIRY_MS
    );

    await ContactPhoneVerificationChallenge.findOneAndUpdate(
      { firebaseUid: decoded.uid },
      {
        $set: {
          firebaseUid: decoded.uid,
          phoneNumber,
          channel: "sms",
          sessionId,
          attempts: 0,
          expiresAt,
          verifiedAt: null,
          consumedAt: null,
        },
        $unset: {
          accessTokenHash: "",
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      sessionId,
      expiresAt,
      message: "Verification session created.",
    });
  } catch (error) {
    console.error(
      "Contact verification session creation failed:",
      error.code || error.message
    );

    return res.status(error.status || 500).json({
      success: false,
      message:
        error.status
          ? error.message
          : "Unable to start mobile verification.",
    });
  }
});


// VERIFY THE MSG91 WIDGET ACCESS TOKEN
router.post("/phone/contact/verify", async (req, res) => {
  try {
    const { decoded, profile } =
      await getAuthenticatedContactProfile(req);

    const sessionId =
      typeof req.body?.sessionId === "string"
        ? req.body.sessionId.trim()
        : "";

    const accessToken =
      typeof req.body?.accessToken === "string"
        ? req.body.accessToken.trim()
        : "";

    if (
      !/^[a-f0-9]{64}$/i.test(sessionId) ||
      !accessToken ||
      accessToken.length > 10000
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification session.",
      });
    }

    const now = new Date();

    const challenge =
      await ContactPhoneVerificationChallenge.findOne({
        firebaseUid: decoded.uid,
        sessionId,
        phoneNumber: profile.contactPhoneNumber,
        channel: "sms",
        verifiedAt: null,
        consumedAt: null,
        expiresAt: { $gt: now },
      });

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message:
          "Your verification session is invalid or expired. Request a new OTP.",
      });
    }

    // Ask MSG91 to validate the token generated by its OTP Widget.
    let verifiedPhone;

    try {
      verifiedPhone =
        await verifyMsg91WidgetAccessToken(accessToken);
    } catch (providerError) {
      console.error(
        "MSG91 verification error:",
        providerError.message
      );

      return res.status(502).json({
        success: false,
        message:
          "MSG91 verification is temporarily unavailable. Please try again.",
      });
    }

    // Never trust a phone number sent by the browser.
    // Compare MSG91's verified identifier with the saved profile number.
    if (
      normalizePhoneForComparison(verifiedPhone) !==
      normalizePhoneForComparison(challenge.phoneNumber)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The verified mobile number does not match your saved contact number.",
      });
    }

    // Store only a hash of the access token, never the original token.
    const accessTokenHash = crypto
      .createHash("sha256")
      .update(accessToken)
      .digest("hex");

    const verifiedAt = new Date();

    // Atomically consume the session so it cannot be reused.
    const claimed =
      await ContactPhoneVerificationChallenge.findOneAndUpdate(
        {
          _id: challenge._id,
          firebaseUid: decoded.uid,
          sessionId,
          phoneNumber: challenge.phoneNumber,
          verifiedAt: null,
          consumedAt: null,
          expiresAt: { $gt: verifiedAt },
        },
        {
          $set: {
            accessTokenHash,
            verifiedAt,
            consumedAt: verifiedAt,
          },
        },
        { new: true }
      );

    if (!claimed) {
      return res.status(409).json({
        success: false,
        message:
          "This verification session has already been used or expired.",
      });
    }

    // Only verify the number if it is still the saved contact number.
    const updatedProfile = await UserProfile.findOneAndUpdate(
      {
        _id: profile._id,
        contactPhoneNumber: challenge.phoneNumber,
        contactPhoneVerified: { $ne: true },
      },
      {
        $set: {
          contactPhoneVerified: true,
        },
      },
      { new: true }
    );

    if (!updatedProfile) {
      // Check whether another simultaneous request already verified it.
      const latestProfile = await UserProfile.findById(profile._id);

      if (
        latestProfile?.contactPhoneNumber !== challenge.phoneNumber ||
        latestProfile?.contactPhoneVerified !== true
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Your contact number changed. Verify the current number instead.",
        });
      }
    }

    return res.status(200).json({
      success: true,
      contactPhoneNumber: challenge.phoneNumber,
      contactPhoneVerified: true,
      message: "Mobile number verified successfully.",
    });
  } catch (error) {
    console.error(
      "Contact phone verification failed:",
      error.code || error.message
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This verification token has already been used.",
      });
    }

    return res.status(error.status || 500).json({
      success: false,
      message:
        error.status
          ? error.message
          : "Unable to verify the mobile number.",
    });
  }
});


// -----------------------------------------------------------------------------
// COMPLETE A FORCED PASSWORD CHANGE AFTER LOGIN
// -----------------------------------------------------------------------------
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

    if (!validNewPassword(newPassword)) {
        return res.status(400).json({
            success: false,
            message:
                "Password must be between 8 and 128 characters.",
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
                message:
                    "A forced password change is not required.",
            });
        }

        await finishFirebasePasswordChange(user.uid, newPassword);

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
