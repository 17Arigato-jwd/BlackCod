import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isWebOS = mode === 'webos';

  return {
    base: './', // 🔑 REQUIRED for Electron AND webOS

    plugins: [
      react(),

      // 👇 ONLY enable legacy build for webOS
      isWebOS &&
        legacy({
          targets: ['Chrome 38'], // webOS 4.x
          additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
          renderLegacyChunks: true,
          modernPolyfills: false,
        }),
    ].filter(Boolean),

    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,

      // 👇 webOS-safe JS target ONLY when needed
      target: isWebOS ? 'es2015' : 'esnext',
    },

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
