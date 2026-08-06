import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/vibetimer/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/vibetimer/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: 'Session Vibe Timer',
        short_name: 'VibeTimer',
        description: 'Vibrate at fixed intervals during a timed session. Great for puja, bike rides, and focus sessions.',
        theme_color: '#7c3aed',
        background_color: '#0d0d0f',
        display: 'standalone',
        start_url: '/vibetimer/',
        scope: '/vibetimer/',
        lang: 'en',
        dir: 'ltr',
        orientation: 'portrait',
        categories: ['utilities', 'productivity'],
        display_override: ['standalone', 'minimal-ui'],
        shortcuts: [
          {
            name: 'Start Timer',
            short_name: 'Start',
            description: 'Open Session Vibe Timer',
            url: '/vibetimer/',
            icons: [{ src: '/vibetimer/icon-192.png', sizes: '192x192' }],
          },
        ],
        icons: [
          { src: '/vibetimer/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/vibetimer/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/vibetimer/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          {
            src: '/vibetimer/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Session Vibe Timer home screen',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
