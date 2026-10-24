import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/router";

import en from "../translations/en";
import es from "../translations/es";
import hi from "../translations/hi";
import pt from "../translations/pt";
import zh from "../translations/zh";
import fr from "../translations/fr";

import { auth } from "../src/firebase/firebase";

const translations = { en, es, hi, pt, zh, fr };

type Language = keyof typeof translations;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: typeof en;
}

const LanguageContext =
  createContext<LanguageContextType | undefined>(undefined);

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || "https://internshala-clone-a0st.onrender.com"}/api/language`;

const isLanguage = (value: unknown): value is Language =>
  typeof value === "string" &&
  Object.prototype.hasOwnProperty.call(translations, value);

export const LanguageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const router = useRouter();

  const [language, setLanguageState] =
    useState<Language>("en");

  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [pendingLanguage, setPendingLanguage] =
    useState<Language | null>(null);

  const t = translations[language];

  const getLanguageKey = () =>
    `language_${router.pathname}`;

  // Apply and save the browser preference.

  const applyLanguage = (newLanguage: Language) => {
  setLanguageState(newLanguage);

  try {
    if (router.isReady) {
      localStorage.setItem(getLanguageKey(), newLanguage);
    }
  } catch (error) {
    console.error("Failed to save language preference:", error);
  }
}; 


  // Load the browser preference first, then the user preference.
  useEffect(() => {
    if (!router.isReady) return;

    let active = true;

    const loadLanguage = async () => {
      let browserLanguage: Language = "en";

      try {
        const savedPageLanguage = localStorage.getItem(
          getLanguageKey()
        );

        if (isLanguage(savedPageLanguage)) {
          browserLanguage = savedPageLanguage;
        }

      } catch (error) {
        console.error(
          "Failed to read saved language:",
          error
        );
      }

      if (active) {
        setLanguageState(browserLanguage);
      }

      // Wait for Firebase to restore the authenticated user.
      try {
        await auth.authStateReady();

        if (!active || !auth.currentUser) return;

        const token = await auth.currentUser.getIdToken();

        const response = await fetch(
          `${API_URL}/preference?page=${encodeURIComponent(router.pathname)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          console.error(
            "Could not load server language preference:",
            response.status
          );
          return;
        }

        const data = await response.json();

        if (active && isLanguage(data.language)) {
          applyLanguage(data.language);
        }
      } catch (error) {
        console.error(
          "Failed to load language preference:",
          error
        );
      }
    };

    void loadLanguage();

    return () => {
      active = false;
    };
  }, [router.isReady, router.pathname]);

  // Save authenticated users' normal language changes.
  const setLanguage = async (
    newLanguage: Language
  ) => {
    if (!isLanguage(newLanguage) || newLanguage === language) {
      return;
    }

    // French always requires server-side OTP verification.
    if (newLanguage === "fr") {
      if (!auth.currentUser) {
        setOtpMessage(t.loginBeforeFrench);
        setShowOtp(true);
        return;
      }

      try {
        setOtpLoading(true);
        setOtpMessage("");

        const token = await auth.currentUser.getIdToken();

        const response = await fetch(
          `${API_URL}/request-french-otp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              page: router.pathname,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          setOtpMessage(
            data.message || t.failedToSendOtp
          );
          setShowOtp(true);
          return;
        }

        setPendingLanguage("fr");
        setOtp("");
        setShowOtp(true);
        setOtpMessage(t.otpSent);
      } catch (error) {
        console.error("French OTP request error:", error);
        setOtpMessage(t.networkErrorLanguage);
        setShowOtp(true);
      } finally {
        setOtpLoading(false);
      }

      return;
    }

    // Unauthenticated users can change their browser preference.
    if (!auth.currentUser) {
      applyLanguage(newLanguage);
      return;
    }

    try {
      setOtpLoading(true);
      setOtpMessage("");

      const token = await auth.currentUser.getIdToken();

      const response = await fetch(
        `${API_URL}/preference`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            language: newLanguage,
            page: router.pathname,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setOtpMessage(
          data.message || t.failedToChangeLanguage
        );
        return;
      }

      if (isLanguage(data.language)) {
        applyLanguage(data.language);
      } else {
        setOtpMessage(t.failedToChangeLanguage);
      }
    } catch (error) {
      console.error("Language change error:", error);
      setOtpMessage(t.networkErrorLanguage);
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify the French OTP on the backend.
  const verifyFrenchOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setOtpMessage(t.enterOtpMessage);
      return;
    }

    if (!auth.currentUser || pendingLanguage !== "fr") {
      setOtpMessage(t.loginAgain);
      return;
    }

    try {
      setOtpLoading(true);
      setOtpMessage("");

      const token = await auth.currentUser.getIdToken();

      const response = await fetch(
        `${API_URL}/verify-french-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            otp,
            page: router.pathname,
          }),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.verified ||
        data.language !== "fr"
      ) {
        setOtpMessage(data.message || t.invalidOtp);
        return;
      }

      // Apply French only after successful backend verification.
      applyLanguage("fr");

      setShowOtp(false);
      setOtp("");
      setPendingLanguage(null);
      setOtpMessage("");
    } catch (error) {
      console.error("OTP verification error:", error);
      setOtpMessage(t.networkErrorLanguage);
    } finally {
      setOtpLoading(false);
    }
  };

  const cancelFrenchChange = () => {
    setShowOtp(false);
    setOtp("");
    setPendingLanguage(null);
    setOtpMessage("");
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t }}
    >
      {children}

      {showOtp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="french-otp-title"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <h2
              id="french-otp-title"
              className="mb-2 text-xl font-semibold text-gray-800"
            >
              {t.frenchVerification}
            </h2>

            <p className="mb-4 text-sm text-gray-600">
              {t.frenchOtpInfo}
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) =>
                setOtp(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              placeholder={t.enterOtp}
              maxLength={6}
              aria-label={t.enterOtp}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-800 outline-none focus:border-blue-500"
            />

            {otpMessage && (
              <p
                role="status"
                className="mt-3 text-sm text-gray-600"
              >
                {otpMessage}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelFrenchChange}
                disabled={otpLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                {t.cancel}
              </button>

              <button
                type="button"
                onClick={verifyFrenchOtp}
                disabled={otpLoading || otp.length !== 6}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {otpLoading
                  ? t.verifying
                  : t.verify}
              </button>
            </div>
          </div>
        </div>
      )}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
};