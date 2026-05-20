import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: ['icon.svg'],
      manifest: {
        name: '쉬운AI가계부',
        short_name: 'AI가계부',
        description: '대화하듯 기록하고 바로 리포트를 보는 설치형 AI 가계부 웹앱',
        theme_color: '#2563eb',
        background_color: '#f7f7f8',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 5174,
    fs: {
      allow: ['..']
    }
  }
});
