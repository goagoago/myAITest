import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'https://open.bigmodel.cn/api/paas/v4',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chat/, '/chat/completions'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // 本地开发时直接调用智谱API
            proxyReq.setHeader('Authorization', `Bearer ${process.env.ZHIPU_API_KEY || '94c09f3d19b582cafaa8700d63524cbc.4vAoySH9Q0l7xCQW'}`)
          })
        }
      }
    }
  }
})
