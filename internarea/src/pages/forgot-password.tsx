
import { FormEvent, useState } from "react";
import Link from "next/link";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

type Step = "details" | "otp" | "password" | "done";
type RecoveryMethod = "email" | "phone";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("details");
  const [method, setMethod] = useState<RecoveryMethod>("email");

  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");

  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function callApi(endpoint: string, body: object) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/forgot-password/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Something went wrong. Please try again."
        );
      }

      return data;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("The request took too long. Please try again.");
      }

      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  function clearMessages() {
    setError("");
    setMessage("");
  }

  function showError(err: unknown, fallback: string) {
    setError(err instanceof Error ? err.message : fallback);
  }

  function normalizeIndianPhoneNumber(value: string) {
    const cleaned = value.trim().replace(/[\s()-]/g, "");

    if (/^\d{10}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }

    if (/^91\d{10}$/.test(cleaned)) {
      return `+${cleaned}`;
    }

    return cleaned;
  }

  async function handleEmailRequest(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    clearMessages();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Enter your registered email address.");
      return;
    }

    setLoading(true);

    try {
      const result = await callApi("request", {
        email: cleanEmail,
      });

      setEmail(cleanEmail);
      setOtp("");
      setResetToken("");
      setMethod("email");
      setStep("otp");

      setMessage(
        result.message ||
          "If an eligible account exists, a verification code will be sent. Check your inbox and spam folder."
      );
    } catch (err) {
      showError(err, "Unable to request password recovery.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneRequest(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    clearMessages();

    const cleanPhone = normalizeIndianPhoneNumber(phoneNumber);

    if (!/^\+[1-9]\d{7,14}$/.test(cleanPhone)) {
      setError(
        "Enter a valid phone number with country code. For India, enter your 10-digit mobile number."
      );
      return;
    }

    setLoading(true);

    try {
      const result = await callApi("phone/request", {
        phoneNumber: cleanPhone,
      });

      setPhoneNumber(cleanPhone);
      setOtp("");
      setResetToken("");
      setMethod("phone");
      setStep("otp");

      setMessage(
        result.message ||
          `A phone verification code has been sent to ${cleanPhone}.`
      );
    } catch (err) {
      showError(err, "Unable to send the phone verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailVerify(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    clearMessages();

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the six-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const result = await callApi("verify", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      if (!result.resetToken) {
        throw new Error("No password reset token was returned.");
      }

      setResetToken(result.resetToken);
      setStep("password");
      setMessage("Email verified. Create your new password.");
    } catch (err) {
      showError(err, "Unable to verify the code.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneVerify(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    clearMessages();

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the six-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const result = await callApi("phone/verify", {
        phoneNumber,
        otp: otp.trim(),
      });

      if (!result.resetToken) {
        throw new Error("No password reset token was returned.");
      }

      setResetToken(result.resetToken);
      setStep("password");
      setMessage(
        "	Phone number verified. Create your new password."
      );
    } catch (err) {
      showError(err, "Unable to verify the WhatsApp code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    clearMessages();
    setLoading(true);

    try {
      if (method === "email") {
        const result = await callApi("resend", {
          email: email.trim().toLowerCase(),
        });

        setMessage(
          result.message || "A new verification code has been sent."
        );
      } else {
        const result = await callApi("phone/resend", {
          phoneNumber,
        });

        setOtp("");
        setMessage(
          result.message ||
            "A new phone verification code has been sent."
        );
      }
    } catch (err) {
      showError(
        err,
        method === "email"
          ? "Unable to resend the email verification code."
          : "Unable to resend the phone verification code."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    clearMessages();

    if (!resetToken) {
      setError(
        "Your verification has expired. Please start recovery again."
      );
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      setError("Password must be between 8 and 128 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      if (method === "email") {
        await callApi("complete-email", {
          email: email.trim().toLowerCase(),
          resetToken,
          newPassword,
        });
      } else {
        await callApi("phone/complete", {
          phoneNumber,
          resetToken,
          newPassword,
        });
      }

      setStep("done");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Your password has been updated successfully.");
    } catch (err) {
      showError(err, "Unable to update your password.");
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    setStep("details");
    setMethod("email");
    setOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    clearMessages();
  }

  function changeMethod(nextMethod: RecoveryMethod) {
    setMethod(nextMethod);
    setOtp("");
    setResetToken("");
    clearMessages();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <Link
          href="/"
          className="mb-8 inline-block text-xl font-bold text-blue-600"
        >
          InternArea
        </Link>

        {step === "details" && (
          <>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Forgot password?
            </h1>

            <p className="mb-6 text-sm text-gray-600">
              Choose how you want to verify your account.
            </p>

            <div className="mb-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => changeMethod("email")}
                className={`rounded-lg border px-3 py-3 text-sm font-semibold ${
                  method === "email"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                Email OTP
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => changeMethod("phone")}
                className={`rounded-lg border px-3 py-3 text-sm font-semibold ${
                  method === "phone"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                Phone OTP
              </button>
            </div>

            {method === "email" ? (
              <form
                onSubmit={handleEmailRequest}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Registered email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send email verification code"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={handlePhoneRequest}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Registered mobile number
                  </label>

                  <input
                    id="phoneNumber"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={phoneNumber}
                    onChange={(event) =>
                      setPhoneNumber(event.target.value)
                    }
                    placeholder="+91 9876543210"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Enter your registered number. Indian 10-digit
                    numbers are automatically prefixed with +91.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send phone verification code"}
                </button>
              </form>
            )}
          </>
        )}

        {step === "otp" && (
          <form
            onSubmit={
              method === "email"
                ? handleEmailVerify
                : handlePhoneVerify
            }
            className="space-y-5"
          >
            <h1 className="text-2xl font-bold text-gray-900">
              Verify your account
            </h1>

            <p className="text-sm text-gray-600">
              {method === "email"
                ? "Enter the six-digit verification code sent to your registered email address."
                : `Enter the six-digit phone verification code sent to ${phoneNumber}.`}
            </p>

            <div>
              <label
                htmlFor="otp"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Verification code
              </label>

              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(event) =>
                  setOtp(
                    event.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                placeholder="123456"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-xl tracking-[0.4em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify code"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Resend code"}
            </button>

            <button
              type="button"
              onClick={startOver}
              disabled={loading}
              className="w-full text-sm text-blue-600 hover:underline"
            >
              Start again
            </button>
          </form>
        )}

        {step === "password" && (
          <form
            onSubmit={handlePasswordSubmit}
            className="space-y-5"
          >
            <h1 className="text-2xl font-bold text-gray-900">
              Create new password
            </h1>

            <div>
              <label
                htmlFor="newPassword"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                New password
              </label>

              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Confirm new password
              </label>

              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirm new password"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <p className="text-xs text-gray-500">
              Use a password between 8 and 128 characters.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Updating password..." : "Reset password"}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-5 text-center">
            <div className="text-5xl">✓</div>

            <h2 className="text-xl font-bold text-green-700">
              Password updated!
            </h2>

            <p
              role="status"
              className="rounded-lg bg-green-50 p-3 text-sm text-green-700"
            >
              {message}
            </p>

            <p className="text-sm leading-6 text-gray-600">
              Your new password is ready to use. You can now sign in to
              your InternArea account.
            </p>

            <Link
              href="/?openLogin=1"
              className="block w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Go to Login
            </Link>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {message && step !== "done" && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-blue-50 p-3 text-sm text-blue-700"
          >
            {message}
          </p>
        )}

        <div className="mt-7 border-t border-gray-100 pt-5 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to InternArea
          </Link>
        </div>
      </section>
    </main>
  );
}
