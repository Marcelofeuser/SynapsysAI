/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // tokens espelhando o tema PsicoThera (teal primary, emerald accent)
        border: "hsl(210 15% 89%)",
        background: "hsl(210 20% 98%)",
        foreground: "hsl(210 40% 11%)",
        primary: {
          DEFAULT: "hsl(192 65% 35%)",
          foreground: "hsl(0 0% 100%)",
        },
        accent: {
          DEFAULT: "hsl(168 50% 42%)",
          foreground: "hsl(0 0% 100%)",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  corePlugins: {
    // Desabilita o reset global do Tailwind para não quebrar Landing/Pricing (CSS puro)
    preflight: false,
  },
  // Classes dinâmicas dos produtos (products.js) — listadas para não serem purgadas
  safelist: [
    // teal (PsicoThera)
    "bg-teal-50", "bg-teal-500", "bg-teal-600", "hover:bg-teal-100", "hover:bg-teal-700",
    "text-teal-700", "hover:text-teal-700", "border-teal-200", "border-teal-300", "hover:border-teal-300",
    "from-teal-500", "shadow-teal-200", "focus:border-teal-400", "focus-within:border-teal-400",
    "to-emerald-600",
    // pink/rose (Mavvê — futuro)
    "bg-pink-50", "bg-pink-500", "bg-pink-600", "hover:bg-pink-100", "hover:bg-pink-700",
    "text-pink-700", "hover:text-pink-700", "border-pink-200", "border-pink-300", "hover:border-pink-300",
    "from-pink-500", "shadow-pink-200", "focus:border-pink-400", "focus-within:border-pink-400",
    "to-rose-600",
    // purple/violet (InsightDisc — futuro)
    "bg-purple-50", "bg-purple-500", "bg-purple-600", "hover:bg-purple-100", "hover:bg-purple-700",
    "text-purple-700", "hover:text-purple-700", "border-purple-200", "border-purple-300", "hover:border-purple-300",
    "from-purple-500", "shadow-purple-200", "focus:border-purple-400", "focus-within:border-purple-400",
    "to-violet-600",
  ],
  plugins: [],
};
