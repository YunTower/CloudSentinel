import tailwindcssPrimeui from 'tailwindcss-primeui'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '.p-dark'],
  theme: {
    extend: {},
  },
  plugins: [
    tailwindcssPrimeui
  ],
}
