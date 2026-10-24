import Navbar from "@/Components/Navbar";
import "../../styles/globals.css";
import type { AppProps } from "next/app";
import Footer from "@/Components/Fotter";
import { store } from "../store/store1";
import { Provider, useDispatch } from "react-redux";
import { useEffect } from "react";
import { auth } from "@/firebase/firebase";
import { login, logout } from "@/Feature/Userslice";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { LanguageProvider } from "../../context/LanguageContext";

function AuthListener() {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authuser) => {
      if (authuser) {
        dispatch(
          login({
            uid: authuser.uid,
            photo: authuser.photoURL,
            name: authuser.displayName,
            email: authuser.email,
            phoneNumber: authuser.phoneNumber,
          })
        );
      } else {
        dispatch(logout());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <AuthListener />

      <LanguageProvider>
        <Navbar />
        <Component {...pageProps} />
        <Footer />
        <ToastContainer position="top-right" autoClose={3000} />
      </LanguageProvider>
    </Provider>
  );
}