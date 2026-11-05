import { defineConfig } from 'vite';
import fs from 'node:fs';

// The version lives in the repo-root VERSION file; the build bakes it in and also
// publishes it as version.json, which running copies poll to spot a newer release.
const version = fs.readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  worker: { format: 'es' },
  build: { target: 'es2022', assetsInlineLimit: 0 },
  plugins: [{
    name: 'version-json',
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) }); },
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ version })); });
    },
  }],
});
