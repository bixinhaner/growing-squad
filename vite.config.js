import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/bedtime/',
  plugins: [react()],
  server: {
    proxy: {
      '/bedtime/api': {
        target: 'http://127.0.0.1:8795',
        rewrite: (path) => path.replace(/^\/bedtime/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    testTimeout: 15_000,
    exclude: ['tests/e2e/**', 'tests/production/**', 'node_modules/**', 'dist/**'],
    css: true,
  },
})
