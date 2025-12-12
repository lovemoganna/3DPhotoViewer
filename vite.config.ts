import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/3DPhotoViewer/', // 你的仓库名
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  define: {
    // 确保环境变量能在客户端访问
    'process.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY)
  }
})
