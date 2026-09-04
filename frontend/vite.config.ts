import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Phase 15A — Vite dev proxy for `/api`.
 *
 * The frontend lives on :5173 (or :3000) and the NestJS API on :3001.
 * Rather than chasing CORS preflights for the refresh-token cookie
 * during local dev, we proxy every `/api/*` request through Vite so
 * the browser sees a single same-origin server. The cookie flows
 * natively (`SameSite=Lax` is enough for same-origin) and `credentials`
 * doesn't need to be set on fetch.
 *
 * In production nginx (§22) does the same thing at the host level —
 * frontend and API behind the same domain. The frontend never has to
 * care which one it's talking to.
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: false,
      },
    },
  },
  build: { target: 'es2022', sourcemap: true },
});
