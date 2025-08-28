// Minimal Vite config for React without plugins
// Uses GitHub Pages base like the Vue app, but outputs to docs-react to avoid clobbering existing build
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/cnc-text-tool/' : '/',
  build: {
    outDir: 'docs'
  },
  server: {
    port: 5173
  }
}))
