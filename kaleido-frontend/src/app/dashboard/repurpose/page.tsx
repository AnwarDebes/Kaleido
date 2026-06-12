"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Download,
  Smartphone,
  Lightbulb,
  ListOrdered,
  Save,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import { useNotificationStore } from "@/lib/notifications";
import { PLATFORM_LABELS, platformByLabel } from "@/lib/platforms";
import { copyToClipboard, downloadBlob } from "@/lib/download";

/* ---------- types ---------- */

interface PlatformContent {
  text: string;
  hashtags: string[];
}

interface RepurposeResult {
  platform_contents: Record<string, PlatformContent>;
  image_prompt: string;
  carousel_outline: string[];
  hooks: string[];
  post: null;
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

const MIN_CHARS = 10;
const MAX_CHARS = 20000;

const DEFAULT_PLATFORMS = ["Instagram", "Twitter / X", "LinkedIn"];

const TONES = ["professional", "casual", "playful", "bold", "inspiring"];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "no", label: "Norsk" },
  { value: "ar", label: "Arabic" },
];

const EXAMPLES: { label: string; text: string }[] = [
  {
    label: "Product launch announcement",
    text: "We are launching [product name] next week. It helps [audience] solve [problem] by [main benefit]. Key features: [feature 1], [feature 2], [feature 3]. Early users told us: [short quote]. Available at [link].",
  },
  {
    label: "Turn my blog post into social content",
    text: "Paste your blog post here. Title: [title]. The main points are: [point 1], [point 2], [point 3]. The takeaway for readers: [conclusion]. Link to the full article: [link].",
  },
  {
    label: "Share a customer story",
    text: "Our customer [name] was struggling with [problem]. After they started using [product], they achieved [result] in [timeframe]. In their own words: [quote]. Here is what we learned from working with them: [lesson].",
  },
];

function buildStatusLines(platforms: string[]): string[] {
  return [
    "Reading your material...",
    "Finding the strongest angles...",
    ...platforms.map((p) =>
      p === "Instagram" ? "Writing the Instagram caption..." : `Writing the ${p} post...`,
    ),
    "Collecting hashtags...",
    "Drafting opening hooks...",
    "Sketching an image prompt...",
    "Outlining a carousel...",
    "Polishing the wording, almost there...",
  ];
}

/* ---------- page ---------- */

