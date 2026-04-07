"use client";

import { motion } from "framer-motion";
import { LinkIcon, Wand2, Rocket } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getTranslations, isRTL } from "@/lib/i18n";

const stepIcons = [LinkIcon, Wand2, Rocket];

export default function HowItWorks() {
  const { locale } = useAppStore();
  const t = getTranslations(locale);
  const rtl = isRTL(locale);

  return (
    <section id="how-it-works" dir={rtl ? "rtl" : "ltr"} className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold">
            {t.howItWorks.title}
          </h2>
          <p className="mt-4 text-lg text-muted">{t.howItWorks.subtitle}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-20 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-amber-500/0 via-amber-500/30 to-amber-500/0" />

          {t.howItWorks.steps.map((step, i) => {
            const Icon = stepIcons[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative text-center"
              >
                {/* Step number */}
                <div className="mx-auto mb-6 relative">
                  <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
