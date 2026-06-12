"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { User, Lock, Share2, Loader2, Check, ExternalLink, Globe, Smartphone, Download } from "lucide-react";
import { useNotificationStore } from "@/lib/notifications";
import { downloadBlob } from "@/lib/download";

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
  const [reminders, setReminders] = useState({ configured: false, telegram_chat_id: "", reminders_enabled: true });
  const [telegramForm, setTelegramForm] = useState({ bot_token: "", chat_id: "", reminders_enabled: true });
  const [connectingTelegram, setConnectingTelegram] = useState(false);
  const [disconnectingTelegram, setDisconnectingTelegram] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { addToast } = useNotificationStore();

  useEffect(() => {
    async function load() {
      try {
        const [meRes, refRes, remRes] = await Promise.allSettled([
          api.get("/auth/me"),
          api.get("/referrals/code"),
          api.get("/notifications/reminders"),
        ]);
        if (meRes.status === "fulfilled") {
          const raw = meRes.value.data.data;
          const u = raw?.user || raw;
          setProfile({ full_name: u.full_name || "", email: u.email || "" });
          setCreatedAt(u.created_at || "");
          if (u.referral_code) setReferralCode(u.referral_code);
        }
        if (refRes.status === "fulfilled") {
          setReferralCode(refRes.value.data.data?.code || refRes.value.data.data?.referral_code || "");
        }
        if (remRes.status === "fulfilled") {
          const r = remRes.value.data.data;
          if (r) setReminders({ configured: !!r.configured, telegram_chat_id: r.telegram_chat_id || "", reminders_enabled: r.reminders_enabled !== false });
        }
      } catch { /* empty */ } finally { setLoading(false); }
    }
    load();
  }, []);

  async function connectTelegram() {
    if (!telegramForm.bot_token.trim() || !telegramForm.chat_id.trim()) {
      addToast({ type: "error", title: "Missing details", message: "Enter both the bot token and your chat ID." });
      return;
    }
    setConnectingTelegram(true);
    try {
      await api.put("/notifications/reminders", {
        telegram_bot_token: telegramForm.bot_token.trim(),
        telegram_chat_id: telegramForm.chat_id.trim(),
        reminders_enabled: telegramForm.reminders_enabled,
      });
      setReminders({ configured: true, telegram_chat_id: telegramForm.chat_id.trim(), reminders_enabled: telegramForm.reminders_enabled });
      setTelegramForm({ bot_token: "", chat_id: "", reminders_enabled: true });
      addToast({ type: "success", title: "Telegram connected", message: "We sent a hello message. Check Telegram to confirm it arrived." });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      addToast({ type: "error", title: "Could not connect", message: e.response?.data?.error?.message || "Failed to verify the bot. Please check the token and chat ID." });
    } finally { setConnectingTelegram(false); }
  }

  async function disconnectTelegram() {
    setDisconnectingTelegram(true);
    try {
      await api.delete("/notifications/reminders");
      setReminders({ configured: false, telegram_chat_id: "", reminders_enabled: true });
      addToast({ type: "success", title: "Telegram disconnected" });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      addToast({ type: "error", title: "Could not disconnect", message: e.response?.data?.error?.message || "Failed to remove the setup. Please try again." });
    } finally { setDisconnectingTelegram(false); }
  }

  async function downloadExport() {
    setExporting(true);
    try {
      const res = await api.get("/auth/me/export", { responseType: "blob", timeout: 300000 });
      downloadBlob("kaleido-export.zip", res.data);
      addToast({ type: "success", title: "Export ready", message: "kaleido-export.zip is downloading." });
    } catch (err: unknown) {
      // With responseType blob, error bodies arrive as a Blob, so parse it to find the message.
      let message = "Failed to prepare your export. Please try again.";
      const data = (err as { response?: { data?: unknown } }).response?.data;
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text());
          message = parsed?.error?.message || message;
        } catch { /* keep fallback message */ }
      }
      addToast({ type: "error", title: "Download failed", message });
    } finally { setExporting(false); }
  }

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

      {/* Connections shortcut */}
      <Link
        href="/dashboard/connections"
        className="glass-card p-6 flex items-center gap-4 hover:border-amber-500/30 transition-colors group"
      >
        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Globe className="h-5 w-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Social media connections</p>
          <p className="text-sm text-muted mt-0.5">
            Connect Facebook, X, LinkedIn, Bluesky, Telegram and others, or post manually with one click.
          </p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted group-hover:text-foreground transition-colors" />
      </Link>

      {/* Send to phone */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Send to phone</h2>
        </div>
        <p className="text-sm text-muted mb-4">
          Connect your own Telegram bot and Kaleido can send any post to your phone, caption and media ready to paste. Scheduled posts that cannot auto-publish arrive here as reminders. Create a bot with @BotFather, then open a chat with it and press Start.
        </p>
        {reminders.configured ? (
          <div className="space-y-4">
            <div className="rounded-lg px-4 py-3 text-sm flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-600">
              <Check className="h-4 w-4" />
              Connected to chat ID {reminders.telegram_chat_id}
            </div>
            <p className="text-sm text-muted">
              Reminders for scheduled posts that need manual sharing: {reminders.reminders_enabled ? "on" : "off"}
            </p>
            <p className="text-sm text-muted">To change settings, disconnect and connect again.</p>
            <button onClick={disconnectTelegram} disabled={disconnectingTelegram} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium hover:bg-card-border/50 transition-colors disabled:opacity-50">
              {disconnectingTelegram ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Bot token</label>
              <input value={telegramForm.bot_token} onChange={(e) => setTelegramForm({ ...telegramForm, bot_token: e.target.value })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500" placeholder="Token from @BotFather" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chat ID</label>
              <input value={telegramForm.chat_id} onChange={(e) => setTelegramForm({ ...telegramForm, chat_id: e.target.value })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500" />
              <p className="text-xs text-muted mt-1">{"Send a message to your bot, then visit api.telegram.org/bot<token>/getUpdates to find your chat id, or use @userinfobot."}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={telegramForm.reminders_enabled} onChange={(e) => setTelegramForm({ ...telegramForm, reminders_enabled: e.target.checked })} className="h-4 w-4 rounded border-card-border accent-amber-500" />
              Remind me when scheduled posts need manual sharing
            </label>
            <button onClick={connectTelegram} disabled={connectingTelegram} className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50">
              {connectingTelegram ? "Verifying bot, this can take a few seconds..." : "Connect"}
            </button>
          </div>
        )}
      </div>

      {/* Your data */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Your data</h2>
        </div>
        <p className="text-sm text-muted mb-4">
          Everything you create in Kaleido is yours. Download all of it whenever you want: posts, brands, media files, and your self-reported results.
        </p>
        <button onClick={downloadExport} disabled={exporting} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50">
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Packing your archive, this can take a moment with media...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download my data (.zip)
            </>
          )}
        </button>
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
