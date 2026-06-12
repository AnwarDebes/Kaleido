"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, LogOut, User, ChevronDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/cn";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/posts": "Posts",
  "/dashboard/repurpose": "Repurpose Studio",
  "/dashboard/planner": "Week Planner",
  "/dashboard/schedule": "Schedule",
  "/dashboard/media": "Media",
  "/dashboard/campaigns": "Campaigns",
  "/dashboard/analytics": "Analytics",
  "/dashboard/chat": "AI Chat",
  "/dashboard/blog": "Blog",
  "/dashboard/newsletters": "Newsletters",
  "/dashboard/brands": "Brands",
  "/dashboard/connections": "Connections",
  "/dashboard/settings": "Settings",
};

export default function Topbar() {
  const pathname = usePathname();
  const { darkMode, toggleDarkMode } = useAppStore();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle =
    pageTitles[pathname] ||
    pathname
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/-/g, " ")
      ?.replace(/^\w/, (c) => c.toUpperCase()) ||
    "Dashboard";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-glass-border bg-glass-bg/50 px-6 backdrop-blur-md">
      {/* Page title - offset on mobile to avoid hamburger overlap */}
      <div className="pl-12 lg:pl-0 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          Beta
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="rounded-lg p-2 text-foreground/60 transition-colors hover:bg-amber-500/10 hover:text-foreground"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
              "hover:bg-amber-500/10",
              dropdownOpen && "bg-amber-500/10",
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-semibold text-white">
              {initials}
            </div>
            <span className="hidden text-sm font-medium text-foreground sm:block">
              {user?.full_name || "User"}
            </span>
            <ChevronDown
              className={cn(
                "hidden h-4 w-4 text-foreground/50 transition-transform sm:block",
                dropdownOpen && "rotate-180",
              )}
            />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl glass-card shadow-lg"
              >
                <div className="border-b border-glass-border px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    {user?.full_name || "User"}
                  </p>
                  <p className="text-xs text-muted">{user?.email || ""}</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
