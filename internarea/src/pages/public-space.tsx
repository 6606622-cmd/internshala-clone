
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { auth } from "../firebase/firebase";
import NotificationBell from "../Components/NotificationBell";
import { useLanguage } from "../../context/LanguageContext";

const API_URL = "https://internshala-clone-a0st.onrender.com/api";

type PostMedia = {
  type: "image" | "video";
  url: string;
  storageKey?: string;
  contentHash?: string;
};

type PublicPost = {
  _id: string;
  authorUid: string;
  authorProfile?: {
    displayName?: string;
    username?: string;
    photoURL?: string;
  };
  text: string;
  media: PostMedia[];
  mediaType: "text" | "image" | "video" | "mixed";
  privacy: "public" | "friends";
  likesCount: number;
  commentsCount: number;
  sharesCount?: number;
  viewsCount?: number;
  createdAt: string;
  editUntil?: string;
};

type FriendshipRequest = {
  _id: string;
  userAUid: string;
  userBUid: string;
  requestedByUid: string;
  status: "pending" | "accepted" | "rejected" | "blocked";
  createdAt?: string;
};

type PostComment = {
  id: string;
  userUid: string;
  text: string;
  createdAt: string;
  displayName?: string;
  username?: string;
};

type MentionUser = {
  firebaseUid: string;
  username: string;
  displayName?: string;
  photoURL?: string;
};

type REPORT_REASON =
  | "spam"
  | "harassment"
  | "inappropriate"
  | "misinformation"
  | "other";

type FriendEntry = {
  friendshipId: string;
  uid: string;
  since?: string;
};

type UploadedVideo = {
  type: "video";
  url: string;
  storageKey?: string;
  contentHash?: string;
};

type VideoSource =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "drive"; embedUrl: string }
  | { kind: "direct"; url: string };

function getVideoSource(url: string): VideoSource {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtube-nocookie.com" ||
    host === "youtu.be"
  ) {
    let videoId = "";

    if (host === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } else {
      videoId =
        parsed.searchParams.get("v") ||
        parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ||
        "";
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      throw new Error("This YouTube video link is invalid.");
    }

    return {
      kind: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    };
  }

  if (host === "drive.google.com") {
    const fileId =
      parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
      parsed.searchParams.get("id");

    if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
      throw new Error("This Google Drive video link is invalid.");
    }

    return {
      kind: "drive",
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    };
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Video links must use HTTPS.");
  }

  return { kind: "direct", url: parsed.toString() };
}

async function apiRequest<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in to InternArea first.");
  }

  const sessionToken = localStorage.getItem("internarea_login_session");

  if (!sessionToken) {
    throw new Error("Login session is missing. Please sign in again.");
  }

  const firebaseToken = await user.getIdToken();

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${firebaseToken}`);
  headers.set("x-login-session", sessionToken);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Request failed with status ${response.status}.`
    );
  }

  return data as T;
}

function PublicSpaceVideo({
  url,
  onFullscreen,
}: {
  url: string;
  onFullscreen: (url: string, type: "youtube" | "drive" | "direct") => void;
}) {
  const { t } = useLanguage();

  let source: VideoSource;

  try {
    source = getVideoSource(url);
  } catch {
    return (
      <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
        {t.invalidVideoLink}
      </p>
    );
  }

  return (
    <div className="relative mt-3 overflow-hidden rounded-xl bg-black">
      {source.kind === "youtube" || source.kind === "drive" ? (
        <iframe
          src={source.embedUrl}
          title="Public Space video"
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <video
          src={source.url}
          controls
          playsInline
          preload="metadata"
          className="max-h-[500px] w-full object-contain"
        >
          {t.browserVideoUnsupported}
        </video>
      )}

      <button
        type="button"
        onClick={() =>
          onFullscreen(
            source.kind === "direct" ? source.url : source.embedUrl,
            source.kind
          )
        }
        className="absolute right-3 top-3 rounded-lg bg-black/70 px-3 py-2 text-sm font-semibold text-white"
      >
        {t.fullscreen}
      </button>
    </div>
  );
}

function PostText({
  text,
  onHashtagClick,
  onMentionClick,
}: {
  text: string;
  onHashtagClick: (tag: string) => void;
  onMentionClick: (username: string) => void;
}) {
  return (
    <p className="whitespace-pre-wrap break-words leading-7">
      {renderPublicText(text, onHashtagClick, onMentionClick)}
    </p>
  );
}

