import type { Config } from "tailwindcss";

// Tokens: mezcla de las referencias Finnova (violeta + paneles navy) y Paytin (lima + tarjetas redondeadas).
const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: c("canvas"), surface: c("surface"), ink: c("ink"), muted: c("muted"), line: c("line"),
        brand: { DEFAULT: c("brand"), text: c("brand-text") },
        accent: c("accent"), panel: c("panel"), panel2: c("panel2"),
        positive: c("positive"), negative: c("negative"),
      },
      borderRadius: { card: "1.5rem", pill: "9999px" },
      boxShadow: { card: "0 1px 2px rgb(11 27 58 / .04), 0 12px 32px rgb(11 38 84 / .10)", glow: "0 8px 24px rgb(29 78 156 / .35)" },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
