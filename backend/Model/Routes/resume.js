
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { getAuth } = require("firebase-admin/auth");
const adminApp = require("../../firebaseAdmin");
const Resume = require("../Resume");
const Application = require("../Application");
const ResumeDownload = require("../ResumeDownload");


const router = express.Router();



const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const otpStore = new Map();
const otpRequestStore = new Map();
const PRICE_PAISE = 5000; // ₹50
const CURRENCY = "INR";
const OTP_VERIFICATION_WINDOW_MS = 10 * 60 * 1000;
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const Razorpay = require("razorpay");
const PDF_DIR = path.join(__dirname, "../../generated-resumes");

const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay keys are not configured.");
    }

    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

const allowedTemplates = [
    "classic", "professional", "modern", "minimal",
    "corporate", "elegant", "creative", "compact",
    "executive", "student", "technical",
];

const allowedFonts = [
    "Arial", "Calibri", "Georgia", "Verdana", "Inter",
    "Roboto", "Lato", "Open Sans", "Montserrat", "Poppins",
    "Merriweather", "Source Sans 3",
];
const Payment = require("../Payment");


// ---------------- AUTHENTICATION ----------------

const verifyUser = async (req, res, next) => {
    try {
        const header = req.headers.authorization || "";

        if (!header.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const token = header.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is missing",
            });
        }

        req.user = await getAuth(adminApp).verifyIdToken(token);
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token",
        });
    }
};

// ---------------- VALIDATION ----------------

const validResumeBody = (body) => {
    if (
        !body ||
        !body.resumeData ||
        typeof body.resumeData !== "object" ||
        Array.isArray(body.resumeData)
    ) {
        return false;
    }

    if (
        body.templateId !== undefined &&
        !allowedTemplates.includes(body.templateId)
    ) {
        return false;
    }

    if (
        body.fontFamily !== undefined &&
        !allowedFonts.includes(body.fontFamily)
    ) {
        return false;
    }

    if (
        body.themeColor !== undefined &&
        (
            typeof body.themeColor !== "string" ||
            !/^#[0-9a-fA-F]{6}$/.test(body.themeColor)
        )
    ) {
        return false;
    }

    return true;
};

