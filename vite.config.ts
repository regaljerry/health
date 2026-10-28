import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = `${(process.env.BASE_PATH || '/').replace(/\/$/, '')}/`

export default defineConfig({
  base,
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icons/*.png'],
    manifest: {
      id: base,
      name: '健康数据 - 每日健康日志',
      short_name: '健康数据',
      description: '早晚血压与心率记录，所有健康数据仅保存在本机。',
      lang: 'zh-CN',
      start_url: base,
      scope: base,
      display: 'standalone',
      background_color: '#f7f9f8',
      theme_color: '#187d68',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      clientsClaim: true,
      globPatterns: ['**/*.{js,css,html,png,woff2}'],
      cleanupOutdatedCaches: true,
      navigateFallback: `${base}index.html`,
      navigateFallbackAllowlist: [new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)],
    },
  })],
  build: {
    rolldownOptions: {
      output: { codeSplitting: { groups: [{ name: 'charts', test: /node_modules[\\/](recharts|d3-|victory)/ }, { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }] } },
    },
  },
})
