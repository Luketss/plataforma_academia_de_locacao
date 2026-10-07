/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // Cores vêm das variáveis de tema (src/styles/theme.css): trocar o tema
      // re-pinta tudo sem tocar nos componentes.
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        text: "var(--text)",
        dim: "var(--text-dim)",
        mute: "var(--text-mute)",
        brand: "var(--brand)",
        "brand-soft": "var(--brand-soft)",
        "brand-ink": "var(--brand-ink)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        ok: "var(--ok)",
        "ok-soft": "var(--ok-soft)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
    },
  },
  plugins: [],
};
