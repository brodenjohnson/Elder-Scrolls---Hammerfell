import { test, expect, type Page } from '@playwright/test';

// Phase 2 regression list: skills, perks, equipment, reputation, dialogue and saves.
// Bible done-when: "The 12 skills level by use and perks apply".

async function boot(page: Page) {
  await page.goto('./');
  await page.waitForFunction(() => (window as any).__game?.ready, null, { timeout: 30_000 });
}
const call = <T = any>(page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window as any).__game[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>;

const SKILLS = ['OneHanded', 'TwoHanded', 'Archery', 'Block', 'Smithing', 'HeavyArmor', 'LightArmor', 'Pickpocket', 'Lockpicking', 'Sneak', 'Alchemy', 'Speech'];

test('all 12 skills level by use, and skill ranks level the player', async ({ page }) => {
  await boot(page);
  const before = await call(page, 'character');
  expect(Object.keys(before.skills).sort()).toEqual([...SKILLS].sort());
  // Enough use to level even the slow ones (Speech trains at 0.36 per use, Alchemy 0.75).
  for (const s of SKILLS) await call(page, 'useSkill', s, 5000);
  const after = await call(page, 'character');
  for (const s of SKILLS) expect(after.skills[s].level, s).toBeGreaterThan(before.skills[s].level);
  expect(after.level).toBeGreaterThan(1);
  expect(after.perkPoints).toBe(after.level - 1);
});

test("skill XP follows Skyrim's curve", async ({ page }) => {
  await boot(page);
  // One-handed: improve mult 2, offset 0, curve 1.95. A Redguard starts at 15 + 10.
  const c = await call(page, 'character');
  expect(c.skills.OneHanded.level).toBe(25);
  expect(await call<number>(page, 'skillXpToNext', 'OneHanded')).toBeCloseTo(2 * Math.pow(25, 1.95), 3);
  // Player level 1 to 2 needs fXPLevelUpBase 75 + fXPLevelUpMult 25.
  expect(await call<number>(page, 'xpToNext')).toBe(100);
});

test('perks need their skill level and earlier rank, and only the highest rank applies', async ({ page }) => {
  await boot(page);
  await call(page, 'useSkill', 'Lockpicking', 3000); // earn perk points: Lockpicking trains fast (45 per use)
  expect((await call(page, 'canTake', 'Armsman20')).ok).toBe(false);
  expect((await call(page, 'takePerk', 'Armsman00')).ok).toBe(true);
  expect(await call<number>(page, 'perkValue', 'ModAttackDamage', 10, ['WeapTypeSword'])).toBeCloseTo(12);
  expect((await call(page, 'takePerk', 'Armsman20')).ok).toBe(true);
  expect(await call<number>(page, 'perkValue', 'ModAttackDamage', 10, ['WeapTypeSword'])).toBeCloseTo(14);
  // One-handed perks do nothing for a greatsword.
  expect(await call<number>(page, 'perkValue', 'ModAttackDamage', 10, ['WeapTypeGreatsword'])).toBe(10);
});

test('equipping armour changes the outfit drawn and the armour rating; armour perks apply', async ({ page }) => {
  await boot(page);
  expect(await call(page, 'outfit')).toBe('farm');
  expect(await call<number>(page, 'armourRating')).toBe(0);
  for (const e of ['ArmorLeatherCuirass', 'ArmorLeatherBoots', 'ArmorLeatherGauntlets']) { await call(page, 'give', e); expect(await call(page, 'equip', e)).toBe(true); }
  expect(await call(page, 'outfit')).toBe('leather');
  const rating = await call<number>(page, 'armourRating');
  expect(rating).toBeGreaterThan(40); // 26 + 7 + 7 base, raised by Light Armor skill
  await call(page, 'useSkill', 'Lockpicking', 3000); // perk points
  expect((await call(page, 'takePerk', 'AgileDefender00')).ok).toBe(true);
  expect(await call<number>(page, 'armourRating')).toBeGreaterThan(rating);
  await call(page, 'give', 'ArmorSteelCuirassA'); await call(page, 'equip', 'ArmorSteelCuirassA');
  expect(await call(page, 'outfit')).toBe('steel');
});

test('dialogue: choices move reputation, and a Speech check gates the reward', async ({ page }) => {
  await boot(page);
  expect(await call(page, 'talk', 'settler')).toContain("You're not from");
  await call(page, 'choose', 2); // rude
  let rep = await call(page, 'reputation');
  expect(rep.infamy).toBe(2);
  expect(rep.standing.coastFolk).toBe(-5);
  await call(page, 'choose', 0); // leave
  // Speech starts at 15: the check fails.
  await call(page, 'talk', 'settler');
  await call(page, 'choose', 1);
  expect(await call(page, 'choose', 0)).toContain('Words are cheap');
  await call(page, 'choose', 0); // back to greeting
  await call(page, 'choose', 4); // goodbye (after the offer of work)
  // Train Speech to 25 and it passes; the sword is handed over and the offer goes away.
  while ((await call(page, 'character')).skills.Speech.level < 25) await call(page, 'useSkill', 'Speech', 500);
  await call(page, 'talk', 'settler');
  await call(page, 'choose', 1);
  expect(await call(page, 'choose', 0)).toContain('Take it');
  await call(page, 'choose', 0);
  expect((await call(page, 'character')).inventory.IronSword).toBe(1);
  await call(page, 'talk', 'settler');
  expect(await call<string[]>(page, 'choices')).not.toContain('I need a blade. Can you spare one?');
});

test('the settlement chest gives both armour sets once and trains Lockpicking', async ({ page }) => {
  await boot(page);
  const chest = (await call<any[]>(page, 'things')).find((t) => t.id === 'chest');
  await call(page, 'teleport', chest.a + 1, chest.b + 0.2);
  const lock = (await call(page, 'character')).skills.Lockpicking.xp;
  await call(page, 'interact');
  const c = await call(page, 'character');
  expect(c.inventory.ArmorLeatherCuirass).toBe(1);
  expect(c.inventory.SteelGreatsword).toBe(1);
  expect(c.skills.Lockpicking.xp).toBeGreaterThan(lock);
  await call(page, 'interact');
  expect((await call(page, 'character')).inventory.ArmorLeatherCuirass).toBe(1);
});

test('the character, reputation and flags survive save, reload and load', async ({ page }) => {
  await boot(page);
  await call(page, 'useSkill', 'OneHanded', 3000);
  await call(page, 'takePerk', 'Armsman00');
  await call(page, 'give', 'ArmorLeatherCuirass'); await call(page, 'equip', 'ArmorLeatherCuirass');
  await call(page, 'talk', 'settler'); await call(page, 'choose', 2); await call(page, 'choose', 0);
  const before = await call(page, 'character');
  await call(page, 'save', 'sys');
  await page.reload();
  await page.waitForFunction(() => (window as any).__game?.ready);
  expect((await call(page, 'character')).level).toBe(1);
  await call(page, 'load', 'sys');
  const after = await call(page, 'character');
  expect(after).toEqual(before);
  expect((await call(page, 'reputation')).infamy).toBe(2);
  expect(await call(page, 'outfit')).toBe('leather');
});

test('a version 1 save (0.1.0) migrates to the current version with the default character', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.setItem('hammerfell.save.v1', JSON.stringify({
    version: 1, savedAt: '2026-11-05T00:00:00Z', gameVersion: '0.1.0', playSeconds: 10, player: { a: 572, b: 958, facing: 'E' }, slices: {},
  })));
  expect(await call(page, 'load', 'v1')).toBe(true);
  const s = await call(page, 'readSave', 'v1');
  expect(s.version).toBe(4);
  expect(s.character).toBeNull();
  expect((await call(page, 'character')).skills.OneHanded.level).toBe(25);
});

