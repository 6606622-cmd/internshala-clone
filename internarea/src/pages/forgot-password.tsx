
import { FormEvent, useState } from "react";
import Link from "next/link";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

type Step = "email" | "otp" | "password";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function callApi(endpoint: string, body: object) {
    const response = await fetch(
      `${API_BASE_URL}/api/forgot-password/${endpoint}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message || "Something went wrong. Please try again."
      );
    }

    return data;
  }

  function showError(err: unknown, fallback: string) {
    setError(err instanceof Error ? err.message : fallback);
  }

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await callApi("request", { email: email.trim() });
      setStep("otp");
      setOtp("");
      setMessage(
        "If your account is eligible, a verification code will be sent to your registered email."
      );
    } catch (err) {
      showError(err, "Unable to request password recovery.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = await callApi("verify", {
        email: email.trim(),
        otp: otp.trim(),
      });

      if (!result.resetToken) {
        throw new Error("Verification succeeded but no reset token was returned. Please try again.");
      }

      setResetToken(result.resetToken);
      setOtp("");
      setStep("password");
      setMessage("Your code is verified. Choose a new password.");
    } catch (err) {
      showError(err, "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = await callApi("resend", {
        email: email.trim(),
      });
      setMessage(
        result.message || "If eligible, a new verification code has been sent."
      );
    } catch (err) {
      showError(err, "Unable to resend the verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8 || newPassword.length > 128) {
      setError("Your password must be between 8 and 128 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await callApi("complete-email", {
        email: email.trim(),
        resetToken,
        newPassword,
      });

      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setStep("email");
      setOtp("");
      setMessage(
        result.message || "Your password has been updated. You can now sign in."
      );
    } catch (err) {
      showError(err, "Unable to update your password.");
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    setStep("email");
    setOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setMessage("");
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

        <h1 className="mb-3 text-3xl font-bold text-gray-900">
          Forgot Password?
        </h1>

        <p className="mb-6 text-sm leading-6 text-gray-600">
          Recover your account using your registered email address.
        </p>

        <div className="mb-6 rounded-lg border border-gray-200 p-3">
          <p className="text-sm font-semibold text-gray-800">
            Email verification
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Available now
          </p>
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="text-sm font-semibold text-gray-500">
              Phone verification
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Not available yet. Add and verify phone numbers on existing
              accounts before enabling phone recovery.
            </p>
          </div>
        </div>

        {step === "email" && (
          <form onSubmit={handleRequest} className="space-y-5">
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

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Send verification code"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerify} className="space-y-5">
            <p className="text-sm text-gray-600">
              Enter the six-digit code sent to your registered email, if your
              account is eligible.
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
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-xl tracking-[0.4em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                {message}
              </p>
            )}

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
              Resend code
            </button>

            <button
              type="button"
              onClick={startOver}
              disabled={loading}
              className="w-full text-sm text-blue-600 hover:underline"
            >
              Use a different email address
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleSetPassword} className="space-y-5">
            <p className="text-sm text-gray-600">
              Create a new password for your account. Use at least 8
              characters.
            </p>

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
                minLength={8}
                maxLength={128}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
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
                minLength={8}
                maxLength={128}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !resetToken}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Updating password..." : "Set new password"}
            </button>

            <button
              type="button"
              onClick={startOver}
              disabled={loading}
              className="w-full text-sm text-blue-600 hover:underline"
            >
              Start over
            </button>
          </form>
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
