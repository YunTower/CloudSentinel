import { fileURLToPath, URL } from 'node:url'
import { existsSync, renameSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect } from 'vite'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import { visualizer } from 'rollup-plugin-visualizer'

/** public 模式：所有 HTML 导航走 public.html，并拒绝管理端入口/源码 */
const publicSpaFallback = (): Connect.NextHandleFunction => {
  return (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const raw = req.url || '/'
    const pathOnly = raw.split('?')[0] || '/'

    // 禁止直接打开管理端入口或拉取管理端源码
    if (
      pathOnly === '/index.html' ||
      pathOnly === '/src/admin' ||
      pathOnly.startsWith('/src/admin/')
    ) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('Not found')
      return
    }

    const method = req.method || 'GET'
    const accept = req.headers.accept || ''
    const isGet = method === 'GET' || method === 'HEAD'
    const wantsHtml = accept.includes('text/html')
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(pathOnly)
    const isViteInternal =
      pathOnly.startsWith('/@') ||
      pathOnly.startsWith('/node_modules') ||
      pathOnly.startsWith('/__') ||
      pathOnly === '/public.html'

    if (isGet && wantsHtml && !hasExtension && !isViteInternal) {
      const qs = raw.includes('?') ? raw.slice(raw.indexOf('?')) : ''
      req.url = `/public.html${qs}`
    }
    next()
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const { VITE_API_URL_PREFIX, VITE_API_SERVER } = loadEnv(mode, process.cwd(), '')
  const isAnalyze = mode === 'analyze'
  const isPublicBuild = mode === 'public'

  return {
    plugins: [
      vue(),
      vueJsx(),
      // 公开端不挂 DevTools，减少误用管理端调试入口
      !isPublicBuild && vueDevTools(),
      tailwindcss(),
      Components({
        resolvers: [NaiveUiResolver()],
      }),
      isPublicBuild && {
        name: 'public-only-spa',
        configureServer(server: import('vite').ViteDevServer) {
          // 尽早介入，赶在 Vite SPA 回退到 index.html（管理端）之前
          server.middlewares.use(publicSpaFallback())
        },
        configurePreviewServer(server: import('vite').PreviewServer) {
          server.middlewares.use(publicSpaFallback())
        },
      },
      isPublicBuild && {
        name: 'rename-public-entry',
        closeBundle() {
          const outputDir = fileURLToPath(new URL('./dist/public/', import.meta.url))
          const publicEntry = `${outputDir}public.html`
          if (existsSync(publicEntry)) {
            renameSync(publicEntry, `${outputDir}index.html`)
          }
        },
      },
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
      // 管理端与公开端是两套互不包含对方代码的独立产物，由各自的静态 HTTP 服务托管。
      outDir: isPublicBuild ? 'dist/public' : 'dist/admin',
      emptyOutDir: true,
      minify: 'esbuild',
      rollupOptions: {
        input: isPublicBuild ? 'public.html' : 'index.html',
        output: {
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
      port: isPublicBuild ? 5178 : 5177,
      strictPort: true,
      proxy: {
        [VITE_API_URL_PREFIX]: {
          target: VITE_API_SERVER,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      port: isPublicBuild ? 4174 : 4173,
      strictPort: true,
    },
  }
})
