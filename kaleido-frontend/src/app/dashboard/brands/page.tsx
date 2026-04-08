"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Building2, Plus, Globe, Palette, Users, Pencil, Trash2, X, Loader2 } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  logo_url: string | null;
  brand_voice: string | null;
  target_audience: string | null;
  brand_colors: string[] | null;
  created_at: string;
}

const INDUSTRIES = [
  "Technology", "E-commerce", "Healthcare", "Finance", "Education",
  "Food & Beverage", "Fashion", "Travel", "Real Estate", "Entertainment",
  "Fitness", "Beauty", "Automotive", "Non-profit", "Other",
];

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "", website: "", industry: "", brand_voice: "", target_audience: "", brand_colors: "" });

  useEffect(() => { fetchBrands(); }, []);

  async function fetchBrands() {
    try {
      const res = await api.get("/brands");
      setBrands(res.data.data || []);
    } catch { /* empty */ } finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", website: "", industry: "", brand_voice: "", target_audience: "", brand_colors: "" });
    setShowForm(true);
    setError("");
  }

  function openEdit(brand: Brand) {
    setEditing(brand);
    setForm({
      name: brand.name, description: brand.description || "", website: brand.website || "",
      industry: brand.industry || "", brand_voice: brand.brand_voice || "",
      target_audience: brand.target_audience || "", brand_colors: brand.brand_colors?.join(", ") || "",
    });
    setShowForm(true);
    setError("");
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Brand name is required"); return; }
    setSaving(true); setError("");
    try {
      const payload: Record<string, unknown> = { name: form.name };
      if (form.description) payload.description = form.description;
      if (form.website) payload.website = form.website;
      if (form.industry) payload.industry = form.industry;
      if (form.brand_voice) payload.brand_voice = form.brand_voice;
      if (form.target_audience) payload.target_audience = form.target_audience;
      if (form.brand_colors) payload.brand_colors = form.brand_colors.split(",").map((c) => c.trim()).filter(Boolean);
      if (editing) { await api.patch(`/brands/${editing.id}`, payload); }
      else { await api.post("/brands", payload); }
      setShowForm(false);
      fetchBrands();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message || "Failed to save brand");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this brand?")) return;
    try { await api.delete(`/brands/${id}`); setBrands(brands.filter((b) => b.id !== id)); } catch { /* empty */ }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Brands</h1>
          <p className="text-sm text-muted">Manage your brand profiles for personalized content</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow">
          <Plus className="h-4 w-4" /> New Brand
        </button>
      </div>

      {brands.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted opacity-40" />
          <h3 className="text-lg font-semibold mb-2">No brands yet</h3>
          <p className="text-sm text-muted mb-4">Create your first brand to personalize AI-generated content.</p>
          <button onClick={openCreate} className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-medium text-white">Create Brand</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <div key={brand.id} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <span className="text-white font-bold">{brand.name[0]}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{brand.name}</h3>
                    {brand.industry && <p className="text-xs text-muted">{brand.industry}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(brand)} className="p-1.5 rounded hover:bg-card-border/50 text-muted hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(brand.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {brand.description && <p className="text-sm text-muted mb-3 line-clamp-2">{brand.description}</p>}
              <div className="space-y-1.5 text-xs text-muted">
                {brand.website && <div className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> {brand.website}</div>}
                {brand.target_audience && <div className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {brand.target_audience}</div>}
                {brand.brand_colors && brand.brand_colors.length > 0 && (
                  <div className="flex items-center gap-1.5"><Palette className="h-3 w-3" />
                    <div className="flex gap-1">{brand.brand_colors.map((c, i) => <span key={i} className="h-4 w-4 rounded-full border border-card-border" style={{ backgroundColor: c }} />)}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? "Edit Brand" : "Create Brand"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-600">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500" placeholder="My Brand" /></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 resize-none" placeholder="Brief description" /></div>
              <div><label className="block text-sm font-medium mb-1">Website</label><input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500" placeholder="https://mybrand.com" /></div>
              <div><label className="block text-sm font-medium mb-1">Industry</label><select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500"><option value="">Select industry</option>{INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Brand Voice</label><input value={form.brand_voice} onChange={(e) => setForm({ ...form, brand_voice: e.target.value })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500" placeholder="Professional, friendly..." /></div>
              <div><label className="block text-sm font-medium mb-1">Target Audience</label><input value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500" placeholder="Young professionals 25-35..." /></div>
              <div><label className="block text-sm font-medium mb-1">Brand Colors (comma-separated hex)</label><input value={form.brand_colors} onChange={(e) => setForm({ ...form, brand_colors: e.target.value })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500" placeholder="#F59E0B, #10B981" /></div>
              <button onClick={handleSave} disabled={saving} className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50">
                {saving ? "Saving..." : editing ? "Update Brand" : "Create Brand"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
