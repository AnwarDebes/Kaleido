"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Wand2,
  Hash,
  X,
  Image as ImageIcon,
  FolderOpen,
  RefreshCw,
  Trash2,
  Save,
  Download,
  Smartphone,
  Calendar,
  CheckCircle2,
  Check,
  FileText,
  Clock,
  AlertCircle,
  Share2,
} from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import { useNotificationStore } from "@/lib/notifications";
import { useAuthStore } from "@/lib/auth";
import { platformByLabel } from "@/lib/platforms";
import { downloadBlob } from "@/lib/download";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

/* ---------- types ---------- */

interface PlatformContent {
  text: string;
  hashtags: string[];
}

interface MediaItem {
  id: string;
  file_url: string | null;
  file_type?: string;
  thumbnail_url?: string | null;
  filename?: string;
  width?: number;
  height?: number;
}

interface PostData {
  id: string;
  content_text: string | null;
  platform_contents: Record<string, PlatformContent> | null;
  hashtags: string[] | null;
  status: string;
  media?: MediaItem[];
  media_ids?: string[];
  scheduled_at?: string;
}

interface Brand {
  id: string;
  name: string;
}

type ApiErr = {
  response?: {
    status?: number;
    data?: { error?: { code?: string; message?: string } };
  };
};

/* ---------- constants ---------- */

const DEFAULT_PLATFORMS = ["Instagram", "Twitter / X", "LinkedIn"];

const TONES = ["professional", "casual", "playful", "bold", "inspiring"];

const ASPECT_RATIOS = ["1:1", "4:5", "16:9", "9:16"] as const;

