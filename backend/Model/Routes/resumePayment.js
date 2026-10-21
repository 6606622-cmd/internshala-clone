
const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const Razorpay = require("razorpay");
const { getAuth } = require("firebase-admin/auth");
const adminApp = require("../../firebaseAdmin");
const Resume = require("../Resume");
const Application = require("../Application");
const Payment = require("../Payment");


const router = express.Router();
const PRICE_PAISE = 5000; // ₹50
const CURRENCY = "INR";
const OTP_VERIFICATION_WINDOW_MS = 10 * 60 * 1000;
const PDF_DIR = path.join(__dirname, "../../generated-resumes");

const getRazorpay = () => {
    if (
        !process.env.RAZORPAY_KEY_ID ||
        !process.env.RAZORPAY_KEY_SECRET
    ) {
        throw new Error("Razorpay keys are not configured.");
    }

    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

const verifyUser = async (req, res, next) => {
    try {
        const header = req.headers.authorization || "";
        if (!header.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Please sign in first.",
            });
        }

        req.user = await getAuth(adminApp).verifyIdToken(header.slice(7));
        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired login session.",
        });
    }
};

const stableStringify = (value) => {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(",")}]`;
    }

    if (value && typeof value === "object") {
        return `{${Object.keys(value).sort().map(
            (key) =>
                `${JSON.stringify(key)}:${stableStringify(value[key])}`
        ).join(",")}}`;
    }

    return JSON.stringify(value);
};

const getFingerprint = (resume) =>
    crypto.createHash("sha256")
        .update(stableStringify({
            title: resume.title,
            resumeData: resume.resumeData,
            templateId: resume.templateId,
            themeColor: resume.themeColor,
            fontFamily: resume.fontFamily,
            versionNumber: resume.versionNumber,
        }))
        .digest("hex");

const safeEqual = (a, b) => {
    if (typeof a !== "string" || typeof b !== "string") return false;

    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");

    return left.length > 0 &&
        left.length === right.length &&
        crypto.timingSafeEqual(left, right);
};

const makePdf = async (resume) => {
    await fs.promises.mkdir(PDF_DIR, { recursive: true });

    const fileName = `${resume._id}-${crypto.randomBytes(8).toString("hex")}.pdf`;
    const filePath = path.join(PDF_DIR, fileName);
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const output = fs.createWriteStream(filePath);

    await new Promise((resolve, reject) => {
        output.on("finish", resolve);
        output.on("error", reject);
        doc.on("error", reject);
        doc.pipe(output);

        const data = resume.resumeData || {};
        const color = /^#[0-9a-fA-F]{6}$/.test(resume.themeColor || "")
            ? resume.themeColor
            : "#2563eb";

        doc.font("Helvetica-Bold").fontSize(24).fillColor(color)
            .text(String(data.fullName || resume.title || "Resume"));
        doc.moveDown(0.4);

        const contact = [data.email, data.phone, data.location]
            .filter((item) => typeof item === "string" && item.trim())
            .join(" | ");

        if (contact) {
            doc.font("Helvetica").fontSize(9).fillColor("#444444")
                .text(contact);
        }

        const sections = [
            ["Career Objective", "objective"],
            ["Education", "education"],
            ["Skills", "skills"],
            ["Work Experience", "experience"],
            ["Internships", "internships"],
            ["Projects", "projects"],
            ["Certifications", "certifications"],
            ["Achievements", "achievements"],
            ["Languages", "languages"],
            ["Social Links", "socialLinks"],
            ["References", "references"],
        ];

        sections.forEach(([heading, key]) => {
            const value = data[key];
            if (typeof value !== "string" || !value.trim()) return;

            if (doc.y > 700) doc.addPage();

            doc.moveDown(0.8);
            doc.font("Helvetica-Bold").fontSize(12).fillColor(color)
                .text(heading);
            doc.moveDown(0.2);
            doc.font("Helvetica").fontSize(10).fillColor("#222222")
                .text(value.trim(), { lineGap: 2 });
        });

        doc.end();
    });

    return { fileName, filePath };
};

// ---------------- CREATE ₹50 ORDER ----------------

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

        // A paid version can be downloaded again without another charge.
        if (
            resume.status === "generated" &&
            resume.paymentStatus === "paid" &&
            resume.pdfFileName
        ) {
            return res.json({
                success: true,
                alreadyPaid: true,
                message: "This version is already paid.",
            });
        }

        if (resume.status !== "draft") {
            return res.status(409).json({
                success: false,
                message: "Only a draft can be purchased.",
            });
        }

        if (!req.user.email || req.user.email_verified !== true) {
            return res.status(403).json({
                success: false,
                message: "Verify your registered email first.",
            });
        }

        const verifiedAt = resume.emailVerifiedAt
            ? new Date(resume.emailVerifiedAt).getTime()
            : 0;
        const fingerprint = getFingerprint(resume);

        if (
            !verifiedAt ||
            Date.now() - verifiedAt > OTP_VERIFICATION_WINDOW_MS ||
            Date.now() < verifiedAt ||
            resume.emailVerifiedFingerprint !== fingerprint
        ) {
            return res.status(403).json({
                success: false,
                message: "Email OTP verification is missing or expired. Verify again.",
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
                versionNumber: String(resume.versionNumber),
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
        console.error("CREATE ORDER ERROR:", error);
        console.error("ERROR MESSAGE:", error?.message);
        console.error("ERROR STACK:", error?.stack);
        console.error(
            "RAZORPAY RESPONSE:",
            error?.response?.data || error?.error || "No Razorpay response attached"
        );

        return res.status(500).json({
            success: false,
            message: "Could not start payment. Check the backend terminal.",
        });
    }
});

// ---------------- VERIFY PAYMENT AND GENERATE PDF ----------------

router.post("/:id/verify-payment", verifyUser, async (req, res) => {
    try {
        const {
            razorpay_order_id: submittedOrderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
        } = req.body || {};

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
                message: "This version is already generated.",
            });
        }

        // Always use the order ID saved by the backend.
        const savedOrderId = resume.razorpayOrderId;

        if (
            resume.status !== "draft" ||
            resume.paymentStatus !== "pending" ||
            !savedOrderId ||
            submittedOrderId !== savedOrderId ||
            typeof paymentId !== "string" ||
            typeof signature !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment details do not match this resume.",
            });
        }

        const razorpay = getRazorpay();

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${savedOrderId}|${paymentId}`)
            .digest("hex");

        if (!safeEqual(expectedSignature, signature)) {
            return res.status(400).json({
                success: false,
                message: "Payment signature verification failed.",
            });
        }

        // Check payment and order directly with Razorpay.
        const [order, payment] = await Promise.all([
            razorpay.orders.fetch(savedOrderId),
            razorpay.payments.fetch(paymentId),
        ]);

        if (
            order.id !== savedOrderId ||
            order.amount !== PRICE_PAISE ||
            order.currency !== CURRENCY ||
            order.notes?.firebaseUid !== req.user.uid ||
            order.notes?.resumeId !== resume._id.toString() ||
            payment.order_id !== savedOrderId ||
            payment.amount !== PRICE_PAISE ||
            payment.currency !== CURRENCY ||
            payment.status !== "captured" ||
            payment.captured !== true
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment is not confirmed for this resume.",
            });
        }

        // Do not generate a PDF if the content changed after verification.
        if (
            !resume.emailVerifiedAt ||
            Date.now() - new Date(resume.emailVerifiedAt).getTime() >
                OTP_VERIFICATION_WINDOW_MS ||
            resume.emailVerifiedFingerprint !== getFingerprint(resume)
        ) {
            return res.status(409).json({
                success: false,
                message: "Resume verification expired. Please verify again.",
            });
        }

      const { fileName, filePath } = await makePdf(resume);

