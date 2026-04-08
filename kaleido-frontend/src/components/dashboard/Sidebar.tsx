"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Image,
  Target,
  BarChart3,
  MessageSquare,
  BookOpen,
  Mail,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Posts", href: "/dashboard/posts", icon: FileText },
  { label: "Schedule", href: "/dashboard/schedule", icon: Calendar },
  { label: "Media", href: "/dashboard/media", icon: Image },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: Target },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "AI Chat", href: "/dashboard/chat", icon: MessageSquare },
  { label: "Blog", href: "/dashboard/blog", icon: BookOpen },
  { label: "Newsletters", href: "/dashboard/newsletters", icon: Mail },
  { label: "Brands", href: "/dashboard/brands", icon: Building2 },
];

const bottomNavItems: NavItem[] = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

function NavLink({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        "hover:bg-amber-500/10",
        isActive
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          : "text-foreground/70 hover:text-foreground",
        collapsed && "justify-center px-2",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          isActive && "text-amber-500",
        )}
      />
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          className="truncate"
        >
          {item.label}
        </motion.span>
      )}
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 h-8 w-1 rounded-r-full bg-amber-500"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
    </Link>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-5",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 font-bold text-white text-lg shadow-lg shadow-amber-500/25">
          K
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="gradient-text text-xl font-bold"
          >
            Kaleido
          </motion.span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {mainNavItems.map((item) => (
          <div key={item.href} className="relative">
            <NavLink
              item={item}
              collapsed={collapsed}
              isActive={isActive(item.href)}
            />
          </div>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-glass-border px-3 py-3">
        {bottomNavItems.map((item) => (
          <div key={item.href} className="relative">
            <NavLink
              item={item}
              collapsed={collapsed}
              isActive={isActive(item.href)}
            />
          </div>
        ))}
      </div>

      {/* Collapse toggle - desktop only */}
      <div className="hidden border-t border-glass-border px-3 py-3 lg:block">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-foreground/50 transition-colors hover:bg-amber-500/10 hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg p-2 glass lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] glass lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 rounded-lg p-1.5 text-foreground/50 hover:text-foreground"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden h-screen shrink-0 overflow-hidden border-r border-glass-border bg-glass-bg backdrop-blur-xl lg:block"
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
