
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged} from "firebase/auth";
import { auth } from "../firebase/firebase";
import { toast } from "react-toastify";

export default function ChangePassword() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCheckingAuth(false);
        await router.replace("/");
        return;
      }

      try {
        const tokenResult = await user.getIdTokenResult(true);

        if (tokenResult.claims.mustChangePassword !== true) {
          await router.replace("/");
          return;
        }
      } catch (error) {
        console.error("Could not check password status:", error);
        toast.error("Unable to verify your account. Please try again.");
        await router.replace("/");
      } finally {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleChangePassword = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) return;

    if (newPassword.length < 8 || newPassword.length > 128) {
      toast.error("Password must be between 8 and 128 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      toast.error("Please log in again.");
      await router.replace("/");
      return;
    }

    try {
      setLoading(true);

      // Ask the backend to clear the temporary-password requirement.
      const idToken = await user.getIdToken(true);

      const response = await fetch(
        "http://localhost:5000/api/forgot-password/complete-change",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ newPassword }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(
          result.message ||
            "Password changed, but account verification could not be completed. Contact support."
        );
        return;
      }

      // Refresh the token to receive the updated custom claims.
      await user.getIdToken(true);

      toast.success("Password changed successfully!");

      setNewPassword("");
      setConfirmPassword("");

      await router.replace("/");
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? String(error.code)
          : "";

      console.error("Change password error:", code || error);

      if (code === "auth/weak-password") {
        toast.error("Please choose a stronger password.");
      } else if (code === "auth/requires-recent-login") {
        toast.error("Please log in again and change your password.");
      } else {
        toast.error("Unable to change your password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-600">Checking your account...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Change your password
        </h1>

        <p className="mb-6 text-sm text-gray-600">
          For your security, create a new password before continuing.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-5">
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
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter your new password"
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
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              minLength={8}
              maxLength={128}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Confirm your new password"
            />
          </div>

          <p className="text-xs text-gray-500">
            Use at least 8 characters. Choose a password you have not used
            elsewhere.
          </p>

          <button
            type="submit"
            disabled={loading || checkingAuth}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating password..." : "Update password"}
          </button>
        </form>
      </section>
    </main>
  );
}
