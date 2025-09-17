/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  		  // Clean Modern Color Palette
  		  primary: {
  		    50: '#eff6ff',
  		    100: '#dbeafe',
  		    200: '#bfdbfe',
  		    300: '#93c5fd',
  		    400: '#60a5fa',
  		    500: '#3b82f6',
  		    600: '#2563eb',
  		    700: '#1d4ed8',
  		    800: '#1e40af',
  		    900: '#1e3a8a',
  		  },
  		  gray: {
  		    50: '#f8fafc',
  		    100: '#f1f5f9',
  		    200: '#e2e8f0',
  		    300: '#cbd5e1',
  		    400: '#94a3b8',
  		    500: '#64748b',
  		    600: '#475569',
  		    700: '#334155',
  		    800: '#1e293b',
  		    900: '#0f172a',
  		  },
  		  success: {
  		    50: '#f0fdf4',
  		    100: '#dcfce7',
  		    200: '#bbf7d0',
  		    300: '#86efac',
  		    400: '#4ade80',
  		    500: '#22c55e',
  		    600: '#16a34a',
  		    700: '#15803d',
  		    800: '#166534',
  		    900: '#14532d',
  		  },
  		  warning: {
  		    50: '#fffbeb',
  		    100: '#fef3c7',
  		    200: '#fde68a',
  		    300: '#fcd34d',
  		    400: '#fbbf24',
  		    500: '#f59e0b',
  		    600: '#d97706',
  		    700: '#b45309',
  		    800: '#92400e',
  		    900: '#78350f',
  		  },
  		  error: {
  		    50: '#fef2f2',
  		    100: '#fee2e2',
  		    200: '#fecaca',
  		    300: '#fca5a5',
  		    400: '#f87171',
  		    500: '#ef4444',
  		    600: '#dc2626',
  		    700: '#b91c1c',
  		    800: '#991b1b',
  		    900: '#7f1d1d',
  		  },
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  			mono: ['JetBrains Mono', 'Courier New', 'monospace'],
  		},
  		fontSize: {
  			'display': ['clamp(2rem, 5vw, 4rem)', { lineHeight: '1.1', fontWeight: '700' }],
  			'heading-1': ['clamp(1.5rem, 4vw, 2.5rem)', { lineHeight: '1.2', fontWeight: '600' }],
  			'heading-2': ['clamp(1.25rem, 3vw, 2rem)', { lineHeight: '1.2', fontWeight: '600' }],
  			'heading-3': ['clamp(1.125rem, 2.5vw, 1.5rem)', { lineHeight: '1.2', fontWeight: '600' }],
  			'body-large': ['1.125rem', { lineHeight: '1.75' }],
  			'body': ['1rem', { lineHeight: '1.6' }],
  			'body-small': ['0.875rem', { lineHeight: '1.5' }],
  			'caption': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.05em' }],
  		},
  		boxShadow: {
  			'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  			'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  			'medium': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  			'strong': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  			'glow': '0 0 20px rgba(102, 126, 234, 0.15)',
  			'glow-success': '0 0 20px rgba(34, 197, 94, 0.15)',
  			'glow-warning': '0 0 20px rgba(251, 191, 36, 0.15)',
  			'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  		},
  		animation: {
  			'fade-in': 'fadeIn 0.5s ease-in-out',
  			'slide-up': 'slideUp 0.3s ease-out',
  			'slide-down': 'slideDown 0.3s ease-out',
  			'scale-in': 'scaleIn 0.2s ease-out',
  			'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': { opacity: '0' },
  				'100%': { opacity: '1' },
  			},
  			slideUp: {
  				'0%': { transform: 'translateY(10px)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' },
  			},
  			slideDown: {
  				'0%': { transform: 'translateY(-10px)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' },
  			},
  			scaleIn: {
  				'0%': { transform: 'scale(0.95)', opacity: '0' },
  				'100%': { transform: 'scale(1)', opacity: '1' },
  			},
  			bounceSubtle: {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-2px)' },
  			},
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}