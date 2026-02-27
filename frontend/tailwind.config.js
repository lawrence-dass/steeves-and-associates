/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        steeves: {
          navy: "#405189",
          blue: "#3577f1",
          gold: "#f7b84b",
          light: "#f3f3f9",
          teal: "#0ab39c",
          danger: "#f06548",
          muted: "#878a99",
          ink: "#495057",
          card: "#ffffff",
          border: "#e9ebec",
        },
      },
      boxShadow: {
        panel: "0 1px 2px rgba(56, 65, 74, 0.12)",
      },
      borderRadius: {
        panel: "10px",
      },
    },
  },
  plugins: [],
};
