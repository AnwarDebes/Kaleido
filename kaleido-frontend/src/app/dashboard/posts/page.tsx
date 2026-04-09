"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Sparkles,
  Edit3,
  Trash2,
  Calendar,
  Send,
  X,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import clsx from "clsx";
import { format } from "date-fns";

/* ---------- types ---------- */

interface Post {
  id: string;
  content_text: string | null;
  platform_contents: Record<string, { text: string; hashtags: string[] }>;
  content_type: string;
  hashtags: string[] | null;
  status: "draft" | "scheduled" | "published" | "failed";
  ai_generated: boolean;
  brand_id?: string;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
}

interface PostsResponse {
  data: Post[];
  meta?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

/* ---------- constants ---------- */

const STATUSES = ["all", "draft", "scheduled", "published", "failed"] as const;
type StatusFilter = (typeof STATUSES)[number];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    color: "text-stone-600",
    bg: "bg-stone-100",
    icon: <FileText className="h-3 w-3" />,
  },
  scheduled: {
    label: "Scheduled",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: <Clock className="h-3 w-3" />,
  },
  published: {
    label: "Published",
    color: "text-green-600",
    bg: "bg-green-50",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "Failed",
    color: "text-red-600",
    bg: "bg-red-50",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

const PLATFORMS = [
  "Facebook",
  "Instagram",
  "Twitter/X",
  "LinkedIn",
  "TikTok",
  "YouTube",
  "Pinterest",
  "Reddit",
  "Bluesky",
];

const TONES = ["professional", "casual", "humorous", "informative", "persuasive"];
const LANGUAGES = ["English", "Norwegian", "Arabic"];

const PER_PAGE = 20;

/* ---------- skeleton ---------- */

function PostSkeleton() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 w-16 rounded-full bg-stone-200" />
        <div className="h-4 w-24 rounded bg-stone-200" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full rounded bg-stone-200" />
        <div className="h-4 w-3/4 rounded bg-stone-200" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-stone-200" />
        <div className="h-5 w-16 rounded-full bg-stone-200" />
      </div>
    </div>
  );
}

/* ---------- main page ---------- */

