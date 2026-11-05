// Runs each renderer at several crowd sizes in a real (headed) Chromium window with
// the frame-rate cap off, and writes results.json plus a screenshot per renderer.
// Usage: node bench.mjs [seconds] [cpuSlowdown]   (needs the art built: art/out/samples and art/out/sprites)
// cpuSlowdown (for example 6) slows the page's CPU through DevTools, to stand in for a modest laptop.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const seconds = +(process.argv[2] ?? 15);
const slow = +(process.argv[3] ?? 1);
const ENGINES = ['canvas', 'pixi', 'phaser'];
const CROWDS = [20, 50, 100, 300];
const server = await serve(5179);
const browser = await chromium.launch({
  headless: false,
  args: ['--disable-gpu-vsync', '--disable-frame-rate-limit', '--ignore-gpu-blocklist', '--enable-precise-memory-info'],
});
const shots = path.resolve(here, '../../docs/spikes/tech');
fs.mkdirSync(shots, { recursive: true });
const results = [];
let gpu = null;
for (const engine of ENGINES) {
  for (const n of CROWDS) {
    const page = await browser.newPage({ viewport: { width: 1640, height: 940 } });
    page.on('pageerror', (e) => console.error(engine, 'page error:', e.message));
    if (slow > 1) await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: slow });
    const t0 = Date.now();
    await page.goto(`http://localhost:5179/spikes/tech/${engine}.html?n=${n}&s=${seconds}`);
    gpu ??= await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
    });
    if (n === 50 && slow === 1) {
      await page.waitForFunction(() => window.__game && performance.now() > 6000, null, { timeout: 60000 }).catch(() => {});
      await page.screenshot({ path: path.join(shots, `${engine}.png`) });
    }
    await page.waitForFunction(() => window.__result, null, { timeout: (seconds + 60) * 1000 });
    const r = await page.evaluate(() => window.__result);
    r.engine = engine; r.wallMs = Date.now() - t0;
    results.push(r);
    console.log(`${engine.padEnd(7)} ${String(n).padStart(3)} chars: ${String(r.fps).padStart(4)} fps, p99 ${r.p99FrameMs} ms, worst ${r.worstFrameMs} ms, work ${r.avgWorkMs} ms, heap ${r.heapMB} MB, textures ~${r.textureMB} MB`);
    await page.close();
  }
}
await browser.close();
server.close();
fs.writeFileSync(path.join(here, slow > 1 ? `results-cpu${slow}x.json` : 'results.json'), JSON.stringify({ date: new Date().toISOString().slice(0, 10), gpu, seconds, cpuSlowdown: slow, results }, null, 2));
console.log('gpu:', gpu);
