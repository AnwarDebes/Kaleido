"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles, Gift, Globe2, Cpu } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getTranslations, isRTL } from "@/lib/i18n";

const statIcons = [
  { icon: Sparkles, key: "posts" as const },
  { icon: Gift, key: "users" as const },
  { icon: Globe2, key: "platforms" as const },
  { icon: Cpu, key: "time" as const },
];

export default function Hero() {
  const { locale } = useAppStore();
  const t = getTranslations(locale);
  const rtl = isRTL(locale);

  return (
    <section
      dir={rtl ? "rtl" : "ltr"}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
    >
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-amber-400/20 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-amber-500/15 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-amber-300/10 blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-600 ring-1 ring-amber-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              {t.hero.badge}
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-8 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight"
          >
            {t.hero.title}
            <br />
            <span className="gradient-text">{t.hero.titleHighlight}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted"
          >
            {t.hero.subtitle}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="/register"
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
            >
              {t.hero.cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold text-foreground glass hover:bg-amber-500/5 transition-colors"
            >
              <Play className="h-4 w-4 text-amber-500" />
              {t.hero.ctaSecondary}
            </a>
          </motion.div>

          {/* Animated Demo Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mx-auto mt-16 max-w-4xl"
          >
            <div className="glass-card p-2">
              <div className="rounded-lg bg-gradient-to-br from-stone-900 to-stone-800 p-6 sm:p-8">
                {/* Mock dashboard */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                  <span className="ml-3 text-xs text-stone-400 font-mono">
                    kaleido.app/dashboard
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Left panel - post editor */}
                  <div className="col-span-2 rounded-lg bg-stone-800/80 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded bg-amber-500/20 flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-amber-400" />
                      </div>
                      <span className="text-xs text-stone-300">
                        AI Content Generator
                      </span>
                    </div>
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1, duration: 0.5 }}
                    >
                      <div className="h-2.5 w-full rounded bg-stone-700" />
                      <div className="h-2.5 w-4/5 rounded bg-stone-700" />
                      <div className="h-2.5 w-3/5 rounded bg-amber-500/30" />
                    </motion.div>
                    <motion.div
                      className="mt-4 flex gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.3, duration: 0.5 }}
                    >
                      {["Instagram", "Twitter", "LinkedIn"].map((p) => (
                        <span
                          key={p}
                          className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] text-amber-400"
                        >
                          {p}
                        </span>
                      ))}
                    </motion.div>
                  </div>
                  {/* Right panel - analytics */}
                  <div className="rounded-lg bg-stone-800/80 p-4">
                    <span className="text-xs text-stone-400">Analytics</span>
                    <div className="mt-3 space-y-3">
                      {[70, 85, 55, 92].map((h, i) => (
                        <motion.div
                          key={i}
                          className="flex items-end gap-1"
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 1.5 + i * 0.15, duration: 0.4 }}
                          style={{ originY: 1 }}
                        >
                          <div
                            className="w-full rounded-sm bg-gradient-to-t from-amber-600 to-amber-400"
                            style={{ height: `${h * 0.4}px` }}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Honest highlights (no fake usage numbers) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mx-auto mt-16 grid max-w-3xl grid-cols-2 sm:grid-cols-4 gap-8"
          >
            {statIcons.map((stat) => (
              <div key={stat.key} className="text-center">
                <stat.icon className="mx-auto h-5 w-5 text-amber-500 mb-2" />
                <div className="text-2xl font-bold">{t.heroStats[stat.key]}</div>
                <div className="text-sm text-muted">{t.hero.stats[stat.key]}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
