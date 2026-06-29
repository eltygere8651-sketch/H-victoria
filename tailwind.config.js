/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-red-600', 'text-white', 'shadow-red-200', 'shadow-red-900',
    'bg-amber-500', 'shadow-amber-200',
    'bg-blue-500', 'shadow-blue-200',
    'bg-gray-500', 'bg-gray-300',
    'bg-green-600', 'shadow-green-200',
    'border-red-600', 'border-amber-500', 'border-blue-500', 'border-gray-300',
    'text-red-600', 'text-amber-600', 'text-blue-600',
    'animate-shake', 'animate-pop-in', 'animate-slide-up', 'animate-fade-in',
    'shadow-neon', 'shadow-dock', 'shadow-dock-dark'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        red: {
          50: '#fbf9f1',
          100: '#f5efe0',
          200: '#eadbc0',
          300: '#dbc099',
          400: '#cba16b',
          500: '#bd8644',
          600: '#b06f36',
          700: '#93562d',
          800: '#784628',
          900: '#613a23',
          950: '#371e10',
        },
        slate: {
          850: '#1e293b',
          950: '#0a0f1e',
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
        // Defined in CSS now for safety, but kept here for IntelliSense
        'pop-in': '0 15px 40px -8px rgba(0,0,0,0.25)',
        'neon': '0 0 15px rgba(220, 38, 38, 0.5), 0 0 30px rgba(220, 38, 38, 0.3)',
        'dock': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'dock-dark': '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pop-in': 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'shake': 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both',
      },
      keyframes: {
        popIn: {
          '0%': { transform: 'scale(0.95) translateY(10px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        slideUp: {
           '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%, 85%': { transform: 'translateX(-4px)' },
          '30%, 70%': { transform: 'translateX(4px)' },
          '45%, 55%': { transform: 'translateX(-2px)' },
        }
      }
    },
  },
  plugins: [],
}