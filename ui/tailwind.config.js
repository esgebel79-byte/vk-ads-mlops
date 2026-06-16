/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9ebff",
          200: "#bcd9ff",
          300: "#8ebfff",
          400: "#599bff",
          500: "#3378f5",
          600: "#1f5bea",
          700: "#1a48d7",
          800: "#1c3caf",
          900: "#1c3589",
          950: "#152252",
        },
        surface: {
          DEFAULT: "#f8fafc",
          card: "#ffffff",
          muted: "#f1f5f9",
          border: "#e2e8f0",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};
