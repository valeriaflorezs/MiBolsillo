import type { Config } from "tailwindcss";

// Tokens derivados de la referencia "Dashboard V14" (ver docs/DESIGN.md).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        brand: { DEFAULT: "rgb(var(--brand) / <alpha-value>)", text: "rgb(var(--brand-text) / <alpha-value>)" },
        positive: "rgb(var(--positive) / <alpha-value>)",
        negative: "rgb(var(--negative) / <alpha-value>)",
      },
      borderRadius: { card: "1.25rem", pill: "9999px" },
      boxShadow: { card: "0 1px 2px rgb(0 0 0 / .04), 0 8px 24px rgb(0 0 0 / .05)" },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