// Sort object keys so the fingerprint is consistent.
const stableStringify = (value) => {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(",")}]`;
    }

    if (value && typeof value === "object") {
        return `{${Object.keys(value)
            .sort()
            .map(
                (key) =>
                    `${JSON.stringify(key)}:${stableStringify(value[key])}`
            )
            .join(",")}}`;
    }

    return JSON.stringify(value);
};

// Fingerprint the exact resume version being verified.
const getResumeFingerprint = (resume) => {
    const content = {
        title: resume.title,
        resumeData: resume.resumeData,
        templateId: resume.templateId,
        themeColor: resume.themeColor,
        fontFamily: resume.fontFamily,
        versionNumber: resume.versionNumber,
    };

    return crypto
        .createHash("sha256")
        .update(stableStringify(content))
        .digest("hex");
};

const makePdf = async (resume) => {
    await fs.promises.mkdir(PDF_DIR, { recursive: true });

    const fileName =
        `${resume._id}-${crypto.randomBytes(8).toString("hex")}.pdf`;
    const filePath = path.join(PDF_DIR, fileName);
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const output = fs.createWriteStream(filePath);

    const data = resume.resumeData?.toObject
        ? resume.resumeData.toObject()
        : resume.resumeData || {};

    const writeText = (label, value) => {
        if (value === undefined || value === null || value === "") return;
        if (doc.y > 720) doc.addPage();
        doc.font("Helvetica-Bold").fontSize(10).text(`${label}: `, {
            continued: true,
        });
        doc.font("Helvetica").fontSize(10).text(String(value));
        doc.moveDown(0.3);
    };

    try {
        await new Promise((resolve, reject) => {
            output.once("finish", resolve);
            output.once("error", reject);
            doc.once("error", reject);

            doc.pipe(output);

            doc.font("Helvetica-Bold")
                .fontSize(22)
                .text(resume.title || "Resume", { align: "center" });

            doc.moveDown();

            // Supports common resume-data fields without assuming a
            // particular frontend form structure.
            const personal = data.personalInfo || data.personal || data.contact || {};

            if (typeof personal === "object" && !Array.isArray(personal)) {
                for (const [key, value] of Object.entries(personal)) {
                    if (typeof value !== "object") {
                        writeText(
                            key.replace(/([A-Z])/g, " $1"),
                            value
                        );
                    }
                }
            }

            const ignoredKeys = [
                "personalInfo",
                "personal",
                "contact",
            ];

            for (const [key, value] of Object.entries(data)) {
                if (ignoredKeys.includes(key)) continue;

                if (value === null || value === undefined || value === "") {
                    continue;
                }

                const heading = key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/[_-]/g, " ")
                    .replace(/\b\w/g, (character) => character.toUpperCase());

                if (Array.isArray(value)) {
                    if (doc.y > 680) doc.addPage();

                    doc.moveDown();
                    doc.font("Helvetica-Bold").fontSize(13).text(heading);
                    doc.moveDown(0.3);

                    for (const item of value) {
                        if (doc.y > 720) doc.addPage();

                        const text = typeof item === "object"
                            ? Object.entries(item || {})
                                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" | ")
                            : String(item);

                        if (text) {
                            doc.font("Helvetica").fontSize(10)
                                .text(`• ${text}`);
                            doc.moveDown(0.2);
                        }
                    }
                } else if (typeof value === "object") {
                    doc.moveDown();
                    doc.font("Helvetica-Bold").fontSize(13).text(heading);
                    doc.moveDown(0.3);

                    for (const [subKey, subValue] of Object.entries(value)) {
                        if (
                            subValue !== null &&
                            subValue !== undefined &&
                            typeof subValue !== "object" &&
                            subValue !== ""
                        ) {
                            writeText(
                                subKey.replace(/([A-Z])/g, " $1"),
                                subValue
                            );
                        }
                    }
                } else {
                    writeText(heading, value);
                }
            }

            doc.end();
        });

        return { fileName, filePath };
    } catch (error) {
        await fs.promises.unlink(filePath).catch(() => { });
        throw error;
    }
};
const clearOtpForUser = (uid) => {
    otpStore.delete(uid);
};

// ---------------- CREATE DRAFT ----------------

router.post("/", verifyUser, async (req, res) => {
    try {
        if (!validResumeBody(req.body)) {
            return res.status(400).json({
                success: false,
                message: "Invalid resume information or design settings",
            });
        }

        const resume = await Resume.create({
            firebaseUid: req.user.uid,
            title:
                typeof req.body.title === "string"
                    ? req.body.title.trim().slice(0, 100) || "My Resume"
                    : "My Resume",
            resumeData: req.body.resumeData,
            templateId: req.body.templateId || "classic",
            themeColor: req.body.themeColor || "#2563eb",
            fontFamily: req.body.fontFamily || "Arial",
            status: "draft",
            paymentStatus: "not_required",
            emailVerifiedAt: null,
            emailVerifiedFingerprint: "",
            resumeGroupId: new mongoose.Types.ObjectId().toString(),
        });

        return res.status(201).json({ success: true, resume });
    } catch (error) {
        console.error("Create resume error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to save resume draft",
        });
    }
});

// ---------------- LIST RESUMES ----------------

router.get("/", verifyUser, async (req, res) => {
    try {
        const resumes = await Resume.find({
            firebaseUid: req.user.uid,
        }).sort({ updatedAt: -1 });

        return res.json({ success: true, resumes });
    } catch (error) {
        console.error("List resumes error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to get resumes",
        });
    }
});

// ---------------- EDIT DRAFT ----------------

router.put("/:id", verifyUser, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid resume ID",
            });
        }

        if (!validResumeBody(req.body)) {
            return res.status(400).json({
                success: false,
                message: "Invalid resume information or design settings",
            });
        }

        const resume = await Resume.findOne({
            _id: req.params.id,
            firebaseUid: req.user.uid,
        });

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: "Resume not found",
            });
        }

        if (resume.status !== "draft") {
            return res.status(409).json({
                success: false,
                message: "Only draft resumes can be edited",
            });
        }

        resume.title =
            typeof req.body.title === "string"
                ? req.body.title.trim().slice(0, 100) || "My Resume"
                : resume.title;

        resume.resumeData = req.body.resumeData;
        resume.templateId = req.body.templateId || resume.templateId;
        resume.themeColor = req.body.themeColor || resume.themeColor;
        resume.fontFamily = req.body.fontFamily || resume.fontFamily;

        // Any content change invalidates prior email verification.
        resume.emailVerifiedAt = null;
        resume.emailVerifiedFingerprint = "";

        // Draft edits must not retain old payment references.
        resume.paymentStatus = "not_required";
        resume.razorpayOrderId = "";
        resume.razorpayPaymentId = "";

        clearOtpForUser(req.user.uid);

        await resume.save();

        return res.json({ success: true, resume });
    } catch (error) {
        console.error("Update resume error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to update resume",
        });
    }
});

// ---------------- CREATE NEW VERSION ----------------

router.post("/:id/version", verifyUser, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid resume ID",
            });
        }

        const original = await Resume.findOne({
            _id: req.params.id,
            firebaseUid: req.user.uid,
        });

        if (!original) {
            return res.status(404).json({
                success: false,
                message: "Resume not found",
            });
        }

        const groupId =
            original.resumeGroupId || original._id.toString();

        if (!original.resumeGroupId) {
            original.resumeGroupId = groupId;
            await original.save();
        }

        const latest = await Resume.findOne({
            firebaseUid: req.user.uid,
            resumeGroupId: groupId,
        }).sort({ versionNumber: -1 });

        const version = await Resume.create({
            firebaseUid: req.user.uid,
            title: original.title,
            resumeData: original.resumeData.toObject
                ? original.resumeData.toObject()
                : original.resumeData,
            templateId: original.templateId,
            themeColor: original.themeColor,
            fontFamily: original.fontFamily,
            status: "draft",
            paymentStatus: "not_required",
            emailVerifiedAt: null,
            emailVerifiedFingerprint: "",
            versionNumber: (latest?.versionNumber || 1) + 1,
            resumeGroupId: groupId,
        });

        clearOtpForUser(req.user.uid);

        return res.status(201).json({
            success: true,
            resume: version,
        });
    } catch (error) {
        console.error("Create resume version error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to create resume version",
        });
    }
});

// ---------------- SET DEFAULT RESUME ----------------

router.patch("/:id/default", verifyUser, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid resume ID",
            });
        }

        const resume = await Resume.findOne({
            _id: req.params.id,
            firebaseUid: req.user.uid,
        });

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: "Resume not found",
            });
        }

        if (
            resume.status !== "generated" ||
            resume.paymentStatus !== "paid" ||
            !resume.pdfUrl
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Only a successfully paid and generated resume can be the default",
            });
        }

        await Resume.updateMany(
            { firebaseUid: req.user.uid },
            { $set: { isDefault: false } }
        );

        resume.isDefault = true;
        await resume.save();

        return res.json({
            success: true,
            message: "Default resume updated",
            resume,
        });
    } catch (error) {
        console.error("Set default resume error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to set default resume",
        });
    }
});

// ---------------- REQUEST RESUME OTP ----------------

router.post("/request-otp", verifyUser, async (req, res) => {
    const uid = req.user.uid;

    try {
        const { resumeId } = req.body || {};

        if (!mongoose.isValidObjectId(resumeId)) {
            return res.status(400).json({
                success: false,
                message: "Valid resume ID is required",
            });
        }

        const resume = await Resume.findOne({
            _id: resumeId,
            firebaseUid: req.user.uid
        });

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: "Resume not found",
            });
        }

        if (resume.status !== "draft") {
            return res.status(409).json({
                success: false,
                message: "Only draft resumes can start verification",
            });
        }

        const email = req.user.email;

        if (!email || typeof email !== "string") {
            return res.status(400).json({
                success: false,
                message: "No registered email found for this account",
            });
        }

        if (
            !process.env.BREVO_API_KEY ||
            !process.env.BREVO_SENDER_EMAIL
        ) {
            return res.status(500).json({
                success: false,
                message: "Email service is not configured",
            });
        }
        const now = Date.now();
        const lastRequestedAt = otpRequestStore.get(uid);

        if (
            lastRequestedAt &&
            now - lastRequestedAt < OTP_RESEND_MS
        ) {
            const waitSeconds = Math.ceil(
                (OTP_RESEND_MS - (now - lastRequestedAt)) / 1000
            );

            return res.status(429).json({
                success: false,
                message: `Please wait ${waitSeconds} seconds before requesting another OTP`,
            });
        }

        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");

        // Invalidate any earlier challenge before issuing a new one.
        clearOtpForUser(uid);

       const brevoResponse = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
        method: "POST",
        headers: {
            "accept": "application/json",
            "api-key": process.env.BREVO_API_KEY,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            sender: {
                name: "Internarea",
                email: process.env.BREVO_SENDER_EMAIL,
            },
            to: [
                {
                    email: email,
                },
            ],
            subject: "Internarea - Resume Verification",
            textContent:
                `Your resume verification code is ${otp}. ` +
                "It expires in 5 minutes. If you did not request this code, ignore this email.",
        }),
        signal: AbortSignal.timeout(15000),
    }
);

if (!brevoResponse.ok) {
    const errorDetails = await brevoResponse.text();

    console.error(
        "Brevo resume OTP email failed:",
        brevoResponse.status,
        errorDetails
    );

    throw new Error(
        `Brevo email request failed with status ${brevoResponse.status}`
    );
}

        const currentResume = await Resume.findOne({
            _id: resumeId,
            firebaseUid: req.user.uid,
            status: "draft",
        });

        if (!currentResume) {
            return res.status(409).json({
                success: false,
                message: "Resume changed. Please try again.",
            });
        }

        otpRequestStore.set(uid, Date.now());

        otpStore.set(uid, {
            resumeId: currentResume._id.toString(),
            otpHash,
            fingerprint: getResumeFingerprint(currentResume),
            expiresAt: Date.now() + OTP_EXPIRY_MS,
            attempts: 0,
        });

        return res.json({
            success: true,
            message: "Resume verification OTP sent successfully",
        });
    } catch (error) {
        clearOtpForUser(uid);

        console.error("========== RESUME OTP ERROR ==========");
        console.error(error);
        console.error(error?.stack);
        console.error("======================================");

        return res.status(500).json({
            success: false,
            message: "Failed to send resume verification OTP",
        });
    }
});

// ---------------- VERIFY RESUME OTP ----------------

router.post("/verify-otp", verifyUser, async (req, res) => {
    const uid = req.user.uid;

    try {
        const { resumeId, otp } = req.body || {};

        if (!mongoose.isValidObjectId(resumeId)) {
            return res.status(400).json({
                success: false,
                message: "Valid resume ID is required",
            });
        }

        if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid six-digit OTP",
            });
        }

        const stored = otpStore.get(uid);

        if (!stored || stored.resumeId !== resumeId) {
            return res.status(400).json({
                success: false,
                message: "OTP not found for this resume. Request a new OTP.",
            });
        }

        if (Date.now() >= stored.expiresAt) {
            clearOtpForUser(uid);

            return res.status(400).json({
                success: false,
                message: "OTP expired. Request a new one.",
            });
        }

        if (stored.attempts >= OTP_MAX_ATTEMPTS) {
            clearOtpForUser(uid);

            return res.status(429).json({
                success: false,
                message: "Too many attempts. Request a new OTP.",
            });
        }

        const suppliedHash = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");

        const hashesMatch = crypto.timingSafeEqual(
            Buffer.from(suppliedHash, "hex"),
            Buffer.from(stored.otpHash, "hex")
        );

        if (!hashesMatch) {
            stored.attempts += 1;

            if (stored.attempts >= OTP_MAX_ATTEMPTS) {
                clearOtpForUser(uid);

                return res.status(429).json({
                    success: false,
                    message: "Too many attempts. Request a new OTP.",
                });
            }

            return res.status(400).json({
                success: false,
                message: "Incorrect OTP",
                attemptsRemaining: OTP_MAX_ATTEMPTS - stored.attempts,
            });
        }

        const resume = await Resume.findOne({
            _id: resumeId,
            firebaseUid: req.user.uid,
            status: "draft",
        });

        if (!resume) {
            clearOtpForUser(uid);

            return res.status(404).json({
                success: false,
                message: "Resume not found or no longer editable",
            });
        }

        const currentFingerprint = getResumeFingerprint(resume);

        if (currentFingerprint !== stored.fingerprint) {
            clearOtpForUser(uid);

            return res.status(409).json({
                success: false,
                message: "Resume changed after OTP was requested. Request a new OTP.",
            });
        }

        resume.emailVerifiedAt = new Date();
        resume.emailVerifiedFingerprint = currentFingerprint;
        await resume.save();

        clearOtpForUser(uid);

        return res.json({
            success: true,
            verified: true,
            resumeId,
            message: "Resume email verification successful",
        });
    } catch (error) {
        console.error("Resume OTP verification error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to verify resume OTP",
        });
    }
});

// ---------------- CREATE RAZORPAY ORDER ----------------

router.post("/:id/create-order", verifyUser, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid resume ID.",
            });
        }

        const resume = await Resume.findOne({
            _id: req.params.id,
            firebaseUid: req.user.uid,
        });

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: "Resume not found.",
            });
        }

        if (
            resume.status === "generated" &&
            resume.paymentStatus === "paid" &&
            resume.pdfFileName
        ) {
            return res.json({
                success: true,
                alreadyPaid: true,
                downloadUrl: resume.pdfUrl,
                message: "This resume version has already been paid for.",
            });
        }

        if (resume.status !== "draft") {
            return res.status(409).json({
                success: false,
                message: "Only draft resumes can be purchased.",
            });
        }

        if (!req.user.email || typeof req.user.email !== "string") {
            return res.status(400).json({
                success: false,
                message: "No registered email found for this account.",
            });
        }

        const verifiedAt = resume.emailVerifiedAt
            ? new Date(resume.emailVerifiedAt).getTime()
            : 0;

        const fingerprint = getResumeFingerprint(resume);

        if (
            !verifiedAt ||
            Date.now() - verifiedAt > OTP_VERIFICATION_WINDOW_MS ||
            Date.now() < verifiedAt ||
            resume.emailVerifiedFingerprint !== fingerprint
        ) {
            return res.status(403).json({
                success: false,
                message: "Email verification is missing or expired. Verify again.",
            });
        }

        const razorpay = getRazorpay();

        const order = await razorpay.orders.create({
            amount: PRICE_PAISE,
            currency: CURRENCY,
            receipt: `resume_${resume._id}_${Date.now()}`,
            notes: {
                firebaseUid: req.user.uid,
                resumeId: resume._id.toString(),
                versionNumber: String(resume.versionNumber || 1),
            },
        });

        resume.razorpayOrderId = order.id;
        resume.razorpayPaymentId = "";
        resume.paymentStatus = "pending";
        await resume.save();

        return res.json({
            success: true,
            keyId: process.env.RAZORPAY_KEY_ID,
            orderId: order.id,
            amount: PRICE_PAISE,
            currency: CURRENCY,
        });
    } catch (error) {
        console.error("Create Razorpay order error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not create payment order.",
        });
    }
});


// ---------------- VERIFY RAZORPAY PAYMENT ----------------

router.post("/:id/verify-payment", verifyUser, async (req, res) => {
    let generatedFilePath = null;

    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid resume ID.",
            });
        }

        const {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
        } = req.body || {};

        if (
            typeof orderId !== "string" ||
            typeof paymentId !== "string" ||
            typeof signature !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment verification details are missing.",
            });
        }

        const resume = await Resume.findOne({
            _id: req.params.id,
            firebaseUid: req.user.uid,
        });

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: "Resume not found.",
            });
        }

        // A completed payment should never be charged again.
        if (
            resume.status === "generated" &&
            resume.paymentStatus === "paid" &&
            resume.razorpayPaymentId === paymentId &&
            resume.pdfFileName
        ) {
            return res.json({
                success: true,
                alreadyPaid: true,
                downloadUrl: resume.pdfUrl,
                message: "Payment was already verified.",
            });
        }

        if (
            resume.status !== "draft" ||
            resume.paymentStatus !== "pending" ||
            resume.razorpayOrderId !== orderId
        ) {
            return res.status(409).json({
                success: false,
                message: "Payment order does not match this resume.",
            });
        }

        const verifiedAt = resume.emailVerifiedAt
            ? new Date(resume.emailVerifiedAt).getTime()
            : 0;

        if (
            !verifiedAt ||
            Date.now() - verifiedAt > OTP_VERIFICATION_WINDOW_MS ||
            Date.now() < verifiedAt ||
            resume.emailVerifiedFingerprint !== getResumeFingerprint(resume)
        ) {
            return res.status(403).json({
                success: false,
                message: "Resume verification has expired or the resume changed.",
            });
        }

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
            .update(`${orderId}|${paymentId}`)
            .digest("hex");

        const signatureBuffer = Buffer.from(signature, "hex");
        const expectedBuffer = Buffer.from(expectedSignature, "hex");

        if (
            !process.env.RAZORPAY_KEY_SECRET ||
            signatureBuffer.length !== expectedBuffer.length ||
            signatureBuffer.length === 0 ||
            !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment signature verification failed.",
            });
        }

        // Verify payment status directly with Razorpay, not just the browser.
        const razorpay = getRazorpay();
        const order = await razorpay.orders.fetch(orderId);
        const payment = await razorpay.payments.fetch(paymentId);

        if (
            order.id !== resume.razorpayOrderId ||
            order.amount !== PRICE_PAISE ||
            order.currency !== CURRENCY ||
            order.notes?.firebaseUid !== req.user.uid ||
            order.notes?.resumeId !== resume._id.toString()
        ) {
            return res.status(400).json({
                success: false,
                message: "Razorpay order details do not match.",
            });
        }

        if (
            payment.order_id !== orderId ||
            payment.amount !== PRICE_PAISE ||
            payment.currency !== CURRENCY ||
            payment.status !== "captured"
        ) {
            return res.status(400).json({
                success: false,
                message: "Razorpay payment is not captured or has invalid details.",
            });
        }

        // Do not let the same Razorpay payment be attached to another account
        // or another resume.
        const existingPayment = await Payment.findOne({
            razorpayPaymentId: paymentId,
        });

        if (existingPayment) {
            if (
                existingPayment.firebaseUid !== req.user.uid ||
                String(existingPayment.resumeId) !== String(resume._id)
            ) {
                return res.status(409).json({
                    success: false,
                    message: "This payment has already been used.",
                });
            }

            return res.status(409).json({
                success: false,
                message: "Payment record already exists. Check payment history.",
            });
        }

        const { fileName, filePath } = await makePdf(resume);
        generatedFilePath = filePath;

        const invoiceNumber =
            `INR-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        // Save the verified payment and invoice details.
        await Payment.create({
            firebaseUid: req.user.uid,
            resumeId: resume._id,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            amount: payment.amount,
            currency: payment.currency,
            status: "paid",
            invoiceNumber,
            paidAt: new Date(),
        });

        resume.pdfFileName = fileName;
        resume.pdfUrl = `/api/resume/${resume._id}/download`;
        resume.razorpayPaymentId = paymentId;
        resume.paymentStatus = "paid";
        resume.status = "generated";
        resume.invoiceNumber = invoiceNumber;

        await resume.save();

        return res.json({
            success: true,
            message: "Payment verified and resume generated.",
            resumeId: resume._id,
            downloadUrl: resume.pdfUrl,
            invoiceNumber,
            paymentId,
        });
    } catch (error) {
        if (generatedFilePath) {
            await fs.promises.unlink(generatedFilePath).catch(() => { });
        }

        console.error("Verify Razorpay payment error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not complete payment verification. Check payment status before retrying.",
        });
    }
});


