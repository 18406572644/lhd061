/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kraft: {
          50: '#faf5ed',
          100: '#f5ead4',
          200: '#ead3a8',
          300: '#dcb573',
          400: '#c99447',
          500: '#b97b33',
          600: '#a6632a',
          700: '#8a4d26',
          800: '#703f27',
          900: '#5c3423',
          950: '#321a10',
        },
        navy: {
          50: '#f0f4fb',
          100: '#dde7f7',
          200: '#c3d5f1',
          300: '#9cb9e7',
          400: '#6e93d9',
          500: '#4d72ca',
          600: '#3a59bb',
          700: '#2e46a0',
          800: '#1a2c52',
          900: '#0f1e3d',
          950: '#0a1429',
        },
        postred: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#450a0a',
        }
      },
      fontFamily: {
        'handwriting': ['Caveat', 'cursive'],
        'script': ['Dancing Script', 'cursive'],
        'vibes': ['Great Vibes', 'cursive'],
        'brush': ['Ma Shan Zheng', 'cursive'],
        'serif-sc': ['Noto Serif SC', 'serif'],
        'pacifico': ['Pacifico', 'cursive'],
        'playfair': ['Playfair Display', 'serif'],
        'kuaile': ['ZCOOL KuaiLe', 'cursive'],
      },
      boxShadow: {
        'vintage': '4px 4px 0px rgba(26, 44, 82, 0.3), 0 10px 30px rgba(0,0,0,0.15)',
        'stamp': '2px 2px 0px rgba(0,0,0,0.1), inset 0 0 20px rgba(0,0,0,0.05)',
      },
      backgroundImage: {
        'paper-texture': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.7 0 0 0 0 0.55 0 0 0 0 0.35 0 0 0 0.12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }
    },
  },
  plugins: [],
}
