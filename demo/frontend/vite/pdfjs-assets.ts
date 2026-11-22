import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

const directories = ['wasm', 'cmaps', 'standard_fonts']
const mime: Record<string, string> = {
  wasm: 'application/wasm', js: 'text/javascript', bcmap: 'application/octet-stream',
  pfb: 'application/octet-stream', ttf: 'font/ttf',
}

/** Serve only the installed PDF.js resources, identically in dev and builds. */
export function pdfjsAssets(root: string): Plugin {
  return {
    name: 'pdfjs-assets',
    configureServer(server) {
      server.middlewares.use('/pdfjs', (req, res, next) => {
        let path: string
        try { path = decodeURIComponent((req.url ?? '').split('?')[0]) }
        catch { res.statusCode = 400; res.end(); return }
        const match = /^\/([^/]+)\/([a-zA-Z0-9_.-]+)$/.exec(path)
        if (!match || !directories.includes(match[1]) || match[2].includes('..')) return next()
        const file = join(root, match[1], match[2])
        if (!existsSync(file) || !statSync(file).isFile()) return next()
        res.setHeader('Content-Type', mime[match[2].split('.').pop() ?? ''] ?? 'application/octet-stream')
        res.end(readFileSync(file))
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'pdfjs/LICENSE', source: readFileSync(join(root, 'LICENSE')) })
      for (const dir of directories) {
        for (const file of readdirSync(join(root, dir))) {
          const path = join(root, dir, file)
          if (!statSync(path).isFile()) continue
          this.emitFile({ type: 'asset', fileName: `pdfjs/${dir}/${file}`, source: readFileSync(path) })
        }
      }
    },
  }
}
