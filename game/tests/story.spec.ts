import { test, expect, type Page } from '@playwright/test';
import { start, say, flag, active, done, go } from './start';

// The story: the prologue (PRO_01 to PRO_07) and Act One (A1.1 to A1.6) played through the
// hooks, in order, the way a player would: talk, use, fight, walk into places.

const talk = (page: Page, id: string) => page.evaluate((id) => __game.talkTo(id) as boolean, id);
const use = (page: Page, id: string) => page.evaluate((id) => __game.use(id), id);
const skip = async (page: Page) => { await page.waitForTimeout(150); await page.evaluate(() => __game.skipScene()); await page.waitForTimeout(150); };
const opened = async (page: Page) => { await page.waitForTimeout(400); return page.evaluate(() => !!__game.convo); };
// A trader's "let me see" choice opens the shop once the talk is over.
async function trade(page: Page, who: string, fn: () => void) {
  expect(await talk(page, who)).toBe(true);
  await say(page, 0); await page.waitForTimeout(100);
  expect(await page.evaluate(() => !!__game.shop)).toBe(true);
  await page.evaluate(fn);
  await page.evaluate(() => { __game.closeShop(); (window as any).HFUI.close(); });
}

test('the prologue: chores, market, evening, the hunt, the guest and the night', async ({ page }) => {
  test.setTimeout(120_000);
  await start(page);
  await talk(page, 'nadira'); await say(page, 0, 0, 0);
  expect(await active(page)).toContain('chores');
  await talk(page, 'tavi'); await say(page, 0, 0);
  expect(await flag(page, 'pro01.bone')).toBe(true);

  await go(page, 'coast', 1250, 1530); await page.waitForTimeout(200);
  await use(page, 'well'); await use(page, 'goats');
  expect(await use(page, 'northFence')).toBeNull();
  expect(await flag(page, 'fence.mended')).toBe(false); // no nails yet
  await page.evaluate(() => __game.give('Nails', 1)); await use(page, 'northFence');
  expect(await flag(page, 'fence.mended')).toBe(true);
  await page.evaluate(() => __game.teleport(1192, 1468));
  expect(await opened(page)).toBe(true); // Tavi and the smoke over the ridge
  await say(page, 0);
  expect(await active(page)).toContain('neighbours');

  await go(page, 'farmhouse', 100, 120); await page.waitForTimeout(150);
  await talk(page, 'nadira'); await say(page, 0);
  expect(await done(page)).toContain('chores');
  expect(await page.evaluate(() => [__game.state.inv.GoatCheese, __game.state.gold])).toEqual([3, 52]);

  await go(page, 'haddad', 110, 120); await use(page, 'haddad.table');
  expect(await done(page)).toContain('neighbours');

  await go(page, 'coast', 760, 1060); await page.waitForTimeout(200);
  await page.evaluate(() => __game.teleport(812, 1004));
  expect(await opened(page)).toBe(true); // the Collector at Dalia's stall
  await say(page, 2, 0); // threaten him
  expect(await flag(page, 'tarik.remembers')).toBe(true);
  await talk(page, 'amira'); await say(page, 0, 1); // the Haddads' news first
  await trade(page, 'amira', () => __game.sell('GoatCheese'));
  await trade(page, 'dalia', () => { __game.buy('LampOil'); __game.buy('ClothBolt'); });
  await talk(page, 'zeyna'); await say(page, 1, 0, 0);
  expect(await flag(page, 'pro03.goneHome')).toBe(true);

  await go(page, 'coast', 1250, 1560); await page.waitForTimeout(500); await skip(page);
  expect(await page.evaluate(() => __game.world.id)).toBe('farmhouse');
  await talk(page, 'tavi'); await say(page, 0, 0);
  expect(await page.evaluate(() => __game.state.inv.CarvedGull)).toBe(1);
  await talk(page, 'nadira'); await say(page, 0, 0, 3, 0);
  expect(await flag(page, 'evening.ready')).toBe(true);

  await use(page, 'bedDay2'); await skip(page);
  expect(await active(page)).toContain('hunt');
  expect(await page.evaluate(() => __game.pl.eq.weapon)).toBe('IronDagger');
  await go(page, 'coast', 1450, 1500); await page.waitForTimeout(400);
  await page.evaluate(() => __game.run('kill boar')); await page.waitForTimeout(150);
  expect(await flag(page, 'dune.hurt')).toBe(true);
  await page.evaluate(() => { __game.pet('dune'); __game.pet('dune'); });
  expect(await flag(page, 'dune.bandaged')).toBe(true);

  await page.evaluate(() => __game.teleport(1300, 1500)); await page.waitForTimeout(400); await skip(page);
  expect(await opened(page)).toBe(true); // the stranger at the table
  await say(page, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0); await skip(page);
  expect(await flag(page, 'kerrash.refused')).toBe(true);
  expect(await active(page)).toContain('night');

  await use(page, 'bedNight'); await skip(page);
  expect(await page.evaluate(() => __game.actors.filter((a: any) => a.def?.group === 'nightRaiders').length)).toBe(4);
  await page.evaluate(() => __game.run('kill raider1')); await page.waitForTimeout(500); await skip(page);
  const after = await page.evaluate(() => ({ map: __game.world.id, burned: __game.hasFlag('farm.burned'), dagger: !!__game.state.inv.IronDagger, gull: !!__game.state.inv.CarvedGull }));
  expect(after).toEqual({ map: 'zeyna', burned: true, dagger: false, gull: false });
  expect(await active(page)).toContain('a11');
});