export default function RepurposePage() {
  const { addToast } = useNotificationStore();

  // input state
  const [sourceText, setSourceText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(DEFAULT_PLATFORMS);
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("en");
  const [brandId, setBrandId] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);

  // generation state
  const [generating, setGenerating] = useState(false);
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const [statusIndex, setStatusIndex] = useState(0);
  const [genError, setGenError] = useState("");

  // results state
  const [result, setResult] = useState<RepurposeResult | null>(null);
  const [contents, setContents] = useState<Record<string, PlatformContent>>({});

  // save / follow-up state
  const [saving, setSaving] = useState(false);
  const [savedPostId, setSavedPostId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);

  /* load brands for the optional brand select */
  useEffect(() => {
    let cancelled = false;
    api
      .get("/brands")
      .then((res) => {
        if (!cancelled) setBrands(res.data?.data ?? []);
      })
      .catch(() => {
        /* brand select stays on "No brand"; not critical */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* rotate the in-progress status line */
  useEffect(() => {
    if (!generating) return;
    const id = setInterval(() => setStatusIndex((i) => i + 1), 6000);
    return () => clearInterval(id);
  }, [generating]);

  const trimmedLength = sourceText.trim().length;
  const canGenerate =
    trimmedLength >= MIN_CHARS &&
    sourceText.length <= MAX_CHARS &&
    selectedPlatforms.length > 0 &&
    !generating;

  function togglePlatform(label: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label],
    );
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    setGenError("");
    setResult(null);
    setContents({});
    setSavedPostId(null);
    setStatusLines(buildStatusLines(selectedPlatforms));
    setStatusIndex(0);
    try {
      const res = await api.post(
        "/posts/repurpose",
        {
          source_text: sourceText.trim(),
          platforms: selectedPlatforms,
          tone,
          language,
          brand_id: brandId || null,
          create_draft: false,
        },
        // Local AI generation can take a few minutes, so allow up to 5.
        { timeout: 300000 },
      );
      const data = res.data?.data as RepurposeResult;
      setResult(data);
      setContents(data?.platform_contents ?? {});
    } catch (err: unknown) {
      const e = err as ApiErr;
      setGenError(
        e.response?.data?.error?.message ||
          "Generation failed. The AI service may be busy right now.",
      );
    } finally {
      setGenerating(false);
    }
  }

  function updateText(label: string, text: string) {
    setContents((prev) => ({
      ...prev,
      [label]: { text, hashtags: prev[label]?.hashtags ?? [] },
    }));
  }

  async function copyWithToast(text: string, title: string) {
    const ok = await copyToClipboard(text);
    if (ok) {
      addToast({ type: "success", title });
    } else {
      addToast({
        type: "error",
        title: "Copy failed",
        message: "Select the text and copy it manually.",
      });
    }
  }

  function copyPlatform(label: string) {
    const c = contents[label];
    if (!c) return;
    const tagLine = (c.hashtags || [])
      .map((h) => (h.startsWith("#") ? h : `#${h}`))
      .join(" ");
    copyWithToast([c.text, tagLine].filter(Boolean).join("\n\n"), `${label} copy ready to paste`);
  }

  async function handleSave() {
    const labels = Object.keys(contents);
    if (labels.length === 0 || saving) return;
    setSaving(true);
    try {
      const allTags = Array.from(
        new Set(labels.flatMap((l) => contents[l]?.hashtags ?? [])),
      );
      const res = await api.post("/posts", {
        content_text: contents[labels[0]]?.text ?? "",
        platform_contents: contents,
        hashtags: allTags,
        brand_id: brandId || null,
        status: "draft",
      });
      setSavedPostId(res.data?.data?.id ?? null);
      addToast({
        type: "success",
        title: "Draft saved",
        message: "You can find it any time under Posts.",
      });
    } catch (err: unknown) {
      const e = err as ApiErr;
      addToast({
        type: "error",
        title: "Could not save draft",
        message: e.response?.data?.error?.message || "Please try again in a moment.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPack() {
    if (!savedPostId || downloading) return;
    setDownloading(true);
    try {
      const res = await api.get(`/posts/${savedPostId}/pack`, {
        responseType: "blob",
      });
      downloadBlob(`kaleido-pack-${savedPostId.slice(0, 8)}.zip`, res.data as Blob);
    } catch {
      addToast({
        type: "error",
        title: "Download failed",
        message: "Please try again in a moment.",
      });
    } finally {
      setDownloading(false);
    }
  }

  async function handleSendToPhone() {
    if (!savedPostId || sending) return;
    setSending(true);
    try {
      await api.post(`/posts/${savedPostId}/send-to-phone`);
      addToast({
        type: "success",
        title: "Sent to your phone",
        message: "Check your Telegram chat for the post.",
      });
    } catch (err: unknown) {
      const e = err as ApiErr;
      if (e.response?.data?.error?.code === "REMINDERS_NOT_CONFIGURED") {
        addToast({
          type: "info",
          title: "Telegram not connected yet",
          message:
            "Connect your Telegram bot in Settings first, then Send to phone will work.",
          duration: 8000,
        });
      } else {
        addToast({
          type: "error",
          title: "Could not send",
          message: e.response?.data?.error?.message || "Please try again in a moment.",
        });
      }
    } finally {
      setSending(false);
    }
  }

  const resultLabels = Object.keys(contents);
  const currentStatus =
    statusLines.length > 0 ? statusLines[statusIndex % statusLines.length] : "Working...";

  /* ---------- render ---------- */

  return (
    <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-8 lg:px-8 max-w-5xl mx-auto">
      {/* header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Repurpose Studio</h1>
        <p className="text-sm text-muted mt-2">
          Paste anything: an idea, a blog post, a script. Kaleido turns it into
          ready-to-post content for every platform.
        </p>
      </div>

      {/* input card */}
      <div className="glass-card p-5 sm:p-6 mb-6">
        <label className="block text-sm font-medium mb-1.5">Source material</label>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors resize-y"
          placeholder="Paste an idea, a blog article, a video script, meeting notes... anything with at least 10 characters."
        />
        <p
          className={clsx(
            "mt-1 text-xs text-right",
            sourceText.length > MAX_CHARS ? "text-red-500 font-medium" : "text-muted",
          )}
        >
          {sourceText.length.toLocaleString()}/{MAX_CHARS.toLocaleString()} characters
          {sourceText.length > MAX_CHARS && ", trim it down before generating"}
          {trimmedLength > 0 && trimmedLength < MIN_CHARS && `, minimum ${MIN_CHARS}`}
        </p>

        {/* example starters when the textarea is empty */}
        {trimmedLength === 0 && (
          <div className="mt-2 mb-4">
            <p className="text-xs text-muted mb-2">Need a starting point?</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => setSourceText(ex.text)}
                  className="px-3 py-1.5 rounded-lg border border-dashed border-card-border text-xs text-muted hover:text-foreground hover:border-amber-500/40 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* platforms */}
        <div className="mt-4 mb-4">
          <label className="block text-sm font-medium mb-2">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_LABELS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  selectedPlatforms.includes(p)
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-card-border text-muted hover:border-stone-300",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* tone / language / brand */}
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Brand</label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            >
              <option value="">No brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Create content pack
          </button>
        </div>
      </div>

      {/* in-progress state */}
      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-10 text-center mb-6"
          >
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-amber-500 mb-4" />
            <AnimatePresence mode="wait">
              <motion.p
                key={statusIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-sm font-medium"
              >
                {currentStatus}
              </motion.p>
            </AnimatePresence>
            <p className="text-xs text-muted mt-3">
              This runs on local AI and usually takes one to three minutes. Keep
              this tab open.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* generation error */}
      {genError && !generating && (
        <div className="glass-card border-red-500/20 p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-600">{genError}</p>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-card-border px-4 py-2 text-sm font-medium hover:border-amber-500/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* results */}
      {result && !generating && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-lg font-bold mb-4">Your content pack</h2>

          {/* per-platform editable cards */}
          <div className="space-y-4 mb-6">
            {resultLabels.map((label) => {
              const c = contents[label];
              const limit = platformByLabel(label)?.charLimit;
              const over = limit !== undefined && c.text.length > limit;
              return (
                <div key={label} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{label}</h3>
                    <span
                      className={clsx(
                        "text-xs",
                        over ? "text-red-500 font-medium" : "text-muted",
                      )}
                    >
                      {c.text.length.toLocaleString()}
                      {limit !== undefined && `/${limit.toLocaleString()}`}
                      {over && ", too long for this platform"}
                    </span>
                  </div>
                  <textarea
                    value={c.text}
                    onChange={(e) => updateText(label, e.target.value)}
                    rows={6}
                    className={clsx(
                      "w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-1 transition-colors resize-y",
                      over
                        ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/30"
                        : "border-card-border focus:border-amber-500 focus:ring-amber-500/30",
                    )}
                  />
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {(c.hashtags || []).map((h) => (
                      <span
                        key={h}
                        className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200/50"
                      >
                        {h.startsWith("#") ? h : `#${h}`}
                      </span>
                    ))}
                    <button
                      onClick={() => copyPlatform(label)}
                      className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border text-xs font-medium text-muted hover:text-foreground hover:border-amber-500/30 transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* hooks / image prompt / carousel outline */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {/* hooks */}
            <div className="glass-card p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Hooks
              </h3>
              {result.hooks.length === 0 ? (
                <p className="text-xs text-muted">No hooks were generated this time.</p>
              ) : (
                <ul className="space-y-2">
                  {result.hooks.map((hook, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <p className="text-xs leading-relaxed flex-1">{hook}</p>
                      <button
                        onClick={() => copyWithToast(hook, "Hook copied")}
                        className="p-1 rounded-md text-muted hover:text-foreground hover:bg-stone-100 transition-colors shrink-0"
                        title="Copy hook"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* image prompt */}
            <div className="glass-card p-5 flex flex-col">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-amber-500" />
                Image prompt
              </h3>
              <p className="text-xs leading-relaxed flex-1">
                {result.image_prompt || "No image prompt was generated this time."}
              </p>
              <div className="flex items-center gap-3 mt-4">
                {result.image_prompt && (
                  <button
                    onClick={() => copyWithToast(result.image_prompt, "Image prompt copied")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border text-xs font-medium text-muted hover:text-foreground hover:border-amber-500/30 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                )}
                <Link
                  href="/dashboard/media"
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-500 transition-colors"
                >
                  Generate it in Media
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* carousel outline */}
            <div className="glass-card p-5 flex flex-col">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-amber-500" />
                Carousel outline
              </h3>
              {result.carousel_outline.length === 0 ? (
                <p className="text-xs text-muted flex-1">
                  No carousel outline was generated this time.
                </p>
              ) : (
                <>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs leading-relaxed flex-1">
                    {result.carousel_outline.map((slide, i) => (
                      <li key={i}>{slide}</li>
                    ))}
                  </ol>
                  <button
                    onClick={() =>
                      copyWithToast(
                        result.carousel_outline
                          .map((s, i) => `${i + 1}. ${s}`)
                          .join("\n"),
                        "Carousel outline copied",
                      )
                    }
                    className="mt-4 self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border text-xs font-medium text-muted hover:text-foreground hover:border-amber-500/30 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy all
                  </button>
                </>
              )}
            </div>
          </div>

          {/* sticky footer bar */}
          <div className="sticky bottom-3 z-20">
            <div className="glass-card px-4 py-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                {savedPostId
                  ? "Saved as a draft. Take it with you."
                  : "Happy with the pack? Save it to your drafts."}
              </p>
              {savedPostId ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleDownloadPack}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 rounded-lg border border-card-border px-4 py-2 text-sm font-medium hover:border-amber-500/30 transition-colors disabled:opacity-50"
                  >
                    {downloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download pack
                  </button>
                  <button
                    onClick={handleSendToPhone}
                    disabled={sending}
                    className="inline-flex items-center gap-2 rounded-lg border border-card-border px-4 py-2 text-sm font-medium hover:border-amber-500/30 transition-colors disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Smartphone className="h-4 w-4" />
                    )}
                    Send to phone
                  </button>
                  <Link
                    href="/dashboard/posts"
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
                  >
                    <FileText className="h-4 w-4" />
                    View in Posts
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || resultLabels.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save as draft
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
