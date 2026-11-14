import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Recomp Tracker & Canteen Menu',
        short_name: 'RecompPWA',
        description: 'PWA для контроля питания, тренировок и рекомпозиции тела с циклическим меню столовой',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            // Кэширование меню столовой для офлайн доступа
            urlPattern: /^https?:\/\/.*\/api\/v1\/canteen\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'canteen-menu-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 дней
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Кэширование каталога базовых продуктов
            urlPattern: /^https?:\/\/.*\/api\/v1\/products\/search.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'products-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 дней
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: true
  }
});
