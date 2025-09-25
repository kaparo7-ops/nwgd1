import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px"
      }
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0057B8",
          foreground: "#FFFFFF"
        },
        secondary: {
          DEFAULT: "#00A19A",
          foreground: "#062B2A"
        },
        accent: {
          DEFAULT: "#F27F0C",
          foreground: "#311200"
        },
        muted: {
          DEFAULT: "#F5F7FA",
          foreground: "#4A5568"
        },
        destructive: {
          DEFAULT: "#E53E3E",
          foreground: "#FFFFFF"
        },
        border: "#E2E8F0",
        background: "#FFFFFF",
        ring: "#0057B8"
      },
      fontFamily: {
        sans: ["'Cairo'", "'Inter'", "system-ui", "sans-serif"],
        display: ["'Tajawal'", "'Inter'", "system-ui", "sans-serif"]
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem"
      },
      borderRadius: {
        xl: "1.5rem"
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(15, 23, 42, 0.25)",
        outline: "0 0 0 3px rgba(0, 87, 184, 0.35)"
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        shimmer: "shimmer 1.8s linear infinite"
      }
    }
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("rtl", "&[dir='rtl'] *");
      addVariant("ltr", "&[dir='ltr'] *");
    })
  ]
};

export default config;