export default function PostsPage() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // modals
  const [showEditor, setShowEditor] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // editor state
  const [editorText, setEditorText] = useState("");
  const [editorPlatforms, setEditorPlatforms] = useState<string[]>([]);
  const [editorSaving, setEditorSaving] = useState(false);

  // AI generate state
  const [aiTopic, setAiTopic] = useState("");
  const [aiPlatforms, setAiPlatforms] = useState<string[]>([]);
  const [aiTone, setAiTone] = useState("professional");
  const [aiLanguage, setAiLanguage] = useState("English");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState("");

  // action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* fetch posts */
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, per_page: PER_PAGE };
      if (filter !== "all") params.status = filter;
      const res = await api.get<PostsResponse>("/posts", { params });
      const data = res.data;
      setPosts(data.data ?? []);
      if (data.meta) {
        setTotalPages(data.meta.total_pages || 1);
      }
    } catch {
      setError("Failed to load posts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Auto-open modals from URL params
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "generate") setShowAIGenerate(true);
    else if (action === "create") openNewPost();
  }, [searchParams]);

  /* handlers */
  function openNewPost() {
    setEditingPost(null);
    setEditorText("");
    setEditorPlatforms([]);
    setShowEditor(true);
  }

  function openEditPost(post: Post) {
    setEditingPost(post);
    setEditorText(post.content_text || "");
    setEditorPlatforms(Object.keys(post.platform_contents || {}));
    setShowEditor(true);
  }

  function toggleEditorPlatform(p: string) {
    setEditorPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function toggleAiPlatform(p: string) {
    setAiPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function handleSave() {
    if (!editorText.trim() || editorPlatforms.length === 0) return;
    setEditorSaving(true);
    try {
      const platformContents: Record<string, { text: string; hashtags: string[] }> = {};
      for (const p of editorPlatforms) {
        platformContents[p] = { text: editorText, hashtags: [] };
      }
      if (editingPost) {
        await api.patch(`/posts/${editingPost.id}`, {
          content_text: editorText,
          platform_contents: platformContents,
        });
      } else {
        await api.post("/posts", {
          content_text: editorText,
          platform_contents: platformContents,
        });
      }
      setShowEditor(false);
      fetchPosts();
    } catch {
      setError("Failed to save post.");
    } finally {
      setEditorSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    setActionLoading(id);
    try {
      await api.delete(`/posts/${id}`);
      fetchPosts();
    } catch {
      setError("Failed to delete post.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePublishNow(id: string) {
    setActionLoading(id);
    try {
      await api.post(`/schedule/posts/${id}/publish`);
      fetchPosts();
    } catch {
      setError("Failed to publish post.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAIGenerate() {
    if (!aiTopic.trim() || aiPlatforms.length === 0) return;
    setAiGenerating(true);
    setAiResult("");
    try {
      const res = await api.post("/posts/generate", {
        topic: aiTopic,
        platforms: aiPlatforms,
        tone: aiTone,
        language: aiLanguage,
      });
      const post = res.data.data;
      setAiResult(post?.content_text ?? post?.text ?? JSON.stringify(post));
    } catch {
      setError("AI generation failed. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  }

  function useAIResult() {
    setEditorText(aiResult);
    setEditorPlatforms(aiPlatforms);
    setShowAIGenerate(false);
    setShowEditor(true);
    setAiResult("");
    setAiTopic("");
  }

  /* render */
  return (
    <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-8 lg:px-8 max-w-6xl mx-auto">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Posts</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAIGenerate(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </button>
          <button
            onClick={openNewPost}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
        </div>
      </div>

      {/* filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-stone-100 mb-6 overflow-x-auto">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilter(s);
              setPage(1);
            }}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-all",
              filter === s
                ? "bg-white shadow-sm text-foreground"
                : "text-muted hover:text-foreground"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="ml-2 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* posts list */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center"
        >
          <FileText className="h-12 w-12 mx-auto text-muted mb-4" />
          <h2 className="text-lg font-semibold mb-2">No posts yet</h2>
          <p className="text-sm text-muted mb-6">
            Create your first post or generate one with AI to get started.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={openNewPost}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
            >
              <Plus className="h-4 w-4" />
              New Post
            </button>
            <button
              onClick={() => setShowAIGenerate(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const cfg = STATUS_CONFIG[post.status];
              const isActioning = actionLoading === post.id;
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 flex flex-col"
                >
                  {/* status + date */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                        cfg?.bg,
                        cfg?.color
                      )}
                    >
                      {cfg?.icon}
                      {cfg?.label}
                    </span>
                    <span className="text-xs text-muted">
                      {format(new Date(post.created_at), "MMM d, yyyy")}
                    </span>
                  </div>

                  {/* text preview */}
                  <p className="text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                    {(post.content_text || "")?.length > 100
                      ? (post.content_text || "").slice(0, 100) + "..."
                      : post.content_text || ""}
                  </p>

                  {/* platform tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {Object.keys(post.platform_contents || {}).map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200/50"
                      >
                        {p}
                      </span>
                    ))}
                  </div>

                  {/* actions */}
                  <div className="flex flex-wrap gap-1.5 pt-3 border-t border-card-border">
                    <button
                      onClick={() => openEditPost(post)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-muted hover:text-foreground hover:bg-stone-100 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={isActioning}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                    {post.status === "draft" && (
                      <>
                        <button
                          onClick={() => {
                            window.location.href = `/dashboard/schedule?post=${post.id}`;
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Schedule"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Schedule</span>
                        </button>
                        <button
                          onClick={() => handlePublishNow(post.id)}
                          disabled={isActioning}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                          title="Publish Now"
                        >
                          {isActioning ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">Publish</span>
                        </button>
                      </>
                    )}
                    {post.status === "scheduled" && (
                      <button
                        onClick={() => handlePublishNow(post.id)}
                        disabled={isActioning}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                        title="Publish Now"
                      >
                        {isActioning ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">Publish</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-card-border hover:bg-stone-50 transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-card-border hover:bg-stone-50 transition-colors disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ===== Create / Edit Modal ===== */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowEditor(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card p-5 sm:p-6 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">
                  {editingPost ? "Edit Post" : "New Post"}
                </h2>
                <button
                  onClick={() => setShowEditor(false)}
                  className="p-1 rounded-md hover:bg-stone-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* text area */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5">Content</label>
                <textarea
                  value={editorText}
                  onChange={(e) => setEditorText(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors resize-none"
                  placeholder="Write your post content..."
                />
                <p className="mt-1 text-xs text-muted text-right">
                  {editorText.length} characters
                </p>
              </div>

              {/* platforms */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => toggleEditorPlatform(p)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        editorPlatforms.includes(p)
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-card-border text-muted hover:border-stone-300"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* media placeholder */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => alert("Media upload coming soon!")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-card-border text-sm text-muted hover:text-foreground hover:border-stone-400 transition-colors"
                >
                  <ImageIcon className="h-4 w-4" />
                  Add Media (Coming soon)
                </button>
              </div>

              {/* actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-card-border hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={
                    editorSaving ||
                    !editorText.trim() ||
                    editorPlatforms.length === 0
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
                >
                  {editorSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingPost ? "Update Post" : "Save as Draft"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== AI Generate Modal ===== */}
      <AnimatePresence>
        {showAIGenerate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAIGenerate(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card p-5 sm:p-6 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Generate with AI
                </h2>
                <button
                  onClick={() => {
                    setShowAIGenerate(false);
                    setAiResult("");
                  }}
                  className="p-1 rounded-md hover:bg-stone-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!aiResult ? (
                <>
                  {/* topic */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1.5">Topic</label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                      placeholder="e.g., Benefits of remote work"
                    />
                  </div>

                  {/* platforms */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Platforms
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => toggleAiPlatform(p)}
                          className={clsx(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                            aiPlatforms.includes(p)
                              ? "border-amber-500 bg-amber-50 text-amber-700"
                              : "border-card-border text-muted hover:border-stone-300"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* tone */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1.5">Tone</label>
                    <select
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                    >
                      {TONES.map((t) => (
                        <option key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* language */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-1.5">
                      Language
                    </label>
                    <select
                      value={aiLanguage}
                      onChange={(e) => setAiLanguage(e.target.value)}
                      className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setShowAIGenerate(false);
                        setAiResult("");
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-card-border hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAIGenerate}
                      disabled={
                        aiGenerating ||
                        !aiTopic.trim() ||
                        aiPlatforms.length === 0
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
                    >
                      {aiGenerating && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Generate
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* AI result */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1.5">
                      Generated Post
                    </label>
                    <textarea
                      value={aiResult}
                      onChange={(e) => setAiResult(e.target.value)}
                      rows={6}
                      className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors resize-none"
                    />
                    <p className="mt-1 text-xs text-muted">
                      You can edit the generated text before saving.
                    </p>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setAiResult("")}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-card-border hover:bg-stone-50 transition-colors"
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={useAIResult}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
                    >
                      Use This Post
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
