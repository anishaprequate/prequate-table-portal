import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        orange: "#FF9633",
        "deep-orange": "#F96900",
        grey: "#707070",
        ink: "#161616",
      },
      fontFamily: {
        sans: ["var(--font-product-sans)", "sans-serif"],
        display: ["var(--font-awesome-serif)", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
