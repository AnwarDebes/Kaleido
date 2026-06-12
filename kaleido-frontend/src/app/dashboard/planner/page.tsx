"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  CalendarDays,
  ArrowRight,
  FileText,
} from "lucide-react";
import clsx from "clsx";
import { format, addDays, parseISO } from "date-fns";
import { api } from "@/lib/api";
import { useNotificationStore } from "@/lib/notifications";
import { PLATFORM_LABELS } from "@/lib/platforms";

/* ---------- types ---------- */

interface PlatformContent {
  text: string;
  hashtags: string[];
}

interface PlannedPost {
  id: string;
  content_text: string;
  platform_contents: Record<string, PlatformContent>;
  scheduled_at: string | null;
  status: string;
}

interface PlannedItem {
  title: string;
  format: string;
  post: PlannedPost;
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

const MAX_FOCUS_CHARS = 2000;

const DEFAULT_PLATFORMS = ["Instagram", "Twitter / X", "LinkedIn"];

const COUNT_OPTIONS = [3, 5, 7];

const TONES = ["professional", "casual", "playful", "bold", "inspiring"];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "no", label: "Norsk" },
  { value: "ar", label: "Arabic" },
];

const FLAVOR_LINES = [
  "Picking a varied topic for this one...",
  "Writing every platform version...",
  "Choosing a good time slot...",
  "Keeping the week balanced...",
  "Polishing the wording...",
];

/* roughly how long the backend spends on one post (sequential local AI) */
const SECONDS_PER_POST = 20;

function previewText(item: PlannedItem): string {
  const labels = Object.keys(item.post.platform_contents ?? {});
  const text =
    item.post.content_text ||
    (labels.length > 0 ? item.post.platform_contents[labels[0]]?.text : "") ||
    "";
  return text.length > 140 ? `${text.slice(0, 140).trimEnd()}...` : text;
}

/* ---------- page ---------- */

