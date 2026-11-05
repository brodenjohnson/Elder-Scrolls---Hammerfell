import { test, expect, type Page } from '@playwright/test';

// Phase 3 regression list (second part): Rage and Fury, wounds, dismemberment and finishers.

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

test('Rage fills from blows taken and dealt', async ({ page }) => {
  await toCamp(page);
  expect(await call<number>(page, 'rage')).toBe(0);
  await call(page, 'setRandom', 0.999); // no wounds, so health only moves by the blow
  const t = await call<number>(page, 'enemySwing', 'coastCamp:0');
  await wait(page, t + 0.2);
  const lost = 100 - (await fighter(page, 'player')).health;
  expect(await call<number>(page, 'rage')).toBeCloseTo(lost, 1); // 1 per 1 percent of Health lost
  await call(page, 'placeEnemy', 'coastCamp:1', 1.2, 0);
  const before = await call<number>(page, 'rage');
  const dealt = (await call(page, 'rules', 'player', 'coastCamp:1')).damage;
  await call(page, 'attackAt', 'coastCamp:1');
  await wait(page, 0.5);
  expect(await call<number>(page, 'rage')).toBeCloseTo(before + (20 * dealt) / 35, 1); // 1 per 5 percent dealt
});

test('Fury: the burst costs 30 Rage, shrugs off flinching, and leaves you exhausted', async ({ page }) => {
  await toCamp(page);
  expect(await call(page, 'fury', 'burst')).toBe(false); // no Rage yet
  await call(page, 'setRage', 40);
  expect(await call(page, 'fury', 'burst')).toBe(true);
  expect(await call<number>(page, 'rage')).toBe(10);
  await call(page, 'setRandom', 0.999);
  const t = await call<number>(page, 'enemySwing', 'coastCamp:0');
  await wait(page, t + 0.05);
  expect((await fighter(page, 'player')).state).not.toBe('hit');
  const rules = await call(page, 'rules', 'coastCamp:0', 'player');
  expect(rules.steps).toContain('x0.85 burst');
  await page.evaluate(() => { (window as any).__game.game.combat.fury.left = 0.05; });
  await wait(page, 0.2);
  const s = await call(page, 'furyState');
  expect(s.fury).toBeNull();
  expect(s.exhausted).toBeGreaterThan(25);
  // Locked powers stay locked until their name is crossed off.
  await call(page, 'setRage', 100);
  expect(await call(page, 'fury', 'berserk')).toBe(false);
  await call(page, 'unlockFury', 'berserk');
  expect(await call(page, 'fury', 'berserk')).toBe(true);
});

test('a serious hit bleeds and can lame; a bandage stops both', async ({ page }) => {
  await toCamp(page);
  await call(page, 'setRandom', 0); // the leg is always hit
  const t = await call<number>(page, 'enemySwing', 'coastCamp:0', true); // a power attack: over 30 percent
  await wait(page, t + 0.1);
  let w = await call(page, 'wounds');
  expect(w.bleed).toBeGreaterThan(9);
  expect(w.limp).toBeGreaterThan(1000);
  const h0 = (await fighter(page, 'player')).health;
  await wait(page, 1.5);
  expect((await fighter(page, 'player')).health).toBeLessThan(h0 - 1);
  expect(await call(page, 'bandage')).toBe(false); // none carried
  await call(page, 'give', 'Bandage', 2);
  expect(await call(page, 'bandage')).toBe(true);
  w = await call(page, 'wounds');
  expect(w.bleed).toBe(0); expect(w.limp).toBe(0);
  expect((await call(page, 'character')).inventory.Bandage).toBe(1);
});

test('a power killing blow takes a head off; the body and head stay put through a save', async ({ page }) => {
  await toCamp(page);
  await call(page, 'setRandom', 0);
  await call(page, 'placeEnemy', 'coastCamp:0', 1.2, 0);
  await call(page, 'setHealth', 'coastCamp:0', 1);
  await call(page, 'attackAt', 'coastCamp:0', true);
  await wait(page, 1.0);
  expect((await fighter(page, 'coastCamp:0')).state).toBe('dead');
  expect((await call(page, 'wounds', 'coastCamp:0')).severed).toEqual(['head']);
  await page.waitForFunction(() => (window as any).__game.parts().every((p: any) => p.settled), null, { timeout: 5000 });
  const [head] = await call<any[]>(page, 'parts');
  expect(head.part).toBe('head');
  const body = (await call(page, 'bodies'))['coastCamp:0'];
  expect(body.parts).toHaveLength(1);
  await call(page, 'save', 'gore');
  await page.reload(); await page.waitForFunction(() => (window as any).__game?.ready);
  await call(page, 'load', 'gore');
  await wait(page, 0.3);
  const after = await fighter(page, 'coastCamp:0');
  expect(after.a).toBeCloseTo(body.a, 2);
  expect((await call(page, 'wounds', 'coastCamp:0')).severed).toEqual(['head']);
  const [head2] = await call<any[]>(page, 'parts');
  expect(head2.a).toBeCloseTo(head.a, 2);
});

test('a quick killing blow never dismembers', async ({ page }) => {
  await toCamp(page);
  await call(page, 'setRandom', 0);
  await call(page, 'placeEnemy', 'coastCamp:0', 1.2, 0);
  await call(page, 'setHealth', 'coastCamp:0', 1);
  await call(page, 'attackAt', 'coastCamp:0');
  await wait(page, 0.6);
  expect((await fighter(page, 'coastCamp:0')).state).toBe('dead');
  expect((await call(page, 'wounds', 'coastCamp:0')).severed).toEqual([]);
});

test('finishers: only on a staggered or badly hurt enemy; it kills, beheads and feeds Rage', async ({ page }) => {
  await toCamp(page);
  await call(page, 'setRandom', 0.999);
  await call(page, 'placeEnemy', 'coastCamp:0', 1.2, 0);
  expect(await call(page, 'finish')).toBe(false); // healthy and steady
  await call(page, 'stagger', 'coastCamp:0');
  expect(await call(page, 'finish')).toBe(true);
  expect((await fighter(page, 'player')).state).toBe('finisher');
  await wait(page, 1.6);
  expect((await fighter(page, 'coastCamp:0')).state).toBe('dead');
  expect((await call(page, 'wounds', 'coastCamp:0')).severed).toContain('head');
  expect(await call<number>(page, 'rage')).toBeGreaterThanOrEqual(13); // finisher 10 + kill 3
  expect((await fighter(page, 'player')).state).not.toBe('finisher');
});

test('a version 2 save (0.3.x) migrates to version 3 with no Rage or wounds', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.setItem('hammerfell.save.v2', JSON.stringify({
    version: 2, savedAt: '2026-11-05T00:00:00Z', gameVersion: '0.3.1', playSeconds: 10, player: { a: 572, b: 958, facing: 'E' }, slices: {},
    character: null, reputation: { infamy: 0, collateral: 0, standing: {} }, flags: ['dead:coastCamp:1'],
  })));
  expect(await call(page, 'load', 'v2')).toBe(true);
  const s = await call(page, 'readSave', 'v2');
  expect(s.version).toBe(3);
  expect(s.combat).toEqual({ rage: 0, bleed: 0, limp: 0, bodies: {} });
  expect(await call<number>(page, 'rage')).toBe(0);
});
