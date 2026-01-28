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
          bg: 'rgb(250, 247, 242)',
          card: '#ffffff',
          purple: 'rgb(128, 77, 179)',
          accent: '#000000',
          text: '#1a1a1a',
          'text-secondary': 'rgb(128, 128, 128)',
          'text-tertiary': 'rgb(153, 153, 153)',
          surface: 'rgb(245, 242, 237)',
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
        display: ['Georgia', 'serif'],
        sans: [
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
        'seeya': '12px',
        'seeya-lg': '16px',
        'seeya-xl': '24px',
      },
      boxShadow: {
        'seeya': '0 2px 8px rgba(0, 0, 0, 0.05)',
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
