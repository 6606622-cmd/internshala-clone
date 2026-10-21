
const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema({
    company: String,
    category: String,
    coverLetter: String,
    user: Object,

    resumeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resume",
        default: null,
    },
    resumeTitle: {
        type: String,
        default: "",
    },
    availability: String,

    createAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ["accepted", "pending", "rejected"],
        default: "pending",
    },
    Application: Object,

    firebaseUid: {
        type: String,
        required: true,
        index: true,
    },

});

module.exports =
    mongoose.models.Application ||
    mongoose.model("Application", ApplicationSchema);
