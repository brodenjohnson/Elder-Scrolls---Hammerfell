// Loads the exported Skyrim data (data/skyrim/json/) with lookups by editor id and by name.
// The game reads numbers through this, never from hand-typed copies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'json');
const SETS = ['weapons', 'armour', 'ammo', 'perks', 'skills', 'races', 'classes', 'npcs', 'spells', 'magicEffects', 'leveledItems', 'leveledNpcs', 'gameSettings'];

export function loadSkyrim() {
  if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
    throw new Error('No Skyrim export found. Run: node data/skyrim/extract/export.mjs "<Skyrim Special Edition folder>"');
  }
  const data = { manifest: JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')) };
  for (const s of SETS) {
    const rows = JSON.parse(fs.readFileSync(path.join(dir, `${s}.json`), 'utf8'));
    const byEdid = new Map(rows.filter((r) => r.edid).map((r) => [r.edid, r]));
    data[s] = { rows, byEdid, get: (edid) => byEdid.get(edid) };
  }
  // Game settings as a plain lookup: setting('fArmorScalingFactor') -> 0.12
  data.setting = (edid) => data.gameSettings.get(edid)?.value;
  return data;
}