function renderPublicText(
  value: string,
  onHashtagClick: (tag: string) => void,
  onMentionClick: (username: string) => void
) {
  const parts = value.split(/(#[\p{L}\p{N}_]+|@[\p{L}\p{N}_]+)/gu);

  return parts.map((part, index) => {
    if (part.startsWith("#")) {
      return (
        <button
          key={index}
          type="button"
          onClick={() => onHashtagClick(part.slice(1))}
          className="font-semibold text-indigo-600 hover:underline"
        >
          {part}
        </button>
      );
    }

    if (part.startsWith("@")) {
      return (
        <button
          key={index}
          type="button"
          onClick={() => onMentionClick(part.slice(1))}
          className="font-semibold text-sky-700 hover:underline"
        >
          {part}
        </button>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

export default function PublicSpacePage() {
  const { t } = useLanguage();

  // Report labels are kept inside the component so they use the active language.
  const REPORT_REASONS: { value: REPORT_REASON; label: string }[] = [
    { value: "spam", label: t.spam },
    { value: "harassment", label: t.harassment },
    { value: "inappropriate", label: t.inappropriateContent },
    { value: "misinformation", label: t.misinformation },
    { value: "other", label: t.other },
  ];

  // Translate only known local fallback errors. Backend-provided messages
  // and user-generated content are deliberately preserved.
  const localizeError = (message: string): string => {
    const errorMessages: Record<string, string> = {
      "Please sign in to InternArea first.": t.signInFirst,
      "You have reached your daily posting limit.": t.postLimitReached,
      "Login session is missing. Please sign in again.": t.missingLoginSession,
      "Could not load posts.": t.couldNotLoadPosts,
      "Enter a valid hashtag.": t.validHashtagRequired,
      "Could not search hashtags.": t.couldNotSearchHashtags,
      "Could not load friendship information.": t.couldNotLoadFriendships,
      "This YouTube video link is invalid.": t.invalidYoutubeLink,
      "This Google Drive video link is invalid.": t.invalidDriveLink,
      "Video links must use HTTPS.": t.videoMustUseHttps,
      "Choose an MP4, WebM, MOV or OGG video.": t.chooseSupportedVideo,
      "Video size must not exceed 50 MB.": t.videoSizeLimit,
      "Could not search users.": t.couldNotSearchUsers,
      "Add text, a media URL, or select a video.": t.postContentRequired,
      "Media URLs must use HTTPS.": t.mediaMustUseHttps,
      "Could not publish your post.": t.couldNotPublishPost,
      "Could not send friend request.": t.couldNotSendFriendRequest,
      "Could not respond to friend request.": t.couldNotRespondFriendRequest,
      "Are you sure you want to remove this friend?": t.confirmRemoveFriend,
      "Could not remove friend.": t.couldNotRemoveFriend,
      "Action failed.": t.actionFailed,
      "Could not load comments.": t.couldNotLoadComments,
      "Could not add comment.": t.couldNotAddComment,
      "Could not delete comment.": t.couldNotDeleteComment,
      "Could not share this post on this device.": t.couldNotSharePost,
    };

    return errorMessages[message] || message;
  };

  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [hashtagSearch, setHashtagSearch] = useState("");
  const [activeHashtag, setActiveHashtag] = useState("");
  const [hashtagLoading, setHashtagLoading] = useState(false);
  const [text, setText] = useState("");
  const postTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(-1);
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionError, setMentionError] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "friends">("public");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [targetUid, setTargetUid] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [friendshipsLoading, setFriendshipsLoading] = useState(true);
  const [friendshipError, setFriendshipError] = useState("");
  const [friendshipNotice, setFriendshipNotice] = useState("");
  const [friends, setFriends] = useState<(FriendEntry | string)[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendshipRequest[]>([]);
  const [respondingId, setRespondingId] = useState("");

  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  const [busyActions, setBusyActions] = useState<Record<string, boolean>>({});
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [actionNotices, setActionNotices] = useState<Record<string, string>>({});

  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [deletingCommentId, setDeletingCommentId] = useState("");

  const [reportReasons, setReportReasons] = useState<Record<string, REPORT_REASON>>({});

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editPrivacy, setEditPrivacy] = useState<"public" | "friends">("public");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [fullscreenVideo, setFullscreenVideo] = useState<{
    url: string;
    type: "youtube" | "drive" | "direct";
  } | null>(null);

  const currentUid = auth.currentUser?.uid;

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest<{ posts?: PublicPost[] }>("/public-space/posts");
      const loadedPosts = data.posts || [];

      console.table(
        loadedPosts.map((post) => ({
          authorUid: post.authorUid,
          usernameFromAPI: post.authorProfile?.username,
          displayName: post.authorProfile?.displayName,
        }))
      );

      setPosts(loadedPosts);
      setLikedPosts({});
      setSavedPosts({});

      for (let i = 0; i < loadedPosts.length; i += 100) {
        const batch = loadedPosts.slice(i, i + 100);
        if (!batch.length) continue;

        const query = new URLSearchParams({
          postIds: batch.map((post) => post._id).join(","),
        });

        const status = await apiRequest<{
          likedPostIds?: string[];
          savedPostIds?: string[];
        }>(`/public-space/interactions/status?${query}`);

        setLikedPosts((prev) => {
          const next = { ...prev };
          batch.forEach((post) => {
            next[post._id] = (status.likedPostIds || []).includes(post._id);
          });
          return next;
        });

        setSavedPosts((prev) => {
          const next = { ...prev };
          batch.forEach((post) => {
            next[post._id] = (status.savedPostIds || []).includes(post._id);
          });
          return next;
        });
      }
    } catch (err) {
      setError(
        localizeError(
          err instanceof Error ? err.message : "Could not load posts."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const searchHashtag = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const tag = hashtagSearch.trim().replace(/^#/, "").toLowerCase();

    if (!/^[\p{L}\p{N}_]{1,50}$/u.test(tag)) {
      setError(t.validHashtagRequired);
      return;
    }

    setHashtagLoading(true);
    setError("");
    setNotice("");

    try {
      const data = await apiRequest<{ posts?: PublicPost[] }>(
        `/public-space/posts/hashtag/${encodeURIComponent(tag)}`
      );

      const foundPosts = data.posts || [];

      setPosts(foundPosts);
      setActiveHashtag(tag);
      setLikedPosts({});
      setSavedPosts({});

      for (let i = 0; i < foundPosts.length; i += 100) {
        const batch = foundPosts.slice(i, i + 100);
        if (!batch.length) continue;

        const query = new URLSearchParams({
          postIds: batch.map((post) => post._id).join(","),
        });

        const status = await apiRequest<{
          likedPostIds?: string[];
          savedPostIds?: string[];
        }>(`/public-space/interactions/status?${query}`);

        setLikedPosts((prev) => {
          const next = { ...prev };
          batch.forEach((post) => {
            next[post._id] = (status.likedPostIds || []).includes(post._id);
          });
          return next;
        });

        setSavedPosts((prev) => {
          const next = { ...prev };
          batch.forEach((post) => {
            next[post._id] = (status.savedPostIds || []).includes(post._id);
          });
          return next;
        });
      }
    } catch (err) {
      setError(
        localizeError(
          err instanceof Error ? err.message : "Could not search hashtags."
        )
      );
    } finally {
      setHashtagLoading(false);
    }
  };

  const showAllPosts = () => {
    setHashtagSearch("");
    setActiveHashtag("");
    void loadPosts();
  };

  const loadFriendships = useCallback(async () => {
    setFriendshipsLoading(true);
    setFriendshipError("");

    try {
      const [friendsData, requestsData] = await Promise.all([
        apiRequest<{ friends?: FriendEntry[] }>("/public-space/friendships/friends"),
        apiRequest<{ requests?: FriendshipRequest[] }>(
          "/public-space/friendships/requests/incoming"
        ),
      ]);

      setFriends(friendsData.friends || []);
      setIncomingRequests(requestsData.requests || []);
    } catch (err) {
      setFriendshipError(
        localizeError(
          err instanceof Error
            ? err.message
            : "Could not load friendship information."
        )
      );
    } finally {
      setFriendshipsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!active) return;

      if (user) {
        try {
          const data = await apiRequest<{
            success: boolean;
            profile: {
              firebaseUid: string;
              username: string;
              displayName: string;
              photoURL: string;
            } | null;
            needsUsername?: boolean;
          }>("/user-profile/me");

          if (!active) return;

          console.log("User profile ready:", data.profile);

          if (!data.profile) {
            console.error("Profile was not created by the backend.");
          }
        } catch (error) {
          if (active) {
            console.error("Profile initialization failed:", error);
          }
        }

        if (!active) return;

        void loadPosts();
        void loadFriendships();
      } else {
        setPosts([]);
        setFriends([]);
        setIncomingRequests([]);
        setLikedPosts({});
        setSavedPosts({});
        setCommentsByPost({});
        setOpenComments({});
        setLoading(false);
        setFriendshipsLoading(false);
        setError(t.signInToViewPublicSpace);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadPosts, loadFriendships, t.signInToViewPublicSpace]);

  const uploadVideo = async (file: File): Promise<UploadedVideo> => {
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/ogg",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Choose an MP4, WebM, MOV or OGG video.");
    }

    if (file.size > 50 * 1024 * 1024) {
      throw new Error("Video size must not exceed 50 MB.");
    }

    const formData = new FormData();
    formData.append("video", file);

    setUploadingVideo(true);
    setUploadProgress(0);

    try {
      // Fetch does not provide upload progress events.
      // This indicates that the upload is in progress, not an exact percentage.
      setUploadProgress(50);

      const result = await apiRequest<{
        media: UploadedVideo;
        message?: string;
      }>("/public-space/uploads/video", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(100);
      return result.media;
    } finally {
      setUploadingVideo(false);
    }
  };

  const searchMentionUsers = useCallback(async (query: string) => {
    if (query.length < 1) {
      setMentionUsers([]);
      setMentionLoading(false);
      return;
    }

    setMentionLoading(true);
    setMentionError("");

    try {
      const data = await apiRequest<{ users?: MentionUser[] }>(
        `/user-profile/search?q=${encodeURIComponent(query)}`
      );

      setMentionUsers(data.users || []);
    } catch (err) {
      setMentionUsers([]);
      setMentionError(
        localizeError(
          err instanceof Error ? err.message : "Could not search users."
        )
      );
    } finally {
      setMentionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mentionQuery === null) {
      setMentionUsers([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void searchMentionUsers(mentionQuery);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [mentionQuery, searchMentionUsers]);

  const handlePostTextChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    const cursor = event.target.selectionStart;

    setText(value);

    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/(^|[\s(])@([a-zA-Z0-9_]{0,30})$/);

    if (match) {
      setMentionStart(cursor - match[2].length - 1);
      setMentionQuery(match[2].toLowerCase());
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
      setMentionUsers([]);
      setMentionError("");
    }
  };

  const selectMentionUser = (user: MentionUser) => {
    if (mentionStart < 0) return;

    const before = text.slice(0, mentionStart);
    const cursor = postTextareaRef.current?.selectionStart ?? text.length;

    // Replace the currently typed @username fragment.
    const afterMatch = text.slice(cursor);
    const nextText = `${before}@${user.username} ${afterMatch}`;

    setText(nextText);
    setMentionQuery(null);
    setMentionStart(-1);
    setMentionUsers([]);
    setMentionError("");

    requestAnimationFrame(() => {
      const textarea = postTextareaRef.current;
      if (!textarea) return;

      const nextCursor = before.length + user.username.length + 2;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const createPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (publishing || uploadingVideo) return;

    const cleanText = text.trim();
    const cleanUrl = mediaUrl.trim();

    if (!cleanText && !cleanUrl && !videoFile) {
      setError(t.postContentRequired);
      return;
    }

    setPublishing(true);
    setError("");
    setNotice("");

    try {
      let media: PostMedia[] = [];

      if (videoFile) {
        const uploaded = await uploadVideo(videoFile);
        media.push(uploaded);
      } else if (cleanUrl) {
        const parsed = new URL(cleanUrl);

        if (parsed.protocol !== "https:") {
          throw new Error("Media URLs must use HTTPS.");
        }

        if (mediaType === "video") {
          getVideoSource(cleanUrl);
        }

        media.push({
          type: mediaType,
          url: parsed.toString(),
        });
      }

      await apiRequest("/public-space/posts", {
        method: "POST",
        body: JSON.stringify({
          text: cleanText,
          media,
          privacy,
        }),
      });

      setText("");
      setMediaUrl("");
      setVideoFile(null);
      setMediaType("image");
      setPrivacy("public");

      setNotice(t.postPublished);
      await loadPosts();
    } catch (err) {
      setError(
        localizeError(
          err instanceof Error ? err.message : "Could not publish your post."
        )
      );
    } finally {
      setPublishing(false);
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const sendFriendRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const uid = targetUid.trim();
    if (!uid || sendingRequest) return;

    setSendingRequest(true);
    setFriendshipError("");
    setFriendshipNotice("");

    try {
      const data = await apiRequest<{ message?: string }>(
        `/public-space/friendships/request/${encodeURIComponent(uid)}`,
        { method: "POST" }
      );

      setTargetUid("");
      setFriendshipNotice(data.message || t.friendRequestSent);
      await loadFriendships();
    } catch (err) {
      setFriendshipError(
        localizeError(
          err instanceof Error ? err.message : "Could not send friend request."
        )
      );
    } finally {
      setSendingRequest(false);
    }
  };

  const respondToRequest = async (
    request: FriendshipRequest,
    action: "accept" | "reject"
  ) => {
    if (respondingId) return;
    setRespondingId(request._id);
    setFriendshipError("");
    setFriendshipNotice("");

    try {
      const data = await apiRequest<{ message?: string }>(
        `/public-space/friendships/${encodeURIComponent(request._id)}/respond`,
        {
          method: "PATCH",
          body: JSON.stringify({ action }),
        }
      );

      setFriendshipNotice(
        data.message ||
          (action === "accept" ? t.friendRequestAccepted : t.friendRequestRejected)
      );

      await loadFriendships();
      await loadPosts();
    } catch (err) {
      setFriendshipError(
        localizeError(
          err instanceof Error
            ? err.message
            : "Could not respond to friend request."
        )
      );
    } finally {
      setRespondingId("");
    }
  };

  const unfollowFriend = async (friend: FriendEntry) => {
    if (!window.confirm(t.confirmRemoveFriend)) {
      return;
    }

    setFriendshipError("");
    setFriendshipNotice("");

    try {
      const data = await apiRequest<{ message?: string }>(
        `/public-space/friendships/${encodeURIComponent(friend.friendshipId)}`,
        { method: "DELETE" }
      );

      setFriends((prev) =>
        prev.filter(
          (item) =>
            typeof item === "string" || item.friendshipId !== friend.friendshipId
        )
      );

      setFriendshipNotice(data.message || t.friendRemoved);
      await loadPosts();
    } catch (err) {
      setFriendshipError(
        localizeError(
          err instanceof Error ? err.message : "Could not remove friend."
        )
      );
    }
  };

  const runPostAction = async (postId: string, action: () => Promise<void>) => {
    if (busyActions[postId]) return;

    setBusyActions((prev) => ({ ...prev, [postId]: true }));
    setActionErrors((prev) => ({ ...prev, [postId]: "" }));
    setActionNotices((prev) => ({ ...prev, [postId]: "" }));

    try {
      await action();
    } catch (err) {
      setActionErrors((prev) => ({
        ...prev,
        [postId]: localizeError(
          err instanceof Error ? err.message : "Action failed."
        ),
      }));
    } finally {
      setBusyActions((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const toggleLike = async (post: PublicPost) => {
    await runPostAction(post._id, async () => {
      const data = await apiRequest<{ liked: boolean; likesCount: number }>(
        `/public-space/interactions/${post._id}/like`,
        { method: "POST" }
      );

      setLikedPosts((prev) => ({ ...prev, [post._id]: data.liked }));
      setPosts((prev) =>
        prev.map((item) =>
          item._id === post._id ? { ...item, likesCount: data.likesCount } : item
        )
      );
    });
  };

  const toggleSave = async (post: PublicPost) => {
    await runPostAction(post._id, async () => {
      const data = await apiRequest<{ saved: boolean }>(
        `/public-space/interactions/${post._id}/save`,
        { method: "POST" }
      );

      setSavedPosts((prev) => ({ ...prev, [post._id]: data.saved }));
      setActionNotices((prev) => ({
        ...prev,
        [post._id]: data.saved ? t.postSaved : t.postRemovedFromSaved,
      }));
    });
  };

  const loadComments = async (postId: string) => {
    setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
    setActionErrors((prev) => ({ ...prev, [postId]: "" }));

    try {
      const data = await apiRequest<{ comments?: PostComment[] }>(
        `/public-space/interactions/${postId}/comments`
      );

      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: data.comments || [],
      }));
    } catch (err) {
      setActionErrors((prev) => ({
        ...prev,
        [postId]: localizeError(
          err instanceof Error ? err.message : "Could not load comments."
        ),
      }));
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = async (postId: string) => {
    const shouldOpen = !openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: shouldOpen }));
    if (shouldOpen) await loadComments(postId);
  };

  const addComment = async (
    event: FormEvent<HTMLFormElement>,
    post: PublicPost
  ) => {
    event.preventDefault();
    const value = (commentText[post._id] || "").trim();
    if (!value || commentSubmitting[post._id]) return;

    setCommentSubmitting((prev) => ({ ...prev, [post._id]: true }));
    setActionErrors((prev) => ({ ...prev, [post._id]: "" }));

    try {
      const data = await apiRequest<{
        comment: PostComment;
        commentsCount: number;
      }>(`/public-space/interactions/${post._id}/comments`, {
        method: "POST",
        body: JSON.stringify({ text: value }),
      });

      setCommentText((prev) => ({ ...prev, [post._id]: "" }));
      setCommentsByPost((prev) => ({
        ...prev,
        [post._id]: [...(prev[post._id] || []), data.comment],
      }));

      setPosts((prev) =>
        prev.map((item) =>
          item._id === post._id
            ? { ...item, commentsCount: data.commentsCount }
            : item
        )
      );
    } catch (err) {
      setActionErrors((prev) => ({
        ...prev,
        [post._id]: localizeError(
          err instanceof Error ? err.message : "Could not add comment."
        ),
      }));
    } finally {
      setCommentSubmitting((prev) => ({ ...prev, [post._id]: false }));
    }
  };

  const deleteComment = async (postId: string, commentId: string) => {
    if (deletingCommentId) return;
    setDeletingCommentId(commentId);

    try {
      const data = await apiRequest<{ commentsCount: number }>(
        `/public-space/interactions/comments/${commentId}`,
        { method: "DELETE" }
      );

      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(
          (comment) => comment.id !== commentId
        ),
      }));

      setPosts((prev) =>
        prev.map((item) =>
          item._id === postId
            ? { ...item, commentsCount: data.commentsCount }
            : item
        )
      );
    } catch (err) {
      setActionErrors((prev) => ({
        ...prev,
        [postId]: localizeError(
          err instanceof Error ? err.message : "Could not delete comment."
        ),
      }));
    } finally {
      setDeletingCommentId("");
    }
  };

  const reportPost = async (post: PublicPost) => {
    await runPostAction(post._id, async () => {
      const reason = reportReasons[post._id] || "spam";

      const data = await apiRequest<{ message?: string }>(
        `/public-space/interactions/${post._id}/report`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        }
      );

      setActionNotices((prev) => ({
        ...prev,
        [post._id]: data.message || t.reportSubmittedForReview,
      }));
    });
  };

  const startEditingPost = (post: PublicPost) => {
    setEditingPostId(post._id);
    setEditText(post.text);
    setEditPrivacy(post.privacy);
  };

  const saveEditedPost = async (
    event: FormEvent<HTMLFormElement>,
    post: PublicPost
  ) => {
    event.preventDefault();

    await runPostAction(post._id, async () => {
      await apiRequest(`/public-space/posts/${post._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          text: editText.trim(),
          media: post.media || [],
          privacy: editPrivacy,
        }),
      });

      setEditingPostId(null);
      setActionNotices((prev) => ({
        ...prev,
        [post._id]: t.postUpdatedSuccessfully,
      }));

      await loadPosts();
    });
  };

  const deletePost = async (post: PublicPost) => {
    if (!window.confirm(t.confirmDeletePost)) return;

    await runPostAction(post._id, async () => {
      await apiRequest(`/public-space/posts/${post._id}`, {
        method: "DELETE",
      });

      setPosts((prev) => prev.filter((item) => item._id !== post._id));
      setActionNotices((prev) => ({
        ...prev,
        [post._id]: t.postDeletedSuccessfully,
      }));
    });
  };

  const sharePost = async (post: PublicPost) => {
    const url = `${window.location.origin}/public-space?post=${encodeURIComponent(
      post._id
    )}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: t.sharePostTitle,
          text: post.text.slice(0, 200) || t.sharePostFallback,
          url,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setActionNotices((prev) => ({
          ...prev,
          [post._id]: t.shareLinkCopied,
        }));
      } else {
        window.prompt(t.copyShareLink, url);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      setActionErrors((prev) => ({
        ...prev,
        [post._id]: t.couldNotSharePost,
      }));
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const openHashtag = async (rawTag: string) => {
    const tag = rawTag.replace(/^#/, "").toLowerCase();

    if (!/^[\p{L}\p{N}_]{1,50}$/u.test(tag)) return;

    setHashtagSearch(tag);
    setHashtagLoading(true);
    setError("");
    setNotice("");

    try {
      const data = await apiRequest<{ posts?: PublicPost[] }>(
        `/public-space/posts/hashtag/${encodeURIComponent(tag)}`
      );

      const foundPosts = data.posts || [];
      setPosts(foundPosts);
      setActiveHashtag(tag);
      setLikedPosts({});
      setSavedPosts({});

      if (foundPosts.length > 0) {
        const query = new URLSearchParams({
          postIds: foundPosts.map((post) => post._id).join(","),
        });

        const status = await apiRequest<{
          likedPostIds?: string[];
          savedPostIds?: string[];
        }>(`/public-space/interactions/status?${query}`);

        setLikedPosts(
          Object.fromEntries(
            foundPosts.map((post) => [
              post._id,
              (status.likedPostIds || []).includes(post._id),
            ])
          )
        );

        setSavedPosts(
          Object.fromEntries(
            foundPosts.map((post) => [
              post._id,
              (status.savedPostIds || []).includes(post._id),
            ])
          )
        );
      }
    } catch (err) {
      setError(
        localizeError(
          err instanceof Error ? err.message : "Could not search hashtags."
        )
      );
    } finally {
      setHashtagLoading(false);
    }
  };

  const openMention = (username: string) => {
    const cleanUsername = username.replace(/^@/, "").trim().toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
      return;
    }

    window.location.href = `/profile/${encodeURIComponent(cleanUsername)}`;
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-indigo-600">INTERNAREA</p>
            <h1 className="text-3xl font-bold">{t.publicSpaceTitle}</h1>
            <p className="mt-1 text-sm text-slate-500">{t.shareUpdates}</p>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <NotificationBell />

            <button
              type="button"
              onClick={() => {
                void loadPosts();
                void loadFriendships();
              }}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              {t.refresh}
            </button>
          </div>
        </header>

        <section className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
          <form onSubmit={searchHashtag} className="flex gap-2">
            <input
              type="text"
              value={hashtagSearch}
              onChange={(e) => setHashtagSearch(e.target.value)}
              placeholder={t.searchHashtagPlaceholder}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500"
              maxLength={51}
            />

            <button
              type="submit"
              disabled={hashtagLoading}
              className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {hashtagLoading ? t.searching : t.search}
            </button>
          </form>

          {activeHashtag && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-indigo-700">
                {t.resultsFor} #{activeHashtag}
              </p>

              <button
                type="button"
                onClick={showAllPosts}
                className="text-sm font-semibold text-slate-600 underline"
              >
                {t.backToAllPosts}
              </button>
            </div>
          )}
        </section>

        <section className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">{t.friends}</h2>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
              {friends.length} {t.accepted}
            </span>
          </div>

          <form onSubmit={sendFriendRequest} className="space-y-3">
            <label htmlFor="targetUid" className="block text-sm font-semibold">
              {t.sendFriendRequest}
            </label>

            <input
              id="targetUid"
              value={targetUid}
              onChange={(event) => setTargetUid(event.target.value)}
              placeholder={t.recipientFirebaseUid}
              autoComplete="off"
              className="w-full rounded-xl border px-4 py-3"
            />

            <button
              type="submit"
              disabled={!targetUid.trim() || sendingRequest}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {sendingRequest ? t.sending : t.sendFriendRequest}
            </button>
          </form>

          {friendshipError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {friendshipError}
            </p>
          )}

          {friendshipNotice && (
            <p role="status" className="mt-3 text-sm text-green-700">
              {friendshipNotice}
            </p>
          )}

          <div className="mt-6 border-t pt-5">
            <h3 className="mb-3 font-semibold">
              {t.incomingRequests} ({incomingRequests.length})
            </h3>

            {friendshipsLoading ? (
              <p className="text-sm text-slate-500">{t.loading}</p>
            ) : incomingRequests.length === 0 ? (
              <p className="text-sm text-slate-500">{t.noIncomingRequests}</p>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map((request) => (
                  <div key={request._id} className="rounded-xl border p-3">
                    <p className="break-all text-sm">
                      {t.from}: {request.requestedByUid}
                    </p>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={!!respondingId}
                        onClick={() => void respondToRequest(request, "accept")}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {respondingId === request._id
                          ? t.processing
                          : t.accept}
                      </button>

                      <button
                        type="button"
                        disabled={!!respondingId}
                        onClick={() => void respondToRequest(request, "reject")}
                        className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        {t.reject}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 border-t pt-5">
            <h3 className="mb-3 font-semibold">
              {t.yourFriends} ({friends.length})
            </h3>

            {friendshipsLoading ? (
              <p className="text-sm text-slate-500">{t.loading}</p>
            ) : friends.length === 0 ? (
              <p className="text-sm text-slate-500">{t.friendsWillAppear}</p>
            ) : (
              <ul className="space-y-2">
                {friends.map((friend) => {
                  const uid = typeof friend === "string" ? friend : friend.uid;

                  return (
                    <li
                      key={
                        typeof friend === "string"
                          ? friend
                          : friend.friendshipId || friend.uid
                      }
                      className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"
                    >
                      <div className="min-w-0 break-all">
                        <p>{uid}</p>

                        {typeof friend !== "string" && friend.since && (
                          <p className="mt-1 text-xs text-slate-500">
                            {t.friendsSince}{" "}
                            {new Date(friend.since).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {typeof friend !== "string" && (
                        <button
                          type="button"
                          onClick={() => void unfollowFriend(friend)}
                          className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          {t.unfollow}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <form
          onSubmit={createPost}
          className="mb-6 rounded-2xl border bg-white p-5 shadow-sm"
        >
          <h2 className="mb-3 text-lg font-semibold">{t.createPostTitle}</h2>

          <div className="relative">
            <textarea
              ref={postTextareaRef}
              value={text}
              onChange={handlePostTextChange}
              maxLength={5000}
              rows={4}
              placeholder={t.postPlaceholder}
              className="w-full resize-y rounded-xl border p-4"
            />

            {mentionQuery !== null && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-white shadow-xl">
                {mentionLoading ? (
                  <p className="p-3 text-sm text-slate-500">
                    {t.searchingUsers}
                  </p>
                ) : mentionError ? (
                  <p className="p-3 text-sm text-red-600">{mentionError}</p>
                ) : mentionQuery.length < 2 ? (
                  <p className="p-3 text-sm text-slate-500">
                    {t.typeTwoCharacters}
                  </p>
                ) : mentionUsers.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">
                    {t.noMatchingUsernames}
                  </p>
                ) : (
                  mentionUsers.map((user) => (
                    <button
                      key={user.firebaseUid}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectMentionUser(user)}
                      className="flex w-full items-center gap-3 border-b p-3 text-left last:border-b-0 hover:bg-slate-50"
                    >
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                          {(user.displayName || user.username)
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {user.displayName || user.username}
                        </span>
                        <span className="block text-xs text-slate-500">
                          @{user.username}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <p className="mt-1 text-right text-xs text-slate-500">
            {text.length}/5000 {t.characters}
          </p>

          <div className="mt-3 space-y-3">
            <label htmlFor="mediaUrl" className="block text-sm font-semibold">
              {t.mediaUrlLabel}
            </label>

            <input
              id="mediaUrl"
              type="url"
              value={mediaUrl}
              onChange={(event) => {
                setMediaUrl(event.target.value);
                setVideoFile(null);
              }}
              placeholder={t.mediaUrlPlaceholder}
              className="w-full rounded-xl border px-4 py-3"
            />

            <select
              value={mediaType}
              onChange={(event) =>
                setMediaType(event.target.value as "image" | "video")
              }
              className="w-full rounded-xl border bg-white px-3 py-3"
            >
              <option value="image">{t.image}</option>
              <option value="video">{t.video}</option>
            </select>

            <div className="rounded-xl border border-dashed p-4">
              <label
                htmlFor="videoFile"
                className="block text-sm font-semibold"
              >
                {t.uploadVideoDevice}
              </label>

              <input
                id="videoFile"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/ogg"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setVideoFile(file);
                  if (file) setMediaUrl("");
                }}
                className="mt-2 block w-full text-sm"
              />

              {videoFile && (
                <p className="mt-2 break-all text-sm text-green-700">
                  {t.selected}: {videoFile.name}
                </p>
              )}

              <p className="mt-1 text-xs text-slate-500">
                {t.maximumVideoSize}
              </p>

              {uploadingVideo && (
                <p className="mt-2 text-sm font-semibold text-indigo-600">
                  {t.uploadingToCloudinary}
                </p>
              )}
            </div>

            <label htmlFor="privacy" className="block text-sm font-semibold">
              {t.whoCanSeePost}
            </label>

            <select
              id="privacy"
              value={privacy}
              onChange={(event) =>
                setPrivacy(event.target.value as "public" | "friends")
              }
              className="w-full rounded-xl border bg-white px-3 py-3"
            >
              <option value="public">{t.public}</option>
              <option value="friends">{t.friendsOnly}</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={
              (!text.trim() && !mediaUrl.trim() && !videoFile) ||
              publishing ||
              uploadingVideo
            }
            className="mt-4 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {publishing ? t.publishing : t.publishPost}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {notice}
          </div>
        )}

        <section>
          <h2 className="mb-4 text-xl font-bold">{t.recentPosts}</h2>

          {loading ? (
            <p className="rounded-xl bg-white p-6 text-slate-500">
              {t.loadingPosts}
            </p>
          ) : posts.length === 0 ? (
            <p className="rounded-xl bg-white p-6 text-slate-500">
              {activeHashtag
                ? `${t.noHashtagPosts} #${activeHashtag}.`
                : t.noPublicPosts}
            </p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <article
                  key={post._id}
                  className="rounded-2xl border bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-3">
                    {post.authorProfile?.photoURL ? (
                      <img
                        src={post.authorProfile.photoURL}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                        {(post.authorProfile?.displayName || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      {post.authorProfile?.username &&
                      /^[a-z0-9_]{3,30}$/i.test(post.authorProfile.username) ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              openMention(post.authorProfile!.username!)
                            }
                            className="block text-left font-semibold text-slate-900 hover:text-blue-600 hover:underline"
                          >
                            {post.authorProfile.displayName ||
                              post.authorProfile.username}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openMention(post.authorProfile!.username!)
                            }
                            className="block text-xs text-slate-500 hover:text-blue-600 hover:underline"
                          >
                            @{post.authorProfile.username}
                          </button>
                        </>
                      ) : (
                        <p className="font-semibold">
                          {post.authorProfile?.displayName ||
                            t.internAreaMember}
                        </p>
                      )}

                      <p className="text-xs text-slate-500">
                        {formatDate(post.createdAt)} ·{" "}
                        {post.privacy === "friends" ? t.friends : t.public}
                      </p>
                    </div>
                  </div>

                  {editingPostId === post._id ? (
                    <form
                      onSubmit={(event) => void saveEditedPost(event, post)}
                      className="space-y-3"
                    >
                      <textarea
                        value={editText}
                        onChange={(event) => setEditText(event.target.value)}
                        maxLength={5000}
                        rows={4}
                        className="w-full rounded-xl border p-3"
                      />

                      <select
                        value={editPrivacy}
                        onChange={(event) =>
                          setEditPrivacy(
                            event.target.value as "public" | "friends"
                          )
                        }
                        className="w-full rounded-xl border bg-white p-3"
                      >
                        <option value="public">{t.public}</option>
                        <option value="friends">{t.friendsOnly}</option>
                      </select>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={!!busyActions[post._id]}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {t.saveChanges}
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingPostId(null)}
                          className="rounded-lg border px-4 py-2 text-sm font-semibold"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <PostText
                        text={post.text}
                        onHashtagClick={(tag) => void openHashtag(tag)}
                        onMentionClick={(username) =>
                          void openMention(username)
                        }
                      />

                      {post.media?.map((item, index) => (
                        <div key={`${post._id}-${index}`} className="mt-3">
                          {item.type === "image" ? (
                            <img
                              src={item.url}
                              alt="Post attachment"
                              className="max-h-96 w-full rounded-xl object-contain"
                            />
                          ) : (
                            <PublicSpaceVideo
                              url={item.url}
                              onFullscreen={(url, type) =>
                                setFullscreenVideo({ url, type })
                              }
                            />
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-3 text-sm text-slate-500">
                    <span>
                      {post.likesCount} {t.likes}
                    </span>
                    <span>
                      {post.commentsCount} {t.comments}
                    </span>
                    <span>
                      {post.sharesCount || 0} {t.shares}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!!busyActions[post._id]}
                      onClick={() => void toggleLike(post)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                        likedPosts[post._id]
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      {likedPosts[post._id] ? `♥ ${t.liked}` : `♡ ${t.like}`}
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggleComments(post._id)}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      💬{" "}
                      {openComments[post._id]
                        ? t.hideComments
                        : t.comments}
                    </button>

                    <button
                      type="button"
                      disabled={!!busyActions[post._id]}
                      onClick={() => void toggleSave(post)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                        savedPosts[post._id]
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      🔖 {savedPosts[post._id] ? t.saved : t.save}
                    </button>

                    <button
                      type="button"
                      onClick={() => void sharePost(post)}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      ↗ {t.share}
                    </button>
                  </div>

                  {post.authorUid === currentUid && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.editUntil &&
                        Date.now() <= new Date(post.editUntil).getTime() && (
                          <button
                            type="button"
                            onClick={() => startEditingPost(post)}
                            className="rounded-lg border px-3 py-2 text-sm font-semibold"
                          >
                            {t.editPost}
                          </button>
                        )}

                      <button
                        type="button"
                        disabled={!!busyActions[post._id]}
                        onClick={() => void deletePost(post)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                      >
                        {t.deletePost}
                      </button>
                    </div>
                  )}

                  {openComments[post._id] && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <h3 className="mb-3 font-semibold">{t.comments}</h3>

                      {commentsLoading[post._id] ? (
                        <p className="text-sm text-slate-500">
                          {t.loadingComments}
                        </p>
                      ) : (commentsByPost[post._id] || []).length === 0 ? (
                        <p className="text-sm text-slate-500">
                          {t.noComments}
                        </p>
                      ) : (
                        <div className="mb-4 space-y-3">
                          {(commentsByPost[post._id] || []).map((comment) => (
                            <div
                              key={comment.id}
                              className="rounded-lg bg-white p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-500">
                                    {comment.userUid === currentUid
                                      ? t.you
                                      : comment.displayName ||
                                        comment.username ||
                                        t.internAreaMember}
                                  </p>

                                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                                    {renderPublicText(
                                      comment.text,
                                      openHashtag,
                                      openMention
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {formatDate(comment.createdAt)}
                                  </p>
                                </div>

                                {comment.userUid === currentUid && (
                                  <button
                                    type="button"
                                    disabled={deletingCommentId === comment.id}
                                    onClick={() =>
                                      void deleteComment(post._id, comment.id)
                                    }
                                    className="shrink-0 text-xs font-semibold text-red-600 disabled:opacity-50"
                                  >
                                    {deletingCommentId === comment.id
                                      ? t.deleting
                                      : t.delete}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <form
                        onSubmit={(event) => void addComment(event, post)}
                        className="space-y-2"
                      >
                        <textarea
                          value={commentText[post._id] || ""}
                          onChange={(event) =>
                            setCommentText((prev) => ({
                              ...prev,
                              [post._id]: event.target.value,
                            }))
                          }
                          maxLength={2000}
                          rows={2}
                          placeholder={t.writeComment}
                          className="w-full rounded-lg border bg-white p-3 text-sm"
                        />

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500">
                            {(commentText[post._id] || "").length}/2000
                          </span>

                          <button
                            type="submit"
                            disabled={
                              !(commentText[post._id] || "").trim() ||
                              !!commentSubmitting[post._id]
                            }
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {commentSubmitting[post._id]
                              ? t.posting
                              : t.addComment}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {post.authorUid !== currentUid && (
                    <div className="mt-4 border-t pt-3">
                      <label
                        htmlFor={`report-${post._id}`}
                        className="mb-2 block text-xs font-semibold text-slate-500"
                      >
                        {t.reportThisPost}
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <select
                          id={`report-${post._id}`}
                          value={reportReasons[post._id] || "spam"}
                          onChange={(event) =>
                            setReportReasons((prev) => ({
                              ...prev,
                              [post._id]: event.target.value as REPORT_REASON,
                            }))
                          }
                          className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
                        >
                          {REPORT_REASONS.map((reason) => (
                            <option key={reason.value} value={reason.value}>
                              {reason.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={!!busyActions[post._id]}
                          onClick={() => void reportPost(post)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                        >
                          {t.report}
                        </button>
                      </div>
                    </div>
                  )}

                  {actionErrors[post._id] && (
                    <div
                      role="alert"
                      className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                    >
                      {actionErrors[post._id]}
                    </div>
                  )}

                  {actionNotices[post._id] && (
                    <div
                      role="status"
                      className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700"
                    >
                      {actionNotices[post._id]}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {fullscreenVideo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setFullscreenVideo(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenVideo(null)}
            className="absolute right-5 top-5 z-10 rounded-lg bg-white/20 px-4 py-2 font-semibold text-white"
          >
            {t.close} ✕
          </button>

          <div
            className="w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            {fullscreenVideo.type === "direct" ? (
              <video
                src={fullscreenVideo.url}
                controls
                autoPlay
                playsInline
                className="max-h-[85vh] w-full bg-black object-contain"
              />
            ) : (
              <iframe
                src={fullscreenVideo.url}
                title="Fullscreen video"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full"
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
