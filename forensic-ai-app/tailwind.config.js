/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#050d1a",
        "bg-surface": "#080f1c",
        "accent-blue": "#378ADD",
        "accent-teal": "#1D9E75",
        "accent-purple": "#534AB7",
        "text-primary": "#e8f0fb",
        "text-muted": "#7a8fa8",
      },
      fontFamily: {
        grotesk: ["Space Grotesk", "sans-serif"],
      },
    },
  },
  plugins: [],
};