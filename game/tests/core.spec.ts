import { test, expect } from '@playwright/test';
import { start } from './start';

// The engine core: the title and new-game screens, moving, and saves (versioned, migrated).

test('a new game through the title, warning and naming screens starts at home with the opening scene', async ({ page }) => {
  await page.goto('./');
  await page.waitForFunction(() => (window as any).__game?.ready, null, { timeout: 30_000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => (window as any).__game?.ready);
  // The title: a key starts the intro over the coast at dusk, a second key skips to the menu.
  await expect(page.locator('#front')).toHaveClass(/st-press/);
  await page.keyboard.press('Enter');
  await expect(page.locator('#front')).toHaveClass(/st-intro/);
  expect(await page.evaluate(() => __game.world?.id)).toBe('coast');
  await page.keyboard.press('Enter');
  await expect(page.locator('#front')).toHaveClass(/st-menu/);
  await expect(page.locator('#front h1')).toHaveText(/Salt Ledger/i);
  await page.locator('[data-front="new"]').click();
  await page.locator('[data-gore="some"]').click();
  await page.locator('#nameBox').fill('Rashad');
  await page.locator('[data-front="begin"]').click();
  await expect(page.locator('#front')).toBeHidden();
  const s = await page.evaluate(() => ({ map: __game.world.id, name: __game.S.name, scene: !!__game.scene, gore: __game.settings.gore }));
  expect(s).toEqual({ map: 'farmhouse', name: 'Rashad', scene: true, gore: 'some' });
});

test('walking moves him and turns him the way he goes', async ({ page }) => {
  await start(page);
  await page.evaluate(() => __game.go('coast', 1250, 1560));
  const before = await page.evaluate(() => ({ x: __game.pl.x, y: __game.pl.y }));
  await page.keyboard.down('KeyD'); await page.waitForTimeout(600); await page.keyboard.up('KeyD');
  const after = await page.evaluate(() => ({ x: __game.pl.x, y: __game.pl.y, face: __game.pl.face }));
  expect(after.x - before.x).toBeGreaterThan(10);
  expect(Math.abs(after.y - before.y)).toBeLessThan(3);
  expect(Math.abs(Math.sin(after.face))).toBeGreaterThan(0.9); // side-on
});

test('doors lead into rooms and back out', async ({ page }) => {
  await start(page);
  const out = await page.evaluate(() => { const d = __game.world.doors[0]; __game.teleport(d.x, d.y - 4); __game.activate(); return d.to; });
  expect(out).toBe('coast');
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => __game.world.id)).toBe('coast');
});

test('a save keeps where he is, what he carries and what has happened', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.go('coast', 830, 1150); __game.give('SteelSword', 1); __game.setFlag('test.flag'); __game.state.gold = 77; __game.save('quick'); });
  await page.evaluate(() => { __game.go('farmhouse', 100, 100); __game.give('SteelSword', -1); __game.state.gold = 0; __game.flags.delete('test.flag'); });
  expect(await page.evaluate(() => __game.load('quick'))).toBe(true);
  const s = await page.evaluate(() => ({ map: __game.world.id, x: Math.round(__game.pl.x), sword: __game.state.inv.SteelSword, gold: __game.state.gold, f: __game.hasFlag('test.flag') }));
  expect(s).toEqual({ map: 'coast', x: 830, sword: 1, gold: 77, f: true });
});

test('a save from 0.6 (version 5) loads, keeping skills, perks, kit and story', async ({ page }) => {
  await start(page);
  const old = {
    version: 5, savedAt: '2026-11-01T00:00:00.000Z', gameVersion: '0.6.0', playSeconds: 1200, player: { a: 10, b: 10, facing: 'S' }, slices: {},
    character: { name: 'Old Kasim', race: 'RedguardRace', level: 4, xp: 10, perkPoints: 1, perks: ['Armsman00'],
      skills: { OneHanded: { level: 41, xp: 3 }, TwoHanded: { level: 15, xp: 0 }, Block: { level: 22, xp: 0 }, HeavyArmor: { level: 15, xp: 0 }, LightArmor: { level: 18, xp: 0 }, Smithing: { level: 15, xp: 0 }, Speech: { level: 30, xp: 0 } },
      inventory: { IronSword: 1, ArmorHideCuirass: 1 }, equipped: { mainHand: 'IronSword', body: 'ArmorHideCuirass' } },
    reputation: { infamy: 3, collateral: 0, standing: {}, log: [] }, flags: ['pro01.morning'], combat: { rage: 25, bleed: 0, limp: 0, bodies: {} },
    quests: { active: {}, done: ['chores'] }, time: 30000, bond: { wife: 2, child: 1, dog: 1 },
  };
  await page.evaluate((o) => localStorage.setItem('hammerfell.save.old', JSON.stringify(o)), old);
  expect(await page.evaluate(() => __game.load('old'))).toBe(true);
  const s = await page.evaluate(() => ({ map: __game.world.id, name: __game.S.name, oh: __game.state.skills.OneHanded.level, perk: __game.state.perks.has('Armsman00'), weapon: __game.pl.eq.weapon, body: __game.pl.eq.body, rage: Math.round(__game.state.rage), chores: __game.quests.s.done.includes('chores'), f: __game.hasFlag('pro01.morning'), rageSkill: __game.state.skills.Rage.level }));
  expect(s).toEqual({ map: 'coast', name: 'Old Kasim', oh: 41, perk: true, weapon: 'IronSword', body: 'ArmorHideCuirass', rage: 25, chores: true, f: true, rageSkill: 15 });
});

test('a save from a newer version is refused with a message, and the game carries on', async ({ page }) => {
  await start(page);
  await page.evaluate(() => localStorage.setItem('hammerfell.save.future', JSON.stringify({ version: 99, game: {} })));
  expect(await page.evaluate(() => __game.load('future'))).toBe(false);
  expect(await page.evaluate(() => __game.world.id)).toBe('farmhouse');
});
