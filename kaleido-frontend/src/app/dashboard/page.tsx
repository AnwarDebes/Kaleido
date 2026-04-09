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
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] || styles.draft
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const [overviewResult, postsResult, scheduleResult] =
        await Promise.allSettled([
          api.get(`/analytics/overview?start_date=${startDate}&end_date=${endDate}`),
          api.get("/posts?page=1&per_page=5"),
          api.get(`/schedule/calendar?start_date=${endDate}&end_date=${futureDate}`),
        ]);

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
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/posts?action=create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Post
          </Link>
          <Link
            href="/dashboard/posts?action=generate"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-medium text-sm transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate Post with AI
          </Link>
          <Link
            href="/dashboard/media?generate=image"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium text-sm transition-colors"
          >
            <ImageIcon className="h-4 w-4" />
            AI Image Generation
          </Link>
          <Link
            href="/dashboard/media?generate=video"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-medium text-sm transition-colors"
          >
            <Film className="h-4 w-4" />
            AI Video Generation
          </Link>
          <Link
            href="/dashboard/schedule"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium text-sm transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Schedule Post
          </Link>
        </div>
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
