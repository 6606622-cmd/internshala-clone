
const mongoose = require("mongoose");

const passwordResetChallengeSchema = new mongoose.Schema(
    {
        firebaseUid: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        email: {
            type: String,
            default: "",
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
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "PasswordResetChallenge",
    passwordResetChallengeSchema
);
