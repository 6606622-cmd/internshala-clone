
const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const Subscription = require("../Subscription");
const SubscriptionPayment = require("../SubscriptionPayment");

const requireFirebaseAuth = require("../../middleware/requireFirebaseAuth");
const requireVerifiedLogin = require("../../middleware/requireVerifiedLogin");
const sendSubscriptionInvoiceEmail = require("../../utils/sendSubscriptionInvoiceEmail");

const router = express.Router();

router.use(requireFirebaseAuth, requireVerifiedLogin);

const CURRENCY = "INR";

const PLANS = {
    bronze: { amount: 10000, limit: 3 },
    silver: { amount: 30000, limit: 5 },
    gold: { amount: 100000, limit: -1 },
};

const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay configuration is missing.");
    }

    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

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

// TEMPORARY TESTING: Allow subscription payments 24/7.
const isPaymentWindowOpen = () => true;

const addOneMonth = (date) => {
    const result = new Date(date);
    const originalDay = result.getUTCDate();

    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + 1);

    const lastDay = new Date(
        Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
    ).getUTCDate();

    result.setUTCDate(Math.min(originalDay, lastDay));

    return result;
};

const safeEqual = (a, b) => {
    if (typeof a !== "string" || typeof b !== "string") return false;

    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");

    return (
        left.length === 32 &&
        right.length === 32 &&
        crypto.timingSafeEqual(left, right)
    );
};

const getOrCreateSubscription = async (firebaseUid) => {
    let subscription = await Subscription.findOne({ firebaseUid });

    if (!subscription) {
        subscription = await Subscription.create({
            firebaseUid,
            plan: "free",
            status: "active",
            monthlyLimit: 1,
            applicationsUsed: 0,
            quotaMonth: getISTMonth(),
        });
    }

    const now = new Date();

    // Apply an expired subscription or a scheduled downgrade.
    if (
        subscription.plan !== "free" &&
        subscription.expiresAt &&
        now >= subscription.expiresAt
    ) {
        const nextPlan = subscription.cancelAtPeriodEnd
            ? "free"
            : subscription.pendingPlan || "free";

        const nextLimit = nextPlan === "free"
            ? 1
            : PLANS[nextPlan]?.limit ?? 1;

        subscription.plan = nextPlan;
        subscription.monthlyLimit = nextLimit;
        subscription.status = "active";
        subscription.startedAt = now;
        subscription.expiresAt = nextPlan === "free"
            ? null
            : addOneMonth(now);
        subscription.cancelAtPeriodEnd = false;
        subscription.pendingPlan = null;
        subscription.applicationsUsed = 0;
        subscription.quotaMonth = getISTMonth();

        await subscription.save();
    }

    // Reset application quota at the beginning of a new IST month.
    const currentMonth = getISTMonth();

    if (subscription.quotaMonth !== currentMonth) {
        subscription.applicationsUsed = 0;
        subscription.quotaMonth = currentMonth;
        await subscription.save();
    }

    return subscription;
};

// GET CURRENT SUBSCRIPTION
router.get("/me", async (req, res) => {
    try {
        const subscription = await getOrCreateSubscription(
            req.firebaseUser.uid
        );

        const remaining =
            subscription.monthlyLimit === -1
                ? -1
                : Math.max(
                    0,
                    subscription.monthlyLimit - subscription.applicationsUsed
                );

        return res.json({
            success: true,
            subscription: {
                plan: subscription.plan,
                status: subscription.status,
                monthlyLimit: subscription.monthlyLimit,
                applicationsUsed: subscription.applicationsUsed,
                remainingApplications: remaining,
                quotaMonth: subscription.quotaMonth,
                startedAt: subscription.startedAt,
                expiresAt: subscription.expiresAt,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                pendingPlan: subscription.pendingPlan,
            },
            plans: {
                free: { amount: 0, limit: 1 },
                bronze: { amount: 100, limit: 3 },
                silver: { amount: 300, limit: 5 },
                gold: { amount: 1000, limit: -1 },
            },
        });
    } catch (error) {
        console.error("SUBSCRIPTION PROFILE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not load subscription.",
        });
    }
});

// CREATE RAZORPAY ORDER
router.post("/create-order", async (req, res) => {
    try {
     // TEMPORARY TESTING: Allow subscription purchases 24/7.
// Original payment time restriction will be restored after testing.
        const { plan } = req.body || {};

        if (!Object.prototype.hasOwnProperty.call(PLANS, plan)) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid paid plan.",
            });
        }

        const uid = req.firebaseUser.uid;
        const email = req.firebaseUser.email;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Your account email is unavailable.",
            });
        }

        const subscription = await getOrCreateSubscription(uid);

        // Do not create a second order for an already active identical plan.
        if (
            subscription.plan === plan &&
            subscription.status === "active" &&
            subscription.expiresAt &&
            subscription.expiresAt > new Date()
        ) {
            return res.status(409).json({
                success: false,
                message: "You already have this active plan.",
            });
        }

        const razorpay = getRazorpay();

        const order = await razorpay.orders.create({
            amount: PLANS[plan].amount,
            currency: CURRENCY,
            receipt: `sub_${crypto.randomBytes(10).toString("hex")}`,
            notes: {
                firebaseUid: uid,
                plan,
                email,
            },
        });

        await SubscriptionPayment.create({
            firebaseUid: uid,
            plan,
            razorpayOrderId: order.id,
            amount: PLANS[plan].amount,
            currency: CURRENCY,
            status: "created",
        });

        return res.json({
            success: true,
            keyId: process.env.RAZORPAY_KEY_ID,
            orderId: order.id,
            amount: PLANS[plan].amount,
            currency: CURRENCY,
            plan,
        });
    } catch (error) {
        console.error("SUBSCRIPTION CREATE ORDER ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not create subscription payment order.",
        });
    }
});

