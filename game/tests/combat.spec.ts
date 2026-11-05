import { test, expect, type Page } from '@playwright/test';

// Phase 3 regression list (first part): melee in the world against the bandit camp.

async function boot(page: Page) {
  await page.goto('./');
  await page.waitForFunction(() => (window as any).__game?.ready, null, { timeout: 30_000 });
}
const call = <T = any>(page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window as any).__game[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>;
const wait = (page: Page, s: number) => page.waitForTimeout(s * 1000);
const player = async (page: Page) => (await call<any[]>(page, 'fighters')).find((f) => f.id === 'player');
const bandit = async (page: Page, i = 0) => (await call<any[]>(page, 'fighters')).find((f) => f.id === `coastCamp:${i}`);

// Walk into the camp's slice with a sword in hand.
async function toCamp(page: Page) {
  await boot(page);
  await call(page, 'give', 'IronSword'); await call(page, 'equip', 'IronSword');
  await call(page, 'teleport', 5 * 128 + 40, 7 * 128 + 70);
  await wait(page, 0.3);
  await call(page, 'calm');
}

test('the bandit camp is there when its slice loads', async ({ page }) => {
  await toCamp(page);
  for (const i of [0, 1, 2]) expect((await bandit(page, i))?.state).not.toBe('dead');
});

test('a bandit hit does what the rules say', async ({ page }) => {
  await toCamp(page);
  const t = await call<number>(page, 'enemySwing', 'coastCamp:0');
  await wait(page, t + 0.3);
  const want = (await call(page, 'rules', 'coastCamp:0', 'player')).damage;
  expect(100 - (await player(page)).health).toBeCloseTo(want, 3);
});

test('a block raised just before the blow parries', async ({ page }) => {
  await toCamp(page);
  const t = await call<number>(page, 'enemySwing', 'coastCamp:0');
  await wait(page, t - 0.1);
  await call(page, 'block', true);
  await wait(page, 0.3);
  expect((await player(page)).health).toBe(100);
  expect((await bandit(page)).state).toBe('hit');
});

test('a last-instant roll is a perfect dodge', async ({ page }) => {
  await toCamp(page);
  const t = await call<number>(page, 'enemySwing', 'coastCamp:0', true);
  await wait(page, t - 0.08);
  await call(page, 'roll');
  await wait(page, 0.12);
  expect((await player(page)).health).toBe(100);
  expect(await call<number>(page, 'timeScale')).toBeLessThan(1);
});

test('killing a bandit trains One-handed, leaves a body to search, and stays dead after a save', async ({ page }) => {
  await toCamp(page);
  const before = (await call(page, 'character')).skills.OneHanded;
  const b = await bandit(page);
  await call(page, 'teleport', b.a + 1.2, b.b);
  for (let i = 0; i < 4 && (await bandit(page)).state !== 'dead'; i++) { await call(page, 'attackAt', 'coastCamp:0', true); await wait(page, 1.0); }
  expect((await bandit(page)).state).toBe('dead');
  const after = (await call(page, 'character')).skills.OneHanded;
  expect(after.level * 1e6 + after.xp).toBeGreaterThan(before.level * 1e6 + before.xp);
  await call(page, 'interact');
  expect((await call(page, 'character')).inventory.ArmorLeatherCuirass).toBe(1);
  await call(page, 'interact'); // already searched
  expect((await call(page, 'character')).inventory.ArmorLeatherCuirass).toBe(1);
  await call(page, 'save', 'fight');
  await page.reload(); await page.waitForFunction(() => (window as any).__game?.ready);
  await call(page, 'load', 'fight');
  await wait(page, 0.3);
  expect((await bandit(page)).state).toBe('dead');
  expect((await bandit(page, 1)).state).not.toBe('dead');
});

test('the player can die, and N starts again', async ({ page }) => {
  await toCamp(page);
  for (let i = 0; i < 8 && (await player(page)).state !== 'dead'; i++) {
    const t = await call<number>(page, 'enemySwing', 'coastCamp:0', true);
    await wait(page, t + 0.9);
  }
  expect((await player(page)).state).toBe('dead');
  await expect(page.locator('#dead')).toBeVisible();
  await page.keyboard.press('KeyN');
  await wait(page, 0.3);
  expect((await player(page)).state).not.toBe('dead');
  expect((await call(page, 'where')).region).toBe('Sentinel Coast');
});
