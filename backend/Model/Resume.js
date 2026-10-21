
const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
    {
        firebaseUid: {
            type: String,
            required: true,
            index: true,
        },

        title: {
            type: String,
            default: "My Resume",
            trim: true,
        },

        resumeData: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        templateId: {
            type: String,
            enum: ["classic", "professional", "modern"],
            default: "classic",
        },

        themeColor: {
            type: String,
            default: "#2563eb",
        },

        fontFamily: {
            type: String,
            default: "Arial",
        },

        status: {
            type: String,
            enum: ["draft", "pending", "generated"],
            default: "draft",
        },

        versionNumber: {
            type: Number,
            default: 1,
            min: 1,
        },

        resumeGroupId: {
            type: String,
            default: "",
            index: true,
        },

        isDefault: {
            type: Boolean,
            default: false,
        },

        pdfUrl: {
            type: String,
            default: "",
        },

        pdfFileName: {
            type: String,
            default: "",
        },

        paymentStatus: {
            type: String,
            enum: ["not_required", "pending", "paid", "failed"],
            default: "not_required",
        },

        emailVerifiedAt: {
            type: Date,
            default: null,
        },

        emailVerifiedFingerprint: {
            type: String,
            default: "",
        },

        razorpayOrderId: {
            type: String,
            default: "",
        },

        razorpayPaymentId: {
            type: String,
            default: "",
        },

        invoiceNumber: {
            type: String,
            default: "",
        },

        downloadHistory: [
            {
                downloadedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    { timestamps: true }
);

resumeSchema.index({ firebaseUid: 1, createdAt: -1 });

module.exports =
    mongoose.models.Resume ||
    mongoose.model("Resume", resumeSchema);
