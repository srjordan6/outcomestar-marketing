/** @type {import("tailwindcss").Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0a0e27",
          900: "#13183a",
          800: "#201868",
        },
        flame: "#F07800",
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};