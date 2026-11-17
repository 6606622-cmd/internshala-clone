
import { useCallback, useEffect, useState } from "react";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useLanguage } from "../../context/LanguageContext";

const API_BASE = "https://internshala-clone-a0st.onrender.com/api";
const LOGIN_SESSION_KEY = "internarea_login_session";

type NotificationItem = {
  _id: string;
  recipientUid: string;
  actorUid: string;
  type:
    | "like"
    | "comment"
    | "share"
    | "friend_request"
    | "friend_accepted"
    | "mention";
  message: string;
  postId?: string | null;
  friendshipId?: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationTranslations = {
  signInToViewNotifications: string;
  notificationSessionMissing: string;
  notificationRequestFailed: string;
};

async function apiRequest<T>(
  path: string,
  method = "GET",
  messages: NotificationTranslations
): Promise<T> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(messages.signInToViewNotifications);
  }

  const [firebaseToken, sessionToken] = await Promise.all([
    user.getIdToken(),
    Promise.resolve(
      typeof window !== "undefined"
        ? localStorage.getItem(LOGIN_SESSION_KEY)
        : null
    ),
  ]);

  if (!sessionToken) {
    throw new Error(messages.notificationSessionMissing);
  }

  const response = await fetch(
    `${API_BASE}/public-space/notifications${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
        "x-login-session": sessionToken,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(messages.notificationRequestFailed);
  }

  const data = await response.json().catch(() => ({}));
  return data as T;
}

function notificationIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "like":
      return "❤️";
    case "comment":
      return "💬";
    case "friend_request":
      return "👋";
    case "friend_accepted":
      return "🤝";
    case "mention":
      return "@";
    case "share":
      return "↗";
    default:
      return "🔔";
  }
}

function timeAgo(dateString: string, language: string) {
  const date = new Date(dateString);
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  const localeMap: Record<string, string> = {
    en: "en",
    es: "es",
    hi: "hi",
    pt: "pt",
    zh: "zh-CN",
    fr: "fr",
  };

  const locale = localeMap[language] || "en";

  const formatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  });

  if (seconds < 60) {
    return formatter.format(0, "second");
  }

  if (seconds < 3600) {
    return formatter.format(-Math.floor(seconds / 60), "minute");
  }

  if (seconds < 86400) {
    return formatter.format(-Math.floor(seconds / 3600), "hour");
  }

  if (seconds < 604800) {
    return formatter.format(-Math.floor(seconds / 86400), "day");
  }

  return date.toLocaleDateString(locale);
}

export default function NotificationBell() {
  const { t, language } = useLanguage();

  const messages: NotificationTranslations = {
    signInToViewNotifications: t.signInToViewNotifications,
    notificationSessionMissing: t.notificationSessionMissing,
    notificationRequestFailed: t.notificationRequestFailed,
  };

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    if (!auth.currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await apiRequest<{
        notifications: NotificationItem[];
        unreadCount: number;
      }>("", "GET", messages);

      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.notificationLoadFailed
      );
    } finally {
      setLoading(false);
    }
  }, [t, messages.signInToViewNotifications, messages.notificationSessionMissing, messages.notificationRequestFailed]);

  useEffect(() => {
    let active = true;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let initialTimeout: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (intervalId) clearInterval(intervalId);
      if (initialTimeout) clearTimeout(initialTimeout);

      if (!firebaseUser) {
        setNotifications([]);
        setUnreadCount(0);
        setError("");
        setLoading(false);
        return;
      }

      initialTimeout = setTimeout(() => {
        if (active) {
          void loadNotifications();
        }
      }, 1500);

      intervalId = setInterval(() => {
        if (active && auth.currentUser) {
          void loadNotifications();
        }
      }, 15000);
    });

    return () => {
      active = false;
      unsubscribe();

      if (intervalId) clearInterval(intervalId);
      if (initialTimeout) clearTimeout(initialTimeout);
    };
  }, [loadNotifications]);

  async function markAsRead(notification: NotificationItem) {
    if (notification.isRead || busyId) return;

    setBusyId(notification._id);
    setError("");

    try {
      await apiRequest(
        `/${encodeURIComponent(notification._id)}/read`,
        "PATCH",
        messages
      );

      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id
            ? { ...item, isRead: true }
            : item
        )
      );

      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.notificationMarkReadFailed
      );
    } finally {
      setBusyId(null);
    }
  }

  async function markAllAsRead() {
    if (busyId || unreadCount === 0) return;

    setBusyId("all");
    setError("");

    try {
      await apiRequest("/read-all", "PATCH", messages);

      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true }))
      );

      setUnreadCount(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.notificationMarkAllReadFailed
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={`${t.notifications}, ${unreadCount} ${t.unread}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-xl shadow-sm transition hover:bg-gray-50"
      >
        🔔

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label={t.closeNotifications}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />

          <section className="fixed left-4 right-4 top-28 z-50 mx-auto w-auto max-w-[390px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[390px]">
            <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {t.notifications}
                </h2>
                <p className="text-xs text-gray-500">
                  {unreadCount} {t.unread}
                </p>
              </div>

              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0 || busyId !== null}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.markAllRead}
              </button>
            </header>

            {error && (
              <div className="px-4 py-3 text-sm text-red-600">
                {error}
                <button
                  type="button"
                  onClick={() => void loadNotifications()}
                  className="ml-2 font-semibold underline"
                >
                  {t.retry}
                </button>
              </div>
            )}

            <div className="max-h-[420px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-500">
                  {t.loadingNotifications}
                </p>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mb-2 text-3xl">🔔</div>
                  <p className="font-semibold text-gray-800">
                    {t.allCaughtUp}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {t.notificationEmptyDescription}
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification._id}
                    onClick={() => void markAsRead(notification)}
                    disabled={busyId !== null}
                    className={`flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50 disabled:opacity-60 ${
                      notification.isRead ? "bg-white" : "bg-blue-50/70"
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg">
                      {notificationIcon(notification.type)}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm text-gray-800">
                        {notification.message}
                      </span>

                      <span className="mt-1 block text-xs text-gray-500">
                        {timeAgo(notification.createdAt, language)}
                      </span>
                    </span>

                    {!notification.isRead && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    )}
                  </button>
                ))
              )}
            </div>

            <footer className="border-t border-gray-100 px-4 py-2">
              <button
                type="button"
                onClick={() => void loadNotifications()}
                disabled={loading}
                className="w-full rounded-lg py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? t.refreshing : t.refresh}
              </button>
            </footer>
          </section>
        </>
      )}
    </div>
  );
}