console.log("PDF DEBUG:", {
    fileName,
    filePath,
    exists: fs.existsSync(filePath),
    expectedDirectory: PDF_DIR,
});

        resume.pdfFileName = fileName;
        resume.pdfUrl = `/api/resume/${resume._id}/download`;
        resume.razorpayPaymentId = paymentId;
        resume.paymentStatus = "paid";
        resume.status = "generated";
        resume.invoiceNumber = `INR-${Date.now()}-${resume._id.toString().slice(-6)}`;
await resume.save();

// Save payment history; avoid duplicate records for the same Razorpay payment.
await Payment.findOneAndUpdate(
    { razorpayPaymentId: paymentId },
    {
        $setOnInsert: {
            firebaseUid: req.user.uid,
            resumeId: resume._id,
            resumeName: resume.title || "Resume",
            razorpayOrderId: savedOrderId,
            razorpayPaymentId: paymentId,
            amount: PRICE_PAISE,
            currency: CURRENCY,
            status: "paid",
            invoiceNumber: resume.invoiceNumber,
            paidAt: new Date(),
        },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
);

        return res.json({
            success: true,
            message: "Payment verified. Your resume PDF is ready.",
            resumeId: resume._id,
            pdfUrl: resume.pdfUrl,
            invoiceNumber: resume.invoiceNumber,
        });
    } catch (error) {
        console.error("Verify payment error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Payment verification or PDF generation failed. Contact support if your payment was deducted.",
        });
    }
});

// ---------------- PAYMENT HISTORY ----------------

