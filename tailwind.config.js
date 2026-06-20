/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Criticality palette — high-contrast for back-of-room legibility.
        critical: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b', chip: '#dc2626' },
        today: { bg: '#fffbeb', border: '#d97706', text: '#92400e', chip: '#d97706' },
        canwait: { bg: '#f0fdf4', border: '#16a34a', text: '#166534', chip: '#16a34a' },
        review: { bg: '#f8fafc', border: '#64748b', text: '#475569', chip: '#64748b' },
      },
    },
  },
  plugins: [],
};
