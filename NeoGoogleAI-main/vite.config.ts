
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Disable PWA in development to prevent Service Worker from caching API 404s
      devOptions: {
        enabled: false,
        type: 'module',
      },
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'NeoArchive: Y2K Collection Manager',
        short_name: 'NeoArchive',
        description: 'Retro-futuristic artifact preservation system',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'https://ui-avatars.com/api/?name=NA&background=4ade80&color=000&size=192&font-size=0.5',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://ui-avatars.com/api/?name=NA&background=4ade80&color=000&size=512&font-size=0.5',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          // Images - Cache First (long-lived)
          {
            urlPattern: /^https:\/\/picsum\.photos\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          },
          // Google Fonts - Cache First (long-lived)
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          // API calls - Stale While Revalidate (fast response + fresh data)
          {
            urlPattern: /^https?:\/\/[^/]+\/api\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // CDN assets - Cache First
          {
            urlPattern: /^https:\/\/aistudiocdn\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // Avatar images - Cache First
          {
            urlPattern: /^https:\/\/ui-avatars\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'avatar-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    host: '0.0.0.0', 
    port: 5173, 
    strictPort: false, 
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002', // Use localhost to match server binding
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, 
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('🔴 Proxy Error (Backend might be down on 3002):', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // console.log('Proxying:', req.method, req.url);
          });
        },
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    // Chunk size optimizations
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching and parallel loading
        manualChunks: (id) => {
          // React core libs in separate chunk (rarely changes)
          if (id.includes('node_modules/react') || id.includes('react-dom')) {
            return 'vendor-react';
          }
          // Lucide icons in separate chunk (large icon library)
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          // IndexedDB library
          if (id.includes('idb')) {
            return 'vendor-idb';
          }
          // Other vendor libs
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Add content hash to filenames for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging
        drop_debugger: true,
        pure_funcs: ['console.debug'] // Remove console.debug only
      }
    }
  }
})
