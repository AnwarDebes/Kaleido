import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kaleido | AI Social Media Studio",
  description:
    "Create, schedule, and grow your social media presence with AI-generated content, smart scheduling, and powerful analytics. Try Kaleido free.",
  keywords: [
    "social media management",
    "AI content generation",
    "social media scheduling",
    "AI marketing",
    "content creation",
    "social media analytics",
  ],
  openGraph: {
    title: "Kaleido | AI Social Media Studio",
    description:
      "Create, schedule, and grow your social media presence with AI.",
    type: "website",
    siteName: "Kaleido",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kaleido | AI Social Media Studio",
    description:
      "Create, schedule, and grow your social media presence with AI.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
