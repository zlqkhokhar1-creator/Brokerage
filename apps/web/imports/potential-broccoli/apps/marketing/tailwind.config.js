/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1280px',
			},
		},
		extend: {
			colors: {
				// InvestPro Brand Colors
				primary: {
					DEFAULT: '#0A2540', // Deep Navy
					foreground: '#FFFFFF',
				},
				secondary: {
					DEFAULT: '#00D09C', // Growth Green
					foreground: '#FFFFFF',
				},
				accent: {
					DEFAULT: '#16FFB9', // Bright Green
					foreground: '#0A2540',
				},
				background: {
					DEFAULT: '#FFFFFF', // Pure White
					alt: '#F6F9FC', // Off-White
				},
				foreground: '#1A1F36', // Ink
				muted: {
					DEFAULT: '#525F7F', // Slate
					foreground: '#1A1F36',
				},
				border: '#E6EBF1', // Light Grey
				input: '#E6EBF1',
				ring: '#00D09C',
				destructive: {
					DEFAULT: '#FF4D4F', // Error Red
					foreground: '#FFFFFF',
				},
				success: {
					DEFAULT: '#04B68D', // Success Green
					foreground: '#FFFFFF',
				},
				popover: {
					DEFAULT: '#FFFFFF',
					foreground: '#1A1F36',
				},
				card: {
					DEFAULT: '#FFFFFF',
					foreground: '#1A1F36',
				},
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				heading: ['Manrope', 'system-ui', 'sans-serif'],
			},
			fontSize: {
				'xs': ['0.75rem', { lineHeight: '1.4' }],
				'sm': ['0.875rem', { lineHeight: '1.5' }],
				'base': ['1rem', { lineHeight: '1.7' }],
				'lg': ['1.125rem', { lineHeight: '1.6' }],
				'xl': ['1.25rem', { lineHeight: '1.5' }],
				'2xl': ['1.75rem', { lineHeight: '1.4' }],
				'3xl': ['2.5rem', { lineHeight: '1.3' }],
				'4xl': ['3.5rem', { lineHeight: '1.2' }],
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
				'128': '32rem',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				'slide-up': {
					'0%': { opacity: '0', transform: 'translateY(40px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.6s ease-out',
				'slide-up': 'slide-up 0.8s ease-out',
			},
		},
	},
	plugins: [
		require('tailwindcss-animate'),
		function({ addUtilities }) {
			addUtilities({
				'.bg-gradient-primary': {
					background: 'linear-gradient(135deg, #0A2540 0%, #1A365D 100%)',
				},
				'.bg-gradient-secondary': {
					background: 'linear-gradient(135deg, #00D09C 0%, #16FFB9 100%)',
				},
			});
		}
	],
}
