/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          dark: 'var(--primary-dark)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          dark: 'var(--secondary-dark)',
        },
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      backgroundColor: {
        card: 'var(--card-bg)',
        input: 'var(--input-bg)',
        header: 'var(--header-bg)',
      },
      borderColor: {
        card: 'var(--card-border)',
        input: 'var(--input-border)',
        header: 'var(--header-border)',
      },
      textColor: {
        nav: {
          active: 'var(--nav-active)',
          inactive: 'var(--nav-inactive)',
        },
      },
    },
  },
  plugins: [],
} 