"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Sparkles,
  Edit3,
  Trash2,
  X,
  Loader2,
  FileText,
  Clock,
  Eye,
  Save,
  ArrowLeft,
  Download,
} from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { downloadText, safeFilename } from "@/lib/download";

interface BlogPost {
  id: string;
  title: string;
  content_markdown: string;
  excerpt?: string;
  slug?: string;
  tags?: string[];
  category?: string;
  seo_title?: string;
  seo_description?: string;
  status: "draft" | "published";
  brand_id?: string;
  word_count?: number;
  reading_time_minutes?: number;
  ai_generated?: boolean;
  created_at: string;
  updated_at: string;
}

interface Brand {
  id: string;
  name: string;
}

type View = "list" | "edit" | "generate";

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [brandId, setBrandId] = useState("");

  // Generate form state
  const [genTopic, setGenTopic] = useState("");
  const [genTone, setGenTone] = useState("");
  const [genWordCount, setGenWordCount] = useState(800);
  const [genLanguage, setGenLanguage] = useState("en");
  const [genKeywords, setGenKeywords] = useState("");
  const [genBrandId, setGenBrandId] = useState("");

  useEffect(() => {
    fetchPosts();
    fetchBrands();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await api.get("/blog/posts?page=1&per_page=50");
      setPosts(res.data.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function fetchBrands() {
    try {
      const res = await api.get("/brands");
      setBrands(res.data.data || []);
    } catch {
      /* ignore */
    }
  }

  function openNewPost() {
    setEditingPost(null);
    setTitle("");
    setContent("");
    setStatus("draft");
    setBrandId("");
    setView("edit");
    setError("");
    setSuccess("");
  }

  function openEditPost(post: BlogPost) {
    setEditingPost(post);
    setTitle(post.title);
    setContent(post.content_markdown || "");
    setStatus(post.status);
    setBrandId(post.brand_id || "");
    setView("edit");
    setError("");
    setSuccess("");
  }

  async function savePost(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload: Record<string, unknown> = { title, content_markdown: content, status };
      if (brandId) payload.brand_id = brandId;

      if (editingPost) {
        await api.patch(`/blog/posts/${editingPost.id}`, payload);
        setSuccess("Post updated successfully.");
      } else {
        await api.post("/blog/posts", payload);
        setSuccess("Post created successfully.");
      }
      fetchPosts();
      setTimeout(() => {
        setView("list");
        setSuccess("");
      }, 1200);
    } catch {
      setError("Failed to save post. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePost(id: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await api.delete(`/blog/posts/${id}`);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* ignore */
    }
  }

  async function generatePost(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {
        topic: genTopic,
        target_word_count: genWordCount,
        language: genLanguage,
      };
      if (genTone) payload.tone = genTone;
      if (genBrandId) payload.brand_id = genBrandId;
      if (genKeywords.trim()) {
        payload.keywords = genKeywords.split(",").map((k) => k.trim()).filter(Boolean);
      }

      const res = await api.post("/blog/posts/generate", payload);
      const generated = res.data.data;
      setTitle(generated.title || genTopic);
      setContent(generated.content_markdown || generated.content || "");
      setStatus("draft");
      setBrandId(genBrandId);
      setView("edit");
      setSuccess("Content generated. Review and save when ready.");
    } catch {
      setError("Failed to generate content. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function getExcerpt(text: string, len = 120) {
    if (text.length <= len) return text;
    return text.slice(0, len).trimEnd() + "...";
  }

  function downloadAsMarkdown(post: BlogPost) {
    const front = [
      "---",
      `title: ${JSON.stringify(post.title)}`,
      post.slug ? `slug: ${post.slug}` : null,
      post.status ? `status: ${post.status}` : null,
      post.tags && post.tags.length ? `tags: [${post.tags.map((t) => JSON.stringify(t)).join(", ")}]` : null,
      `created_at: ${post.created_at}`,
      "---",
      "",
    ].filter(Boolean).join("\n");
    const filename = safeFilename(post.title || "blog-post");
    downloadText(`${filename}.md`, `${front}\n${post.content_markdown}\n`, "text/markdown");
  }

  function getWordCount(text: string) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  const inputClasses =
    "w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {view !== "list" && (
            <button
              onClick={() => { setView("list"); setError(""); setSuccess(""); }}
              className="rounded-lg p-2 hover:bg-amber-500/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <BookOpen className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold">
            {view === "list" ? "Blog Posts" : view === "edit" ? (editingPost ? "Edit Post" : "New Post") : "Generate with AI"}
          </h1>
        </div>
        {view === "list" && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => { setView("generate"); setError(""); }}
              className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-500/10 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </button>
            <button
              onClick={openNewPost}
              className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
            >
              <Plus className="h-4 w-4" />
              New Post
            </button>
          </div>
        )}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-600"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIST VIEW */}
      {view === "list" && (
        <>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
              <FileText className="h-12 w-12 text-amber-500/40 mb-4" />
              <h2 className="text-lg font-semibold mb-1">No blog posts yet</h2>
              <p className="text-sm text-muted mb-6 max-w-sm">
                Create your first blog post manually or let AI generate one for you.
              </p>
              <button
                onClick={openNewPost}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
              >
                Create Post
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 flex flex-col gap-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm line-clamp-2 flex-1">{post.title}</h3>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        post.status === "published"
                          ? "bg-green-500/10 text-green-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {post.status === "published" ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed flex-1">
                    {getExcerpt(post.content_markdown)}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(post.created_at), "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {post.word_count ?? getWordCount(post.content_markdown)} words
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-card-border">
                    <button
                      onClick={() => openEditPost(post)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-amber-500/10 transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => downloadAsMarkdown(post)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-amber-500/10 transition-colors"
                      title="Download as .md"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                    <button
                      onClick={() => deletePost(post.id)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* EDIT VIEW */}
      {view === "edit" && (
        <form onSubmit={savePost} className="glass-card p-6 space-y-5 max-w-3xl">
          <div>
            <label className="block text-sm font-medium mb-1.5">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClasses}
              placeholder="Enter post title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Content</label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              className={inputClasses + " resize-y"}
              placeholder="Write your blog post content..."
            />
            <p className="text-xs text-muted mt-1">{getWordCount(content)} words</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("draft")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    status === "draft"
                      ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                      : "border border-card-border hover:bg-amber-500/5"
                  }`}
                >
                  <Edit3 className="h-4 w-4" />
                  Draft
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("published")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    status === "published"
                      ? "bg-green-500/15 text-green-600 border border-green-500/30"
                      : "border border-card-border hover:bg-green-500/5"
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  Published
                </button>
              </div>
            </div>

            {brands.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Brand (optional)</label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className={inputClasses}
                >
                  <option value="">No brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Post"}
            </button>
            <button
              type="button"
              onClick={() => { setView("list"); setError(""); setSuccess(""); }}
              className="rounded-lg border border-card-border px-6 py-2.5 text-sm font-medium hover:bg-amber-500/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* GENERATE VIEW */}
      {view === "generate" && (
        <form onSubmit={generatePost} className="glass-card p-6 space-y-5 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold">AI Blog Generator</h2>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Topic</label>
            <input
              type="text"
              required
              value={genTopic}
              onChange={(e) => setGenTopic(e.target.value)}
              className={inputClasses}
              placeholder="e.g. 10 Tips for Social Media Marketing"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1.5">Tone (optional)</label>
              <select
                value={genTone}
                onChange={(e) => setGenTone(e.target.value)}
                className={inputClasses}
              >
                <option value="">Default</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="humorous">Humorous</option>
                <option value="formal">Formal</option>
                <option value="inspirational">Inspirational</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Target Word Count</label>
              <input
                type="number"
                value={genWordCount}
                onChange={(e) => setGenWordCount(Number(e.target.value))}
                className={inputClasses}
                min={200}
                max={5000}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1.5">Language</label>
              <select
                value={genLanguage}
                onChange={(e) => setGenLanguage(e.target.value)}
                className={inputClasses}
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
                <option value="de">German</option>
              </select>
            </div>

            {brands.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Brand (optional)</label>
                <select
                  value={genBrandId}
                  onChange={(e) => setGenBrandId(e.target.value)}
                  className={inputClasses}
                >
                  <option value="">No brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Keywords (comma-separated, optional)</label>
            <input
              type="text"
              value={genKeywords}
              onChange={(e) => setGenKeywords(e.target.value)}
              className={inputClasses}
              placeholder="marketing, social media, growth"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={generating}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? "Generating..." : "Generate Post"}
            </button>
            <button
              type="button"
              onClick={() => { setView("list"); setError(""); }}
              className="rounded-lg border border-card-border px-6 py-2.5 text-sm font-medium hover:bg-amber-500/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
