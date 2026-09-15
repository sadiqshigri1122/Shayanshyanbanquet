/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F4C75',
          hover: '#0A3555',
          light: '#1A5A8F',
          dark: '#0A3555',
        },
        secondary: {
          DEFAULT: '#3282B8',
          hover: '#2770A3',
          light: '#E8F4FC',
        },
        gold: {
          DEFAULT: '#3282B8',
          dark: '#2770A3',
          light: '#E8F4FC',
        },
        success: '#28A745',
        warning: '#FFC107',
        danger: '#DC3545',
        info: '#17A2B8',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
