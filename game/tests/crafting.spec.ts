import { test, expect, type Page } from '@playwright/test';
import { start } from './start';

// Smithing, trading, torches and the dark (0.8.0).

// The average brightness of the middle of the screen, around him.
const brightness = (page: Page) => page.evaluate(() => {
  const c = document.getElementById('view') as HTMLCanvasElement, g = c.getContext('2d')!, w = 60, h = 60;
  const d = g.getImageData(Math.floor(c.width / 2 - w / 2), Math.floor(c.height / 2 - h / 2), w, h).data;
  let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
  return s / (d.length / 4) / 3;
});

test('the forge makes an iron dagger from an ingot and leather strips, and trains Smithing', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.give('IronIngot', 2); __game.give('LeatherStrips', 1); });
  const xp0 = await page.evaluate(() => __game.state.skills.Smithing.xp);
  expect(await page.evaluate(() => __game.craft('forge', 'IronDagger'))).toBe(true);
  const s = await page.evaluate(() => ({ dagger: __game.state.inv.IronDagger, ingots: __game.state.inv.IronIngot, strips: __game.state.inv.LeatherStrips ?? 0, xp: __game.state.skills.Smithing.xp }));
  expect(s).toMatchObject({ dagger: 1, ingots: 1, strips: 0 });
  expect(s.xp).toBeGreaterThan(xp0);
  expect(await page.evaluate(() => __game.craft('forge', 'IronDagger'))).toBe(false); // no strips left
});

test('steel needs the Steel Smithing perk, and the perk can now be taken', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.give('SteelIngot', 2); __game.give('IronIngot', 1); __game.give('LeatherStrips', 1); __game.state.perkPoints = 1; });
  expect(await page.evaluate(() => __game.craft('forge', 'SteelSword'))).toBe(false);
  expect(await page.evaluate(() => __game.takePerk('SteelSmithing'))).toBe(true);
  expect(await page.evaluate(() => __game.craft('forge', 'SteelSword'))).toBe(true);
  // Orcish Smithing skips the Dwemer perk the coast has no use for: it needs Steel Smithing and Smithing 50.
  expect(await page.evaluate(() => __game.canTake('OrcishSmithing'))).toBe('Needs Smithing 50');
});

test('the grindstone improves a sword by Smithing, the sword stays in hand, and a save keeps it', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.give('IronSword', 1); __game.equip('IronSword'); __game.give('IronIngot', 2); });
  expect(await page.evaluate(() => __game.improve('IronSword'))).toBe(true);
  let s = await page.evaluate(() => ({ eq: __game.pl.eq.weapon, dmg: __game.ITEMS[__game.pl.eq.weapon].damage, name: __game.ITEMS[__game.pl.eq.weapon].name }));
  expect(s).toEqual({ eq: 'IronSword+1', dmg: 8, name: 'Iron Sword (Fine)' });
  expect(await page.evaluate(() => __game.improve('IronSword+1'))).toBe(false); // not good enough yet
  await page.evaluate(() => { __game.state.skills.Smithing.level = 50; });
  expect(await page.evaluate(() => __game.improve('IronSword+1'))).toBe(true);
  await page.evaluate(() => __game.save('quick'));
  await page.evaluate(() => { __game.pl.eq.weapon = null; });
  expect(await page.evaluate(() => __game.load('quick'))).toBe(true);
  s = await page.evaluate(() => ({ eq: __game.pl.eq.weapon, dmg: __game.ITEMS[__game.pl.eq.weapon].damage, name: __game.ITEMS[__game.pl.eq.weapon].name }));
  expect(s).toEqual({ eq: 'IronSword+3', dmg: 10, name: 'Iron Sword (Exquisite)' });
});

test('the workbench improves armour, the smelter makes ingots and the tanning rack leather', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.give('ArmorIronHelmet', 1); __game.give('IronOre', 4); __game.give('Hide', 1); });
  expect(await page.evaluate(() => __game.craft('smelter', 'IronIngot'))).toBe(true);
  expect(await page.evaluate(() => __game.improve('ArmorIronHelmet'))).toBe(true);
  expect(await page.evaluate(() => __game.ITEMS['ArmorIronHelmet+2'].rating)).toBe(17);
  expect(await page.evaluate(() => __game.craft('tanning', 'Leather'))).toBe(true);
  expect(await page.evaluate(() => __game.craft('tanning', 'LeatherStrips'))).toBe(true);
  expect(await page.evaluate(() => __game.state.inv.LeatherStrips)).toBe(4);
});

