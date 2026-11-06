// Copy what the game reads from the art pipeline and the world data into public/.
// The game never imports art code: only these exported PNG and JSON files.
// Usage: npm run assets   (after npm run gen / samples / sprites in art/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { indexedPng } from './indexpng.mjs';

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const art = path.resolve(game, '../art/out');
const out = path.join(game, 'public');
const { PNG } = createRequire(import.meta.url)('../../art/node_modules/pngjs');
// PNGs go out as palette images when they have 256 colours or fewer (lossless, about a quarter the size).
let before = 0, after = 0;
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  const buf = fs.readFileSync(from);
  let data = buf;
  if (from.endsWith('.png')) { const im = PNG.sync.read(buf); data = indexedPng(im.width, im.height, im.data) ?? buf; before += buf.length; after += data.length; }
  fs.writeFileSync(to, data);
};

const samples = JSON.parse(fs.readFileSync(path.join(art, 'samples/manifest.json'), 'utf8'));
const objects = ['house', 'palm1', 'palm2', 'rock1', 'rock2', 'scrub1', 'scrub2', 'barrel', 'crate', 'pot', 'potSmall', 'chest', 'cliff', 'campfire',
  'well', 'fenceA', 'fenceB', 'fenceABroken', 'goat'];
for (const t of samples.tiles) copy(path.join(art, 'samples', t.file), path.join(out, 'assets', t.file));
for (const o of samples.overlays) for (const f of o.files) copy(path.join(art, 'samples', f.file), path.join(out, 'assets', f.file));
for (const id of objects) for (const part of ['body', 'shadow']) {
  const src = path.join(art, 'samples/objects', `${id}__${part}.png`);
  if (fs.existsSync(src)) copy(src, path.join(out, 'assets/objects', `${id}__${part}.png`));
}
const COMBAT = ['idle', 'walk', 'attack', 'block', 'roll', 'hit', 'death'];
const sheets = ['farm_idle', 'farm_walk', 'farm_hit', 'farm_death', ...['nadira', 'tavi', 'dune'].flatMap((o) => [`${o}_idle`, `${o}_walk`]), ...['leather', 'farmSword', 'bandit', 'steel', 'marauder', 'alikr'].flatMap((o) => COMBAT.map((a) => `${o}_${a}`))];
for (const s of sheets) {
  copy(path.join(art, 'sprites', `${s}.json`), path.join(out, 'assets/sprites', `${s}.json`));
  copy(path.join(art, 'sprites', `${s}.png`), path.join(out, 'assets/sprites', `${s}.png`));
}
const manifest = {
  tiles: samples.tiles.map((t) => ({ id: t.id, file: t.file })),
  overlays: samples.overlays.map((o) => ({ material: o.material, files: o.files })),
  priority: samples.priority,
  objects: Object.fromEntries(objects.map((id) => { const m = samples.objects[id]; return [id, { w: m.w, h: m.h, ox: m.ox, oy: m.oy, shadow: fs.existsSync(path.join(art, 'samples/objects', `${id}__shadow.png`)) }]; })),
  sheets,
};
fs.writeFileSync(path.join(out, 'assets/manifest.json'), JSON.stringify(manifest, null, 1));
copy(path.resolve(game, '../data/world/slices.json'), path.join(out, 'data/slices.json'));
console.log(`assets: ${samples.tiles.length} tiles, ${objects.length} objects, ${sheets.length} sheets; PNGs ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB`);
