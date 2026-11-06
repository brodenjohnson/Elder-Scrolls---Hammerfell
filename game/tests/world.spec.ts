import { test, expect } from '@playwright/test';
import { start, flag, say } from './start';

// The region: places, travel, days, trade, containers, encounters, Speech checks and markers.

test('places are discovered by walking near them, then can be travelled to, which takes time', async ({ page }) => {
  await start(page);
  await page.evaluate(() => __game.go('coast', 800, 1060)); await page.waitForTimeout(300);
  expect(await flag(page, 'seen:saltreach')).toBe(true);
  expect(await page.evaluate(() => __game.fastTravel('camp'))).toBe(false); // not found yet
  await page.evaluate(() => __game.go('coast', 1250, 1530)); await page.waitForTimeout(300);
  const t0 = await page.evaluate(() => __game.time());
  expect(await page.evaluate(() => __game.fastTravel('saltreach'))).toBe(true);
  await page.waitForTimeout(900);
  const s = await page.evaluate(() => ({ x: __game.pl.x, y: __game.pl.y, t: __game.time() }));
  expect(Math.hypot(s.x - 830, s.y - 1150)).toBeLessThan(30);
  expect(s.t).toBeGreaterThan(t0 + 600); // the walk's hours, at the game's time scale
});

test('people keep hours: Dalia is at her stall by day and gone at night', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.setTime(11); __game.go('coast', 800, 1060); });
  expect(await page.evaluate(() => !!__game.actor('dalia'))).toBe(true);
  await page.evaluate(() => { __game.setTime(23); __game.run('refresh'); });
  expect(await page.evaluate(() => !!__game.actor('dalia'))).toBe(false);
});

test('prices follow Speech, and a merchant only buys what she trades in', async ({ page }) => {
  await start(page);
  const low = await page.evaluate(() => __game.buyPrice('SteelSword'));
  await page.evaluate(() => { __game.state.skills.Speech.level = 90; });
  expect(await page.evaluate(() => __game.buyPrice('SteelSword'))).toBeLessThan(low);
  await page.evaluate(() => { __game.setTime(11); __game.go('coast', 800, 1060); __game.give('IronSword', 1); __game.state.gold = 0; });
  await page.evaluate(() => __game.talkTo('amira')); await say(page, 0); await page.waitForTimeout(100);
  await page.evaluate(() => __game.sell('IronSword')); // a baker does not buy swords
  expect(await page.evaluate(() => [__game.state.inv.IronSword, __game.state.gold])).toEqual([1, 0]);
});

test('a chest remembers what was taken from it', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { const c = __game.world.containers.find((x: any) => x.id === 'homeChest'); __game.teleport(c.x, c.y + 14); });
  await page.evaluate(() => { const a = __game.activate(); __game.lootFrom(a.ref, 'Bread', true); });
  await page.evaluate(() => { __game.go('coast', 1250, 1530); __game.go('farmhouse', 200, 130); });
  const left = await page.evaluate(() => { const c = __game.world.containers.find((x: any) => x.id === 'homeChest'); __game.teleport(c.x, c.y + 14); return __game.activate().ref.box.items; });
  expect(left.Bread).toBeUndefined();
  expect(left.Bandage).toBe(2);
});

test('random encounters appear on the roads away from towns', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.go('coast', 2200, 1120); __game.encounterNow(); });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => __game.dynamic())).toBeGreaterThan(0);
});

test('Speech checks in conversation pass or fail by skill', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.setFlag('quest:market'); __game.setTime(11); __game.go('coast', 800, 1060); __game.state.skills.Speech.level = 10; });
  await page.evaluate(() => __game.talkTo('amira')); await say(page, 2);
  expect(await page.evaluate(() => __game.line().text)).toMatch(/Gone in the night/);
  expect(await flag(page, 'tarik.knew')).toBe(false);
  await page.evaluate(() => { __game.flags.delete('amira.told'); __game.endConversation(); __game.state.skills.Speech.level = 20; __game.talkTo('amira'); });
  await say(page, 2);
  expect(await page.evaluate(() => __game.line().text)).toMatch(/The collector/);
});

test('the compass and map show where the current objective is', async ({ page }) => {
  await start(page);
  await page.evaluate(() => __game.quests.start('chores'));
  await page.evaluate(() => __game.go('coast', 1250, 1530));
  const t = await page.evaluate(() => __game.questTargets());
  expect(t.length).toBeGreaterThanOrEqual(3);
  expect(t.some((x: any) => x.x === 1312 && x.y === 1508)).toBe(true); // the well
});

test('sleeping passes the hours and heals', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.pl.hp = 10; });
  const t0 = await page.evaluate(() => __game.time());
  expect(await page.evaluate(() => __game.wait(8))).toBe(true);
  const s = await page.evaluate(() => ({ hp: __game.pl.hp, max: __game.pl.maxHp, t: __game.time() }));
  expect(s.hp).toBe(s.max);
  expect(Math.abs(s.t - t0 - 8 * 3600)).toBeLessThan(60); // a few game seconds pass between the calls
});
