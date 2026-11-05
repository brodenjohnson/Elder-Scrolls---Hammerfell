import { test, expect, type Page } from '@playwright/test';

// Phase 3 regression list (third part): three enemy types, each from a Skyrim template.

async function boot(page: Page) {
  await page.goto('./');
  await page.waitForFunction(() => (window as any).__game?.ready, null, { timeout: 30_000 });
}
const call = <T = any>(page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window as any).__game[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>;
const fighter = async (page: Page, id: string) => (await call<any[]>(page, 'fighters')).find((f) => f.id === id);

test('three enemy types: bandit, marauder and Alik\'r warrior, with Skyrim stats and gear', async ({ page }) => {
  await boot(page);
  await call(page, 'teleport', 5 * 128 + 40, 7 * 128 + 70);
  await page.waitForTimeout(300);
  await call(page, 'calm');
  const bandit = await fighter(page, 'coastCamp:0'), marauder = await fighter(page, 'coastCamp:3');
  expect(bandit).toMatchObject({ name: 'Bandit', weapon: 'IronSword', outfit: 'bandit', maxHealth: 35 });
  expect(marauder).toMatchObject({ name: 'Bandit marauder', weapon: 'IronBattleaxe', outfit: 'marauder', maxHealth: 35 });
  const alikr = await fighter(page, 'alikrPatrol:0');
  expect(alikr).toMatchObject({ name: "Alik'r warrior", weapon: 'Scimitar', outfit: 'alikr', maxHealth: 85 });
});

test('a battleaxe swings at its Skyrim speed: slower than a sword', async ({ page }) => {
  await boot(page);
  await call(page, 'give', 'IronSword'); await call(page, 'equip', 'IronSword');
  await call(page, 'teleport', 5 * 128 + 40, 7 * 128 + 70);
  await page.waitForTimeout(300);
  const sword = await call<number>(page, 'enemySwing', 'coastCamp:0');
  await page.waitForTimeout(1500);
  const axe = await call<number>(page, 'enemySwing', 'coastCamp:3');
  expect(axe / sword).toBeCloseTo(1 / 0.7, 2);
});

test('the Steel set fights with the greatsword now', async ({ page }) => {
  await boot(page);
  for (const e of ['ArmorSteelCuirassA', 'SteelGreatsword']) { await call(page, 'give', e); await call(page, 'equip', e); }
  expect(await call(page, 'outfit')).toBe('steel');
  await call(page, 'teleport', 5 * 128 + 40, 7 * 128 + 70);
  await page.waitForTimeout(300);
  await call(page, 'calm');
  await call(page, 'placeEnemy', 'coastCamp:0', 1.2, 0);
  expect(await call(page, 'attackAt', 'coastCamp:0')).toBe(true);
  await page.waitForFunction(() => (window as any).__game.sheetsLoaded().includes('steel_attack'), null, { timeout: 15_000 });
});

test('morale: a badly hurt bandit may break and run, and cutting down a runner costs Infamy', async ({ page }) => {
  await boot(page);
  await call(page, 'give', 'IronSword'); await call(page, 'equip', 'IronSword');
  await call(page, 'teleport', 5 * 128 + 40, 7 * 128 + 70);
  await page.waitForTimeout(300);
  await call(page, 'calm');
  await call(page, 'setRandom', 0); // the morale check always fails
  await call(page, 'placeEnemy', 'coastCamp:0', 1.5, 0);
  await call(page, 'setHealth', 'coastCamp:0', 5);
  await call(page, 'wake', 'coastCamp:0');
  await page.waitForTimeout(600);
  expect(await call(page, 'morale', 'coastCamp:0')).toEqual({ fleeing: true, checked: true });
  const p = await fighter(page, 'player'), e = await fighter(page, 'coastCamp:0');
  expect(Math.hypot(e.a - p.a, e.b - p.b)).toBeGreaterThan(2.5);
  const infamy = (await call(page, 'reputation')).infamy;
  await call(page, 'calm'); // hold the runner still: a power attack is slower than he runs
  await call(page, 'placeEnemy', 'coastCamp:0', 1.2, 0);
  await call(page, 'attackAt', 'coastCamp:0', true);
  await page.waitForTimeout(1000);
  expect((await fighter(page, 'coastCamp:0')).state).toBe('dead');
  expect((await call(page, 'reputation')).infamy).toBe(infamy + 3);
});
