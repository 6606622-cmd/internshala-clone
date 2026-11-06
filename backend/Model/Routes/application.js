
const express = require("express");
const mongoose = require("mongoose");
const { getAuth } = require("firebase-admin/auth");
const adminApp = require("../../firebaseAdmin");

const Application = require("../Application");
const Resume = require("../Resume");
const Subscription = require("../Subscription");

const requireFirebaseAuth = require("../../middleware/requireFirebaseAuth");
const requireVerifiedLogin = require("../../middleware/requireVerifiedLogin");

const router = express.Router();

// ---------------- IST MONTH HELPER ----------------

const getISTMonth = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
    }).formatToParts(date);

    const year = parts.find((p) => p.type === "year").value;
    const month = parts.find((p) => p.type === "month").value;

    return `${year}-${month}`;
};

// ---------------- SUBSCRIPTION HELPER ----------------

const getOrCreateSubscription = async (firebaseUid) => {
    let subscription = await Subscription.findOne({ firebaseUid });

    if (!subscription) {
        try {
            subscription = await Subscription.create({
                firebaseUid,
                plan: "free",
                status: "active",
                monthlyLimit: 1,
                applicationsUsed: 0,
                quotaMonth: getISTMonth(),
            });
        } catch (error) {
            // Handle two first-time requests attempting to create the same record.
            if (error.code !== 11000) throw error;

            subscription = await Subscription.findOne({ firebaseUid });
        }
    }

    if (!subscription) {
        throw new Error("Could not initialize subscription.");
    }

    const now = new Date();

    // Expire a paid plan or apply a scheduled downgrade.
    if (
        subscription.plan !== "free" &&
        subscription.expiresAt &&
        now >= subscription.expiresAt
    ) {
        const nextPlan = subscription.cancelAtPeriodEnd
            ? "free"
            : subscription.pendingPlan || "free";

        const limits = {
            free: 1,
            bronze: 3,
            silver: 5,
            gold: -1,
        };

        subscription.plan = nextPlan;
        subscription.monthlyLimit = limits[nextPlan] ?? 1;
        subscription.status = "active";
        subscription.startedAt = now;
        subscription.expiresAt =
            nextPlan === "free" ? null : null;
        subscription.cancelAtPeriodEnd = false;
        subscription.pendingPlan = null;
        subscription.applicationsUsed = 0;
        subscription.quotaMonth = getISTMonth(now);

        await subscription.save();
    }

    return subscription;
};

// ---------------- FIREBASE AUTHENTICATION ----------------

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
        console.error(
            "Authentication error:",
            error.code || error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token",
        });
    }
};

// Application submission additionally requires a verified login session.
const verifyApplicationSession = [
    requireFirebaseAuth,
    requireVerifiedLogin,
    (req, res, next) => {
        req.user = req.firebaseUser;
        next();
    },
];

// ---------------- ADMIN AUTHORIZATION ----------------

const verifyAdmin = (req, res, next) => {
    if (req.user?.admin !== true) {
        return res.status(403).json({
            success: false,
            message: "Admin access required",
        });
    }

    return next();
};

// ---------------- SUBMIT APPLICATION ----------------

