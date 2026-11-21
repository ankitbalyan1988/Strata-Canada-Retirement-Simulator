import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');

            if (normalizedId.includes('vite/preload-helper')) {
              return 'preload-helper';
            }

            if (normalizedId.includes('node_modules/')) {
              // Stable core vendor chunks (cacheable across app deploys)
              if (
                normalizedId.includes('node_modules/react/') ||
                normalizedId.includes('node_modules/react-dom/') ||
                normalizedId.includes('node_modules/scheduler/')
              ) {
                return 'vendor-react';
              }
              if (
                normalizedId.includes('node_modules/zustand/') ||
                normalizedId.includes('node_modules/use-sync-external-store/')
              ) {
                return 'vendor-zustand';
              }
              if (normalizedId.includes('node_modules/lucide-react/')) {
                return 'vendor-icons';
              }
              if (
                normalizedId.includes('node_modules/motion/') ||
                normalizedId.includes('node_modules/framer-motion/') ||
                normalizedId.includes('node_modules/motion-dom/') ||
                normalizedId.includes('node_modules/motion-utils/')
              ) {
                return 'vendor-motion';
              }

              // Dynamically imported heavy libraries kept in dedicated on-demand chunks.
              // Omitting a catch-all 'vendor' chunk ensures their transitive dependencies
              // (jszip, pako, fflate, fast-csv, canvg, html2canvas, etc.) stay out of the initial load.
              if (normalizedId.includes('node_modules/exceljs/')) {
                return 'vendor-excel';
              }
              if (
                normalizedId.includes('node_modules/jspdf/') ||
                normalizedId.includes('node_modules/jspdf-autotable/')
              ) {
                return 'vendor-pdf';
              }
              if (normalizedId.includes('node_modules/pdfjs-dist/')) {
                return 'vendor-pdfjs';
              }
              if (normalizedId.includes('node_modules/canvas-confetti/')) {
                return 'vendor-confetti';
              }
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
