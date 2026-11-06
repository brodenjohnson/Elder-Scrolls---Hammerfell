import { test, expect, type Page } from '@playwright/test';
import { start } from './start';

// Fixes from play (0.8.1): putting the weapon away, lines that wait to be read, no blows in a
// cutscene, and the people the story needs cannot be killed.

const khadija = async (page: Page) => {
  await page.evaluate(() => { __game.setFlag('khadija.met'); __game.setTime(11); __game.go('coast', 1190, 1975); });
  await page.waitForTimeout(200);
  return page.evaluate(() => !!__game.actor('khadija'));
};

test('R puts the weapon away and draws it again, and attacking draws it instead of swinging', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.go('coast', 1250, 1560); __game.give('IronSword', 1); __game.equip('IronSword'); });
  await page.keyboard.press('KeyR'); await page.waitForTimeout(100);
  expect(await page.evaluate(() => ({ s: !!__game.pl.sheathed, w: __game.pl.eq.weapon }))).toEqual({ s: true, w: 'IronSword' });
  await page.keyboard.press('KeyJ'); await page.waitForTimeout(100);
  expect(await page.evaluate(() => ({ s: !!__game.pl.sheathed, a: __game.pl.anim }))).toEqual({ s: false, a: 'idle' });
  await page.keyboard.press('KeyR'); await page.waitForTimeout(100);
  await page.keyboard.press('KeyR'); await page.waitForTimeout(100);
  expect(await page.evaluate(() => !!__game.pl.sheathed)).toBe(false);
  await page.keyboard.press('KeyJ'); await page.waitForTimeout(60);
  expect(await page.evaluate(() => __game.pl.anim)).toBe('slash1');
});

test('a line in a cutscene stays up until Space moves it on', async ({ page }) => {
  await start(page);
  await page.evaluate(() => __game.run('scene opening'));
  const first = await page.evaluate(() => __game.scene.view.caption);
  await page.waitForTimeout(4500); // longer than the line's old 3.6 seconds
  expect(await page.evaluate(() => ({ c: __game.scene.view.caption, held: __game.scene.view.held }))).toEqual({ c: first, held: true });
  await expect(page.locator('#skip .go')).toBeVisible();
  await page.keyboard.press('Space'); await page.waitForTimeout(100);
  expect(await page.evaluate(() => __game.scene.view.caption)).not.toBe(first);
});

test('nobody lands a blow on him while a cutscene plays', async ({ page }) => {
  await start(page);
  expect(await khadija(page)).toBe(true);
  await page.evaluate(() => { __game.run('hostile khadija'); const k = __game.actor('khadija'); k.dmg = 30; k.aggro = true; __game.teleport(k.x + 12, k.y); });
  await page.evaluate(() => __game.run('scene opening'));
  const hp = await page.evaluate(() => __game.pl.hp);
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => __game.pl.hp)).toBe(hp);
});

test('Khadija cannot be killed: she goes down, cannot be finished, gets up, and a save with her dead brings her back', async ({ page }) => {
  await start(page);
  expect(await khadija(page)).toBe(true);
  await page.evaluate(() => { __game.run('hostile khadija'); const k = __game.actor('khadija'); k.bleed = 3; k.bleedRate = 100; });
  await page.waitForTimeout(300);
  const k = await page.evaluate(() => { const a = __game.actor('khadija'); return { dead: a.dead, down: a.down > 0, hp: a.hp }; });
  expect(k).toEqual({ dead: false, down: true, hp: 1 });
  // No finisher on someone the story needs, down or not.
  await page.evaluate(() => { const a = __game.actor('khadija'); a.down = 0; a.stagger = 2; a.hp = 1; __game.teleport(a.x + 14, a.y); });
  await page.keyboard.press('KeyF'); await page.waitForTimeout(200);
  expect(await page.evaluate(() => ({ dead: __game.actor('khadija').dead, anim: __game.pl.anim }))).toEqual({ dead: false, anim: 'idle' });
  await page.evaluate(() => { const a = __game.actor('khadija'); a.bleed = 0; a.hp = 0.5; a.bleed = 1; a.bleedRate = 100; });
  await page.waitForTimeout(200);
  await page.evaluate(() => { __game.actor('khadija').down = 0.1; });
  await page.waitForTimeout(300);
  const up = await page.evaluate(() => { const a = __game.actor('khadija'); return { dead: a.dead, down: a.down > 0, up: a.hp >= a.maxHp * 0.5 }; });
  expect(up).toEqual({ dead: false, down: false, up: true });
  // A save from before this fix, with her lying dead: she is up again when the coast is entered.
  await page.evaluate(() => __game.run('kill khadija'));
  expect(await page.evaluate(() => __game.actor('khadija').dead)).toBe(true);
  await page.evaluate(() => { __game.save('quick'); __game.load('quick'); });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => __game.actor('khadija')?.dead)).toBe(false);
});
