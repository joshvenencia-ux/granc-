import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const BACKEND = env.VITE_CASINO_BACKEND_URL || 'http://localhost:3000';

  const frontendDir = fileURLToPath(new URL('.', import.meta.url));
  const repoRoot = path.resolve(frontendDir, '..', '..');
  const iconsDir = path.resolve(repoRoot, 'node_modules', 'bootstrap-icons');

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': { target: BACKEND, changeOrigin: true, secure: false },
      },
      fs: {
        allow: [iconsDir, repoRoot],
      },
    },
  };
});
