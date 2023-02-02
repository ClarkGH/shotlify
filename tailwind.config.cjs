/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'sans-serif'],
        serif: ['ui-serif', 'serif'],
      }
    },
  },
  plugins: [],
};
