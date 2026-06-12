export type Locale = "en" | "no" | "ar";

export const translations = {
  en: {
    nav: {
      features: "Features",
      howItWorks: "How It Works",
      pricing: "Free",
      faq: "FAQ",
      login: "Log In",
      getStarted: "Get Started Free",
    },
    hero: {
      badge: "Open beta, free for everyone",
      title: "Create, Schedule & Grow",
      titleHighlight: "Your Social Presence",
      subtitle: "Kaleido uses AI to create posts, images, videos and entire campaigns. Download, copy or share everything you make on any platform you like. Free for everyone.",
      cta: "Create Free Account",
      ctaSecondary: "See How It Works",
      stats: {
        posts: "Post Types",
        users: "Always Free",
        platforms: "Platforms",
        time: "On-Device AI",
      },
    },
    heroStats: {
      posts: "13+",
      users: "100%",
      platforms: "14",
      time: "Local",
    },
    features: {
      title: "Everything You Need",
      subtitle: "One platform to manage your entire social media presence",
      items: [
        {
          title: "AI Content Generation",
          description: "Generate platform-optimized posts with AI. Choose your tone, language and style, and get ready-to-publish content in seconds.",
        },
        {
          title: "Image & Video Creation",
          description: "Create stunning visuals with AI image generation and the carousel builder. No design skills needed.",
        },
        {
          title: "Smart Scheduling",
          description: "Schedule posts at optimal times for maximum engagement. Auto-queue and calendar view keep you organized.",
        },
        {
          title: "Share to Any Platform",
          description: "Create your content once, then download or copy it and post it yourself on Instagram, Twitter/X, LinkedIn, Facebook, TikTok and more. Direct publishing unlocks for each platform as its app review is approved.",
        },
        {
          title: "Analytics Dashboard",
          description: "Track performance, growth, and engagement across all platforms. Discover your best posting times.",
        },
        {
          title: "AI Marketing Advisor",
          description: "Chat with your AI CMO for strategy advice, content ideas, and campaign planning tailored to your brand.",
        },
        {
          title: "Campaign Management",
          description: "Plan and execute multi-platform campaigns with AI-generated content plans and performance tracking.",
        },
        {
          title: "Blog & Newsletter",
          description: "Generate SEO-optimized blog posts and beautiful newsletters. Grow your audience beyond social media.",
        },
      ],
    },
    howItWorks: {
      title: "How It Works",
      subtitle: "Get started in three simple steps",
      steps: [
        {
          number: "01",
          title: "Set Up Your Brand",
          description: "Tell Kaleido about your brand, tone and audience in minutes. You can start creating without connecting any social account.",
        },
        {
          number: "02",
          title: "Generate & Customize",
          description: "Use AI to create content, images, and carousels. Edit and refine to match your vision.",
        },
        {
          number: "03",
          title: "Download, Share & Grow",
          description: "Export or copy your finished content and post it wherever you like. Scheduling and reminders keep you consistent.",
        },
      ],
    },
    pricing: {
      title: "Completely Free",
      subtitle: "Kaleido is free for everyone. Every feature included, no credit card, no paid plans.",
      badge: "Free for everyone",
      cardTitle: "Everything included",
      cardDescription: "One plan: free. Every account gets all of this:",
      features: [
        "Unlimited AI-generated posts, captions and hashtags",
        "AI image generation (SDXL-Lightning, on our own server)",
        "AI video generation (Wan 2.1, on our own server)",
        "Carousel builder, blog and newsletter generator",
        "Smart scheduling with calendar view",
        "Download or copy everything you create",
        "One-click share links for every major platform",
        "AI marketing chat assistant",
        "Analytics for posts published through connected accounts",
      ],
      cta: "Create Free Account",
      note: "Kaleido is built to help people create, not to take money from them.",
    },
    faq: {
      title: "Frequently Asked Questions",
      items: [
        {
          q: "Is Kaleido really free?",
          a: "Yes. Kaleido is completely free for everyone. Every feature is included, we never ask for a credit card, and there are no paid tiers.",
        },
        {
          q: "What AI models does Kaleido use?",
          a: "Text generation runs on Gemma 4 via Ollama. Images come from SDXL-Lightning and videos from Wan 2.1, both generated on our own GPU server. Your prompts, drafts and media never leave our infrastructure for a third-party AI API.",
        },
        {
          q: "Do I need to connect my social media accounts to use Kaleido?",
          a: "No. You can generate posts, images, videos, carousels, blogs and newsletters without connecting a single account. Every generated piece can be downloaded or copied to the clipboard, and Kaleido gives you one-click 'share to' links for each platform so you can paste and post manually.",
        },
        {
          q: "Why are some platforms marked 'pending review'?",
          a: "Direct publishing to Instagram, TikTok, X, Facebook and a few others requires their official APIs, which gate access behind an app review that can take weeks. Kaleido is submitted and waiting. Until each platform approves us, the in-app 'Publish' button for that platform falls back to download and manual share, and your drafts are never lost.",
        },
        {
          q: "Which social media platforms are planned?",
          a: "Instagram, Twitter/X, LinkedIn, Facebook, TikTok, YouTube, Pinterest, Reddit, Threads, Bluesky, Google Business, Telegram, Snapchat and WhatsApp Business. Bluesky and Telegram do not require an app review, and you can connect them today from the Connections page.",
        },
        {
          q: "Is my data secure?",
          a: "Social account tokens are encrypted at rest with AES-256 and we connect platforms with OAuth 2.0 or their own native credentials (Bluesky app passwords, Telegram bot tokens). The server is reached over a Cloudflare Tunnel with no public ports, and AI inference happens on the same machine, so prompts never traverse a third-party LLM API.",
        },
        {
          q: "Can I use Kaleido in my language?",
          a: "The interface is in English, Norwegian (Bokm\u00e5l) and Arabic with full RTL support. Content generation works in 140+ languages via Gemma 4.",
        },
        {
          q: "Do I need design skills to use the image and video generator?",
          a: "No. Type a prompt, pick an aspect ratio, and Kaleido generates the image or video. You can re-generate, crop, add text overlay, or use the carousel builder for multi-slide posts.",
        },
      ],
    },
    footer: {
      description: "AI social media studio. Create, schedule, and grow your online presence.",
      product: "Product",
      company: "Company",
      legal: "Legal",
      links: {
        features: "Features",
        pricing: "Free",
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
      pricing: "Gratis",
      faq: "Sp\u00f8rsm\u00e5l",
      login: "Logg Inn",
      getStarted: "Kom i Gang Gratis",
    },
    hero: {
      badge: "\u00c5pen beta, gratis for alle",
      title: "Skap, Planlegg & Voks",
      titleHighlight: "Din Sosiale Tilstedev\u00e6relse",
      subtitle: "Kaleido bruker AI til \u00e5 lage innlegg, bilder, videoer og hele kampanjer. Last ned, kopier eller del alt du lager p\u00e5 hvilken som helst plattform. Gratis for alle.",
      cta: "Lag Gratis Konto",
      ctaSecondary: "Se Hvordan Det Fungerer",
      stats: {
        posts: "Innholdstyper",
        users: "Alltid Gratis",
        platforms: "Plattformer",
        time: "Lokal AI",
      },
    },
    heroStats: {
      posts: "13+",
      users: "100%",
      platforms: "14",
      time: "Lokal",
    },
    features: {
      title: "Alt Du Trenger",
      subtitle: "En plattform for \u00e5 administrere hele din tilstedev\u00e6relse p\u00e5 sosiale medier",
      items: [
        {
          title: "AI Innholdsgenerering",
          description: "Generer plattformoptimaliserte innlegg med AI. Velg tone, spr\u00e5k og stil, og f\u00e5 publiseringsklart innhold p\u00e5 sekunder.",
        },
        {
          title: "Bilde- og Videoskaping",
          description: "Skap fantastiske bilder med AI-bildegenerering og karusellbygger. Ingen designferdigheter n\u00f8dvendig.",
        },
        {
          title: "Smart Planlegging",
          description: "Planlegg innlegg p\u00e5 optimale tidspunkter for maksimalt engasjement. Automatisk k\u00f8 og kalendervisning.",
        },
        {
          title: "Del p\u00e5 Alle Plattformer",
          description: "Lag innholdet en gang, last det ned eller kopier det, og publiser det selv p\u00e5 Instagram, Twitter/X, LinkedIn, Facebook, TikTok og mer. Direkte publisering \u00e5pnes for hver plattform etter hvert som API-godkjenningen blir klar.",
        },
        {
          title: "Analyse Dashboard",
          description: "Spor ytelse, vekst og engasjement p\u00e5 tvers av alle plattformer. Oppdag dine beste publiseringstider.",
        },
        {
          title: "AI Markedsf\u00f8ringsr\u00e5dgiver",
          description: "Chat med din AI CMO for strategir\u00e5d, innholdsideer og kampanjeplanlegging tilpasset ditt merke.",
        },
        {
          title: "Kampanjestyring",
          description: "Planlegg og gjennomf\u00f8r kampanjer p\u00e5 tvers av plattformer med AI-genererte innholdsplaner.",
        },
        {
          title: "Blogg & Nyhetsbrev",
          description: "Generer SEO-optimaliserte blogginnlegg og vakre nyhetsbrev. Voks publikumet ditt utover sosiale medier.",
        },
      ],
    },
    howItWorks: {
      title: "Slik Fungerer Det",
      subtitle: "Kom i gang med tre enkle trinn",
      steps: [
        {
          number: "01",
          title: "Sett Opp Merkevaren Din",
          description: "Fortell Kaleido om merkevaren, tonen og m\u00e5lgruppen din p\u00e5 minutter. Du kan begynne \u00e5 skape uten \u00e5 koble til noen sosial konto.",
        },
        {
          number: "02",
          title: "Generer & Tilpass",
          description: "Bruk AI til \u00e5 lage innhold, bilder og karuseller. Rediger og finjuster etter din visjon.",
        },
        {
          number: "03",
          title: "Last Ned, Del & Voks",
          description: "Eksporter eller kopier ferdig innhold og publiser det hvor du vil. Planlegging og p\u00e5minnelser holder deg konsistent.",
        },
      ],
    },
    pricing: {
      title: "Helt Gratis",
      subtitle: "Kaleido er gratis for alle. Alle funksjoner inkludert, ingen kredittkort, ingen betalte planer.",
      badge: "Gratis for alle",
      cardTitle: "Alt inkludert",
      cardDescription: "En plan: gratis. Hver konto f\u00e5r alt dette:",
      features: [
        "Ubegrensede AI-genererte innlegg, tekster og hashtags",
        "AI-bildegenerering (SDXL-Lightning, p\u00e5 v\u00e5r egen server)",
        "AI-videogenerering (Wan 2.1, p\u00e5 v\u00e5r egen server)",
        "Karusellbygger, blogg- og nyhetsbrevgenerator",
        "Smart planlegging med kalendervisning",
        "Last ned eller kopier alt du lager",
        "Ett-klikks delingslenker for alle store plattformer",
        "AI markedsf\u00f8ringsassistent",
        "Analyse for innlegg publisert via tilkoblede kontoer",
      ],
      cta: "Lag Gratis Konto",
      note: "Kaleido er laget for \u00e5 hjelpe folk \u00e5 skape, ikke for \u00e5 ta penger fra dem.",
    },
    faq: {
      title: "Ofte Stilte Sp\u00f8rsm\u00e5l",
      items: [
        {
          q: "Er Kaleido virkelig gratis?",
          a: "Ja. Kaleido er helt gratis for alle. Alle funksjoner er inkludert, vi ber aldri om kredittkort, og det finnes ingen betalte niv\u00e5er.",
        },
        {
          q: "Hvilke AI-modeller bruker Kaleido?",
          a: "Tekst genereres med Gemma 4 via Ollama. Bilder lages med SDXL-Lightning og videoer med Wan 2.1, begge p\u00e5 v\u00e5r egen GPU-server. Promptene og innholdet ditt forlater aldri infrastrukturen v\u00e5r til en tredjeparts AI-API.",
        },
        {
          q: "M\u00e5 jeg koble til sosiale kontoer for \u00e5 bruke Kaleido?",
          a: "Nei. Du kan generere innlegg, bilder, videoer, karuseller, blogger og nyhetsbrev uten \u00e5 koble til noen konto. Alt generert kan lastes ned eller kopieres, og Kaleido gir deg ett-klikks delingslenker for hver plattform s\u00e5 du kan lime inn og publisere manuelt.",
        },
        {
          q: "Hvorfor st\u00e5r noen plattformer som 'venter p\u00e5 godkjenning'?",
          a: "Direkte publisering til Instagram, TikTok, X, Facebook og noen andre krever deres offisielle APIer, som er bak en app-gjennomgang som kan ta uker. Kaleido er sendt inn og venter. Inntil hver plattform har godkjent oss vil 'Publiser'-knappen falle tilbake til nedlasting og manuell deling, og utkastene dine forsvinner aldri.",
        },
        {
          q: "Hvilke plattformer er planlagt?",
          a: "Instagram, Twitter/X, LinkedIn, Facebook, TikTok, YouTube, Pinterest, Reddit, Threads, Bluesky, Google Business, Telegram, Snapchat og WhatsApp Business. Bluesky og Telegram krever ingen app-gjennomgang, og du kan koble dem til i dag fra Tilkoblinger-siden.",
        },
        {
          q: "Er dataene mine sikre?",
          a: "Sosiale tokens er kryptert med AES-256, og vi kobler til plattformer med OAuth 2.0 eller deres egne tilganger (Bluesky-apppassord, Telegram-bot-token). Serveren n\u00e5s via Cloudflare Tunnel uten offentlige porter, og AI-inferens skjer p\u00e5 samme maskin, s\u00e5 promptene g\u00e5r aldri til en tredjeparts LLM-API.",
        },
        {
          q: "Kan jeg bruke Kaleido p\u00e5 mitt spr\u00e5k?",
          a: "Grensesnittet er tilgjengelig p\u00e5 engelsk, norsk (bokm\u00e5l) og arabisk med full RTL-st\u00f8tte. Innholdsgenerering fungerer p\u00e5 140+ spr\u00e5k via Gemma 4.",
        },
        {
          q: "Trenger jeg designferdigheter for bilde- og videogeneratoren?",
          a: "Nei. Skriv en prompt, velg et bildeformat, og Kaleido genererer bildet eller videoen. Du kan regenerere, beskj\u00e6re, legge til tekst eller bruke karusellbyggeren for flerebildeinnlegg.",
        },
      ],
    },
    footer: {
      description: "AI-studio for sosiale medier. Skap, planlegg og voks din tilstedev\u00e6relse p\u00e5 nett.",
      product: "Produkt",
      company: "Selskap",
      legal: "Juridisk",
      links: {
        features: "Funksjoner",
        pricing: "Gratis",
        integrations: "Integrasjoner",
        changelog: "Endringslogg",
        about: "Om Oss",
        blog: "Blogg",
        careers: "Karriere",
        contact: "Kontakt",
        privacy: "Personvernerkl\u00e6ring",
        terms: "Vilk\u00e5r for Bruk",
        cookies: "Informasjonskapsler",
      },
      copyright: "Kaleido. Alle rettigheter reservert.",
    },
  },
  ar: {
    nav: {
      features: "\u0627\u0644\u0645\u064a\u0632\u0627\u062a",
      howItWorks: "\u0643\u064a\u0641 \u064a\u0639\u0645\u0644",
      pricing: "\u0645\u062c\u0627\u0646\u064a",
      faq: "\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629",
      login: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644",
      getStarted: "\u0627\u0628\u062f\u0623 \u0645\u062c\u0627\u0646\u0627\u064b",
    },
    hero: {
      badge: "\u0625\u0635\u062f\u0627\u0631 \u062a\u062c\u0631\u064a\u0628\u064a \u0645\u0641\u062a\u0648\u062d\u060c \u0645\u062c\u0627\u0646\u064a \u0644\u0644\u062c\u0645\u064a\u0639",
      title: "\u0623\u0646\u0634\u0626\u060c \u062c\u062f\u0648\u0644 \u0648\u0627\u0646\u0645\u0648",
      titleHighlight: "\u062a\u0648\u0627\u062c\u062f\u0643 \u0627\u0644\u0631\u0642\u0645\u064a",
      subtitle: "\u064a\u0633\u062a\u062e\u062f\u0645 \u0643\u0627\u0644\u064a\u062f\u0648 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0644\u0625\u0646\u0634\u0627\u0621 \u0645\u0646\u0634\u0648\u0631\u0627\u062a \u0648\u0635\u0648\u0631 \u0648\u0641\u064a\u062f\u064a\u0648\u0647\u0627\u062a \u0648\u062d\u0645\u0644\u0627\u062a \u0643\u0627\u0645\u0644\u0629. \u0646\u0632\u0651\u0644 \u0623\u0648 \u0627\u0646\u0633\u062e \u0623\u0648 \u0634\u0627\u0631\u0643 \u0643\u0644 \u0645\u0627 \u062a\u0635\u0646\u0639\u0647 \u0639\u0644\u0649 \u0623\u064a \u0645\u0646\u0635\u0629 \u062a\u0631\u064a\u062f. \u0645\u062c\u0627\u0646\u064a \u0644\u0644\u062c\u0645\u064a\u0639.",
      cta: "\u0623\u0646\u0634\u0626 \u062d\u0633\u0627\u0628\u064b\u0627 \u0645\u062c\u0627\u0646\u064a\u064b\u0627",
      ctaSecondary: "\u0643\u064a\u0641 \u064a\u0639\u0645\u0644",
      stats: {
        posts: "\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0645\u062d\u062a\u0648\u0649",
        users: "\u0645\u062c\u0627\u0646\u064a \u062f\u0627\u0626\u0645\u064b\u0627",
        platforms: "\u0645\u0646\u0635\u0629",
        time: "\u0630\u0643\u0627\u0621 \u0645\u062d\u0644\u064a",
      },
    },
    heroStats: {
      posts: "+13",
      users: "100%",
      platforms: "14",
      time: "\u0645\u062d\u0644\u064a",
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
          title: "\u0634\u0627\u0631\u0643 \u0639\u0644\u0649 \u0623\u064a \u0645\u0646\u0635\u0629",
          description: "\u0623\u0646\u0634\u0626 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0645\u0631\u0629 \u0648\u0627\u062d\u062f\u0629\u060c \u062b\u0645 \u0646\u0632\u0651\u0644\u0647 \u0623\u0648 \u0627\u0646\u0633\u062e\u0647 \u0648\u0627\u0646\u0634\u0631\u0647 \u0628\u0646\u0641\u0633\u0643 \u0639\u0644\u0649 \u0625\u0646\u0633\u062a\u063a\u0631\u0627\u0645 \u0648\u062a\u0648\u064a\u062a\u0631 \u0648\u0644\u064a\u0646\u0643\u062f\u0625\u0646 \u0648\u0641\u064a\u0633\u0628\u0648\u0643 \u0648\u062a\u064a\u0643\u062a\u0648\u0643 \u0648\u0627\u0644\u0645\u0632\u064a\u062f. \u0627\u0644\u0646\u0634\u0631 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0633\u064a\u062a\u0648\u0641\u0631 \u0644\u0643\u0644 \u0645\u0646\u0635\u0629 \u0628\u0639\u062f \u0627\u0643\u062a\u0645\u0627\u0644 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u062a\u0637\u0628\u064a\u0642.",
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
          title: "\u062c\u0647\u0651\u0632 \u0639\u0644\u0627\u0645\u062a\u0643 \u0627\u0644\u062a\u062c\u0627\u0631\u064a\u0629",
          description: "\u0623\u062e\u0628\u0631 \u0643\u0627\u0644\u064a\u062f\u0648 \u0639\u0646 \u0639\u0644\u0627\u0645\u062a\u0643 \u0627\u0644\u062a\u062c\u0627\u0631\u064a\u0629 \u0648\u0646\u0628\u0631\u062a\u0643 \u0648\u062c\u0645\u0647\u0648\u0631\u0643 \u0641\u064a \u062f\u0642\u0627\u0626\u0642. \u064a\u0645\u0643\u0646\u0643 \u0627\u0644\u0628\u062f\u0621 \u0641\u064a \u0627\u0644\u0625\u0646\u0634\u0627\u0621 \u062f\u0648\u0646 \u0631\u0628\u0637 \u0623\u064a \u062d\u0633\u0627\u0628.",
        },
        {
          number: "\u0660\u0662",
          title: "\u0623\u0646\u0634\u0626 \u0648\u062e\u0635\u0635",
          description: "\u0627\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0644\u0625\u0646\u0634\u0627\u0621 \u0645\u062d\u062a\u0648\u0649 \u0648\u0635\u0648\u0631 \u0648\u0643\u0627\u0631\u0648\u0633\u064a\u0644. \u0639\u062f\u0644 \u0648\u062d\u0633\u0646 \u062d\u0633\u0628 \u0631\u0624\u064a\u062a\u0643.",
        },
        {
          number: "\u0660\u0663",
          title: "\u0646\u0632\u0651\u0644 \u0648\u0634\u0627\u0631\u0643 \u0648\u0627\u0646\u0645\u064f",
          description: "\u0635\u062f\u0651\u0631 \u0623\u0648 \u0627\u0646\u0633\u062e \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u062c\u0627\u0647\u0632 \u0648\u0627\u0646\u0634\u0631\u0647 \u0623\u064a\u0646\u0645\u0627 \u062a\u0631\u064a\u062f. \u0627\u0644\u062c\u062f\u0648\u0644\u0629 \u0648\u0627\u0644\u062a\u0630\u0643\u064a\u0631\u0627\u062a \u062a\u062d\u0627\u0641\u0638 \u0639\u0644\u0649 \u0627\u0633\u062a\u0645\u0631\u0627\u0631\u064a\u062a\u0643.",
        },
      ],
    },
    pricing: {
      title: "\u0645\u062c\u0627\u0646\u064a \u0628\u0627\u0644\u0643\u0627\u0645\u0644",
      subtitle: "\u0643\u0627\u0644\u064a\u062f\u0648 \u0645\u062c\u0627\u0646\u064a \u0644\u0644\u062c\u0645\u064a\u0639. \u0643\u0644 \u0627\u0644\u0645\u064a\u0632\u0627\u062a \u0645\u062a\u0627\u062d\u0629\u060c \u062f\u0648\u0646 \u0628\u0637\u0627\u0642\u0629 \u0627\u0626\u062a\u0645\u0627\u0646 \u0648\u062f\u0648\u0646 \u062e\u0637\u0637 \u0645\u062f\u0641\u0648\u0639\u0629.",
      badge: "\u0645\u062c\u0627\u0646\u064a \u0644\u0644\u062c\u0645\u064a\u0639",
      cardTitle: "\u0643\u0644 \u0634\u064a\u0621 \u0645\u062a\u0627\u062d",
      cardDescription: "\u062e\u0637\u0629 \u0648\u0627\u062d\u062f\u0629: \u0645\u062c\u0627\u0646\u064a\u0629. \u0647\u0630\u0627 \u0645\u0627 \u064a\u062d\u0635\u0644 \u0639\u0644\u064a\u0647 \u0643\u0644 \u062d\u0633\u0627\u0628:",
      features: [
        "\u0645\u0646\u0634\u0648\u0631\u0627\u062a \u0648\u0646\u0635\u0648\u0635 \u0648\u0647\u0627\u0634\u062a\u0627\u063a\u0627\u062a \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a",
        "\u062a\u0648\u0644\u064a\u062f \u0627\u0644\u0635\u0648\u0631 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a (SDXL-Lightning \u0639\u0644\u0649 \u062e\u0627\u062f\u0645\u0646\u0627 \u0627\u0644\u062e\u0627\u0635)",
        "\u062a\u0648\u0644\u064a\u062f \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a (Wan 2.1 \u0639\u0644\u0649 \u062e\u0627\u062f\u0645\u0646\u0627 \u0627\u0644\u062e\u0627\u0635)",
        "\u0645\u0646\u0634\u0626 \u0627\u0644\u0643\u0627\u0631\u0648\u0633\u064a\u0644 \u0648\u0645\u0648\u0644\u062f \u0627\u0644\u0645\u062f\u0648\u0646\u0627\u062a \u0648\u0627\u0644\u0646\u0634\u0631\u0627\u062a \u0627\u0644\u0625\u062e\u0628\u0627\u0631\u064a\u0629",
        "\u062c\u062f\u0648\u0644\u0629 \u0630\u0643\u064a\u0629 \u0645\u0639 \u0639\u0631\u0636 \u0627\u0644\u062a\u0642\u0648\u064a\u0645",
        "\u0646\u0632\u0651\u0644 \u0623\u0648 \u0627\u0646\u0633\u062e \u0643\u0644 \u0645\u0627 \u062a\u0646\u0634\u0626\u0647",
        "\u0631\u0648\u0627\u0628\u0637 \u0645\u0634\u0627\u0631\u0643\u0629 \u0628\u0646\u0642\u0631\u0629 \u0648\u0627\u062d\u062f\u0629 \u0644\u0643\u0644 \u0627\u0644\u0645\u0646\u0635\u0627\u062a \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",
        "\u0645\u0633\u0627\u0639\u062f \u062a\u0633\u0648\u064a\u0642 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a",
        "\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0644\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062a \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629 \u0639\u0628\u0631 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u062a\u0635\u0644\u0629",
      ],
      cta: "\u0623\u0646\u0634\u0626 \u062d\u0633\u0627\u0628\u064b\u0627 \u0645\u062c\u0627\u0646\u064a\u064b\u0627",
      note: "\u0635\u064f\u0646\u0639 \u0643\u0627\u0644\u064a\u062f\u0648 \u0644\u0645\u0633\u0627\u0639\u062f\u0629 \u0627\u0644\u0646\u0627\u0633 \u0639\u0644\u0649 \u0627\u0644\u0625\u0628\u062f\u0627\u0639\u060c \u0644\u0627 \u0644\u0623\u062e\u0630 \u0627\u0644\u0645\u0627\u0644 \u0645\u0646\u0647\u0645.",
    },
    faq: {
      title: "\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629",
      items: [
        {
          q: "\u0647\u0644 \u0643\u0627\u0644\u064a\u062f\u0648 \u0645\u062c\u0627\u0646\u064a \u0641\u0639\u0644\u0627\u064b\u061f",
          a: "\u0646\u0639\u0645. \u0643\u0627\u0644\u064a\u062f\u0648 \u0645\u062c\u0627\u0646\u064a \u062a\u0645\u0627\u0645\u0627\u064b \u0644\u0644\u062c\u0645\u064a\u0639. \u0643\u0644 \u0627\u0644\u0645\u064a\u0632\u0627\u062a \u0645\u062a\u0627\u062d\u0629\u060c \u0648\u0644\u0627 \u0646\u0637\u0644\u0628 \u0628\u0637\u0627\u0642\u0629 \u0627\u0626\u062a\u0645\u0627\u0646 \u0623\u0628\u062f\u0627\u064b\u060c \u0648\u0644\u0627 \u062a\u0648\u062c\u062f \u062e\u0637\u0637 \u0645\u062f\u0641\u0648\u0639\u0629.",
        },
        {
          q: "\u0623\u064a \u0646\u0645\u0627\u0630\u062c \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a \u064a\u0633\u062a\u062e\u062f\u0645 \u0643\u0627\u0644\u064a\u062f\u0648\u061f",
          a: "\u0627\u0644\u0646\u0635\u0648\u0635 \u0628\u0648\u0627\u0633\u0637\u0629 Gemma 4 \u0639\u0628\u0631 Ollama. \u0627\u0644\u0635\u0648\u0631 \u0645\u0646 SDXL-Lightning \u0648\u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0645\u0646 Wan 2.1\u060c \u0648\u0643\u0644\u0627\u0647\u0645\u0627 \u064a\u0639\u0645\u0644 \u0639\u0644\u0649 \u062e\u0627\u062f\u0645 GPU \u062e\u0627\u0635 \u0628\u0646\u0627. \u0637\u0644\u0628\u0627\u062a\u0643 \u0648\u0645\u062d\u062a\u0648\u0627\u0643 \u0644\u0627 \u062a\u063a\u0627\u062f\u0631 \u0628\u0646\u064a\u062a\u0646\u0627 \u0627\u0644\u062a\u062d\u062a\u064a\u0629 \u0623\u0628\u062f\u0627\u064b \u0625\u0644\u0649 \u062e\u062f\u0645\u0629 \u0637\u0631\u0641 \u062b\u0627\u0644\u062b.",
        },
        {
          q: "\u0647\u0644 \u064a\u062c\u0628 \u0623\u0646 \u0623\u0631\u0628\u0637 \u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0643\u0627\u0644\u064a\u062f\u0648\u061f",
          a: "\u0644\u0627. \u064a\u0645\u0643\u0646\u0643 \u062a\u0648\u0644\u064a\u062f \u0645\u0646\u0634\u0648\u0631\u0627\u062a \u0648\u0635\u0648\u0631 \u0648\u0641\u064a\u062f\u064a\u0648 \u0648\u0643\u0627\u0631\u0648\u0633\u064a\u0644 \u0648\u0645\u062f\u0648\u0646\u0627\u062a \u0648\u0646\u0634\u0631\u0627\u062a \u062f\u0648\u0646 \u0631\u0628\u0637 \u0623\u064a \u062d\u0633\u0627\u0628. \u064a\u0645\u0643\u0646\u0643 \u062a\u0646\u0632\u064a\u0644 \u0623\u0648 \u0646\u0633\u062e \u0643\u0644 \u0634\u064a\u0621\u060c \u0648\u064a\u0648\u0641\u0631 \u0643\u0627\u0644\u064a\u062f\u0648 \u0631\u0648\u0627\u0628\u0637 \u0645\u0634\u0627\u0631\u0643\u0629 \u0633\u0631\u064a\u0639\u0629 \u0644\u0643\u0644 \u0645\u0646\u0635\u0629 \u0644\u0644\u0646\u0634\u0631 \u0627\u0644\u064a\u062f\u0648\u064a.",
        },
        {
          q: "\u0644\u0645\u0627\u0630\u0627 \u062a\u0638\u0647\u0631 \u0628\u0639\u0636 \u0627\u0644\u0645\u0646\u0635\u0627\u062a \u0643\u0640 '\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629'\u061f",
          a: "\u0627\u0644\u0646\u0634\u0631 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0625\u0644\u0649 Instagram \u0648 TikTok \u0648 X \u0648 Facebook \u0648\u063a\u064a\u0631\u0647\u0627 \u064a\u062a\u0637\u0644\u0628 \u0648\u0627\u062c\u0647\u0627\u062a \u0628\u0631\u0645\u062c\u064a\u0629 \u0631\u0633\u0645\u064a\u0629 \u0645\u062d\u0645\u064a\u0629 \u0628\u0645\u0631\u0627\u062c\u0639\u0629 \u0642\u062f \u062a\u0633\u062a\u063a\u0631\u0642 \u0623\u0633\u0627\u0628\u064a\u0639. \u0643\u0627\u0644\u064a\u062f\u0648 \u0642\u064f\u062f\u0650\u0651\u0645 \u0648\u064a\u0646\u062a\u0638\u0631. \u062d\u062a\u0649 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629\u060c \u064a\u062a\u062d\u0648\u0644 \u0632\u0631 '\u0646\u0634\u0631' \u0625\u0644\u0649 \u062a\u0646\u0632\u064a\u0644 \u0648\u0645\u0634\u0627\u0631\u0643\u0629 \u064a\u062f\u0648\u064a\u0629\u060c \u0648\u0644\u0646 \u062a\u0641\u0642\u062f \u0623\u064a \u0645\u0633\u0648\u062f\u0629.",
        },
        {
          q: "\u0645\u0627 \u0627\u0644\u0645\u0646\u0635\u0627\u062a \u0627\u0644\u0645\u062e\u0637\u0637\u0629\u061f",
          a: "Instagram \u0648 Twitter/X \u0648 LinkedIn \u0648 Facebook \u0648 TikTok \u0648 YouTube \u0648 Pinterest \u0648 Reddit \u0648 Threads \u0648 Bluesky \u0648 Google Business \u0648 Telegram \u0648 Snapchat \u0648 WhatsApp Business. Bluesky \u0648 Telegram \u0644\u0627 \u064a\u062d\u062a\u0627\u062c\u0627\u0646 \u0645\u0631\u0627\u062c\u0639\u0629 \u062a\u0637\u0628\u064a\u0642\u060c \u0648\u064a\u0645\u0643\u0646\u0643 \u0631\u0628\u0637\u0647\u0645\u0627 \u0627\u0644\u064a\u0648\u0645 \u0645\u0646 \u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0628\u0637.",
        },
        {
          q: "\u0647\u0644 \u0628\u064a\u0627\u0646\u0627\u062a\u064a \u0622\u0645\u0646\u0629\u061f",
          a: "\u0631\u0645\u0648\u0632 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0627\u062c\u062a\u0645\u0627\u0639\u064a\u0629 \u0645\u0634\u0641\u0651\u0631\u0629 \u0628\u0640 AES-256 \u0648\u0646\u0631\u0628\u0637 \u0627\u0644\u0645\u0646\u0635\u0627\u062a \u0639\u0628\u0631 OAuth 2.0 \u0623\u0648 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0639\u062a\u0645\u0627\u062f\u0647\u0627 \u0627\u0644\u062e\u0627\u0635\u0629 (\u0643\u0644\u0645\u0627\u062a \u0645\u0631\u0648\u0631 \u0627\u0644\u062a\u0637\u0628\u064a\u0642\u0627\u062a \u0641\u064a Bluesky \u0648\u0631\u0645\u0648\u0632 \u0627\u0644\u0628\u0648\u062a \u0641\u064a Telegram). \u064a\u062a\u0645 \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0644\u062e\u0627\u062f\u0645 \u0639\u0628\u0631 Cloudflare Tunnel \u062f\u0648\u0646 \u0645\u0646\u0627\u0641\u0630 \u0645\u0641\u062a\u0648\u062d\u0629\u060c \u0648\u064a\u062a\u0645 \u0627\u0633\u062a\u0646\u062a\u0627\u062c \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0639\u0644\u0649 \u0646\u0641\u0633 \u0627\u0644\u062c\u0647\u0627\u0632\u060c \u0641\u0637\u0644\u0628\u0627\u062a\u0643 \u0644\u0627 \u062a\u0630\u0647\u0628 \u0623\u0628\u062f\u0627\u064b \u0625\u0644\u0649 LLM \u0637\u0631\u0641 \u062b\u0627\u0644\u062b.",
        },
        {
          q: "\u0647\u0644 \u064a\u0645\u0643\u0646\u0646\u064a \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0643\u0627\u0644\u064a\u062f\u0648 \u0628\u0644\u063a\u062a\u064a\u061f",
          a: "\u0627\u0644\u0648\u0627\u062c\u0647\u0629 \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 \u0648\u0627\u0644\u0646\u0631\u0648\u064a\u062c\u064a\u0629 \u0648\u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0645\u0639 \u062f\u0639\u0645 RTL \u0643\u0627\u0645\u0644. \u062a\u0648\u0644\u064a\u062f \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u064a\u0639\u0645\u0644 \u0628\u0640 140+ \u0644\u063a\u0629 \u0639\u0628\u0631 Gemma 4.",
        },
        {
          q: "\u0647\u0644 \u0623\u062d\u062a\u0627\u062c \u0645\u0647\u0627\u0631\u0627\u062a \u062a\u0635\u0645\u064a\u0645 \u0644\u0645\u0648\u0644\u0651\u062f \u0627\u0644\u0635\u0648\u0631 \u0648\u0627\u0644\u0641\u064a\u062f\u064a\u0648\u061f",
          a: "\u0644\u0627. \u0627\u0643\u062a\u0628 \u0648\u0635\u0641\u0627\u064b\u060c \u0627\u062e\u062a\u0631 \u0627\u0644\u0646\u0633\u0628\u0629\u060c \u0648\u0633\u064a\u064f\u0648\u0644\u0651\u062f \u0643\u0627\u0644\u064a\u062f\u0648 \u0627\u0644\u0635\u0648\u0631\u0629 \u0623\u0648 \u0627\u0644\u0641\u064a\u062f\u064a\u0648. \u064a\u0645\u0643\u0646\u0643 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062a\u0648\u0644\u064a\u062f \u0623\u0648 \u0627\u0644\u0642\u0635 \u0623\u0648 \u0625\u0636\u0627\u0641\u0629 \u0646\u0635 \u0623\u0648 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0645\u0646\u0634\u0626 \u0627\u0644\u0643\u0627\u0631\u0648\u0633\u064a\u0644.",
        },
      ],
    },
    footer: {
      description: "\u0627\u0633\u062a\u0648\u062f\u064a\u0648 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0644\u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u062a\u0648\u0627\u0635\u0644. \u0623\u0646\u0634\u0626 \u0648\u062c\u062f\u0648\u0644 \u0648\u0627\u0646\u0645\u0648 \u062a\u0648\u0627\u062c\u062f\u0643 \u0639\u0644\u0649 \u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a.",
      product: "\u0627\u0644\u0645\u0646\u062a\u062c",
      company: "\u0627\u0644\u0634\u0631\u0643\u0629",
      legal: "\u0642\u0627\u0646\u0648\u0646\u064a",
      links: {
        features: "\u0627\u0644\u0645\u064a\u0632\u0627\u062a",
        pricing: "\u0645\u062c\u0627\u0646\u064a",
        integrations: "\u0627\u0644\u062a\u0643\u0627\u0645\u0644\u0627\u062a",
        changelog: "\u0633\u062c\u0644 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a",
        about: "\u0639\u0646\u0627",
        blog: "\u0627\u0644\u0645\u062f\u0648\u0646\u0629",
        careers: "\u0627\u0644\u0648\u0638\u0627\u0626\u0641",
        contact: "\u0627\u062a\u0635\u0644 \u0628\u0646\u0627",
        privacy: "\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629",
        terms: "\u0634\u0631\u0648\u0637 \u0627\u0644\u062e\u062f\u0645\u0629",
        cookies: "\u0633\u064a\u0627\u0633\u0629 \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637",
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
