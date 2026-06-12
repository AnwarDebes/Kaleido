/**
 * Single source of truth for all supported social platforms.
 *
 * Each entry includes:
 *  - id: matches the backend `platform` enum
 *  - label: human-friendly name
 *  - charLimit: max characters per post (for the editor's counter)
 *  - reviewStatus: where we sit with the platform's API review process,
 *    so the UI can be honest about which "Publish" buttons actually work
 *    today and which fall back to download + manual share.
 *  - shareIntent(payload): builds a deep link to the platform's compose
 *    page so users can post manually while we wait for review. Returns
 *    null when the platform has no usable web compose endpoint.
 *  - mediaSupport: which media kinds the platform accepts.
 *  - colour: hint for tinting platform chips.
 */

export type ReviewStatus =
  | "instant"        // works the moment user connects (no app review)
  | "ready"          // OAuth available, no formal review needed
  | "review-pending" // submitted, waiting for platform approval
  | "manual-only"    // platform has no posting API we can use yet
  ;

export type MediaKind = "text" | "image" | "video" | "link";

export interface SharePayload {
  text?: string;
  url?: string;
  hashtags?: string[];
}

export interface PlatformDef {
  id: string;
  label: string;
  short?: string;
  charLimit: number;
  reviewStatus: ReviewStatus;
  mediaSupport: MediaKind[];
  colour: string; // tailwind hex-ish accent
  /** Construct a "compose" URL for manual posting, or null if not possible. */
  shareIntent: (p: SharePayload) => string | null;
  /** Where to download mobile/desktop app for manual posting. */
  appUrl?: string;
}