test('Act One: Zeyna, the hill, the Collector, the Hammer, the Unbent and the truth', async ({ page }) => {
  test.setTimeout(120_000);
  await start(page);
  // Straight to the morning at Zeyna's, as the night leaves it.
  await page.evaluate(() => { for (const f of ['farm.burned', 'family.gone', 'night.over', 'pro04.gullKept', 'pro04.asked']) __game.setFlag(f); __game.go('zeyna', 150, 110); __game.quests.start('a11'); });
  await talk(page, 'zeyna'); await say(page, 0, 0, 0, 0, 0, 0, 0, 0);
  expect(await page.evaluate(() => __game.state.inv.IronDagger)).toBe(1);
  expect(await active(page)).toContain('a12');

  await go(page, 'coast', 1250, 1540); await page.waitForTimeout(400);
  expect(await flag(page, 'hill.arrived')).toBe(true);
  await talk(page, 'zeyna'); await say(page, 2, 0, 0); // "I said I'd stay"; the missing gull
  expect(await flag(page, 'gull.missing')).toBe(true);
  await use(page, 'wellstone');
  expect(await page.evaluate(() => [__game.state.inv.GullKey, __game.state.inv.LedgerPage])).toEqual([1, 1]);
  await talk(page, 'zeyna'); await say(page, 2, 0);
  expect(await active(page)).toContain('a13');

  await go(page, 'coast', 1600, 1300); await page.waitForTimeout(500);
  await page.evaluate(() => { __game.run('kill rider1'); __game.run('kill rider2'); __game.yieldNow('conscript'); __game.yieldNow('tarik_road'); });
  await talk(page, 'conscript'); await say(page, 0, 0);
  expect(await flag(page, 'conscript.spared')).toBe(true);
  await talk(page, 'tarik_road'); await say(page, 1, 2); // hand him to the village
  expect(await flag(page, 'named:tarik_road')).toBe(true);
  expect(await page.evaluate(() => __game.state.ragePoints)).toBe(1); // a name crossed off
  expect(await active(page)).toContain('a14');

  await go(page, 'coast', 640, 270); await page.waitForTimeout(400);
  await page.evaluate(() => { for (const id of ['kesh1', 'kesh2', 'kesh3', 'kesh4', 'kesh5', 'keshHound1', 'keshHound2']) __game.run('kill ' + id); });
  await page.evaluate(() => { const b = __game.actor('bahram'); __game.teleport(b.x, b.y + 24); __game.yieldNow('bahram'); });
  await talk(page, 'bahram'); await say(page, 0, 0, 0, 0);
  await page.waitForTimeout(2500); // the finisher plays out
  expect(await flag(page, 'named:bahram')).toBe(true);
  expect(await flag(page, 'heard.count')).toBe(true);
  await page.evaluate(() => __game.lootFrom(__game.actor('bahram'), 'SaltHookSeal'));
  expect(await active(page)).toContain('a15');

  await page.evaluate(() => __game.run('refresh'));
  await talk(page, 'khadija'); await say(page, 0, 1, 0);
  await go(page, 'coast', 1190, 1990); await page.waitForTimeout(300);
  await talk(page, 'khadija'); await say(page, 0);
  expect(await page.evaluate(() => __game.foes.some((f: any) => f.id === 'khadija'))).toBe(true); // sparring
  await page.evaluate(() => { for (let i = 0; i < 3; i++) __game.notify('interact', 'parry'); }); await page.waitForTimeout(300);
  expect(await page.evaluate(() => __game.foes.some((f: any) => f.id === 'khadija'))).toBe(false);
  await talk(page, 'khadija'); await say(page, 0);
  await page.evaluate(() => { __game.state.rage = 70; }); await page.waitForTimeout(300);
  await talk(page, 'khadija'); await say(page, 0, 0, 0);
  expect(await page.evaluate(() => __game.state.ragePoints)).toBe(3); // two names and Khadija's lesson
  expect(await active(page)).toContain('a16');

  await go(page, 'zeyna', 120, 130);
  await talk(page, 'zeyna'); await say(page, 0, 0, 0, 1, 1); await skip(page);
  expect(await flag(page, 'act1.done')).toBe(true);
  expect(await page.evaluate(() => __game.state.inv.Folio)).toBe(1);
  expect(await done(page)).toEqual(expect.arrayContaining(['a11', 'a12', 'a13', 'a14', 'a15', 'a16']));
});
