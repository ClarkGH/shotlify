/** @type {import("prettier").Config} */
module.exports = {
  plugins: ["prettier-plugin-tailwindcss"],
  // Tailwind v4 reads its theme from CSS, not a JS config.
  tailwindStylesheet: "./src/styles/globals.css",
};
