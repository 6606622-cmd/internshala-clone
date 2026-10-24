
const express = require("express");
const mongoose = require("mongoose");
const { getAuth } = require("firebase-admin/auth");
const adminApp = require("../../firebaseAdmin");

const router = express.Router();
const Application = require("../Application");
const Resume = require("../Resume");

// Verify Firebase authentication
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

// Verify admin access
const verifyAdmin = (req, res, next) => {
    if (req.user?.admin !== true) {
        return res.status(403).json({
            success: false,
            message: "Admin access required",
        });
    }

    return next();
};

// Submit an application
router.post("/", verifyUser, async (req, res) => {
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

        // Only allow a user to submit a resume belonging to their account.
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

        return res.status(201).json({
            success: true,
            message: "Application submitted successfully",
            data: saved,
        });
    } catch (error) {
        console.error("Application submission error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to submit application",
        });
    }
});

// Get all applications:
// Normal users see only their own applications.
// Admins can see all applications.

router.get("/", verifyUser, async (req, res) => {
    try {
        const uid = req.user.uid;

        if (!uid) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        console.log("Applications request UID:", uid);

       const applications =
    req.user.admin === true
        ? await Application.find({}).sort({ createdAt: -1 })
        : await Application.find({
              $or: [
                  { firebaseUid: req.user.uid },
                  { "user.uid": req.user.uid },
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



// Get one application:
// Only its owner or an admin can access it.
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


 // Accept or reject an application — admin only
router.put("/:id", verifyUser, verifyAdmin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid application ID",
            });
        }

        const { action } = req.body || {};

        console.log("Application approval request:", {
            applicationId: req.params.id,
            action,
            adminUid: req.user?.uid,
        });

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
                new: true,
                runValidators: true,
            }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                error: "Application not found",
            });
        }

        console.log("Application update result:", {
            id: updated._id.toString(),
            status: updated.status,
        });

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
