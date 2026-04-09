"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { useNotificationStore } from "@/lib/notifications";

const icons = {
  success: <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />,
  error: <XCircle className="h-4 w-4 text-red-500 shrink-0" />,
  info: <Info className="h-4 w-4 text-amber-500 shrink-0" />,
};

const accents = {
  success: "border-l-emerald-500",
  error: "border-l-red-500",
  info: "border-l-amber-500",
};

export default function Toasts() {
  const { toasts, removeToast } = useNotificationStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`pointer-events-auto border-l-4 ${accents[toast.type]} rounded-lg bg-card-bg border border-card-border shadow-xl backdrop-blur-md px-4 py-3`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{icons[toast.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="text-xs text-muted mt-0.5 leading-snug">
                    {toast.message}
                  </p>
                )}
                {toast.action && (
                  <button
                    onClick={toast.action.onClick}
                    className="text-xs font-medium text-amber-600 hover:text-amber-700 mt-1.5 transition-colors"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted hover:text-foreground transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
