/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./frontend/index.html",
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FF5701', // Vibrant Orange from logo "AI"
          50: '#fff3ee',
          100: '#ffe3d5',
          200: '#ffc3a6',
          300: '#ff9a6d',
          400: '#ff662b',
          500: '#FF5701',
          600: '#f03f00',
          700: '#c82c00',
          800: '#9f2508',
          900: '#80220a',
          950: '#450e03',
        },
        dark: {
          bg: '#09090b', // Deep sleek dark background
          card: '#121214',
          border: '#27272a',
          text: '#fafafa',
          muted: '#a1a1aa'
        },
        light: {
          bg: '#ffffff', // Crisp white background
          card: '#fafafa',
          border: '#e4e4e7',
          text: '#09090b',
          muted: '#71717a'
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      boxShadow: {
        'brand': '0 4px 14px 0 rgba(255, 87, 1, 0.25)',
        'card': '0 4px 24px -4px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
