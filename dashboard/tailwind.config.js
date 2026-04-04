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
          DEFAULT: '#00FFE0',
          dark: '#00CCB3',
          light: '#66FFF0',
          glow: '#00FFE0',
        },
        cyber: {
          black: '#0a0a0f',
          dark: '#12121a',
          panel: '#1a1a25',
          border: '#252535',
          text: '#e0e0e0',
          muted: '#888899',
        },
        dark: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#252535',
          500: '#333344',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00FFE0, 0 0 10px #00FFE0' },
          '100%': { boxShadow: '0 0 20px #00FFE0, 0 0 30px #00FFE0, 0 0 40px #00FFE0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
