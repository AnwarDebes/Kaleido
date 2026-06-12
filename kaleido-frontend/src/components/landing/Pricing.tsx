"use client";

import { motion } from "framer-motion";
import { Check, Heart } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getTranslations, isRTL } from "@/lib/i18n";

export default function Pricing() {
  const { locale } = useAppStore();
  const t = getTranslations(locale);
  const rtl = isRTL(locale);

  return (
    <section
      id="pricing"
      dir={rtl ? "rtl" : "ltr"}
      className="py-24 bg-section-alt"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-amber-500/25">
            <Heart className="h-3.5 w-3.5" />
            {t.pricing.badge}
          </span>
          <h2 className="mt-6 text-3xl sm:text-4xl font-bold">{t.pricing.title}</h2>
          <p className="mt-4 text-lg text-muted max-w-2xl mx-auto">{t.pricing.subtitle}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 sm:p-10 max-w-2xl mx-auto ring-2 ring-amber-500 shadow-xl shadow-amber-500/10"
        >
          <h3 className="text-xl font-bold">{t.pricing.cardTitle}</h3>
          <p className="mt-1 text-sm text-muted">{t.pricing.cardDescription}</p>

          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {t.pricing.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Check className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <a
            href="/register"
            className="mt-10 block text-center rounded-full bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
          >
            {t.pricing.cta}
          </a>

          <p className="mt-6 text-center text-sm text-muted">{t.pricing.note}</p>
        </motion.div>
      </div>
    </section>
  );
}
