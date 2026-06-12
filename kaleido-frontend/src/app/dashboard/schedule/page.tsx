"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Send,
  X,
  Loader2,
  Zap,
  CalendarOff,
  RotateCcw,
  Plus,
  Download,
} from "lucide-react";
import { api } from "@/lib/api";
import { PLATFORM_LABELS, platformByLabel } from "@/lib/platforms";
import { buildIcs } from "@/lib/ics";
import { downloadText } from "@/lib/download";
import ShareModal, { type ShareModalContent } from "@/components/dashboard/ShareModal";
import { useNotificationStore } from "@/lib/notifications";
import clsx from "clsx";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";

/* ---------- types ---------- */

interface DraftPost {
  id: string;
  content_text: string | null;
  platform_contents: Record<string, unknown>;
  status: string;
  created_at: string;
}

interface ScheduledPost {
  id: string;
  post_id?: string;
  content_text: string | null;
  platform_contents: Record<string, unknown>;
  status: string;
  scheduled_at: string;
  created_at?: string;
}

interface CalendarResponse {
  data: ScheduledPost[];
}

interface SuggestTimeResponse {
  data: {
    suggested_times?: string[];
    suggested_time?: string;
    platform?: string;
  };
}

/* ---------- constants ---------- */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PLATFORMS = PLATFORM_LABELS;

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500",
  publishing: "bg-blue-400",
  published: "bg-green-500",
  partially_published: "bg-amber-500",
  needs_manual_share: "bg-amber-500",
  failed: "bg-red-500",
  draft: "bg-stone-400",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  partially_published: "Partly published",
  needs_manual_share: "Share manually",
  failed: "Failed",
  draft: "Draft",
};

/* ---------- helpers ---------- */

function getCalendarDays(currentMonth: Date): Date[] {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }
  return days;
}

/* ---------- skeleton ---------- */

function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-px bg-stone-200 rounded-xl overflow-hidden animate-pulse">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="bg-white h-24 p-2">
          <div className="h-4 w-6 rounded bg-stone-200 mb-2" />
        </div>
      ))}
    </div>
  );
}

/* ---------- main page ---------- */

