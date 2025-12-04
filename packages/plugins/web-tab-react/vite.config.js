import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React 核心库单独分包
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          
          // Ant Design UI 库单独分包（最大的依赖）
          if (id.includes('node_modules/antd')) {
            return 'vendor-antd'
          }
          
          // Ant Design Icons 单独分包
          if (id.includes('node_modules/@ant-design/icons')) {
            return 'vendor-icons'
          }
          
          // 工具类单独分包
          if (id.includes('/src/utils/')) {
            return 'utils'
          }
          
          // 其他 node_modules 依赖
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
        // 优化 chunk 文件名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // 提高 chunk 大小警告限制（因为 antd 本身就比较大）
    chunkSizeWarningLimit: 1000,
    // 启用源码映射（可选，生产环境可以关闭）
    sourcemap: false,
  },
})
