import type { Config } from "tailwindcss";

const config: Config = {
  // Hover styles only where a pointer can really hover. On a phone a tap leaves
  // the "hover" state stuck on, which is where stray gold rings came from.
  future: { hoverOnlyWhenSupported: true },
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // The Table's five colours, as variables so the whole app can change
        // theme (see globals.css). bone is a surface, paper the page behind it,
        // ink the main text. night and cream stay dark and light in both themes,
        // for panels and for text on them.
        bone: "rgb(var(--c-bone) / <alpha-value>)",
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        foil: "rgb(var(--c-foil) / <alpha-value>)",
        clay: "rgb(var(--c-clay) / <alpha-value>)",
        taupe: "rgb(var(--c-taupe) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        night: "rgb(var(--c-night) / <alpha-value>)",
        cream: "rgb(var(--c-cream) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-jost)", "sans-serif"],
        display: ["var(--font-cormorant)", "serif"],
      },
      // Radii are variables so a phone can round its corners more than a laptop
      // does (see globals.css).
      borderRadius: {
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(22,22,22,0.04), 0 1px 1px rgba(22,22,22,0.03)",
        DEFAULT: "0 2px 8px rgba(22,22,22,0.05), 0 1px 2px rgba(22,22,22,0.04)",
        md: "0 8px 24px rgba(22,22,22,0.08), 0 2px 6px rgba(22,22,22,0.04)",
        lg: "0 16px 40px rgba(22,22,22,0.10), 0 4px 12px rgba(22,22,22,0.05)",
        glow: "0 0 0 1px rgba(201,164,85,0.3), 0 8px 24px rgba(201,164,85,0.18)",
      },
      transitionDuration: {
        DEFAULT: "280ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
