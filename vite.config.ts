import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const { VITE_API_URL_PREFIX, VITE_API_SERVER } = loadEnv(mode, process.cwd(), '')
  const isAnalyze = mode === 'analyze'

  return {
    plugins: [
      vue(),
      vueJsx(),
      vueDevTools(),
      tailwindcss(),
      Components({
        resolvers: [NaiveUiResolver()],
      }),
      isAnalyze &&
        visualizer({
          open: true,
          filename: './stats.html',
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      outDir: '../backend/public',
      emptyOutDir: true,
      // 启用压缩
      minify: 'esbuild',
      // 代码分割配置
      rollupOptions: {
        output: {
          // 手动分割代码块
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('naive-ui') || id.includes('vicons')) {
                return 'naive-ui'
              }
              if (id.includes('echarts')) {
                return 'echarts'
              }
              if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
                return 'vue-vendor'
              }
              return 'vendor'
            }
          },
          // 优化 chunk 文件命名
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || []
            const ext = info[info.length - 1]
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `images/[name]-[hash][extname]`
            }
            if (/woff2?|eot|ttf|otf/i.test(ext)) {
              return `fonts/[name]-[hash][extname]`
            }
            return `assets/[name]-[hash][extname]`
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true,
      sourcemap: false,
    },
    server: {
      port: 5177,
      proxy: {
        [VITE_API_URL_PREFIX]: {
          target: VITE_API_SERVER,
          changeOrigin: true,
          ws: false,
        },
      },
    },
  }
})
