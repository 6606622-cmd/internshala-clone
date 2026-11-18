
import React, { useEffect, useState } from "react";
import { selectuser } from "@/Feature/Userslice";
import { auth } from "@/firebase/firebase";
import {
  EmailAuthProvider,
  linkWithCredential,
} from "firebase/auth";
import {
  ExternalLink,
  Mail,
  User,
  LockKeyhole,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Tablet,
  ShieldCheck,
  LogOut,
  RefreshCw,
  Crown,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useSelector } from "react-redux";

type Msg91Callback = (data: any) => void;

declare global {
  interface Window {
    initSendOTP?: (configuration: any) => void;

    sendOtp?: (
      identifier: string,
      success: Msg91Callback,
      failure: Msg91Callback
    ) => void;

    retryOtp?: (
      channel: string | null,
      success: Msg91Callback,
      failure: Msg91Callback,
      reqId?: string
    ) => void;

    verifyOtp?: (
      otp: string,
      success: Msg91Callback,
      failure: Msg91Callback,
      reqId?: string
    ) => void;
  }
}

const API_BASE =
  "https://internshala-clone-a0st.onrender.com/api";

interface LoginSession {
  sessionId: string;
  browser?: string;
  operatingSystem?: string;
  deviceType?: string;
  deviceModel?: string;
  ipAddress?: string;
  verifiedAt?: string;
  lastSeenAt?: string;
}

