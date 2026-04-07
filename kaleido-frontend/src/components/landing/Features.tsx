"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  Image,
  CalendarClock,
  Share2,
  BarChart3,
  MessageSquare,
  Target,
  FileText,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getTranslations, isRTL } from "@/lib/i18n";

const icons = [
  Sparkles,
  Image,
  CalendarClock,
  Share2,
  BarChart3,
  MessageSquare,
  Target,
  FileText,
];

export default function Features() {
  const { locale } = useAppStore();
  const t = getTranslations(locale);
  const rtl = isRTL(locale);

  return (
    <section
      id="features"
      dir={rtl ? "rtl" : "ltr"}
      className="py-24 bg-section-alt"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold">
            {t.features.title}
          </h2>
          <p className="mt-4 text-lg text-muted">{t.features.subtitle}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.features.items.map((feature, i) => {
            const Icon = icons[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-6 hover:border-amber-500/30 transition-colors group"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
