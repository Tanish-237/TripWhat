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
        border: "var(--border)",
        accent: "var(--accent)",
        "success-bg": "var(--success-bg)",
        "success-border": "var(--success-border)",
        "success-text": "var(--success-text)",
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2rem': '2rem',
        '4rem': '4rem',
        '1.25rem': '1.25rem',
        'xl': '0.75rem',
        'lg': '0.5rem',
        'md': '0.375rem',
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px 0 rgba(0,0,0,0.02)',
        'soft-hover': '0 4px 12px -2px rgba(0,0,0,0.06)',
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "widget-mount": "widgetMount 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        widgetMount: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
