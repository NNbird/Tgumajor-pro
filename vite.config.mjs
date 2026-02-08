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
      },
      // 2. [新增] 静态资源(图片/模型)转发到后端
      '/3Dmodels': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // [新增] 代理 /uploads 到后端
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // 👇👇👇 [新增] 转发生成的 3D 资产 👇👇👇
      '/assets': {
        target: 'http://localhost:3001',
        changeOrigin: true,
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