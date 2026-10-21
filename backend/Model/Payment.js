
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        firebaseUid: { type: String, required: true, index: true },
        resumeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Resume",
            required: true,
        },
        resumeName: {
            type: String,
            default: "",
        },
        razorpayOrderId: { type: String, required: true },
        razorpayPaymentId: {
            type: String,
            required: true,
            unique: true,
        },
        amount: { type: Number, required: true, default: 5000 },
        currency: { type: String, required: true, default: "INR" },
        status: {
            type: String,
            enum: ["paid", "failed"],
            default: "paid",
        },
        invoiceNumber: { type: String, required: true, unique: true },
        paidAt: { type: Date, default: Date.now },

    },
    { timestamps: true }
);

paymentSchema.index({ firebaseUid: 1, createdAt: -1 });

module.exports =
    mongoose.models.Payment ||
    mongoose.model("Payment", paymentSchema);
