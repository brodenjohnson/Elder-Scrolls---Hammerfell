import type { Facing } from '../render/iso';
import type { SliceState } from '../world/streamer';
import type { CharacterState } from '../systems/character';
import { newReputation, type ReputationState } from '../systems/reputation';
import type { BodyState } from '../combat/combat';
import { newQuestState, type QuestState } from '../systems/quests';

// Versioned saves. Every change to saved data bumps SAVE_VERSION and adds a
// migration from the version before, so an old save always loads (CLAUDE.md:
// never break an old save without saying so first).

export const SAVE_VERSION = 4;

export type Save = {
  version: typeof SAVE_VERSION;
  savedAt: string;
  gameVersion: string;
  playSeconds: number;
  player: { a: number; b: number; facing: Facing };
  slices: Record<string, SliceState>;
  // Version 2: the character, reputation and story flags. A null character means
  // "make the default character" (saves from before characters existed).
  character: CharacterState | null;
  reputation: ReputationState;
  flags: string[];
  // Version 3: the player's Rage and wounds, and where each body lies with what was cut off.
  combat: { rage: number; bleed: number; limp: number; bodies: Record<string, BodyState> };
  // Version 4: quests in progress and finished, and the game clock (game seconds).
  quests: QuestState;
  time: number;
  bond: { wife: number; child: number; dog: number }; // hidden family bond, 0 to 5
};

// migrations[n] turns a version n save into version n + 1.
const migrations: Record<number, (s: any) => any> = {
  // Version 0: the pre-release layout, position as tile x and y, play time as `time`.
  0: (s) => ({
    version: 1, savedAt: s.savedAt ?? new Date(0).toISOString(), gameVersion: s.gameVersion ?? 'unknown',
    playSeconds: s.time ?? 0, player: { a: s.player.x, b: s.player.y, facing: 'S' }, slices: {},
  }),
  // Version 1 (0.1.0): no character yet. The player starts with the default one.
  1: (s) => ({ ...s, version: 2, character: null, reputation: newReputation(), flags: [] }),
  // Version 2 (0.2.0 to 0.3.1): no Rage or wounds; bodies lie where their camp put them.
  2: (s) => ({ ...s, version: 3, combat: { rage: 0, bleed: 0, limp: 0, bodies: {} } }),
  // Version 3 (0.4.x, 0.5.x): no quests yet.
  // The clock starts at 07:00 on day 1 plus the time already played, at timescale 20.
  // Characters made before creation existed get the default name.
  3: (s) => ({ ...s, version: 4, quests: newQuestState(), time: 7 * 3600 + (s.playSeconds ?? 0) * 20, character: s.character && { name: 'Kasim', ...s.character }, bond: { wife: 0, child: 0, dog: 0 } }),
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
