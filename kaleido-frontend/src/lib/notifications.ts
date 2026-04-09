import { create } from "zustand";

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export interface VideoJob {
  id: string;
  jobId: string;
  prompt: string;
  duration: number;
  estimatedSeconds: number;
  startedAt: number;
  status: "generating" | "completed" | "failed";
  result?: Record<string, unknown>;
  error?: string;
}

interface NotificationState {
  toasts: Toast[];
  videoJobs: VideoJob[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  addVideoJob: (job: Omit<VideoJob, "id" | "status" | "startedAt">) => string;
  updateVideoJob: (jobId: string, update: Partial<VideoJob>) => void;
  removeVideoJob: (id: string) => void;
}

let counter = 0;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],
  videoJobs: [],

  addToast: (toast) => {
    const id = `toast-${++counter}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    // Auto-remove after duration
    const ms = toast.duration ?? 5000;
    if (ms > 0) {
      setTimeout(() => get().removeToast(id), ms);
    }
    return id;
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  addVideoJob: (job) => {
    const id = `vjob-${++counter}`;
    set((s) => ({
      videoJobs: [
        ...s.videoJobs,
        { ...job, id, status: "generating", startedAt: Date.now() },
      ],
    }));
    return id;
  },

  updateVideoJob: (jobId, update) => {
    set((s) => ({
      videoJobs: s.videoJobs.map((j) =>
        j.jobId === jobId ? { ...j, ...update } : j
      ),
    }));
  },

  removeVideoJob: (id) => {
    set((s) => ({ videoJobs: s.videoJobs.filter((j) => j.id !== id) }));
  },
}));
