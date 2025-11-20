/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#221E5F",
          light: "#05ABFF",
          softer: "#00D8C4",  //secundario violeta
          secondary: "#8E01FB",  //secundario violeta

        },
        neutral: {
          dark: "#111827",
          light: "#CCCCCC",
        },
        details: "#00D8C4",
        success: "#05ABFF",
        error: "#DF4651",
      },
      backgroundImage: {
        'gradient-primary': 'radial-gradient(circle, rgba(34, 30, 95, 1) 0%, rgba(142, 1, 251, 1) 50%, rgba(0, 216, 196, 1) 100%)',
        'background-gradient' : 'radial-gradient(circle,rgba(34, 30, 95, 1) 0%, rgba(142, 1, 251, 0.39) 28%, rgba(0, 216, 196, 1) 89%)',

      },
    },
  },
  plugins: [],
};
