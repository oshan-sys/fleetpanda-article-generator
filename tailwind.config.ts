import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark slate for headers/nav
        panda: {
          950: "#0b1220",
          900: "#0f172a",
          800: "#1e293b",
        },
        // Single accent color for primary actions
        accent: {
          50: "#eef2ff",
          100: "#e0e7ff",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