export default function PlannerPage() {
  const { addToast } = useNotificationStore();

  // input state
  const [focus, setFocus] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(DEFAULT_PLATFORMS);
  const [count, setCount] = useState(5);
  const [startDate, setStartDate] = useState(() =>
    format(addDays(new Date(), 1), "yyyy-MM-dd"),
  );
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("en");
  const [brandId, setBrandId] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);

  // generation state
  const [planning, setPlanning] = useState(false);
  const [plannedCount, setPlannedCount] = useState(5);
  const [elapsed, setElapsed] = useState(0);
  const [planError, setPlanError] = useState("");

  // results state
  const [items, setItems] = useState<PlannedItem[] | null>(null);

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

  /* tick a timer while planning so we can show honest per-post progress */
  useEffect(() => {
    if (!planning) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [planning]);

  const canPlan =
    selectedPlatforms.length > 0 && focus.length <= MAX_FOCUS_CHARS && !planning;

  function togglePlatform(label: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label],
    );
  }

  async function handlePlan() {
    if (!canPlan) return;
    setPlanning(true);
    setPlanError("");
    setItems(null);
    setPlannedCount(count);
    try {
      const res = await api.post(
        "/posts/plan-week",
        {
          platforms: selectedPlatforms,
          focus: focus.trim(),
          count,
          start_date: startDate || null,
          tone,
          language,
          brand_id: brandId || null,
        },
        // Posts are written one at a time on local AI, about 20 seconds each,
        // so a full week can take a few minutes. Allow up to 5.
        { timeout: 300000 },
      );
      const data = (res.data?.data ?? []) as PlannedItem[];
      setItems(data);
      addToast({
        type: "success",
        title: "Your week is planned",
        message: `${data.length} ${data.length === 1 ? "post" : "posts"} scheduled as drafts.`,
      });
    } catch (err: unknown) {
      const e = err as ApiErr;
      setPlanError(
        e.response?.data?.error?.message ||
          "Planning failed. The AI service may be busy right now.",
      );
    } finally {
      setPlanning(false);
    }
  }

  /* the backend writes posts sequentially, so estimate which one is in progress */
  const currentPost = Math.min(
    plannedCount,
    Math.floor(elapsed / SECONDS_PER_POST) + 1,
  );
  const flavorLine = FLAVOR_LINES[Math.floor(elapsed / 6) % FLAVOR_LINES.length];

  /* ---------- render ---------- */

  return (
    <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-8 lg:px-8 max-w-4xl mx-auto">
      {/* header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Week Planner</h1>
        <p className="text-sm text-muted mt-2">
          One click, one planned week. Kaleido picks varied topics, writes every
          post, and schedules them at good times.
        </p>
      </div>

      {/* input card */}
      <div className="glass-card p-5 sm:p-6 mb-6">
        <label className="block text-sm font-medium mb-1.5">Focus (optional)</label>
        <textarea
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors resize-y"
          placeholder="What should this week be about? Leave empty for a varied mix."
        />
        <p
          className={clsx(
            "mt-1 text-xs text-right",
            focus.length > MAX_FOCUS_CHARS ? "text-red-500 font-medium" : "text-muted",
          )}
        >
          {focus.length.toLocaleString()}/{MAX_FOCUS_CHARS.toLocaleString()} characters
          {focus.length > MAX_FOCUS_CHARS && ", trim it down before planning"}
        </p>

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

        {/* count / start date / tone / language / brand */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1.5">Posts this week</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            >
              {COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} posts
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            />
          </div>
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
            onClick={handlePlan}
            disabled={!canPlan}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
          >
            {planning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Plan my week
          </button>
        </div>
      </div>

      {/* in-progress state */}
      <AnimatePresence>
        {planning && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-10 text-center mb-6"
          >
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-amber-500 mb-4" />
            <p className="text-sm font-medium">
              Writing post {currentPost} of {plannedCount}... this takes a minute
              or two
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={flavorLine}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-xs text-muted mt-2"
              >
                {flavorLine}
              </motion.p>
            </AnimatePresence>
            <p className="text-xs text-muted mt-3">
              Posts are written one at a time on local AI, about 20 seconds each.
              Keep this tab open.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* planning error */}
      {planError && !planning && (
        <div className="glass-card border-red-500/20 p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-600">{planError}</p>
              <button
                onClick={handlePlan}
                disabled={!canPlan}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-card-border px-4 py-2 text-sm font-medium hover:border-amber-500/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* results: vertical timeline */}
      {items && !planning && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-lg font-bold mb-4">Your week</h2>

          {items.length === 0 ? (
            <div className="glass-card p-6 mb-6">
              <p className="text-sm text-muted">
                No posts came back this time. Try again, or adjust the focus and
                platforms.
              </p>
            </div>
          ) : (
            <ol className="relative border-l border-card-border ml-3 space-y-4 mb-6">
              {items.map((item, i) => {
                const date = item.post.scheduled_at
                  ? parseISO(item.post.scheduled_at)
                  : null;
                const preview = previewText(item);
                return (
                  <li key={item.post.id || i} className="relative pl-6">
                    <span className="absolute -left-[5px] top-6 h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <div className="glass-card p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                        {date ? (
                          <p className="text-xs font-semibold text-amber-600">
                            {format(date, "EEEE")}, {format(date, "MMM d")} at{" "}
                            {format(date, "h:mm a")}
                          </p>
                        ) : (
                          <p className="text-xs font-semibold text-muted">
                            Not scheduled yet
                          </p>
                        )}
                        {item.format && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200/50">
                            {item.format}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                      {preview && (
                        <p className="text-xs text-muted leading-relaxed mb-3">
                          {preview}
                        </p>
                      )}
                      <Link
                        href="/dashboard/posts"
                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-500 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Edit in Posts
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* honest note + footer links */}
          <p className="text-xs text-muted mb-4">
            These are scheduled drafts. Platforms that are not connected will not
            auto-publish; when a post comes due you get a reminder and a manual
            share flow.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/schedule"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
            >
              <CalendarDays className="h-4 w-4" />
              Open Schedule
            </Link>
            <Link
              href="/dashboard/posts"
              className="inline-flex items-center gap-2 rounded-lg border border-card-border px-4 py-2 text-sm font-medium hover:border-amber-500/30 transition-colors"
            >
              View all in Posts
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