const EXAMPLE_TOPICS = [
  "Announce a new product to early users",
  "Three lessons learned building this project",
  "A behind the scenes look at how we work",
];

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
  publishing: {
    label: "Publishing",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  published: {
    label: "Published",
    color: "text-green-600",
    bg: "bg-green-50",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  partially_published: {
    label: "Partly published",
    color: "text-amber-700",
    bg: "bg-amber-50",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  needs_manual_share: {
    label: "Share manually",
    color: "text-amber-700",
    bg: "bg-amber-50",
    icon: <Share2 className="h-3 w-3" />,
  },
  failed: {
    label: "Failed",
    color: "text-red-600",
    bg: "bg-red-50",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

/* ---------- helpers ---------- */

function emptyContents(labels: string[]): Record<string, PlatformContent> {
  return Object.fromEntries(labels.map((l) => [l, { text: "", hashtags: [] }]));
}

function stripHash(h: string): string {
  return h.replace(/^#+/, "").trim();
}

function mediaSrc(m: MediaItem, thumb = false): string {
  const path = (thumb && m.thumbnail_url) || m.file_url || "";
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}

function errMessage(err: unknown, fallback: string): string {
  const e = err as ApiErr;
  return e.response?.data?.error?.message || fallback;
}

/* ---------- inner page (uses useSearchParams) ---------- */

function StudioInner() {
  const searchParams = useSearchParams();
  const { addToast } = useNotificationStore();
  const user = useAuthStore((s) => s.user);

  // post state, kept deliberately simple
  const [contents, setContents] = useState<Record<string, PlatformContent>>(() =>
    emptyContents(DEFAULT_PLATFORMS),
  );
  const [activeLabel, setActiveLabel] = useState<string>(DEFAULT_PLATFORMS[0]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [dirty, setDirty] = useState(false);

  const [applyAll, setApplyAll] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);

  // brand name for the preview avatar
  const [brandName, setBrandName] = useState<string>("");

  // AI caption state
  const [aiPrompt, setAiPrompt] = useState("");
  const [tone, setTone] = useState("professional");
  const [aiWriting, setAiWriting] = useState(false);
  const [improving, setImproving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const aiInputRef = useRef<HTMLInputElement>(null);

  // visual state
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgPromptTouched, setImgPromptTouched] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  // publish state
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [marking, setMarking] = useState(false);

  const labels = Object.keys(contents);
  const active = contents[activeLabel] ?? { text: "", hashtags: [] };
  const canSave = labels.some((l) => (contents[l]?.text ?? "").trim().length > 0);
  const isEmpty = !canSave && !media && !postId;

  /* load brands once for the preview name */
  useEffect(() => {
    let cancelled = false;
    api
      .get("/brands")
      .then((res) => {
        if (cancelled) return;
        const brands: Brand[] = res.data?.data ?? [];
        if (brands.length > 0) setBrandName(brands[0].name);
      })
      .catch(() => {
        /* preview falls back to the account name, not critical */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* URL params: ?post=, ?media=, ?topic= */
  const paramsHandled = useRef(false);
  useEffect(() => {
    if (paramsHandled.current) return;
    paramsHandled.current = true;

    const postParam = searchParams.get("post");
    const mediaParam = searchParams.get("media");
    const topicParam = searchParams.get("topic");

    if (topicParam) {
      setAiPrompt(topicParam);
      setTimeout(() => aiInputRef.current?.focus(), 100);
    }

    if (postParam) {
      loadPost(postParam);
    } else if (mediaParam) {
      attachMediaById(mediaParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /* keep the image prompt prefilled from the first caption line until edited */
  useEffect(() => {
    if (imgPromptTouched || media) return;
    const firstLine = (contents[labels[0]]?.text ?? "").split("\n")[0].trim();
    setImgPrompt(firstLine);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contents, imgPromptTouched, media]);

  /* ---------- loading ---------- */

  async function loadPost(id: string) {
    setLoadingPost(true);
    try {
      const res = await api.get(`/posts/${id}`);
      const post = res.data?.data as PostData;
      const pc =
        post.platform_contents && Object.keys(post.platform_contents).length > 0
          ? post.platform_contents
          : Object.fromEntries(
              DEFAULT_PLATFORMS.map((l) => [
                l,
                { text: post.content_text || "", hashtags: [] },
              ]),
            );
      setContents(pc);
      setActiveLabel(Object.keys(pc)[0]);
      setHashtags((post.hashtags || []).map(stripHash).filter(Boolean));
      setMedia(post.media?.[0] ?? null);
      setPostId(post.id);
      setStatus(post.status || "draft");
      setDirty(false);
      setImgPromptTouched(false);
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Could not load that post",
        message: errMessage(err, "It may have been deleted. Starting a fresh one."),
      });
    } finally {
      setLoadingPost(false);
    }
  }

  async function attachMediaById(id: string) {
    try {
      const res = await api.get("/media", {
        params: { file_type: "image", per_page: 100 },
      });
      const items: MediaItem[] = res.data?.data ?? [];
      const found = items.find((m) => m.id === id);
      if (found) {
        setMedia(found);
        setDirty(true);
      } else {
        addToast({
          type: "info",
          title: "Image not found",
          message: "Pick one from the library in the Visual card instead.",
        });
      }
    } catch {
      /* the Visual card still offers generation and the library */
    }
  }

  /* ---------- caption editing ---------- */

  function updateCaption(text: string) {
    setContents((prev) => {
      if (applyAll) {
        const next: Record<string, PlatformContent> = {};
        for (const l of Object.keys(prev)) next[l] = { ...prev[l], text };
        return next;
      }
      return { ...prev, [activeLabel]: { ...prev[activeLabel], text } };
    });
    setDirty(true);
  }

  function removeHashtag(tag: string) {
    setHashtags((prev) => prev.filter((h) => h !== tag));
    setDirty(true);
  }

  /* ---------- saving ---------- */

  function buildPayload() {
    return {
      content_text: contents[labels[0]]?.text ?? "",
      platform_contents: contents,
      hashtags,
      media_ids: media ? [media.id] : [],
    };
  }

  async function savePost(): Promise<string | null> {
    if (!canSave) {
      addToast({
        type: "info",
        title: "Nothing to save yet",
        message: "Write a caption first, or let the AI write one.",
      });
      return null;
    }
    setSaving(true);
    try {
      if (postId) {
        await api.patch(`/posts/${postId}`, buildPayload());
        setDirty(false);
        return postId;
      }
      const res = await api.post("/posts", { ...buildPayload(), status: "draft" });
      const id: string | null = res.data?.data?.id ?? null;
      if (id) {
        setPostId(id);
        setStatus(res.data?.data?.status ?? "draft");
        setDirty(false);
      }
      return id;
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Could not save the post",
        message: errMessage(err, "Please try again in a moment."),
      });
      return null;
    } finally {
      setSaving(false);
    }
  }

  /** Save first if needed, then hand back the post id. */
  async function ensureSaved(): Promise<string | null> {
    if (postId && !dirty) return postId;
    return savePost();
  }

  /* ---------- AI actions ---------- */

  async function handleWriteWithAI() {
    const topic = aiPrompt.trim();
    if (!topic || aiWriting) return;
    setAiWriting(true);
    try {
      const res = await api.post(
        "/posts/generate",
        { topic, platforms: labels, tone },
        // Local AI generation can take a few minutes.
        { timeout: 300000 },
      );
      const post = res.data?.data as PostData;
      const pc =
        post?.platform_contents && Object.keys(post.platform_contents).length > 0
          ? post.platform_contents
          : Object.fromEntries(
              labels.map((l) => [l, { text: post?.content_text || "", hashtags: [] }]),
            );
      setContents(pc);
      if (!pc[activeLabel]) setActiveLabel(Object.keys(pc)[0]);
      if (post?.hashtags && post.hashtags.length > 0) {
        setHashtags(post.hashtags.map(stripHash).filter(Boolean));
      }
      // The generate endpoint creates a draft, so adopt its id.
      if (post?.id) {
        setPostId(post.id);
        setStatus(post.status || "draft");
      }
      setDirty(false);
      setImgPromptTouched(false);
      addToast({
        type: "success",
        title: "Draft written",
        message: "One caption per platform. Edit anything before you publish.",
      });
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Could not write the post",
        message: errMessage(err, "The AI service may be busy. Please try again."),
      });
    } finally {
      setAiWriting(false);
    }
  }

  async function handleImprove() {
    if (improving) return;
    const id = await ensureSaved();
    if (!id) return;
    setImproving(true);
    try {
      const res = await api.post(
        `/posts/${id}/enhance`,
        { platform: activeLabel },
        { timeout: 300000 },
      );
      const post = res.data?.data as PostData;
      if (post?.platform_contents && Object.keys(post.platform_contents).length > 0) {
        setContents(post.platform_contents);
      }
      if (post?.hashtags && post.hashtags.length > 0) {
        setHashtags(post.hashtags.map(stripHash).filter(Boolean));
      }
      setDirty(false);
      addToast({ type: "success", title: `${activeLabel} caption improved` });
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Could not improve the caption",
        message: errMessage(err, "Please try again in a moment."),
      });
    } finally {
      setImproving(false);
    }
  }

  async function handleSuggestHashtags() {
    const text = active.text.trim();
    if (!text || suggesting) return;
    setSuggesting(true);
    try {
      const res = await api.post(
        "/posts/suggest-hashtags",
        {
          text,
          platform: platformByLabel(activeLabel)?.id || activeLabel.toLowerCase(),
        },
        { timeout: 300000 },
      );
      const tags: string[] = (res.data?.data?.hashtags ?? [])
        .map(stripHash)
        .filter(Boolean);
      if (tags.length === 0) {
        addToast({
          type: "info",
          title: "No suggestions",
          message: "Try writing a bit more text first.",
        });
        return;
      }
      setHashtags((prev) => Array.from(new Set([...prev, ...tags])));
      setDirty(true);
      addToast({
        type: "success",
        title: "Hashtags added",
        message: "Click any chip to remove it.",
      });
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Could not suggest hashtags",
        message: errMessage(err, "Please try again."),
      });
    } finally {
      setSuggesting(false);
    }
  }

  /* ---------- visual actions ---------- */

  async function handleGenerateImage() {
    const prompt = imgPrompt.trim();
    if (!prompt || generatingImage) return;
    setGeneratingImage(true);
    try {
      const res = await api.post(
        "/media/generate-image",
        { prompt, aspect_ratio: aspectRatio },
        { timeout: 300000 },
      );
      const item = res.data?.data as MediaItem;
      if (item?.id) {
        setMedia(item);
        setDirty(true);
        setShowLibrary(false);
        addToast({ type: "success", title: "Image generated and attached" });
      }
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Image generation failed",
        message: errMessage(err, "Please try again in a moment."),
      });
    } finally {
      setGeneratingImage(false);
    }
  }

  async function openLibrary() {
    setShowLibrary(true);
    setLibraryLoading(true);
    try {
      const res = await api.get("/media", {
        params: { file_type: "image", per_page: 24 },
      });
      setLibrary(res.data?.data ?? []);
    } catch {
      addToast({
        type: "error",
        title: "Could not load the library",
        message: "Please try again.",
      });
    } finally {
      setLibraryLoading(false);
    }
  }

  function attachFromLibrary(item: MediaItem) {
    setMedia(item);
    setDirty(true);
    setShowLibrary(false);
  }

  function removeMedia() {
    setMedia(null);
    setDirty(true);
  }

  /* ---------- publish actions ---------- */

  async function handleDownloadPack() {
    if (downloading) return;
    const id = await ensureSaved();
    if (!id) return;
    setDownloading(true);
    try {
      const res = await api.get(`/posts/${id}/pack`, { responseType: "blob" });
      downloadBlob(`kaleido-pack-${id.slice(0, 8)}.zip`, res.data as Blob);
    } catch {
      addToast({
        type: "error",
        title: "Could not build the pack",
        message: "Please try again in a moment.",
      });
    } finally {
      setDownloading(false);
    }
  }

  async function handleSendToPhone() {
    if (sending) return;
    const id = await ensureSaved();
    if (!id) return;
    setSending(true);
    try {
      await api.post(`/posts/${id}/send-to-phone`);
      addToast({
        type: "success",
        title: "Sent to your phone",
        message: "Check your Telegram chat for the post.",
      });
    } catch (err: unknown) {
      const e = err as ApiErr;
      if (e.response?.status === 400) {
        addToast({
          type: "info",
          title: "Connect Telegram first",
          message: "Set up Send to phone in Settings, it takes two minutes.",
          duration: 8000,
        });
      } else {
        addToast({
          type: "error",
          title: "Could not send",
          message: errMessage(err, "Please try again."),
        });
      }
    } finally {
      setSending(false);
    }
  }

  async function handleSchedule() {
    if (!scheduledAt || scheduling) return;
    const id = await ensureSaved();
    if (!id) return;
    setScheduling(true);
    try {
      await api.post(`/schedule/posts/${id}`, {
        scheduled_at: new Date(scheduledAt).toISOString(),
      });
      setStatus("scheduled");
      addToast({
        type: "success",
        title: "Post scheduled",
        message: "You will find it on the Schedule page.",
      });
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Could not schedule",
        message: errMessage(err, "Please try again."),
      });
    } finally {
      setScheduling(false);
    }
  }

  async function handleMarkPosted() {
    if (marking) return;
    const id = await ensureSaved();
    if (!id) return;
    setMarking(true);
    try {
      await api.post(`/posts/${id}/mark-posted`, { platforms: labels });
      setStatus("published");
      addToast({
        type: "success",
        title: "Marked as posted",
        message: "Use Log results on the Posts page to track how it did.",
      });
    } catch {
      addToast({
        type: "error",
        title: "Could not update the post",
        message: "Please try again.",
      });
    } finally {
      setMarking(false);
    }
  }

  /* ---------- render helpers ---------- */

  const displayName = brandName || user?.full_name || "You";
  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || "Y";
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const aiBusy = aiWriting || improving || suggesting;

  if (loadingPost) {
    return (
      <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-8 lg:px-8 max-w-7xl mx-auto">
        <div className="glass-card p-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-amber-500 mb-3" />
          <p className="text-sm text-muted">Loading your post...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-8 lg:px-8 max-w-7xl mx-auto">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Post Studio</h1>
          <p className="text-sm text-muted mt-2">
            One screen for the whole post: caption, image, preview and export.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
              statusCfg.bg,
              statusCfg.color,
            )}
          >
            {statusCfg.icon}
            {statusCfg.label}
          </span>
          {postId && !dirty && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          {dirty && <span className="text-xs text-muted">Unsaved changes</span>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* ===== LEFT: live preview ===== */}
        <div className="lg:sticky lg:top-6">
          {/* platform tabs with char counters */}
          <div className="flex flex-wrap gap-2 mb-3">
            {labels.map((label) => {
              const len = (contents[label]?.text ?? "").length;
              const limit = platformByLabel(label)?.charLimit;
              const over = limit !== undefined && len > limit;
              const isActive = label === activeLabel;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveLabel(label)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    isActive
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-card-border text-muted hover:border-stone-300",
                  )}
                >
                  {label}
                  <span
                    className={clsx(
                      "ml-1.5",
                      over ? "text-red-500 font-semibold" : isActive ? "text-amber-600/70" : "text-muted",
                    )}
                  >
                    {len.toLocaleString()}
                    {limit !== undefined && `/${limit.toLocaleString()}`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* the post as people will see it */}
          <div className="glass-card p-5">
            <p className="text-xs text-muted mb-3">
              Preview, this is how the {activeLabel} post will read.
            </p>
            <div className="rounded-xl border border-card-border bg-background p-4">
              {/* author row */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {avatarLetter}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{displayName}</p>
                  <p className="text-xs text-muted">{activeLabel}</p>
                </div>
              </div>

              {/* caption */}
              {active.text ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-3">
                  {active.text}
                </p>
              ) : (
                <p className="text-sm text-muted italic mb-3">
                  Your caption shows up here as you type.
                </p>
              )}

              {/* image */}
              {media && media.file_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaSrc(media)}
                  alt={media.filename || "Post image"}
                  className="w-full rounded-xl border border-card-border mb-3"
                />
              )}

              {/* hashtag line */}
              {hashtags.length > 0 && (
                <p className="text-sm text-blue-600 break-words">
                  {hashtags.map((h) => `#${h}`).join(" ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ===== RIGHT: workbench ===== */}
        <div className="space-y-6">
          {/* 1. Caption card */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Caption</h2>
              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyAll}
                  onChange={(e) => setApplyAll(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-card-border accent-amber-500"
                />
                Apply edits to all platforms
              </label>
            </div>

            <textarea
              value={active.text}
              onChange={(e) => updateCaption(e.target.value)}
              rows={7}
              className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors resize-y"
              placeholder={`Write the ${activeLabel} caption...`}
            />

            {/* empty state: example topics */}
            {isEmpty && (
              <div className="mt-2">
                <p className="text-xs text-muted mb-2">
                  Blank page? Hand the AI a topic:
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_TOPICS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setAiPrompt(t);
                        aiInputRef.current?.focus();
                      }}
                      className="px-3 py-1.5 rounded-lg border border-dashed border-card-border text-xs text-muted hover:text-foreground hover:border-amber-500/40 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI row */}
            <div className="mt-4 pt-4 border-t border-card-border space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  ref={aiInputRef}
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleWriteWithAI();
                  }}
                  className="flex-1 rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                  placeholder="Topic for the AI, e.g. our spring release"
                />
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="rounded-lg border border-card-border bg-background px-2 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleWriteWithAI}
                  disabled={!aiPrompt.trim() || aiBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
                >
                  {aiWriting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Write with AI
                </button>
              </div>
              {aiWriting && (
                <p className="text-xs text-muted">
                  Writing one caption per platform on local AI. This can take a
                  few minutes, keep the tab open.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleImprove}
                  disabled={!active.text.trim() || aiBusy || saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border text-xs font-medium text-muted hover:text-foreground hover:border-amber-500/30 transition-colors disabled:opacity-50"
                  title={`Rewrite the ${activeLabel} caption with AI`}
                >
                  {improving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  Improve {activeLabel}
                </button>
                <button
                  onClick={handleSuggestHashtags}
                  disabled={!active.text.trim() || aiBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border text-xs font-medium text-muted hover:text-foreground hover:border-amber-500/30 transition-colors disabled:opacity-50"
                  title="Suggest hashtags from the active caption"
                >
                  {suggesting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Hash className="h-3.5 w-3.5" />
                  )}
                  Hashtags
                </button>
              </div>

              {/* hashtag chips */}
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {hashtags.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => removeHashtag(h)}
                      className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200/50 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                      title="Remove hashtag"
                    >
                      #{h}
                      <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. Visual card */}
          <div className="glass-card p-5">
            <h2 className="font-semibold mb-3">Visual</h2>

            {media ? (
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaSrc(media, true)}
                  alt={media.filename || "Attached image"}
                  className="h-24 w-24 rounded-lg object-cover border border-card-border shrink-0"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleGenerateImage}
                    disabled={generatingImage || !imgPrompt.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border text-xs font-medium text-muted hover:text-foreground hover:border-amber-500/30 transition-colors disabled:opacity-50"
                    title="Generate a new image with the same prompt"
                  >
                    {generatingImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Regenerate
                  </button>
                  <button
                    onClick={openLibrary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border text-xs font-medium text-muted hover:text-foreground hover:border-amber-500/30 transition-colors"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Replace from library
                  </button>
                  <button
                    onClick={removeMedia}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border text-xs font-medium text-red-500 hover:text-red-700 hover:border-red-300 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {/* generate with AI */}
                <div className="rounded-xl border border-dashed border-card-border p-4">
                  <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Generate with AI
                  </p>
                  <input
                    type="text"
                    value={imgPrompt}
                    onChange={(e) => {
                      setImgPrompt(e.target.value);
                      setImgPromptTouched(true);
                    }}
                    className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors mb-2"
                    placeholder="Describe the image..."
                  />
                  <div className="flex gap-2">
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-xs outline-none focus:border-amber-500 transition-colors"
                    >
                      {ASPECT_RATIOS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleGenerateImage}
                      disabled={generatingImage || !imgPrompt.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
                    >
                      {generatingImage ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5" />
                      )}
                      Generate
                    </button>
                  </div>
                  {generatingImage && (
                    <p className="text-xs text-muted mt-2">
                      Generating on local AI, usually under a minute.
                    </p>
                  )}
                </div>

                {/* choose from library */}
                <div className="rounded-xl border border-dashed border-card-border p-4 flex flex-col">
                  <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                    Choose from library
                  </p>
                  <p className="text-xs text-muted flex-1">
                    Reuse an image you already uploaded or generated.
                  </p>
                  <button
                    onClick={openLibrary}
                    className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium hover:border-amber-500/30 transition-colors"
                  >
                    Browse images
                  </button>
                </div>
              </div>
            )}

            {/* inline library grid */}
            <AnimatePresence>
              {showLibrary && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-card-border">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium">Your image library</p>
                      <button
                        onClick={() => setShowLibrary(false)}
                        className="p-1 rounded-md text-muted hover:text-foreground hover:bg-stone-100 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {libraryLoading ? (
                      <div className="py-6 text-center">
                        <Loader2 className="h-5 w-5 mx-auto animate-spin text-amber-500" />
                      </div>
                    ) : library.length === 0 ? (
                      <p className="text-xs text-muted py-4">
                        No images yet. Generate one on the left, or upload in the
                        Media Library.
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {library.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => attachFromLibrary(item)}
                            className={clsx(
                              "relative aspect-square rounded-lg overflow-hidden border transition-all hover:ring-2 hover:ring-amber-500/50",
                              media?.id === item.id
                                ? "border-amber-500 ring-2 ring-amber-500/50"
                                : "border-card-border",
                            )}
                            title={item.filename || "Attach this image"}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={mediaSrc(item, true)}
                              alt={item.filename || "Library image"}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Publish card */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Publish</h2>
              {postId && !dirty && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </span>
              )}
            </div>

            <button
              onClick={savePost}
              disabled={saving || !canSave || (!dirty && !!postId)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {postId ? "Save changes" : "Save draft"}
            </button>

            {postId && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDownloadPack}
                    disabled={downloading || saving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-card-border px-3 py-2 text-xs font-medium hover:border-amber-500/30 transition-colors disabled:opacity-50"
                    title="A zip with captions, hashtags, media and a checklist"
                  >
                    {downloading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Download pack
                  </button>
                  <button
                    onClick={handleSendToPhone}
                    disabled={sending || saving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-card-border px-3 py-2 text-xs font-medium hover:border-amber-500/30 transition-colors disabled:opacity-50"
                    title="Send caption and image to your Telegram"
                  >
                    {sending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Smartphone className="h-3.5 w-3.5" />
                    )}
                    Send to phone
                  </button>
                </div>

                {/* schedule */}
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="flex-1 rounded-lg border border-card-border bg-background px-3 py-2 text-xs outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    onClick={handleSchedule}
                    disabled={!scheduledAt || scheduling || saving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    {scheduling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Calendar className="h-3.5 w-3.5" />
                    )}
                    Schedule
                  </button>
                </div>

                <button
                  onClick={handleMarkPosted}
                  disabled={marking || saving}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-card-border px-3 py-2 text-xs font-medium text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                  title="I posted this manually on the platforms"
                >
                  {marking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Mark posted
                </button>
              </div>
            )}

            {!postId && (
              <p className="text-xs text-muted mt-3">
                Save once and you can download the pack, send it to your phone,
                schedule it or mark it posted.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- page (Suspense wrapper for useSearchParams) ---------- */

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-8 lg:px-8 max-w-7xl mx-auto">
          <div className="glass-card p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-amber-500" />
          </div>
        </div>
      }
    >
      <StudioInner />
    </Suspense>
  );
}
