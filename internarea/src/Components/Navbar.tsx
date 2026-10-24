
import Link from "next/link";
import { auth, provider } from "../firebase/firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { Search, User, LogIn } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { useLanguage } from "../../context/LanguageContext";
import { useRouter } from "next/router";
import axios from "axios";

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

  // Continue with Google.
  const handleLogin = async () => {
    if (authLoading) return;

    try {
      setAuthLoading(true);

      await signInWithPopup(auth, provider);

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

      await signInWithEmailAndPassword(
        auth,
        email,
        loginPassword
      );

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

  // Register a new email/password account.
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

      await createUserWithEmailAndPassword(
        auth,
        email,
        loginPassword
      );

      toast.success("Account created successfully!");

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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
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
            <div className="hidden items-center space-x-8 md:flex">
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
            <div className="flex items-center space-x-4">
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
                <div className="flex items-center space-x-3">
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
                    className="flex items-center justify-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
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
            <div className="md:hidden">
              <button
                type="button"
                onClick={user ? undefined : openLoginModal}
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
                className={`rounded-md px-3 py-2 text-sm font-semibold ${
                  authMode === "login"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${
                  authMode === "signup"
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
    </div>
  );
};

export default Navbar;
