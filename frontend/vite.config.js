import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Lets one public tunnel URL (e.g. `ngrok http 5173`) serve the whole app while testing on a
    // real phone: pages come from Vite, and /api is forwarded to the Express backend — which is
    // also how Meta's WhatsApp webhook reaches /api/webhooks/whatsapp.
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.dev'],
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: false },
    },
  },
});
