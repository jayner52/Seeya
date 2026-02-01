import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        seeya: {
          primary: '#FCEE2C',           // Yellow - Primary CTA
          secondary: '#D8C3F4',         // Lavender - Secondary accent
          bg: 'rgb(250, 247, 242)',     // Warm cream background
          card: '#F6F4EE',              // Beige card background
          purple: 'rgb(128, 77, 179)',  // Legacy purple
          accent: '#000000',
          text: '#1a1a1a',
          'text-secondary': '#666666',
          'text-tertiary': 'rgb(153, 153, 153)',
          surface: 'rgb(245, 242, 237)',
          border: '#E7E2DA',            // Warm gray border
          success: '#22c55e',
          warning: '#f97316',
          error: '#ef4444',
        },
        continent: {
          europe: 'rgb(51, 102, 179)',
          asia: 'rgb(204, 77, 77)',
          'north-america': 'rgb(77, 153, 102)',
          'south-america': 'rgb(230, 153, 51)',
          africa: 'rgb(179, 128, 51)',
          oceania: 'rgb(102, 179, 204)',
          antarctica: 'rgb(128, 153, 204)',
        },
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
        sans: [
          'var(--font-inter)',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'sans-serif',
        ],
      },
      borderRadius: {
        'seeya': '16px',          // Base radius (was 12px)
        'seeya-lg': '16px',       // Large radius
        'seeya-xl': '24px',
        'seeya-button': '14px',   // Button radius
        'seeya-input': '12px',    // Input radius
        'seeya-card': '16px',     // Card radius
      },
      boxShadow: {
        'seeya': '0px 8px 30px -8px rgba(0, 0, 0, 0.1)',  // Updated to spec
        'seeya-lg': '0 4px 16px rgba(0, 0, 0, 0.1)',
        'seeya-xl': '0 20px 60px rgba(0, 0, 0, 0.15)',
      },
      spacing: {
        'seeya-xxs': '4px',
        'seeya-xs': '8px',
        'seeya-sm': '12px',
        'seeya-md': '16px',
        'seeya-lg': '24px',
        'seeya-xl': '32px',
        'seeya-xxl': '48px',
      },
    },
  },
  plugins: [],
}

export default config