/* -------- ADMIN: DOWNLOAD AN APPLICANT'S PAID RESUME -------- */

router.get(
    "/application/:applicationId/download",
    verifyUser,
    async (req, res) => {
        try {
            // Only authenticated admins may use this route.
            if (req.user.admin !== true) {
                return res.status(403).json({
                    success: false,
                    message: "Admin access required.",
                });
            }

            const { applicationId } = req.params;

            if (!mongoose.isValidObjectId(applicationId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid application ID.",
                });
            }

            // Find the application the admin is viewing.
            const application = await Application.findById(applicationId);

            if (
                !application ||
                !application.resumeId ||
                !application.firebaseUid
            ) {
                return res.status(404).json({
                    success: false,
                    message: "Application or linked resume not found.",
                });
            }

            // Verify the resume belongs to THIS applicant,
            // not to the currently logged-in admin.
            const resume = await Resume.findOne({
                _id: application.resumeId,
                firebaseUid: application.firebaseUid,
                status: "generated",
                paymentStatus: "paid",
            });

            if (!resume) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Paid resume not found for this application. Check its resume ID and applicant UID.",
                });
            }

            let fileName = resume.pdfFileName
                ? path.basename(resume.pdfFileName)
                : "";

            let filePath = fileName
                ? path.join(PDF_DIR, fileName)
                : "";

            // Check whether the generated PDF still exists.
            let fileExists = false;

            if (filePath) {
                try {
                    await fs.promises.access(filePath, fs.constants.R_OK);
                    fileExists = true;
                } catch {
                    fileExists = false;
                }
            }

            // Regenerate the PDF if necessary. The resume must
            // already have a verified paid status.
            if (!fileExists) {
                const generated = await makePdf(resume);

                fileName = generated.fileName;
                filePath = generated.filePath;

                resume.pdfFileName = fileName;
                resume.pdfUrl = `/api/resume/${resume._id}/download`;
                await resume.save();
            }

            return res.download(
                filePath,
                `${(resume.title || "Resume").replace(/[<>:"/\\|?*]/g, "_")}.pdf`,
                (error) => {
                    if (error) {
                        console.error(
                            "Admin resume download error:",
                            error.message
                        );

                        if (!res.headersSent) {
                            res.status(500).json({
                                success: false,
                                message: "Unable to download applicant resume.",
                            });
                        }
                    }
                }
            );
        } catch (error) {
            console.error(
                "Admin applicant resume download error:",
                error.message
            );

            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    message: "Could not download applicant resume.",
                });
            }
        }
    }
);



