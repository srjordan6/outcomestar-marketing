/** @type {import("tailwindcss").Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        "srj-navy":        "#201868",
        "srj-orange":      "#F07800",
        "srj-gray":        "#7A8A9E",
        "srj-navy-dark":   "#160F4A",
        "srj-orange-dark": "#C46300",
        "srj-gray-light":  "#E3E7ED",
        "srj-gray-dark":   "#4A5563",
      },
      fontFamily: {
        headline: ["Lora", "Georgia", "serif"],
        body: ["Poppins", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};