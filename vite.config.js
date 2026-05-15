import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // espone il dev server su rete locale → utile per test su smartphone
    port: 5173,
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
})
