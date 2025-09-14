/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        'background-alt': 'var(--background-alt)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          50: 'var(--primary-50)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
          hover: 'var(--card-hover)',
          secondary: 'var(--card-secondary)',
        },
        border: 'var(--border)',
        success: 'var(--success)',
        destructive: 'var(--error)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 50%, var(--accent) 100%)',
        'gradient-secondary': 'linear-gradient(135deg, var(--secondary) 0%, var(--accent) 100%)',
      },
      fontFamily: {
        'heading': ['var(--font-heading)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      perspective: {
        '1000': '1000px',
      },
      transformStyle: {
        'preserve-3d': 'preserve-3d',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    function({ addUtilities }) {
      addUtilities({
        '.glass-card': {
          '@apply bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl': {},
          'background': 'linear-gradient(135deg, rgba(17, 19, 24, 0.8) 0%, rgba(26, 29, 35, 0.8) 100%)',
          'box-shadow': 'var(--shadow-lg)',
        },
        '.glass-card-hover': {
          '@apply glass-card transition-all duration-300 ease-out': {},
        },
        '.glass-card-hover:hover': {
          '@apply shadow-xl scale-[1.02]': {},
          'box-shadow': 'var(--shadow-glow)',
        },
        '.elevated-card': {
          '@apply bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg': {},
          'background': 'linear-gradient(135deg, rgba(17, 19, 24, 0.9) 0%, rgba(26, 29, 35, 0.9) 100%)',
          'box-shadow': 'var(--shadow-lg)',
        },
      })
    }
  ],
};
