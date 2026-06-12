"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  FileText,
  CalendarClock,
  TrendingUp,
  BarChart3,
  Plus,
  Sparkles,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Film,
  Share2,
  Info,
  Lightbulb,
  RefreshCw,
  Wand2,
  CheckCircle2,
  Flame,
} from "lucide-react";

interface User {
  full_name: string;
}

interface OverviewMetrics {
  total_posts: number;
  scheduled_posts: number;
  total_engagement: number;
  growth_rate: number;
  engagement_trend?: number;
  growth_trend?: number;
}

interface Post {
  id: string;
  content_text?: string;
  status: string;
  platform_contents: Record<string, unknown>;
  created_at: string;
}

interface ScheduledPost {
  id: string;
  content_text?: string;
  platform_contents: Record<string, unknown>;
  status: string;
  scheduled_at: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    draft: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
    scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    partially_published: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    needs_manual_share: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const labels: Record<string, string> = {
    partially_published: "Partly published",
    needs_manual_share: "Share manually",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] || styles.draft
      }`}
    >
      {labels[status] || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card p-6 animate-pulse">
      <div className="h-4 w-20 bg-stone-200 dark:bg-stone-700 rounded mb-4" />
      <div className="h-8 w-16 bg-stone-200 dark:bg-stone-700 rounded mb-2" />
      <div className="h-3 w-24 bg-stone-200 dark:bg-stone-700 rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 animate-pulse">
      <div className="h-4 w-48 bg-stone-200 dark:bg-stone-700 rounded" />
      <div className="h-4 w-16 bg-stone-200 dark:bg-stone-700 rounded" />
      <div className="h-4 w-20 bg-stone-200 dark:bg-stone-700 rounded" />
    </div>
  );
}

interface Idea {
  title: string;
  description: string;
  format: string;
  topic: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [connectedAccountCount, setConnectedAccountCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [ideasError, setIdeasError] = useState(false);
  const [activity, setActivity] = useState<{
    streak_days: number;
    published_this_week: number;
    published_total: number;
  } | null>(null);
  const [hasBrand, setHasBrand] = useState<boolean | null>(null);
  const [phoneConfigured, setPhoneConfigured] = useState<boolean | null>(null);

  async function fetchIdeas(refresh = false) {
    setIdeasLoading(true);
    setIdeasError(false);
    try {
      const res = await api.get("/posts/ideas", { params: { count: 4, refresh } });
      setIdeas(res.data?.data?.ideas || []);
    } catch {
      setIdeasError(true);
    } finally {
      setIdeasLoading(false);
    }
  }

  useEffect(() => {
    fetchIdeas();
  }, []);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch user info
        const userRes = await api.get("/auth/me");
        setUser(userRes.data.data?.user || userRes.data.data);
      } catch {
        // If auth fails, the interceptor handles redirect
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sevenDaysLater = new Date(now);
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

      const startDate = thirtyDaysAgo.toISOString().split("T")[0];
      const endDate = now.toISOString().split("T")[0];
      const futureDate = sevenDaysLater.toISOString().split("T")[0];

      // Fetch all data in parallel, handle each individually
      const [overviewResult, postsResult, scheduleResult, accountsResult, activityResult, brandsResult, remindersResult] =
        await Promise.allSettled([
          api.get(`/analytics/overview?start_date=${startDate}&end_date=${endDate}`),
          api.get("/posts?page=1&per_page=5"),
          api.get(`/schedule/calendar?start_date=${endDate}&end_date=${futureDate}`),
          api.get("/social-accounts"),
          api.get("/analytics/activity"),
          api.get("/brands"),
          api.get("/notifications/reminders"),
        ]);

      if (activityResult.status === "fulfilled") {
        setActivity(activityResult.value.data.data || null);
      }
      if (brandsResult.status === "fulfilled") {
        setHasBrand((brandsResult.value.data.data || []).length > 0);
      }
      if (remindersResult.status === "fulfilled") {
        setPhoneConfigured(!!remindersResult.value.data.data?.configured);
      }

      if (overviewResult.status === "fulfilled") {
        const overview = overviewResult.value.data.data || overviewResult.value.data;
        setMetrics({
          total_posts: overview.total_posts_published ?? overview.total_posts ?? 0,
          scheduled_posts: overview.scheduled_posts ?? 0,
          total_engagement: overview.total_engagement ?? 0,
          growth_rate: overview.avg_engagement_rate ?? overview.growth_rate ?? 0,
          engagement_trend: overview.engagement_trend,
          growth_trend: overview.growth_trend,
        });
      } else {
        setMetrics({
          total_posts: 0,
          scheduled_posts: 0,
          total_engagement: 0,
          growth_rate: 0,
        });
      }

      if (postsResult.status === "fulfilled") {
        const payload = postsResult.value.data;
        setRecentPosts(payload.data || []);
      }

      if (scheduleResult.status === "fulfilled") {
        const payload = scheduleResult.value.data;
        setScheduledPosts(payload.data || []);
      }

      if (accountsResult.status === "fulfilled") {
        const payload = accountsResult.value.data;
        const accounts = (payload.data || []) as Array<{ is_active?: boolean }>;
        setConnectedAccountCount(accounts.filter((a) => a.is_active !== false).length);
      } else {
        setConnectedAccountCount(0);
      }

      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statsCards = [
    {
      label: "Total Posts",
      value: metrics?.total_posts ?? 0,
      icon: FileText,
      trend: null as number | null,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Scheduled Posts",
      value: metrics?.scheduled_posts ?? 0,
      icon: CalendarClock,
      trend: null,
      color: "text-amber-600",
      bgColor: "bg-amber-600/10",
    },
    {
      label: "Total Engagement",
      value: metrics?.total_engagement ?? 0,
      icon: BarChart3,
      trend: metrics?.engagement_trend ?? null,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Growth Rate",
      value: `${metrics?.growth_rate ?? 0}%`,
      icon: TrendingUp,
      trend: metrics?.growth_trend ?? null,
      color: "text-amber-600",
      bgColor: "bg-amber-600/10",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Welcome back, {user?.full_name || "there"}
        </h1>
        <p className="text-muted mt-1">{currentDate}</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="glass-card p-4 mb-6 flex items-center gap-3 border-red-300 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* No-connector banner, honest about app review and what still works */}
      {!loading && connectedAccountCount === 0 && (
        <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 border-amber-300/40">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Info className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              No social accounts connected yet, and that&apos;s fine.
            </p>
            <p className="text-xs text-muted mt-0.5">
              Our app is still under review with several platforms. You can already generate posts,
              images, videos, blogs and newsletters here. Download or share each one with a single click.
              Bluesky and Telegram connect instantly.
            </p>
          </div>
          <Link
            href="/dashboard/connections"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow shrink-0"
          >
            <Share2 className="h-3.5 w-3.5" />
            Manage connections
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statsCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`${card.bgColor} ${card.color} p-2.5 rounded-xl`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {card.trend !== null && card.trend !== 0 && (
                      <div
                        className={`flex items-center gap-0.5 text-xs font-medium ${
                          card.trend > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {card.trend > 0 ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        )}
                        {Math.abs(card.trend)}%
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <p className="text-sm text-muted mt-1">{card.label}</p>
                  {metrics &&
                    card.value === 0 &&
                    typeof card.value === "number" && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        Get started by creating your first post
                      </p>
                    )}
                </div>
              );
            })}
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/dashboard/posts?action=create"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Post
          </Link>
          <Link
            href="/dashboard/posts?action=generate"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-medium text-xs transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Post
          </Link>
          <Link
            href="/dashboard/repurpose"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-medium text-xs transition-colors"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Repurpose
          </Link>
          <Link
            href="/dashboard/media?generate=image"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium text-xs transition-colors"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            AI Image
          </Link>
          <Link
            href="/dashboard/media?generate=video"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-medium text-xs transition-colors"
          >
            <Film className="h-3.5 w-3.5" />
            AI Video
          </Link>
          <Link
            href="/dashboard/schedule"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium text-xs transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            Schedule
          </Link>
          <Link
            href="/dashboard/connections"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-card-border text-foreground/80 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium text-xs transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            Connections
          </Link>
        </div>
      </div>

      {/* Getting started + streak */}
      {(() => {
        const items = [
          {
            done: hasBrand === true,
            label: "Describe your brand",
            hint: "Tone, audience and pillars make every AI result better.",
            href: "/dashboard/brands",
          },
          {
            done: (metrics?.total_posts ?? 0) > 0 || recentPosts.length > 0,
            label: "Create your first post",
            hint: "Write it yourself or let the AI draft it.",
            href: "/dashboard/posts?action=generate",
          },
          {
            done: (activity?.published_total ?? 0) > 0,
            label: "Share something and mark it posted",
            hint: "Use the Share menu or a Post Pack, then press Posted it.",
            href: "/dashboard/posts",
          },
          {
            done: phoneConfigured === true,
            label: "Connect Send to phone",
            hint: "Your posts arrive in Telegram ready to paste.",
            href: "/dashboard/settings",
          },
        ];
        const open = items.filter((i) => !i.done);
        const ready = hasBrand !== null || phoneConfigured !== null || activity !== null;
        if (!ready || open.length === 0) return null;
        return (
          <div className="glass-card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-amber-500" />
                Getting started
              </h2>
              <span className="text-xs text-muted">
                {items.length - open.length} of {items.length} done
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`rounded-lg border p-4 transition-colors ${
                    item.done
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-card-border hover:border-amber-500/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${item.done ? "text-green-500" : "text-stone-300 dark:text-stone-600"}`}
                    />
                    <p className={`text-sm font-medium ${item.done ? "line-through text-muted" : ""}`}>
                      {item.label}
                    </p>
                  </div>
                  {!item.done && <p className="text-xs text-muted mt-1.5">{item.hint}</p>}
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Posting streak */}
      {activity && activity.published_total > 0 && (
        <div className="glass-card px-6 py-4 mb-8 flex flex-wrap items-center gap-x-8 gap-y-2">
          <div className="flex items-center gap-2">
            <Flame className={`h-5 w-5 ${activity.streak_days > 0 ? "text-amber-500" : "text-stone-300"}`} />
            <span className="text-sm">
              <span className="font-bold">{activity.streak_days}</span>
              <span className="text-muted"> day posting streak</span>
            </span>
          </div>
          <span className="text-sm">
            <span className="font-bold">{activity.published_this_week}</span>
            <span className="text-muted"> published this week</span>
          </span>
          <span className="text-sm">
            <span className="font-bold">{activity.published_total}</span>
            <span className="text-muted"> published in total</span>
          </span>
          <span className="text-[11px] text-muted ml-auto">
            counts posts published here or marked Posted it
          </span>
        </div>
      )}

      {/* Idea Spark */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Idea Spark
            <span className="text-xs font-normal text-muted">fresh post ideas for today</span>
          </h2>
          <button
            onClick={() => fetchIdeas(true)}
            disabled={ideasLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:border-amber-500/30 transition-colors disabled:opacity-50"
            title="Generate new ideas"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${ideasLoading ? "animate-spin" : ""}`} />
            New ideas
          </button>
        </div>
        {ideasLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-card-border p-4 animate-pulse">
                <div className="h-4 w-3/4 bg-stone-200 dark:bg-stone-700 rounded mb-2" />
                <div className="h-3 w-full bg-stone-200 dark:bg-stone-700 rounded mb-1" />
                <div className="h-3 w-2/3 bg-stone-200 dark:bg-stone-700 rounded" />
              </div>
            ))}
          </div>
        ) : ideasError ? (
          <p className="text-sm text-muted">
            The idea generator is warming up or unavailable right now.{" "}
            <button onClick={() => fetchIdeas()} className="text-amber-600 hover:text-amber-500 font-medium">
              Try again
            </button>
          </p>
        ) : ideas.length === 0 ? (
          <p className="text-sm text-muted">No ideas yet. Click New ideas to generate some.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ideas.map((idea, i) => (
              <div
                key={i}
                className="rounded-lg border border-card-border p-4 flex flex-col hover:border-amber-500/30 transition-colors"
              >
                <span className="inline-flex self-start rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 mb-2">
                  {idea.format.replace(/_/g, " ")}
                </span>
                <p className="text-sm font-semibold leading-snug">{idea.title}</p>
                <p className="text-xs text-muted mt-1 mb-3 leading-relaxed">{idea.description}</p>
                <Link
                  href={`/dashboard/posts?action=generate&topic=${encodeURIComponent(idea.topic)}`}
                  className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-500"
                >
                  <Sparkles className="h-3 w-3" />
                  Write this
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom grid: Recent Posts + Upcoming Scheduled */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Posts */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Posts</h2>
          {loading ? (
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-10 w-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
              <p className="text-muted text-sm mb-3">
                No posts yet. Create your first post!
              </p>
              <Link
                href="/dashboard/posts?action=create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Post
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-700">
                    <th className="text-left py-2.5 px-2 text-muted font-medium">
                      Post
                    </th>
                    <th className="text-left py-2.5 px-2 text-muted font-medium">
                      Status
                    </th>
                    <th className="text-left py-2.5 px-2 text-muted font-medium hidden sm:table-cell">
                      Platforms
                    </th>
                    <th className="text-left py-2.5 px-2 text-muted font-medium hidden md:table-cell">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentPosts.map((post) => (
                    <tr
                      key={post.id}
                      className="border-b border-stone-100 dark:border-stone-800 last:border-0"
                    >
                      <td className="py-3 px-2 text-foreground">
                        {truncate(post.content_text || "Untitled", 50)}
                      </td>
                      <td className="py-3 px-2">
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="py-3 px-2 text-muted hidden sm:table-cell">
                        {Object.keys(post.platform_contents || {}).join(", ") || "-"}
                      </td>
                      <td className="py-3 px-2 text-muted hidden md:table-cell">
                        {formatDate(post.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Scheduled */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Upcoming Scheduled
          </h2>
          {loading ? (
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : scheduledPosts.length === 0 ? (
            <div className="text-center py-10">
              <CalendarClock className="h-10 w-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
              <p className="text-muted text-sm">No upcoming posts</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {scheduledPosts.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 py-3 border-b border-stone-100 dark:border-stone-800 last:border-0"
                >
                  <p className="text-sm text-foreground font-medium">
                    {truncate(item.content_text || "Untitled", 40)}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(item.scheduled_at)}{" "}
                      {formatTime(item.scheduled_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 capitalize">
                      {Object.keys(item.platform_contents || {}).join(", ")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Loading overlay for initial load */}
      {loading && !user && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        </div>
      )}
    </div>
  );
}
