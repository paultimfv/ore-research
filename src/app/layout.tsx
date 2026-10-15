import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// one family, two widths: extended for display and figures, normal for reading
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });

export const metadata: Metadata = {
  title: "ORE research",
  description: "Independent onchain research on ORE: every mining round, buyback and burn since October 2025, decoded from Solana.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
