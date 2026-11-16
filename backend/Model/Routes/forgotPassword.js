
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
    return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

function validEmail(value) {
    return (
        typeof value === "string" &&
        value.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    );
}

function validPhone(value) {
    return typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value);
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

async function findPasswordAccountByPhone(phoneNumber) {
    try {
        const user = await auth.getUserByPhoneNumber(phoneNumber);

        const hasPasswordProvider = (user.providerData || []).some(
            (provider) => provider.providerId === "password"
        );

        return hasPasswordProvider && user.email ? user : null;
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

// -----------------------------------------------------------------------------
// PHONE RECOVERY: prepare an eligible, short-lived recovery challenge.
// Firebase Phone Auth sends the SMS from the frontend.
// -----------------------------------------------------------------------------
router.post("/phone/request", async (req, res) => {
    const phoneNumber =
        typeof req.body?.phoneNumber === "string"
            ? req.body.phoneNumber.trim()
            : "";

    if (!validPhone(phoneNumber)) {
        return res.status(400).json({
            success: false,
            message:
                "Enter a valid phone number with country code.",
        });
    }

    let user = null;
    let history = null;

    try {
        user = await findPasswordAccountByPhone(phoneNumber);

        if (!user || user.phoneNumber !== phoneNumber) {
            return res.json({
                success: true,
                eligible: false,
                message:
                    "If an eligible account exists, phone verification can continue.",
            });
        }

        const now = new Date();
        const cutoff = new Date(now.getTime() - OTP_RESEND_MS);

        const existing = await PasswordResetChallenge.findOne({
            firebaseUid: user.uid,
            resetMethod: "phone",
        }).select("_id otpResendCount lastOtpSentAt");

        if (
            existing &&
            (
                (existing.otpResendCount || 0) >= MAX_RESENDS ||
                (
                    existing.lastOtpSentAt &&
                    existing.lastOtpSentAt > cutoff
                )
            )
        ) {
            return res.status(429).json({
                success: false,
                message:
                    "Please wait 60 seconds or check your phone recovery resend limit.",
            });
        }

        history = await createHistory(user, "phone", req);

        const recoveryTicket = crypto.randomBytes(32).toString("hex");
        const ticketHash = hashSecret(recoveryTicket);

        const challengeFields = {
            email: user.email || "",
            resetMethod: "phone",
            otpHash: "",
            otpExpiresAt: null,
            otpAttempts: 0,
            lastOtpSentAt: now,
            resetTokenHash: ticketHash,
            resetTokenExpiresAt: new Date(
                now.getTime() + RESET_TOKEN_EXPIRY_MS
            ),
            historyId: history._id,
            deliveryStatus: "not_started",
            passwordUpdatedAt: null,
            temporaryPasswordEncrypted: "",
            temporaryPasswordIv: "",
            temporaryPasswordAuthTag: "",
        };

        const claimed = await PasswordResetChallenge.findOneAndUpdate(
            {
                firebaseUid: user.uid,
                resetMethod: "phone",
                otpResendCount: { $lt: MAX_RESENDS },
                $or: [
                    { lastOtpSentAt: { $exists: false } },
                    { lastOtpSentAt: null },
                    { lastOtpSentAt: { $lte: cutoff } },
                ],
            },
            {
                $set: challengeFields,
                $inc: {
                    otpResendCount: 1,
                    deliveryAttempts: 1,
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!claimed) {
            if (!existing) {
                try {
                    await PasswordResetChallenge.create({
                        firebaseUid: user.uid,
                        ...challengeFields,
                        otpResendCount: 0,
                        deliveryAttempts: 0,
                    });

                    return res.json({
                        success: true,
                        eligible: true,
                        recoveryTicket,
                        message:
                            "Phone recovery is ready. Continue with phone verification.",
                    });
                } catch (createError) {
                    if (createError.code !== 11000) {
                        throw createError;
                    }
                }
            }

            await PasswordResetHistory.findByIdAndDelete(
                history._id
            ).catch(() => { });

            history = null;

            return res.status(429).json({
                success: false,
                message:
                    "Please wait 60 seconds or check your phone recovery resend limit.",
            });
        }

        return res.json({
            success: true,
            eligible: true,
            recoveryTicket,
            message:
                "Phone recovery is ready. Continue with phone verification.",
        });
    } catch (error) {
        console.error(
            "Phone recovery request failed:",
            error.code || error.message
        );

        if (history) {
            await markHistory(history._id, {
                verificationStatus: "failed",
                failureReason: "Phone recovery request failed",
            }).catch(() => { });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to process phone recovery right now.",
        });
    }
});

// -----------------------------------------------------------------------------
// PHONE RECOVERY: verify Firebase phone-auth session and one-time ticket.
// Body: { idToken, recoveryTicket, newPassword }
// -----------------------------------------------------------------------------
router.post("/phone/complete", async (req, res) => {
    const idToken =
        typeof req.body?.idToken === "string"
            ? req.body.idToken.trim()
            : "";

    const recoveryTicket =
        typeof req.body?.recoveryTicket === "string"
            ? req.body.recoveryTicket.trim()
            : "";

    const newPassword = req.body?.newPassword;

    if (
        !idToken ||
        !/^[a-f0-9]{64}$/i.test(recoveryTicket) ||
        !validNewPassword(newPassword)
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid phone recovery details or password.",
        });
    }

    let user = null;
    let challenge = null;
    let cooldownReservation = null;
    let passwordChanged = false;

    try {
        const decoded = await auth.verifyIdToken(idToken, true);
        const authTimeMs = Number(decoded.auth_time) * 1000;

        if (
            decoded.firebase?.sign_in_provider !== "phone" ||
            typeof decoded.phone_number !== "string" ||
            !Number.isFinite(authTimeMs) ||
            Date.now() - authTimeMs > 5 * 60 * 1000 ||
            authTimeMs > Date.now() + 60 * 1000
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Phone verification has expired. Please verify again.",
            });
        }

        user = await auth.getUser(decoded.uid);

        const hasPasswordProvider = (user.providerData || []).some(
            (provider) => provider.providerId === "password"
        );

        if (
            user.phoneNumber !== decoded.phone_number ||
            !hasPasswordProvider ||
            !user.email
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "This phone number is not linked to an eligible InternArea account.",
            });
        }

        const ticketHash = hashSecret(recoveryTicket);

        challenge = await PasswordResetChallenge.findOne({
            firebaseUid: user.uid,
            resetMethod: "phone",
            resetTokenHash: ticketHash,
            resetTokenExpiresAt: { $gt: new Date() },
        }).select("+resetTokenHash");

        if (!challenge || !challenge.historyId) {
            return res.status(400).json({
                success: false,
                message:
                    "Your phone recovery session has expired. Start again.",
            });
        }

        cooldownReservation = await reserveCooldown(user.uid, "phone");

        if (!cooldownReservation) {
            return res.status(429).json({
                success: false,
                message:
                    "Password recovery is limited to once every 24 hours.",
            });
        }

        const consumed = await PasswordResetChallenge.findOneAndUpdate(
            {
                _id: challenge._id,
                firebaseUid: user.uid,
                resetMethod: "phone",
                resetTokenHash: ticketHash,
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
            await releaseCooldown(
                user.uid,
                "phone",
                cooldownReservation
            ).catch(() => { });

            cooldownReservation = null;

            return res.status(400).json({
                success: false,
                message:
                    "Your phone recovery session has expired. Start again.",
            });
        }

        try {
            await finishFirebasePasswordChange(user.uid, newPassword);
            passwordChanged = true;
        } catch (updateError) {
            await PasswordResetChallenge.updateOne(
                {
                    _id: challenge._id,
                    resetTokenHash: "",
                    resetTokenExpiresAt: null,
                },
                {
                    $set: {
                        resetTokenHash: ticketHash,
                        resetTokenExpiresAt: challenge.resetTokenExpiresAt,
                    },
                }
            ).catch(() => { });

            throw updateError;
        }

        const completedAt = new Date();

        await PasswordResetChallenge.updateOne(
            { _id: challenge._id },
            {
                $set: {
                    passwordUpdatedAt: completedAt,
                    otpHash: "",
                    otpExpiresAt: null,
                },
            }
        );

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
            "Phone password reset failed:",
            error.code || error.message
        );

        if (passwordChanged) {
            if (challenge?.historyId) {
                const completedAt = new Date();

                await markHistory(challenge.historyId, {
                    verificationStatus: "completed",
                    completedAt,
                    passwordUpdatedAt: completedAt,
                    failureReason: "",
                }).catch(() => { });
            }

            return res.json({
                success: true,
                message: "Your password has been updated successfully.",
            });
        }

        if (user && cooldownReservation) {
            await releaseCooldown(
                user.uid,
                "phone",
                cooldownReservation
            ).catch(() => { });
        }

        if (challenge?.historyId) {
            await markHistory(challenge.historyId, {
                verificationStatus: "failed",
                failureReason: "Phone password reset failed",
            }).catch(() => { });
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to finish phone recovery. Please try again.",
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
