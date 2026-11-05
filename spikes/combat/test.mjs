// Arena regression test: each mechanic driven through window.__game, checked against the rules.
// Usage: node test.mjs   (needs data/skyrim/json and the art built)
import { chromium } from '../tech/node_modules/playwright/index.mjs'; // installed with the tech spike
import { serve } from '../tech/server.mjs';

const server = await serve(5180);
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto('http://localhost:5180/spikes/combat/');
await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
const wait = (s) => page.waitForTimeout(s * 1000);
const g = (f, a) => page.evaluate(f, a);
let failed = 0;
const check = (name, ok, detail) => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`); };
const fresh = () => g(() => { window.__game.reset(); return window.__game.player.health; });

// 1. A plain hit lands for Skyrim damage times lethality.
await fresh();
let t = await g(() => window.__game.enemySwing(false));
await wait(t + 0.25);
let r = await g(() => ({ hp: window.__game.player.health, want: window.__game.rules.hit(window.__game.rules.fighters.bandit, window.__game.rules.fighters.player).damage }));
check('unblocked quick hit', Math.abs(100 - r.hp - r.want) < 0.05, `took ${(100 - r.hp).toFixed(2)}, rules say ${r.want.toFixed(2)}`);

// 2. A held block takes less and costs stamina.
await fresh();
await g(() => window.__game.act.block(true));
await wait(0.4);
t = await g(() => window.__game.enemySwing(false));
await wait(t + 0.25);
r = await g(() => ({ hp: window.__game.player.health, sp: window.__game.player.stamina, want: window.__game.rules.hit(window.__game.rules.fighters.bandit, window.__game.rules.fighters.player, { blocking: true }).damage }));
check('held block', Math.abs(100 - r.hp - r.want) < 0.05 && r.sp < 100, `took ${(100 - r.hp).toFixed(2)} (rules ${r.want.toFixed(2)}), stamina ${r.sp.toFixed(1)}`);
await g(() => window.__game.act.block(false));

// 3. A block raised just before the blow parries: no damage, attacker staggered.
await fresh();
t = await g(() => window.__game.enemySwing(false));
await wait(t - 0.1);
await g(() => window.__game.act.block(true));
await wait(0.3);
r = await g(() => ({ hp: window.__game.player.health, e: window.__game.enemies[0].state, log: window.__game.log[0] }));
check('parry', r.hp === 100 && r.e === 'stagger', `${r.log}`);
await g(() => window.__game.act.block(false));

// 4. A roll in the last instant is a perfect dodge: no damage, time slows, counter armed.
await fresh();
t = await g(() => window.__game.enemySwing(true));
await wait(t - 0.08);
await g(() => window.__game.act.roll());
await wait(0.12);
r = await g(() => ({ hp: window.__game.player.health, slow: window.__game.timeScale, counter: window.__game.player.counter }));
check('perfect dodge', r.hp === 100 && r.slow < 1 && r.counter, `time scale ${r.slow}, counter ${r.counter}`);

// 5. A power attack kills a level 1 bandit outright (45 damage against 35 health).
await fresh();
await wait(0.3);
t = await g(() => { const G = window.__game, e = G.enemies[0]; G.enemySwing(false); e.state = 'idle'; e.passive = true; G.act.power(); return 0; });
await wait(0.8);
r = await g(() => ({ dead: !!window.__game.enemies[0].dead, hp: window.__game.enemies[0].health }));
check('power attack kills a bandit', r.dead, `bandit health ${r.hp}`);

await browser.close(); server.close();
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
