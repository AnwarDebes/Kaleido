"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, X, ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useNotificationStore, type VideoJob } from "@/lib/notifications";
import { api } from "@/lib/api";

function JobCard({ job, onViewResult }: { job: VideoJob; onViewResult: (job: VideoJob) => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (job.status !== "generating") return;
    const tick = () => setElapsed(Math.floor((Date.now() - job.startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [job.startedAt, job.status]);

  const progress =
    job.status === "completed"
      ? 100
      : job.status === "failed"
        ? 0
        : Math.min(Math.round((elapsed / job.estimatedSeconds) * 100), 95);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const estMin = Math.ceil(job.estimatedSeconds / 60);

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-foreground truncate max-w-[180px]">
          {job.prompt.length > 35 ? job.prompt.slice(0, 35) + "..." : job.prompt}
        </p>
        {job.status === "generating" && (
          <span className="text-[10px] tabular-nums text-muted">{timeStr}</span>
        )}
      </div>

      {/* Water fill container */}
      <div className="relative h-8 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 border border-card-border">
        {/* Water fill */}
        <motion.div
          className={`absolute bottom-0 left-0 right-0 ${
            job.status === "completed"
              ? "bg-gradient-to-t from-emerald-500 to-emerald-400"
              : job.status === "failed"
                ? "bg-gradient-to-t from-red-500 to-red-400"
                : "bg-gradient-to-t from-amber-500 to-amber-400"
          }`}
          initial={{ height: "0%" }}
          animate={{ height: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        {/* Wave effect on top of water */}
        {job.status === "generating" && progress > 5 && (
          <motion.div
            className="absolute left-0 right-0 h-1.5"
            style={{ bottom: `${progress}%`, marginBottom: "-3px" }}
            animate={{ y: [0, -1, 0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg viewBox="0 0 200 6" className="w-full h-full" preserveAspectRatio="none">
              <motion.path
                d="M0,3 Q25,0 50,3 T100,3 T150,3 T200,3"
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="2"
                animate={{
                  d: [
                    "M0,3 Q25,0 50,3 T100,3 T150,3 T200,3",
                    "M0,3 Q25,6 50,3 T100,3 T150,3 T200,3",
                    "M0,3 Q25,0 50,3 T100,3 T150,3 T200,3",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </svg>
          </motion.div>
        )}
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-xs font-bold tabular-nums ${
              progress > 50 ? "text-white" : "text-foreground"
            }`}
          >
            {job.status === "completed"
              ? "Complete!"
              : job.status === "failed"
                ? "Failed"
                : `${progress}%`}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-muted">
          {job.status === "generating"
            ? `${job.duration}s video · est. ${estMin} min`
            : job.status === "completed"
              ? `${job.duration}s video · Done`
              : "Generation failed"}
        </span>
        {job.status === "completed" && (
          <button
            onClick={() => onViewResult(job)}
            className="text-[10px] font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            View →
          </button>
        )}
      </div>
    </div>
  );
}

export default function VideoJobTracker() {
  const { videoJobs, updateVideoJob, removeVideoJob, addToast } =
    useNotificationStore();
  const [collapsed, setCollapsed] = useState(false);
  const pollRefs = useRef<Set<string>>(new Set());

  const handleViewResult = useCallback(
    (job: VideoJob) => {
      // Navigate to media page - the result data is in the job
      if (job.result) {
        // Dispatch custom event so media page can pick it up
        window.dispatchEvent(
          new CustomEvent("video-job-complete", { detail: job.result })
        );
      }
      removeVideoJob(job.id);
    },
    [removeVideoJob]
  );

  // Poll active jobs
  useEffect(() => {
    const activeJobs = videoJobs.filter((j) => j.status === "generating");

    for (const job of activeJobs) {
      if (pollRefs.current.has(job.jobId)) continue;
      pollRefs.current.add(job.jobId);

      const poll = async () => {
        try {
          const res = await api.get(`/media/generate-video/status/${job.jobId}`);
          const d = res.data;

          if (d.success && d.data?.status === "completed") {
            updateVideoJob(job.jobId, {
              status: "completed",
              result: d.data.data,
            });
            addToast({
              type: "success",
              title: "Video ready!",
              message: job.prompt.length > 50 ? job.prompt.slice(0, 50) + "..." : job.prompt,
              duration: 8000,
              action: {
                label: "View video →",
                onClick: () => {
                  window.dispatchEvent(
                    new CustomEvent("video-job-complete", { detail: d.data.data })
                  );
                  removeVideoJob(job.id);
                },
              },
            });
            pollRefs.current.delete(job.jobId);
            return;
          }

          if (!d.success || d.data?.status === "failed") {
            updateVideoJob(job.jobId, {
              status: "failed",
              error: d.error?.message || "Generation failed",
            });
            addToast({
              type: "error",
              title: "Video generation failed",
              message: d.error?.message || "Something went wrong",
              duration: 8000,
            });
            pollRefs.current.delete(job.jobId);
            return;
          }

          // Still generating — poll again
          setTimeout(poll, 3000);
        } catch {
          // Network error — retry
          setTimeout(poll, 5000);
        }
      };

      setTimeout(poll, 3000);
    }
  }, [videoJobs, updateVideoJob, addToast, removeVideoJob]);

  // Clean up completed/failed jobs after 30s
  useEffect(() => {
    const doneJobs = videoJobs.filter(
      (j) => j.status === "completed" || j.status === "failed"
    );
    for (const job of doneJobs) {
      const timer = setTimeout(() => removeVideoJob(job.id), 30000);
      return () => clearTimeout(timer);
    }
  }, [videoJobs, removeVideoJob]);

  if (videoJobs.length === 0) return null;

  const activeCount = videoJobs.filter((j) => j.status === "generating").length;

  return (
    <div className="fixed bottom-4 right-4 z-[9998] w-72">
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="rounded-xl border border-card-border bg-card-bg shadow-2xl backdrop-blur-md overflow-hidden"
      >
        {/* Header */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-amber-500/10 to-transparent hover:from-amber-500/15 transition-colors"
        >
          <div className="flex items-center gap-2">
            {activeCount > 0 ? (
              <div className="relative">
                <Film className="h-4 w-4 text-amber-500" />
                <motion.div
                  className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
            ) : (
              <Film className="h-4 w-4 text-emerald-500" />
            )}
            <span className="text-xs font-semibold">
              {activeCount > 0
                ? `Generating ${activeCount} video${activeCount > 1 ? "s" : ""}...`
                : "Video generation"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {videoJobs.length > 0 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full px-1.5 py-0.5 font-medium">
                {videoJobs.length}
              </span>
            )}
            {collapsed ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted" />
            )}
          </div>
        </button>

        {/* Jobs list */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="divide-y divide-card-border max-h-64 overflow-y-auto">
                {videoJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onViewResult={handleViewResult}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
