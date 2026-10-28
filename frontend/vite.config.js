import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS local: getUserMedia (cámara) no funciona en http://192.168.x.x desde el teléfono.
// El proxy hace que el navegador hable solo con https://<tu-ip>:5173 (sin "mixed content"):
// Vite reenvía /api y /socket.io al backend en http://localhost:3001.
const BACKEND = process.env.VITE_BACKEND_TARGET || 'http://localhost:3001';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true, // expone en la red local para probar con el teléfono
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/socket.io': { target: BACKEND, ws: true, changeOrigin: true },
    },
  },
});
