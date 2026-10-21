import type { Metadata, Viewport } from "next";
import { jost, cormorant } from "@/fonts";
import { Wordmark } from "@/components/wordmark";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Prequate Table",
  description: "Member portal for The Prequate Table.",
  applicationName: "The Table",
  icons: { apple: "/icons/apple-touch-icon.png" },
  // What iPhone uses when the portal is added to the home screen.
  appleWebApp: { capable: true, title: "The Table", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF7F0" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0C0A" },
  ],
};

// Runs before the page paints, so a member who chose a theme never sees the
// other one flash. Without a choice the device's own setting decides (CSS).
const THEME_SCRIPT = `try{var t=localStorage.getItem("table-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jost.variable} ${cormorant.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-app bg-paper font-sans font-light text-ink antialiased">
        <Wordmark />
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
