/**
 * Browser download / clipboard helpers used by the dashboard pages
 * for the "no-connector / app review" fallback flow.
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  // Fallback for older browsers / insecure contexts
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    document.body.removeChild(ta);
    return false;
  }
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke a tick so the click has a chance to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename: string, text: string, mime = "text/plain"): void {
  downloadBlob(filename, new Blob([text], { type: `${mime};charset=utf-8` }));
}

/**
 * Download a remote file (image, video, etc.) under a given filename.
 * Falls back to opening in a new tab if fetch fails (CORS, etc.).
 */
export async function downloadRemote(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const blob = await res.blob();
    downloadBlob(filename, blob);
  } catch {
    // Fallback: open in a new tab, where the user can still save the file manually
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Convert a slug-safe filename from arbitrary text. */
export function safeFilename(s: string, fallback = "kaleido"): string {
  const cleaned = s
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return cleaned || fallback;
}
