import { newReputation, type ReputationState } from '../systems/reputation';
import { newQuestState, type QuestState } from '../systems/quests';

// Versioned saves. Every change to saved data bumps SAVE_VERSION and adds a
// migration from the version before, so an old save always loads (CLAUDE.md:
// never break an old save without saying so first).

export const SAVE_VERSION = 6;

// Version 6 (0.7.0, the new engine): everything the game needs to carry on is in `game`.
export type GameState = {
  map: string; x: number; y: number; face: number;
  name: string; hp: number; maxHp: number; gold: number; rage: number;
  level: number; xp: number; perkPoints: number; ragePoints: number; perks: string[];
  skills: Record<string, { level: number; xp: number }>;
  inventory: Record<string, number>;
  eq: { weapon: string | null; shield: string | null; body: string | null; hands: string | null; feet: string | null; head: string | null };
  flags: string[]; quests: QuestState; time: number; bond: { wife: number; child: number; dog: number };
  reputation: ReputationState; stats: Record<string, number>;
  world: Record<string, { containers: Record<string, { items: Record<string, number>; gold: number }>; actors: Record<string, unknown> }>;
};
export type Save = { version: typeof SAVE_VERSION; savedAt: string; gameVersion: string; playSeconds: number; game: GameState };

const SKILLS = ['OneHanded', 'TwoHanded', 'Block', 'HeavyArmor', 'LightArmor', 'Smithing', 'Speech'];
export function freshGame(name = 'Kasim'): GameState {
  return {
    map: 'farmhouse', x: 150, y: 120, face: Math.PI, name, hp: 100, maxHp: 100, gold: 12, rage: 0,
    level: 1, xp: 0, perkPoints: 0, ragePoints: 0, perks: [],
    skills: { OneHanded: { level: 25, xp: 0 }, TwoHanded: { level: 15, xp: 0 }, Block: { level: 20, xp: 0 }, HeavyArmor: { level: 15, xp: 0 }, LightArmor: { level: 15, xp: 0 }, Smithing: { level: 20, xp: 0 }, Speech: { level: 15, xp: 0 }, Rage: { level: 15, xp: 0 } },
    inventory: { ClothesFarmClothes01: 1, ClothesFarmBoots01: 1 },
    eq: { weapon: null, shield: null, body: 'ClothesFarmClothes01', hands: null, feet: 'ClothesFarmBoots01', head: null },
    flags: [], quests: newQuestState(), time: 7 * 3600, bond: { wife: 0, child: 0, dog: 0 }, reputation: newReputation(), stats: {}, world: {},
  };
}

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
  3: (s) => ({ ...s, version: 4, quests: newQuestState(), time: 7 * 3600 + (s.playSeconds ?? 0) * 20, character: s.character && { name: 'Kasim', ...s.character }, bond: { wife: 0, child: 0, dog: 0 } }),
  // Version 4 (0.5.x): the scope cut. The player is a Redguard, and the cut skills are dropped.
  4: (s) => ({ ...s, version: 5, character: s.character && { ...s.character, race: 'RedguardRace',
    skills: Object.fromEntries(Object.entries(s.character.skills).filter(([k]) => !['Archery', 'Sneak', 'Lockpicking', 'Pickpocket', 'Alchemy'].includes(k))) } }),
  // Version 5 (0.6.x): the old engine's world (isometric slices) is gone, so the player goes
  // back to the farm, outside the house; who he is, what he knows and what he carries stay.
  5: (s) => {
    const g = freshGame(s.character?.name ?? 'Kasim'), c = s.character;
    if (c) {
      for (const k of SKILLS) if (c.skills?.[k]) g.skills[k] = { level: c.skills[k].level, xp: 0 };
      g.perks = c.perks ?? []; g.perkPoints = c.perkPoints ?? 0; g.level = c.level ?? 1; g.xp = c.xp ?? 0;
      g.inventory = { ...g.inventory, ...(c.inventory ?? {}) };
      const e = c.equipped ?? {};
      g.eq = { weapon: e.mainHand ?? null, shield: e.shield ?? null, body: e.body ?? g.eq.body, hands: e.hands ?? null, feet: e.feet ?? g.eq.feet, head: e.head ?? null };
      g.maxHp = 100 + 10 * Math.max(0, (c.level ?? 1) - 1); g.hp = g.maxHp;
    }
    g.flags = s.flags ?? []; g.quests = s.quests ?? newQuestState(); g.time = s.time ?? g.time; g.bond = s.bond ?? g.bond; g.reputation = s.reputation ?? newReputation();
    g.rage = s.combat?.rage ?? 0; g.map = 'coast'; g.x = 1010; g.y = 1520;
    return { version: 6, savedAt: s.savedAt, gameVersion: s.gameVersion, playSeconds: s.playSeconds ?? 0, game: g };
  },
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
