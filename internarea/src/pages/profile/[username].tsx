
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "@/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";

const API_BASE =
  "https://internshala-clone-a0st.onrender.com/api";

type Profile = {
  firebaseUid: string;
  username: string;
  displayName?: string;
  photoURL?: string;
};

export default function PublicProfilePage() {
  const router = useRouter();
  const { username } = router.query;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!router.isReady) return;

    if (typeof username !== "string") {
      setError("Invalid profile username.");
      setLoading(false);
      return;
    }

    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      try {
        setLoading(true);
        setError("");
        setProfile(null);

        if (!user) {
          throw new Error("Please sign in to view this profile.");
        }

        const token = await user.getIdToken();

        const sessionToken = localStorage.getItem(
          "internarea_login_session"
        );

        if (!sessionToken) {
          throw new Error(
            "Your login session is missing. Please sign in again."
          );
        }

        const response = await axios.get(
          `${API_BASE}/user-profile/${encodeURIComponent(username)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "x-login-session": sessionToken,
            },
          }
        );

        const matchedUser: Profile = response.data.profile;

        if (!matchedUser?.username) {
          throw new Error("Invalid profile response.");
        }

        if (active) {
          setProfile(matchedUser);
        }
      } catch (err: any) {
        if (active) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Unable to load this profile."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router.isReady, username]);

  if (loading) {
    return (
      <div className="p-10 text-center">
        Loading profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-xl mx-auto p-10 text-center">
        <h1 className="text-xl font-bold text-gray-800">
          Profile unavailable
        </h1>

        <p className="mt-2 text-gray-600">
          {error || "This profile does not exist."}
        </p>

        <Link
          href="/public-space"
          className="text-blue-600 mt-4 inline-block hover:underline"
        >
          Return to Public Space
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border p-8">
        <div className="flex flex-col items-center text-center">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName || profile.username}
              className="w-28 h-28 rounded-full object-cover border-4 border-gray-100"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-blue-100 flex items-center justify-center text-4xl font-bold text-blue-600">
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}

          <h1 className="text-2xl font-bold text-gray-900 mt-4">
            {profile.displayName || profile.username}
          </h1>

          <p className="text-blue-600 mt-1">
            @{profile.username}
          </p>
        </div>
      </div>
    </main>
  );
}
