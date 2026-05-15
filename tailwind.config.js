/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette BGLift — bianco / nero / arancio
        brand: {
          white: '#ffffff',
          black: '#000000',
          orange: '#EC6726',
          orangeDark: '#c5511c',
          orangeLight: '#fde2d3',
        },
        // Alias semantici
        bg: '#ffffff',
        ink: '#000000',
        accent: {
          DEFAULT: '#EC6726',
          dark: '#c5511c',
        },
        // Stati di sicurezza (mantengono la lettura immediata in cantiere)
        safe: '#16a34a',
        warn: '#facc15',
        danger: '#dc2626',
        // Grigi neutri
        line: '#e5e5e5',
        muted: '#737373',
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Montserrat', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        sheet: '0 -8px 24px rgba(0,0,0,0.12)',
        panel: '0 2px 16px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