test('quests: the settler offers the road quest; clearing the camp and reporting completes it', async ({ page }) => {
  await boot(page);
  await call(page, 'talk', 'settler');
  expect(await call<string[]>(page, 'choices')).toContain('Is there work on this road?');
  await call(page, 'choose', 3); // work
  await call(page, 'choose', 0); // I'll deal with them
  let q = await call(page, 'quests');
  expect(q.tracker[0].title).toBe('The road east');
  await call(page, 'choose', 4); // goodbye
  // Clear the camp: every bandit dead.
  await call(page, 'give', 'IronSword'); await call(page, 'equip', 'IronSword');
  await call(page, 'teleport', 5 * 128 + 40, 7 * 128 + 70);
  await page.waitForTimeout(300);
  await call(page, 'calm');
  for (const id of ['coastCamp:0', 'coastCamp:1', 'coastCamp:2', 'coastCamp:3']) {
    await call(page, 'setHealth', id, 1);
    await call(page, 'placeEnemy', id, 1.2, 0);
    await call(page, 'attackAt', id);
    await page.waitForTimeout(700);
  }
  expect(await call<string[]>(page, 'flags')).toContain('cleared:coastCamp');
  q = await call(page, 'quests');
  expect(q.tracker[0].objectives[0].text).toBe('Tell the settler the road is clear');
  const before = (await call(page, 'character')).inventory.Bandage ?? 0;
  await call(page, 'talk', 'settler');
  await call(page, 'choose', 3); // the camp is cleared (the offer of work is gone)
  q = await call(page, 'quests');
  expect(q.done).toEqual(['clearRoad']);
  expect((await call(page, 'character')).inventory.Bandage).toBe(before + 2);
  // It survives a save and load.
  await call(page, 'save', 'q'); await page.reload(); await page.waitForFunction(() => (window as any).__game?.ready);
  await call(page, 'load', 'q');
  expect((await call(page, 'quests')).done).toEqual(['clearRoad']);
});