const Index = () => {
  const user = useSelector(selectuser);
  const currentUser = auth.currentUser;

  const hasPasswordProvider =
    currentUser?.providerData.some(
      (provider) => provider.providerId === "password"
    ) ?? false;

  // Password setup
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "error"
  );

  // Login sessions
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const [sessionError, setSessionError] = useState(false);
  const [revokingSession, setRevokingSession] = useState("");

  // Contact mobile number
  const [contactPhoneNumber, setContactPhoneNumber] = useState("");
  const [savedContactPhoneNumber, setSavedContactPhoneNumber] = useState("");
  const [contactPhoneVerified, setContactPhoneVerified] = useState(false);

  // MSG91 verification
  const [msg91Ready, setMsg91Ready] = useState(false);
  const [contactOtpReqId, setContactOtpReqId] = useState("");
  const [contactVerificationSessionId, setContactVerificationSessionId] =
    useState("");
  const [contactOtp, setContactOtp] = useState("");
  const [contactOtpSent, setContactOtpSent] = useState(false);
  const [contactOtpLoading, setContactOtpLoading] = useState(false);
  const [contactOtpMessage, setContactOtpMessage] = useState("");
  const [contactOtpSuccess, setContactOtpSuccess] = useState(false);

  // Normalize Indian mobile numbers
  const normalizePhoneNumber = (value: string) => {
    let phone = value.trim().replace(/[\s()-]/g, "");

    if (/^\d{10}$/.test(phone)) {
      phone = "+91" + phone;
    } else if (/^91\d{10}$/.test(phone)) {
      phone = "+" + phone;
    }

    return phone;
  };

  const isValidPhoneNumber = (phone: string) =>
    /^\+[1-9]\d{7,14}$/.test(phone);

  const normalizedPhone = normalizePhoneNumber(contactPhoneNumber);

  const isCurrentNumberVerified =
    contactPhoneVerified &&
    normalizedPhone === savedContactPhoneNumber;

  // Authentication headers for login-session APIs
  const getSessionAuthHeaders = async () => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      throw new Error("Please sign in again.");
    }

    const idToken = await firebaseUser.getIdToken(true);

    const sessionToken = localStorage.getItem(
      "internarea_login_session"
    );

    if (!sessionToken) {
      throw new Error(
        "Login session token is missing. Please log out and log in again."
      );
    }

    return {
      Authorization: `Bearer ${idToken}`,
      "x-login-session": sessionToken,
    };
  };

  // Load saved contact number
  const loadContactPhone = async () => {
    try {
      const firebaseUser = auth.currentUser;

      if (!firebaseUser) return;

      const idToken = await firebaseUser.getIdToken();

      const response = await axios.get(
        `${API_BASE}/forgot-password/phone/contact`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const phone = response.data.contactPhoneNumber || "";

      setContactPhoneNumber(phone);
      setSavedContactPhoneNumber(phone);
      setContactPhoneVerified(
        response.data.contactPhoneVerified === true
      );
    } catch (error) {
      console.error("Unable to load contact number:", error);
    }
  };

  // Load active devices
  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      setSessionMessage("");
      setSessionError(false);

      const headers = await getSessionAuthHeaders();

      const response = await axios.get(
        `${API_BASE}/login-security/sessions`,
        { headers }
      );

      setSessions(response.data.sessions || []);
      setCurrentSessionId(response.data.currentSessionId || "");
    } catch (error: any) {
      console.error("Unable to load sessions:", error);

      setSessionError(true);
      setSessionMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to load active devices."
      );
    } finally {
      setSessionsLoading(false);
    }
  };

  // Load account information
  useEffect(() => {
    if (currentUser) {
      void loadSessions();
      void loadContactPhone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

// Initialize MSG91 Widget
useEffect(() => {
  const widgetId = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID;
  const tokenAuth = process.env.NEXT_PUBLIC_MSG91_WIDGET_TOKEN;

  if (!widgetId || !tokenAuth) {
    console.error("MSG91 Widget frontend configuration is missing.");
    setMsg91Ready(false);
    return;
  }

  let cancelled = false;

  const initializeWidget = () => {
    if (cancelled) return;

    if (!window.initSendOTP) {
      console.error("MSG91 initialization function is unavailable.");
      setMsg91Ready(false);
      return;
    }

    try {
      window.initSendOTP({
        widgetId,
        tokenAuth,
        exposeMethods: true,

        // Required MSG91 success callback
        success: (data: any) => {
          console.log("MSG91 Widget initialized successfully.");

          if (!cancelled) {
            setMsg91Ready(true);
          }
        },

        // Required MSG91 failure callback
        failure: (error: any) => {
          console.error("MSG91 Widget initialization failed:", error);

          if (!cancelled) {
            setMsg91Ready(false);
          }
        },
      });
    } catch (error) {
      console.error("MSG91 initialization error:", error);

      if (!cancelled) {
        setMsg91Ready(false);
      }
    }
  };

  const scriptUrl = "https://verify.msg91.com/otp-provider.js";

  let script = document.querySelector(
    `script[src="${scriptUrl}"]`
  ) as HTMLScriptElement | null;

  if (script) {
    if (window.initSendOTP) {
      initializeWidget();
    } else {
      script.addEventListener("load", initializeWidget, { once: true });
    }
  } else {
    script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;

    script.onload = initializeWidget;

    script.onerror = () => {
      console.error("Unable to load MSG91 OTP Widget.");

      if (!cancelled) {
        setMsg91Ready(false);
      }
    };

    document.body.appendChild(script);
  }

  return () => {
    cancelled = true;
  };
}, []);


  // Revoke one device session
  const revokeSession = async (sessionId: string) => {
    if (!window.confirm("Sign out this device?")) return;

    try {
      setRevokingSession(sessionId);
      setSessionMessage("");

      await axios.post(
        `${API_BASE}/login-security/sessions/${encodeURIComponent(
          sessionId
        )}/revoke`,
        {},
        {
          headers: await getSessionAuthHeaders(),
        }
      );

      setSessions((previous) =>
        previous.filter(
          (session) => session.sessionId !== sessionId
        )
      );

      setSessionError(false);
      setSessionMessage("Device signed out successfully.");
    } catch (error: any) {
      setSessionError(true);
      setSessionMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to sign out this device."
      );
    } finally {
      setRevokingSession("");
    }
  };

  // Revoke all other device sessions
  const revokeOtherSessions = async () => {
    if (
      !window.confirm(
        "Are you sure you want to sign out all other devices?"
      )
    ) {
      return;
    }

    try {
      setRevokingSession("others");
      setSessionMessage("");

      const response = await axios.post(
        `${API_BASE}/login-security/sessions/revoke-others`,
        {},
        {
          headers: await getSessionAuthHeaders(),
        }
      );

      setSessions((previous) =>
        previous.filter(
          (session) => session.sessionId === currentSessionId
        )
      );

      setSessionError(false);
      setSessionMessage(
        `${response.data.revokedCount} other device(s) signed out.`
      );
    } catch (error: any) {
      setSessionError(true);
      setSessionMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to sign out other devices."
      );
    } finally {
      setRevokingSession("");
    }
  };

  // Device icon
  const getDeviceIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "mobile":
        return <Smartphone className="w-6 h-6" />;

      case "tablet":
        return <Tablet className="w-6 h-6" />;

      default:
        return <Monitor className="w-6 h-6" />;
    }
  };

  // Add password to an existing Google account
  const handleSetPassword = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setMessage("");

    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      setMessageType("error");
      setMessage("Please sign in with Google before setting a password.");
      return;
    }

    if (!firebaseUser.email) {
      setMessageType("error");
      setMessage("Your Firebase account does not have an email address.");
      return;
    }

    if (
      user?.email &&
      firebaseUser.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      setMessageType("error");
      setMessage(
        "The signed-in Firebase account does not match the profile email. Please sign in to the correct account."
      );
      return;
    }

    if (
      firebaseUser.providerData.some(
        (provider) => provider.providerId === "password"
      )
    ) {
      setMessageType("error");
      setMessage(
        "This account already has email/password sign-in. Use Forgot Password if you need to reset it."
      );
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setMessageType("error");
      setMessage(
        "Your password must contain between 8 and 128 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessageType("error");
      setMessage("The passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        password
      );

      await linkWithCredential(firebaseUser, credential);

      setMessageType("success");
      setMessage(
        "Password added successfully! You can now sign in using Google or your email and password."
      );

      setPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const errorCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? String(error.code)
          : "";

      if (errorCode === "auth/provider-already-linked") {
        setMessage(
          "Email/password sign-in is already linked to this account."
        );
      } else if (errorCode === "auth/email-already-in-use") {
        setMessage(
          "This email already belongs to another Firebase account. Do not create a duplicate account."
        );
      } else if (errorCode === "auth/credential-already-in-use") {
        setMessage(
          "These credentials are already linked to another account. Your existing accounts need to be resolved before linking."
        );
      } else if (errorCode === "auth/weak-password") {
        setMessage("Please choose a stronger password.");
      } else if (errorCode === "auth/requires-recent-login") {
        setMessage(
          "Please sign out, sign in again with Google, and retry."
        );
      } else {
        setMessage(
          `Could not add the password (${
            errorCode || "unknown error"
          }). Please try again.`
        );
      }

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // Extract MSG91 request ID
  const extractMsg91ReqId = (data: any): string => {
    const candidates = [
      data?.reqId,
      data?.req_id,
      data?.message,
      data?.data?.reqId,
      data?.data?.req_id,
      data?.data?.message,
    ];

    const result = candidates.find(
      (value) => typeof value === "string" && value.length > 0
    );

    return result || "";
  };

  // Extract MSG91 access token
  const extractMsg91AccessToken = (data: any): string => {
    const candidates = [
      data?.["access-token"],
      data?.accessToken,
      data?.token,
      data?.data?.["access-token"],
      data?.data?.accessToken,
      data?.data?.token,
      data?.message,
    ];

    const token = candidates.find(
      (value) =>
        typeof value === "string" &&
        value.length > 20
    );

    return token || "";
  };

  // Send SMS OTP directly for the entered number
  const requestContactOtp = async () => {
    try {
      setContactOtpLoading(true);
      setContactOtpMessage("");
      setContactOtpSuccess(false);

      if (!msg91Ready || !window.sendOtp) {
        throw new Error(
          "SMS verification is still loading. Please try again."
        );
      }

      const phone = normalizePhoneNumber(contactPhoneNumber);

      if (!isValidPhoneNumber(phone)) {
        throw new Error("Enter a valid mobile number.");
      }

      if (isCurrentNumberVerified) {
        throw new Error("This mobile number is already verified.");
      }

      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        throw new Error("Please sign in again.");
      }

      const idToken = await firebaseUser.getIdToken(true);

      // Create a verification session for this exact number.
      // The backend must NOT mark the number verified here.
      const sessionResponse = await axios.post(
        `${API_BASE}/forgot-password/phone/contact/request`,
        {
          phoneNumber: phone,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (sessionResponse.data.verified) {
        throw new Error("This mobile number is already verified.");
      }

      const sessionId = sessionResponse.data.sessionId;

      if (!sessionId) {
        throw new Error(
          "Unable to create a mobile verification session."
        );
      }

      setContactVerificationSessionId(sessionId);

      // MSG91 expects country code without the plus sign.
      const identifier = phone.replace("+", "");

      const sendResult = await new Promise<any>((resolve, reject) => {
        window.sendOtp!(
          identifier,
          resolve,
          reject
        );
      });

      const reqId = extractMsg91ReqId(sendResult);

      if (!reqId) {
        throw new Error(
          "MSG91 did not return an OTP request ID. Please try again."
        );
      }

      setContactOtpReqId(reqId);
      setContactOtpSent(true);
      setContactOtp("");
      setContactOtpMessage(
        "OTP sent successfully through SMS."
      );
    } catch (error: unknown) {
      setContactOtpMessage(
        axios.isAxiosError(error)
          ? error.response?.data?.message || error.message
          : error instanceof Error
            ? error.message
            : "Unable to send OTP."
      );

      setContactOtpSent(false);
      setContactOtpReqId("");
      setContactVerificationSessionId("");
    } finally {
      setContactOtpLoading(false);
    }
  };

  // Verify SMS OTP and link the number to the account
  const verifyContactOtp = async () => {
    try {
      setContactOtpLoading(true);
      setContactOtpMessage("");
      setContactOtpSuccess(false);

      if (!/^\d{6}$/.test(contactOtp)) {
        throw new Error("Enter the valid 6-digit OTP.");
      }

      if (!contactOtpReqId || !contactVerificationSessionId) {
        throw new Error(
          "Your verification session has expired. Request a new OTP."
        );
      }

      if (!window.verifyOtp) {
        throw new Error(
          "MSG91 is not ready. Please refresh and try again."
        );
      }

      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        throw new Error("Please sign in again.");
      }

      const phone = normalizePhoneNumber(contactPhoneNumber);

      if (!isValidPhoneNumber(phone)) {
        throw new Error("Enter a valid mobile number.");
      }

      // First verify OTP with MSG91.
      const widgetResult = await new Promise<any>((resolve, reject) => {
        window.verifyOtp!(
          contactOtp,
          resolve,
          reject,
          contactOtpReqId
        );
      });

      const accessToken = extractMsg91AccessToken(widgetResult);

      if (!accessToken) {
        throw new Error(
          "MSG91 did not return a verification token. Please retry."
        );
      }

      const idToken = await firebaseUser.getIdToken(true);

      // Backend validates the access token with MSG91.
      // Backend then saves the verified number to this account.
      const response = await axios.post(
        `${API_BASE}/forgot-password/phone/contact/verify`,
        {
          sessionId: contactVerificationSessionId,
          accessToken,
          phoneNumber: phone,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Mobile verification failed."
        );
      }

      const verifiedPhone =
        response.data.contactPhoneNumber || phone;

      setContactPhoneNumber(verifiedPhone);
      setSavedContactPhoneNumber(verifiedPhone);
      setContactPhoneVerified(true);

      setContactOtpSuccess(true);
      setContactOtpSent(false);
      setContactOtp("");
      setContactOtpReqId("");
      setContactVerificationSessionId("");

      setContactOtpMessage(
        "Your mobile number has been verified and linked to your account."
      );
    } catch (error: unknown) {
      setContactOtpMessage(
        axios.isAxiosError(error)
          ? error.response?.data?.message || error.message
          : error instanceof Error
            ? error.message
            : "OTP verification failed."
      );
    } finally {
      setContactOtpLoading(false);
    }
  };

  // Resend SMS OTP using MSG91
  const resendContactOtp = async () => {
    try {
      setContactOtpLoading(true);
      setContactOtpMessage("");

      if (!window.retryOtp || !contactOtpReqId) {
        throw new Error(
          "Request a new OTP verification session."
        );
      }

      const result = await new Promise<any>((resolve, reject) => {
        window.retryOtp!(
          "11",
          resolve,
          reject,
          contactOtpReqId
        );
      });

      const newReqId = extractMsg91ReqId(result);

      if (newReqId) {
        setContactOtpReqId(newReqId);
      }

      setContactOtp("");
      setContactOtpMessage(
        "A new SMS OTP has been requested."
      );
    } catch (error: unknown) {
      setContactOtpMessage(
        error instanceof Error
          ? error.message
          : "Unable to resend OTP."
      );
    } finally {
      setContactOtpLoading(false);
    }
  };

  return (
    <div className="px-4">
      <div className="flex items-center justify-center mt-9 mb-4">
        <div className="max-w-xl w-full shadow-lg rounded-lg overflow-hidden bg-white">

          {/* Profile header */}
          <div className="relative h-32 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              {user?.photo ? (
                <img
                  src={user.photo}
                  alt={user?.name || "Profile"}
                  className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                  <User className="h-10 w-10 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          <div className="pt-14 pb-6 px-6">

            {/* User details */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.name || "My Profile"}
              </h1>

              <div className="mt-2 flex items-center justify-center text-gray-500 break-all">
                <Mail className="h-4 w-4 mr-2 shrink-0" />
                <span>
                  {user?.email || currentUser?.email || ""}
                </span>
              </div>
            </div>

            <div className="space-y-5">

              {/* Application statistics */}
              <div className="flex items-center justify-center">
                <div className="bg-white shadow-sm rounded-lg p-2 w-full flex gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-center flex-1">
                    <span className="text-blue-600 font-semibold text-2xl">
                      0
                    </span>
                    <p className="text-blue-600 text-sm mt-1">
                      Active Applications
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3 text-center flex-1">
                    <span className="text-green-600 font-semibold text-2xl">
                      0
                    </span>
                    <p className="text-green-600 text-sm mt-1">
                      Accepted Applications
                    </p>
                  </div>
                </div>
              </div>

              {/* Email and password */}
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <LockKeyhole className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Email & Password
                  </h2>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  {hasPasswordProvider
                    ? "Email/password sign-in is already linked to this account."
                    : "Add a password to this Google account so you can sign in using either method."}
                </p>

                {message && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`mb-4 rounded-lg p-3 text-sm ${
                      messageType === "success"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {message}
                  </div>
                )}

                {!hasPasswordProvider && (
                  <form
                    onSubmit={handleSetPassword}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="new-password"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        New password
                      </label>

                      <div className="relative">
                        <input
                          id="new-password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={128}
                          required
                          value={password}
                          onChange={(event) =>
                            setPassword(event.target.value)
                          }
                          placeholder="At least 8 characters"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-11 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword((previous) => !previous)
                          }
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="confirm-password"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Confirm password
                      </label>

                      <div className="relative">
                        <input
                          id="confirm-password"
                          type={
                            showConfirmPassword ? "text" : "password"
                          }
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={128}
                          required
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          placeholder="Enter the password again"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-11 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(
                              (previous) => !previous
                            )
                          }
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                          className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !currentUser}
                      className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "Adding password..." : "Set Password"}
                    </button>
                  </form>
                )}

                {hasPasswordProvider && (
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                )}
              </div>

              {/* Security and active devices */}
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      Security & Devices
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={loadSessions}
                    disabled={sessionsLoading}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        sessionsLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Review devices currently signed in to your InternArea account.
                </p>

                {sessionMessage && (
                  <div
                    role="status"
                    className={`rounded-lg p-3 text-sm mb-4 ${
                      sessionError
                        ? "bg-red-50 text-red-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    {sessionMessage}
                  </div>
                )}

                {sessionsLoading ? (
                  <p className="text-sm text-gray-500 py-4">
                    Loading active devices...
                  </p>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">
                    No active sessions found.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => {
                      const isCurrent =
                        session.sessionId === currentSessionId;

                      return (
                        <div
                          key={session.sessionId}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex gap-3 min-w-0">
                              <div className="rounded-lg bg-blue-50 text-blue-600 p-3 h-fit">
                                {getDeviceIcon(session.deviceType)}
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-gray-900">
                                    {session.deviceModel ||
                                      session.deviceType ||
                                      "Unknown device"}
                                  </h3>

                                  {isCurrent && (
                                    <span className="text-xs rounded-full bg-green-100 text-green-700 px-2 py-1">
                                      This device
                                    </span>
                                  )}
                                </div>

                                <p className="text-sm text-gray-600 mt-1">
                                  {session.browser || "Unknown browser"}
                                  {" · "}
                                  {session.operatingSystem || "Unknown OS"}
                                </p>

                                <p className="text-xs text-gray-500 mt-2 break-all">
                                  IP: {session.ipAddress || "Unavailable"}
                                </p>

                                <p className="text-xs text-gray-500 mt-1">
                                  Signed in:{" "}
                                  {session.verifiedAt
                                    ? new Date(
                                        session.verifiedAt
                                      ).toLocaleString()
                                    : "Unavailable"}
                                </p>

                                <p className="text-xs text-gray-500 mt-1">
                                  Last active:{" "}
                                  {session.lastSeenAt
                                    ? new Date(
                                        session.lastSeenAt
                                      ).toLocaleString()
                                    : "Unavailable"}
                                </p>
                              </div>
                            </div>

                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() =>
                                  revokeSession(session.sessionId)
                                }
                                disabled={
                                  revokingSession === session.sessionId
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <LogOut className="h-4 w-4" />
                                {revokingSession === session.sessionId
                                  ? "Signing out..."
                                  : "Sign out"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {sessions.some(
                  (session) =>
                    session.sessionId !== currentSessionId
                ) && (
                  <button
                    type="button"
                    onClick={revokeOtherSessions}
                    disabled={revokingSession === "others"}
                    className="w-full mt-4 rounded-lg bg-red-600 text-white py-3 font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {revokingSession === "others"
                      ? "Signing out other devices..."
                      : "Sign out all other devices"}
                  </button>
                )}
              </div>

              {/* Contact mobile number */}
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-5 w-5 text-blue-600" />

                  <h2 className="text-lg font-semibold text-gray-900">
                    Mobile Number
                  </h2>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Verify your mobile number through SMS and link it to your account.
                </p>

                <label
                  htmlFor="profile-phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Mobile number
                </label>

                <input
                  id="profile-phone"
                  type="tel"
                  value={contactPhoneNumber}
                  onChange={(event) => {
                    setContactPhoneNumber(event.target.value);

                    // A new number requires a fresh verification session.
                    setContactOtpMessage("");
                    setContactOtpSent(false);
                    setContactOtp("");
                    setContactOtpReqId("");
                    setContactVerificationSessionId("");
                    setContactOtpSuccess(false);
                  }}
                  placeholder="Enter 10-digit mobile number"
                  disabled={contactOtpLoading}
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />

                {isCurrentNumberVerified ? (
                  <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="font-semibold text-sm">
                        Mobile number verified
                      </span>
                    </div>

                    <p className="text-xs text-green-700 mt-1">
                      This number is linked to your Internarea account.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-amber-700">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="font-semibold text-sm">
                        Mobile number not verified
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mt-2 mb-3">
                      An OTP will be sent to this number through SMS. Your number will only be linked after successful verification.
                    </p>

                    {!contactOtpSent ? (
                      <button
                        type="button"
                        onClick={requestContactOtp}
                        disabled={
                          contactOtpLoading ||
                          !msg91Ready ||
                          !isValidPhoneNumber(normalizedPhone)
                        }
                        className="w-full mt-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {contactOtpLoading
                          ? "Sending OTP..."
                          : !msg91Ready
                            ? "Loading SMS verification..."
                            : "Send SMS OTP"}
                      </button>
                    ) : (
                      <>
                        <label
                          htmlFor="contact-phone-otp"
                          className="block text-sm font-medium text-gray-700 mt-4 mb-1"
                        >
                          Enter 6-digit OTP
                        </label>

                        <input
                          id="contact-phone-otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={contactOtp}
                          onChange={(event) =>
                            setContactOtp(
                              event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6)
                            )
                          }
                          placeholder="Enter OTP"
                          disabled={contactOtpLoading}
                          className="w-full rounded-lg border border-gray-300 px-3 py-3 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <button
                          type="button"
                          onClick={verifyContactOtp}
                          disabled={
                            contactOtpLoading ||
                            contactOtp.length !== 6
                          }
                          className="w-full mt-3 rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {contactOtpLoading
                            ? "Verifying..."
                            : "Verify & Link Number"}
                        </button>

                        <button
                          type="button"
                          onClick={resendContactOtp}
                          disabled={contactOtpLoading}
                          className="w-full mt-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Resend SMS OTP
                        </button>
                      </>
                    )}

                    {contactOtpMessage && (
                      <div
                        role="status"
                        aria-live="polite"
                        className={`mt-3 rounded-lg p-3 text-sm ${
                          contactOtpSuccess
                            ? "bg-green-50 text-green-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {contactOtpMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-gray-500">
                Your mobile number is linked to your account only after MSG91 OTP verification and server-side verification.
              </p>
            </div>

            {/* Subscription management */}
            <div className="border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Crown className="h-6 w-6 text-blue-600" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Internarea Membership
                  </h2>
                  <p className="text-sm text-gray-600">
                    Manage your internship application limits and subscription.
                  </p>
                </div>
              </div>

              <Link
                href="/subscription"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <CreditCard className="h-5 w-5" />
                View Subscription Plans
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>

            {/* Applications */}
            <div className="flex justify-center pt-2">
              <Link
                href="/userapplication"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                View Applications
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
