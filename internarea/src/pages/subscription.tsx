
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Script from "next/script";
import {
    auth,
} from "@/firebase/firebase";
import {
    ArrowLeft,
    Check,
    Crown,
    CreditCard,
    RefreshCw,
    ShieldCheck,
    CalendarDays,
    XCircle,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";

const API_BASE = "https://internshala-clone-a0st.onrender.com/api";

type PlanName = "free" | "bronze" | "silver" | "gold";

interface Subscription {
    plan: PlanName;
    status: string;
    monthlyLimit: number;
    applicationsUsed: number;
    remainingApplications: number;
    quotaMonth: string;
    startedAt: string | null;
    expiresAt: string | null;
    cancelAtPeriodEnd: boolean;
    pendingPlan: PlanName | null;
}

interface PaymentRecord {
    _id: string;
    plan: PlanName;
    amount: number;
    currency: string;
    status: string;
    razorpayPaymentId?: string;
    invoiceNumber?: string;
    paidAt?: string;
    validFrom?: string;
    validUntil?: string;
    createdAt: string;
}

declare global {
    interface Window {
        Razorpay?: new (options: any) => {
            open: () => void;
            on: (
                event: string,
                callback: (response: any) => void
            ) => void;
        };
    }
}

const plans = [
    {
        id: "free" as PlanName,
        name: "Free",
        price: 0,
        limit: "1 application/month",
        description: "Get started with internship applications.",
        features: [
            "1 internship application per month",
            "Basic profile access",
            "Application tracking",
        ],
    },
    {
        id: "bronze" as PlanName,
        name: "Bronze",
        price: 100,
        limit: "3 applications/month",
        description: "For students starting their internship journey.",
        features: [
            "3 internship applications per month",
            "Application tracking",
            "Monthly quota reset",
        ],
    },
    {
        id: "silver" as PlanName,
        name: "Silver",
        price: 300,
        limit: "5 applications/month",
        description: "For students applying to more opportunities.",
        features: [
            "5 internship applications per month",
            "Application tracking",
            "Monthly quota reset",
        ],
    },
    {
        id: "gold" as PlanName,
        name: "Gold",
        price: 1000,
        limit: "Unlimited applications",
        description: "For students who want maximum flexibility.",
        features: [
            "Unlimited internship applications",
            "Application tracking",
            "No monthly application limit",
        ],
    },
];

const formatDate = (date?: string | null) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

const SubscriptionPage = () => {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [buyingPlan, setBuyingPlan] = useState<PlanName | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error">("error");
    const [razorpayLoaded, setRazorpayLoaded] = useState(false);

    const getHeaders = useCallback(async () => {
        const user = auth.currentUser;

        if (!user) {
            throw new Error("Please sign in to manage your subscription.");
        }

        const token = await user.getIdToken();
        const session = localStorage.getItem("internarea_login_session");

        if (!session) {
            throw new Error("Your login session is missing. Please sign in again.");
        }

        return {
            Authorization: `Bearer ${token}`,
            "x-login-session": session,
        };
    }, []);

    const showMessage = (
        text: string,
        type: "success" | "error" = "error"
    ) => {
        setMessage(text);
        setMessageType(type);
    };

    const loadSubscription = useCallback(async () => {
        try {
            setLoading(true);

            const headers = await getHeaders();

            const [subscriptionResponse, paymentResponse] = await Promise.all([
                axios.get(`${API_BASE}/subscription/me`, { headers }),
                axios.get(`${API_BASE}/subscription/payments`, { headers }),
            ]);

            setSubscription(subscriptionResponse.data.subscription);
            setPayments(paymentResponse.data.payments || []);
        } catch (error: any) {
            console.error("Subscription loading error:", error);

            showMessage(
                error.response?.data?.message ||
                error.message ||
                "Unable to load subscription information."
            );
        } finally {
            setLoading(false);
        }
    }, [getHeaders]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                loadSubscription();
            } else {
                setLoading(false);
                showMessage("Please sign in to view your subscription.");
            }
        });

        return () => unsubscribe();
    }, [loadSubscription]);
    const purchasePlan = async (plan: PlanName) => {
        if (plan === "free") return;

        setMessage("");

        if (!razorpayLoaded || !window.Razorpay) {
            showMessage("Payment service is still loading. Please try again.");
            return;
        }

        try {
            setBuyingPlan(plan);

            const headers = await getHeaders();

            const orderResponse = await axios.post(
                `${API_BASE}/subscription/create-order`,
                { plan },
                { headers }
            );

            const order = orderResponse.data;

            const user = auth.currentUser;

            if (!user?.email) {
                throw new Error("Your account email is unavailable.");
            }

            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: "Internarea",
                description: `${plan.toUpperCase()} Subscription`,
                order_id: order.orderId,
                prefill: {
                    name: user.displayName || "",
                    email: user.email,
                },
                theme: {
                    color: "#2563eb",
                },
                handler: async (response: any) => {
                    try {
                        showMessage("Verifying your payment. Please wait...", "success");

                        const verification = await axios.post(
                            `${API_BASE}/subscription/verify-payment`,
                            {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            },
                            { headers: await getHeaders() }
                        );

                        if (verification.data.success) {
                            showMessage(
                                "Payment successful! Your subscription is now active.",
                                "success"
                            );

                            await loadSubscription();
                        } else {
                            showMessage(
                                verification.data.message || "Payment verification failed."
                            );
                        }
                    } catch (error: any) {
                        showMessage(
                            error.response?.data?.message ||
                            "Payment verification could not be completed. Keep your payment ID for support."
                        );
                    } finally {
                        setBuyingPlan(null);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setBuyingPlan(null);
                        showMessage("Payment window closed. No subscription was activated.");
                    },
                },
            };

            const checkout = new window.Razorpay(options);

            checkout.on("payment.failed", (response: any) => {
                setBuyingPlan(null);
                showMessage(
                    response.error?.description || "Payment failed. Please try again."
                );
            });

            checkout.open();
        } catch (error: any) {
            setBuyingPlan(null);

            showMessage(
                error.response?.data?.message ||
                error.message ||
                "Unable to start payment."
            );
        }
    };

    const cancelSubscription = async () => {
        const confirmed = window.confirm(
            "Schedule cancellation at the end of your current billing period? Your paid plan will remain active until its expiry date."
        );

        if (!confirmed) return;

        try {
            setCancelling(true);
            setMessage("");

            const response = await axios.post(
                `${API_BASE}/subscription/cancel`,
                {},
                { headers: await getHeaders() }
            );

            showMessage(response.data.message, "success");
            await loadSubscription();
        } catch (error: any) {
            showMessage(
                error.response?.data?.message || "Unable to cancel subscription."
            );
        } finally {
            setCancelling(false);
        }
    };

    const currentPlan = plans.find(
        (plan) => plan.id === subscription?.plan
    );

    return (
        <>
            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                strategy="afterInteractive"
                onLoad={() => setRazorpayLoaded(true)}
                onError={() => {
                    setRazorpayLoaded(false);
                    showMessage("Unable to load Razorpay checkout.");
                }}
            />

            <main className="min-h-screen bg-gray-50 px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    <Link
                        href="/profile"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Profile
                    </Link>

                    <div className="mb-8">
                        <div className="flex items-center gap-3">
                            <Crown className="w-8 h-8 text-blue-600" />
                            <h1 className="text-3xl font-bold text-gray-900">
                                Subscription Plans
                            </h1>
                        </div>
                        <p className="text-gray-600 mt-2">
                            Choose a plan that matches your internship application needs.
                        </p>
                    </div>

                    {message && (
                        <div
                            role="status"
                            aria-live="polite"
                            className={`mb-6 rounded-lg p-4 text-sm ${messageType === "success"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                                }`}
                        >
                            {message}
                        </div>
                    )}

                    {loading ? (
                        <div className="bg-white rounded-xl p-10 text-center shadow-sm">
                            <RefreshCw className="w-7 h-7 animate-spin text-blue-600 mx-auto mb-3" />
                            <p className="text-gray-600">Loading subscription details...</p>
                        </div>
                    ) : (
                        <>
                            {/* CURRENT SUBSCRIPTION */}
                            {subscription && (
                                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-10">
                                    <div className="flex flex-wrap justify-between gap-4 items-start">
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                YOUR CURRENT PLAN
                                            </p>
                                            <h2 className="text-2xl font-bold text-gray-900 mt-1 capitalize">
                                                {subscription.plan}
                                            </h2>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {currentPlan?.limit}
                                            </p>
                                        </div>

                                        <span className="rounded-full bg-green-100 text-green-700 px-3 py-1 text-sm font-semibold capitalize">
                                            {subscription.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                                        <div className="rounded-xl bg-blue-50 p-4">
                                            <p className="text-sm text-blue-700">
                                                Applications used
                                            </p>
                                            <p className="text-2xl font-bold text-blue-900 mt-1">
                                                {subscription.applicationsUsed}
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-green-50 p-4">
                                            <p className="text-sm text-green-700">
                                                Applications remaining
                                            </p>
                                            <p className="text-2xl font-bold text-green-900 mt-1">
                                                {subscription.remainingApplications === -1
                                                    ? "Unlimited"
                                                    : subscription.remainingApplications}
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-purple-50 p-4">
                                            <p className="text-sm text-purple-700">
                                                Monthly application limit
                                            </p>
                                            <p className="text-2xl font-bold text-purple-900 mt-1">
                                                {subscription.monthlyLimit === -1
                                                    ? "Unlimited"
                                                    : subscription.monthlyLimit}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-5 mt-5 text-sm text-gray-600">
                                        <span className="inline-flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4" />
                                            Started: {formatDate(subscription.startedAt)}
                                        </span>

                                        <span className="inline-flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4" />
                                            Renewal/expiry: {formatDate(subscription.expiresAt)}
                                        </span>
                                    </div>

                                    {subscription.cancelAtPeriodEnd && (
                                        <div className="mt-5 rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
                                            Your subscription is scheduled to cancel on{" "}
                                            {formatDate(subscription.expiresAt)}.
                                        </div>
                                    )}

                                    {subscription.plan !== "free" &&
                                        !subscription.cancelAtPeriodEnd && (
                                            <button
                                                onClick={cancelSubscription}
                                                disabled={cancelling}
                                                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                {cancelling
                                                    ? "Processing..."
                                                    : "Cancel at period end"}
                                            </button>
                                        )}
                                </section>
                            )}

                            {/* PLAN CARDS */}
                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-gray-900 mb-5">
                                    Choose Your Plan
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                    {plans.map((plan) => {
                                        const isCurrent = subscription?.plan === plan.id;

                                        return (
                                            <div
                                                key={plan.id}
                                                className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${isCurrent
                                                    ? "border-blue-500 ring-2 ring-blue-100"
                                                    : "border-gray-200"
                                                    }`}
                                            >
                                                {isCurrent && (
                                                    <span className="absolute -top-3 left-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                                                        Current Plan
                                                    </span>
                                                )}

                                                <h3 className="text-xl font-bold text-gray-900 mt-2">
                                                    {plan.name}
                                                </h3>

                                                <p className="text-sm text-gray-500 mt-2 min-h-10">
                                                    {plan.description}
                                                </p>

                                                <div className="my-5">
                                                    <span className="text-3xl font-bold text-gray-900">
                                                        ₹{plan.price.toLocaleString("en-IN")}
                                                    </span>
                                                    {plan.price > 0 && (
                                                        <span className="text-sm text-gray-500">
                                                            /month
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="font-semibold text-blue-700 text-sm mb-4">
                                                    {plan.limit}
                                                </p>

                                                <ul className="space-y-3 text-sm text-gray-600 flex-1">
                                                    {plan.features.map((feature) => (
                                                        <li key={feature} className="flex gap-2">
                                                            <Check className="w-4 h-4 text-green-600 shrink-0" />
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>

                                                <button
                                                    type="button"
                                                    disabled={
                                                        isCurrent ||
                                                        plan.id === "free" ||
                                                        buyingPlan !== null ||
                                                        loading
                                                    }
                                                    onClick={() => purchasePlan(plan.id)}
                                                    className={`w-full mt-6 rounded-lg py-3 font-semibold transition-colors ${isCurrent
                                                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                                        : plan.id === "free"
                                                            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                                            : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                                        }`}
                                                >
                                                    {isCurrent
                                                        ? "Current Plan"
                                                        : buyingPlan === plan.id
                                                            ? "Opening payment..."
                                                            : plan.id === "free"
                                                                ? "Free Plan"
                                                                : `Choose ${plan.name}`}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* PAYMENT HISTORY */}
                            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center gap-3 mb-5">
                                    <CreditCard className="w-6 h-6 text-blue-600" />
                                    <h2 className="text-xl font-bold text-gray-900">
                                        Payment History & Invoices
                                    </h2>
                                </div>

                                {payments.length === 0 ? (
                                    <p className="text-sm text-gray-500 py-5">
                                        No subscription payments found.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead>
                                                <tr className="border-b text-gray-500">
                                                    <th className="py-3 pr-4">Plan</th>
                                                    <th className="py-3 pr-4">Amount</th>
                                                    <th className="py-3 pr-4">Date</th>
                                                    <th className="py-3 pr-4">Transaction ID</th>
                                                    <th className="py-3 pr-4">Invoice</th>
                                                    <th className="py-3">Status</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {payments.map((payment) => (
                                                    <tr key={payment._id} className="border-b last:border-0">
                                                        <td className="py-4 pr-4 font-semibold capitalize">
                                                            {payment.plan}
                                                        </td>
                                                        <td className="py-4 pr-4">
                                                            ₹{(payment.amount / 100).toLocaleString("en-IN")}
                                                        </td>
                                                        <td className="py-4 pr-4">
                                                            {formatDate(payment.paidAt || payment.createdAt)}
                                                        </td>
                                                        <td className="py-4 pr-4 break-all">
                                                            {payment.razorpayPaymentId || "—"}
                                                        </td>
                                                        <td className="py-4 pr-4">
                                                            {payment.invoiceNumber || "—"}
                                                        </td>
                                                        <td className="py-4">
                                                            <span
                                                                className={`rounded-full px-2 py-1 text-xs font-semibold ${payment.status === "paid"
                                                                    ? "bg-green-100 text-green-700"
                                                                    : payment.status === "failed"
                                                                        ? "bg-red-100 text-red-700"
                                                                        : "bg-yellow-100 text-yellow-700"
                                                                    }`}
                                                            >
                                                                {payment.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>

                            {/* PAYMENT INFORMATION */}
                            <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                                    <p>
                                        Payments are processed securely through Razorpay. Subscription
                                        purchases are available only between{" "}
                                        <strong>5:00 AM and 11:45 AM IST</strong>. Your subscription
                                        activates only after successful server-side payment
                                        verification.
                                    </p>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </>
    );
};

export default SubscriptionPage;
