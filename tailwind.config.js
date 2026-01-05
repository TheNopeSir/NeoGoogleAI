/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg': '#09090b',
        'dark-surface': '#18181b',
        'dark-primary': '#4ade80',
        'dark-secondary': '#22c55e',
        'dark-dim': '#3f3f46',
        'light-bg': '#e5e7eb',
        'light-surface': '#f3f4f6',
        'light-primary': '#111827',
        'light-accent': '#059669',
        'light-dim': '#9ca3af',
        // Winamp authentic colors
        'wa-base': '#292929',
        'wa-gray': '#DCDCDC',
        'wa-dark': '#1a1a1a',
        'wa-green': '#00EA00',
        'wa-gold': '#FFD700',
        'wa-blue-dark': '#000040',
        'wa-blue-light': '#0000A0',
      },
      fontFamily: {
        'mono': ['"Exo 2"', 'monospace'], 
        'pixel': ['"Orbitron"', 'sans-serif'],
        'sans': ['"Exo 2"', 'sans-serif'],
        'winamp': ['"VT323"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 15s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}