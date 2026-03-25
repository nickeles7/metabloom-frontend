import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        sm: "576px",
        md: "768px",
        lg: "992px",
        xl: "1200px",
        xxl: "1400px",
        "3xl": "1600px",
        "4xl": "1800px",
      },
      colors: {
        // Modern dark theme with warmer, more sophisticated colors
        n0: "#0F1419", // Deep navy-slate background - warmer than pure black
        n30: "#F8FAFC", // Clean white for text
        lightN30: "#475569", // Warmer mid-tone
        lightBg1: "#1E293B", // Warmer surface color
        n100: "#94A3B8", // Softer gray
        n200: "#64748B", // Balanced gray
        n300: "#475569", // Medium gray
        n400: "#334155", // Darker gray
        lightN400: "#CBD5E1", // Light gray
        n500: "#1E293B", // Surface color
        n700: "#0F172A", // Very dark surface

        // Modern, sophisticated color palette
        primaryColor: "#6366F1", // Softer indigo - easier on eyes
        secondaryColor: "#8B5CF6", // Muted purple
        errorColor: "#EF4444", // Softer red
        warningColor: "#F59E0B", // Warmer amber
        successColor: "#10B981", // Softer emerald
        infoColor: "#06B6D4", // Softer cyan
      },
      padding: {
        "25": "100px",
        "30": "120px",
        "15": "60px",
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
} satisfies Config;
