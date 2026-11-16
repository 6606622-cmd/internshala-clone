
const mongoose = require("mongoose");

const passwordResetChallengeSchema = new mongoose.Schema(
    {
        firebaseUid: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            default: "",
            trim: true,
            lowercase: true,
        },

        resetMethod: {
            type: String,
            enum: ["email", "phone"],
            required: true,
        },

        otpHash: {
            type: String,
            default: "",
            select: false,
        },

        otpExpiresAt: {
            type: Date,
            default: null,
        },

        otpAttempts: {
            type: Number,
            default: 0,
        },

        otpResendCount: {
            type: Number,
            default: 0,
        },

        lastOtpSentAt: {
            type: Date,
            default: null,
        },

        resetTokenHash: {
            type: String,
            default: "",
            select: false,
        },

        resetTokenExpiresAt: {
            type: Date,
            default: null,
        },

        historyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PasswordResetHistory",
            required: true,
        },

        temporaryPasswordEncrypted: {
            type: String,
            default: "",
            select: false,
        },

        temporaryPasswordIv: {
            type: String,
            default: "",
            select: false,
        },

        temporaryPasswordAuthTag: {
            type: String,
            default: "",
            select: false,
        },

        deliveryStatus: {
            type: String,
            enum: ["not_started", "pending", "sent", "failed"],
            default: "not_started",
        },

        deliveryAttempts: {
            type: Number,
            default: 0,
        },

        resendReservationId: {
            type: String,
            default: "",
            select: false,
        },

        passwordUpdatedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// One separate recovery challenge per account and recovery method.
passwordResetChallengeSchema.index(
    { firebaseUid: 1, resetMethod: 1 },
    { unique: true }
);

module.exports = mongoose.model(
    "PasswordResetChallenge",
    passwordResetChallengeSchema
);
