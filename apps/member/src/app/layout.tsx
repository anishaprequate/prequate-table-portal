import type { Metadata } from "next";
import { productSans, awesomeSerif } from "@/fonts";
import { Wordmark } from "@/components/wordmark";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Prequate Table",
  description: "Member portal for The Prequate Table.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${productSans.variable} ${awesomeSerif.variable}`}>
      <body className="min-h-screen bg-paper font-sans font-light text-ink antialiased">
        <Wordmark />
        {children}
      </body>
    </html>
  );
}
