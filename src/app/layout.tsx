import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

const notoSansTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  display: "swap",
  variable: "--font-tamil",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SplitStream — Audio & Video Workstation",
  description:
    "Local-first, zero-telemetry audio workstation: 2-stem vocal/instrument separation, link downloader, speech translation, mashup studio, chord detection, and player suite.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable} ${notoSansTamil.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased min-h-screen bg-mono-bg text-mono-ink font-sans selection:bg-mono-ink selection:text-mono-bg">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
