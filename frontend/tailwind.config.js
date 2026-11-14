/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          "system-ui",
          "sans-serif"
        ],
      },
      colors: {
        apple: {
          blue: "#007AFF",
          green: "#34C759",
          red: "#FF3B30",
          orange: "#FF9500",
          yellow: "#FFCC00",
          purple: "#AF52DE",
          teal: "#30B0C7",
          mint: "#00C7BE",
          cyan: "#32ADE6",
          gray: {
            1: "#8E8E93",
            2: "#AEAEB2",
            3: "#C7C7CC",
            4: "#D1D1D6",
            5: "#E5E5EA",
            6: "#F2F2F7",
          },
          dark: {
            bg: "#000000",
            card: "#1C1C1E",
            elevated: "#2C2C2E",
            border: "rgba(255, 255, 255, 0.12)",
          },
          light: {
            bg: "#F2F2F7",
            card: "#FFFFFF",
            elevated: "#F9F9FB",
            border: "rgba(60, 60, 67, 0.14)",
          }
        }
      },
      borderRadius: {
        'apple-sm': '10px',
        'apple': '14px',
        'apple-lg': '20px',
        'apple-xl': '28px',
      },
      boxShadow: {
        'apple-card': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'apple-sheet': '0 -8px 30px rgba(0, 0, 0, 0.12)',
        'apple-active': '0 1px 3px rgba(0, 0, 0, 0.08)',
      },
      transitionTimingFunction: {
        'apple-spring': 'cubic-bezier(0.19, 1, 0.22, 1)',
        'apple-crit': 'cubic-bezier(0.25, 1, 0.5, 1)',
      }
    },
  },
  plugins: [],
}
