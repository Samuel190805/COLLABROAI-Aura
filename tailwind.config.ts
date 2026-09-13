import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mono: {
          bg: "var(--bg-primary)",
          bgAlt: "var(--bg-secondary)",
          ink: "var(--ink-primary)",
          inkMuted: "var(--ink-secondary)",
          line: "var(--line)",
          lineSolid: "var(--line-solid)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "IBM Plex Mono", "monospace"],
      },
      borderWidth: {
        hairline: "1px",
      },
      boxShadow: {
        hairline: "0 0 0 1px var(--line)",
      },
      animation: {
        "fade-in": "fadeIn 150ms ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