router.get("/payments/history", verifyUser, async (req, res) => {
    try {
        const payments = await Payment.find({
            firebaseUid: req.user.uid,
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.json({ success: true, payments });
    } catch (error) {
        console.error("Payment history error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not load payment history.",
        });
    }
});

// ---------------- DOWNLOAD PAYMENT RECEIPT ----------------

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
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Paid receipt not found.",
                });
            }

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="receipt-${payment.invoiceNumber}.pdf"`
            );

            const doc = new PDFDocument({ size: "A4", margin: 50 });

            doc.on("error", (error) => {
                console.error("Receipt PDF error:", error.message);
                if (!res.headersSent) res.status(500).end();
                else res.end();
            });

            doc.pipe(res);

            doc.fontSize(22).text("PAYMENT RECEIPT", { align: "center" });
            doc.moveDown(2);

            doc.fontSize(12);
            doc.text(`Invoice Number: ${payment.invoiceNumber}`);
            doc.text(`Payment ID: ${payment.razorpayPaymentId}`);
            doc.text(`Order ID: ${payment.razorpayOrderId}`);
            doc.text(`Resume: ${payment.resumeName || "Resume"}`);
            doc.text(`Amount: ${payment.currency} ${(payment.amount / 100).toFixed(2)}`);
            doc.text(`Status: ${payment.status.toUpperCase()}`);
            doc.text(
                `Paid At: ${new Date(payment.paidAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                })}`
            );

            doc.moveDown(2);
            doc.text("Thank you for your payment.");

            doc.end();
        } catch (error) {
            console.error("Receipt download error:", error.message);
            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    message: "Could not generate payment receipt.",
                });
            }
            res.end();
        }
    }
);


 // ---------------- DOWNLOAD OR RESTORE A PAID PDF ----------------


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

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: "Paid resume not found.",
            });
        }

        let fileName = resume.pdfFileName
            ? path.basename(resume.pdfFileName)
            : "";

        let filePath = fileName
            ? path.join(PDF_DIR, fileName)
            : "";

        // Check whether the saved PDF actually exists.
        let fileExists = false;

        if (filePath) {
            try {
                await fs.promises.access(filePath, fs.constants.R_OK);
                fileExists = true;
            } catch {
                fileExists = false;
            }
        }

        // If the PDF is missing, regenerate it for this already-paid resume.
        if (!fileExists) {
            console.log(
                "Regenerating missing PDF for paid resume:",
                String(resume._id)
            );

            const generated = await makePdf(resume);

            fileName = generated.fileName;
            filePath = generated.filePath;

            await fs.promises.access(filePath, fs.constants.R_OK);

            resume.pdfFileName = fileName;
            resume.pdfUrl = `/api/resume/${resume._id}/download`;

            await resume.save();
        }

        return res.download(
            filePath,
            `${(resume.title || "Resume").replace(/[<>:"/\\|?*]/g, "_")}.pdf`,
            (error) => {
                if (error) {
                    console.error("Resume download failed:", error.message);

                    if (!res.headersSent) {
                        res.status(500).json({
                            success: false,
                            message: "Unable to send the resume PDF.",
                        });
                    }
                }
            }
        );
    } catch (error) {
        console.error("Resume PDF download/regeneration error:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Could not generate or download the resume PDF.",
            });
        }
    }
});

// ---------------- DOWNLOAD OR RESTORE A PAID PDF ----------------


/* -------- ADMIN DOWNLOAD: APPLICANT'S PAID RESUME -------- */

router.get(
    "/application/:applicationId/download",
    verifyUser,
    async (req, res) => {
        try {
            // Use the same admin verification rule as your application routes.
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

            // Match the resume to the applicant, NOT the admin.
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
                        "Linked paid resume not found. Check the application's resumeId and firebaseUid.",
                });
            }

            let fileName = resume.pdfFileName
                ? path.basename(resume.pdfFileName)
                : "";

            let filePath = fileName
                ? path.join(PDF_DIR, fileName)
                : "";

            let fileExists = false;

            if (filePath) {
                try {
                    await fs.promises.access(filePath, fs.constants.R_OK);
                    fileExists = true;
                } catch {
                    fileExists = false;
                }
            }

            // Restore a missing PDF only for an already-paid resume.
            if (!fileExists) {
                const generated = await makePdf(resume);

                fileName = generated.fileName;
                filePath = generated.filePath;

                await fs.promises.access(filePath, fs.constants.R_OK);

                resume.pdfFileName = fileName;
                resume.pdfUrl = `/api/resume/${resume._id}/download`;
                await resume.save();
            }

            return res.download(
                filePath,
                `${(resume.title || "Resume").replace(/[<>:"/\\|?*]/g, "_")}.pdf`,
                (error) => {
                    if (error) {
                        console.error("Admin resume download error:", error.message);

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
            console.error("Admin applicant resume download error:", error);

            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    message: "Could not download applicant resume.",
                });
            }
        }
    }
);




module.exports = router;