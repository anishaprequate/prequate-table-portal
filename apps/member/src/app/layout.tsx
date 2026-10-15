import type { Metadata } from "next";
import { jost, cormorant } from "@/fonts";
import { Wordmark } from "@/components/wordmark";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Prequate Table",
  description: "Member portal for The Prequate Table.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jost.variable} ${cormorant.variable}`}>
      <body className="min-h-screen bg-bone font-sans font-light text-ink antialiased">
        <Wordmark />
        {children}
      </body>
    </html>
  );
}
