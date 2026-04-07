"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getTranslations, isRTL } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export default function Pricing() {
  const { locale } = useAppStore();
  const t = getTranslations(locale);
  const rtl = isRTL(locale);
  const [yearly, setYearly] = useState(false);

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
          <h2 className="text-3xl sm:text-4xl font-bold">{t.pricing.title}</h2>
          <p className="mt-4 text-lg text-muted">{t.pricing.subtitle}</p>

          {/* Billing toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span
              className={cn(
                "text-sm font-medium",
                !yearly ? "text-foreground" : "text-muted"
              )}
            >
              {t.pricing.monthly}
            </span>
            <button
              onClick={() => setYearly(!yearly)}
              className={cn(
                "relative h-7 w-12 rounded-full transition-colors",
                yearly ? "bg-amber-500" : "bg-stone-300 dark:bg-stone-600"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                  yearly
                    ? rtl
                      ? "translate-x-[-22px] left-[26px]"
                      : "translate-x-[22px] left-0.5"
                    : rtl
                    ? "left-[26px]"
                    : "left-0.5"
                )}
              />
            </button>
            <span
              className={cn(
                "text-sm font-medium",
                yearly ? "text-foreground" : "text-muted"
              )}
            >
              {t.pricing.yearly}
            </span>
            {yearly && (
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                {t.pricing.yearlyDiscount}
              </span>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {t.pricing.plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "glass-card p-8 relative",
                plan.highlighted &&
                  "ring-2 ring-amber-500 shadow-xl shadow-amber-500/10 scale-105"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1 text-xs font-semibold text-white">
                  Popular
                </div>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">
                  ${yearly ? plan.yearlyPrice : plan.price}
                </span>
                <span className="text-muted">{t.pricing.perMonth}</span>
              </div>
              <a
                href="/register"
                className={cn(
                  "mt-6 block text-center rounded-full py-2.5 text-sm font-semibold transition-all",
                  plan.highlighted
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
                    : "bg-foreground/5 hover:bg-foreground/10 text-foreground"
                )}
              >
                {plan.cta}
              </a>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
