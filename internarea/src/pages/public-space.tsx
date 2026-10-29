
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { auth } from "../firebase/firebase";
import NotificationBell from "../Components/NotificationBell";

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

type REPORT_REASON =
  | "spam"
  | "harassment"
  | "inappropriate"
  | "misinformation"
  | "other";

const REPORT_REASONS: { value: REPORT_REASON; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

type FriendEntry = {
  friendshipId: string;
  uid: string;
  since?: string;
};

async function apiRequest<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const user = auth.currentUser;

  if (!user) throw new Error("Please sign in to InternArea first.");

  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "The request failed.");
  }

  return data as T;
}

export default function PublicSpacePage() {
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [text, setText] = useState("");
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

  const currentUid = auth.currentUser?.uid;

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest<{ posts?: PublicPost[] }>("/public-space/posts");
      const loadedPosts = data.posts || [];
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
      setError(err instanceof Error ? err.message : "Could not load posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFriendships = useCallback(async () => {
    setFriendshipsLoading(true);
    setFriendshipError("");

    try {
      const [friendsData, requestsData] = await Promise.all([
        apiRequest<{ friends?: string[] }>("/public-space/friendships/friends"),
        apiRequest<{ requests?: FriendshipRequest[] }>(
          "/public-space/friendships/requests/incoming"
        ),
      ]);

      setFriends(friendsData.friends || []);
      setIncomingRequests(requestsData.requests || []);
    } catch (err) {
      setFriendshipError(
        err instanceof Error ? err.message : "Could not load friendship information."
      );
    } finally {
      setFriendshipsLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
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
        setError("Please sign in to view Public Space.");
      }
    });

    return unsubscribe;
  }, [loadPosts, loadFriendships]);

  const createPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (publishing) return;

    const cleanText = text.trim();
    const cleanUrl = mediaUrl.trim();

    if (!cleanText && !cleanUrl) {
      setError("Add text, an image URL, or a video URL.");
      return;
    }

    if (cleanUrl) {
      try {
        const parsed = new URL(cleanUrl);
        if (parsed.protocol !== "https:") {
          setError("Media URLs must use HTTPS.");
          return;
        }
      } catch {
        setError("Please enter a valid media URL.");
        return;
      }
    }

    setPublishing(true);
    setError("");
    setNotice("");

    try {
      await apiRequest("/public-space/posts", {
        method: "POST",
        body: JSON.stringify({
          text: cleanText,
          media: cleanUrl ? [{ type: mediaType, url: cleanUrl }] : [],
          privacy,
        }),
      });

      setText("");
      setMediaUrl("");
      setPrivacy("public");
      setNotice("Your post was published successfully.");
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish your post.");
    } finally {
      setPublishing(false);
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
      setFriendshipNotice(data.message || "Friend request sent successfully.");
      await loadFriendships();
    } catch (err) {
      setFriendshipError(
        err instanceof Error ? err.message : "Could not send friend request."
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
        data.message || (action === "accept" ? "Friend request accepted." : "Request rejected.")
      );
      await loadFriendships();
      await loadPosts();
    } catch (err) {
      setFriendshipError(
        err instanceof Error ? err.message : "Could not respond to friend request."
      );
    } finally {
      setRespondingId("");
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
        [postId]: err instanceof Error ? err.message : "Action failed.",
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
        [post._id]: data.saved ? "Post saved." : "Post removed from saved posts.",
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
      setCommentsByPost((prev) => ({ ...prev, [postId]: data.comments || [] }));
    } catch (err) {
      setActionErrors((prev) => ({
        ...prev,
        [postId]: err instanceof Error ? err.message : "Could not load comments.",
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
        [post._id]: err instanceof Error ? err.message : "Could not add comment.",
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
        [postId]: (prev[postId] || []).filter((comment) => comment.id !== commentId),
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
        [postId]: err instanceof Error ? err.message : "Could not delete comment.",
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
        [post._id]: data.message || "Report submitted for review.",
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
      setActionNotices((prev) => ({ ...prev, [post._id]: "Post updated successfully." }));
      await loadPosts();
    });
  };

  const deletePost = async (post: PublicPost) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    await runPostAction(post._id, async () => {
      await apiRequest(`/public-space/posts/${post._id}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((item) => item._id !== post._id));
      setActionNotices((prev) => ({ ...prev, [post._id]: "Post deleted." }));
    });
  };

  const sharePost = async (post: PublicPost) => {
    const url = `${window.location.origin}/public-space?post=${encodeURIComponent(post._id)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "InternArea Public Space",
          text: post.text.slice(0, 200) || "Check out this post on InternArea.",
          url,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setActionNotices((prev) => ({ ...prev, [post._id]: "Share link copied." }));
      } else {
        window.prompt("Copy this link to share the post:", url);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setActionErrors((prev) => ({
        ...prev,
        [post._id]: "Could not share this post on this device.",
      }));
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl">

        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-indigo-600">INTERNAREA</p>
            <h1 className="text-3xl font-bold">Public Space</h1>
            <p className="mt-1 text-sm text-slate-500">
              Share updates with your community.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />

            <button
              type="button"
              onClick={() => {
                void loadPosts();
                void loadFriendships();
              }}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </header>

        <section className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Friends</h2>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
              {friends.length} accepted
            </span>
          </div>

          <form onSubmit={sendFriendRequest} className="space-y-3">
            <label htmlFor="targetUid" className="block text-sm font-semibold">
              Send a friend request
            </label>
            <input
              id="targetUid"
              value={targetUid}
              onChange={(event) => setTargetUid(event.target.value)}
              placeholder="Recipient's Firebase UID"
              autoComplete="off"
              className="w-full rounded-xl border px-4 py-3"
            />
            <button
              type="submit"
              disabled={!targetUid.trim() || sendingRequest}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {sendingRequest ? "Sending..." : "Send friend request"}
            </button>
          </form>

          {friendshipError && <p role="alert" className="mt-3 text-sm text-red-700">{friendshipError}</p>}
          {friendshipNotice && <p role="status" className="mt-3 text-sm text-green-700">{friendshipNotice}</p>}

          <div className="mt-6 border-t pt-5">
            <h3 className="mb-3 font-semibold">Incoming requests ({incomingRequests.length})</h3>
            {friendshipsLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : incomingRequests.length === 0 ? (
              <p className="text-sm text-slate-500">No incoming requests.</p>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map((request) => (
                  <div key={request._id} className="rounded-xl border p-3">
                    <p className="break-all text-sm">From: {request.requestedByUid}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={!!respondingId}
                        onClick={() => void respondToRequest(request, "accept")}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {respondingId === request._id ? "Processing..." : "Accept"}
                      </button>
                      <button
                        type="button"
                        disabled={!!respondingId}
                        onClick={() => void respondToRequest(request, "reject")}
                        className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


          <div className="mt-6 border-t pt-5">
            <h3 className="mb-3 font-semibold">
              Your friends ({friends.length})
            </h3>

            {friendshipsLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : friends.length === 0 ? (
              <p className="text-sm text-slate-500">
                Your friends will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {friends.map((friend) => {
                  const uid = typeof friend === "string" ? friend : friend.uid;

                  return (
                    <li
                      key={typeof friend === "string" ? friend : friend.friendshipId || friend.uid}
                      className="break-all rounded-xl bg-slate-50 p-3 text-sm"
                    >
                      <p>{uid}</p>

                      {typeof friend !== "string" && friend.since && (
                        <p className="mt-1 text-xs text-slate-500">
                          Friends since{" "}
                          {new Date(friend.since).toLocaleDateString()}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

        </section>

        <form onSubmit={createPost} className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Create a post</h2>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={5000}
            rows={4}
            placeholder="What would you like to share? Use #hashtags or @mentions."
            className="w-full resize-y rounded-xl border p-4"
          />
          <p className="mt-1 text-right text-xs text-slate-500">{text.length}/5000 characters</p>

          <div className="mt-3 space-y-3">
            <label htmlFor="mediaUrl" className="block text-sm font-semibold">
              Image or video URL (optional)
            </label>
            <input
              id="mediaUrl"
              type="url"
              value={mediaUrl}
              onChange={(event) => setMediaUrl(event.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full rounded-xl border px-4 py-3"
            />
            <select
              value={mediaType}
              onChange={(event) => setMediaType(event.target.value as "image" | "video")}
              className="w-full rounded-xl border bg-white px-3 py-3"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
            <label htmlFor="privacy" className="block text-sm font-semibold">
              Who can see this post?
            </label>
            <select
              id="privacy"
              value={privacy}
              onChange={(event) => setPrivacy(event.target.value as "public" | "friends")}
              className="w-full rounded-xl border bg-white px-3 py-3"
            >
              <option value="public">Public</option>
              <option value="friends">Friends only</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={(!text.trim() && !mediaUrl.trim()) || publishing}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {publishing ? "Publishing..." : "Publish post"}
          </button>
        </form>

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{notice}</div>}

        <section>
          <h2 className="mb-4 text-xl font-bold">Recent posts</h2>
          {loading ? (
            <p className="rounded-xl bg-white p-6 text-slate-500">Loading posts...</p>
          ) : posts.length === 0 ? (
            <p className="rounded-xl bg-white p-6 text-slate-500">No public posts yet.</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <article key={post._id} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-3">
                    {post.authorProfile?.photoURL ? (
                      <img src={post.authorProfile.photoURL} alt="" className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                        {(post.authorProfile?.displayName || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {post.authorProfile?.displayName || post.authorProfile?.username || "InternArea member"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(post.createdAt)} · {post.privacy === "friends" ? "Friends" : "Public"}
                      </p>
                    </div>
                  </div>

                  {editingPostId === post._id ? (
                    <form onSubmit={(event) => void saveEditedPost(event, post)} className="space-y-3">
                      <textarea
                        value={editText}
                        onChange={(event) => setEditText(event.target.value)}
                        maxLength={5000}
                        rows={4}
                        className="w-full rounded-xl border p-3"
                      />
                      <select
                        value={editPrivacy}
                        onChange={(event) => setEditPrivacy(event.target.value as "public" | "friends")}
                        className="w-full rounded-xl border bg-white p-3"
                      >
                        <option value="public">Public</option>
                        <option value="friends">Friends only</option>
                      </select>
                      <div className="flex gap-2">
                        <button type="submit" disabled={!!busyActions[post._id]} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                          Save changes
                        </button>
                        <button type="button" onClick={() => setEditingPostId(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap break-words leading-7">{post.text}</p>
                      {post.media?.map((item, index) => (
                        <div key={`${post._id}-${index}`} className="mt-3">
                          {item.type === "image" ? (
                            <img src={item.url} alt="Post attachment" className="max-h-96 w-full rounded-xl object-contain" />
                          ) : (
                            <video src={item.url} controls className="max-h-96 w-full rounded-xl" />
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-3 text-sm text-slate-500">
                    <span>{post.likesCount} likes</span>
                    <span>{post.commentsCount} comments</span>
                    <span>{post.sharesCount || 0} shares</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!!busyActions[post._id]}
                      onClick={() => void toggleLike(post)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${likedPosts[post._id] ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "hover:bg-slate-50"}`}
                    >
                      {likedPosts[post._id] ? "♥ Liked" : "♡ Like"}
                    </button>
                    <button type="button" onClick={() => void toggleComments(post._id)} className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                      💬 {openComments[post._id] ? "Hide comments" : "Comments"}
                    </button>
                    <button
                      type="button"
                      disabled={!!busyActions[post._id]}
                      onClick={() => void toggleSave(post)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${savedPosts[post._id] ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "hover:bg-slate-50"}`}
                    >
                      {savedPosts[post._id] ? "🔖 Saved" : "🔖 Save"}
                    </button>
                    <button type="button" onClick={() => void sharePost(post)} className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                      ↗ Share
                    </button>
                  </div>

                  {post.authorUid === currentUid && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.editUntil && Date.now() <= new Date(post.editUntil).getTime() && (
                        <button type="button" onClick={() => startEditingPost(post)} className="rounded-lg border px-3 py-2 text-sm font-semibold">
                          Edit post
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!!busyActions[post._id]}
                        onClick={() => void deletePost(post)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                      >
                        Delete post
                      </button>
                    </div>
                  )}

                  {openComments[post._id] && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <h3 className="mb-3 font-semibold">Comments</h3>
                      {commentsLoading[post._id] ? (
                        <p className="text-sm text-slate-500">Loading comments...</p>
                      ) : (commentsByPost[post._id] || []).length === 0 ? (
                        <p className="text-sm text-slate-500">No comments yet.</p>
                      ) : (
                        <div className="mb-4 space-y-3">
                          {(commentsByPost[post._id] || []).map((comment) => (
                            <div key={comment.id} className="rounded-lg bg-white p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">

                                  <p className="text-xs font-semibold text-slate-500">
                                    {comment.userUid === currentUid
                                      ? "You"
                                      : comment.displayName ||
                                      comment.username ||
                                      "InternArea member"}
                                  </p>

                                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{comment.text}</p>
                                  <p className="mt-1 text-xs text-slate-400">{formatDate(comment.createdAt)}</p>
                                </div>
                                {comment.userUid === currentUid && (
                                  <button
                                    type="button"
                                    disabled={deletingCommentId === comment.id}
                                    onClick={() => void deleteComment(post._id, comment.id)}
                                    className="shrink-0 text-xs font-semibold text-red-600 disabled:opacity-50"
                                  >
                                    {deletingCommentId === comment.id ? "Deleting..." : "Delete"}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <form onSubmit={(event) => void addComment(event, post)} className="space-y-2">
                        <textarea
                          value={commentText[post._id] || ""}
                          onChange={(event) => setCommentText((prev) => ({ ...prev, [post._id]: event.target.value }))}
                          maxLength={2000}
                          rows={2}
                          placeholder="Write a comment..."
                          className="w-full rounded-lg border bg-white p-3 text-sm"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500">{(commentText[post._id] || "").length}/2000</span>
                          <button
                            type="submit"
                            disabled={!(commentText[post._id] || "").trim() || !!commentSubmitting[post._id]}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {commentSubmitting[post._id] ? "Posting..." : "Add comment"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {post.authorUid !== currentUid && (
                    <div className="mt-4 border-t pt-3">
                      <label htmlFor={`report-${post._id}`} className="mb-2 block text-xs font-semibold text-slate-500">
                        Report this post
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <select
                          id={`report-${post._id}`}
                          value={reportReasons[post._id] || "spam"}
                          onChange={(event) => setReportReasons((prev) => ({ ...prev, [post._id]: event.target.value as REPORT_REASON }))}
                          className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
                        >
                          {REPORT_REASONS.map((reason) => (
                            <option key={reason.value} value={reason.value}>{reason.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!!busyActions[post._id]}
                          onClick={() => void reportPost(post)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                        >
                          Report
                        </button>
                      </div>
                    </div>
                  )}

                  {actionErrors[post._id] && <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionErrors[post._id]}</div>}
                  {actionNotices[post._id] && <div role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{actionNotices[post._id]}</div>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