// VERIFY PAYMENT AND ACTIVATE SUBSCRIPTION
router.post("/verify-payment", async (req, res) => {
    try {
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
                message: "Payment details are incomplete.",
            });
        }

        const uid = req.firebaseUser.uid;

        const paymentRecord = await SubscriptionPayment.findOne({
            firebaseUid: uid,
            razorpayOrderId: orderId,
        });

        if (!paymentRecord) {
            return res.status(404).json({
                success: false,
                message: "Subscription payment order not found.",
            });
        }

        if (paymentRecord.status === "paid") {
            return res.status(409).json({
                success: false,
                message: "This payment has already been processed.",
            });
        }

        if (paymentRecord.status !== "created") {
            return res.status(409).json({
                success: false,
                message: "This payment order is no longer active.",
            });
        }

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${orderId}|${paymentId}`)
            .digest("hex");

        if (!safeEqual(expectedSignature, signature)) {
            return res.status(400).json({
                success: false,
                message: "Payment signature verification failed.",
            });
        }

        const razorpay = getRazorpay();

        const [order, payment] = await Promise.all([
            razorpay.orders.fetch(orderId),
            razorpay.payments.fetch(paymentId),
        ]);

        if (
            order.id !== orderId ||
            order.amount !== paymentRecord.amount ||
            order.currency !== CURRENCY ||
            order.notes?.firebaseUid !== uid ||
            order.notes?.plan !== paymentRecord.plan ||
            payment.order_id !== orderId ||
            payment.amount !== paymentRecord.amount ||
            payment.currency !== CURRENCY ||
            payment.status !== "captured" ||
            payment.captured !== true
        ) {
            return res.status(400).json({
                success: false,
                message: "Razorpay could not confirm this payment.",
            });
        }

        // Prevent a payment ID from being reused.
        const duplicatePayment = await SubscriptionPayment.findOne({
            razorpayPaymentId: paymentId,
        });

        if (duplicatePayment) {
            return res.status(409).json({
                success: false,
                message: "This Razorpay payment has already been used.",
            });
        }

        const now = new Date();
        const validUntil = addOneMonth(now);
        const plan = paymentRecord.plan;

        const claimedPayment = await SubscriptionPayment.findOneAndUpdate(
            {
                _id: paymentRecord._id,
                status: "created",
                razorpayPaymentId: { $in: ["", null] },
            },
            {
                $set: {
                    razorpayPaymentId: paymentId,
                    status: "paid",
                    paidAt: now,
                    validFrom: now,
                    validUntil,
                    invoiceNumber:
                        `SUB-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
                },
            },
            { new: true }
        );

        if (!claimedPayment) {
            return res.status(409).json({
                success: false,
                message: "This payment is already being processed.",
            });
        }

        const subscription = await getOrCreateSubscription(uid);

        subscription.plan = plan;
        subscription.status = "active";
        subscription.monthlyLimit = PLANS[plan].limit;
        subscription.applicationsUsed = 0;
        subscription.quotaMonth = getISTMonth(now);
        subscription.startedAt = now;
        subscription.expiresAt = validUntil;
        subscription.cancelAtPeriodEnd = false;
        subscription.pendingPlan = null;
        subscription.lastPaymentId = paymentId;

        await subscription.save();

        // Email failure must not undo a verified, captured payment.
        try {
            await sendSubscriptionInvoiceEmail({
                email: req.firebaseUser.email,
                name: req.firebaseUser.name || "User",
                plan: plan.toUpperCase(),
                amount: paymentRecord.amount / 100,
                transactionId: paymentId,
                invoiceNumber: claimedPayment.invoiceNumber,
                validFrom: now,
                validUntil,
            });
        } catch (mailError) {
            console.error(
                "SUBSCRIPTION INVOICE EMAIL FAILED:",
                mailError.message
            );
        }

        return res.json({
            success: true,
            message: "Payment verified and subscription activated.",
            subscription: {
                plan: subscription.plan,
                monthlyLimit: subscription.monthlyLimit,
                applicationsUsed: subscription.applicationsUsed,
                expiresAt: subscription.expiresAt,
            },
            invoiceNumber: claimedPayment.invoiceNumber,
        });
    } catch (error) {
        console.error("SUBSCRIPTION VERIFY ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message:
                "Payment verification failed. If money was deducted, contact support with your Razorpay payment ID.",
        });
    }
});

// SUBSCRIPTION PAYMENT HISTORY
router.get("/payments", async (req, res) => {
    try {
        const payments = await SubscriptionPayment.find({
            firebaseUid: req.firebaseUser.uid,
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.json({ success: true, payments });
    } catch (error) {
        console.error("SUBSCRIPTION HISTORY ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not load subscription payment history.",
        });
    }
});

// CANCEL AT THE END OF THE CURRENT BILLING PERIOD
router.post("/cancel", async (req, res) => {
    try {
        const subscription = await getOrCreateSubscription(
            req.firebaseUser.uid
        );

        if (
            subscription.plan === "free" ||
            !subscription.expiresAt ||
            subscription.expiresAt <= new Date()
        ) {
            return res.status(400).json({
                success: false,
                message: "There is no active paid subscription to cancel.",
            });
        }

        subscription.cancelAtPeriodEnd = true;
        subscription.pendingPlan = null;

        await subscription.save();

        return res.json({
            success: true,
            message:
                "Cancellation scheduled. Your paid plan remains active until its expiry date.",
            expiresAt: subscription.expiresAt,
        });
    } catch (error) {
        console.error("SUBSCRIPTION CANCEL ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not cancel subscription.",
        });
    }
});

module.exports = router;
