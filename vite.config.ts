import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    visualizer({
      open: true, // Automatically opens the report in your browser
      filename: "bundle-report.html" // Optional: specify output file name
    }),
    tailwindcss(),
  ],
  base: '/',
  build: {
    outDir: 'dist'
  }
})
