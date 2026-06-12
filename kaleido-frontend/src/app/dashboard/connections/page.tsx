"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Check,
  Clock,
  Info,
  RefreshCw,
  X,
  KeyRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNotificationStore } from "@/lib/notifications";
import {
  PLATFORMS,
  reviewLabel,
  reviewTone,
  type PlatformDef,
  type ReviewStatus,
} from "@/lib/platforms";

interface ConnectedAccount {
  id: string;
  platform: string;
  platform_username: string | null;
  platform_display_name: string | null;
  platform_avatar_url: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  token_expires_at: string | null;
  created_at: string;
}

interface PlatformAvailability {
  id: string;
  name: string;
  auth_type: string;
  configured?: boolean;
}

export default function ConnectionsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [supported, setSupported] = useState<PlatformAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Credential modal for platforms that connect without OAuth
  // (Bluesky app passwords, Telegram bot tokens).
  const [credModal, setCredModal] = useState<{ platform: PlatformDef; state: string } | null>(null);
  const [credA, setCredA] = useState("");
  const [credB, setCredB] = useState("");
  const [credSubmitting, setCredSubmitting] = useState(false);
  const [credError, setCredError] = useState("");
  const { addToast } = useNotificationStore();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [accountsRes, platformsRes] = await Promise.allSettled([
        api.get("/social-accounts"),
        api.get("/social-accounts/platforms"),
      ]);
      if (accountsRes.status === "fulfilled") {
        setAccounts(accountsRes.value.data.data || []);
      }
      if (platformsRes.status === "fulfilled") {
        setSupported(platformsRes.value.data.data || []);
      }
    } catch {
      setError("Could not load connection status. Try refreshing in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConnect(p: PlatformDef) {
    setConnecting(p.id);
    setError("");
    try {
      const res = await api.get(`/social-accounts/connect/${p.id}`);
      const { auth_url: authUrl, state } = res.data.data || {};

      // Bluesky and Telegram connect with credentials entered right here,
      // no OAuth redirect and no app review needed.
      const meta = supported.find((s) => s.id === p.id);
      const credentialAuth = meta?.auth_type === "credentials" || meta?.auth_type === "bot_token";
      if (credentialAuth && state) {
        setCredA("");
        setCredB("");
        setCredError("");
        setCredModal({ platform: p, state });
        return;
      }

      if (authUrl) {
        window.location.href = authUrl;
        return;
      }
      addToast({ type: "info", title: "Connector not configured", message: `${p.label} requires API keys on the server.` });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = e.response?.data?.error?.message;
      if (msg && msg.toLowerCase().includes("not configured")) {
        addToast({
          type: "info",
          title: `${p.label} is not connected yet`,
          message:
            "Our app is still in review with this platform. You can still generate content and post manually. See the share menu on any post.",
          duration: 8000,
        });
      } else {
        setError(msg || `Failed to start the ${p.label} flow.`);
      }
    } finally {
      setConnecting(null);
    }
  }

  async function submitCredentials() {
    if (!credModal) return;
    const a = credA.trim();
    const b = credB.trim();
    if (!a || !b) {
      setCredError("Both fields are required.");
      return;
    }
    setCredSubmitting(true);
    setCredError("");
    try {
      await api.get(`/social-accounts/callback/${credModal.platform.id}`, {
        params: { code: `${a}:${b}`, state: credModal.state },
      });
      addToast({ type: "success", title: `${credModal.platform.label} connected` });
      setCredModal(null);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setCredError(
        e.response?.data?.error?.message ||
          "Could not connect. Check the details and try again.",
      );
    } finally {
      setCredSubmitting(false);
    }
  }

  async function handleDisconnect(account: ConnectedAccount) {
    if (!confirm(`Disconnect ${account.platform}? Drafts targeting this platform will keep their text but lose the direct publish link.`)) return;
    setRemoving(account.id);
    try {
      await api.delete(`/social-accounts/${account.id}`);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      addToast({ type: "success", title: "Disconnected" });
    } catch {
      addToast({ type: "error", title: "Could not disconnect", message: "Please try again in a moment." });
    } finally {
      setRemoving(null);
    }
  }

  const byPlatform = new Map<string, ConnectedAccount[]>();
  for (const a of accounts) {
    const arr = byPlatform.get(a.platform) ?? [];
    arr.push(a);
    byPlatform.set(a.platform, arr);
  }
  const supportedConfigured = new Set(
    supported.filter((s) => s.configured !== false).map((s) => s.id),
  );

  function effectiveStatus(p: PlatformDef): ReviewStatus {
    // If the platform's OAuth credentials aren't configured server-side, no
    // amount of "review-pending" matters; show it as manual-only so the user
    // isn't confused. When the /platforms request failed (supported is
    // empty), fall back to the static status instead of downgrading all.
    if (
      supported.length > 0 &&
      !supportedConfigured.has(p.id) &&
      p.reviewStatus !== "instant"
    ) {
      return p.reviewStatus === "ready" ? "ready" : "manual-only";
    }
    return p.reviewStatus;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Connections</h1>
          <p className="text-sm text-muted mt-1">
            Connect a platform when its API is approved. Until then, every generated post
            can still be exported and shared manually.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm font-medium hover:border-amber-500/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="glass-card border-amber-500/20 px-4 py-3 text-sm flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">App reviews can take a while. That&apos;s normal.</p>
          <p className="text-muted mt-1 text-xs">
            Most platforms (Instagram, X, TikTok, Facebook, YouTube, LinkedIn) only let third-party tools
            publish on your behalf after a manual review of our app. We&apos;ve submitted ours and we&apos;re waiting.
            In the meantime: generate freely, then use <span className="font-medium text-foreground">Download</span> or
            <span className="font-medium text-foreground"> Share to…</span> on any post.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLATFORMS.map((p) => {
            const connected = byPlatform.get(p.id) || [];
            const status = effectiveStatus(p);
            const isConnecting = connecting === p.id;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-white text-sm font-bold"
                      style={{ backgroundColor: p.colour }}
                    >
                      {p.label.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.label}</p>
                      <p className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${reviewTone(status)}`}>
                        {status === "review-pending" && <Clock className="h-2.5 w-2.5" />}
                        {status === "instant" && <Check className="h-2.5 w-2.5" />}
                        {reviewLabel(status)}
                      </p>
                    </div>
                  </div>
                </div>

                {connected.length > 0 ? (
                  <ul className="space-y-2 mb-3">
                    {connected.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-2 rounded-lg border border-card-border bg-background/50 px-2.5 py-1.5"
                      >
                        {a.platform_avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.platform_avatar_url}
                            alt=""
                            className="h-7 w-7 rounded-full"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 text-xs font-medium">
                            {(a.platform_username || a.platform_display_name || "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">
                            {a.platform_display_name || a.platform_username || "Connected"}
                          </p>
                          {a.platform_username && a.platform_display_name && (
                            <p className="text-[10px] text-muted truncate">@{a.platform_username}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDisconnect(a)}
                          disabled={removing === a.id}
                          className="rounded-md p-1 text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Disconnect"
                        >
                          {removing === a.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted mb-3">
                    No account connected. {status === "review-pending"
                      ? "You can still post manually from any Kaleido post. See the Share menu."
                      : status === "manual-only"
                      ? `${p.label} doesn't expose a public posting API yet; use the share menu to open its composer.`
                      : "Click connect to authorise Kaleido with this account."}
                  </p>
                )}

                <div className="mt-auto flex gap-2">
                  {status === "manual-only" ? (
                    <a
                      href={p.appUrl || p.shareIntent({ text: "" }) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-xs font-medium hover:border-amber-500/30 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open {p.label}
                    </a>
                  ) : (
                    <button
                      onClick={() => handleConnect(p)}
                      disabled={isConnecting}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-60"
                    >
                      {isConnecting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      {connected.length > 0 ? "Add another" : "Connect"}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <details className="glass-card p-4">
        <summary className="cursor-pointer font-medium text-sm">
          Why are so many platforms marked &ldquo;Under app review&rdquo;?
        </summary>
        <div className="mt-3 space-y-2 text-sm text-muted leading-relaxed">
          <p>
            Most major social networks require third-party apps to pass a manual review before they let
            users authorise posting on their behalf. This is to prevent spam and abuse. The reviews take
            anywhere from a few days to a month or more.
          </p>
          <p>
            <span className="text-foreground font-medium">What still works today</span>: Bluesky and
            Telegram (and most &ldquo;Open ___&rdquo; deep links) work right away. For everything else, Kaleido
            generates the content and gives you a one-click &ldquo;Share to&rdquo; button that opens the platform&apos;s
            own composer with your post pre-filled when possible, or just lets you copy and paste.
          </p>
          <p>
            If you&apos;d like to be notified when a platform comes out of review, you can keep an eye on
            this page. Connection buttons activate automatically once our app is approved.
          </p>
        </div>
      </details>

      {/* Credential modal for Bluesky (app password) and Telegram (bot token) */}
      <AnimatePresence>
        {credModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => !credSubmitting && setCredModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-bold">Connect {credModal.platform.label}</h2>
                </div>
                <button
                  onClick={() => setCredModal(null)}
                  className="rounded-lg p-2 text-muted hover:text-foreground hover:bg-amber-500/5 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {credModal.platform.id === "bluesky" ? (
                <p className="text-xs text-muted mb-4">
                  Use an app password, not your main password. You can create one at{" "}
                  <a
                    href="https://bsky.app/settings/app-passwords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-500 underline"
                  >
                    bsky.app/settings/app-passwords
                  </a>
                  .
                </p>
              ) : (
                <p className="text-xs text-muted mb-4">
                  Create a bot with @BotFather on Telegram, add it as an admin to your channel
                  or group, and paste the bot token plus the chat or channel ID here.
                </p>
              )}

              {credError && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-600">
                  {credError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    {credModal.platform.id === "bluesky"
                      ? "Handle (e.g. yourname.bsky.social)"
                      : "Bot token (from @BotFather)"}
                  </label>
                  <input
                    type="text"
                    value={credA}
                    onChange={(e) => setCredA(e.target.value)}
                    className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                    placeholder={
                      credModal.platform.id === "bluesky"
                        ? "yourname.bsky.social"
                        : "123456789:AAaa..."
                    }
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    {credModal.platform.id === "bluesky" ? "App password" : "Chat or channel ID"}
                  </label>
                  <input
                    type={credModal.platform.id === "bluesky" ? "password" : "text"}
                    value={credB}
                    onChange={(e) => setCredB(e.target.value)}
                    className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                    placeholder={
                      credModal.platform.id === "bluesky" ? "xxxx-xxxx-xxxx-xxxx" : "@yourchannel or -100123456789"
                    }
                  />
                </div>
              </div>

              <button
                onClick={submitCredentials}
                disabled={credSubmitting}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-60"
              >
                {credSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Connect
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
