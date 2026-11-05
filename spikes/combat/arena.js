// Combat-feel arena (Phase 0 spike 3): the farmer in Leather Armor with an Iron Sword
// against bandits, in PixiJS. Damage, armour, blocking and stamina use Skyrim's numbers
// from the export; dodge, perfect dodge and parry timing come from the bible.
import * as PIXI from '../tech/node_modules/pixi.js/dist/pixi.min.mjs';
import { FrameCache, World } from '../tech/world.js';
import { makeRules, TIMING, COSTS } from './rules.js';

const VIEW = { w: 800, h: 450, scale: 2 };
const FACINGS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
const ARENA = 9; // tiles from the centre

// ---------- load ----------

const json = (u) => fetch(u).then((r) => r.json());
const image = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u; });
const SK = Object.fromEntries(await Promise.all(['weapons', 'armour', 'gameSettings', 'npcs', 'races'].map(async (n) => [n, await json(`/data/skyrim/json/${n}.json`)])));
const R = makeRules(SK);
const sheets = {};
for (const anim of ['idle', 'walk', 'attack', 'block', 'roll']) {
  const atlas = await json(`/art/out/sprites/leather_${anim}.json`);
  sheets[anim] = { atlas, image: await image(`/art/out/sprites/${atlas.sheet}`) };
}
const frames = new FrameCache(sheets);
const sand = await image('/art/out/samples/tiles/sand.desert_0.png');

PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';
const app = new PIXI.Application();
await app.init({ width: VIEW.w, height: VIEW.h, background: '#0b0908', antialias: false, resolution: 1, preference: 'webgl' });
app.canvas.style.width = VIEW.w * VIEW.scale + 'px'; app.canvas.style.height = VIEW.h * VIEW.scale + 'px';
document.getElementById('stage').appendChild(app.canvas);
app.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

const world = new PIXI.Container();
app.stage.addChild(world);
// Ground: a disc of sand tiles.
const gc = document.createElement('canvas'); gc.width = 2 * ARENA * 64 + 128; gc.height = 2 * ARENA * 32 + 64;
const gg = gc.getContext('2d');
for (let i = -ARENA - 1; i <= ARENA + 1; i++) for (let j = -ARENA - 1; j <= ARENA + 1; j++) {
  if (Math.hypot(i, j) > ARENA + 1) continue;
  const [x, y] = World.screen(i, j);
  gg.drawImage(sand, x + gc.width / 2 - 32, y + gc.height / 2 - 16);
}
const ground = new PIXI.Sprite(PIXI.Texture.from(gc));
ground.x = -gc.width / 2; ground.y = -gc.height / 2;
const decals = new PIXI.Graphics(), actors = new PIXI.Container(), fx = new PIXI.Graphics();
world.addChild(ground, decals, actors, fx);
const textures = new Map();
const tex = (f) => { let t = textures.get(f.key); if (!t) { t = PIXI.Texture.from(f.canvas); textures.set(f.key, t); } return t; };

// ---------- fighters ----------

function fighter(kind, a, b) {
  const base = R.fighters[kind];
  const sprite = new PIXI.Sprite();
  if (kind === 'bandit') sprite.tint = 0xe0b0a0;
  const bar = new PIXI.Graphics();
  actors.addChild(sprite); fx.addChild(bar);
  return { kind, ...base, maxHealth: base.health, maxStamina: base.stamina, a, b, facing: 'S', state: 'idle', t: 0, sprite, bar,
    blockT: 0, blocking: false, power: false, struck: false, chain: 0, queued: false, counter: false, cooldown: 1 + Math.random(), dead: 0 };
}
let player, enemies, timeScale = 1, slowLeft = 0, log = [];
function reset() {
  for (const f of [player, ...(enemies ?? [])]) if (f) { actors.removeChild(f.sprite); fx.removeChild(f.bar); }
  decals.clear();
  player = fighter('player', 0, 2);
  enemies = [fighter('bandit', -3, -3), fighter('bandit', 3, -4)];
  log = []; say('Two bandits. Leather Armor, Iron Sword.');
}
const say = (m) => { log.unshift(m); log = log.slice(0, 14); document.getElementById('log').innerHTML = log.map((x) => `<div>${x}</div>`).join(''); };
const banner = (m) => { document.getElementById('banner').textContent = m; clearTimeout(banner.t); banner.t = setTimeout(() => { document.getElementById('banner').textContent = ''; }, 1400); };

