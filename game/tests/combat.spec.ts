import { test, expect, type Page } from '@playwright/test';
import { start, flag } from './start';

// The fighting (from the art sample): blows, finishers, Fury, looting bodies, Rage perks.

// Stand next to a bandit at the camp with a sword in hand.
async function atCamp(page: Page) {
  await start(page);
  await page.evaluate(() => {
    __game.go('coast', 1760, 920); __game.give('IronSword', 1); __game.equip('IronSword');
    for (const id of ['bandit2', 'bandit3', 'bandit4', 'bandit5', 'banditChief']) __game.run('kill ' + id);
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => { const b = __game.actor('bandit1'); __game.teleport(b.x, b.y + 22); __game.face(b.x, b.y); });
}

test('bandits have a quarter more health than the sample, and a blow hurts one and trains One-handed', async ({ page }) => {
  await atCamp(page);
  const before = await page.evaluate(() => ({ hp: __game.actor('bandit1').hp, max: __game.actor('bandit1').maxHp, xp: __game.state.skills.OneHanded.xp }));
  expect(before.max).toBeCloseTo(5 * 1.25);
  await page.evaluate(() => { __game.stagger('bandit1'); __game.fight('bandit1'); }); await page.waitForTimeout(700); // held still, so the blow lands
  const after = await page.evaluate(() => ({ hp: __game.actor('bandit1').hp, xp: __game.state.skills.OneHanded.xp }));
  expect(after.hp).toBeLessThan(before.hp);
  expect(after.xp).toBeGreaterThan(before.xp);
});

test('a staggered enemy can be finished with F, and the body can be stripped', async ({ page }) => {
  await atCamp(page);
  await page.evaluate(() => __game.stagger('bandit1'));
  await page.keyboard.press('KeyF'); await page.waitForTimeout(3000);
  const s = await page.evaluate(() => ({ dead: __game.actor('bandit1').dead, fins: __game.state.stats.finishers }));
  expect(s).toEqual({ dead: true, fins: 1 });
  expect(await flag(page, 'cleared:campBandits')).toBe(true);
  await page.evaluate(() => __game.lootFrom(__game.actor('bandit1'), 'ArmorLeatherCuirass'));
  const body = await page.evaluate(() => ({ worn: __game.actor('bandit1').eq.body, mine: __game.state.inv.ArmorLeatherCuirass }));
  expect(body).toEqual({ worn: null, mine: 1 });
});

test('Q with a full Rage bar roars into Fury', async ({ page }) => {
  await atCamp(page);
  await page.evaluate(() => { __game.state.rage = 100; });
  await page.keyboard.press('KeyQ'); await page.waitForTimeout(1500);
  const s = await page.evaluate(() => ({ rage: __game.state.rage, fury: __game.state.fury > 0 }));
  expect(s.fury).toBe(true);
  expect(s.rage).toBeLessThanOrEqual(40);
});

test('a Rage point from a name buys a Rage perk, and only a Rage perk', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.state.ragePoints = 1; __game.state.perkPoints = 0; });
  expect(await page.evaluate(() => __game.takePerk('Armsman00'))).toBe(false);
  expect(await page.evaluate(() => __game.takePerk('RageBloodlust'))).toBe(true);
  expect(await page.evaluate(() => [__game.state.perks.has('RageBloodlust'), __game.state.ragePoints])).toEqual([true, 0]);
});

test('the story keeps people alive who must live: a beaten Bahram yields instead of dying', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.setFlag('quest:a14'); __game.setFlag('farm.burned'); __game.go('coast', 640, 300); });
  await page.waitForTimeout(300);
  const b = await page.evaluate(() => { const a = __game.actor('bahram'); return { hp: a.maxHp, yieldAt: a.yieldAt }; });
  expect(b.hp).toBeCloseTo(16 * 1.25);
  expect(b.yieldAt).toBe(0.2);
});
