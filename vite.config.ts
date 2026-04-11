import { defineConfig } from 'vite'
import path from 'path'
import fs from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

const musicDir = path.resolve(__dirname, 'music')

/** Serves repo-root `music/` at `/music/*` in dev and copies into `dist/music` on build (alongside `public/music`). */
function rootMusicAssets(): Plugin {
  const mime: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.opus': 'audio/opus',
    '.wav': 'audio/wav',
    '.webm': 'audio/webm',
  }
  return {
    name: 'root-music-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url?.split('?')[0] ?? ''
        if (!raw.startsWith('/music/')) {
          next()
          return
        }
        const name = path.basename(decodeURIComponent(raw.slice('/music/'.length)))
        if (!name || name !== path.basename(name)) {
          next()
          return
        }
        const file = path.join(musicDir, name)
        if (!file.startsWith(musicDir + path.sep)) {
          next()
          return
        }
        fs.stat(file, (err, st) => {
          if (err || !st.isFile()) {
            next()
            return
          }
          const ext = path.extname(name).toLowerCase()
          res.setHeader('Content-Type', mime[ext] ?? 'application/octet-stream')
          fs.createReadStream(file).pipe(res)
        })
      })
    },
    closeBundle() {
      if (!fs.existsSync(musicDir)) return
      const out = path.resolve(__dirname, 'dist', 'music')
      fs.mkdirSync(out, { recursive: true })
      for (const name of fs.readdirSync(musicDir)) {
        const fp = path.join(musicDir, name)
        if (fs.statSync(fp).isFile()) {
          fs.copyFileSync(fp, path.join(out, name))
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    rootMusicAssets(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('recharts')) return 'vendor-recharts'
          if (id.includes('@supabase/supabase-js')) return 'vendor-supabase'
          if (id.includes('react-router')) return 'vendor-router'

          return 'vendor-misc'
        },
      },
    },
  },
})
