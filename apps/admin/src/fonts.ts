import localFont from "next/font/local";

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
