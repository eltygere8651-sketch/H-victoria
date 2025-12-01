/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        slate: {
          850: '#1e293b', // A custom intermediate dark color
          950: '#0a0f1e', // A deeper dark for backgrounds
        }
      },
      boxShadow: {
        'soft': '0 4px_20px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 15px rgba(220, 38, 38, 0.3)', 
        'card-soft': '0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 15px -2px rgba(0, 0, 0, 0.02)',
        'card-dark': '0 10px 30px -5px rgba(0, 0, 0, 0.3), 0 4px 15px -2px rgba(0, 0, 0, 0.1)',
        'button-red': '0 8px 20px -6px rgba(220, 38, 38, 0.5)',
        'button-green': '0 8px 20px -6px rgba(34, 197, 94, 0.5)',
        'button-blue': '0 8px 20px -6px rgba(59, 130, 246, 0.5)',
        'pop-in': '0 15px 40px -8px rgba(0,0,0,0.25)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.95) translateY(10px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        'slide-up': {
           '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        'pop-in': 'pop-in 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.3s ease-out forwards',
        'fade-in': 'fade-in 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
}