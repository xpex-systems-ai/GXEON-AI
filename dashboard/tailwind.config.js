/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        neon: {
          DEFAULT: '#00ffcc',
          dark: '#00ccaa',
          light: '#66ffdd',
        },
        dark: {
          900: '#050505',
          800: '#0a0a0a',
          700: '#12121a',
          600: '#1a1a25',
          500: '#252535',
        },
        gold: {
          DEFAULT: '#FFD700',
          dark: '#CCAA00',
          light: '#FFE44D',
        },
        cyan: {
          DEFAULT: '#00E5FF',
          dark: '#00B8CC',
          light: '#4DEAFF',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00ffcc, 0 0 10px #00ffcc' },
          '100%': { boxShadow: '0 0 20px #00ffcc, 0 0 30px #00ffcc' },
        }
      }
    },
  },
  plugins: [],
}
