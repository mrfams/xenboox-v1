// CJS Tailwind config.
//
// Deliberately NOT a TypeScript module: the config body calls
// `require("tailwindcss-animate")`, which throws "require is not defined" when
// Next/Tailwind loads a .ts config through the ESM path. A .cjs config is
// always loaded via require(), so dev and build are deterministic.
/** @type {import("tailwindcss").Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "ledger-ink": {
          DEFAULT: "hsl(var(--ledger-ink))",
          2: "hsl(var(--ledger-ink-2))",
          3: "hsl(var(--ledger-ink-3))",
        },
        paper: {
          DEFAULT: "hsl(var(--paper))",
          2: "hsl(var(--paper-2))",
          3: "hsl(var(--paper-3))",
        },
        "balanced-green": {
          DEFAULT: "hsl(var(--balanced-green))",
          bg: "hsl(var(--balanced-green-bg))",
          muted: "hsl(var(--balanced-green-muted))",
        },
        "attention-amber": {
          DEFAULT: "hsl(var(--attention-amber))",
          bg: "hsl(var(--attention-amber-bg))",
          muted: "hsl(var(--attention-amber-muted))",
        },
        "error-clay": {
          DEFAULT: "hsl(var(--error-clay))",
          bg: "hsl(var(--error-clay-bg))",
          muted: "hsl(var(--error-clay-muted))",
        },
        "signal-indigo": {
          DEFAULT: "hsl(var(--signal-indigo))",
          hover: "hsl(var(--signal-indigo-hover))",
          bg: "hsl(var(--signal-indigo-bg))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          outline: "hsl(var(--secondary-outline))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          bg: "hsl(var(--success-bg))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          bg: "hsl(var(--warning-bg))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1px)",
        sm: "calc(var(--radius) - 2px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SF Mono",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        caption: ["12px", { lineHeight: "1.4" }],
        body: ["14px", { lineHeight: "1.5" }],
        "body-lg": ["16px", { lineHeight: "1.5" }],
        h4: ["20px", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["24px", { lineHeight: "1.25", fontWeight: "600" }],
        h2: [
          "32px",
          { lineHeight: "1.2", fontWeight: "600", letterSpacing: "-0.02em" },
        ],
        h1: [
          "48px",
          { lineHeight: "1.15", fontWeight: "600", letterSpacing: "-0.02em" },
        ],
      },
      boxShadow: {
        elevated: "0 4px 16px rgba(20,33,61,0.08)",
      },
      animation: {
        "balance-draw": "balance-draw 400ms ease-out forwards",
        "balance-appear": "balance-check-appear 300ms ease-out 400ms forwards",
        gradient: "gradient 8s ease infinite",
        "gradient-slow": "gradient 15s ease infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        "marquee-reverse": "marquee 40s linear infinite reverse",
        shimmer: "shimmer 2s linear infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "spin-slow": "spin 20s linear infinite",
      },
      keyframes: {
        "balance-draw": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "balance-check-appear": {
          from: { opacity: "0", transform: "scale(0.5)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(59, 130, 246, 0.6)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
