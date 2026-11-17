
const mongoose = require("mongoose");

const phonePasswordResetChallengeSchema = new mongoose.Schema(
    {
        firebaseUid: {
            type: String,
            required: true,
            index: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        wakitChallengeId: {
            type: String,
            required: true,
            unique: true,
        },
        historyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PasswordResetHistory",
            default: null,
        },
        attempts: {
            type: Number,
            default: 0,
        },
        resendCount: {
            type: Number,
            default: 0,
        },
        lastSentAt: {
            type: Date,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
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
        verifiedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

phonePasswordResetChallengeSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

module.exports =
    mongoose.models.PhonePasswordResetChallenge ||
    mongoose.model(
        "PhonePasswordResetChallenge",
        phonePasswordResetChallengeSchema
    );
