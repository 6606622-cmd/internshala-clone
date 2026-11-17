
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
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

// English acts as the fallback dictionary.
// Any missing key in another language falls back to English.
const translations = {
  en,
  es: { ...en, ...es },
  hi: { ...en, ...hi },
  pt: { ...en, ...pt },
  zh: { ...en, ...zh },
  fr: { ...en, ...fr },
};

type Language = keyof typeof translations;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: typeof en;
}

const LanguageContext =
  createContext<LanguageContextType | undefined>(undefined);

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://internshala-clone-a0st.onrender.com"
).replace(/\/+$/, "");

const API_URL = `${API_BASE_URL}/api/language`;

const isLanguage = (value: unknown): value is Language =>
  typeof value === "string" &&
  Object.prototype.hasOwnProperty.call(translations, value);

export const LanguageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const router = useRouter();

  const [language, setLanguageState] = useState<Language>("en");

  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [pendingLanguage, setPendingLanguage] =
    useState<Language | null>(null);

  // Prevent duplicate French OTP requests.
  const frenchOtpRequestRef = useRef(false);
  const frenchOtpPendingRef = useRef(false);

  const t: typeof en = translations[language];

  const getLanguageKey = () => "internarea_language";

  // Save and apply a language.
  const applyLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);

    try {
      localStorage.setItem(getLanguageKey(), newLanguage);
    } catch (error) {
      console.error("Failed to save language preference:", error);
    }
  };

  // Load browser preference and authenticated server preference.
  useEffect(() => {
    if (!router.isReady) return;

    let active = true;

    const loadLanguage = async () => {
      let browserLanguage: Language = "en";

      try {
        const savedLanguage = localStorage.getItem(getLanguageKey());

        // French is never activated from browser storage alone.
        if (isLanguage(savedLanguage) && savedLanguage !== "fr") {
          browserLanguage = savedLanguage;
        }
      } catch (error) {
        console.error("Failed to read saved language:", error);
      }

      if (active) {
        setLanguageState(browserLanguage);
      }

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
          // Server preference is authoritative for logged-in users.
          applyLanguage(data.language);
        }
      } catch (error) {
        console.error("Failed to load language preference:", error);
      }
    };

    void loadLanguage();

    return () => {
      active = false;
    };
  }, [router.isReady, router.pathname]);

  // Change the selected language.
  const setLanguage = async (
    newLanguage: Language
  ): Promise<void> => {
    if (!isLanguage(newLanguage) || newLanguage === language) {
      return;
    }

    try {
      await auth.authStateReady();
    } catch (error) {
      console.error(
        "Firebase authentication initialization failed:",
        error
      );

      if (newLanguage === "fr") {
        setPendingLanguage(null);
        setOtpMessage(t.networkErrorLanguage);
        setShowOtp(true);
      }

      return;
    }

    // FRENCH: EMAIL OTP IS REQUIRED.
    if (newLanguage === "fr") {
      if (
        frenchOtpRequestRef.current ||
        frenchOtpPendingRef.current
      ) {
        return;
      }

      const currentUser = auth.currentUser;

      // Logged-out users must sign in first.
      // No OTP is sent in this situation.
      if (!currentUser) {
        setPendingLanguage(null);
        setOtp("");
        setOtpMessage(t.loginBeforeFrench);
        setShowOtp(true);
        return;
      }

      frenchOtpRequestRef.current = true;

      setPendingLanguage(null);
      setOtp("");
      setOtpMessage("");
      setOtpLoading(true);

      try {
        const token = await currentUser.getIdToken();

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
          setPendingLanguage(null);
          setOtpMessage(data.message || t.failedToSendOtp);
          setShowOtp(true);
          return;
        }

        // OTP was successfully sent.
        frenchOtpPendingRef.current = true;

        setPendingLanguage("fr");
        setOtp("");
        setOtpMessage(t.otpSent);
        setShowOtp(true);
      } catch (error) {
        console.error("French OTP request error:", error);

        setPendingLanguage(null);
        setOtpMessage(t.networkErrorLanguage);
        setShowOtp(true);
      } finally {
        frenchOtpRequestRef.current = false;
        setOtpLoading(false);
      }

      return;
    }

    // OTHER LANGUAGES.
    const currentUser = auth.currentUser;

    // Logged-out users can change non-French languages locally.
    if (!currentUser) {
      applyLanguage(newLanguage);
      return;
    }

    // Save authenticated users' preferences on the backend.
    try {
      setOtpLoading(true);
      setOtpMessage("");

      const token = await currentUser.getIdToken();

      const response = await fetch(`${API_URL}/preference`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: newLanguage,
          page: router.pathname,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setOtpMessage(data.message || t.failedToChangeLanguage);
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

  // Verify the French email OTP.
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

      // Activate French only after successful backend verification.
      applyLanguage("fr");

      frenchOtpPendingRef.current = false;
      frenchOtpRequestRef.current = false;

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

  // Cancel French verification.
  const cancelFrenchChange = () => {
    frenchOtpRequestRef.current = false;
    frenchOtpPendingRef.current = false;

    setShowOtp(false);
    setOtp("");
    setPendingLanguage(null);
    setOtpMessage("");
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
      }}
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

            {pendingLanguage === "fr" && (
              <>
                <p className="mb-4 text-sm text-gray-600">
                  {t.frenchOtpInfo}
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(event) =>
                    setOtp(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    )
                  }
                  placeholder={t.enterOtp}
                  maxLength={6}
                  aria-label={t.enterOtp}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-800 outline-none focus:border-blue-500"
                />
              </>
            )}

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

              {pendingLanguage === "fr" && (
                <button
                  type="button"
                  onClick={verifyFrenchOtp}
                  disabled={otpLoading || otp.length !== 6}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {otpLoading ? t.verifying : t.verify}
                </button>
              )}
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
