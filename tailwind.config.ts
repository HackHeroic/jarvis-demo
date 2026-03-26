import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          dark: "#0f172a",
          accent: "#38bdf8",
          muted: "#64748b",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
