/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { inter: ["Inter", "sans-serif"], sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        border: "hsl(var(--ps-border))",
        input: "hsl(var(--ps-input))",
        ring: "hsl(var(--ps-ring))",
        background: "hsl(var(--ps-background))",
        foreground: "hsl(var(--ps-foreground))",
        primary: { DEFAULT: "hsl(var(--ps-primary))", foreground: "hsl(var(--ps-primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--ps-secondary))", foreground: "hsl(var(--ps-secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--ps-muted))", foreground: "hsl(var(--ps-muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--ps-accent))", foreground: "hsl(var(--ps-accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--ps-destructive))", foreground: "hsl(var(--ps-destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--ps-card))", foreground: "hsl(var(--ps-card-foreground))" },
        sidebar: {
          DEFAULT: "hsl(var(--ps-sidebar-background))",
          foreground: "hsl(var(--ps-sidebar-foreground))",
          primary: "hsl(var(--ps-sidebar-primary))",
          "primary-foreground": "hsl(var(--ps-sidebar-primary-foreground))",
          accent: "hsl(var(--ps-sidebar-accent))",
          "accent-foreground": "hsl(var(--ps-sidebar-accent-foreground))",
          border: "hsl(var(--ps-sidebar-border))",
        },
      },
      borderRadius: { lg: "var(--ps-radius)", md: "calc(var(--ps-radius) - 2px)", sm: "calc(var(--ps-radius) - 4px)" },
    },
  },
  corePlugins: { preflight: false },
  safelist: [
    "bg-primary", "text-primary", "text-primary-foreground", "hover:bg-primary/90",
    "bg-accent", "text-accent", "bg-card", "text-card-foreground", "text-muted-foreground",
    "bg-sidebar", "text-sidebar-foreground", "bg-sidebar-primary", "text-sidebar-primary-foreground",
    "bg-sidebar-accent", "text-sidebar-accent-foreground", "border-sidebar-border",
    "border-border", "bg-background", "text-foreground",
  ],
  plugins: [],
};
