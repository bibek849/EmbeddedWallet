import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png', 'mask-icon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-icon-512x512.png'],
      manifest: {
        name: 'Embedded Wallet',
        short_name: 'Wallet',
        description: 'Embedded wallet PWA with Coinbase Onramp',
        theme_color: '#0052FF',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
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
            src: 'apple-touch-icon-180x180.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ],
        ios: {
          'apple-mobile-web-app-capable': 'yes',
          'apple-mobile-web-app-status-bar-style': 'default',
          'apple-mobile-web-app-title': 'Embedded Wallet'
        }
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});

