// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import prefixWrap from 'postcss-prefixwrap'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer(),

        {
          postcssPlugin: 'prefix-7css-only',
          Once(root, { result }) {
            const file = result.opts.from || ''
            if (file.includes('node_modules/7.css/dist/7.css')) {
              prefixWrap('#chat-scope').Once(root)
            }
          }
        }
      ]
    }
  },
  base: '/',
  server: {
    historyApiFallback: true,
  },
  esbuild: {
    pure: ['console.log'],
  },
})