export default function SchedulePage() {
  const searchParams = useSearchParams();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [shareContent, setShareContent] = useState<ShareModalContent | null>(null);
  const { addToast } = useNotificationStore();

  // suggest time
  const [suggestPlatform, setSuggestPlatform] = useState("Instagram");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([]);

  // action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [draftPosts, setDraftPosts] = useState<DraftPost[]>([]);
  const [schedulePostId, setSchedulePostId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduling, setScheduling] = useState(false);

  /* fetch calendar data */
  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      const res = await api.get<CalendarResponse>("/schedule/calendar", {
        params: { start_date: startDate, end_date: endDate },
      });
      setScheduledPosts(res.data.data ?? []);
    } catch {
      setError("Failed to load calendar. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Auto-open schedule modal if post param is present
  useEffect(() => {
    const postId = searchParams.get("post");
    if (postId) {
      setSchedulePostId(postId);
      setShowScheduleModal(true);
      fetchDraftPosts();
    }
  }, [searchParams]);

  async function fetchDraftPosts() {
    try {
      const res = await api.get("/posts?status=draft&per_page=50");
      setDraftPosts(res.data.data || []);
    } catch {
      // ignore
    }
  }

  async function openScheduleModal() {
    setShowScheduleModal(true);
    setScheduleDate(format(selectedDate || new Date(), "yyyy-MM-dd"));
    setScheduleTime("09:00");
    setSchedulePostId("");
    await fetchDraftPosts();
  }

  async function handleSchedulePost() {
    if (!schedulePostId || !scheduleDate || !scheduleTime) return;
    setScheduling(true);
    setError("");
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      await api.post(`/schedule/posts/${schedulePostId}`, {
        scheduled_at: scheduledAt,
      });
      setShowScheduleModal(false);
      setSchedulePostId("");
      fetchCalendar();
    } catch {
      setError("Failed to schedule post. Please try again.");
    } finally {
      setScheduling(false);
    }
  }

  /* handlers */
  function goToday() {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  }

  function getPostsForDay(day: Date): ScheduledPost[] {
    return scheduledPosts.filter((p) =>
      isSameDay(new Date(p.scheduled_at), day)
    );
  }

  async function handleUnschedule(postId: string) {
    setActionLoading(postId);
    try {
      await api.delete(`/schedule/posts/${postId}`);
      fetchCalendar();
      // refresh selected day
    } catch {
      setError("Failed to unschedule post.");
    } finally {
      setActionLoading(null);
    }
  }

  function openShareForScheduled(post: ScheduledPost) {
    const labels = Object.keys(post.platform_contents || {});
    const platformIds = labels
      .map((label) => platformByLabel(label)?.id || label.toLowerCase())
      .filter(Boolean);
    setShareContent({
      title: "Share this post manually",
      subtitle: "These platforms are not connected yet, so copy or download and post yourself.",
      text: post.content_text || "",
      platformIds,
      suggestedName: (post.content_text || "post").split("\n")[0],
    });
  }

  async function handlePublishNow(postId: string) {
    setActionLoading(postId);
    const post = scheduledPosts.find((p) => (p.post_id || p.id) === postId || p.id === postId);
    try {
      const res = await api.post(`/schedule/posts/${postId}/publish`);
      const updated = res.data?.data as
        | {
            status?: string;
            publication_summary?: {
              platform: string;
              status: "published" | "failed" | "not_connected";
              reason?: string | null;
            }[];
          }
        | undefined;
      const status = updated?.status;
      const summary = updated?.publication_summary || [];
      const byStatus = (s: string) =>
        summary.filter((entry) => entry.status === s).map((entry) => entry.platform);
      const published = byStatus("published");
      const failedPlatforms = byStatus("failed");
      const notConnected = byStatus("not_connected");

      if (status === "draft" || status === "needs_manual_share") {
        if (post) openShareForScheduled(post);
        addToast({
          type: "info",
          title: "Not connected yet",
          message:
            notConnected.length > 0
              ? `${notConnected.join(", ")}: copy or download and post manually.`
              : "No connected account for those platforms yet. Copy or download and post manually.",
          duration: 8000,
        });
      } else if (status === "published") {
        addToast({
          type: "success",
          title: "Published",
          message: published.length > 0 ? `Live on ${published.join(", ")}.` : undefined,
        });
      } else if (status === "partially_published" || status === "failed") {
        const parts: string[] = [];
        if (published.length > 0) parts.push(`Published: ${published.join(", ")}.`);
        if (failedPlatforms.length > 0) parts.push(`Failed: ${failedPlatforms.join(", ")}.`);
        if (notConnected.length > 0)
          parts.push(`Not connected, share manually: ${notConnected.join(", ")}.`);
        setError(parts.length > 0 ? parts.join(" ") : "Publish did not complete on every platform.");
      }
      fetchCalendar();
    } catch {
      if (post) openShareForScheduled(post);
      setError(
        "Direct publish failed. The share menu is open so you can download or post manually.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  function exportIcs() {
    if (scheduledPosts.length === 0) {
      setError("No scheduled posts in this view to export.");
      return;
    }
    const events = scheduledPosts.map((post) => {
      const platforms = Object.keys(post.platform_contents || {}).join(", ");
      const body = post.content_text || "Kaleido post";
      const summary = `${platforms ? `[${platforms}] ` : ""}${body.split("\n")[0].slice(0, 80)}`;
      return {
        uid: `kaleido-${post.id}@kaleido.social`,
        start: new Date(post.scheduled_at),
        summary,
        description: body,
      };
    });
    const ics = buildIcs(events, `Kaleido ${format(currentMonth, "MMMM yyyy")}`);
    downloadText(`kaleido-${format(currentMonth, "yyyy-MM")}.ics`, ics, "text/calendar");
  }

  async function handleSuggestTime() {
    setSuggestLoading(true);
    setSuggestedTimes([]);
    try {
      const res = await api.get<SuggestTimeResponse>("/schedule/suggest-time", {
        params: { platform: suggestPlatform },
      });
      const data = res.data.data;
      if (data?.suggested_times) {
        setSuggestedTimes(data.suggested_times);
      } else if (data?.suggested_time) {
        setSuggestedTimes([data.suggested_time]);
      } else {
        setSuggestedTimes([]);
      }
    } catch {
      setError("Failed to get time suggestions.");
    } finally {
      setSuggestLoading(false);
    }
  }

  const calendarDays = getCalendarDays(currentMonth);
  const selectedDayPosts = selectedDate ? getPostsForDay(selectedDate) : [];

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Schedule</h1>

        {/* month navigation */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openScheduleModal}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
          >
            <Plus className="h-4 w-4" />
            Schedule Post
          </button>
          <button
            onClick={exportIcs}
            title="Download the visible month as a calendar file (.ics)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-card-border hover:bg-stone-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export .ics</span>
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-card-border hover:bg-stone-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg border border-card-border hover:bg-stone-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg border border-card-border hover:bg-stone-50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* manual-share notice */}
      <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
        <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Heads up: platforms that are not connected will not auto-publish. When a scheduled
          post comes due without a connected account, it is marked
          <span className="font-semibold"> Share manually</span> and stays on the calendar,
          and Publish Now opens the share menu so you can post it yourself.
        </span>
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

      <div className="flex flex-col lg:flex-row gap-6">
        {/* calendar grid */}
        <div className="flex-1">
          {loading ? (
            <CalendarSkeleton />
          ) : (
            <div className="glass-card overflow-hidden">
              {/* weekday headers */}
              <div className="grid grid-cols-7 border-b border-card-border">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="px-2 py-3 text-xs font-semibold text-muted text-center uppercase tracking-wide"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* day cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  const dayPosts = getPostsForDay(day);
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);
                  const isSelected =
                    selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={clsx(
                        "relative h-20 sm:h-24 p-1.5 sm:p-2 text-left border-b border-r border-card-border transition-colors",
                        !inMonth && "opacity-40",
                        isSelected && "bg-amber-50/60",
                        !isSelected && "hover:bg-stone-50/50"
                      )}
                    >
                      <span
                        className={clsx(
                          "inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium",
                          today &&
                            "bg-amber-500 text-white",
                          !today && "text-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {/* post dots */}
                      {dayPosts.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {dayPosts.slice(0, 3).map((p, i) => (
                            <span
                              key={i}
                              className={clsx(
                                "h-1.5 w-1.5 rounded-full",
                                STATUS_COLORS[p.status] ?? "bg-stone-400"
                              )}
                              title={(p.content_text || "").slice(0, 40)}
                            />
                          ))}
                          {dayPosts.length > 3 && (
                            <span className="text-[10px] text-muted leading-none">
                              +{dayPosts.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* side panel */}
        <div className="w-full lg:w-80 space-y-4">
          {/* selected day detail */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-amber-500" />
              {selectedDate
                ? format(selectedDate, "EEEE, MMMM d")
                : "Select a day"}
            </h3>

            {!selectedDate ? (
              <p className="text-xs text-muted">
                Click on a calendar day to view scheduled posts.
              </p>
            ) : selectedDayPosts.length === 0 ? (
              <div className="text-center py-6">
                <CalendarOff className="h-8 w-8 mx-auto text-muted mb-2" />
                <p className="text-sm text-muted">No posts scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {selectedDayPosts.map((post) => {
                    const postId = post.post_id ?? post.id;
                    const isActioning = actionLoading === postId;

                    return (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="rounded-lg border border-card-border bg-background p-3"
                      >
                        {/* time */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Clock className="h-3 w-3 text-muted" />
                          <span className="text-xs font-medium text-muted">
                            {format(new Date(post.scheduled_at), "h:mm a")}
                          </span>
                          <span
                            className={clsx(
                              "ml-auto h-2 w-2 rounded-full",
                              STATUS_COLORS[post.status] ?? "bg-stone-400"
                            )}
                          />
                        </div>

                        {/* text preview */}
                        <p className="text-xs leading-relaxed mb-2 line-clamp-2">
                          {(post.content_text || "").length > 80
                            ? (post.content_text || "").slice(0, 80) + "..."
                            : post.content_text || ""}
                        </p>

                        {/* platforms */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {Object.keys(post.platform_contents || {}).map((p) => (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/50"
                            >
                              {p}
                            </span>
                          ))}
                        </div>

                        {/* actions */}
                        <div className="flex gap-2 pt-2 border-t border-card-border">
                          {post.status === "scheduled" && (
                            <>
                              <button
                                onClick={() => handleUnschedule(postId)}
                                disabled={isActioning}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-muted hover:text-foreground hover:bg-stone-100 transition-colors disabled:opacity-50"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Unschedule
                              </button>
                              <button
                                onClick={() => handlePublishNow(postId)}
                                disabled={isActioning}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                              >
                                {isActioning ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Send className="h-3 w-3" />
                                )}
                                Publish Now
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* suggest time */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Suggest Best Time
            </h3>

            <div className="mb-3">
              <label className="block text-xs font-medium text-muted mb-1.5">
                Platform
              </label>
              <select
                value={suggestPlatform}
                onChange={(e) => setSuggestPlatform(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSuggestTime}
              disabled={suggestLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
            >
              {suggestLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Suggest Best Time
            </button>

            {/* results */}
            {suggestedTimes.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-medium text-muted">
                  Recommended times:
                </p>
                {suggestedTimes.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200/50"
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">
                      {t}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* legend */}
          <div className="glass-card p-4">
            <h4 className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">
              Legend
            </h4>
            <div className="space-y-1.5">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={clsx("h-2.5 w-2.5 rounded-full", color)} />
                  <span className="text-xs">{STATUS_LABELS[status] || status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Post Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => !scheduling && setShowScheduleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="glass-card p-5 sm:p-6 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-amber-500" />
                  Schedule Post
                </h2>
                <button
                  onClick={() => !scheduling && setShowScheduleModal(false)}
                  className="p-1 rounded-md hover:bg-stone-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Select post */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Select a draft post
                  </label>
                  <select
                    value={schedulePostId}
                    onChange={(e) => setSchedulePostId(e.target.value)}
                    className="w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                  >
                    <option value="">Choose a post...</option>
                    {draftPosts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {(p.content_text || "Untitled").slice(0, 60)}
                        {(p.content_text || "").length > 60 ? "..." : ""}
                      </option>
                    ))}
                  </select>
                  {draftPosts.length === 0 && (
                    <p className="text-xs text-muted mt-1">
                      No draft posts available. Create a post first.
                    </p>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                    className="w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSchedulePost}
                    disabled={scheduling || !schedulePostId || !scheduleDate}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
                  >
                    {scheduling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarIcon className="h-4 w-4" />
                    )}
                    {scheduling ? "Scheduling..." : "Schedule"}
                  </button>
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="rounded-lg border border-card-border px-4 py-2.5 text-sm font-medium hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareModal
        open={!!shareContent}
        onClose={() => setShareContent(null)}
        content={shareContent}
      />
    </div>
  );
}