// ---------- input ----------

const keys = new Set();
let mouse = { x: 0, y: 0, moved: false }, leftDown = null;
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Space') { e.preventDefault(); roll(player); }
  if (e.code === 'KeyR') reset();
});
addEventListener('keyup', (e) => keys.delete(e.code));
app.canvas.addEventListener('mousemove', (e) => { const r = app.canvas.getBoundingClientRect(); mouse = { x: (e.clientX - r.left) / VIEW.scale, y: (e.clientY - r.top) / VIEW.scale, moved: true }; });
app.canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) leftDown = performance.now();
  if (e.button === 2) block(player, true);
});
addEventListener('mouseup', (e) => {
  if (e.button === 0 && leftDown !== null) { const held = (performance.now() - leftDown) / 1000; leftDown = null; if (held < TIMING.powerHoldSeconds) quick(player); }
  if (e.button === 2) block(player, false);
});

// ---------- actions ----------

const busy = (f) => ['attack', 'roll', 'stagger'].includes(f.state) || f.dead;
function quick(f) {
  if (f.state === 'attack' && !f.power && f.t > 0.6 * attackLength(f)) { f.queued = true; return; } // chain
  if (busy(f) || f.stamina < COSTS.quickAttack) return;
  f.stamina -= COSTS.quickAttack;
  startAttack(f, false);
}
function powerAttack(f) {
  const cost = R.powerCost(f);
  if (busy(f) || f.stamina < cost) return;
  f.stamina -= cost;
  startAttack(f, true);
}
function startAttack(f, power) { f.state = 'attack'; f.power = power; f.t = 0; f.struck = false; f.blocking = false; f.chain = f.queued ? (f.chain + 1) % 3 : 0; f.queued = false; }
const attackLength = (f) => 6 / (f.power ? TIMING.powerFps : 14);
const hitMoment = (f) => (f.power ? 3 / TIMING.powerFps : TIMING.quickHitAt);
function block(f, on) {
  if (on && !busy(f)) { f.blocking = true; f.blockT = 0; f.state = 'block'; f.t = 0; }
  if (!on) { f.blocking = false; if (f.state === 'block') f.state = 'idle'; }
}
function roll(f) {
  if (busy(f) || f.stamina < COSTS.roll) return;
  f.stamina -= COSTS.roll; f.state = 'roll'; f.t = 0; f.blocking = false;
  const mv = moveVector(f === player);
  if (mv) f.facing = facingOf(mv[0], mv[1]);
}
function stagger(f, seconds) { if (f.dead) return; f.state = 'stagger'; f.t = 0; f.staggerFor = seconds; f.blocking = false; }

// ---------- geometry ----------

