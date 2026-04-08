"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface MediaItem {
  id: string;
  filename: string;
  file_path: string;
  file_type: string;
  folder: string | null;
  tags: string[];
  created_at: string;
  url?: string;
}

interface Folder {
  name: string;
}

interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export default function MediaPage() {
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
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Generate modal
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [genStyle, setGenStyle] = useState("");
  const [genAspectRatio, setGenAspectRatio] = useState("1:1");

  // Preview modal
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // New folder
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (selectedFolder) params.folder = selectedFolder;
      if (fileTypeFilter) params.file_type = fileTypeFilter;
      const res = await api.get("/media", { params });
      setMedia(res.data.data?.items || res.data.data || []);
      if (res.data.data?.meta) setPagination(res.data.data.meta);
      else if (res.data.meta) setPagination(res.data.meta);
      else setPagination(null);
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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
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
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleGenerateImage() {
    if (!genPrompt.trim()) return;
    setGenerating(true);
    try {
      const body: Record<string, string> = { prompt: genPrompt };
      if (genStyle) body.style = genStyle;
      if (genAspectRatio) body.aspect_ratio = genAspectRatio;
      await api.post("/media/generate-image", body);
      setShowGenerate(false);
      setGenPrompt("");
      setGenStyle("");
      setGenAspectRatio("1:1");
      fetchMedia();
    } catch {
      setUploadError("Image generation failed. Please try again.");
    } finally {
      setGenerating(false);
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
    return `${API_URL}/v1/media/files/${item.file_path}`;
  }

  function isVideo(item: MediaItem): boolean {
    return item.file_type?.startsWith("video") || /\.(mp4|webm|mov|avi)$/i.test(item.filename);
  }

  // Loading skeleton
  function Skeleton() {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-sm text-muted mt-1">
            Manage your images, videos, and AI-generated content
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGenerate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
          >
            <Sparkles className="h-4 w-4" />
            AI Generate
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm font-medium hover:border-amber-500/30 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Error banners */}
      {(error || uploadError) && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error || uploadError}
        </div>
      )}

      <div className="flex gap-6">
        {/* Folder sidebar */}
        <div className="hidden md:block w-56 shrink-0 space-y-2">
          <div className="glass-card p-4 space-y-1">
            <h3 className="text-xs font-semibold uppercase text-muted mb-3 tracking-wider">
              Folders
            </h3>
            <button
              onClick={() => {
                setSelectedFolder(null);
                setPage(1);
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
                }}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  selectedFolder === folder.name
                    ? "bg-amber-500/10 text-amber-600 font-medium"
                    : "text-muted hover:bg-amber-500/5 hover:text-foreground"
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                {folder.name}
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

          {/* File type filter */}
          <div className="glass-card p-4">
            <h3 className="text-xs font-semibold uppercase text-muted mb-3 tracking-wider">
              Type
            </h3>
            <div className="space-y-1">
              {[
                { label: "All", value: "" },
                { label: "Images", value: "image" },
                { label: "Videos", value: "video" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setFileTypeFilter(opt.value);
                    setPage(1);
                  }}
                  className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    fileTypeFilter === opt.value
                      ? "bg-amber-500/10 text-amber-600 font-medium"
                      : "text-muted hover:bg-amber-500/5 hover:text-foreground"
                  }`}
                >
                  {opt.value === "image" ? (
                    <FileImage className="h-4 w-4" />
                  ) : opt.value === "video" ? (
                    <Film className="h-4 w-4" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {opt.label}
                </button>
              ))}
            </div>
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
              className="glass-card p-12 text-center"
            >
              <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No media yet</h3>
              <p className="text-sm text-muted max-w-sm mx-auto">
                No media yet. Upload or generate your first image!
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm font-medium hover:border-amber-500/30 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
                <button
                  onClick={() => setShowGenerate(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
                >
                  <Sparkles className="h-4 w-4" />
                  AI Generate
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {media.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card group relative overflow-hidden rounded-xl cursor-pointer hover:border-amber-500/30 transition-colors"
                    onClick={() => setPreviewItem(item)}
                  >
                    <div className="aspect-square relative bg-amber-500/5">
                      {isVideo(item) ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Film className="h-10 w-10 text-amber-500/50" />
                        </div>
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
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded-md bg-red-500/80 backdrop-blur-sm p-1.5 text-white hover:bg-red-600 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium truncate">
                        {item.filename}
                      </p>
                      <p className="text-[10px] text-muted mt-0.5">
                        {new Date(item.created_at).toLocaleDateString()}
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
        </div>
      </div>

      {/* AI Generate Modal */}
      <AnimatePresence>
        {showGenerate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !generating && setShowGenerate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-lg p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">AI Image Generation</h2>
                    <p className="text-xs text-muted">
                      Describe the image you want to create
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
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Prompt
                  </label>
                  <textarea
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    rows={3}
                    placeholder="A futuristic city skyline at sunset with neon lights..."
                    className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Style
                    </label>
                    <select
                      value={genStyle}
                      onChange={(e) => setGenStyle(e.target.value)}
                      className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                    >
                      <option value="">Auto</option>
                      <option value="photorealistic">Photorealistic</option>
                      <option value="digital-art">Digital Art</option>
                      <option value="anime">Anime</option>
                      <option value="oil-painting">Oil Painting</option>
                      <option value="watercolor">Watercolor</option>
                      <option value="3d-render">3D Render</option>
                      <option value="minimalist">Minimalist</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Aspect Ratio
                    </label>
                    <select
                      value={genAspectRatio}
                      onChange={(e) => setGenAspectRatio(e.target.value)}
                      className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                    >
                      <option value="1:1">1:1 (Square)</option>
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="9:16">9:16 (Portrait)</option>
                      <option value="4:3">4:3 (Standard)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerateImage}
                  disabled={generating || !genPrompt.trim()}
                  className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Image
                    </>
                  )}
                </button>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] w-full"
            >
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute -top-10 right-0 rounded-lg p-2 text-white/70 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              <div className="glass-card overflow-hidden">
                {isVideo(previewItem) ? (
                  <video
                    src={mediaUrl(previewItem)}
                    controls
                    className="w-full max-h-[70vh] object-contain"
                  />
                ) : (
                  <img
                    src={mediaUrl(previewItem)}
                    alt={previewItem.filename}
                    className="w-full max-h-[70vh] object-contain"
                  />
                )}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {previewItem.filename}
                    </p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-2">
                      <span>
                        {new Date(previewItem.created_at).toLocaleDateString()}
                      </span>
                      {previewItem.folder && (
                        <>
                          <ChevronRight className="h-3 w-3" />
                          <span>{previewItem.folder}</span>
                        </>
                      )}
                    </p>
                    {previewItem.tags && previewItem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {previewItem.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(previewItem.id)}
                    className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20 transition-colors"
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
