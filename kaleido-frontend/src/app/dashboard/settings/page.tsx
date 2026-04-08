"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Settings, User, Lock, Share2, Loader2, Check } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ full_name: "", email: "" });
  const [referralCode, setReferralCode] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm: "" });
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, refRes] = await Promise.allSettled([
          api.get("/auth/me"),
          api.get("/referrals/code"),
        ]);
        if (meRes.status === "fulfilled") {
          const u = meRes.value.data.data;
          setProfile({ full_name: u.full_name || "", email: u.email || "" });
          setCreatedAt(u.created_at || "");
          if (u.referral_code) setReferralCode(u.referral_code);
        }
        if (refRes.status === "fulfilled") {
          setReferralCode(refRes.value.data.data?.code || refRes.value.data.data?.referral_code || "");
        }
      } catch { /* empty */ } finally { setLoading(false); }
    }
    load();
  }, []);

  async function saveProfile() {
    setSavingProfile(true); setProfileMsg({ type: "", text: "" });
    try {
      await api.patch("/auth/me", { full_name: profile.full_name, email: profile.email });
      setProfileMsg({ type: "success", text: "Profile updated successfully" });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setProfileMsg({ type: "error", text: e.response?.data?.error?.message || "Failed to update profile" });
    } finally { setSavingProfile(false); }
  }

  async function changePassword() {
    if (passwords.new_password !== passwords.confirm) {
      setPasswordMsg({ type: "error", text: "Passwords do not match" }); return;
    }
    if (passwords.new_password.length < 8) {
      setPasswordMsg({ type: "error", text: "Password must be at least 8 characters" }); return;
    }
    setSavingPassword(true); setPasswordMsg({ type: "", text: "" });
    try {
      await api.post("/auth/change-password", { current_password: passwords.current_password, new_password: passwords.new_password });
      setPasswordMsg({ type: "success", text: "Password changed successfully" });
      setPasswords({ current_password: "", new_password: "", confirm: "" });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setPasswordMsg({ type: "error", text: e.response?.data?.error?.message || "Failed to change password" });
    } finally { setSavingPassword(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>
        {profileMsg.text && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${profileMsg.type === "success" ? "bg-green-500/10 border border-green-500/20 text-green-600" : "bg-red-500/10 border border-red-500/20 text-red-600"}`}>
            {profileMsg.type === "success" && <Check className="h-4 w-4" />}
            {profileMsg.text}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500" />
          </div>
          <button onClick={saveProfile} disabled={savingProfile} className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50">
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Password Section */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Change Password</h2>
        </div>
        {passwordMsg.text && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${passwordMsg.type === "success" ? "bg-green-500/10 border border-green-500/20 text-green-600" : "bg-red-500/10 border border-red-500/20 text-red-600"}`}>
            {passwordMsg.type === "success" && <Check className="h-4 w-4" />}
            {passwordMsg.text}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Current Password</label>
            <input type="password" value={passwords.current_password} onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input type="password" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500" placeholder="Min. 8 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm New Password</label>
            <input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500" />
          </div>
          <button onClick={changePassword} disabled={savingPassword} className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50">
            {savingPassword ? "Changing..." : "Change Password"}
          </button>
        </div>
      </div>

      {/* Account Info */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Account</h2>
        </div>
        <div className="space-y-3">
          {referralCode && (
            <div>
              <label className="block text-sm font-medium mb-1">Your Referral Code</label>
              <div className="flex items-center gap-2">
                <input value={referralCode} readOnly className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm font-mono" />
                <button onClick={() => { navigator.clipboard.writeText(referralCode); }} className="shrink-0 rounded-lg border border-card-border px-3 py-2 text-sm hover:bg-card-border/50 transition-colors">Copy</button>
              </div>
            </div>
          )}
          {createdAt && (
            <div>
              <label className="block text-sm font-medium mb-1">Member Since</label>
              <p className="text-sm text-muted">{new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
