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
            { returnDocument: "after" }
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

// AES-256-GCM encryption for temporary passwords.
function getRecoveryEncryptionKey() {
    const keyHex = process.env.RECOVERY_ENCRYPTION_KEY;

    if (!keyHex || !/^[a-fA-F0-9]{64}$/.test(keyHex)) {
        throw new Error(
            "RECOVERY_ENCRYPTION_KEY must be exactly 64 hexadecimal characters."
        );
    }

    return Buffer.from(keyHex, "hex");
}

function encryptTemporaryPassword(password) {
    const key = getRecoveryEncryptionKey();
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const encrypted = Buffer.concat([
        cipher.update(password, "utf8"),
        cipher.final(),
    ]);

    return {
        encrypted: encrypted.toString("hex"),
        iv: iv.toString("hex"),
        authTag: cipher.getAuthTag().toString("hex"),
    };
}

function decryptTemporaryPassword(challenge) {
    const key = getRecoveryEncryptionKey();

    if (
        !challenge?.temporaryPasswordEncrypted ||
        !challenge?.temporaryPasswordIv ||
        !challenge?.temporaryPasswordAuthTag
    ) {
        throw new Error("Encrypted temporary password is unavailable.");
    }

    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(challenge.temporaryPasswordIv, "hex")
    );

    decipher.setAuthTag(
        Buffer.from(challenge.temporaryPasswordAuthTag, "hex")
    );

    return Buffer.concat([
        decipher.update(
            Buffer.from(challenge.temporaryPasswordEncrypted, "hex")
        ),
        decipher.final(),
    ]).toString("utf8");
}

async function deliverTemporaryPassword(user, challenge) {
    try {
        // Recover the exact same password on every retry.
        const temporaryPassword = decryptTemporaryPassword(challenge);

        // Update Firebase only if this password has not already been applied.
        if (!challenge.passwordUpdatedAt) {
            await auth.updateUser(user.uid, {
                password: temporaryPassword,
            });

            const latestUser = await auth.getUser(user.uid);

            await auth.setCustomUserClaims(user.uid, {
                ...(latestUser.customClaims || {}),
                mustChangePassword: true,
            });

            await PasswordResetChallenge.updateOne(
                { _id: challenge._id },
                { $set: { passwordUpdatedAt: new Date() } }
            );
        }

        await PasswordResetChallenge.updateOne(
            { _id: challenge._id },
            { $inc: { deliveryAttempts: 1 } }
        );

        // Send the same password that was saved in encrypted form.
        await sendTemporaryPasswordEmail(
            user.email,
            temporaryPassword
        );

        await PasswordResetChallenge.updateOne(
            { _id: challenge._id },
            { $set: { deliveryStatus: "sent" } }
        );

        await markHistory(challenge.historyId, {
            verificationStatus: "completed",
            completedAt: new Date(),
            deliveryStatus: "sent",
            failureReason: "",
        });

        // Revoke old Firebase refresh tokens after successful delivery.
        try {
            await auth.revokeRefreshTokens(user.uid);
        } catch (revokeError) {
            console.error(
                "Refresh-token revocation failed:",
                revokeError.code || revokeError.message
            );
        }

        return true;
    } catch (error) {
        await PasswordResetChallenge.updateOne(
            { _id: challenge._id },
            { $set: { deliveryStatus: "failed" } }
        );

        await markHistory(challenge.historyId, {
            verificationStatus: "failed",
            deliveryStatus: "failed",
            failureReason: "Temporary password delivery or processing failed",
        });

        throw error;
    }
}

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
            { upsert: true, returnDocument: "after", runValidators: true }
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
            { returnDocument: "after" }
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
                { returnDocument: "after" }
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
            { returnDocument: "after" }
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
            message: "Invalid recovery details or password. Please check and try again.",
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

        // Find the matching, unexpired recovery session.
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

        // Consume the token atomically so it cannot be reused.
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
            { returnDocument: "after" }
        );

        if (!consumed) {
            return res.status(400).json({
                success: false,
                message: "Your recovery session is invalid or expired.",
            });
        }

        // Set the exact password chosen by the user.
        await auth.updateUser(user.uid, {
            password: newPassword,
        });

        // Remove any old temporary-password requirement.
        const updatedClaims = { ...(user.customClaims || {}) };
        delete updatedClaims.mustChangePassword;

        await auth.setCustomUserClaims(user.uid, updatedClaims);

        await markHistory(challenge.historyId, {
            verificationStatus: "completed",
            completedAt: new Date(),
            failureReason: "",
        });

        return res.json({
            success: true,
            message: "Your password has been updated successfully. You can now sign in.",
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

// PHONE: prepare recovery before Firebase sends its OTP.
router.post("/phone/request", async (req, res) => {
    const phoneNumber =
        typeof req.body.phoneNumber === "string"
            ? req.body.phoneNumber.trim()
            : "";

    if (!validPhone(phoneNumber)) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid phone number including country code.",
        });
    }

    try {
        let user;

        try {
            user = await auth.getUserByPhoneNumber(phoneNumber);
        } catch (error) {
            if (error.code === "auth/user-not-found") {
                return res.json({
                    success: true,
                    message: "If an eligible account exists, continue with phone verification.",
                });
            }
            throw error;
        }

        const hasPasswordProvider = (user.providerData || []).some(
            provider => provider.providerId === "password"
        );

        if (!hasPasswordProvider || !user.email) {
            return res.json({
                success: true,
                message: "If an eligible account exists, continue with phone verification.",
            });
        }

        const history = await createHistory(user, "phone", req);

        await PasswordResetChallenge.findOneAndUpdate(
            { firebaseUid: user.uid },
            {
                $set: {
                    email: user.email,
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
            { upsert: true, returnDocument: "after", runValidators: true }
        );

        return res.json({
            success: true,
            message: "Continue with Firebase phone verification.",
        });
    } catch (error) {
        console.error("Phone recovery request failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to process phone recovery right now.",
        });
    }
});
// PHONE: verify Firebase OTP, save an encrypted password,
// update Firebase, and deliver it through registered email.
router.post("/phone/complete", async (req, res) => {
    const idToken =
        typeof req.body.idToken === "string" ? req.body.idToken : "";

    if (!idToken || idToken.length > 10000) {
        return res.status(400).json({
            success: false,
            message: "Complete phone verification before continuing.",
        });
    }

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
                message: "Verified phone number does not match this account.",
            });
        }

        const hasPasswordProvider = (user.providerData || []).some(
            provider => provider.providerId === "password"
        );

        if (!hasPasswordProvider || !user.email) {
            return res.status(403).json({
                success: false,
                message: "This account is not eligible for password recovery.",
            });
        }

        const challenge = await PasswordResetChallenge.findOne({
            firebaseUid: user.uid,
            resetMethod: "phone",
            otpExpiresAt: { $gt: new Date() },
            deliveryStatus: "not_started",
        });

        if (!challenge) {
            return res.status(400).json({
                success: false,
                message: "Phone recovery session is missing, expired, or already used.",
            });
        }

        const allowed = await reserveCooldown(user.uid, "phone");

        if (!allowed) {
            return res.status(429).json({
                success: false,
                message: "Password recovery is limited to once every 24 hours.",
            });
        }

        // Generate and encrypt before changing the Firebase password.
        const temporaryPassword = generateTemporaryPassword();
        const encrypted = encryptTemporaryPassword(temporaryPassword);

        // Atomically consume the phone verification and save the encrypted password.
        const claimed = await PasswordResetChallenge.findOneAndUpdate(
            {
                _id: challenge._id,
                firebaseUid: user.uid,
                resetMethod: "phone",
                otpExpiresAt: { $gt: new Date() },
                deliveryStatus: "not_started",
                temporaryPasswordEncrypted: "",
            },
            {
                $set: {
                    otpExpiresAt: null,
                    otpHash: "",
                    temporaryPasswordEncrypted: encrypted.encrypted,
                    temporaryPasswordIv: encrypted.iv,
                    temporaryPasswordAuthTag: encrypted.authTag,
                    deliveryStatus: "pending",
                },
            },
            { returnDocument: "after" }
        ).select(
            "+temporaryPasswordEncrypted +temporaryPasswordIv +temporaryPasswordAuthTag"
        );

        if (!claimed) {
            return res.status(400).json({
                success: false,
                message: "Phone recovery session was already used. Please try again.",
            });
        }

        await markHistory(claimed.historyId, {
            verificationStatus: "verified",
            verifiedAt: new Date(),
            deliveryStatus: "pending",
        });

        await deliverTemporaryPassword(user, claimed);

        return res.json({
            success: true,
            mustChangePassword: true,
            message:
                "Phone verified. A temporary password has been sent to your registered email. Sign in and change it immediately.",
        });
    } catch (error) {
        console.error(
            "Phone password recovery failed:",
            error.code || error.message
        );

        return res.status(500).json({
            success: false,
            message:
                "Recovery could not be completed. If your password was changed, use the delivery retry option.",
        });
    }
});

