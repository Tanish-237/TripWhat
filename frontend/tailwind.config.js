/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        sage: "var(--sage)",
        lavender: "var(--lavender)",
        peach: "var(--peach)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        surface: "var(--surface)",
      },
      fontFamily: {
        sans: ['"Outfit"', 'system-ui', 'sans-serif'],
        accent: ['"Reenie Beanie"', 'cursive'],
      },
      borderRadius: {
        '2rem': '2rem',
        '4rem': '4rem',
        '1.25rem': '1.25rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0,0,0,0.05)',
        'soft-hover': '0 8px 30px -4px rgba(0,0,0,0.08)',
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease-out",
        "slide-up": "slideUp 0.8s ease-out",
        "widget-mount": "widgetMount 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(30px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        widgetMount: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
