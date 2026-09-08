import localFont from "next/font/local";

// Headlines and body copy. Product Sans Bold for headlines, Light for
// body, Regular for captions and table text, Medium for small
// letter-spaced eyebrow labels — weights selected per use with Tailwind's
// font-weight utilities.
export const productSans = localFont({
  src: [
    {
      path: "../../../packages/core/src/fonts/ProductSans-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../../packages/core/src/fonts/ProductSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../packages/core/src/fonts/ProductSans-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../packages/core/src/fonts/ProductSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-product-sans",
  display: "swap",
});

// Reserved for display moments — page hero titles and the italic accent
// word within them — never body text or UI labels.
export const awesomeSerif = localFont({
  src: [
    {
      path: "../../../packages/core/src/fonts/Awesome Serif VAR-VF.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../../packages/core/src/fonts/Awesome Serif Italic VAR-VF.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-awesome-serif",
  display: "swap",
});