const screenOf = (f) => World.screen(f.a, f.b);
const facingOf = (sx, sy) => FACINGS[((Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) % 8) + 8) % 8];
const facingVec = (facing) => { const i = FACINGS.indexOf(facing), ang = (i * Math.PI) / 4; return [Math.cos(ang), Math.sin(ang)]; };
function moveVector(isPlayer) {
  if (!isPlayer) return null;
  let x = 0, y = 0;
  if (keys.has('KeyW')) y -= 1; if (keys.has('KeyS')) y += 1; if (keys.has('KeyA')) x -= 1; if (keys.has('KeyD')) x += 1;
  return x || y ? [x, y] : null;
}
// Screen direction (unit, 2:1 squashed back to ground) to a ground step.
function groundStep(sx, sy, dist) {
  const [ga, gb] = World.ground(sx * 32, sy * 32);
  const l = Math.hypot(ga, gb) || 1;
  return [(ga / l) * dist, (gb / l) * dist];
}
// Is the target within reach and inside the attacker's swing (60 degrees each side, on screen)?
function inSwing(att, def) {
  const [ax, ay] = screenOf(att), [dx, dy] = screenOf(def);
  const reach = 2.1 * att.weapon.reach; // tiles: Skyrim reach 1 is about 1.4 m, two of our tiles
  if (Math.hypot(att.a - def.a, att.b - def.b) > reach) return false;
  const [fx, fy] = facingVec(att.facing), vx = dx - ax, vy = (dy - ay) * 2, l = Math.hypot(vx, vy) || 1;
  return (fx * vx + fy * vy) / l > Math.cos(Math.PI / 3);
}
const faces = (def, att) => { const [ax, ay] = screenOf(att), [dx, dy] = screenOf(def), [fx, fy] = facingVec(def.facing); const vx = ax - dx, vy = (ay - dy) * 2, l = Math.hypot(vx, vy) || 1; return (fx * vx + fy * vy) / l > 0; };

// ---------- the blow ----------

function strike(att, def) {
  if (def.dead || !inSwing(att, def)) return;
  if (def.state === 'roll' && def.t < TIMING.rollInvulnerable) {
    if (def.t <= TIMING.perfectDodgeWindow) {
      slowLeft = TIMING.slowMotionSeconds; def.counter = true; stagger(att, 0.8);
      banner('PERFECT DODGE'); say(`${def.name} perfect-dodged ${att.name}: time slows, the counter does double.`);
    } else say(`${def.name} rolled clear of ${att.name}.`);
    return;
  }
  if (def.blocking && faces(def, att)) {
    if (def.blockT <= TIMING.parryWindow) {
      stagger(att, TIMING.parriedStaggerSeconds); att.guardBroken = 2;
      banner('PARRY'); say(`${def.name} parried ${att.name}: guard broken, open to a finisher.`);
      return;
    }
    const h = R.hit(att, def, { power: att.power, blocking: true });
    def.stamina -= h.staminaCost;
    if (def.stamina < 0) { def.stamina = 0; stagger(def, TIMING.staggerSeconds); say(`${def.name}'s guard collapsed (out of stamina).`); }
    wound(def, h.damage, `${att.name} hit ${def.name}'s guard: ${h.steps} = ${h.damage.toFixed(1)}`);
    return;
  }
  const h = R.hit(att, def, { power: att.power });
  let dmg = h.damage, steps = h.steps;
  if (att.counter) { dmg *= 2; steps += ' x2 counter'; att.counter = false; stagger(def, 0.8); }
  else stagger(def, att.power ? TIMING.staggerSeconds : 0.25);
  wound(def, dmg, `${att.name} ${att.power ? 'power-attacked' : 'hit'} ${def.name}: ${steps} = ${dmg.toFixed(1)}`);
}
function wound(f, dmg, line) {
  f.health -= dmg;
  say(line);
  spray(f, dmg);
  if (f.health <= 0) { f.health = 0; f.dead = 0.001; f.state = 'dead'; say(`${f.name} is dead.`); if (f === player) banner('YOU DIED. R to reset.'); }
}

// Blood: a spray of drops that land as lasting decals.
let drops = [];
function spray(f, dmg) {
  const [x, y] = screenOf(f);
  for (let i = 0; i < 6 + dmg / 2; i++) drops.push({ x, y: y - 60, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80, z: 60, floor: y + (Math.random() - 0.5) * 10 });
}

// ---------- AI ----------

