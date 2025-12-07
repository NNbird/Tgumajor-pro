import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 1. 开发服务器配置
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }, // <--- 这里必须有逗号，分隔 server 和 build

  // 2. 构建配置 (用于生产环境隐藏源码)
  build: {
    sourcemap: false, // 🔴 核心：不生成源码地图
    minify: 'terser', // 强力压缩
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console
        drop_debugger: true // 移除断点
      }
    }
  }
})