"use client";

import { useAppStore } from "@/lib/store";
import { getTranslations, isRTL } from "@/lib/i18n";

export default function Footer() {
  const { locale } = useAppStore();
  const t = getTranslations(locale);
  const rtl = isRTL(locale);

  const columns = [
    {
      title: t.footer.product,
      links: [
        { label: t.footer.links.features, href: "#features" },
        { label: t.footer.links.pricing, href: "#pricing" },
        { label: t.footer.links.integrations, href: "#" },
        { label: t.footer.links.changelog, href: "#" },
      ],
    },
    {
      title: t.footer.company,
      links: [
        { label: t.footer.links.about, href: "#" },
        { label: t.footer.links.blog, href: "#" },
        { label: t.footer.links.careers, href: "#" },
        { label: t.footer.links.contact, href: "#" },
      ],
    },
    {
      title: t.footer.legal,
      links: [
        { label: t.footer.links.privacy, href: "#" },
        { label: t.footer.links.terms, href: "#" },
        { label: t.footer.links.cookies, href: "#" },
      ],
    },
  ];

  return (
    <footer
      dir={rtl ? "rtl" : "ltr"}
      className="border-t border-card-border py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="text-xl font-bold gradient-text">Kaleido</span>
            </div>
            <p className="text-sm text-muted max-w-xs leading-relaxed">
              {t.footer.description}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-card-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} {t.footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
