import type { Page } from '@playwright/test';

// The game's test hooks (window.__game, src/engine/game.js) as a global in the page.
declare global { const __game: any; }

// Load the game and start a new one, skipping the warning, the naming and the opening scene.
export async function start(page: Page, name = 'Kasim') {
  await page.goto('./');
  await page.waitForFunction(() => (window as any).__game?.ready, null, { timeout: 30_000 });
  await page.evaluate((n) => {
    localStorage.clear(); localStorage.setItem('hf.warned', '1');
    (document.getElementById('front') as HTMLElement).hidden = true;
    __game.newGame(n);
  }, name);
  await page.waitForTimeout(300);
  await page.evaluate(() => __game.skipScene());
}

// Follow a conversation by choice index.
export async function say(page: Page, ...idx: number[]) {
  for (const i of idx) { await page.evaluate((i) => __game.choose(i), i); await page.waitForTimeout(20); }
}
export const flag = (page: Page, f: string) => page.evaluate((f) => __game.hasFlag(f) as boolean, f);
export const active = (page: Page) => page.evaluate(() => __game.questList().filter((q: any) => !q.done).map((q: any) => q.id) as string[]);
export const done = (page: Page) => page.evaluate(() => __game.quests.s.done as string[]);
export const go = (page: Page, map: string, x: number, y: number) => page.evaluate(([m, x, y]) => __game.go(m, x, y), [map, x, y] as const);