function joinForShare(p: SharePayload): string {
  const tags = (p.hashtags || []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  return [p.text, tags].filter(Boolean).join("\n\n");
}

export const PLATFORMS: PlatformDef[] = [
  {
    id: "twitter",
    label: "Twitter / X",
    short: "X",
    charLimit: 280,
    reviewStatus: "review-pending",
    mediaSupport: ["text", "image", "video", "link"],
    colour: "#0F1419",
    shareIntent: (p) => {
      const text = joinForShare(p);
      const params = new URLSearchParams();
      if (text) params.set("text", text);
      if (p.url) params.set("url", p.url);
      return `https://twitter.com/intent/tweet?${params.toString()}`;
    },
  },
  {
    id: "facebook",
    label: "Facebook",
    charLimit: 63206,
    reviewStatus: "review-pending",
    mediaSupport: ["text", "image", "video", "link"],
    colour: "#1877F2",
    shareIntent: (p) => {
      // Facebook's sharer only takes a URL; text is ignored, but we offer it anyway.
      if (p.url) {
        const params = new URLSearchParams({ u: p.url });
        if (p.text) params.set("quote", joinForShare(p));
        return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
      }
      // No URL? Open Facebook's web composer.
      return "https://www.facebook.com/?sk=composer";
    },
  },
  {
    id: "instagram",
    label: "Instagram",
    charLimit: 2200,
    reviewStatus: "review-pending",
    mediaSupport: ["image", "video"],
    colour: "#E4405F",
    // Instagram has no web compose URL. We tell the user to copy + open the app.
    shareIntent: () => "https://www.instagram.com/",
    appUrl: "https://www.instagram.com/",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    charLimit: 3000,
    reviewStatus: "review-pending",
    mediaSupport: ["text", "image", "video", "link"],
    colour: "#0A66C2",
    shareIntent: (p) => {
      if (p.url) {
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(p.url)}`;
      }
      // Without a URL, deep link into the post composer.
      return "https://www.linkedin.com/feed/?shareActive=true";
    },
  },
  {
    id: "tiktok",
    label: "TikTok",
    charLimit: 2200,
    reviewStatus: "review-pending",
    mediaSupport: ["video"],
    colour: "#000000",
    shareIntent: () => "https://www.tiktok.com/upload",
  },
  {
    id: "youtube",
    label: "YouTube",
    charLimit: 5000,
    reviewStatus: "review-pending",
    mediaSupport: ["video"],
    colour: "#FF0000",
    shareIntent: () => "https://studio.youtube.com/channel/UC/videos/upload",
  },
  {
    id: "pinterest",
    label: "Pinterest",
    charLimit: 500,
    reviewStatus: "review-pending",
    mediaSupport: ["image"],
    colour: "#E60023",
    shareIntent: (p) => {
      const params = new URLSearchParams();
      if (p.url) params.set("url", p.url);
      if (p.text) params.set("description", joinForShare(p));
      return `https://www.pinterest.com/pin-builder/?${params.toString()}`;
    },
  },
  {
    id: "reddit",
    label: "Reddit",
    charLimit: 40000,
    reviewStatus: "ready",
    mediaSupport: ["text", "image", "video", "link"],
    colour: "#FF4500",
    shareIntent: (p) => {
      const params = new URLSearchParams();
      if (p.text) params.set("title", p.text.split("\n")[0].slice(0, 300));
      if (p.url) params.set("url", p.url);
      return `https://www.reddit.com/submit?${params.toString()}`;
    },
  },
  {
    id: "bluesky",
    label: "Bluesky",
    charLimit: 300,
    reviewStatus: "instant",
    mediaSupport: ["text", "image", "link"],
    colour: "#1185FE",
    shareIntent: (p) => {
      const text = joinForShare(p);
      return `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`;
    },
  },
  {
    id: "threads",
    label: "Threads",
    charLimit: 500,
    reviewStatus: "manual-only",
    mediaSupport: ["text", "image", "video"],
    colour: "#000000",
    shareIntent: (p) => {
      const text = joinForShare(p);
      return `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`;
    },
  },
  {
    id: "google_business",
    label: "Google Business",
    charLimit: 1500,
    reviewStatus: "review-pending",
    mediaSupport: ["text", "image"],
    colour: "#4285F4",
    shareIntent: () => "https://business.google.com/posts",
  },
  {
    id: "telegram",
    label: "Telegram",
    charLimit: 4096,
    reviewStatus: "instant",
    mediaSupport: ["text", "image", "video", "link"],
    colour: "#26A5E4",
    shareIntent: (p) => {
      const params = new URLSearchParams();
      if (p.url) params.set("url", p.url);
      if (p.text) params.set("text", joinForShare(p));
      return `https://t.me/share/url?${params.toString()}`;
    },
  },
  {
    id: "snapchat",
    label: "Snapchat",
    charLimit: 250,
    reviewStatus: "review-pending",
    mediaSupport: ["image", "video"],
    colour: "#FFFC00",
    shareIntent: () => "https://accounts.snapchat.com/accounts/login",
  },
  {
    id: "whatsapp",
    label: "WhatsApp Business",
    charLimit: 1024,
    reviewStatus: "review-pending",
    mediaSupport: ["text", "image", "video", "link"],
    colour: "#25D366",
    shareIntent: (p) => {
      const text = joinForShare(p);
      return `https://wa.me/?text=${encodeURIComponent(text)}`;
    },
  },
];

export const PLATFORMS_BY_ID: Record<string, PlatformDef> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p]),
);

export const PLATFORM_LABELS: string[] = PLATFORMS.map((p) => p.label);

export function platformById(id: string): PlatformDef | undefined {
  return PLATFORMS_BY_ID[id] || PLATFORMS_BY_ID[id.toLowerCase()];
}

/** Try to find a platform by its label too (legacy posts page used labels). */
export function platformByLabel(label: string): PlatformDef | undefined {
  // Compare on letters and digits only so "Twitter/X", "Twitter / X" and
  // "twitter" all resolve to the same platform.
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const norm = squash(label);
  if (!norm) return undefined;
  return PLATFORMS.find(
    (p) => squash(p.label) === norm || squash(p.id) === norm,
  );
}

export function reviewLabel(status: ReviewStatus): string {
  switch (status) {
    case "instant":
      return "No app review needed";
    case "ready":
      return "Connect when ready";
    case "review-pending":
      return "Under app review";
    case "manual-only":
      return "Manual share only";
  }
}

export function reviewTone(status: ReviewStatus): string {
  switch (status) {
    case "instant":
      return "text-green-600 bg-green-500/10";
    case "ready":
      return "text-blue-600 bg-blue-500/10";
    case "review-pending":
      return "text-amber-600 bg-amber-500/10";
    case "manual-only":
      return "text-stone-600 bg-stone-500/10";
  }
}
