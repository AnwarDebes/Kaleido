"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Upload,
  Sparkles,
  FolderOpen,
  Trash2,
  X,
  Film,
  FileImage,
  Plus,
  Loader2,
  AlertCircle,
  Search,
  ChevronRight,
  Filter,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface MediaItem {
  id: string;
  filename: string;
  file_url: string | null;
  file_type: string;
  mime_type?: string;
  file_size?: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
  ai_generated?: boolean;
  ai_prompt?: string;
  folder: string;
  tags: string[] | null;
  created_at: string;
}

interface Folder {
  path: string;
  name: string;
  file_count: number;
}

interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

type GenType = "image" | "video";

const VIDEO_DURATIONS = [
  { label: "5s", value: 5 },
  { label: "10s", value: 10 },
  { label: "15s", value: 15 },
  { label: "20s", value: 20 },
  { label: "25s", value: 25 },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "5m", value: 300 },
];

/* --- Progress Button Component --- */
function ProgressButton({
  onClick,
  disabled,
  loading,
  elapsed,
  estimatedSeconds,
  children,
  className,
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  elapsed: number;
  estimatedSeconds: number;
  children: React.ReactNode;
  className: string;
}) {
  const progress = loading
    ? Math.min((elapsed / estimatedSeconds) * 100, 95)
    : 0;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${className} relative overflow-hidden`}
    >
      {loading && (
        <motion.div
          className="absolute inset-0 bg-white/20"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "linear" }}
          style={{ originX: 0 }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}

export default function MediaPage() {
  const searchParams = useSearchParams();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("");
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadElapsed, setUploadElapsed] = useState(0);
  const uploadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Generate modal
  const [showGenerate, setShowGenerate] = useState(false);
  const [genType, setGenType] = useState<GenType>("image");
  const [generating, setGenerating] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [genStyle, setGenStyle] = useState("");
  const [genAspectRatio, setGenAspectRatio] = useState("1:1");
  const [genDuration, setGenDuration] = useState(5);
  const [genElapsed, setGenElapsed] = useState(0);
  const genTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Preview modal
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // New folder
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Mobile filter toggle
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (selectedFolder) params.folder = selectedFolder;
      if (fileTypeFilter) params.file_type = fileTypeFilter;
      const res = await api.get("/media", { params });
      setMedia(res.data.data || []);
      setPagination(res.data.meta || null);
    } catch {
      setError("Failed to load media. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedFolder, fileTypeFilter]);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await api.get("/media/folders");
      setFolders(res.data.data || []);
    } catch {
      // Folders are non-critical
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Auto-open generate modal from URL params
  useEffect(() => {
    const gen = searchParams.get("generate");
    if (gen === "image" || gen === "video") {
      setGenType(gen);
      setShowGenerate(true);
    }
  }, [searchParams]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadElapsed(0);
    uploadTimerRef.current = setInterval(() => setUploadElapsed((t) => t + 1), 1000);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedFolder) formData.append("folder", selectedFolder);
      await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      fetchMedia();
      fetchFolders();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);
      uploadTimerRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleGenerate() {
    if (!genPrompt.trim()) return;
    setGenerating(true);
    setError("");
    setGenElapsed(0);
    genTimerRef.current = setInterval(() => setGenElapsed((t) => t + 1), 1000);
    try {
      if (genType === "image") {
        const body: Record<string, string> = { prompt: genPrompt };
        if (genStyle) body.style = genStyle;
        if (genAspectRatio) body.aspect_ratio = genAspectRatio;
        await api.post("/media/generate-image", body);
      } else {
        await api.post("/media/generate-video", {
          prompt: genPrompt,
          duration: genDuration,
        });
      }
      setShowGenerate(false);
      setGenPrompt("");
      setGenStyle("");
      setGenAspectRatio("1:1");
      setGenDuration(5);
      fetchMedia();
    } catch {
      setError(
        genType === "image"
          ? "Image generation failed. Please try again."
          : "Video generation failed. Please try again."
      );
    } finally {
      setGenerating(false);
      if (genTimerRef.current) clearInterval(genTimerRef.current);
      genTimerRef.current = null;
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/media/${id}`);
      setMedia((prev) => prev.filter((m) => m.id !== id));
      if (previewItem?.id === id) setPreviewItem(null);
    } catch {
      setError("Failed to delete media item.");
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      await api.post("/media/folders", { name: newFolderName.trim() });
      setNewFolderName("");
      setShowNewFolder(false);
      fetchFolders();
    } catch {
      setError("Failed to create folder.");
    }
  }

  function mediaUrl(item: MediaItem): string {
    if (item.file_url) return `${API_URL}${item.file_url}`;
    return `${API_URL}/media/files/${item.filename}`;
  }

  function isVideo(item: MediaItem): boolean {
    return (
      item.file_type === "video" ||
      /\.(mp4|webm|mov|avi)$/i.test(item.filename)
    );
  }

  function formatSize(bytes?: number): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
  }

  // Estimated generation time (seconds) — based on real benchmarks
  // ~95s for 33 frames, scales roughly linearly with frame count, capped at 81 frames
  function estimateGenTime(): number {
    if (genType === "image") return 4;
    const fps = 16;
    const maxFrames = 81;
    const idealFrames = genDuration * fps + 1;
    const frames = Math.min(idealFrames, maxFrames);
    return Math.round((frames / 33) * 100);
  }
  const estimatedGenTime = estimateGenTime();

  function Skeleton() {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="glass-card animate-pulse aspect-square rounded-xl"
          >
            <div className="h-full w-full rounded-xl bg-amber-500/5" />
          </div>
        ))}
      </div>
    );
  }

  /* --- Sidebar content (reused for desktop sidebar and mobile drawer) --- */
  function FilterContent() {
    return (
      <>
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase text-muted mb-3 tracking-wider">
            Folders
          </h3>
          <button
            onClick={() => {
              setSelectedFolder(null);
              setPage(1);
              setShowMobileFilters(false);
            }}
            className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              !selectedFolder
                ? "bg-amber-500/10 text-amber-600 font-medium"
                : "text-muted hover:bg-amber-500/5 hover:text-foreground"
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            All Media
          </button>
          {folders.map((folder) => (
            <button
              key={folder.name}
              onClick={() => {
                setSelectedFolder(folder.name);
                setPage(1);
                setShowMobileFilters(false);
              }}
              className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                selectedFolder === folder.name
                  ? "bg-amber-500/10 text-amber-600 font-medium"
                  : "text-muted hover:bg-amber-500/5 hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                {folder.name}
              </span>
              <span className="text-[10px] text-muted">{folder.file_count}</span>
            </button>
          ))}
          {showNewFolder ? (
            <div className="flex gap-1 mt-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                placeholder="Folder name"
                className="flex-1 rounded-lg border border-card-border bg-background px-2 py-1.5 text-xs outline-none focus:border-amber-500"
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600 hover:bg-amber-500/20"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFolder(true)}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-amber-500/5 hover:text-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Folder
            </button>
          )}
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase text-muted mb-3 tracking-wider">
            Type
          </h3>
          <div className="space-y-1">
            {[
              { label: "All", value: "", icon: <Search className="h-4 w-4" /> },
              {
                label: "Images",
                value: "image",
                icon: <FileImage className="h-4 w-4" />,
              },
              {
                label: "Videos",
                value: "video",
                icon: <Film className="h-4 w-4" />,
              },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setFileTypeFilter(opt.value);
                  setPage(1);
                  setShowMobileFilters(false);
                }}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  fileTypeFilter === opt.value
                    ? "bg-amber-500/10 text-amber-600 font-medium"
                    : "text-muted hover:bg-amber-500/5 hover:text-foreground"
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Media Library</h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Manage your images, videos, and AI-generated content
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="md:hidden inline-flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-3 py-2.5 text-sm font-medium hover:border-amber-500/30 transition-colors"
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowGenerate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 sm:px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI Generate</span>
            <span className="sm:hidden">Generate</span>
          </button>
          <ProgressButton
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            loading={uploading}
            elapsed={uploadElapsed}
            estimatedSeconds={10}
            className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-3 sm:px-4 py-2.5 text-sm font-medium hover:border-amber-500/30 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? `${uploadElapsed}s` : "Upload"}
          </ProgressButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button
            onClick={() => setError("")}
            className="ml-auto hover:text-red-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-56 shrink-0">
          <div className="glass-card p-4 sticky top-4">
            <FilterContent />
          </div>
        </div>

        {/* Media grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <Skeleton />
          ) : media.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-8 sm:p-12 text-center"
            >
              <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No media yet</h3>
              <p className="text-sm text-muted max-w-sm mx-auto">
                Upload or generate your first image or video!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm font-medium hover:border-amber-500/30 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
                <button
                  onClick={() => setShowGenerate(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
                >
                  <Sparkles className="h-4 w-4" />
                  AI Generate
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {media.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card group relative overflow-hidden rounded-xl cursor-pointer hover:border-amber-500/30 transition-colors"
                    onClick={() => setPreviewItem(item)}
                  >
                    <div className="aspect-square relative bg-black/5">
                      {isVideo(item) ? (
                        <video
                          src={mediaUrl(item)}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                          onMouseEnter={(e) => {
                            const v = e.currentTarget;
                            v.currentTime = 0;
                            v.play().catch(() => {});
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                      ) : (
                        <img
                          src={mediaUrl(item)}
                          alt={item.filename}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {/* Type badge */}
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white uppercase">
                          {isVideo(item) ? (
                            <Film className="h-3 w-3" />
                          ) : (
                            <FileImage className="h-3 w-3" />
                          )}
                          {isVideo(item) ? "Video" : "Image"}
                        </span>
                      </div>
                      {item.ai_generated && (
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/80 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-medium text-white">
                            <Sparkles className="h-2.5 w-2.5" />
                            AI
                          </span>
                        </div>
                      )}
                      {/* Duration badge for videos */}
                      {isVideo(item) && item.duration_seconds && (
                        <div className="absolute bottom-2 left-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-medium text-white">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDuration(item.duration_seconds)}
                          </span>
                        </div>
                      )}
                      {/* Play icon overlay for videos */}
                      {isVideo(item) && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                            <Film className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      )}
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 rounded-md bg-red-500/80 backdrop-blur-sm p-1.5 text-white hover:bg-red-600 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="p-2 sm:p-3">
                      <p className="text-xs font-medium truncate">
                        {item.ai_prompt
                          ? item.ai_prompt.slice(0, 30) +
                            (item.ai_prompt.length > 30 ? "..." : "")
                          : item.filename}
                      </p>
                      <p className="text-[10px] text-muted mt-0.5 flex items-center gap-1">
                        <span>
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                        {item.file_size && (
                          <>
                            <span>·</span>
                            <span>{formatSize(item.file_size)}</span>
                          </>
                        )}
                      </p>
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
                    {page} / {pagination.total_pages}
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
        </div>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {showMobileFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden"
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowMobileFilters(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-background p-4 shadow-xl overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Filters</h3>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-1 rounded-lg hover:bg-stone-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <FilterContent />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Generate Modal */}
      <AnimatePresence>
        {showGenerate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => !generating && setShowGenerate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full sm:max-w-lg p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">AI Generation</h2>
                    <p className="text-xs text-muted">
                      Create images or videos with AI
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !generating && setShowGenerate(false)}
                  className="rounded-lg p-2 text-muted hover:text-foreground hover:bg-amber-500/5 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Type toggle */}
                <div className="flex gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
                  <button
                    onClick={() => setGenType("image")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      genType === "image"
                        ? "bg-white dark:bg-stone-700 shadow-sm text-foreground"
                        : "text-muted"
                    }`}
                  >
                    <FileImage className="h-4 w-4" />
                    Image
                  </button>
                  <button
                    onClick={() => setGenType("video")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      genType === "video"
                        ? "bg-white dark:bg-stone-700 shadow-sm text-foreground"
                        : "text-muted"
                    }`}
                  >
                    <Film className="h-4 w-4" />
                    Video
                  </button>
                </div>

                {/* Prompt */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Prompt
                  </label>
                  <textarea
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    rows={3}
                    placeholder={
                      genType === "image"
                        ? "A futuristic city skyline at sunset with neon lights..."
                        : "Ocean waves gently crashing on a tropical beach..."
                    }
                    className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors resize-none"
                  />
                </div>

                {/* Image-specific options */}
                {genType === "image" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Style
                      </label>
                      <select
                        value={genStyle}
                        onChange={(e) => setGenStyle(e.target.value)}
                        className="w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                      >
                        <option value="">Auto</option>
                        <option value="photorealistic">Photorealistic</option>
                        <option value="illustration">Illustration</option>
                        <option value="minimal">Minimalist</option>
                        <option value="flat">Flat Design</option>
                        <option value="watercolor">Watercolor</option>
                        <option value="cinematic">Cinematic</option>
                        <option value="3d">3D Render</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Aspect Ratio
                      </label>
                      <select
                        value={genAspectRatio}
                        onChange={(e) => setGenAspectRatio(e.target.value)}
                        className="w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                      >
                        <option value="1:1">1:1 Square</option>
                        <option value="16:9">16:9 Landscape</option>
                        <option value="9:16">9:16 Portrait</option>
                        <option value="4:5">4:5 Instagram</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Video-specific options */}
                {genType === "video" && !generating && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Duration
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {VIDEO_DURATIONS.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setGenDuration(d.value)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                            genDuration === d.value
                              ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "border-card-border text-muted hover:border-stone-300"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted mt-2">
                      {genDuration > 5
                        ? `Longer durations use fewer fps to fit ${genDuration}s. `
                        : ""}
                      Estimated: ~{Math.ceil(estimatedGenTime / 60)} min {estimatedGenTime % 60 > 0 ? `${estimatedGenTime % 60}s` : ""}
                    </p>
                  </div>
                )}

                {generating && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                        {genType === "image" ? "Generating image..." : "Generating video..."}
                      </p>
                      <p className="text-sm font-bold text-amber-600 tabular-nums">
                        {Math.floor(genElapsed / 60)}:{(genElapsed % 60).toString().padStart(2, "0")}
                      </p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-amber-200/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{
                          width: `${Math.min((genElapsed / estimatedGenTime) * 100, 95)}%`,
                        }}
                        transition={{ duration: 0.5, ease: "linear" }}
                      />
                    </div>
                    <p className="text-xs text-muted mt-2 text-center">
                      {Math.min(Math.round((genElapsed / estimatedGenTime) * 100), 95)}% — est. {Math.ceil(estimatedGenTime / 60)} min
                    </p>
                  </div>
                )}

                <ProgressButton
                  onClick={handleGenerate}
                  disabled={generating || !genPrompt.trim()}
                  loading={generating}
                  elapsed={genElapsed}
                  estimatedSeconds={estimatedGenTime}
                  className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {Math.min(Math.round((genElapsed / estimatedGenTime) * 100), 95)}%
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate {genType === "image" ? "Image" : `${genDuration >= 60 ? `${genDuration / 60}m` : `${genDuration}s`} Video`}
                    </>
                  )}
                </ProgressButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-[90vh]"
            >
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute -top-10 right-0 rounded-lg p-2 text-white/70 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              <div className="glass-card overflow-hidden rounded-xl">
                {isVideo(previewItem) ? (
                  <video
                    src={mediaUrl(previewItem)}
                    controls
                    autoPlay
                    className="w-full max-h-[70vh] object-contain bg-black"
                  />
                ) : (
                  <img
                    src={mediaUrl(previewItem)}
                    alt={previewItem.filename}
                    className="w-full max-h-[70vh] object-contain"
                  />
                )}
                <div className="p-3 sm:p-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {previewItem.ai_prompt || previewItem.filename}
                    </p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>
                        {new Date(previewItem.created_at).toLocaleDateString()}
                      </span>
                      {previewItem.file_size && (
                        <span>{formatSize(previewItem.file_size)}</span>
                      )}
                      {previewItem.width && previewItem.height && (
                        <span>
                          {previewItem.width}x{previewItem.height}
                        </span>
                      )}
                      {previewItem.duration_seconds && (
                        <span>{formatDuration(previewItem.duration_seconds)}</span>
                      )}
                      {previewItem.folder && (
                        <>
                          <ChevronRight className="h-3 w-3" />
                          <span>{previewItem.folder}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(previewItem.id)}
                    className="shrink-0 rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
