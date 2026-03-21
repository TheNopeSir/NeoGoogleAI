/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
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
        // WinXP Luna theme colors
        'xp-blue':    '#245DDA',
        'xp-navy':    '#003C74',
        'xp-bg':      '#ECE9D8',
        'xp-surface': '#F5F4F0',
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
      dropShadow: {
        'neon-green':  ['0 0 3px #4ade80', '0 0 8px #4ade8055'],
        'neon-lime':   ['0 0 3px #00ff00', '0 0 10px #00ff0066'],
        'neon-yellow': ['0 0 3px #fbbf24', '0 0 8px #fbbf2455'],
        'neon-red':    ['0 0 3px #f87171', '0 0 8px #f8717155'],
        'neon-blue':   ['0 0 3px #60a5fa', '0 0 8px #60a5fa55'],
        'neon-purple': ['0 0 3px #a78bfa', '0 0 8px #a78bfa55'],
        'neon-pink':   ['0 0 3px #f472b6', '0 0 8px #f472b655'],
        'neon-cyan':   ['0 0 3px #22d3ee', '0 0 8px #22d3ee55'],
        'neon-orange': ['0 0 3px #fb923c', '0 0 8px #fb923c55'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 15s linear infinite',
        'card-flip': 'cardFlipHearth 1.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
      keyframes: {
        scanline: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        cardFlipHearth: {
          '0%':   { transform: 'perspective(900px) rotateY(0deg)   scale(0.72)', filter: 'brightness(0.85)' },
          '30%':  { transform: 'perspective(900px) rotateY(90deg)  scale(0.98)', filter: 'brightness(2.0)' },
          '50%':  { transform: 'perspective(900px) rotateY(180deg) scale(1.12)', filter: 'brightness(2.4)' },
          '70%':  { transform: 'perspective(900px) rotateY(270deg) scale(0.98)', filter: 'brightness(2.0)' },
          '100%': { transform: 'perspective(900px) rotateY(360deg) scale(1.0)',  filter: 'brightness(1)' },
        },
      }
    },
  },
  plugins: [],
}