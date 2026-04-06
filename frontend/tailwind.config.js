/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      colors: {
        'bg-deep': 'hsl(222, 47%, 11%)',
        'bg-surface': 'hsl(223, 35%, 15%)',
        'bg-surface-light': 'hsl(223, 30%, 20%)',

        primary: 'hsl(244, 75%, 65%)',
        secondary: 'hsl(199, 89%, 48%)',
        accent: 'hsl(262, 83%, 58%)',

        success: 'hsl(158, 64%, 52%)',
        warning: 'hsl(38, 92%, 50%)',
        danger: 'hsl(0, 84%, 60%)',

        'text-main': 'hsl(210, 40%, 98%)',
        'text-muted': 'hsl(215, 20%, 65%)',
        'text-dim': 'hsl(215, 15%, 45%)',

        'border-subtle': 'hsl(222, 30%, 25%)',
        'border-bright': 'hsl(222, 30%, 35%)',
      },
      borderRadius: {
        'lg': '24px',
        'md': '16px',
        'sm': '12px',
      },
      boxShadow: {
        'glow': '0 0 20px 0 hsla(244, 75%, 65%, 0.3)',
        'glow-danger': '0 0 20px 0 hsla(0, 84%, 60%, 0.3)',
        'glow-success': '0 0 20px 0 hsla(158, 64%, 52%, 0.3)',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'slide-up': 'slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
