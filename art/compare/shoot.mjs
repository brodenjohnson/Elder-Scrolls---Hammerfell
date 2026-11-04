// Screenshot a comparison page to docs/gates/<gate>/. Usage: node compare/shoot.mjs gate1
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const gate = process.argv[2] ?? 'gate1';
const outDir = path.resolve(here, '../../docs/gates', gate);
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(pathToFileURL(path.join(here, `${gate}.html`)).href);
await page.waitForSelector('body[data-ready="1"]', { timeout: 20000 });
const file = path.join(outDir, 'style-frame.png');
await page.screenshot({ path: file, fullPage: true });
await browser.close();
console.log('wrote', file);
