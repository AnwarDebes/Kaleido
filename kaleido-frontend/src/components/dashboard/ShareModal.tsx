"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Download,
  ExternalLink,
  Check,
  AlertTriangle,
  Image as ImageIcon,
  Film,
  FileText,
} from "lucide-react";
import { copyToClipboard, downloadText, downloadRemote, safeFilename } from "@/lib/download";
import { PLATFORMS, reviewLabel, reviewTone, type PlatformDef } from "@/lib/platforms";
import { useNotificationStore } from "@/lib/notifications";

export interface ShareModalContent {
  /** Body of the post, usually the AI-generated text. */
  text: string;
  /** Hashtags to suggest separately so the user can paste them as a comment. */
  hashtags?: string[];
  /** Optional URL to share. */
  url?: string;
  /** Media files to make available for download. */
  media?: { url: string; filename: string; kind: "image" | "video" }[];
  /** Subset of platform ids the user originally picked. */
  platformIds?: string[];
  /** Title for the modal (e.g. "Share this post" / "Download this image"). */
  title?: string;
  /** Brief subtitle / context line. */
  subtitle?: string;
  /** Optional suggested filename (no extension) for text export. */
  suggestedName?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  content: ShareModalContent | null;
}

export default function ShareModal({ open, onClose, content }: Props) {
  const [copied, setCopied] = useState<"text" | "hashtags" | "all" | null>(null);
  const { addToast } = useNotificationStore();

  if (!content) return null;
  // Stable copy so the narrower type holds through the closure handlers.
  const c = content;

  const fullText = [c.text, (c.hashtags || []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")]
    .filter(Boolean)
    .join("\n\n");

  const filename = safeFilename(c.suggestedName || c.text.split("\n")[0] || "post");

  const platforms: PlatformDef[] = c.platformIds && c.platformIds.length > 0
    ? PLATFORMS.filter((p) => c.platformIds!.some((id) => id.toLowerCase() === p.id || id.toLowerCase() === p.label.toLowerCase()))
    : PLATFORMS;

  async function handleCopy(which: "text" | "hashtags" | "all", value: string) {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(which);
      addToast({ type: "success", title: "Copied", message: `${which === "all" ? "Post" : which} copied to clipboard` });
      setTimeout(() => setCopied((cur) => (cur === which ? null : cur)), 1500);
    } else {
      addToast({ type: "error", title: "Copy failed", message: "Your browser blocked the clipboard. Use the download button instead." });
    }
  }

  function openShare(p: PlatformDef) {
    const link = p.shareIntent({
      text: c.text,
      hashtags: c.hashtags,
      url: c.url,
    });
    // Platforms without a text composer (Instagram, TikTok, Snapchat...)
    // cannot be prefilled, so remind the user to copy and download first.
    if (!link || !p.mediaSupport.includes("text")) {
      addToast({
        type: "info",
        title: `${p.label} needs a manual upload`,
        message: "Copy the text and download any media first, then paste in the app.",
      });
      if (!link) return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">{c.title || "Share or download"}</h2>
                <p className="text-xs text-muted mt-1">
                  {c.subtitle ||
                    "Copy the text, download the files, or jump straight to any platform's compose page."}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-muted hover:text-foreground hover:bg-amber-500/5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 mb-4 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                While we&apos;re waiting on app reviews from each platform, Kaleido falls back to a
                copy + download + manual share flow. Nothing is lost. Your draft stays here.
              </span>
            </div>

            {/* Text payload */}
            <div className="space-y-3 mb-5">
              <div className="rounded-lg border border-card-border bg-background/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Post body
                  </span>
                  <span className="text-[10px] text-muted">{c.text.length} chars</span>
                </div>
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto">
                  {c.text || <em className="text-muted">(empty)</em>}
                </pre>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleCopy("text", c.text)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card-bg px-3 py-1.5 text-xs font-medium hover:border-amber-500/30 transition-colors"
                  >
                    {copied === "text" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy text
                  </button>
                  <button
                    onClick={() => downloadText(`${filename}.txt`, c.text)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card-bg px-3 py-1.5 text-xs font-medium hover:border-amber-500/30 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download .txt
                  </button>
                </div>
              </div>

              {c.hashtags && c.hashtags.length > 0 && (
                <div className="rounded-lg border border-card-border bg-background/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Hashtags
                    </span>
                    <span className="text-[10px] text-muted">{c.hashtags.length} tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.hashtags.map((h) => (
                      <span
                        key={h}
                        className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300"
                      >
                        {h.startsWith("#") ? h : `#${h}`}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      handleCopy(
                        "hashtags",
                        c.hashtags!.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "),
                      )
                    }
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card-bg px-3 py-1.5 text-xs font-medium hover:border-amber-500/30 transition-colors"
                  >
                    {copied === "hashtags" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy hashtags
                  </button>
                </div>
              )}

              <button
                onClick={() => handleCopy("all", fullText)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
              >
                {copied === "all" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy everything
              </button>
            </div>

            {/* Media */}
            {c.media && c.media.length > 0 && (
              <div className="mb-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Attached media
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {c.media.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => downloadRemote(m.url, m.filename)}
                      className="group flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-left text-xs font-medium hover:border-amber-500/30 transition-colors"
                    >
                      {m.kind === "video" ? (
                        <Film className="h-4 w-4 shrink-0 text-amber-500" />
                      ) : (
                        <ImageIcon className="h-4 w-4 shrink-0 text-amber-500" />
                      )}
                      <span className="truncate">{m.filename}</span>
                      <Download className="h-3.5 w-3.5 ml-auto opacity-60 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Per-platform share links */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Open in a platform
              </span>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openShare(p)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-left hover:border-amber-500/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.label}</p>
                      <p className={`mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium ${reviewTone(p.reviewStatus)}`}>
                        {reviewLabel(p.reviewStatus)}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted shrink-0" />
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted flex items-start gap-1.5">
                <FileText className="h-3 w-3 shrink-0 mt-0.5" />
                Tip: copy first, then click a platform. Kaleido opens its composer so you can paste and post.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
