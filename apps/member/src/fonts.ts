import { Cormorant_Garamond, Jost } from "next/font/google";

// Names, numbers, the wordmark — set generously, never bold. Per The
// Table's identity spec (table-design-identity-v1.pdf): Cormorant Garamond,
// Light weight, with Italic reserved for display moments and quote lines.
export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

// Labels and small caps, tracked wide at 0.3em. Also doubles as the app's
// body/UI sans — Light for body copy, Regular for captions and table text.
export const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jost",
  display: "swap",
});
