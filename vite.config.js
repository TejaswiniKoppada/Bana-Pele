import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The Elevate API resolves tenant/org by the request's Origin header, requiring
// it to be exactly the deployed portal origin. Browsers won't let client-side
// code override Origin on a cross-origin fetch, so local dev proxies through
// the Vite dev server (a Node process, not subject to that restriction) and
// sets the expected Origin there. In production this frontend is expected to
// be served from that same portal origin, where no proxy is needed.
const ELEVATE_API_ORIGIN = 'https://elevate-apis.shikshalokam.org';
const ELEVATE_PORTAL_ORIGIN = 'https://elevate-bana-pele.shikshalokam.org';

export default defineConfig({
  server: {
    proxy: {
      '/elevate-api': {
        target: ELEVATE_API_ORIGIN,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/elevate-api/, ''),
        headers: {
          origin: ELEVATE_PORTAL_ORIGIN,
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.svg', 'icons/icon-512.svg'],
      manifest: {
        name: 'Elevate - Peer Connect & Community Voices',
        short_name: 'Elevate',
        description: 'Peer Connect and Community Voices for Bana Pele ELP practitioners',
        start_url: '/',
        display: 'standalone',
        background_color: '#F3F1F8',
        theme_color: '#4B2E83',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/offline.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: ({ request }) =>
              ['style', 'script', 'worker', 'font', 'image'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
            },
          },
        ],
      },
    }),
  ],
});
