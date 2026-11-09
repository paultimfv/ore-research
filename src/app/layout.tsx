import type { Metadata } from "next";
import { Geologica } from "next/font/google";
import Ask from "@/components/ask";
import "./globals.css";

// Geologica: a geological grotesk; its sharpness axis gives the big figures a cut, faceted edge
const geo = Geologica({ subsets: ["latin"], axes: ["SHRP"], variable: "--font-geo" });

export const metadata: Metadata = {
  title: "ORE dashboard",
  description: "ORE mining, revenue, buybacks and supply, read directly from Solana.",
};

const THEME_INIT = `try{var t=localStorage.getItem("theme");if(!t)t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geo.variable} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="antialiased">{children}<Ask site="ore" title="ORE" suggestions={["How much SOL was deployed in the last 30 days?", "How much ORE has been bought back and buried?", "What’s the current ORE supply and price?"]} /></body>
    </html>
  );
}
