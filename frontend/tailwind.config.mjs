/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* 
         * STRICT COLOR PALETTE PROTOCOL
         * Based on Design Requirement Prompt
         */
        
        // Primary Action/Focus: Deep Indigo
        'primary': '#4F46E5',
        'primary-hover': '#4338CA',
        'primary-light': '#818CF8',
        
        // Success/Clinical Control: Emerald Green
        'success': '#10B981',
        'success-hover': '#059669',
        'success-light': '#34D399',
        
        // Warning/Mid-Range Trend: Amber Orange
        'warning': '#F59E0B',
        'warning-hover': '#D97706',
        'warning-light': '#FBBF24',
        
        // Danger/High Risk (additional for medical context)
        'danger': '#EF4444',
        'danger-hover': '#DC2626',
        'danger-light': '#F87171',
        
        // Primary Brand Blue: Cyan
        'brand-cyan': '#00C2DE',
        'brand-cyan-hover': '#00A3C4',
        
        // Deep Brand Blue: Navy
        'brand-navy': '#005FBE',
        'brand-navy-hover': '#004E9E',
        
        // Backgrounds
        'bg-soft': '#F8FAFC',
        'bg-card': '#FFFFFF',
        
        // Typography
        'text-primary': '#0F172A',
        'text-secondary': '#64748B',
        'text-muted': '#94A3B8',
        
        // Legacy aliases (for backward compatibility)
        'brand-blue': '#4F46E5',
        'status-controlled': '#10B981',
        'status-uncontrolled': '#EF4444',
      },
      fontFamily: {
        // PDF Section 1.1: Primary font for Web/Electronic Media
        'serif': ['"Noto Serif"', 'serif'],
        // PDF Section 1.1: Primary font for Display/Stationery
        'display': ['Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // Adding a specific brand size utility
        'brand': '11pt',
      }
    },
  },
  plugins: [],
}