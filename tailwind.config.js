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
        oxton: {
          bg: '#f0f3ff',
          card: '#ffffff',
          sidebarStart: '#1d4ed8',
          sidebarMid: '#4338ca',
          sidebarEnd: '#6d28d9',
          purpleAccent: '#7c3aed',
          blueAccent: '#2563eb',
        }
      },
    },
  },
  plugins: [],
};