test('E at the smithy opens a station, and ore veins in the cave need a pickaxe', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.setTime(11); __game.go('coast', 800, 1140); });
  const r = await page.evaluate(() => { const u = __game.world.uses.find((x: any) => x.smith === 'grindstone'); __game.teleport(u.x, u.y + 14); return __game.activate(); });
  expect(r).toMatchObject({ kind: 'smith', station: 'grindstone' });
  await page.evaluate(() => __game.go('cave', 230, 270));
  await page.evaluate(() => __game.use('veinCave1'));
  expect(await page.evaluate(() => __game.state.inv.IronOre ?? 0)).toBe(0);
  await page.evaluate(() => { __game.give('Pickaxe', 1); __game.use('veinCave1'); });
  expect(await page.evaluate(() => __game.state.inv.IronOre)).toBe(3);
  expect(await page.evaluate(() => __game.use('veinCave1'))).toBe(null); // worked out
  expect(await page.evaluate(() => __game.state.inv.IronOre)).toBe(3);
});

test('Haggling lowers prices, Merchant sells anything to anyone, and stock comes back in two days', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.setTime(11); __game.go('coast', 800, 1060); __game.give('IronSword', 1); __game.state.gold = 500; });
  await page.evaluate(() => __game.shopWith('dalia'));
  const p0 = await page.evaluate(() => __game.buyPrice('Torch'));
  expect(await page.evaluate(() => __game.buysIt('IronSword'))).toBe(false);
  await page.evaluate(() => { __game.state.perks.add('Haggling00'); __game.state.perks.add('Merchant'); });
  expect(await page.evaluate(() => __game.sellPrice('ClothBolt'))).toBeGreaterThan(0);
  expect(await page.evaluate(() => __game.buysIt('IronSword'))).toBe(true);
  expect(p0).toBeGreaterThanOrEqual(await page.evaluate(() => __game.buyPrice('Torch')));
  const torches = await page.evaluate(() => __game.shop.s.stock.Torch);
  expect(await page.evaluate(() => __game.buy('Torch'))).toBe(true);
  expect(await page.evaluate(() => __game.shop.s.stock.Torch)).toBe(torches - 1);
  await page.evaluate(() => { __game.closeShop(); __game.wait(24); __game.wait(24); __game.wait(2); __game.shopWith('dalia'); });
  expect(await page.evaluate(() => __game.shop.s.stock.Torch)).toBe(torches);
});

test('after dark people outdoors carry torches, and by day they do not', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.setTime(22); __game.go('coast', 830, 1060); });
  const night = await page.evaluate(() => __game.actors.filter((a: any) => a.eq?.shield === 'Torch').length);
  expect(night).toBeGreaterThan(0);
  await page.evaluate(() => { __game.setTime(12); __game.go('coast', 830, 1060); });
  expect(await page.evaluate(() => __game.actors.filter((a: any) => a.eq?.shield === 'Torch').length)).toBe(0);
});

test('nights are dark, and L lights a torch that pushes the dark back', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.setTime(12); __game.go('coast', 1250, 1560); });
  await page.waitForTimeout(200);
  const day = await brightness(page);
  await page.evaluate(() => { __game.setTime(23); __game.give('Torch', 1); });
  await page.waitForTimeout(200);
  const night = await brightness(page);
  expect(night).toBeLessThan(day * 0.4);
  await page.keyboard.press('KeyL'); await page.waitForTimeout(200);
  expect(await page.evaluate(() => __game.pl.eq.shield)).toBe('Torch');
  expect(await brightness(page)).toBeGreaterThan(night * 1.4);
});

test('people can be talked to from a few steps away', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __game.setTime(11); __game.go('coast', 830, 1150); });
  const name = await page.evaluate(() => { const h = __game.actor('hamid'); __game.teleport(h.x - 32, h.y + 6); return __game.activatable()?.name; });
  expect(name).toBe('Hamid');
});