function think(e, dt) {
  if (e.dead || busy(e) || e.passive) return; // passive: tests switch the AI off
  const d = Math.hypot(player.a - e.a, player.b - e.b);
  const [ex, ey] = screenOf(e), [px, py] = screenOf(player);
  e.facing = facingOf(px - ex, (py - ey) * 2);
  e.cooldown -= dt;
  if (player.dead) { e.state = 'idle'; return; }
  // Sometimes raise a guard when the player swings nearby.
  if (player.state === 'attack' && player.t < 0.08 && d < 2.6 && !e.blocking && Math.random() < 0.3) { block(e, true); e.blockHold = 0.7; return; }
  if (e.blocking) { e.blockHold -= dt; if (e.blockHold <= 0) block(e, false); return; }
  if (d > 1.7) {
    const [sa, sb] = [(player.a - e.a) / d, (player.b - e.b) / d];
    e.a += sa * 2.4 * dt; e.b += sb * 2.4 * dt; e.state = 'walk';
  } else if (e.cooldown <= 0) {
    Math.random() < 0.3 ? powerAttack(e) : quick(e);
    e.cooldown = 1.3 + Math.random() * 1.2;
  } else e.state = 'idle';
}

// ---------- update and draw ----------

function update(dt) {
  // Slow motion after a perfect dodge.
  if (slowLeft > 0) { slowLeft -= dt; timeScale = TIMING.slowMotionScale; } else timeScale = 1;
  const gdt = dt * timeScale;
  // Player input.
  if (!busy(player)) {
    // Melee faces the cursor (bible 11.1), once the mouse has been used.
    const cx = VIEW.w / 2, cy = VIEW.h / 2 + 40;
    if (mouse.moved) player.facing = facingOf(mouse.x - cx, (mouse.y - cy) * 2);
    if (leftDown !== null && (performance.now() - leftDown) / 1000 >= TIMING.powerHoldSeconds) { leftDown = null; powerAttack(player); }
    const mv = moveVector(true);
    if (mv && player.state !== 'block' && !player.dead) {
      const sprint = keys.has('ShiftLeft') && player.stamina > 1;
      const [da, db] = groundStep(mv[0], mv[1], (sprint ? 5 : 3.2) * gdt);
      player.a += da; player.b += db; player.state = 'walk';
      if (sprint) player.stamina -= 7 * gdt; // Skyrim: fSprintStaminaDrainMult 7
    } else if (player.state === 'walk') player.state = 'idle';
  }
  for (const e of enemies) think(e, gdt);
  for (const f of [player, ...enemies]) {
    if (f.dead) { f.dead += gdt; continue; }
    f.t += gdt;
    if (f.blocking) f.blockT += gdt;
    if (f.guardBroken) f.guardBroken -= gdt;
    // Skyrim regenerates 5% of stamina a second (race regen), not while attacking or blocking.
    if (!['attack', 'block'].includes(f.state)) f.stamina = Math.min(f.maxStamina, f.stamina + 0.05 * f.maxStamina * gdt);
    if (f.state === 'attack') {
      if (!f.struck && f.t >= hitMoment(f)) { f.struck = true; for (const d of f === player ? enemies : [player]) strike(f, d); }
      if (f.t >= attackLength(f)) { f.state = 'idle'; if (f.queued) startAttack(f, false); }
    }
    if (f.state === 'roll') {
      const [vx, vy] = facingVec(f.facing), [da, db] = groundStep(vx, vy, 6 * gdt);
      f.a += da; f.b += db;
      if (f.t >= TIMING.rollSeconds) f.state = 'idle';
    }
    if (f.state === 'stagger' && f.t >= f.staggerFor) f.state = 'idle';
    // Stay in the arena.
    const r = Math.hypot(f.a, f.b);
    if (r > ARENA) { f.a *= ARENA / r; f.b *= ARENA / r; }
  }
  // Blood drops fall and stay.
  drops = drops.filter((d) => {
    d.vy += 400 * gdt; d.x += d.vx * gdt; d.y += d.vy * gdt;
    if (d.y >= d.floor) { decals.rect(Math.round(d.x), Math.round(d.floor), 1 + (Math.random() < 0.4 ? 1 : 0), 1).fill(Math.random() < 0.5 ? 0x640e10 : 0x45090b); return false; }
    return true;
  });
}

