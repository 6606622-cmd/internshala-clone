
import Link from "next/link";
import { auth, provider } from "../firebase/firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  getIdTokenResult,
} from "firebase/auth";
import { Search, User, LogIn, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { useLanguage } from "../../context/LanguageContext";
import { useRouter } from "next/router";
import axios from "axios";

const API_BASE = "https://internshala-clone-a0st.onrender.com/api";
const LOGIN_SESSION_KEY = "internarea_login_session";

function saveLoginSession(token: string) {
  localStorage.setItem(LOGIN_SESSION_KEY, token);
}

export function getLoginSession() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LOGIN_SESSION_KEY);
}

function clearLoginSession() {
  localStorage.removeItem(LOGIN_SESSION_KEY);
}

async function startLoginSecurity(user: any) {
  clearLoginSession();

  const idToken = await user.getIdToken(true);

  const response = await fetch(`${API_BASE}/login-security/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login verification failed.");
  }

  if (!data.otpRequired) {
    if (!data.sessionToken) {
      throw new Error(
        "Backend did not create a login session. Please try again."
      );
    }

    saveLoginSession(data.sessionToken);
  }

  return data;
}

async function verifyLoginSecurity(
  user: any,
  activityId: string,
  otp: string
) {
  const idToken = await user.getIdToken(true);

  const response = await fetch(`${API_BASE}/login-security/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ activityId, otp }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "OTP verification failed.");
  }

  if (!data.sessionToken) {
    throw new Error("Login session was not created. Please try again.");
  }

  saveLoginSession(data.sessionToken);

  return data;
}
async function ensureUserProfile(user: any) {
  const idToken = await user.getIdToken(true);
  const sessionToken = getLoginSession();

  if (!sessionToken) {
    throw new Error("Login session is missing.");
  }

  const response = await fetch(`${API_BASE}/user-profile/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "x-login-session": sessionToken,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Unable to load your user profile."
    );
  }

  // A new user must choose a username.
  return data;
}

type AuthMode = "login" | "signup";

const Navbar = () => {
  const user = useSelector(selectuser);
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchData, setSearchData] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [authLoading, setAuthLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginOtp, setLoginOtp] = useState("");
  const [loginActivityId, setLoginActivityId] = useState("");
  const [showLoginOtp, setShowLoginOtp] = useState(false);
  const [loginOtpLoading, setLoginOtpLoading] = useState(false);
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [usernameMode, setUsernameMode] = useState<"custom" | "generate">("custom");
  const [newUsername, setNewUsername] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameSubmitting, setUsernameSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const checkMustChangePassword = async (
    firebaseUser: import("firebase/auth").User
  ): Promise<boolean> => {
    const tokenResult = await getIdTokenResult(firebaseUser, true);
    return tokenResult.claims.mustChangePassword === true;
  };



  const continueAfterProfileCheck = async (firebaseUser: any) => {
    const result = await ensureUserProfile(firebaseUser);

    if (result.needsUsername || !result.profile) {
      // Close the login modal before showing username setup.
      setShowLoginModal(false);

      setNewUsername("");
      setUsernameMode("custom");
      setUsernameAvailable(null);
      setUsernameError("");
      setShowUsernameSetup(true);

      return false;
    }

    return true;
  };


  const checkUsernameAvailability = async () => {
    const username = newUsername.trim().replace(/^@/, "").toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      setUsernameAvailable(false);
      setUsernameError(
        "Use 3–30 lowercase letters, numbers or underscores."
      );
      return;
    }

    try {
      setUsernameChecking(true);
      setUsernameError("");

      const firebaseUser = auth.currentUser;
      const sessionToken = getLoginSession();

      if (!firebaseUser || !sessionToken) {
        throw new Error("Your login session has expired.");
      }

      const idToken = await firebaseUser.getIdToken(true);

      const response = await fetch(
        `${API_BASE}/user-profile/check-username?username=${encodeURIComponent(username)}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            "x-login-session": sessionToken,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not check username.");
      }

      setUsernameAvailable(data.available);

      if (!data.available) {
        setUsernameError("This username is already taken. Try another.");
      }
    } catch (error: any) {
      setUsernameAvailable(null);
      setUsernameError(error.message || "Could not check username.");
    } finally {
      setUsernameChecking(false);
    }
  };

  const submitUsernameSetup = async () => {
    if (usernameSubmitting) return;

    const username = newUsername.trim().replace(/^@/, "").toLowerCase();

    if (usernameMode === "custom") {
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        setUsernameError(
          "Use 3–30 lowercase letters, numbers or underscores."
        );
        return;
      }

      if (usernameAvailable !== true) {
        setUsernameError("Please check that your username is available first.");
        return;
      }
    }

    try {
      setUsernameSubmitting(true);
      setUsernameError("");

      const firebaseUser = auth.currentUser;
      const sessionToken = getLoginSession();

      if (!firebaseUser || !sessionToken) {
        throw new Error("Your login session has expired. Please log in again.");
      }

      const idToken = await firebaseUser.getIdToken(true);

      const response = await fetch(`${API_BASE}/user-profile/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          "x-login-session": sessionToken,
        },
        body: JSON.stringify(
          usernameMode === "custom"
            ? { mode: "custom", username }
            : { mode: "generate" }
        ),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.profile) {
        throw new Error(data.message || "Could not save your username.");
      }

      setShowUsernameSetup(false);
      setShowLoginOtp(false);
      setShowLoginModal(false);

      setLoginOtp("");
      setLoginActivityId("");

      toast.success(`Welcome to Internarea, @${data.profile.username}!`);

      window.location.reload();
    } catch (error: any) {
      console.error("Username setup error:", error);
      setUsernameError(error.message || "Could not save your username.");
    } finally {
      setUsernameSubmitting(false);
    }
  };
  const internshipAPI =
    "https://internshala-clone-a0st.onrender.com/api/internship";

  const jobAPI = `${process.env.NEXT_PUBLIC_API_URL || "https://internshala-clone-a0st.onrender.com"}/api/job`;

  // Open the authentication modal in Login mode.
  const openLoginModal = () => {
    setAuthMode("login");
    setShowPassword(false);
    setShowLoginModal(true);
  };

  // Close and reset the authentication modal.
  const closeLoginModal = () => {
    if (authLoading) return;

    setShowLoginModal(false);
    setLoginEmail("");
    setLoginPassword("");
    setShowPassword(false);
    setAuthMode("login");
  };
  const handleLoginOtpVerification = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loginOtpLoading) return;

    try {
      setLoginOtpLoading(true);

      const currentUser = auth.currentUser;

      if (!currentUser || !loginActivityId) {
        throw new Error(
          "Login verification session expired. Please log in again."
        );
      }

      // Verify the login OTP and create the backend session.
      await verifyLoginSecurity(
        currentUser,
        loginActivityId,
        loginOtp
      );

      // Check whether the user must change their password.
      const mustChangePassword =
        await checkMustChangePassword(currentUser);

      if (mustChangePassword) {
        setShowLoginOtp(false);
        setLoginOtp("");
        setLoginActivityId("");
        setShowLoginModal(false);

        toast.info("Please change your password to continue.");
        await router.push("/change-password");
        return;
      }

      // Create or retrieve the user's MongoDB profile.
      const profileReady = await continueAfterProfileCheck(currentUser);

      setShowLoginOtp(false);
      setLoginOtp("");
      setLoginActivityId("");

      if (!profileReady) {
        return;
      }

      setShowLoginModal(false);
      toast.success("Login verified successfully!");

      window.location.reload();
    } catch (error: any) {
      console.error("Login OTP verification error:", error);
      toast.error(error.message || "OTP verification failed.");
    } finally {
      setLoginOtpLoading(false);
    }
  };

  // Continue with Google.
  const handleLogin = async () => {
    if (authLoading) return;

    try {
      setAuthLoading(true);

      const credential = await signInWithPopup(auth, provider);
      const securityResult = await startLoginSecurity(credential.user);

      if (securityResult.otpRequired) {
        setLoginActivityId(securityResult.activityId);
        setShowLoginOtp(true);
        return;
      }

      const mustChangePassword = await checkMustChangePassword(
        credential.user
      );

      if (mustChangePassword) {
        toast.info("Please change your password to continue.");
        await router.push("/change-password");
        return;
      }

      // Create or retrieve the user's profile.
      const profileReady = await continueAfterProfileCheck(credential.user);

      if (!profileReady) return;

      toast.success(t.loginSuccess);
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
          error !== null &&
          "code" in error
          ? String(error.code)
          : "";

      console.error("Google login error code:", code);

      if (code === "auth/popup-closed-by-user") {
        toast.info("Google sign-in was cancelled.");
      } else {
        toast.error(t.loginFailed);
      }
    } finally {
      setAuthLoading(false);
    }
  };


  // Login using an existing email and password.
  const handleEmailLogin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (authLoading) return;

    const email = loginEmail.trim();

    if (!email || !loginPassword) {
      toast.error("Please enter your email and password.");
      return;
    }

    try {
      setAuthLoading(true);

      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        loginPassword
      );

      // Check email verification before creating a backend login session.
      if (!credential.user.emailVerified) {
        await signOut(auth);
        clearLoginSession();

        toast.error(
          "Please verify your email before logging in. Check your inbox for the verification link."
        );
        return;
      }

      const securityResult = await startLoginSecurity(credential.user);

      if (securityResult.otpRequired) {
        setLoginActivityId(securityResult.activityId);
        setShowLoginOtp(true);
        return;
      }
      const mustChangePassword = await checkMustChangePassword(
        credential.user
      );

      if (mustChangePassword) {
        toast.info("Please change your temporary password to continue.");
        setShowLoginModal(false);
        await router.push("/change-password");
        return;
      }

      // Create or retrieve the user's profile.
      const profileReady = await continueAfterProfileCheck(credential.user);

      if (!profileReady) return;

      toast.success("Login successful!");

      setShowLoginModal(false);
      setLoginEmail("");
      setLoginPassword("");
      setShowPassword(false);
      setAuthMode("login");
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
          error !== null &&
          "code" in error
          ? String(error.code)
          : "";

      console.error("Email login error code:", code);

      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        toast.error(
          "Email or password is incorrect. Check your details or reset your password."
        );
      } else if (code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please try again later.");
      } else if (code === "auth/user-disabled") {
        toast.error("This account has been disabled.");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setAuthLoading(false);
    }
  };


  // Resend the verification email for an existing account.

  // Resend the verification email for an existing account.
  const handleResendVerification = async () => {
    if (authLoading) return;

    const email = loginEmail.trim();

    if (!email || !loginPassword) {
      toast.error("Enter your registered email and password first.");
      return;
    }

    try {
      setAuthLoading(true);

      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        loginPassword
      );

      if (credential.user.emailVerified) {
        toast.info("Your email is already verified. You can log in.");
        return;
      }

      await sendEmailVerification(credential.user);

      toast.success(
        "Verification email sent. Check your inbox and spam folder."
      );
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
          error !== null &&
          "code" in error
          ? String(error.code)
          : "";

      console.error("Resend verification error:", code);

      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        toast.error("Email or password is incorrect. Check your details.");
      } else if (code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please wait before trying again.");
      } else {
        toast.error(
          "Could not resend the verification email. Please try again later."
        );
      }
    } finally {
      try {
        if (auth.currentUser) {
          await signOut(auth);
        }
      } catch (signOutError) {
        console.error("Sign-out after verification attempt failed:", signOutError);
      }

      clearLoginSession();
      setAuthLoading(false);
    }
  };




  // Register a new email/password account and require email verification.
  const handleSignUp = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (authLoading) return;

    const email = loginEmail.trim();

    if (!email || !loginPassword) {
      toast.error("Please enter your email and password.");
      return;
    }

    if (loginPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    try {
      setAuthLoading(true);

      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        loginPassword
      );

      try {
        await sendEmailVerification(credential.user);
      } catch (verificationError) {
        console.error(
          "Verification email error:",
          verificationError
        );

        await signOut(auth);

        toast.error(
          "Your account was created, but the verification email could not be sent. Please try logging in again to continue."
        );
        return;
      }

      await signOut(auth);

      toast.success(
        "Account created! Check your email and click the verification link before logging in."
      );

      setShowLoginModal(false);
      setLoginEmail("");
      setLoginPassword("");
      setShowPassword(false);
      setAuthMode("login");
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
          error !== null &&
          "code" in error
          ? String(error.code)
          : "";

      console.error("Sign-up error code:", code);

      if (code === "auth/email-already-in-use") {
        toast.error(
          "This email already has an account. Please log in."
        );
      } else if (code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.");
      } else if (code === "auth/weak-password") {
        toast.error("Please choose a stronger password.");
      } else if (code === "auth/operation-not-allowed") {
        toast.error(
          "Email/password registration is disabled in Firebase."
        );
      } else {
        toast.error(
          "Could not create your account. Please try again."
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };


  // Logout.
  const handleLogout = async () => {
    if (authLoading) return;

    try {
      setAuthLoading(true);

      const user = auth.currentUser;
      const sessionToken = getLoginSession();

      // Revoke the backend session before clearing its token.
      if (user && sessionToken) {
        try {
          const firebaseToken = await user.getIdToken();

          await fetch(
            "https://internshala-clone-a0st.onrender.com/api/login-security/logout",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${firebaseToken}`,
                "x-login-session": sessionToken,
                "Content-Type": "application/json",
              },
            }
          );
        } catch (sessionError) {
          console.error("Backend session logout failed:", sessionError);
        }
      }

      clearLoginSession();
      await signOut(auth);

      toast.success(t.logoutSuccess);
      await router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error(t.logoutFailed);
    } finally {
      setAuthLoading(false);
    }
  };

  // Change language safely.
  const handleLanguageChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedLanguage =
      event.target.value as typeof language;

    try {
      await setLanguage(selectedLanguage);
    } catch (error) {
      console.error("Language change error:", error);
      toast.error(t.languageChangeFailed);
    }
  };

  // Load search data.
  useEffect(() => {
    let active = true;

    const loadSearchData = async () => {
      setSearchLoading(true);

      let internships: any[] = [];
      let jobs: any[] = [];

      try {
        const [internshipResult, jobResult] =
          await Promise.allSettled([
            axios.get(internshipAPI),
            axios.get(jobAPI),
          ]);

        if (
          internshipResult.status === "fulfilled" &&
          Array.isArray(internshipResult.value.data)
        ) {
          internships = internshipResult.value.data.map(
            (item: any) => ({
              ...item,
              searchType: "internship",
            })
          );
        }

        if (
          jobResult.status === "fulfilled" &&
          Array.isArray(jobResult.value.data)
        ) {
          jobs = jobResult.value.data.map((item: any) => ({
            ...item,
            searchType: "job",
          }));
        }

        if (internshipResult.status === "rejected") {
          console.error(
            "Internship search API error:",
            internshipResult.reason
          );
        }

        if (jobResult.status === "rejected") {
          console.error(
            "Job search API error:",
            jobResult.reason
          );
        }

        if (active) {
          setSearchData([...internships, ...jobs]);
        }
      } catch (error) {
        console.error("Search data loading error:", error);
      } finally {
        if (active) {
          setSearchLoading(false);
        }
      }
    };

    void loadSearchData();

    return () => {
      active = false;
    };
  }, []);

  // Get searchable values.
  const getSearchValues = (item: any): string[] => {
    return [
      item?.title,
      item?.company,
      item?.category,
      item?.location,
    ].filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    );
  };

  // Suggestions while typing.
  useEffect(() => {
    const value = searchText.trim().toLowerCase();

    if (!value || searchLoading) {
      setSuggestions([]);
      return;
    }

    const allValues: string[] = [];

    searchData.forEach((item) => {
      getSearchValues(item).forEach((itemValue) => {
        if (itemValue.toLowerCase().includes(value)) {
          allValues.push(itemValue);
        }
      });
    });

    const uniqueValues = Array.from(
      new Map(
        allValues.map((itemValue) => [
          itemValue.toLowerCase(),
          itemValue,
        ])
      ).values()
    );

    setSuggestions(uniqueValues.slice(0, 8));
  }, [searchText, searchData, searchLoading]);

  // Search.
  const handleSearch = (selectedValue?: string) => {
    const value = (selectedValue || searchText).trim();

    if (!value) return;

    const search = value.toLowerCase();

    const internshipMatch = searchData.some(
      (item) =>
        item.searchType === "internship" &&
        getSearchValues(item).some((field) =>
          field.toLowerCase().includes(search)
        )
    );

    const jobMatch = searchData.some(
      (item) =>
        item.searchType === "job" &&
        getSearchValues(item).some((field) =>
          field.toLowerCase().includes(search)
        )
    );

    setSuggestions([]);
    setSearchText(value);

    if (internshipMatch) {
      void router.push(
        `/internship?search=${encodeURIComponent(value)}`
      );
      return;
    }

    if (jobMatch) {
      void router.push(
        `/job?search=${encodeURIComponent(value)}`
      );
      return;
    }

    toast.error(t.notFound);
  };

  // Enter key.
  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  };

  // Clear search on Home.
  useEffect(() => {
    if (router.pathname === "/") {
      setSearchText("");
      setSuggestions([]);
    }
  }, [router.pathname]);

  return (
    <div className="relative">
      <nav className="bg-white shadow-md">
        <div className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex h-16 w-full items-center">
            {/* Logo */}
            <div className="shrink-0">
              <Link
                href="/"
                onClick={() => {
                  setSearchText("");
                  setSuggestions([]);
                }}
              >
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-16"
                />
              </Link>
            </div>

            {/* Desktop navigation and search */}
            <div className="hidden flex-1 items-center justify-center gap-6 lg:gap-8 px-4 md:flex">
              <Link
                href="/internship"
                className="text-gray-700 hover:text-blue-600"
              >
                {t.internships}
              </Link>

              <Link
                href="/job"
                className="text-gray-700 hover:text-blue-600"
              >
                {t.jobs}
              </Link>

              <Link
                href="/public-space"
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700"
              >
                <Users size={18} />
                {t.publicSpace}
              </Link>
              {/* Search */}
              <div className="relative">
                <div className="flex items-center rounded-full bg-gray-100 px-4 py-2">
                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    aria-label={t.search}
                    className="focus:outline-none"
                  >
                    <Search
                      size={16}
                      className="text-gray-400 hover:text-blue-600"
                    />
                  </button>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) =>
                      setSearchText(event.target.value)
                    }
                    onKeyDown={handleSearchKeyDown}
                    placeholder={t.search}
                    className="ml-2 w-48 bg-transparent text-sm text-gray-700 placeholder:text-gray-500 focus:outline-none"
                  />
                </div>

                {searchText.trim() &&
                  suggestions.length > 0 && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                      {suggestions.map(
                        (suggestion, index) => (
                          <button
                            key={`${suggestion}-${index}`}
                            type="button"
                            onClick={() =>
                              handleSearch(suggestion)
                            }
                            className="w-full border-b px-4 py-3 text-left text-sm text-gray-700 last:border-b-0 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Search
                              size={14}
                              className="mr-2 inline"
                            />
                            {suggestion}
                          </button>
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* Language and authentication */}
            <div className="ml-auto flex shrink-0 items-center gap-3">
              <select
                value={language}
                onChange={handleLanguageChange}
                aria-label={t.language}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="hi">हिन्दी</option>
                <option value="pt">Português</option>
                <option value="zh">中文</option>
                <option value="fr">Français</option>
              </select>

              {user ? (
                <div className="flex items-center space-x-4">
                  <Link
                    href="/profile"
                    className="flex items-center space-x-2"
                  >
                    {user.photo ? (
                      <img
                        src={user.photo}
                        alt={user.name || t.profile}
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                        <User
                          size={18}
                          className="text-gray-500"
                        />
                      </div>
                    )}

                    <span className="hidden text-gray-700 lg:block">
                      {user.name}
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={authLoading}
                    className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    {authLoading ? t.loading : t.logout}
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={openLoginModal}
                    disabled={authLoading}
                    className="flex items-center justify-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <LogIn size={18} />
                    <span>
                      {authLoading ? t.loading : t.login}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={authLoading}
                    className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.09-1.92 3.28-4.74 3.28-8.07z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84C3.96 20.53 7.69 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.15C1.41 8.55 1 10.22 1 12s.41 3.45 1.15 4.94l3.69-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.07.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.69 1 3.96 3.47 2.15 7.06l3.69 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                      />
                    </svg>

                    <span className="text-gray-700">
                      {authLoading
                        ? t.loading
                        : t.continueGoogle}
                    </span>
                  </button>

                  <Link
                    href="/adminlogin"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    {t.admin}
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile icon */}
            {/* Mobile navigation */}
            <div className="flex items-center gap-3 md:hidden">
              <Link
                href="/public-space"
                aria-label={t.publicSpace}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
              >
                <Users size={18} />
                <span>{t.publicSpace}</span>
              </Link>

              <button
                type="button"
                onClick={user ? () => void router.push("/profile") : openLoginModal}
                className="text-gray-600"
                aria-label={t.profile}
              >
                <User size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Login and Create Account modal */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6"
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              !authLoading
            ) {
              closeLoginModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            {/* Modal heading */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2
                  id="auth-modal-title"
                  className="text-2xl font-bold text-gray-900"
                >
                  {authMode === "signup"
                    ? "Create your account"
                    : "Welcome back"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {authMode === "signup"
                    ? "Create your Internarea account using your email."
                    : "Log in to your Internarea account."}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close authentication form"
                disabled={authLoading}
                onClick={closeLoginModal}
                className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* Login / Create Account tabs */}
            <div className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${authMode === "login"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600"
                  }`}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${authMode === "signup"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600"
                  }`}
              >
                Create Account
              </button>
            </div>

            {/* Email and password form */}
            <form
              onSubmit={
                authMode === "signup"
                  ? handleSignUp
                  : handleEmailLogin
              }
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>

                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={loginEmail}
                  onChange={(event) =>
                    setLoginEmail(event.target.value)
                  }
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      authMode === "signup"
                        ? "new-password"
                        : "current-password"
                    }
                    minLength={authMode === "signup" ? 8 : undefined}
                    required
                    value={loginPassword}
                    onChange={(event) =>
                      setLoginPassword(event.target.value)
                    }
                    placeholder={
                      authMode === "signup"
                        ? "At least 8 characters"
                        : "Enter your password"
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-20 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-blue-600"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {authMode === "login" && (
                  <div className="mt-2 text-right">
                    <Link
                      href="/forgot-password"
                      onClick={() => {
                        setShowLoginModal(false);
                        setAuthMode("login");
                      }}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                )}

                {authMode === "signup" && (
                  <p className="mt-2 text-xs text-gray-500">
                    Use a password with at least 8 characters.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {authLoading
                  ? authMode === "signup"
                    ? "Creating account..."
                    : "Logging in..."
                  : authMode === "signup"
                    ? "Create Account"
                    : "Login"}
              </button>

              {authMode === "login" && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={authLoading}
                  className="w-full rounded-lg border border-blue-200 px-4 py-3 font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                >
                  {authLoading
                    ? "Please wait..."
                    : "Resend verification email"}
                </button>
              )}

            </form>

            {/* Google sign-in */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-sm text-gray-500">OR</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              type="button"
              disabled={authLoading}
              onClick={async () => {
                setShowLoginModal(false);
                await handleLogin();
              }}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.09-1.92 3.28-4.74 3.28-8.07z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84C3.96 20.53 7.69 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.15C1.41 8.55 1 10.22 1 12s.41 3.45 1.15 4.94l3.69-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.07.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.69 1 3.96 3.47 2.15 7.06l3.69 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                />
              </svg>

              Continue with Google
            </button>
          </div>


        </div>
      )}

      {showUsernameSetup && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 px-4 py-6">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="username-setup-title"
          >
            <h2
              id="username-setup-title"
              className="text-2xl font-bold text-gray-900"
            >
              Choose your username
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Your username will help other Internarea members find and mention you.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setUsernameMode("custom");
                  setUsernameAvailable(null);
                  setUsernameError("");
                }}
                className={`rounded-lg border p-3 text-sm font-semibold ${usernameMode === "custom"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-700"
                  }`}
              >
                Create my own
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsernameMode("generate");
                  setUsernameAvailable(null);
                  setUsernameError("");
                }}
                className={`rounded-lg border p-3 text-sm font-semibold ${usernameMode === "generate"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-700"
                  }`}
              >
                Generate for me
              </button>
            </div>

            {usernameMode === "custom" ? (
              <div className="mt-5">
                <label
                  htmlFor="new-internarea-username"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Your preferred username
                </label>

                <div className="flex items-center rounded-lg border border-gray-300 px-3 focus-within:border-blue-500">
                  <span className="text-gray-500">@</span>
                  <input
                    id="new-internarea-username"
                    type="text"
                    value={newUsername}
                    onChange={(event) => {
                      setNewUsername(
                        event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]/g, "")
                          .slice(0, 30)
                      );
                      setUsernameAvailable(null);
                      setUsernameError("");
                    }}
                    placeholder="your_username"
                    maxLength={30}
                    className="w-full border-0 px-2 py-3 text-gray-900 outline-none"
                  />
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  3–30 characters. Lowercase letters, numbers and underscores only.
                </p>

                <button
                  type="button"
                  onClick={checkUsernameAvailability}
                  disabled={usernameChecking || newUsername.length < 3}
                  className="mt-3 w-full rounded-lg border border-blue-600 px-4 py-2.5 font-medium text-blue-600 disabled:opacity-50"
                >
                  {usernameChecking ? "Checking..." : "Check availability"}
                </button>

                {usernameAvailable === true && (
                  <p className="mt-2 text-sm text-green-600">
                    Username is available!
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-gray-700">
                  Let Internarea generate a unique username based on your profile name.
                  You can use it to complete your account setup.
                </p>
              </div>
            )}

            {usernameError && (
              <p className="mt-3 text-sm text-red-600">
                {usernameError}
              </p>
            )}

            <button
              type="button"
              onClick={submitUsernameSetup}
              disabled={
                usernameSubmitting ||
                (usernameMode === "custom" && usernameAvailable !== true)
              }
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {usernameSubmitting
                ? "Saving username..."
                : usernameMode === "custom"
                  ? "Create my username"
                  : "Generate and continue"}
            </button>
          </div>
        </div>
      )}
      {showLoginOtp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900">
              Verify your login
            </h2>

            <p className="mt-3 text-sm text-gray-600">
              Enter the six-digit verification code sent to your registered email.
            </p>

            <form onSubmit={handleLoginOtpVerification} className="mt-6 space-y-4">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={loginOtp}
                onChange={(event) =>
                  setLoginOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Enter 6-digit OTP"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-xl tracking-[0.4em] text-gray-900"
              />

              <button
                type="submit"
                disabled={loginOtpLoading || loginOtp.length !== 6}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {loginOtpLoading ? "Verifying..." : "Verify and Continue"}
              </button>

              <button
                type="button"
                disabled={loginOtpLoading}
                onClick={async () => {
                  try {
                    if (auth.currentUser) {
                      await signOut(auth);
                    }

                    clearLoginSession();
                    setShowLoginOtp(false);
                    setLoginOtp("");
                    setLoginActivityId("");
                    toast.info("Please log in again.");
                  } catch {
                    toast.error("Unable to cancel login.");
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700"
              >
                Cancel login
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
