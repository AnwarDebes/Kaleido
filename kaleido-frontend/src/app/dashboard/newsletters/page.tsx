"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Plus,
  Sparkles,
  Edit3,
  Trash2,
  Send,
  Loader2,
  Users,
  FileText,
  Clock,
  ArrowLeft,
  Save,
  UserPlus,
  UserMinus,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";

interface Newsletter {
  id: string;
  subject: string;
  content_markdown: string | null;
  preview_text?: string;
  status: "draft" | "sent";
  brand_id?: string;
  recipients_count?: number;
  opens_count?: number;
  clicks_count?: number;
  ai_generated?: boolean;
  created_at: string;
  updated_at: string;
}

interface Subscriber {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

interface Brand {
  id: string;
  name: string;
}

type Tab = "newsletters" | "subscribers";
type View = "list" | "edit" | "generate";

export default function NewslettersPage() {
  const [tab, setTab] = useState<Tab>("newsletters");
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [editingNl, setEditingNl] = useState<Newsletter | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Newsletter form
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [brandId, setBrandId] = useState("");

  // Generate form
  const [genTopic, setGenTopic] = useState("");
  const [genTone, setGenTone] = useState("");
  const [genBrandId, setGenBrandId] = useState("");

  // Subscriber form
  const [showAddSub, setShowAddSub] = useState(false);
  const [subEmail, setSubEmail] = useState("");
  const [subName, setSubName] = useState("");
  const [addingSub, setAddingSub] = useState(false);

  useEffect(() => {
    fetchNewsletters();
    fetchSubscribers();
    fetchBrands();
  }, []);

  async function fetchNewsletters() {
    setLoading(true);
    try {
      const res = await api.get("/newsletters?page=1&per_page=50");
      setNewsletters(res.data.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function fetchSubscribers() {
    try {
      const res = await api.get("/newsletters/subscribers?page=1&per_page=100");
      setSubscribers(res.data.data || []);
    } catch {
      /* ignore */
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

  function openNewNewsletter() {
    setEditingNl(null);
    setSubject("");
    setContent("");
    setBrandId("");
    setView("edit");
    setError("");
    setSuccess("");
  }

  function openEditNewsletter(nl: Newsletter) {
    setEditingNl(nl);
    setSubject(nl.subject);
    setContent(nl.content_markdown || "");
    setBrandId(nl.brand_id || "");
    setView("edit");
    setError("");
    setSuccess("");
  }

  async function saveNewsletter(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload: Record<string, unknown> = { subject, content_markdown: content };
      if (brandId) payload.brand_id = brandId;

      if (editingNl) {
        await api.patch(`/newsletters/${editingNl.id}`, payload);
        setSuccess("Newsletter updated successfully.");
      } else {
        await api.post("/newsletters", payload);
        setSuccess("Newsletter created successfully.");
      }
      fetchNewsletters();
      setTimeout(() => {
        setView("list");
        setSuccess("");
      }, 1200);
    } catch {
      setError("Failed to save newsletter. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNewsletter(id: string) {
    if (!confirm("Are you sure you want to delete this newsletter?")) return;
    try {
      await api.delete(`/newsletters/${id}`);
      setNewsletters((prev) => prev.filter((n) => n.id !== id));
    } catch {
      /* ignore */
    }
  }

  async function sendNewsletter(id: string) {
    if (!confirm("Are you sure you want to send this newsletter? This action cannot be undone.")) return;
    setSendingId(id);
    try {
      await api.post(`/newsletters/${id}/send`);
      setSuccess("Newsletter sent successfully.");
      fetchNewsletters();
    } catch {
      setError("Failed to send newsletter.");
    } finally {
      setSendingId(null);
    }
  }

  async function generateNewsletter(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError("");

    try {
      const payload: Record<string, unknown> = { topic: genTopic };
      if (genTone) payload.tone = genTone;
      if (genBrandId) payload.brand_id = genBrandId;

      const res = await api.post("/newsletters/generate", payload);
      const generated = res.data.data;
      setSubject(generated.subject || genTopic);
      setContent(generated.content_markdown || generated.content || "");
      setBrandId(genBrandId);
      setView("edit");
      setSuccess("Content generated. Review and save when ready.");
    } catch {
      setError("Failed to generate content. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function addSubscriber(e: React.FormEvent) {
    e.preventDefault();
    setAddingSub(true);
    setError("");

    try {
      const payload: Record<string, unknown> = { email: subEmail };
      if (subName.trim()) payload.name = subName.trim();
      await api.post("/newsletters/subscribers", payload);
      setSubEmail("");
      setSubName("");
      setShowAddSub(false);
      fetchSubscribers();
      setSuccess("Subscriber added successfully.");
    } catch {
      setError("Failed to add subscriber.");
    } finally {
      setAddingSub(false);
    }
  }

  async function removeSubscriber(id: string) {
    if (!confirm("Remove this subscriber?")) return;
    try {
      await api.delete(`/newsletters/subscribers/${id}`);
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
    } catch {
      /* ignore */
    }
  }

  const inputClasses =
    "w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view !== "list" && (
            <button
              onClick={() => { setView("list"); setError(""); setSuccess(""); }}
              className="rounded-lg p-2 hover:bg-amber-500/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Mail className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold">
            {view === "list" ? "Newsletters" : view === "edit" ? (editingNl ? "Edit Newsletter" : "New Newsletter") : "Generate with AI"}
          </h1>
        </div>
        {view === "list" && tab === "newsletters" && (
          <div className="flex gap-2">
            <button
              onClick={() => { setView("generate"); setError(""); }}
              className="flex items-center gap-2 rounded-lg border border-amber-500/30 px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-500/10 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </button>
            <button
              onClick={openNewNewsletter}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
            >
              <Plus className="h-4 w-4" />
              New Newsletter
            </button>
          </div>
        )}
        {view === "list" && tab === "subscribers" && (
          <button
            onClick={() => setShowAddSub(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
          >
            <UserPlus className="h-4 w-4" />
            Add Subscriber
          </button>
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

      {/* Tabs */}
      {view === "list" && (
        <div className="flex gap-1 rounded-lg bg-card-bg p-1 w-fit border border-card-border">
          {(["newsletters", "subscribers"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); setSuccess(""); }}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-amber-500/15 text-amber-600"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t === "newsletters" ? <FileText className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              {t === "newsletters" ? "Newsletters" : `Subscribers (${subscribers.length})`}
            </button>
          ))}
        </div>
      )}

      {/* NEWSLETTER LIST */}
      {view === "list" && tab === "newsletters" && (
        <>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : newsletters.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
              <Mail className="h-12 w-12 text-amber-500/40 mb-4" />
              <h2 className="text-lg font-semibold mb-1">No newsletters yet</h2>
              <p className="text-sm text-muted mb-6 max-w-sm">
                Create and send newsletters to engage your audience.
              </p>
              <button
                onClick={openNewNewsletter}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
              >
                Create Newsletter
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {newsletters.map((nl) => (
                <motion.div
                  key={nl.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{nl.subject}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          nl.status === "sent"
                            ? "bg-green-500/10 text-green-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {nl.status === "sent" ? "Sent" : "Draft"}
                      </span>
                    </div>
                    <p className="text-xs text-muted truncate">{(nl.content_markdown || "").slice(0, 120)}</p>
                    <span className="flex items-center gap-1 text-xs text-muted mt-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(nl.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {nl.status === "draft" && (
                      <>
                        <button
                          onClick={() => sendNewsletter(nl.id)}
                          disabled={sendingId === nl.id}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        >
                          {sendingId === nl.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Send
                        </button>
                        <button
                          onClick={() => openEditNewsletter(nl)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-amber-500/10 transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => deleteNewsletter(nl.id)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* SUBSCRIBER LIST */}
      {view === "list" && tab === "subscribers" && (
        <>
          {/* Add subscriber modal */}
          <AnimatePresence>
            {showAddSub && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={() => setShowAddSub(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="glass-card p-6 w-full max-w-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold">Add Subscriber</h2>
                    <button onClick={() => setShowAddSub(false)} className="p-1 hover:bg-amber-500/10 rounded-lg">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <form onSubmit={addSubscriber} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Email</label>
                      <input
                        type="email"
                        required
                        value={subEmail}
                        onChange={(e) => setSubEmail(e.target.value)}
                        className={inputClasses}
                        placeholder="subscriber@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Name (optional)</label>
                      <input
                        type="text"
                        value={subName}
                        onChange={(e) => setSubName(e.target.value)}
                        className={inputClasses}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={addingSub}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 disabled:opacity-50"
                      >
                        {addingSub ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        {addingSub ? "Adding..." : "Add"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddSub(false)}
                        className="rounded-lg border border-card-border px-5 py-2.5 text-sm font-medium hover:bg-amber-500/5"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {subscribers.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
              <Users className="h-12 w-12 text-amber-500/40 mb-4" />
              <h2 className="text-lg font-semibold mb-1">No subscribers yet</h2>
              <p className="text-sm text-muted mb-6 max-w-sm">
                Add subscribers to start sending newsletters.
              </p>
              <button
                onClick={() => setShowAddSub(true)}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
              >
                Add Subscriber
              </button>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-left">
                    <th className="px-5 py-3 font-medium text-muted">Email</th>
                    <th className="px-5 py-3 font-medium text-muted">Name</th>
                    <th className="px-5 py-3 font-medium text-muted">Added</th>
                    <th className="px-5 py-3 font-medium text-muted w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((sub) => (
                    <tr key={sub.id} className="border-b border-card-border/50 last:border-0">
                      <td className="px-5 py-3">{sub.email}</td>
                      <td className="px-5 py-3 text-muted">{sub.name || "-"}</td>
                      <td className="px-5 py-3 text-muted">
                        {format(new Date(sub.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => removeSubscriber(sub.id)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Unsubscribe"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* EDIT VIEW */}
      {view === "edit" && (
        <form onSubmit={saveNewsletter} className="glass-card p-6 space-y-5 max-w-3xl">
          <div>
            <label className="block text-sm font-medium mb-1.5">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClasses}
              placeholder="Newsletter subject line"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Content</label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              className={inputClasses + " resize-y"}
              placeholder="Write your newsletter content..."
            />
          </div>

          {brands.length > 0 && (
            <div className="max-w-xs">
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

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Newsletter"}
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
        <form onSubmit={generateNewsletter} className="glass-card p-6 space-y-5 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold">AI Newsletter Generator</h2>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Topic</label>
            <input
              type="text"
              required
              value={genTopic}
              onChange={(e) => setGenTopic(e.target.value)}
              className={inputClasses}
              placeholder="e.g. Monthly product updates and tips"
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
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
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

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={generating}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Generating..." : "Generate Newsletter"}
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
