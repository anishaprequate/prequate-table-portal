import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bone: "#FBF7F0",
        foil: "#C9A455",
        clay: "#6E4A3A",
        taupe: "#83766A",
        ink: "#14120F",
      },
      fontFamily: {
        sans: ["var(--font-jost)", "sans-serif"],
        display: ["var(--font-cormorant)", "serif"],
      },
      borderRadius: {
        md: "0.625rem",
        lg: "0.875rem",
        xl: "1.25rem",
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
