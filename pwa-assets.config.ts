import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset,
  images: [
    'public/pwa-source.svg',
  ],
  // Keep output noise low in normal dev/build.
  logLevel: 'silent',
})


