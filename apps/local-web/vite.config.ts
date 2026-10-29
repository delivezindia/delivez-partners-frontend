import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Read VITE_* settings (VITE_API_URL, Maps key) from the shared root .env.
  envDir: '../..',
  server: {
    port: 5175,
    proxy: { '/v1': 'http://localhost:4000', '/socket.io': { target: 'http://localhost:4000', ws: true } },
  },
});
