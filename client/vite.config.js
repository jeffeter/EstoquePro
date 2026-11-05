import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';


export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'celular' ? [basicSsl()] : [])],
  test: { environment: 'jsdom', include: ['tests/**/*.test.{js,jsx}'] },
  server: { port: 5173, host: mode === 'celular', proxy: { '/api': 'http://127.0.0.1:3001' } },
}));
