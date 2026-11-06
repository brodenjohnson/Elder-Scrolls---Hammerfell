import { test, expect, type Page } from '@playwright/test';

// Combat feel (bible 11, v0.3): kept presses, combos, hit-stop, knockback, aim assist, wind-ups.

async function boot(page: Page) {
  await page.goto('./');
  await page.waitForFunction(() => (window as any).__game?.ready, null, { timeout: 30_000 });
}
const call = <T = any>(page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window as any).__game[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>;
const wait = (page: Page, s: number) => page.waitForTimeout(s * 1000);
const fighter = async (page: Page, id: string) => (await call<any[]>(page, 'fighters')).find((f) => f.id === id);

async function toCamp(page: Page) {
  await boot(page);
  await call(page, 'give', 'IronSword'); await call(page, 'equip', 'IronSword');
  await call(page, 'teleport', 5 * 128 + 40, 7 * 128 + 70);
  await wait(page, 0.3);
  await call(page, 'calm');
}

test('a press during a swing is kept and runs as the next hit of the combo', async ({ page }) => {
  await toCamp(page);
  await call(page, 'placeEnemy', 'coastCamp:0', 1.2, 0);
  expect(await call(page, 'attackAt', 'coastCamp:0')).toBe(true);
  expect(await call(page, 'swing')).toBe(true); // straight away: too early to act, so it is kept
  expect((await fighter(page, 'player')).buffer).toBe('quick');
  await wait(page, 0.5);
  const p = await fighter(page, 'player');
  expect(p.buffer).toBeNull();
  expect(p.combo).toBe(1);
});

test('the third hit of a chain does more damage, and blows knock back and freeze the fight', async ({ page }) => {
  await toCamp(page);
  await call(page, 'placeEnemy', 'coastCamp:0', 1.2, 0);
  const before = await fighter(page, 'coastCamp:0');
  await call(page, 'attackAt', 'coastCamp:0');
  await wait(page, 0.2); // the blow lands at about 0.17 s
  const feel = await call(page, 'feel');
  expect(feel.shake).toBeGreaterThan(0);
  await wait(page, 0.6); // after the hit-stop, the knockback plays out
  const after = await fighter(page, 'coastCamp:0');
  expect(Math.hypot(after.a - before.a, after.b - before.b)).toBeGreaterThan(0.3); // knocked back
  await call(page, 'setCombo', 0);
  const first = (await call(page, 'rules', 'player', 'coastCamp:0')).damage;
  await call(page, 'setCombo', 2);
  expect((await call(page, 'rules', 'player', 'coastCamp:0')).damage).toBeCloseTo(first * 1.25, 5);
});

test('aim assist turns a swing towards an enemy roughly in front, and lunges in', async ({ page }) => {
  await toCamp(page);
  await call(page, 'placeEnemy', 'coastCamp:0', 2.2, 0);
  const start = await fighter(page, 'player');
  // Face a little off (the next direction round), then swing.
  const facing = (await fighter(page, 'player')).facing;
  const round = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  await call(page, 'swing', round[(round.indexOf(facing) + 1) % 8]);
  await wait(page, 0.3);
  const p = await fighter(page, 'player'), e = await fighter(page, 'coastCamp:0');
  expect(Math.hypot(p.a - start.a, p.b - start.b)).toBeGreaterThan(0.3);
  expect(Math.hypot(p.a - e.a, p.b - e.b)).toBeLessThan(2.2);
});

test('enemies wind up before they swing, long enough to see and parry', async ({ page }) => {
  await toCamp(page);
  const t = await call<number>(page, 'enemySwing', 'coastCamp:0');
  const e = await fighter(page, 'coastCamp:0');
  expect(e.state).toBe('attack');
  expect(e.windup).toBeCloseTo(0.3, 3);
  expect(t).toBeGreaterThan(0.4);
  const tp = await call<number>(page, 'enemySwing', 'coastCamp:0', true);
  expect(tp).toBeGreaterThan(t);
});
