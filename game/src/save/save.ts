import type { Facing } from '../render/iso';
import type { SliceState } from '../world/streamer';

// Versioned saves. Every change to saved data bumps SAVE_VERSION and adds a
// migration from the version before, so an old save always loads (CLAUDE.md:
// never break an old save without saying so first).

export const SAVE_VERSION = 1;

export type Save = {
  version: typeof SAVE_VERSION;
  savedAt: string;
  gameVersion: string;
  playSeconds: number;
  player: { a: number; b: number; facing: Facing };
  slices: Record<string, SliceState>;
};

// migrations[n] turns a version n save into version n + 1.
// Version 0 is the pre-release layout used before the save system existed: the
// player position as tile x and y, play time as `time`, no slice state.
const migrations: Record<number, (s: any) => any> = {
  0: (s) => ({
    version: 1, savedAt: s.savedAt ?? new Date(0).toISOString(), gameVersion: s.gameVersion ?? 'unknown',
    playSeconds: s.time ?? 0, player: { a: s.player.x, b: s.player.y, facing: 'S' }, slices: {},
  }),
};

export function migrate(raw: any): Save {
  let s = raw, v: number = typeof raw.version === 'number' ? raw.version : 0;
  if (v > SAVE_VERSION) throw new Error(`This save is from a newer version of the game (save version ${v}).`);
  while (v < SAVE_VERSION) { s = migrations[v](s); v = s.version; }
  return s as Save;
}

const KEY = (slot: string) => `hammerfell.save.${slot}`;

export function writeSave(slot: string, save: Save) { localStorage.setItem(KEY(slot), JSON.stringify(save)); }
export function readSave(slot: string): Save | null {
  const raw = localStorage.getItem(KEY(slot));
  return raw ? migrate(JSON.parse(raw)) : null;
}
export function listSaves(): string[] {
  return Object.keys(localStorage).filter((k) => k.startsWith('hammerfell.save.')).map((k) => k.slice('hammerfell.save.'.length));
}
