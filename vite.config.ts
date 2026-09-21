import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.DEPLOY_TARGET === 'pages' ? '/mathnexus/' : '/'

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
    manifest: {
      id: base,
      name: 'MathNexus · Không gian học toán',
      short_name: 'MathNexus',
      description: 'Bài học, luyện tập, công thức, đồ thị và sổ tay toán học của bạn.',
      lang: 'vi',
      start_url: base,
      scope: base,
      display: 'standalone',
      background_color: '#f5f7f2',
      theme_color: '#f5f7f2',
      categories: ['education', 'productivity'],
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      shortcuts: [
        { name: 'Luyện tập', url: `${base}practice` },
        { name: 'Sổ tay', url: `${base}notebook` },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      globIgnores: [
        '**/MathCosmos-*.js',
        '**/react-three-fiber.esm-*.js',
      ],
      runtimeCaching: [
        {
          urlPattern: ({ url }) =>
            /\/(?:MathCosmos|react-three-fiber\.esm)-[^/]+\.js$/.test(url.pathname),
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'mathnexus-cosmos-runtime-v1',
            cacheableResponse: { statuses: [0, 200] },
            expiration: {
              maxEntries: 6,
              maxAgeSeconds: 30 * 24 * 60 * 60,
            },
          },
        },
      ],
      navigateFallback: `${base}index.html`,
      navigateFallbackDenylist: [/^\/api\//],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
    },
  })],
  base,
  server: { host: '0.0.0.0' },
})
