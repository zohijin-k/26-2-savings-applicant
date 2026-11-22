import { resolve } from 'node:path'
import { pdfjsAssets } from './vite/pdfjs-assets.ts'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), pdfjsAssets(resolve(__dirname, 'node_modules/pdfjs-dist'))],
  server: {
    // 백엔드는 8000. 프론트에서 /api 를 그대로 부르면 프록시된다.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
