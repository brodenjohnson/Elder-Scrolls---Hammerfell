// The game's data pack (public/data/game/, built by scripts/data.mjs from the Skyrim
// export). Code reads numbers from here; nothing is typed in by hand.

export type SkillId = 'OneHanded' | 'TwoHanded' | 'Archery' | 'Block' | 'Smithing' | 'HeavyArmor' | 'LightArmor' | 'Pickpocket' | 'Lockpicking' | 'Sneak' | 'Alchemy' | 'Speech';
export type SkillDef = { skill: SkillId; name: string; description: string; useMult: number; useOffset: number; improveMult: number; improveOffset: number; perks: string[] };
export type PerkEffect = { entryPoint: string; function: string; value?: number; keywords: string[] };
export type PerkDef = { edid: string; name: string; description: string; skill: SkillId; skillReq: { skill: string; level: number }[]; requires: string[]; nextPerk: string | null; effects: PerkEffect[]; abilities: string[] };
export type WeaponDef = { edid: string; name: string; type: string; damage: number; weight: number; value: number; speed: number; reach: number; stagger: number; skill: string; keywords: string[] };
export type ArmourDef = { edid: string; name: string; armourType: 'Light' | 'Heavy' | 'Clothing'; slots: string[]; rating: number; weight: number; value: number; keywords: string[] };
export type RaceDef = { edid: string; name: string; skillBoosts: { skill: string; boost: number }[]; startingHealth: number; startingStamina: number; carryWeight: number; regen: { health: number; stamina: number } };

export type GameData = {
  skills: SkillDef[]; perks: Map<string, PerkDef>; weapons: Map<string, WeaponDef>; armour: Map<string, ArmourDef>;
  races: Map<string, RaceDef>; settings: Record<string, number>;
};

export async function loadData(base = './data/game/'): Promise<GameData> {
  const get = <T>(n: string): Promise<T> => fetch(`${base}${n}.json`).then((r) => r.json());
  const [skills, perks, weapons, armour, races, settings] = await Promise.all([
    get<SkillDef[]>('skills'), get<PerkDef[]>('perks'), get<WeaponDef[]>('weapons'), get<ArmourDef[]>('armour'), get<RaceDef[]>('races'), get<Record<string, number>>('settings'),
  ]);
  return {
    skills, settings,
    perks: new Map(perks.map((p) => [p.edid, p])), weapons: new Map(weapons.map((w) => [w.edid, w])),
    armour: new Map(armour.map((a) => [a.edid, a])), races: new Map(races.map((r) => [r.edid, r])),
  };
}