test('character creation on a first visit: the name is kept, and only drawn races can be picked', async ({ page }) => {
  await boot(page);
  await expect(page.locator('#create')).toBeVisible();
  await expect(page.locator('#create-races button')).toHaveCount(10);
  await expect(page.locator('#create-races button:not([disabled])')).toHaveText(['Redguard']);
  await page.locator('#warning button[data-gore="full"]').click();
  await page.locator('#create-name').fill('Yusuf');
  await page.locator('#create-go').click();
  await expect(page.locator('#create')).toBeHidden();
  expect((await call(page, 'character')).name).toBe('Yusuf');
  await call(page, 'save', 'named'); await page.reload(); await page.waitForFunction(() => (window as any).__game?.ready);
  await expect(page.locator('#create')).toBeHidden(); // a save exists now
  await call(page, 'load', 'named');
  expect((await call(page, 'character')).name).toBe('Yusuf');
});

test('the clock runs at timescale 20 and the light follows the hour', async ({ page }) => {
  await boot(page);
  const t0 = await call<number>(page, 'time');
  expect(t0).toBeGreaterThanOrEqual(7 * 3600);
  await page.waitForTimeout(1000);
  const t1 = await call<number>(page, 'time');
  expect(t1 - t0).toBeGreaterThan(15); expect(t1 - t0).toBeLessThan(30);
  await call(page, 'setTime', 12 * 3600); await page.waitForTimeout(100);
  expect(await call<number>(page, 'light')).toBe(0xffffff);
  await call(page, 'setTime', 23 * 3600); await page.waitForTimeout(100);
  const night = await call<number>(page, 'light');
  expect(night & 0xff).toBeGreaterThan((night >> 16) & 0xff); // bluer than red at night
  await expect(page.locator('#hud')).toContainText('Day 1, 23:');
});
