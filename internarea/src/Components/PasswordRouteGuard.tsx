
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  onAuthStateChanged,
  getIdTokenResult,
  signOut,
} from "firebase/auth";
import { auth } from "@/firebase/firebase";

const LOGIN_SESSION_KEY = "internarea_login_session";

// Pages visitors can access without completing login verification.
const PUBLIC_PATHS = [
  "/",
  "/404",
  "/adminlogin",
  "/forgot-password",
  "/internship",
  "/job",
  "/detailinternship/[id]",
  "/detailjob/[id]",
  "/detailapplication/[id]",
];

export default function PasswordRouteGuard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;

    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      const isPublicPage = PUBLIC_PATHS.includes(router.pathname);

      // Signed-out visitors can access public pages.
      if (!user) {
        if (isPublicPage) {
          setChecking(false);
          return;
        }

        await router.replace("/");
        return;
      }

      try {
        // Check Firebase account claims.
        const tokenResult = await getIdTokenResult(user, true);

        if (!active) return;

        // Require a verified login session on protected pages.
        if (!isPublicPage) {
          const sessionToken =
            typeof window !== "undefined"
              ? localStorage.getItem(LOGIN_SESSION_KEY)
              : null;

          if (!sessionToken) {
            localStorage.removeItem(LOGIN_SESSION_KEY);
            await signOut(auth);

            if (active) {
              await router.replace("/");
            }

            return;
          }
        }

        // Preserve forced password-change functionality.
        const mustChange =
          tokenResult.claims.mustChangePassword === true;

        const isChangePasswordPage =
          router.pathname === "/change-password";

        if (mustChange && !isChangePasswordPage) {
          await router.replace("/change-password");
          return;
        }

        if (!mustChange && isChangePasswordPage) {
          await router.replace("/");
          return;
        }

        if (active) {
          setChecking(false);
        }
      } catch (error) {
        console.error("Route guard authentication check failed:", error);

        if (active) {
          setChecking(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router, router.isReady, router.pathname]);

  return checking ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <p className="text-gray-600">Checking account security...</p>
    </div>
  ) : null;
}
