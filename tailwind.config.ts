import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mega: {
          bg: '#0D1117',
          surface: '#161B22',
          card: '#1C2333',
          accent: '#00D4FF',
          green: '#00C853',
          red: '#FF1744',
          warning: '#FFD600',
          text: '#E6EDF3',
          secondary: '#8B949E',
          muted: '#484F58',
          border: '#30363D',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
