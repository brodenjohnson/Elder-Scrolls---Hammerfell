import { test, expect, type Page } from '@playwright/test';

// Phase 1 regression list: the engine core. Each test drives the built game
// through window.__game (and real key presses for movement).

const G = (page: Page) => page.evaluate(() => (window as any).__game);
async function boot(page: Page) {
  await page.goto('./');
  await page.waitForFunction(() => (window as any).__game?.ready, null, { timeout: 30_000 });
}
async function hold(page: Page, keys: string[], ms: number) {
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(ms);
  for (const k of keys) await page.keyboard.up(k);
}
const call = <T>(page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window as any).__game[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>;

test('boots on the Sentinel Coast with the 3 by 3 slices around the player loaded', async ({ page }) => {
  await boot(page);
  const w = await call<{ region: string; sx: number; sy: number }>(page, 'where');
  expect(w.region).toBe('Sentinel Coast');
  const loaded = await call<string[]>(page, 'loadedSlices');
  expect(loaded).toHaveLength(9);
  expect(loaded).toContain(`${w.sx},${w.sy}`);
  await expect(page.locator('#version')).toHaveText(/^v\d+\.\d+\.\d+$/);
});

test('walking moves the player and turns to face the way he goes', async ({ page }) => {
  await boot(page);
  const before = await page.evaluate(() => (window as any).__game.player);
  await hold(page, ['KeyD'], 600);
  const after = await page.evaluate(() => (window as any).__game.player);
  expect(after.facing).toBe('E');
  expect(Math.hypot(after.a - before.a, after.b - before.b)).toBeGreaterThan(1);
});

test('crossing a slice border streams the next slices in, without a long frame', async ({ page }) => {
  await boot(page);
  const S = (await G(page)).SLICE as number;
  // Two tiles before the eastern edge of the start slice, then walk east-south-east (+a).
  const start = await call<{ sx: number; sy: number }>(page, 'where');
  await call(page, 'teleport', (start.sx + 1) * S - 2, start.sy * S + 30);
  await page.waitForTimeout(500);
  await hold(page, ['KeyD', 'KeyS'], 1500);
  const w = await call<{ sx: number; sy: number }>(page, 'where');
  expect(w.sx).toBe(start.sx + 1);
  const loaded = await call<string[]>(page, 'loadedSlices');
  expect(loaded).toContain(`${w.sx + 1},${w.sy}`);
  expect(loaded).not.toContain(`${start.sx - 1},${start.sy}`);
  const stats = await call<{ streamer: { maxLoadMs: number }; frameLog: number[] }>(page, 'stats');
  expect(stats.streamer.maxLoadMs).toBeLessThan(50);
  // Ground is built off the main thread, so no frame should stall for long.
  expect(Math.max(...stats.frameLog.slice(-60))).toBeLessThan(150);
});

test('houses are solid', async ({ page }) => {
  await boot(page);
  const things = await call<{ id: string; a: number; b: number }[]>(page, 'things');
  const house = things.find((t) => t.id === 'house')!;
  // Stand south of the house and walk north (screen up is -a and -b) into it.
  await call(page, 'teleport', house.a + 1, house.b + 5);
  await hold(page, ['KeyW'], 1500);
  const p = await page.evaluate(() => (window as any).__game.player);
  const insideA = Math.abs(p.a - house.a) < 2.35, insideB = Math.abs(p.b - house.b) < 2.95;
  expect(insideA && insideB).toBe(false);
});

test('deep water stops the player', async ({ page }) => {
  await boot(page);
  // Find land next to deep water south of the start (the map's sea is to the south).
  const spot = await page.evaluate(() => {
    const g = (window as any).__game, p = g.player;
    for (let b = Math.floor(p.b); b < Math.floor(p.b) + 400; b++) {
      if (g.material(p.a, b) === 0) return { a: p.a, b: b - 12 };
    }
    return null;
  });
  expect(spot).not.toBeNull();
  await call(page, 'teleport', spot!.a, spot!.b);
  await hold(page, ['KeyS', 'KeyA'], 4000); // screen down-left is +b
  const deep = await page.evaluate(() => { const g = (window as any).__game, p = g.player; return g.material(p.a, p.b); });
  expect(deep).not.toBe(0);
});

test('a smashed barrel stays smashed through save, reload and load', async ({ page }) => {
  await boot(page);
  const barrel = (await call<{ uid: string; id: string; a: number; b: number }[]>(page, 'things')).find((t) => t.id === 'barrel')!;
  await call(page, 'teleport', barrel.a + 0.9, barrel.b);
  const smashed = await call<{ uid: string } | null>(page, 'smash');
  expect(smashed?.uid).toBe(barrel.uid);
  const pos = await page.evaluate(() => (window as any).__game.player);
  await call(page, 'save', 'test');
  await page.reload();
  await page.waitForFunction(() => (window as any).__game?.ready);
  // A fresh game has the barrel again; loading the save removes it and restores the position.
  expect((await call<{ uid: string }[]>(page, 'things')).some((t) => t.uid === barrel.uid)).toBe(true);
  expect(await call(page, 'load', 'test')).toBe(true);
  const p = await page.evaluate(() => (window as any).__game.player);
  expect(Math.abs(p.a - pos.a) + Math.abs(p.b - pos.b)).toBeLessThan(0.01);
  expect((await call<{ uid: string }[]>(page, 'things')).some((t) => t.uid === barrel.uid)).toBe(false);
});

test('an old version 0 save migrates and loads', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.setItem('hammerfell.save.old', JSON.stringify({ player: { x: 600.5, y: 950.5 }, time: 42 })));
  expect(await call(page, 'load', 'old')).toBe(true);
  const p = await page.evaluate(() => (window as any).__game.player);
  expect(Math.round(p.a)).toBe(601);
  const s = await call<{ version: number; playSeconds: number }>(page, 'readSave', 'old');
  expect(s.version).toBe(4); // version 0 migrates through every version to the current one
  expect(s.playSeconds).toBe(42);
});

test('a newer published version shows a notice', async ({ page }) => {
  await page.route('**/version.json*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: '99.0.0' }) }));
  await boot(page);
  await expect(page.locator('#notice')).toBeVisible();
  await expect(page.locator('#notice')).toContainText('99.0.0');
});

test('only the farm sprite sheets load at start; an outfit loads when it is first worn', async ({ page }) => {
  await boot(page);
  expect(await call<string[]>(page, 'sheetsLoaded')).toEqual(['farm_idle', 'farm_walk']);
  await call(page, 'give', 'ArmorLeatherCuirass'); await call(page, 'equip', 'ArmorLeatherCuirass');
  await page.waitForFunction(() => (window as any).__game.sheetsLoaded().includes('leather_death'), null, { timeout: 15_000 });
  expect((await call<string[]>(page, 'sheetsLoaded')).filter((n) => n.startsWith('leather_'))).toHaveLength(7);
});
