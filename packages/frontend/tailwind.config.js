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
        flare: {
          primary: '#FF6B35',
          secondary: '#004E89',
          accent: '#1A659E',
        },
      },
    },
  },
  plugins: [],
}

