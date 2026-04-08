"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Calendar,
  AlertCircle,
  Globe,
  ThumbsUp,
  Eye,
  MessageSquare,
  Share2,
  Filter,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { api } from "@/lib/api";

interface OverviewData {
  total_posts_published?: number;
  total_posts?: number;
  total_engagement?: number;
  total_followers?: number;
  total_reach?: number;
  avg_engagement_rate?: number;
  best_platform?: string | null;
  platform_breakdown?: Record<string, { followers: number; reach: number; engagement: number }>;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
}

interface GrowthDataPoint {
  date: string;
  followers: number;
  engagement: number;
}

interface BestTime {
  day: string;
  hour: number;
  score: number;
  platform?: string;
}

interface PostAnalytic {
  id: string;
  post_id: string;
  platform: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  engagement_rate: number;
  published_at: string;
}

const DATE_RANGES = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

const PLATFORMS = [
  { label: "All Platforms", value: "" },
  { label: "Instagram", value: "instagram" },
  { label: "Twitter", value: "twitter" },
  { label: "Facebook", value: "facebook" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "TikTok", value: "tiktok" },
  { label: "YouTube", value: "youtube" },
];

function formatNumber(num: number | null | undefined): string {
  if (num == null) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState(30);
  const [platform, setPlatform] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [growth, setGrowth] = useState<GrowthDataPoint[]>([]);
  const [bestTimes, setBestTimes] = useState<BestTime[]>([]);
  const [topPosts, setTopPosts] = useState<PostAnalytic[]>([]);

  const computeDates = useCallback(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - dateRange);
    return {
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    };
  }, [dateRange]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    const { start_date, end_date } = computeDates();

    try {
      const params: Record<string, string> = { start_date, end_date };
      if (platform) params.platform = platform;

      const [overviewRes, growthRes, bestTimesRes, postsRes] =
        await Promise.allSettled([
          api.get("/analytics/overview", { params }),
          api.get("/analytics/growth", {
            params: { days: dateRange, ...(platform ? { platform } : {}) },
          }),
          api.get("/analytics/best-times", {
            params: platform ? { platform } : {},
          }),
          api.get("/analytics/posts", {
            params: {
              page: 1,
              per_page: 10,
              ...(platform ? { platform } : {}),
            },
          }),
        ]);

      if (overviewRes.status === "fulfilled") {
        setOverview(overviewRes.value.data.data || overviewRes.value.data);
      }
      if (growthRes.status === "fulfilled") {
        setGrowth(growthRes.value.data.data || growthRes.value.data || []);
      }
      if (bestTimesRes.status === "fulfilled") {
        setBestTimes(
          bestTimesRes.value.data.data || bestTimesRes.value.data || []
        );
      }
      if (postsRes.status === "fulfilled") {
        const postsData = postsRes.value.data.data;
        setTopPosts(Array.isArray(postsData) ? postsData : postsData?.items || []);
      }

      const allFailed = [overviewRes, growthRes, bestTimesRes, postsRes].every(
        (r) => r.status === "rejected"
      );
      if (allFailed) setError("Failed to load analytics data.");
    } catch {
      setError("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  }, [computeDates, dateRange, platform]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const hasData =
    overview || growth.length > 0 || bestTimes.length > 0 || topPosts.length > 0;

  // Growth chart (CSS-based bar chart)
  function GrowthChart() {
    if (growth.length === 0) {
      return (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted">No growth data available.</p>
        </div>
      );
    }

    const maxEngagement = Math.max(...growth.map((d) => d.engagement), 1);

    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Engagement Growth</h3>
          </div>
          <span className="text-[10px] text-muted uppercase tracking-wider">
            Last {dateRange} days
          </span>
        </div>
        <div className="flex items-end gap-[2px] h-40">
          {growth.map((point, i) => {
            const height = (point.engagement / maxEngagement) * 100;
            return (
              <div
                key={i}
                className="flex-1 group relative flex flex-col items-center justify-end"
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background rounded px-2 py-1 text-[10px] font-medium whitespace-nowrap z-10 pointer-events-none">
                  {point.engagement.toLocaleString()}
                  <br />
                  {new Date(point.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-amber-500 to-amber-400 opacity-80 hover:opacity-100 transition-opacity min-h-[2px]"
                  style={{ height: `${Math.max(height, 1)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted">
          {growth.length > 0 && (
            <>
              <span>
                {new Date(growth[0].date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span>
                {new Date(growth[growth.length - 1].date).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric" }
                )}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  // Best times grid
  function BestTimesGrid() {
    if (bestTimes.length === 0) {
      return (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted">No best times data available.</p>
        </div>
      );
    }

    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22];
    const maxScore = Math.max(...bestTimes.map((t) => t.score), 1);

    // Build a lookup map
    const lookup: Record<string, number> = {};
    bestTimes.forEach((t) => {
      lookup[`${t.day}-${t.hour}`] = t.score;
    });

    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Best Posting Times</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="text-left py-1 pr-3 font-medium text-muted">
                  Day
                </th>
                {hours.map((h) => (
                  <th key={h} className="text-center py-1 px-1 font-medium text-muted">
                    {h}:00
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day}>
                  <td className="py-1 pr-3 font-medium text-muted whitespace-nowrap">
                    {day.slice(0, 3)}
                  </td>
                  {hours.map((h) => {
                    const score = lookup[`${day}-${h}`] || lookup[`${day.toLowerCase()}-${h}`] || 0;
                    const intensity = score / maxScore;
                    return (
                      <td key={h} className="py-1 px-1">
                        <div
                          className="h-6 w-full rounded"
                          style={{
                            backgroundColor:
                              intensity > 0
                                ? `rgba(245, 158, 11, ${0.1 + intensity * 0.7})`
                                : "rgba(245, 158, 11, 0.03)",
                          }}
                          title={`${day} ${h}:00 - Score: ${score}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted">
          <span>Low</span>
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((o) => (
              <div
                key={o}
                className="h-3 w-6 rounded"
                style={{ backgroundColor: `rgba(245, 158, 11, ${o})` }}
              />
            ))}
          </div>
          <span>High</span>
        </div>
      </div>
    );
  }

  // Loading skeleton
  function Skeleton() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card animate-pulse p-5 rounded-xl">
              <div className="h-3 w-20 bg-amber-500/5 rounded mb-3" />
              <div className="h-7 w-16 bg-amber-500/5 rounded" />
            </div>
          ))}
        </div>
        <div className="glass-card animate-pulse p-5 rounded-xl h-52">
          <div className="h-3 w-32 bg-amber-500/5 rounded mb-4" />
          <div className="h-full bg-amber-500/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted mt-1">
            Track your performance across platforms
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-muted" />
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setDateRange(r.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
                dateRange === r.value
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                  : "border-card-border text-muted hover:border-amber-500/20 hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted" />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-lg border border-card-border bg-card-bg px-3 py-1.5 text-sm outline-none focus:border-amber-500 transition-colors"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton />
      ) : !hasData ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No analytics data yet</h3>
          <p className="text-sm text-muted max-w-sm mx-auto">
            No analytics data yet. Start posting to see your performance!
          </p>
        </motion.div>
      ) : (
        <>
          {/* Overview stats */}
          {overview && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="glass-card p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted">Total Posts</span>
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold">
                  {formatNumber(overview.total_posts_published ?? overview.total_posts)}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass-card p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted">Total Engagement</span>
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <ThumbsUp className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold">
                  {formatNumber(overview.total_engagement ?? 0)}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted">
                    Avg. Engagement Rate
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold">
                  {((overview.avg_engagement_rate ?? 0) * 100).toFixed(2)}%
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass-card p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted">Best Platform</span>
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold capitalize">
                  {overview.best_platform || "N/A"}
                </p>
              </motion.div>
            </div>
          )}

          {/* Engagement breakdown */}
          {overview && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Followers",
                  value: overview.total_followers ?? 0,
                  icon: ThumbsUp,
                },
                {
                  label: "Reach",
                  value: overview.total_reach ?? 0,
                  icon: MessageSquare,
                },
                {
                  label: "Engagement",
                  value: overview.total_engagement ?? 0,
                  icon: Share2,
                },
                {
                  label: "Posts",
                  value: overview.total_posts_published ?? overview.total_posts ?? 0,
                  icon: Eye,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="glass-card p-4 flex items-center gap-3"
                >
                  <stat.icon className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="text-sm font-bold">
                      {formatNumber(stat.value || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Growth chart + Best times */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GrowthChart />
            <BestTimesGrid />
          </div>

          {/* Top posts */}
          {topPosts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold">Top Performing Posts</h3>
              </div>
              <div className="space-y-3">
                {topPosts.map((post, idx) => (
                  <motion.div
                    key={post.id || idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="glass-card p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 rounded px-1.5 py-0.5 uppercase">
                            {post.platform}
                          </span>
                          <span className="text-[10px] text-muted">
                            {new Date(post.published_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2">
                          {post.content || "Untitled post"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(post.engagement_rate ?? 0) > 0 ? (
                          <ArrowUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-red-400" />
                        )}
                        <span className="text-xs font-semibold">
                          {((post.engagement_rate ?? 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-muted">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {formatNumber(post.likes || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {formatNumber(post.comments || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" />
                        {formatNumber(post.shares || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatNumber(post.views || 0)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