// PHONE: retry delivery of the already-generated temporary password.
router.post("/phone/retry-delivery", async (req, res) => {
    const idToken =
        typeof req.body.idToken === "string" ? req.body.idToken : "";

    if (!idToken || idToken.length > 10000) {
        return res.status(401).json({
            success: false,
            message: "Please verify your phone number again.",
        });
    }

    try {
        const decoded = await auth.verifyIdToken(idToken, true);

        if (decoded.firebase?.sign_in_provider !== "phone") {
            return res.status(403).json({
                success: false,
                message: "Phone verification is required.",
            });
        }

        const user = await auth.getUser(decoded.uid);

        if (!user.phoneNumber || user.phoneNumber !== decoded.phone_number) {
            return res.status(403).json({
                success: false,
                message: "Verified phone number does not match this account.",
            });
        }

        const challenge = await PasswordResetChallenge.findOne({
            firebaseUid: user.uid,
            resetMethod: "phone",
            deliveryStatus: "failed",
            temporaryPasswordEncrypted: { $ne: "" },
        }).select(
            "+temporaryPasswordEncrypted +temporaryPasswordIv +temporaryPasswordAuthTag"
        );

        if (!challenge || !user.email) {
            return res.status(400).json({
                success: false,
                message: "No failed password delivery is available to retry.",
            });
        }

        // Claim the failed delivery so simultaneous retries cannot run together.
        const claimed = await PasswordResetChallenge.findOneAndUpdate(
            {
                _id: challenge._id,
                deliveryStatus: "failed",
            },
            {
                $set: { deliveryStatus: "pending" },
            },
            { returnDocument: "after" }
        ).select(
            "+temporaryPasswordEncrypted +temporaryPasswordIv +temporaryPasswordAuthTag"
        );

        if (!claimed) {
            return res.status(409).json({
                success: false,
                message: "A delivery attempt is already in progress.",
            });
        }

        await deliverTemporaryPassword(user, claimed);

        return res.json({
            success: true,
            mustChangePassword: true,
            message: "Your temporary password has been sent to your registered email.",
        });
    } catch (error) {
        console.error(
            "Temporary password delivery retry failed:",
            error.code || error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to retry delivery right now.",
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