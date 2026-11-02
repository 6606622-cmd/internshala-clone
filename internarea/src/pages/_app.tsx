
import Navbar from "@/Components/Navbar";
import "../../styles/globals.css";
import type { AppProps } from "next/app";
import Footer from "@/Components/Fotter";
import { store } from "../store/store1";
import { Provider, useDispatch } from "react-redux";
import { useEffect } from "react";
import axios from "axios";
import { auth } from "@/firebase/firebase";
import { login, logout } from "@/Feature/Userslice";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { LanguageProvider } from "../../context/LanguageContext";
import { getIdTokenResult } from "firebase/auth";
import PasswordRouteGuard from "@/Components/PasswordRouteGuard";

const LOGIN_SESSION_KEY = "internarea_login_session";

function AuthListener() {
  const dispatch = useDispatch();

  useEffect(() => {
    let active = true;

    const unsubscribe = auth.onAuthStateChanged(async (authuser) => {
      if (!active) return;

      if (!authuser) {
        dispatch(logout());
        return;
      }

      try {
        const tokenResult = await getIdTokenResult(authuser, true);

        if (!active) return;

        dispatch(
          login({
            uid: authuser.uid,
            photo: authuser.photoURL,
            name: authuser.displayName,
            email: authuser.email,
            phoneNumber: authuser.phoneNumber,
            mustChangePassword:
              tokenResult.claims.mustChangePassword === true,
          })
        );
      } catch (error) {
        console.error("Unable to check authentication claims:", error);

        if (active) {
          dispatch(logout());
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [dispatch]);

  return null;
}

function ApiSecurityInterceptor() {
  useEffect(() => {
    const interceptorId = axios.interceptors.request.use(
      async (config) => {
        const user = auth.currentUser;

        if (user) {
          const idToken = await user.getIdToken();

          config.headers.set(
            "Authorization",
            `Bearer ${idToken}`
          );

          const sessionToken =
            localStorage.getItem(LOGIN_SESSION_KEY);

          if (sessionToken) {
            config.headers.set(
              "X-Login-Session",
              sessionToken
            );
          } else {
            config.headers.delete("X-Login-Session");
          }
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axios.interceptors.request.eject(interceptorId);
    };
  }, []);

  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <AuthListener />
      <ApiSecurityInterceptor />
      <PasswordRouteGuard />

      <LanguageProvider>
        <Navbar />
        <Component {...pageProps} />
        <Footer />
        <ToastContainer position="top-right" autoClose={3000} />
      </LanguageProvider>
    </Provider>
  );
}
