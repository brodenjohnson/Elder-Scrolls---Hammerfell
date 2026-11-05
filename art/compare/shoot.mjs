// Screenshot a page to docs/gates/<dir>/<file>. Pages signal they are drawn with body[data-ready="1"].
// Usage: node compare/shoot.mjs gate1                       (compare/gate1.html -> docs/gates/gate1/style-frame.png)
//        node compare/shoot.mjs samples asset-samples.png
//        node compare/shoot.mjs "viewer/index.html?anim=walk" gate3 viewer.png
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const art = path.resolve(here, '..');
const [target = 'gate1', a2, a3] = process.argv.slice(2);
const isPage = target.includes('.html');
const [page, query = ''] = (isPage ? target : `compare/${target}.html`).split('?');
const dir = isPage ? a2 : target;
const file = (isPage ? a3 : a2) ?? 'style-frame.png';
const outDir = path.resolve(art, '../docs/gates', dir);
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const tab = await browser.newPage({ viewport: { width: 1500, height: 900 } });
tab.on('pageerror', (e) => console.error('page error:', e.message));
await tab.goto(pathToFileURL(path.join(art, page)).href + (query ? `?${query}` : ''));
await tab.waitForSelector('body[data-ready="1"]', { timeout: 30000 });
const outFile = path.join(outDir, file);
await tab.screenshot({ path: outFile, fullPage: true });
await browser.close();
console.log('wrote', outFile);
