"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, Globe } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getTranslations, isRTL, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const localeLabels: Record<Locale, string> = {
  en: "EN",
  no: "NO",
  ar: "\u0639\u0631",
};

export default function Navbar() {
  const { locale, setLocale, darkMode, toggleDarkMode } = useAppStore();
  const t = getTranslations(locale);
  const rtl = isRTL(locale);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const navLinks = [
    { label: t.nav.features, href: "#features" },
    { label: t.nav.howItWorks, href: "#how-it-works" },
    { label: t.nav.pricing, href: "#pricing" },
    { label: t.nav.faq, href: "#faq" },
  ];

  return (
    <nav
      dir={rtl ? "rtl" : "ltr"}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="text-xl font-bold gradient-text">Kaleido</span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted hover:text-foreground transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span>{localeLabels[locale]}</span>
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full mt-1 right-0 glass-card p-1 min-w-[80px]"
                  >
                    {(Object.keys(localeLabels) as Locale[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          setLocale(l);
                          setLangOpen(false);
                        }}
                        className={cn(
                          "block w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors",
                          locale === l
                            ? "bg-amber-500/10 text-amber-600"
                            : "hover:bg-amber-500/5"
                        )}
                      >
                        {localeLabels[l]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="rounded-lg p-2 text-muted hover:text-foreground transition-colors"
            >
              {darkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            <a
              href="/login"
              className="text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              {t.nav.login}
            </a>
            <a
              href="/register"
              className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
            >
              {t.nav.getStarted}
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-muted"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-glass-border overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm font-medium text-muted hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex items-center gap-3 pt-3 border-t border-card-border">
                {(Object.keys(localeLabels) as Locale[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setLocale(l);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "text-sm px-2 py-1 rounded",
                      locale === l
                        ? "bg-amber-500/10 text-amber-600"
                        : "text-muted"
                    )}
                  >
                    {localeLabels[l]}
                  </button>
                ))}
                <button
                  onClick={toggleDarkMode}
                  className="ml-auto p-2 text-muted"
                >
                  {darkMode ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>
              </div>
              <a
                href="/register"
                className="block text-center rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                {t.nav.getStarted}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
