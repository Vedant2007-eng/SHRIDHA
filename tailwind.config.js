/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hospital: {
          bg: '#0F0607',
          dark: '#17090B',
          darker: '#0B0304',
          card: 'rgba(38, 14, 18, 0.65)',
          cardHover: 'rgba(56, 18, 24, 0.85)',
          burgundy: '#3B0E14',
          crimson: '#8C1D28',
          accent: '#E63946',
          accentGlow: '#FF4D5E',
          warm: '#FF6B4A',
          amber: '#F4A261',
          gold: '#E9C46A',
          border: 'rgba(230, 57, 70, 0.25)',
          borderHover: 'rgba(255, 77, 94, 0.6)',
          textMuted: '#B89B9E',
          textLight: '#F5E6E8',
        }
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(230, 57, 70, 0.25)',
        'glow-md': '0 0 30px rgba(230, 57, 70, 0.35)',
        'glow-lg': '0 0 50px rgba(230, 57, 70, 0.45)',
        'glow-warm': '0 0 35px rgba(255, 107, 74, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(circle at 50% 20%, rgba(140, 29, 40, 0.35), rgba(15, 6, 7, 0.98) 75%)',
        'subtle-grid': 'linear-gradient(to right, rgba(230, 57, 70, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(230, 57, 70, 0.04) 1px, transparent 1px)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ripple': 'ripple 2s linear infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '50%': { transform: 'scale(1.25)', opacity: '0.3' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