function animFrame(f) {
  switch (f.state) {
    case 'walk': return ['walk', Math.floor(f.t * 10) % 8];
    case 'attack': return ['attack', Math.min(5, Math.floor(f.t * (f.power ? TIMING.powerFps : 14)))];
    case 'block': return ['block', Math.min(3, Math.floor(f.t * 8))];
    case 'roll': return ['roll', Math.min(7, Math.floor((f.t / TIMING.rollSeconds) * 8))];
    default: return ['idle', Math.floor(performance.now() / 200) % 6];
  }
}

function draw() {
  const [px, py] = screenOf(player);
  world.x = Math.round(VIEW.w / 2 - px); world.y = Math.round(VIEW.h / 2 + 40 - py);
  fx.clear();
  const all = [player, ...enemies].sort((p, q) => screenOf(p)[1] - screenOf(q)[1]);
  all.forEach((f, i) => {
    actors.setChildIndex(f.sprite, i);
    const [x, y] = screenOf(f);
    if (f.dead) { f.sprite.visible = f.dead < 0.2; return; }
    f.sprite.visible = true;
    const [anim, frame] = animFrame(f);
    const fr = frames.get(anim, f.facing, frame);
    f.sprite.texture = tex(fr);
    // A stagger knocks the figure back a little and flashes it.
    const knock = f.state === 'stagger' ? Math.max(0, 3 - f.t * 12) : 0;
    f.sprite.x = Math.round(x - fr.ox - knock); f.sprite.y = Math.round(y - fr.oy);
    f.sprite.tint = f.state === 'stagger' && f.t < 0.12 ? 0xff7766 : f.kind === 'bandit' ? 0xe0b0a0 : 0xffffff;
    if (f !== player) {
      fx.rect(Math.round(x - 12), Math.round(y - 128), 24, 3).fill(0x231d18);
      fx.rect(Math.round(x - 12), Math.round(y - 128), Math.round((24 * f.health) / f.maxHealth), 3).fill(f.guardBroken > 0 ? 0xd8b46a : 0x8f2a22);
    }
  });
  document.getElementById('hp').style.width = `${(100 * player.health) / player.maxHealth}%`;
  document.getElementById('sp').style.width = `${(100 * Math.max(0, player.stamina)) / player.maxStamina}%`;
}

reset();
app.ticker.add((tk) => { update(Math.min(0.05, tk.deltaMS / 1000)); draw(); });

// Debug handle for tests: inspect state and drive the player without a mouse.
window.__game = {
  get player() { return player; }, get enemies() { return enemies; }, get timeScale() { return timeScale; }, get log() { return log; },
  rules: R, TIMING, reset,
  act: { quick: () => quick(player), power: () => powerAttack(player), block: (on) => block(player, on), roll: () => roll(player) },
  // Put a bandit in reach, facing the player, and have it swing; returns the seconds until its blow lands.
  enemySwing(power = false) {
    const e = enemies[0]; e.a = player.a - 1.2; e.b = player.b; e.cooldown = 99; e.dead = 0; e.health = e.maxHealth;
    enemies[1].a = 8; enemies[1].b = 8; enemies[1].cooldown = 99;
    const [ex, ey] = screenOf(e), [px, py] = screenOf(player);
    e.facing = facingOf(px - ex, (py - ey) * 2); player.facing = facingOf(ex - px, (ey - py) * 2);
    e.state = 'idle'; e.stamina = e.maxStamina;
    power ? powerAttack(e) : quick(e);
    return hitMoment(e);
  },
};
window.__ready = true;
