import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	container: {
  		center: true,
  		padding: "2rem",
  		screens: {
  			"2xl": "1400px",
  		},
  	},
  	extend: {
  		colors: {
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
  				foreground: 'hsl(var(--primary-foreground))',
  				50: 'hsl(var(--primary-50))',
  				100: 'hsl(var(--primary-100))',
  				200: 'hsl(var(--primary-200))',
  				300: 'hsl(var(--primary-300))',
  				400: 'hsl(var(--primary-400))',
  				500: 'hsl(var(--primary))',
  				600: 'hsl(var(--primary-600))',
  				700: 'hsl(var(--primary-700))',
  				800: 'hsl(var(--primary-800))',
  				900: 'hsl(var(--primary-900))',
  				950: 'hsl(var(--primary-950))',
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
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))'
  			},
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xs: 'calc(var(--radius) - 6px)',
  		},
  		fontFamily: {
  			sans: ["var(--font-sans)", ...fontFamily.sans],
  			mono: ["var(--font-mono)", ...fontFamily.mono],
  		},
  		fontSize: {
  			'2xs': ['0.625rem', { lineHeight: '0.75rem' }],
  		},
  		spacing: {
  			'18': '4.5rem',
  			'88': '22rem',
  			'128': '32rem',
  		},
  		maxWidth: {
  			'8xl': '88rem',
  			'9xl': '96rem',
  		},
  		minHeight: {
  			'96': '24rem',
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.2s ease-in-out',
  			'fade-out': 'fade-out 0.2s ease-in-out',
  			'slide-in': 'slide-in 0.2s ease-out',
  			'slide-out': 'slide-out 0.2s ease-out',
  			'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite',
  			'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
  			'shimmer': 'shimmer 2s linear infinite',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-in': {
  				from: { opacity: '0' },
  				to: { opacity: '1' }
  			},
  			'fade-out': {
  				from: { opacity: '1' },
  				to: { opacity: '0' }
  			},
  			'slide-in': {
  				from: { transform: 'translateX(-100%)' },
  				to: { transform: 'translateX(0)' }
  			},
  			'slide-out': {
  				from: { transform: 'translateX(0)' },
  				to: { transform: 'translateX(-100%)' }
  			},
  			'bounce-subtle': {
  				'0%, 100%': { transform: 'translateY(-2%)' },
  				'50%': { transform: 'translateY(0)' }
  			},
  			'pulse-subtle': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.8' }
  			},
  			'shimmer': {
  				from: { backgroundPosition: '0 0' },
  				to: { backgroundPosition: '-200% 0' }
  			},
  		},
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
  			'shimmer': 'linear-gradient(110deg, transparent 40%, rgba(255, 255, 255, 0.5) 50%, transparent 60%)',
  		},
  		boxShadow: {
  			'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
  			'medium': '0 4px 12px rgba(0, 0, 0, 0.08)',
  			'strong': '0 8px 32px rgba(0, 0, 0, 0.12)',
  			'glow': '0 0 20px rgba(59, 130, 246, 0.15)',
  			'inner-soft': 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
  		},
  		backdropBlur: {
  			xs: '2px',
  		},
  		transitionTimingFunction: {
  			'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  			'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
  		},
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    // Add custom plugin for enhanced utilities
    function({ addUtilities }: any) {
      const newUtilities = {
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'hsl(var(--border)) transparent',
        },
        '.scrollbar-webkit': {
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'hsl(var(--border))',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'hsl(var(--border) / 0.8)',
          },
        },
        '.text-balance': {
          'text-wrap': 'balance',
        },
      }
      addUtilities(newUtilities)
    }
  ],
};
export default config;
