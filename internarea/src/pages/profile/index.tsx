
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
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useSelector } from "react-redux";

const Index = () => {
  const user = useSelector(selectuser);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "error"
  );

  const currentUser = auth.currentUser;

  const hasPasswordProvider =
    currentUser?.providerData.some(
      (provider) => provider.providerId === "password"
    ) ?? false;

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

    if (password.length < 8) {
      setMessageType("error");
      setMessage("Your password must contain at least 8 characters.");
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
          `Could not add the password (${errorCode || "unknown error"}). Please try again.`
        );
      }

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4">
      <div className="flex items-center justify-center mt-9 mb-4">
        <div className="max-w-xl w-full shadow-lg rounded-lg overflow-hidden bg-white">
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
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.name || "My Profile"}
              </h1>

              <div className="mt-2 flex items-center justify-center text-gray-500 break-all">
                <Mail className="h-4 w-4 mr-2 shrink-0" />
                <span>{user?.email || currentUser?.email || ""}</span>
              </div>
            </div>

            <div className="space-y-5">
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

              {/* Add a password to the existing Google account */}
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
    </div>
  );
};

export default Index;
