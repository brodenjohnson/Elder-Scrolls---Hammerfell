// Spot-check the export against values already verified in the markdown pack ([V] rows).
// Usage: node data/skyrim/extract/check.mjs   (exits 1 if any check fails)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../json');
const load = (n) => JSON.parse(fs.readFileSync(path.join(dir, `${n}.json`), 'utf8'));
const weapons = load('weapons'), armour = load('armour'), races = load('races');
// The plain, playable item with this name (not an enchanted or template copy).
const item = (rows, name, extra = () => true) => rows.find((r) => r.name === name && !r.enchanted && !r.template && extra(r));

const checks = [
  // [label, actual, expected, source of the expected value]
  ['Iron Sword weight/value/damage', (w) => [w.weight, w.value, w.damage], [9, 25, 7], 'weapons.md', () => item(weapons, 'Iron Sword')],
  ['Steel Sword', (w) => [w.weight, w.value, w.damage], [10, 45, 8], 'weapons.md', () => item(weapons, 'Steel Sword')],
  ['Daedric Dagger', (w) => [w.weight, w.value, w.damage], [6, 500, 11], 'weapons.md', () => item(weapons, 'Daedric Dagger')],
  ['Steel Greatsword', (w) => [w.weight, w.value, w.damage], [17, 90, 17], 'weapons.md', () => item(weapons, 'Steel Greatsword')],
  ['Dwarven Battleaxe', (w) => [w.weight, w.value, w.damage], [23, 300, 20], 'weapons.md', () => item(weapons, 'Dwarven Battleaxe')],
  ['Ebony War Axe', (w) => [w.weight, w.value, w.damage], [17, 865, 14], 'weapons.md', () => item(weapons, 'Ebony War Axe')],
  ['Greatsword class reach/speed/stagger', (w) => [w.reach, w.speed, w.stagger], [1.3, 0.7, 1.1], 'weapons.md', () => item(weapons, 'Steel Greatsword')],
  ['Sword class reach/speed/stagger', (w) => [w.reach, w.speed, w.stagger], [1, 1, 0.75], 'weapons.md', () => item(weapons, 'Iron Sword')],
  ['Steel Armor rating/weight', (a) => [a.rating, a.weight], [31, 35], 'armour.md', () => item(armour, 'Steel Armor', (a) => a.slots.includes('Body'))],
  ['Leather Armor rating/weight', (a) => [a.rating, a.weight], [26, 6], 'armour.md', () => item(armour, 'Leather Armor', (a) => a.slots.includes('Body'))],
  ['Glass Armor rating/weight', (a) => [a.rating, a.weight], [38, 7], 'armour.md', () => item(armour, 'Glass Armor', (a) => a.slots.includes('Body'))],
  ['Orcish Boots rating', (a) => [a.rating], [15], 'armour.md', () => item(armour, 'Orcish Boots')],
  ['Daedric Helmet rating', (a) => [a.rating], [23], 'armour.md', () => item(armour, 'Daedric Helmet')],
  ['Ebony Shield rating', (a) => [a.rating], [32], 'armour.md', () => item(armour, 'Ebony Shield')],
  ['Redguard One-handed boost', (r) => [r.skillBoosts.find((b) => b.skill === 'OneHanded')?.boost], [10], 'races.md', () => races.find((r) => r.edid === 'RedguardRace')],
];

let fail = 0;
for (const [label, get, want, src, find] of checks) {
  const row = find();
  const got = row ? get(row) : ['missing'];
  const ok = row && got.every((v, i) => Math.abs(v - want[i]) < 1e-3);
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(38)} export ${JSON.stringify(got).padEnd(18)} pack ${JSON.stringify(want)} (${src})`);
}
console.log(`${checks.length - fail} of ${checks.length} match`);

// Every item the art and game content name must exist in the export.
const outfits = JSON.parse(fs.readFileSync(path.resolve(dir, '../../../art/data/outfits.json'), 'utf8'));
const all = [...weapons, ...armour];
for (const [key, o] of Object.entries(outfits)) {
  if (key.startsWith('_')) continue;
  for (const it of o.items) {
    const edid = /\(([^)]+)\)/.exec(it.source ?? '')?.[1];
    const found = edid ? all.some((r) => r.edid === edid) : all.some((r) => r.name === it.name && !r.enchanted);
    if (!found) { fail++; console.log(`FAIL outfit ${key}: ${it.name} not in the export`); }
  }
}
console.log(fail ? `${fail} problems` : 'all outfit items found');
process.exit(fail ? 1 : 0);
