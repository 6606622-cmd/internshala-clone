
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";

const ADMIN_API =
  "https://internshala-clone-a0st.onrender.com/api/admin";

type Props = {
  children: React.ReactNode;
};

export default function AdminRouteGuard({ children }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!router.isReady) return;

    let active = true;

    const verifyAdmin = async () => {
      try {
        await axios.get(`${ADMIN_API}/me`, {
          withCredentials: true,
        });

        if (active) {
          setChecking(false);
          setError("");
        }
      } catch (err: any) {
        if (!active) return;

        if (err.response?.status === 401) {
          await router.replace("/adminlogin");
          return;
        }

        console.error("Admin session verification failed:", err);

        setError(
          "Unable to verify your admin session. Please check your connection and try again."
        );
        setChecking(false);
      }
    };

    verifyAdmin();

    return () => {
      active = false;
    };
  }, [router, router.isReady]);

  if (checking) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
        <p className="text-gray-600">
          Verifying admin session...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-center text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-blue-600 px-5 py-2 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