router.post("/", ...verifyApplicationSession, async (req, res) => {
    let quotaReserved = false;
    let reservedMonth = "";

    try {
        const {
            company,
            category,
            coverLetter,
            Application: jobId,
            resumeId,
            availability,
        } = req.body || {};

        if (
            typeof company !== "string" ||
            !company.trim() ||
            typeof coverLetter !== "string" ||
            !coverLetter.trim() ||
            typeof availability !== "string" ||
            !availability.trim() ||
            !mongoose.isValidObjectId(resumeId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid company, cover letter, availability, and resume are required",
            });
        }

        // Confirm the resume belongs to this user.
        const resume = await Resume.findOne({
            _id: resumeId,
            firebaseUid: req.user.uid,
        });

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: "Selected resume was not found in your account",
            });
        }

        if (resume.status !== "generated" || !resume.pdfUrl) {
            return res.status(409).json({
                success: false,
                message: "Please select a generated resume with a PDF",
            });
        }

        // Ensure the user's subscription record exists and is current.
        await getOrCreateSubscription(req.user.uid);

        const currentMonth = getISTMonth();
        reservedMonth = currentMonth;

        // Atomically reserve one application slot.
        // A new IST month resets the counter to 1.
        // Gold has monthlyLimit = -1 and is unlimited.
        const reservedSubscription = await Subscription.findOneAndUpdate(
            {
                firebaseUid: req.user.uid,
                $expr: {
                    $or: [
                        { $ne: ["$quotaMonth", currentMonth] },
                        { $eq: ["$monthlyLimit", -1] },
                        { $lt: ["$applicationsUsed", "$monthlyLimit"] },
                    ],
                },
            },
            [
                {
                    $set: {
                        quotaMonth: currentMonth,
                        applicationsUsed: {
                            $cond: [
                                { $ne: ["$quotaMonth", currentMonth] },
                                1,
                                { $add: ["$applicationsUsed", 1] },
                            ],
                        },
                    },
                },
            ],
            {
                new: true,
            }
        );

        if (!reservedSubscription) {
            const currentSubscription = await Subscription.findOne({
                firebaseUid: req.user.uid,
            }).lean();

            return res.status(403).json({
                success: false,
                code: "APPLICATION_QUOTA_EXHAUSTED",
                message:
                    "You have reached your monthly application limit. Upgrade your plan to apply for more internships.",
                plan: currentSubscription?.plan || "free",
                monthlyLimit: currentSubscription?.monthlyLimit ?? 1,
                applicationsUsed:
                    currentSubscription?.applicationsUsed ?? 0,
                remainingApplications: 0,
                quotaMonth: currentMonth,
            });
        }

        quotaReserved = true;

        const applicationData = new Application({
            company: company.trim(),
            category:
                typeof category === "string" ? category : "",
            coverLetter: coverLetter.trim(),

            user: {
                uid: req.user.uid,
                email: req.user.email || "",
                name: req.user.name || "",
            },

            firebaseUid: req.user.uid,
            Application: jobId,
            resumeId: resume._id,
            resumeTitle: resume.title || "",
            availability: availability.trim(),
        });

        const saved = await applicationData.save();

        const remaining =
            reservedSubscription.monthlyLimit === -1
                ? -1
                : Math.max(
                    0,
                    reservedSubscription.monthlyLimit -
                        reservedSubscription.applicationsUsed
                );

        return res.status(201).json({
            success: true,
            message: "Application submitted successfully",
            data: saved,
            quota: {
                plan: reservedSubscription.plan,
                monthlyLimit: reservedSubscription.monthlyLimit,
                applicationsUsed:
                    reservedSubscription.applicationsUsed,
                remainingApplications: remaining,
                quotaMonth: currentMonth,
            },
        });
    } catch (error) {
        console.error("Application submission error:", error);

        // Release the reserved slot if the application was not saved.
        if (quotaReserved) {
            try {
                await Subscription.updateOne(
                    {
                        firebaseUid: req.user.uid,
                        quotaMonth: reservedMonth,
                        applicationsUsed: { $gt: 0 },
                    },
                    {
                        $inc: { applicationsUsed: -1 },
                    }
                );
            } catch (rollbackError) {
                console.error(
                    "APPLICATION QUOTA ROLLBACK ERROR:",
                    rollbackError.message
                );
            }
        }

        return res.status(500).json({
            success: false,
            message: "Failed to submit application",
        });
    }
});

// ---------------- GET ALL APPLICATIONS ----------------

router.get("/", verifyUser, async (req, res) => {
    try {
        const uid = req.user.uid;

        if (!uid) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const applications =
            req.user.admin === true
                ? await Application.find({}).sort({ createdAt: -1 })
                : await Application.find({
                    $or: [
                        { firebaseUid: uid },
                        { "user.uid": uid },
                    ],
                }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            applications,
        });
    } catch (error) {
        console.error("Fetch applications error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch applications",
        });
    }
});

// ---------------- GET ONE APPLICATION ----------------

router.get("/:id", verifyUser, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                error: "Invalid application ID",
            });
        }

        const filter = {
            _id: req.params.id,
        };

        if (req.user.admin !== true) {
            filter.$or = [
                { firebaseUid: req.user.uid },
                { "user.uid": req.user.uid },
            ];
        }

        const data = await Application.findOne(filter);

        if (!data) {
            return res.status(404).json({
                error: "Application not found",
            });
        }

        const ownerUid =
            data.firebaseUid || data.user?.uid;

        const resume = data.resumeId && ownerUid
            ? await Resume.findOne({
                _id: data.resumeId,
                firebaseUid: ownerUid,
            })
            : null;

        return res.status(200).json({
            ...data.toObject(),
            resumeTitle:
                resume?.title || data.resumeTitle || "",
            resumePdfUrl: resume?.pdfUrl || null,
        });
    } catch (error) {
        console.error("Get application error:", error);

        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

// ---------------- ADMIN ACCEPT OR REJECT ----------------

router.put("/:id", verifyUser, verifyAdmin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid application ID",
            });
        }

        const { action } = req.body || {};

        if (!["accepted", "rejected"].includes(action)) {
            return res.status(400).json({
                success: false,
                error: "Invalid action. Use accepted or rejected.",
            });
        }

        const updated = await Application.findByIdAndUpdate(
            req.params.id,
            { $set: { status: action } },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                error: "Application not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: `Application ${action} successfully`,
            data: updated,
        });
    } catch (error) {
        console.error("Update application error:", error);

        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

module.exports = router;
