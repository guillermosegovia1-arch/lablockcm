/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cm: {
          blue: {
            50: "#eef5ff",
            100: "#d9e8ff",
            200: "#bad6ff",
            300: "#8bbbff",
            400: "#5496ff",
            500: "#2b6eff",
            600: "#134fe6",
            700: "#0e3db8",
            800: "#103494",
            900: "#132f77",
            950: "#0b1b46",
          },
          gold: {
            500: "#eab308",
            600: "#ca8a04",
          }
        },
      },
    },
  },
  plugins: [],
};