// ---------------- DOWNLOAD GENERATED RESUME ----------------




router.get("/:id/download", verifyUser, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid resume ID.",
            });
        }

        const resume = await Resume.findOne({
            _id: req.params.id,
            firebaseUid: req.user.uid,
            status: "generated",
            paymentStatus: "paid",
        });

        if (!resume || !resume.pdfFileName) {
            return res.status(403).json({
                success: false,
                message: "A paid, generated PDF is required before downloading.",
            });
        }

        const fileName = path.basename(resume.pdfFileName);
        const filePath = path.join(PDF_DIR, fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: "PDF file not found. Please contact support.",
            });
        }

        res.download(filePath, `${resume.title || "Resume"}.pdf`, async (error) => {
            if (error) {
                console.error("Resume file transfer failed:", error.message);

                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: "Could not download the resume.",
                    });
                }
                return;
            }

            try {
                await ResumeDownload.create({
                    resumeId: resume._id,
                    userId: req.user.uid,
                    downloadedAt: new Date(),
                });
            } catch (logError) {
                console.error("Could not save resume download history:", logError);
            }
        });
    } catch (error) {
        console.error("Download resume error:", error.message);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Could not download the resume.",
            });
        }
    }
});

// ---------------- PAYMENT HISTORY ----------------

router.get("/payments/history", verifyUser, async (req, res) => {
    try {
        const payments = await Payment.find({
            firebaseUid: req.user.uid,
            status: "paid",
        })
            .sort({ paidAt: -1 })
            .lean();

        return res.json({
            success: true,
            payments: payments.map((payment) => ({
                id: payment._id,
                resumeId: payment.resumeId,
                amount: payment.amount,
                currency: payment.currency,
                status: payment.status,
                invoiceNumber: payment.invoiceNumber,
                paymentId: payment.razorpayPaymentId,
                paidAt: payment.paidAt,
            })),
        });
    } catch (error) {
        console.error("Payment history error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not load payment history.",
        });
    }
});

