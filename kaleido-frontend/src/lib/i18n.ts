export type Locale = "en" | "no" | "ar";

export const translations = {
  en: {
    nav: {
      features: "Features",
      howItWorks: "How It Works",
      pricing: "Pricing",
      faq: "FAQ",
      login: "Log In",
      getStarted: "Get Started Free",
    },
    hero: {
      badge: "AI-Powered Social Media Platform",
      title: "Create, Schedule & Grow",
      titleHighlight: "Your Social Presence",
      subtitle:
        "Kaleido uses AI to generate engaging content, stunning visuals, and smart scheduling — so you can focus on what matters.",
      cta: "Start Free Trial",
      ctaSecondary: "Watch Demo",
      stats: {
        posts: "Posts Generated",
        users: "Active Users",
        platforms: "Platforms",
        time: "Time Saved",
      },
    },
    features: {
      title: "Everything You Need",
      subtitle: "One platform to manage your entire social media presence",
      items: [
        {
          title: "AI Content Generation",
          description:
            "Generate platform-optimized posts with AI. Choose your tone, language, and style — get ready-to-publish content in seconds.",
        },
        {
          title: "Image & Video Creation",
          description:
            "Create stunning visuals with AI-powered image generation and carousel builder. No design skills needed.",
        },
        {
          title: "Smart Scheduling",
          description:
            "Schedule posts at optimal times for maximum engagement. Auto-queue and calendar view keep you organized.",
        },
        {
          title: "Multi-Platform Publishing",
          description:
            "Publish to Instagram, Twitter/X, LinkedIn, Facebook, TikTok, and more — all from one dashboard.",
        },
        {
          title: "Analytics Dashboard",
          description:
            "Track performance, growth, and engagement across all platforms. Discover your best posting times.",
        },
        {
          title: "AI Marketing Advisor",
          description:
            "Chat with your AI CMO for strategy advice, content ideas, and campaign planning tailored to your brand.",
        },
        {
          title: "Campaign Management",
          description:
            "Plan and execute multi-platform campaigns with AI-generated content plans and performance tracking.",
        },
        {
          title: "Blog & Newsletter",
          description:
            "Generate SEO-optimized blog posts and beautiful newsletters. Grow your audience beyond social media.",
        },
      ],
    },
    howItWorks: {
      title: "How It Works",
      subtitle: "Get started in three simple steps",
      steps: [
        {
          number: "01",
          title: "Connect Your Accounts",
          description:
            "Link your social media profiles and set up your brand voice in minutes.",
        },
        {
          number: "02",
          title: "Generate & Customize",
          description:
            "Use AI to create content, images, and carousels. Edit and refine to match your vision.",
        },
        {
          number: "03",
          title: "Schedule & Grow",
          description:
            "Set your publishing schedule and watch your engagement grow with data-driven insights.",
        },
      ],
    },
    pricing: {
      title: "Simple, Transparent Pricing",
      subtitle: "Start free. Scale as you grow.",
      monthly: "Monthly",
      yearly: "Yearly",
      yearlyDiscount: "Save 20%",
      perMonth: "/mo",
      plans: [
        {
          name: "Free",
          price: "0",
          yearlyPrice: "0",
          description: "Perfect for getting started",
          features: [
            "3 social accounts",
            "30 AI-generated posts/month",
            "5 AI images/month",
            "Basic analytics",
            "1 brand profile",
          ],
          cta: "Get Started",
          highlighted: false,
        },
        {
          name: "Pro",
          price: "1",
          yearlyPrice: "0.8",
          description: "For creators and small businesses",
          features: [
            "10 social accounts",
            "Unlimited AI posts",
            "50 AI images/month",
            "Advanced analytics",
            "5 brand profiles",
            "Campaign management",
            "AI Chat CMO",
            "Blog & newsletter",
            "Priority support",
          ],
          cta: "Start Free Trial",
          highlighted: true,
        },
        {
          name: "Business",
          price: "2.5",
          yearlyPrice: "2",
          description: "For teams and agencies",
          features: [
            "Unlimited social accounts",
            "Unlimited AI posts",
            "Unlimited AI images",
            "Full analytics suite",
            "Unlimited brands",
            "Team collaboration",
            "White-label reports",
            "API access",
            "Dedicated support",
          ],
          cta: "Contact Sales",
          highlighted: false,
        },
      ],
    },
    faq: {
      title: "Frequently Asked Questions",
      items: [
        {
          q: "What AI models does Kaleido use?",
          a: "Kaleido uses state-of-the-art open-source AI models for text and image generation. All processing happens on our secure servers — your data never leaves our infrastructure.",
        },
        {
          q: "Which social media platforms are supported?",
          a: "We support Instagram, Twitter/X, LinkedIn, Facebook, TikTok, YouTube, Pinterest, Reddit, and more. New platforms are added regularly.",
        },
        {
          q: "Can I try Kaleido for free?",
          a: "Yes! Our Free plan includes 30 AI-generated posts and 5 AI images per month with 3 social accounts. No credit card required.",
        },
        {
          q: "Is my data secure?",
          a: "Absolutely. We use AES-256 encryption for all sensitive data, secure OAuth for platform connections, and never share your data with third parties.",
        },
        {
          q: "Can I use Kaleido in my language?",
          a: "Kaleido supports content generation in multiple languages and the interface is available in English, Norwegian, and Arabic with more coming soon.",
        },
        {
          q: "Do I need design skills to use the image generator?",
          a: "Not at all. Simply describe what you want and our AI creates professional-quality images and carousels. You can customize colors, styles, and layouts.",
        },
      ],
    },
    footer: {
      description:
        "AI-powered social media management platform. Create, schedule, and grow your online presence.",
      product: "Product",
      company: "Company",
      legal: "Legal",
      links: {
        features: "Features",
        pricing: "Pricing",
        integrations: "Integrations",
        changelog: "Changelog",
        about: "About",
        blog: "Blog",
        careers: "Careers",
        contact: "Contact",
        privacy: "Privacy Policy",
        terms: "Terms of Service",
        cookies: "Cookie Policy",
      },
      copyright: "Kaleido. All rights reserved.",
    },
  },
  no: {
    nav: {
      features: "Funksjoner",
      howItWorks: "Slik Fungerer Det",
      pricing: "Priser",
      faq: "Sporsmal",
      login: "Logg Inn",
      getStarted: "Kom i Gang Gratis",
    },
    hero: {
      badge: "AI-Drevet Sosiale Medier Plattform",
      title: "Skap, Planlegg & Voks",
      titleHighlight: "Din Sosiale Tilstedevaerelse",
      subtitle:
        "Kaleido bruker AI til a generere engasjerende innhold, flotte bilder og smart planlegging — sa du kan fokusere pa det som betyr noe.",
      cta: "Start Gratis Proveperiode",
      ctaSecondary: "Se Demo",
      stats: {
        posts: "Innlegg Generert",
        users: "Aktive Brukere",
        platforms: "Plattformer",
        time: "Tid Spart",
      },
    },
    features: {
      title: "Alt Du Trenger",
      subtitle: "En plattform for a administrere hele din sosiale medier tilstedevaerelse",
      items: [
        {
          title: "AI Innholdsgenerering",
          description:
            "Generer plattformoptimaliserte innlegg med AI. Velg tone, sprak og stil — fa publiseringsklar innhold pa sekunder.",
        },
        {
          title: "Bilde- og Videoskaping",
          description:
            "Skap fantastiske bilder med AI-drevet bildegenerering og karusellbygger. Ingen designferdigheter nodvendig.",
        },
        {
          title: "Smart Planlegging",
          description:
            "Planlegg innlegg pa optimale tidspunkter for maksimalt engasjement. Automatisk ko og kalendervisning.",
        },
        {
          title: "Multi-Plattform Publisering",
          description:
            "Publiser til Instagram, Twitter/X, LinkedIn, Facebook, TikTok og mer — alt fra ett dashbord.",
        },
        {
          title: "Analyse Dashboard",
          description:
            "Spor ytelse, vekst og engasjement pa tvers av alle plattformer. Oppdag dine beste publiseringstider.",
        },
        {
          title: "AI Markedsforingsradgiver",
          description:
            "Chat med din AI CMO for strategirad, innholdsideer og kampanjeplanlegging tilpasset ditt merke.",
        },
        {
          title: "Kampanjestyring",
          description:
            "Planlegg og gjennomfor kampanjer pa tvers av plattformer med AI-genererte innholdsplaner.",
        },
        {
          title: "Blogg & Nyhetsbrev",
          description:
            "Generer SEO-optimaliserte blogginnlegg og vakre nyhetsbrev. Voks publikumet ditt utover sosiale medier.",
        },
      ],
    },
    howItWorks: {
      title: "Slik Fungerer Det",
      subtitle: "Kom i gang med tre enkle trinn",
      steps: [
        {
          number: "01",
          title: "Koble Til Kontoene Dine",
          description:
            "Koble til sosiale medieprofiler og sett opp merkevaren din pa minutter.",
        },
        {
          number: "02",
          title: "Generer & Tilpass",
          description:
            "Bruk AI til a lage innhold, bilder og karuseller. Rediger og finjuster etter din visjon.",
        },
        {
          number: "03",
          title: "Planlegg & Voks",
          description:
            "Sett publiseringsplanen din og se engasjementet vokse med datadrevne innsikter.",
        },
      ],
    },
    pricing: {
      title: "Enkel, Transparent Prising",
      subtitle: "Start gratis. Skaler etter behov.",
      monthly: "Manedlig",
      yearly: "Arlig",
      yearlyDiscount: "Spar 20%",
      perMonth: "/md",
      plans: [
        {
          name: "Gratis",
          price: "0",
          yearlyPrice: "0",
          description: "Perfekt for a komme i gang",
          features: [
            "3 sosiale kontoer",
            "30 AI-genererte innlegg/maned",
            "5 AI-bilder/maned",
            "Grunnleggende analyse",
            "1 merkeprofil",
          ],
          cta: "Kom i Gang",
          highlighted: false,
        },
        {
          name: "Pro",
          price: "10",
          yearlyPrice: "8",
          description: "For skapere og smabedrifter",
          features: [
            "10 sosiale kontoer",
            "Ubegrenset AI-innlegg",
            "50 AI-bilder/maned",
            "Avansert analyse",
            "5 merkeprofiler",
            "Kampanjestyring",
            "AI Chat CMO",
            "Blogg & nyhetsbrev",
            "Prioritert stotte",
          ],
          cta: "Start Gratis Proveperiode",
          highlighted: true,
        },
        {
          name: "Bedrift",
          price: "25",
          yearlyPrice: "20",
          description: "For team og byraer",
          features: [
            "Ubegrensede sosiale kontoer",
            "Ubegrenset AI-innlegg",
            "Ubegrensede AI-bilder",
            "Full analysepakke",
            "Ubegrensede merker",
            "Teamsamarbeid",
            "White-label rapporter",
            "API-tilgang",
            "Dedikert stotte",
          ],
          cta: "Kontakt Salg",
          highlighted: false,
        },
      ],
    },
    faq: {
      title: "Ofte Stilte Sporsmal",
      items: [
        {
          q: "Hvilke AI-modeller bruker Kaleido?",
          a: "Kaleido bruker toppmoderne open-source AI-modeller for tekst- og bildegenerering. All behandling skjer pa vare sikre servere.",
        },
        {
          q: "Hvilke sosiale medieplattformer stttes?",
          a: "Vi stotter Instagram, Twitter/X, LinkedIn, Facebook, TikTok, YouTube, Pinterest, Reddit og flere.",
        },
        {
          q: "Kan jeg prove Kaleido gratis?",
          a: "Ja! Gratisplanen inkluderer 30 AI-genererte innlegg og 5 AI-bilder per maned med 3 sosiale kontoer.",
        },
        {
          q: "Er dataene mine sikre?",
          a: "Absolutt. Vi bruker AES-256-kryptering for alle sensitive data og sikker OAuth for plattformtilkoblinger.",
        },
        {
          q: "Kan jeg bruke Kaleido pa mitt sprak?",
          a: "Kaleido stotter innholdsgenerering pa flere sprak, og grensesnittet er tilgjengelig pa engelsk, norsk og arabisk.",
        },
        {
          q: "Trenger jeg designferdigheter for a bruke bildegeneratoren?",
          a: "Ikke i det hele tatt. Beskriv bare hva du onsker, sa lager AI-en profesjonelle bilder og karuseller.",
        },
      ],
    },
    footer: {
      description:
        "AI-drevet plattform for administrasjon av sosiale medier. Skap, planlegg og voks din tilstedevaerelse pa nett.",
      product: "Produkt",
      company: "Selskap",
      legal: "Juridisk",
      links: {
        features: "Funksjoner",
        pricing: "Priser",
        integrations: "Integrasjoner",
        changelog: "Endringslogg",
        about: "Om Oss",
        blog: "Blogg",
        careers: "Karriere",
        contact: "Kontakt",
        privacy: "Personvernerklaering",
        terms: "Vilkar for Bruk",
        cookies: "Informasjonskapsler",
      },
      copyright: "Kaleido. Alle rettigheter reservert.",
    },
  },
  ar: {
    nav: {
      features: "\u0627\u0644\u0645\u064a\u0632\u0627\u062a",
      howItWorks: "\u0643\u064a\u0641 \u064a\u0639\u0645\u0644",
      pricing: "\u0627\u0644\u0623\u0633\u0639\u0627\u0631",
      faq: "\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629",
      login: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644",
      getStarted: "\u0627\u0628\u062f\u0623 \u0645\u062c\u0627\u0646\u0627\u064b",
    },
    hero: {
      badge: "\u0645\u0646\u0635\u0629 \u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a",
      title: "\u0623\u0646\u0634\u0626\u060c \u062c\u062f\u0648\u0644 \u0648 \u0627\u0646\u0645\u0648",
      titleHighlight: "\u062a\u0648\u0627\u062c\u062f\u0643 \u0627\u0644\u0631\u0642\u0645\u064a",
      subtitle:
        "\u064a\u0633\u062a\u062e\u062f\u0645 \u0643\u0627\u0644\u064a\u062f\u0648 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0644\u0625\u0646\u0634\u0627\u0621 \u0645\u062d\u062a\u0648\u0649 \u062c\u0630\u0627\u0628 \u0648\u0635\u0648\u0631 \u0645\u0630\u0647\u0644\u0629 \u0648\u062c\u062f\u0648\u0644\u0629 \u0630\u0643\u064a\u0629 — \u0644\u062a\u062a\u0645\u0643\u0646 \u0645\u0646 \u0627\u0644\u062a\u0631\u0643\u064a\u0632 \u0639\u0644\u0649 \u0645\u0627 \u064a\u0647\u0645.",
      cta: "\u0627\u0628\u062f\u0623 \u0627\u0644\u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u0645\u062c\u0627\u0646\u064a\u0629",
      ctaSecondary: "\u0634\u0627\u0647\u062f \u0627\u0644\u0639\u0631\u0636",
      stats: {
        posts: "\u0645\u0646\u0634\u0648\u0631 \u062a\u0645 \u0625\u0646\u0634\u0627\u0624\u0647",
        users: "\u0645\u0633\u062a\u062e\u062f\u0645 \u0646\u0634\u0637",
        platforms: "\u0645\u0646\u0635\u0629",
        time: "\u0648\u0642\u062a \u0645\u0648\u0641\u0631",
      },
    },
    features: {
      title: "\u0643\u0644 \u0645\u0627 \u062a\u062d\u062a\u0627\u062c\u0647",
      subtitle: "\u0645\u0646\u0635\u0629 \u0648\u0627\u062d\u062f\u0629 \u0644\u0625\u062f\u0627\u0631\u0629 \u0643\u0627\u0645\u0644 \u062a\u0648\u0627\u062c\u062f\u0643 \u0639\u0644\u0649 \u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u062a\u0648\u0627\u0635\u0644",
      items: [
        {
          title: "\u0625\u0646\u0634\u0627\u0621 \u0645\u062d\u062a\u0648\u0649 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a",
          description: "\u0623\u0646\u0634\u0626 \u0645\u0646\u0634\u0648\u0631\u0627\u062a \u0645\u062d\u0633\u0646\u0629 \u0644\u0643\u0644 \u0645\u0646\u0635\u0629 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a. \u0627\u062e\u062a\u0631 \u0627\u0644\u0646\u0628\u0631\u0629 \u0648\u0627\u0644\u0644\u063a\u0629 \u0648\u0627\u0644\u0623\u0633\u0644\u0648\u0628.",
        },
        {
          title: "\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0635\u0648\u0631 \u0648\u0627\u0644\u0641\u064a\u062f\u064a\u0648",
          description: "\u0623\u0646\u0634\u0626 \u0635\u0648\u0631\u0627\u064b \u0645\u0630\u0647\u0644\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0648\u0645\u0646\u0634\u0626 \u0627\u0644\u0643\u0627\u0631\u0648\u0633\u064a\u0644. \u0644\u0627 \u062d\u0627\u062c\u0629 \u0644\u0645\u0647\u0627\u0631\u0627\u062a \u0627\u0644\u062a\u0635\u0645\u064a\u0645.",
        },
        {
          title: "\u062c\u062f\u0648\u0644\u0629 \u0630\u0643\u064a\u0629",
          description: "\u062c\u062f\u0648\u0644 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062a \u0641\u064a \u0627\u0644\u0623\u0648\u0642\u0627\u062a \u0627\u0644\u0645\u062b\u0627\u0644\u064a\u0629 \u0644\u0623\u0642\u0635\u0649 \u062a\u0641\u0627\u0639\u0644. \u0642\u0627\u0626\u0645\u0629 \u0627\u0646\u062a\u0638\u0627\u0631 \u062a\u0644\u0642\u0627\u0626\u064a\u0629 \u0648\u0639\u0631\u0636 \u062a\u0642\u0648\u064a\u0645.",
        },
        {
          title: "\u0646\u0634\u0631 \u0645\u062a\u0639\u062f\u062f \u0627\u0644\u0645\u0646\u0635\u0627\u062a",
          description: "\u0627\u0646\u0634\u0631 \u0639\u0644\u0649 \u0625\u0646\u0633\u062a\u063a\u0631\u0627\u0645 \u0648\u062a\u0648\u064a\u062a\u0631 \u0648\u0644\u064a\u0646\u0643\u062f\u0625\u0646 \u0648\u0641\u064a\u0633\u0628\u0648\u0643 \u0648\u062a\u064a\u0643\u062a\u0648\u0643 — \u0643\u0644\u0647\u0627 \u0645\u0646 \u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645 \u0648\u0627\u062d\u062f\u0629.",
        },
        {
          title: "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a",
          description: "\u062a\u0627\u0628\u0639 \u0627\u0644\u0623\u062f\u0627\u0621 \u0648\u0627\u0644\u0646\u0645\u0648 \u0648\u0627\u0644\u062a\u0641\u0627\u0639\u0644 \u0639\u0628\u0631 \u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0646\u0635\u0627\u062a. \u0627\u0643\u062a\u0634\u0641 \u0623\u0641\u0636\u0644 \u0623\u0648\u0642\u0627\u062a \u0627\u0644\u0646\u0634\u0631.",
        },
        {
          title: "\u0645\u0633\u062a\u0634\u0627\u0631 \u0627\u0644\u062a\u0633\u0648\u064a\u0642 \u0627\u0644\u0630\u0643\u064a",
          description: "\u062a\u062d\u062f\u062b \u0645\u0639 \u0645\u062f\u064a\u0631 \u0627\u0644\u062a\u0633\u0648\u064a\u0642 \u0627\u0644\u0630\u0643\u064a \u0644\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0646\u0635\u0627\u0626\u062d \u0627\u0633\u062a\u0631\u0627\u062a\u064a\u062c\u064a\u0629 \u0648\u0623\u0641\u0643\u0627\u0631 \u0645\u062d\u062a\u0648\u0649.",
        },
        {
          title: "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062d\u0645\u0644\u0627\u062a",
          description: "\u062e\u0637\u0637 \u0648\u0646\u0641\u0630 \u062d\u0645\u0644\u0627\u062a \u0639\u0628\u0631 \u0645\u0646\u0635\u0627\u062a \u0645\u062a\u0639\u062f\u062f\u0629 \u0645\u0639 \u062e\u0637\u0637 \u0645\u062d\u062a\u0648\u0649 \u0645\u0648\u0644\u062f\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a.",
        },
        {
          title: "\u0645\u062f\u0648\u0646\u0629 \u0648\u0646\u0634\u0631\u0629 \u0625\u062e\u0628\u0627\u0631\u064a\u0629",
          description: "\u0623\u0646\u0634\u0626 \u0645\u0642\u0627\u0644\u0627\u062a \u0645\u062d\u0633\u0646\u0629 \u0644\u0645\u062d\u0631\u0643\u0627\u062a \u0627\u0644\u0628\u062d\u062b \u0648\u0646\u0634\u0631\u0627\u062a \u0625\u062e\u0628\u0627\u0631\u064a\u0629 \u062c\u0645\u064a\u0644\u0629.",
        },
      ],
    },
    howItWorks: {
      title: "\u0643\u064a\u0641 \u064a\u0639\u0645\u0644",
      subtitle: "\u0627\u0628\u062f\u0623 \u0641\u064a \u062b\u0644\u0627\u062b \u062e\u0637\u0648\u0627\u062a \u0628\u0633\u064a\u0637\u0629",
      steps: [
        {
          number: "\u0660\u0661",
          title: "\u0627\u0631\u0628\u0637 \u062d\u0633\u0627\u0628\u0627\u062a\u0643",
          description: "\u0627\u0631\u0628\u0637 \u0645\u0644\u0641\u0627\u062a\u0643 \u0639\u0644\u0649 \u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0648\u0623\u0639\u062f \u0635\u0648\u062a \u0639\u0644\u0627\u0645\u062a\u0643 \u0627\u0644\u062a\u062c\u0627\u0631\u064a\u0629 \u0641\u064a \u062f\u0642\u0627\u0626\u0642.",
        },
        {
          number: "\u0660\u0662",
          title: "\u0623\u0646\u0634\u0626 \u0648\u062e\u0635\u0635",
          description: "\u0627\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0644\u0625\u0646\u0634\u0627\u0621 \u0645\u062d\u062a\u0648\u0649 \u0648\u0635\u0648\u0631 \u0648\u0643\u0627\u0631\u0648\u0633\u064a\u0644. \u0639\u062f\u0644 \u0648\u062d\u0633\u0646 \u062d\u0633\u0628 \u0631\u0624\u064a\u062a\u0643.",
        },
        {
          number: "\u0660\u0663",
          title: "\u062c\u062f\u0648\u0644 \u0648\u0627\u0646\u0645\u0648",
          description: "\u062d\u062f\u062f \u062c\u062f\u0648\u0644 \u0627\u0644\u0646\u0634\u0631 \u0648\u0634\u0627\u0647\u062f \u062a\u0641\u0627\u0639\u0644\u0643 \u064a\u0646\u0645\u0648 \u0645\u0639 \u0631\u0624\u0649 \u0645\u0628\u0646\u064a\u0629 \u0639\u0644\u0649 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.",
        },
      ],
    },
    pricing: {
      title: "\u0623\u0633\u0639\u0627\u0631 \u0628\u0633\u064a\u0637\u0629 \u0648\u0634\u0641\u0627\u0641\u0629",
      subtitle: "\u0627\u0628\u062f\u0623 \u0645\u062c\u0627\u0646\u0627\u064b. \u062a\u0648\u0633\u0639 \u0645\u0639 \u0646\u0645\u0648\u0643.",
      monthly: "\u0634\u0647\u0631\u064a",
      yearly: "\u0633\u0646\u0648\u064a",
      yearlyDiscount: "\u0648\u0641\u0631 20%",
      perMonth: "/\u0634\u0647\u0631",
      plans: [
        {
          name: "\u0645\u062c\u0627\u0646\u064a",
          price: "0",
          yearlyPrice: "0",
          description: "\u0645\u062b\u0627\u0644\u064a \u0644\u0644\u0628\u062f\u0627\u064a\u0629",
          features: [
            "3 \u062d\u0633\u0627\u0628\u0627\u062a \u0627\u062c\u062a\u0645\u0627\u0639\u064a\u0629",
            "30 \u0645\u0646\u0634\u0648\u0631 AI/\u0634\u0647\u0631",
            "5 \u0635\u0648\u0631 AI/\u0634\u0647\u0631",
            "\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0623\u0633\u0627\u0633\u064a\u0629",
            "\u0645\u0644\u0641 \u0639\u0644\u0627\u0645\u0629 \u062a\u062c\u0627\u0631\u064a\u0629 \u0648\u0627\u062d\u062f",
          ],
          cta: "\u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646",
          highlighted: false,
        },
        {
          name: "\u0628\u0631\u0648",
          price: "1",
          yearlyPrice: "0.8",
          description: "\u0644\u0644\u0645\u0628\u062f\u0639\u064a\u0646 \u0648\u0627\u0644\u0634\u0631\u0643\u0627\u062a \u0627\u0644\u0635\u063a\u064a\u0631\u0629",
          features: [
            "10 \u062d\u0633\u0627\u0628\u0627\u062a \u0627\u062c\u062a\u0645\u0627\u0639\u064a\u0629",
            "\u0645\u0646\u0634\u0648\u0631\u0627\u062a AI \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f\u0629",
            "50 \u0635\u0648\u0631\u0629 AI/\u0634\u0647\u0631",
            "\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0645\u062a\u0642\u062f\u0645\u0629",
            "5 \u0645\u0644\u0641\u0627\u062a \u0639\u0644\u0627\u0645\u0629 \u062a\u062c\u0627\u0631\u064a\u0629",
            "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062d\u0645\u0644\u0627\u062a",
            "AI Chat CMO",
            "\u0645\u062f\u0648\u0646\u0629 \u0648\u0646\u0634\u0631\u0629 \u0625\u062e\u0628\u0627\u0631\u064a\u0629",
            "\u062f\u0639\u0645 \u0623\u0648\u0644\u0648\u064a",
          ],
          cta: "\u0627\u0628\u062f\u0623 \u0627\u0644\u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u0645\u062c\u0627\u0646\u064a\u0629",
          highlighted: true,
        },
        {
          name: "\u0623\u0639\u0645\u0627\u0644",
          price: "2.5",
          yearlyPrice: "2",
          description: "\u0644\u0644\u0641\u0631\u0642 \u0648\u0627\u0644\u0648\u0643\u0627\u0644\u0627\u062a",
          features: [
            "\u062d\u0633\u0627\u0628\u0627\u062a \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f\u0629",
            "\u0645\u0646\u0634\u0648\u0631\u0627\u062a AI \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f\u0629",
            "\u0635\u0648\u0631 AI \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f\u0629",
            "\u062d\u0632\u0645\u0629 \u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0643\u0627\u0645\u0644\u0629",
            "\u0639\u0644\u0627\u0645\u0627\u062a \u062a\u062c\u0627\u0631\u064a\u0629 \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f\u0629",
            "\u062a\u0639\u0627\u0648\u0646 \u0627\u0644\u0641\u0631\u064a\u0642",
            "\u062a\u0642\u0627\u0631\u064a\u0631 \u0628\u0627\u0644\u0639\u0644\u0627\u0645\u0629 \u0627\u0644\u0628\u064a\u0636\u0627\u0621",
            "\u0648\u0635\u0648\u0644 API",
            "\u062f\u0639\u0645 \u0645\u062e\u0635\u0635",
          ],
          cta: "\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a",
          highlighted: false,
        },
      ],
    },
    faq: {
      title: "\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629",
      items: [
        {
          q: "\u0645\u0627 \u0646\u0645\u0627\u0630\u062c \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0627\u0644\u062a\u064a \u064a\u0633\u062a\u062e\u062f\u0645\u0647\u0627 \u0643\u0627\u0644\u064a\u062f\u0648\u061f",
          a: "\u064a\u0633\u062a\u062e\u062f\u0645 \u0643\u0627\u0644\u064a\u062f\u0648 \u0646\u0645\u0627\u0630\u062c \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0645\u0641\u062a\u0648\u062d\u0629 \u0627\u0644\u0645\u0635\u062f\u0631 \u0644\u062a\u0648\u0644\u064a\u062f \u0627\u0644\u0646\u0635\u0648\u0635 \u0648\u0627\u0644\u0635\u0648\u0631. \u0643\u0644 \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629 \u062a\u062a\u0645 \u0639\u0644\u0649 \u062e\u0648\u0627\u062f\u0645\u0646\u0627 \u0627\u0644\u0622\u0645\u0646\u0629.",
        },
        {
          q: "\u0645\u0627 \u0645\u0646\u0635\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0627\u0644\u0645\u062f\u0639\u0648\u0645\u0629\u061f",
          a: "\u0646\u062f\u0639\u0645 \u0625\u0646\u0633\u062a\u063a\u0631\u0627\u0645 \u0648\u062a\u0648\u064a\u062a\u0631 \u0648\u0644\u064a\u0646\u0643\u062f\u0625\u0646 \u0648\u0641\u064a\u0633\u0628\u0648\u0643 \u0648\u062a\u064a\u0643\u062a\u0648\u0643 \u0648\u064a\u0648\u062a\u064a\u0648\u0628 \u0648\u0628\u0646\u062a\u0631\u0633\u062a \u0648\u0631\u064a\u062f\u062a \u0648\u0627\u0644\u0645\u0632\u064a\u062f.",
        },
        {
          q: "\u0647\u0644 \u064a\u0645\u0643\u0646\u0646\u064a \u062a\u062c\u0631\u0628\u0629 \u0643\u0627\u0644\u064a\u062f\u0648 \u0645\u062c\u0627\u0646\u0627\u064b\u061f",
          a: "\u0646\u0639\u0645! \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u0645\u062c\u0627\u0646\u064a\u0629 \u062a\u0634\u0645\u0644 30 \u0645\u0646\u0634\u0648\u0631\u0627\u064b \u0648 5 \u0635\u0648\u0631 \u0634\u0647\u0631\u064a\u0627\u064b \u0645\u0639 3 \u062d\u0633\u0627\u0628\u0627\u062a. \u0644\u0627 \u062d\u0627\u062c\u0629 \u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0626\u062a\u0645\u0627\u0646.",
        },
        {
          q: "\u0647\u0644 \u0628\u064a\u0627\u0646\u0627\u062a\u064a \u0622\u0645\u0646\u0629\u061f",
          a: "\u0628\u0627\u0644\u062a\u0623\u0643\u064a\u062f. \u0646\u0633\u062a\u062e\u062f\u0645 \u062a\u0634\u0641\u064a\u0631 AES-256 \u0644\u062c\u0645\u064a\u0639 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0633\u0629 \u0648OAuth \u0622\u0645\u0646 \u0644\u0631\u0628\u0637 \u0627\u0644\u0645\u0646\u0635\u0627\u062a.",
        },
        {
          q: "\u0647\u0644 \u064a\u0645\u0643\u0646\u0646\u064a \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0643\u0627\u0644\u064a\u062f\u0648 \u0628\u0644\u063a\u062a\u064a\u061f",
          a: "\u064a\u062f\u0639\u0645 \u0643\u0627\u0644\u064a\u062f\u0648 \u062a\u0648\u0644\u064a\u062f \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0628\u0639\u062f\u0629 \u0644\u063a\u0627\u062a \u0648\u0627\u0644\u0648\u0627\u062c\u0647\u0629 \u0645\u062a\u0627\u062d\u0629 \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 \u0648\u0627\u0644\u0646\u0631\u0648\u064a\u062c\u064a\u0629 \u0648\u0627\u0644\u0639\u0631\u0628\u064a\u0629.",
        },
        {
          q: "\u0647\u0644 \u0623\u062d\u062a\u0627\u062c \u0645\u0647\u0627\u0631\u0627\u062a \u062a\u0635\u0645\u064a\u0645\u061f",
          a: "\u0644\u0627 \u0639\u0644\u0649 \u0627\u0644\u0625\u0637\u0644\u0627\u0642. \u0635\u0641 \u0645\u0627 \u062a\u0631\u064a\u062f \u0648\u0633\u064a\u0646\u0634\u0626 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0635\u0648\u0631\u0627\u064b \u0648\u0643\u0627\u0631\u0648\u0633\u064a\u0644\u0627\u062a \u0627\u062d\u062a\u0631\u0627\u0641\u064a\u0629.",
        },
      ],
    },
    footer: {
      description: "\u0645\u0646\u0635\u0629 \u0625\u062f\u0627\u0631\u0629 \u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a. \u0623\u0646\u0634\u0626 \u0648\u062c\u062f\u0648\u0644 \u0648\u0627\u0646\u0645\u0648 \u062a\u0648\u0627\u062c\u062f\u0643 \u0639\u0644\u0649 \u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a.",
      product: "\u0627\u0644\u0645\u0646\u062a\u062c",
      company: "\u0627\u0644\u0634\u0631\u0643\u0629",
      legal: "\u0642\u0627\u0646\u0648\u0646\u064a",
      links: {
        features: "\u0627\u0644\u0645\u064a\u0632\u0627\u062a",
        pricing: "\u0627\u0644\u0623\u0633\u0639\u0627\u0631",
        integrations: "\u0627\u0644\u062a\u0643\u0627\u0645\u0644\u0627\u062a",
        changelog: "\u0633\u062c\u0644 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a",
        about: "\u0639\u0646\u0627",
        blog: "\u0627\u0644\u0645\u062f\u0648\u0646\u0629",
        careers: "\u0627\u0644\u0648\u0638\u0627\u0626\u0641",
        contact: "\u0627\u062a\u0635\u0644 \u0628\u0646\u0627",
        privacy: "\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629",
        terms: "\u0634\u0631\u0648\u0637 \u0627\u0644\u062e\u062f\u0645\u0629",
        cookies: "\u0633\u064a\u0627\u0633\u0629 \u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637",
      },
      copyright: "\u0643\u0627\u0644\u064a\u062f\u0648. \u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629.",
    },
  },
} as const;

export type Translations = (typeof translations)["en"];

export function getTranslations(locale: Locale): Translations {
  return translations[locale] as Translations;
}

export function isRTL(locale: Locale): boolean {
  return locale === "ar";
}
