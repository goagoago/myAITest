import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_BASE || 'http://localhost:8080'

  return {
    plugins: [vue()],
    optimizeDeps: {
      exclude: ['@imgly/background-removal', '@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    worker: {
      format: 'es',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return
            }

            if (id.includes('vue') || id.includes('vue-router') || id.includes('@vueuse')) {
              return 'framework'
            }

            if (id.includes('lucide-vue-next') || id.includes('lottie-web')) {
              return 'ui-vendor'
            }

            if (
              id.includes('@ffmpeg') ||
              id.includes('tesseract.js') ||
              id.includes('pdfjs-dist') ||
              id.includes('xlsx') ||
              id.includes('html2pdf.js') ||
              id.includes('docx') ||
              id.includes('mammoth')
            ) {
              return 'heavy-tools'
            }
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