// ---------------- INVOICE DETAILS ----------------

router.get(
    "/payments/:paymentId/invoice",
    verifyUser,
    async (req, res) => {
        try {
            const { paymentId } = req.params;

            if (!mongoose.isValidObjectId(paymentId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment ID.",
                });
            }

            const payment = await Payment.findOne({
                _id: paymentId,
                firebaseUid: req.user.uid,
                status: "paid",
            }).lean();

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Payment or invoice not found.",
                });
            }

            return res.json({
                success: true,
                invoice: {
                    invoiceNumber: payment.invoiceNumber,
                    paymentId: payment.razorpayPaymentId,
                    orderId: payment.razorpayOrderId,
                    amount: payment.amount,
                    currency: payment.currency,
                    status: payment.status,
                    paidAt: payment.paidAt,
                    resumeId: payment.resumeId,
                },
            });
        } catch (error) {
            console.error("Invoice lookup error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Could not retrieve invoice details.",
            });
        }
    }
);

// ---------------- DOWNLOAD INVOICE PDF ----------------

router.get(
    "/payments/:paymentId/invoice/download",
    verifyUser,
    async (req, res) => {
        try {
            const { paymentId } = req.params;

            if (!mongoose.isValidObjectId(paymentId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment ID.",
                });
            }

            const payment = await Payment.findOne({
                _id: paymentId,
                firebaseUid: req.user.uid,
                status: "paid",
            }).lean();

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Paid invoice not found.",
                });
            }

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${payment.invoiceNumber}.pdf"`
            );

            const doc = new PDFDocument({
                size: "A4",
                margin: 50,
            });

            doc.on("error", (error) => {
                console.error("Invoice PDF stream error:", error.message);
                if (!res.headersSent) {
                    res.status(500).end("Could not generate invoice PDF.");
                } else {
                    res.end();
                }
            });

            doc.pipe(res);

            doc.fontSize(22).font("Helvetica-Bold")
                .text("InternArea - Payment Invoice");

            doc.moveDown();
            doc.fontSize(11).font("Helvetica")
                .text(`Invoice number: ${payment.invoiceNumber}`)
                .text(`Payment status: ${payment.status}`)
                .text(`Payment ID: ${payment.razorpayPaymentId}`)
                .text(`Order ID: ${payment.razorpayOrderId}`)
                .text(`Resume ID: ${payment.resumeId}`)
                .text(`Amount: ${payment.currency} ${(payment.amount / 100).toFixed(2)}`)
                .text(
                    `Paid on: ${payment.paidAt
                        ? new Date(payment.paidAt).toLocaleString("en-IN")
                        : "Not available"
                    }`
                );

            doc.moveDown();
            doc.fontSize(9).fillColor("gray")
                .text("This invoice records the payment details stored by InternArea.");

            doc.end();
        } catch (error) {
            console.error("Invoice PDF error:", error.message);

            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    message: "Could not generate invoice PDF.",
                });
            }

            return res.end();
        }
    }
);

module.exports = router;