import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Read VITE_* settings (e.g. the Google Maps key) from the shared root .env. Only VITE_-prefixed values reach the browser.
  envDir: '../..',
  server: {
    port: 5173,
    // Same-origin calls in dev: REST and Socket.IO are forwarded to core-api.
    proxy: {
      '/v1': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
