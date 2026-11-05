import type { SliceInfo } from './map';
import type { Terrain, Thing } from './terrain';

// Keeps the 3 by 3 slices around the player loaded (bible: stream only the slices
// around the player) and holds each slice's saved state, loaded or not.

export type SliceState = { removed: string[] };
export type LoadedSlice = { sx: number; sy: number; info: SliceInfo; things: Thing[]; loadMs: number };

export class Streamer {
  readonly loaded = new Map<string, LoadedSlice>();
  states: Record<string, SliceState> = {};
  readonly stats = { loads: 0, unloads: 0, maxLoadMs: 0, lastLoadMs: 0 };
  private centre = '';
  constructor(private readonly terrain: Terrain) {}

  static key(sx: number, sy: number) { return `${sx},${sy}`; }

  // Call every frame with the player's slice; loads and unloads only when it changes.
  update(sx: number, sy: number) {
    const c = Streamer.key(sx, sy);
    if (c === this.centre) return false;
    this.centre = c;
    const want = new Set<string>();
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const k = Streamer.key(sx + dx, sy + dy);
      want.add(k);
      if (!this.loaded.has(k)) this.load(sx + dx, sy + dy);
    }
    for (const k of [...this.loaded.keys()]) if (!want.has(k)) { this.loaded.delete(k); this.stats.unloads++; }
    return true;
  }

  private load(sx: number, sy: number) {
    const t0 = performance.now();
    const removed = new Set(this.states[Streamer.key(sx, sy)]?.removed ?? []);
    const things = this.terrain.things(sx, sy).filter((t) => !removed.has(t.uid));
    const loadMs = performance.now() - t0;
    this.loaded.set(Streamer.key(sx, sy), { sx, sy, info: this.terrain.map.info(sx, sy), things, loadMs });
    this.stats.loads++; this.stats.lastLoadMs = loadMs; this.stats.maxLoadMs = Math.max(this.stats.maxLoadMs, loadMs);
  }

  // Forget everything loaded, for example after loading a save with different slice states.
  reset() { this.loaded.clear(); this.centre = ''; }

  *things() { for (const s of this.loaded.values()) yield* s.things; }

  // Remove a thing for good: it goes from the loaded slice and into that slice's saved state.
  remove(thing: Thing) {
    const k = thing.uid.split(',').slice(0, 2).join(',');
    (this.states[k] ??= { removed: [] }).removed.push(thing.uid);
    const s = this.loaded.get(k);
    if (s) s.things = s.things.filter((t) => t.uid !== thing.uid);
  }
}
