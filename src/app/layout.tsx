import type { Metadata, Viewport } from "next";
import { Bangers, Bricolage_Grotesque, Bungee, DM_Sans, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", weight: ["500", "700", "800"] });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dm" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["500", "600", "700", "800"] });
const sfx = Bangers({ subsets: ["latin"], variable: "--font-bangers", weight: "400" });
const brick = Bungee({ subsets: ["latin"], variable: "--font-bungee", weight: "400" });

export const metadata: Metadata = {
  title: { default: "BRICKVAULT", template: "%s · BRICKVAULT" },
  description: "Every brick has a story. Every set has a value. Track your LEGO collection and what it cost you.",
};

export const viewport: Viewport = {
  themeColor: "#FFF3E8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${sans.variable} ${mono.variable} ${sfx.variable} ${brick.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
