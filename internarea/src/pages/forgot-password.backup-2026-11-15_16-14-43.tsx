
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { auth } from "../firebase/firebase";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

type Method = "email" | "phone";
type Step = "details" | "otp" | "password" | "done";

export default function ForgotPassword() {
  const [method, setMethod] = useState<Method>("email");
  const [step, setStep] = useState<Step>("details");

  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [phoneIdToken, setPhoneIdToken] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

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

  function resetMessages() {
    setError("");
    setMessage("");
  }

  async function handleEmailRequest(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const result = await callApi("request", {
        email: email.trim(),
      });

      setOtp("");
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
    resetMessages();
    setLoading(true);

    try {
      await callApi("phone/request", {
        phoneNumber: phoneNumber.trim(),
      });

      // Clear any previous reCAPTCHA instance.
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;

      const verifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );

      recaptchaRef.current = verifier;

      const confirmation = await signInWithPhoneNumber(
        auth,
        phoneNumber.trim(),
        verifier
      );

      confirmationRef.current = confirmation;
      setOtp("");
      setStep("otp");
      setMessage("A verification code has been sent to your phone.");
    } catch (err) {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      showError(err, "Unable to send the phone verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailVerify() {
    const result = await callApi("verify", {
      email: email.trim(),
      otp: otp.trim(),
    });

    if (!result.resetToken) {
      throw new Error("No password reset token was returned.");
    }

    setResetToken(result.resetToken);
    setStep("password");
    setMessage("Email verified. Now create your new password.");
  }

  async function handlePhoneVerify() {
    if (!confirmationRef.current) {
      throw new Error("Your phone verification session has expired. Start again.");
    }

    const credential = await confirmationRef.current.confirm(otp.trim());
    const idToken = await credential.user.getIdToken(true);

    setPhoneIdToken(idToken);
    setStep("password");
    setMessage("Phone verified. Now create your new password.");
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      if (method === "email") {
        await handleEmailVerify();
      } else {
        await handlePhoneVerify();
      }
    } catch (err) {
      showError(err, "Unable to verify the code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    resetMessages();
    setLoading(true);

    try {
      if (method === "email") {
        const result = await callApi("resend", {
          email: email.trim(),
        });

        setMessage(
          result.message || "If eligible, a new code has been sent."
        );
      } else {
        // Firebase controls phone SMS resend and reCAPTCHA verification.
        recaptchaRef.current?.clear();
        recaptchaRef.current = null;

        const verifier = new RecaptchaVerifier(
          auth,
          "recaptcha-container",
          { size: "invisible" }
        );

        recaptchaRef.current = verifier;

        const confirmation = await signInWithPhoneNumber(
          auth,
          phoneNumber.trim(),
          verifier
        );

        confirmationRef.current = confirmation;
        setMessage("A new verification code has been sent.");
      }
    } catch (err) {
      showError(err, "Unable to resend the verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    resetMessages();

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
          email: email.trim(),
          resetToken,
          newPassword,
        });
      } else {
        await callApi("phone/complete", {
          idToken: phoneIdToken,
          newPassword,
        });
      }

      setResetToken("");
      setPhoneIdToken("");
      setNewPassword("");
      setConfirmPassword("");
      setOtp("");
      setStep("done");
      setMessage("Your password has been updated successfully.");
    } catch (err) {
      showError(err, "Unable to update your password.");
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
    confirmationRef.current = null;

    setStep("details");
    setEmail("");
    setPhoneNumber("");
    setOtp("");
    setResetToken("");
    setPhoneIdToken("");
    setNewPassword("");
    setConfirmPassword("");
    resetMessages();
  }

  function changeMethod(nextMethod: Method) {
    if (loading) return;

    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
    confirmationRef.current = null;

    setMethod(nextMethod);
    setStep("details");
    setOtp("");
    setResetToken("");
    setPhoneIdToken("");
    setNewPassword("");
    setConfirmPassword("");
    resetMessages();
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
          Verify your registered email address or phone number to reset
          your password.
        </p>

        {step === "details" && (
          <>
            <div className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => changeMethod("email")}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${
                  method === "email"
                    ? "bg-white text-blue-600 shadow"
                    : "text-gray-600"
                }`}
              >
                Email
              </button>

              <button
                type="button"
                onClick={() => changeMethod("phone")}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${
                  method === "phone"
                    ? "bg-white text-blue-600 shadow"
                    : "text-gray-600"
                }`}
              >
                Phone
              </button>
            </div>

            {method === "email" ? (
              <form onSubmit={handleEmailRequest} className="space-y-5">
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
                  {loading ? "Please wait..." : "Send verification code"}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePhoneRequest} className="space-y-5">
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Registered phone number
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="+919876543210"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Include your country code. Example: +91 followed by
                    your 10-digit mobile number.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? "Sending code..." : "Send SMS code"}
                </button>
              </form>
            )}
          </>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerify} className="space-y-5">
            <p className="text-sm text-gray-600">
              Enter the six-digit verification code sent to your{" "}
              {method === "email" ? "email address" : "phone number"}.
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
              Start again
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
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
                onChange={(event) => setConfirmPassword(event.target.value)}
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

            <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {message}
            </p>

            <p className="text-sm leading-6 text-gray-600">
              Your new password is ready to use. You can now sign in
              to your InternArea account.
            </p>

            <Link
              href="/login"
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

        <div id="recaptcha-container" />

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
