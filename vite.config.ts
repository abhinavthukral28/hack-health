import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only Claude proxy is added in a later build block (Live-AI toggle).
// Kept out of the hero path on purpose — the demo must run 100% offline.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
