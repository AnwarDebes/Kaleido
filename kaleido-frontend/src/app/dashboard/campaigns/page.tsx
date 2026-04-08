"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Plus,
  X,
  ChevronRight,
  Calendar,
  Loader2,
  AlertCircle,
  Sparkles,
  Trash2,
  BarChart3,
  Clock,
  Edit3,
  Globe,
  ArrowLeft,
} from "lucide-react";
import { api } from "@/lib/api";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  brand_id: string | null;
  start_date: string | null;
  end_date: string | null;
  platforms: string[];
  created_at: string;
}

interface CampaignAnalytics {
  total_posts: number;
  total_engagement: number;
  avg_engagement_rate: number;
  platform_breakdown: Record<string, number>;
}

interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  paused: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const PLATFORM_OPTIONS = [
  "instagram",
  "twitter",
  "facebook",
  "linkedin",
  "tiktok",
  "youtube",
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    platforms: [] as string[],
  });

  // Detail view
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // AI plan modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    topic: "",
    platforms: [] as string[],
    duration_days: 30,
    posts_per_week: 3,
    tone: "",
  });
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/campaigns", { params });
      setCampaigns(res.data.data || []);
      setPagination(res.data.meta || null);
    } catch {
      setError("Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  async function handleCreate() {
    if (!newCampaign.name.trim()) return;
    setCreating(true);
    try {
      const body: Record<string, unknown> = { name: newCampaign.name };
      if (newCampaign.description) body.description = newCampaign.description;
      if (newCampaign.start_date) body.start_date = newCampaign.start_date;
      if (newCampaign.end_date) body.end_date = newCampaign.end_date;
      if (newCampaign.platforms.length > 0) body.platforms = newCampaign.platforms;
      await api.post("/campaigns", body);
      setShowCreate(false);
      setNewCampaign({ name: "", description: "", start_date: "", end_date: "", platforms: [] });
      fetchCampaigns();
    } catch {
      setError("Failed to create campaign.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/campaigns/${id}`);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      if (selectedCampaign?.id === id) setSelectedCampaign(null);
    } catch {
      setError("Failed to delete campaign.");
    }
  }

  async function openCampaignDetail(campaign: Campaign) {
    setSelectedCampaign(campaign);
    setLoadingDetail(true);
    setCampaignAnalytics(null);
    try {
      const res = await api.get(`/campaigns/${campaign.id}/analytics`);
      setCampaignAnalytics(res.data.data || res.data);
    } catch {
      // Analytics may not exist yet
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleGeneratePlan() {
    if (!planForm.topic.trim() || !selectedCampaign) return;
    setGeneratingPlan(true);
    setGeneratedPlan(null);
    try {
      const body: Record<string, unknown> = {
        topic: planForm.topic,
        platforms: planForm.platforms.length > 0 ? planForm.platforms : ["instagram"],
      };
      if (planForm.duration_days) body.duration_days = planForm.duration_days;
      if (planForm.posts_per_week) body.posts_per_week = planForm.posts_per_week;
      if (planForm.tone) body.tone = planForm.tone;
      const res = await api.post(
        `/campaigns/${selectedCampaign.id}/generate-plan`,
        body
      );
      setGeneratedPlan(
        typeof res.data.data === "string"
          ? res.data.data
          : JSON.stringify(res.data.data, null, 2)
      );
    } catch {
      setError("Failed to generate content plan.");
    } finally {
      setGeneratingPlan(false);
    }
  }

  function togglePlatform(
    list: string[],
    platform: string,
    setter: (val: string[]) => void
  ) {
    setter(
      list.includes(platform)
        ? list.filter((p) => p !== platform)
        : [...list, platform]
    );
  }

  // Loading skeleton
  function Skeleton() {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card animate-pulse p-6 rounded-xl">
            <div className="h-4 w-48 bg-amber-500/5 rounded mb-3" />
            <div className="h-3 w-72 bg-amber-500/5 rounded mb-2" />
            <div className="h-3 w-32 bg-amber-500/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Campaign detail view
  if (selectedCampaign) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedCampaign(null)}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </button>

        {/* Campaign header */}
        <div className="glass-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{selectedCampaign.name}</h1>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                    STATUS_STYLES[selectedCampaign.status] || STATUS_STYLES.draft
                  }`}
                >
                  {selectedCampaign.status}
                </span>
              </div>
              {selectedCampaign.description && (
                <p className="text-sm text-muted mb-3">
                  {selectedCampaign.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                {selectedCampaign.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(selectedCampaign.start_date).toLocaleDateString()}
                    {selectedCampaign.end_date &&
                      ` - ${new Date(selectedCampaign.end_date).toLocaleDateString()}`}
                  </span>
                )}
                {selectedCampaign.platforms &&
                  selectedCampaign.platforms.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      {selectedCampaign.platforms.join(", ")}
                    </span>
                  )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPlanForm({
                    topic: "",
                    platforms: selectedCampaign.platforms || [],
                    duration_days: 30,
                    posts_per_week: 3,
                    tone: "",
                  });
                  setGeneratedPlan(null);
                  setShowPlanModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
              >
                <Sparkles className="h-4 w-4" />
                Generate Content Plan
              </button>
              <button
                onClick={() => handleDelete(selectedCampaign.id)}
                className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Analytics summary */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Campaign Analytics</h2>
          {loadingDetail ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card animate-pulse p-6 rounded-xl">
                  <div className="h-3 w-20 bg-amber-500/5 rounded mb-3" />
                  <div className="h-6 w-16 bg-amber-500/5 rounded" />
                </div>
              ))}
            </div>
          ) : campaignAnalytics ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 text-xs text-muted mb-2">
                  <Edit3 className="h-3.5 w-3.5" />
                  Total Posts
                </div>
                <p className="text-2xl font-bold">
                  {campaignAnalytics.total_posts}
                </p>
              </div>
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 text-xs text-muted mb-2">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Total Engagement
                </div>
                <p className="text-2xl font-bold">
                  {campaignAnalytics.total_engagement.toLocaleString()}
                </p>
              </div>
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 text-xs text-muted mb-2">
                  <Target className="h-3.5 w-3.5" />
                  Avg. Engagement Rate
                </div>
                <p className="text-2xl font-bold">
                  {(campaignAnalytics.avg_engagement_rate * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-sm text-muted">
                No analytics data available for this campaign yet.
              </p>
            </div>
          )}
        </div>

        {/* AI Content Plan Modal */}
        <AnimatePresence>
          {showPlanModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
              onClick={() => !generatingPlan && setShowPlanModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">
                        Generate Content Plan
                      </h2>
                      <p className="text-xs text-muted">
                        AI-powered campaign planning
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !generatingPlan && setShowPlanModal(false)}
                    className="rounded-lg p-2 text-muted hover:text-foreground hover:bg-amber-500/5 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Topic / Theme
                    </label>
                    <input
                      type="text"
                      value={planForm.topic}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, topic: e.target.value })
                      }
                      placeholder="e.g., Summer product launch, Brand awareness"
                      className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Platforms
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORM_OPTIONS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() =>
                            togglePlatform(planForm.platforms, p, (val) =>
                              setPlanForm({ ...planForm, platforms: val })
                            )
                          }
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors capitalize ${
                            planForm.platforms.includes(p)
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                              : "border-card-border text-muted hover:border-amber-500/20"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Duration (days)
                      </label>
                      <input
                        type="number"
                        value={planForm.duration_days}
                        onChange={(e) =>
                          setPlanForm({
                            ...planForm,
                            duration_days: parseInt(e.target.value) || 30,
                          })
                        }
                        className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Posts per week
                      </label>
                      <input
                        type="number"
                        value={planForm.posts_per_week}
                        onChange={(e) =>
                          setPlanForm({
                            ...planForm,
                            posts_per_week: parseInt(e.target.value) || 3,
                          })
                        }
                        className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Tone
                    </label>
                    <select
                      value={planForm.tone}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, tone: e.target.value })
                      }
                      className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                    >
                      <option value="">Auto</option>
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="humorous">Humorous</option>
                      <option value="inspirational">Inspirational</option>
                      <option value="educational">Educational</option>
                    </select>
                  </div>

                  <button
                    onClick={handleGeneratePlan}
                    disabled={generatingPlan || !planForm.topic.trim()}
                    className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {generatingPlan ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating plan...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Plan
                      </>
                    )}
                  </button>

                  {generatedPlan && (
                    <div className="mt-4 rounded-lg border border-card-border bg-section-alt p-4">
                      <h4 className="text-sm font-semibold mb-2">
                        Generated Content Plan
                      </h4>
                      <pre className="text-xs text-muted whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                        {generatedPlan}
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Campaign list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted mt-1">
            Plan and manage your marketing campaigns
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { label: "All", value: "" },
          { label: "Draft", value: "draft" },
          { label: "Active", value: "active" },
          { label: "Paused", value: "paused" },
          { label: "Completed", value: "completed" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatusFilter(opt.value);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
              statusFilter === opt.value
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                : "border-card-border text-muted hover:border-amber-500/20 hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Campaign list */}
      {loading ? (
        <Skeleton />
      ) : campaigns.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <Target className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
          <p className="text-sm text-muted max-w-sm mx-auto">
            No campaigns yet. Create your first marketing campaign!
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </button>
        </motion.div>
      ) : (
        <>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 cursor-pointer hover:border-amber-500/30 transition-colors group"
                onClick={() => openCampaignDetail(campaign)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-sm truncate">
                        {campaign.name}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize shrink-0 ${
                          STATUS_STYLES[campaign.status] || STATUS_STYLES.draft
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                    {campaign.description && (
                      <p className="text-xs text-muted line-clamp-1 mb-2">
                        {campaign.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
                      {campaign.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(campaign.start_date).toLocaleDateString()}
                          {campaign.end_date &&
                            ` - ${new Date(campaign.end_date).toLocaleDateString()}`}
                        </span>
                      )}
                      {campaign.platforms && campaign.platforms.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {campaign.platforms.join(", ")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created{" "}
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(campaign.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 rounded-lg p-2 text-red-500 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-muted group-hover:text-amber-500 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-card-border bg-card-bg px-3 py-1.5 text-sm disabled:opacity-40 hover:border-amber-500/30 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-muted px-3">
                Page {page} of {pagination.total_pages}
              </span>
              <button
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-card-border bg-card-bg px-3 py-1.5 text-sm disabled:opacity-40 hover:border-amber-500/30 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
            onClick={() => !creating && setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-lg p-6 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">New Campaign</h2>
                    <p className="text-xs text-muted">
                      Set up a new marketing campaign
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !creating && setShowCreate(false)}
                  className="rounded-lg p-2 text-muted hover:text-foreground hover:bg-amber-500/5 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, name: e.target.value })
                    }
                    placeholder="e.g., Summer Sale 2026"
                    className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={newCampaign.description}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    placeholder="Brief description of the campaign goals..."
                    className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newCampaign.start_date}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          start_date: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={newCampaign.end_date}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          end_date: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Platforms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORM_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          togglePlatform(
                            newCampaign.platforms,
                            p,
                            (val) =>
                              setNewCampaign({
                                ...newCampaign,
                                platforms: val,
                              })
                          )
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors capitalize ${
                          newCampaign.platforms.includes(p)
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                            : "border-card-border text-muted hover:border-amber-500/20"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={creating || !newCampaign.name.trim()}
                  className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Campaign
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
