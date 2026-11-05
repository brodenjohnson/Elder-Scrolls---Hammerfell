import { Renderer, type Atlas, type Drawable } from './render/renderer';
import { facingOf, toScreen, toGround, type Facing } from './render/iso';
import { WorldMap, SLICE } from './world/map';
import { M, MATERIALS, SHAPES, Terrain, type Thing, type ThingId } from './world/terrain';
import { Streamer } from './world/streamer';
import { SAVE_VERSION, readSave, writeSave, type Save } from './save/save';
import { loadData, type GameData } from './systems/data';
import { Character, newCharacter } from './systems/character';
import { newReputation, type ReputationState } from './systems/reputation';
import { Conversation, type Dialogue } from './systems/dialogue';
import { Panels } from './ui/panels';
import { Combat, type Encounter, type Fighter } from './combat/combat';

declare const __APP_VERSION__: string;
export const VERSION = __APP_VERSION__;

type Manifest = {
  tiles: { id: string; file: string }[]; overlays: { material: string; files: { side: string; file: string }[] }[];
  objects: Record<ThingId, { w: number; h: number; ox: number; oy: number; shadow: boolean }>; sheets: string[];
};

const PLAYER_RADIUS = 0.3;          // tiles
const WALK = 3.2, RUN = 5;          // tiles a second (bible: about 5 running)
const START = { sx: 4, sy: 7, a: 60, b: 61 }; // the Sentinel Coast, by the settlement fire

const load = (src: string) => new Promise<HTMLImageElement>((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => err(new Error(src)); i.src = src; });
const json = <T>(src: string): Promise<T> => fetch(src).then((r) => r.json());

export class Game {
  readonly renderer = new Renderer();
  map!: WorldMap;
  terrain!: Terrain;
  streamer!: Streamer;
  manifest!: Manifest;
  sheets: Record<string, { atlas: Atlas; image: HTMLImageElement }> = {};
  objects: Partial<Record<ThingId, { body: HTMLImageElement; shadow?: HTMLImageElement }>> = {};
  player = { a: 0, b: 0, facing: 'S' as Facing, moving: false, speed: 0, t: 0 };
  playSeconds = 0;
  keys = new Set<string>();
  fps = 0;
  private frameTimes: number[] = [];
  readonly frameLog: number[] = []; // every frame time, for tests (kept short)
  message = '';
  private messageUntil = 0;
  data!: GameData;
  character!: Character;
  reputation: ReputationState = newReputation();
  flags = new Set<string>();
  dialogues: Record<string, Dialogue> = {};
  panels!: Panels;
  // People in the world. For now one settler by the Sentinel Coast fire.
  combat!: Combat;
  pf: Fighter | undefined;              // the player as a fighter
  private leftDown: number | null = null;
  mouse = { x: 0, y: 0 };
  npcs = [{ id: 'settler', dialogue: 'settler', a: START.sx * SLICE + 63.2, b: START.sy * SLICE + 57.5, facing: 'S' as Facing }];

  async start(parent: HTMLElement) {
    const base = './assets/';
    const [slices, manifest] = await Promise.all([json<ConstructorParameters<typeof WorldMap>[0]>('./data/slices.json'), json<Manifest>(base + 'manifest.json')]);
    this.manifest = manifest;
    this.data = await loadData();
    this.dialogues.settler = await json<Dialogue>('./data/dialogue/settler.json');
    this.panels = new Panels(() => this.character, () => this.reputation, () => {});
    const enc = await json<{ encounters: Encounter[] }>('./data/encounters.json');
    this.combat = new Combat(this.data, enc.encounters, {
      character: () => this.character, flags: () => this.flags, say: (m) => this.say(m),
      sliceLoaded: (sx, sy) => this.streamer.loaded.has(`${sx},${sy}`),
    });
    this.map = new WorldMap(slices);
    this.terrain = new Terrain(this.map);
    this.streamer = new Streamer(this.terrain);
    for (const name of manifest.sheets) {
      const atlas = await json<Atlas>(`${base}sprites/${name}.json`);
      this.sheets[name] = { atlas, image: await load(`${base}sprites/${atlas.sheet}`) };
    }
    await Promise.all(Object.entries(manifest.objects).map(async ([id, m]) => {
      this.objects[id as ThingId] = { body: await load(`${base}objects/${id}__body.png`), shadow: m.shadow ? await load(`${base}objects/${id}__shadow.png`) : undefined };
    }));
    // The worker resolves asset paths itself, so give it an absolute base.
    await this.renderer.init(parent, { type: 'init', base: new URL(base, location.href).href, manifest, slices });
    this.newGame();
    this.bindInput();
    let last = performance.now();
    this.renderer.app.ticker.add(() => {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
      this.frameTimes.push(now - last); this.frameLog.push(now - last); if (this.frameLog.length > 2000) this.frameLog.shift();
      last = now;
      if (this.frameTimes.length >= 30) { this.fps = Math.round(30000 / this.frameTimes.reduce((p, q) => p + q, 0)); this.frameTimes = []; }
      this.update(dt);
      this.draw();
    });
  }

  newGame() {
    this.character = new Character(this.data, newCharacter(this.data));
    this.reputation = newReputation();
    this.flags = new Set();
    this.streamer.states = {};
    this.streamer.reset();
    this.combat.reset(); this.pf = undefined;
    this.place(START.sx * SLICE + START.a, START.sy * SLICE + START.b, 'S');
    this.playSeconds = 0;
  }
  place(a: number, b: number, facing: Facing = this.player.facing) {
    this.player.a = a; this.player.b = b; this.player.facing = facing;
    this.streamer.update(...this.map.sliceOf(a, b));
    [this.player.a, this.player.b] = this.resolve(a, b);
  }

  // ---------- input ----------

  private bindInput() {
    addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'F5') { e.preventDefault(); this.save('quick'); }
      if (e.code === 'F9') { e.preventDefault(); this.load('quick'); }
      if (e.code === 'KeyE') this.interact();
      if (e.code === 'KeyC') this.panels.toggle('character');
      if (e.code === 'KeyI') this.panels.toggle('inventory');
      if (e.code === 'Escape') this.panels.close();
      if (e.code === 'Space') { e.preventDefault(); this.rollPlayer(); }
      if (e.code === 'KeyN' && this.pf?.state === 'dead') this.newGame();
      if (this.panels.open === 'dialogue' && /^Digit[1-9]$/.test(e.code)) { this.panels.conversation?.choose(+e.code.slice(5) - 1); this.panels.render(); }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    const canvas = this.renderer.app.canvas;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); this.mouse = { x: (e.clientX - r.left) / 2, y: (e.clientY - r.top) / 2 }; });
    canvas.addEventListener('mousedown', (e) => {
      if (this.panels.open !== 'none') return;
      if (e.button === 0) this.leftDown = performance.now();
      if (e.button === 2 && this.pf && this.armed()) this.combat.block(this.pf, true);
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0 && this.leftDown !== null) { const held = (performance.now() - this.leftDown) / 1000; this.leftDown = null; if (held < 0.3) this.attack(false); }
      if (e.button === 2 && this.pf) this.combat.block(this.pf, false);
    });
    addEventListener('blur', () => this.keys.clear());
  }

  // ---------- update ----------

  // Melee needs a weapon and an outfit that has combat frames (the steel set does not yet).
  armed() { return !!this.character.weapon() && this.outfit() !== 'steel'; }
  attack(power: boolean) {
    const f = this.pf;
    if (!f || f.state === 'dead' || this.panels.open !== 'none') return false;
    if (!this.armed()) { this.say(this.character.weapon() ? 'No combat moves in Steel armour yet.' : 'You need a weapon. I for inventory.'); return false; }
    // Melee faces the cursor (bible 11.1).
    if (!this.combat.busy(f)) { const v = this.renderer.view; f.facing = facingOf(this.mouse.x - v.w / 2, (this.mouse.y - (v.h / 2 + 30)) * 2); this.player.facing = f.facing; }
    return power ? this.combat.powerAttack(f) : this.combat.quick(f);
  }
  rollPlayer() {
    const f = this.pf; if (!f || !this.armed()) return false;
    const k = this.keys; let sx = 0, sy = 0;
    if (k.has('KeyW')) sy -= 1; if (k.has('KeyS')) sy += 1; if (k.has('KeyA')) sx -= 1; if (k.has('KeyD')) sx += 1;
    return this.combat.roll(f, sx || sy ? facingOf(sx, sy) : undefined);
  }

  update(realDt: number) {
    this.pf = this.combat.playerFighter(this.player, this.pf);
    const f = this.pf;
    const dt = realDt * this.combat.timeScale; // a perfect dodge slows everything, the player too
    this.playSeconds += realDt;
    if (this.leftDown !== null && (performance.now() - this.leftDown) / 1000 >= 0.3) { this.leftDown = null; this.attack(true); }
    const k = this.keys;
    let sx = 0, sy = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) sy -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) sy += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) sx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) sx += 1;
    const p = this.player;
    if (this.panels.open === 'dialogue' || this.combat.busy(f)) sx = sy = 0; // no walking while talking, swinging, rolling, hurt or dead
    p.moving = !!(sx || sy);
    if (p.moving) {
      p.facing = facingOf(sx, sy);
      // A screen direction becomes a ground direction; speed is in tiles on the ground.
      const [ga, gb] = toGround(sx * 32, sy * 32), l = Math.hypot(ga, gb);
      let speed = k.has('ShiftLeft') || k.has('ShiftRight') ? RUN : WALK;
      if (this.terrain.material(p.a, p.b) === M.shallow) speed *= 0.6;
      if (f.blocking) speed *= 0.5;
      // Sneaking (Ctrl) is slower and trains Sneak while moving.
      const sneaking = k.has('ControlLeft') || k.has('ControlRight');
      if (sneaking) { speed *= 0.55; this.character.useSkill('Sneak', 0.5 * dt); }
      p.speed = speed;
      [p.a, p.b] = this.move(p.a, p.b, (ga / l) * speed * dt, (gb / l) * speed * dt);
    }
    p.t += dt;
    this.streamer.update(...this.map.sliceOf(p.a, p.b));
    // Combat: the player fighter follows the player, then a roll may carry him on.
    f.a = p.a; f.b = p.b; if (!this.combat.busy(f)) f.facing = p.facing;
    if (f.state === 'idle' || f.state === 'walk') f.state = p.moving ? 'walk' : 'idle';
    this.combat.sync();
    this.combat.update(realDt, f);
    if (f.state === 'roll') [p.a, p.b] = this.move(p.a, p.b, f.a - p.a, f.b - p.b);
    // Bandits are kept out of solid things by the same rules as the player.
    const alive = this.combat.enemies.filter((e) => e.state !== 'dead');
    // Keep fighters from standing inside one another.
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const x = alive[i], y = alive[j], d = Math.hypot(x.a - y.a, x.b - y.b), r = 2 * PLAYER_RADIUS;
      if (d < r) { const ua = d > 0 ? (x.a - y.a) / d : 1, ub = d > 0 ? (x.b - y.b) / d : 0, push = (r - d) / 2; x.a += ua * push; x.b += ub * push; y.a -= ua * push; y.b -= ub * push; }
    }
    for (const e of alive) [e.a, e.b] = this.resolve(e.a, e.b, true);
    p.facing = f.facing;
  }

  // Move, then push out of anything solid; deep water stops you outright.
  private move(a: number, b: number, da: number, db: number): [number, number] {
    const deep = (x: number, y: number) => this.terrain.material(x, y) === M.deep || x < 0 || y < 0 || x >= this.map.widthTiles || y >= this.map.heightTiles;
    let na = a + da, nb = b + db;
    if (deep(na, nb)) { if (!deep(a + da, b)) nb = b; else if (!deep(a, b + db)) na = a; else return [a, b]; }
    return this.resolve(na, nb);
  }
  resolve(a: number, b: number, skipFighters = false): [number, number] {
    if (!skipFighters) for (const e of this.combat?.enemies ?? []) {
      if (e.state === 'dead') continue;
      const d = Math.hypot(a - e.a, b - e.b), r = 2 * PLAYER_RADIUS;
      if (d < r && d > 0) { a = e.a + ((a - e.a) / d) * r; b = e.b + ((b - e.b) / d) * r; }
    }
    for (const n of this.npcs) {
      const d = Math.hypot(a - n.a, b - n.b), r = 2 * PLAYER_RADIUS;
      if (d < r && d > 0) { a = n.a + ((a - n.a) / d) * r; b = n.b + ((b - n.b) / d) * r; }
    }
    for (const t of this.streamer.things()) {
      const s = SHAPES[t.id];
      if (!s.solid || Math.abs(t.a - a) > 4 || Math.abs(t.b - b) > 4) continue;
      if (s.box) {
        // Nearest point of the box; push out along it, or along the shallow axis if inside.
        const [ha, hb] = s.box, ca = Math.max(t.a - ha, Math.min(a, t.a + ha)), cb = Math.max(t.b - hb, Math.min(b, t.b + hb));
        const d = Math.hypot(a - ca, b - cb);
        if (d > 0 && d < PLAYER_RADIUS) { a = ca + ((a - ca) / d) * PLAYER_RADIUS; b = cb + ((b - cb) / d) * PLAYER_RADIUS; }
        else if (d === 0) {
          const pa = ha - Math.abs(a - t.a), pb = hb - Math.abs(b - t.b);
          if (pa < pb) a = t.a + Math.sign(a - t.a || 1) * (ha + PLAYER_RADIUS); else b = t.b + Math.sign(b - t.b || 1) * (hb + PLAYER_RADIUS);
        }
      } else {
        const d = Math.hypot(a - t.a, b - t.b), r = s.r + PLAYER_RADIUS;
        if (d < r) { const k = d > 0 ? r / d : 1; a = t.a + (a - t.a) * k + (d > 0 ? 0 : r); b = t.b + (b - t.b) * k; }
      }
    }
    return [a, b];
  }

  // Smash the nearest breakable thing within reach. It stays smashed: the slice remembers.
  smash(): Thing | null {
    let best: Thing | null = null, bd = 1.6;
    for (const t of this.streamer.things()) {
      if (!SHAPES[t.id].smash) continue;
      const d = Math.hypot(t.a - this.player.a, t.b - this.player.b);
      if (d < bd) { bd = d; best = t; }
    }
    if (best) {
      this.streamer.remove(best);
      this.say(`Smashed a ${best.id === 'potSmall' ? 'pot' : best.id}.`);
      // A blow with a weapon trains its skill a little.
      const w = this.character.weapon();
      if (w) this.character.useSkill(w.type.startsWith('TwoHand') ? 'TwoHanded' : 'OneHanded', 1);
    }
    return best;
  }

  // E: talk to someone near, open a chest near, or smash something.
  interact() {
    if (this.panels.open === 'dialogue') return;
    const p = this.player;
    const body = this.combat.enemies.find((e) => e.state === 'dead' && e.encounter && Math.hypot(e.a - p.a, e.b - p.b) < 1.6 && !this.flags.has(`looted:${e.id}`));
    if (body) {
      this.flags.add(`looted:${body.id}`);
      for (const g of body.gear) this.character.give(g);
      this.say(`Searched the body: ${body.gear.map((g) => this.data.weapons.get(g)?.name ?? this.data.armour.get(g)?.name ?? g).join(', ')}.`);
      return;
    }
    const npc = this.npcs.find((n) => Math.hypot(n.a - p.a, n.b - p.b) < 1.8);
    if (npc) { this.talk(npc.dialogue); return; }
    const chest = [...this.streamer.things()].find((t) => t.id === 'chest' && Math.hypot(t.a - p.a, t.b - p.b) < 1.6);
    if (chest) { this.openChest(chest); return; }
    this.smash();
  }
  talk(id: string) {
    const c = new Conversation(this.dialogues[id], { character: this.character, reputation: this.reputation, flags: this.flags, say: (m) => this.say(m) });
    this.panels.talk(c);
    return c;
  }
  // A settlement chest holds both armour sets for now, so the equipment layers can be tried.
  openChest(chest: Thing) {
    const flag = `chest:${chest.uid}`;
    if (this.flags.has(flag)) { this.say('The chest is empty.'); return; }
    this.flags.add(flag);
    const loot = ['ArmorLeatherCuirass', 'ArmorLeatherBoots', 'ArmorLeatherGauntlets', 'ArmorSteelCuirassA', 'ArmorSteelBootsB', 'ArmorSteelGauntletsA', 'SteelGreatsword'];
    for (const e of loot) this.character.give(e);
    this.character.useSkill('Lockpicking', 1);
    this.say('Opened the chest: Leather and Steel armour, a Steel Greatsword. I for inventory.');
  }
  // Which sprite set the player wears follows the body armour.
  outfit(): 'farm' | 'farmSword' | 'leather' | 'steel' {
    const body = this.character.s.equipped.body ?? '';
    return body.startsWith('ArmorLeather') ? 'leather' : body.startsWith('ArmorSteel') ? 'steel' : this.character.weapon() ? 'farmSword' : 'farm';
  }

  // ---------- draw ----------

  private draw() {
    const p = this.player, r = this.renderer;
    const reach = (r.view.w + r.view.h) / 32 + 6;
    type Item = Drawable & { a0: number; a1: number; b0: number; b1: number; c: number };
    const shadows: Drawable[] = [], items: Item[] = [];
    for (const t of this.streamer.things()) {
      if (Math.abs(t.a - p.a) > reach || Math.abs(t.b - p.b) > reach) continue;
      const m = this.manifest.objects[t.id], o = this.objects[t.id]!, [x, y] = toScreen(t.a, t.b), s = SHAPES[t.id];
      const [ha, hb] = s.box ?? [s.r, s.r];
      if (o.shadow) shadows.push({ texture: r.texture(o.shadow), x: Math.round(x - m.ox), y: Math.round(y - m.oy) });
      items.push({ texture: r.texture(o.body), x: Math.round(x - m.ox), y: Math.round(y - m.oy), a0: t.a - ha, a1: t.a + ha, b0: t.b - hb, b1: t.b + hb, c: t.a + t.b });
    }
    // The player: idle or walking frames, the walk sped up to match the pace.
    const f = this.pf!;
    const [anim, cframe] = this.combat.frame(f);
    const combatAnim = anim !== 'idle' && anim !== 'walk' && this.sheets[`${this.outfit()}_${anim}`];
    const name = combatAnim ? `${this.outfit()}_${anim}` : `${this.outfit()}_${p.moving ? 'walk' : 'idle'}`, sheet = this.sheets[name], atlas = sheet.atlas;
    const fps = p.moving ? atlas.fps * (p.speed / 2.6) : atlas.fps;
    const frame = combatAnim ? cframe : Math.floor(p.t * fps) % atlas.frames;
    const [px, py] = toScreen(p.a, p.b);
    items.push({ texture: r.frame(name, atlas, sheet.image, p.facing, frame), x: Math.round(px - atlas.cell.ox), y: Math.round(py - atlas.cell.oy), a0: p.a, a1: p.a, b0: p.b, b1: p.b, c: p.a + p.b });
    for (const e of this.combat.enemies) {
      if (Math.abs(e.a - p.a) > reach || Math.abs(e.b - p.b) > reach) continue;
      const [anim2, fr2] = this.combat.frame(e), nm = `${e.outfit}_${anim2}`, s2 = this.sheets[nm] ?? this.sheets[`${e.outfit}_idle`];
      const [ex, ey] = toScreen(e.a, e.b);
      const flash = e.state === 'hit' && e.t < 0.1;
      items.push({ texture: r.frame(nm, s2.atlas, s2.image, e.facing, fr2), x: Math.round(ex - s2.atlas.cell.ox), y: Math.round(ey - s2.atlas.cell.oy), tint: flash ? 0xff8877 : 0xffffff, a0: e.a, a1: e.a, b0: e.b, b1: e.b, c: e.a + e.b - (e.state === 'dead' ? 0.5 : 0) });
    }
    for (const n of this.npcs) {
      if (Math.abs(n.a - p.a) > reach || Math.abs(n.b - p.b) > reach) continue;
      const [nx, ny] = toScreen(n.a, n.b), s2 = this.sheets.farm_idle, a2 = s2.atlas;
      // Turn to face the player when he comes close.
      if (Math.hypot(n.a - p.a, n.b - p.b) < 4) n.facing = facingOf(px - nx, (py - ny) * 2);
      items.push({ texture: r.frame('farm_idle', a2, s2.image, n.facing, Math.floor(p.t * a2.fps) % a2.frames), x: Math.round(nx - a2.cell.ox), y: Math.round(ny - a2.cell.oy), tint: 0xd8b8a0, a0: n.a, a1: n.a, b0: n.b, b1: n.b, c: n.a + n.b });
    }
    items.sort(depthOrder);
    r.draw(p.a, p.b, shadows, items);
    r.blood(this.combat.decals, this.combat.drops);
  }

  // ---------- saving ----------

  snapshot(): Save {
    return {
      version: SAVE_VERSION, savedAt: new Date().toISOString(), gameVersion: VERSION, playSeconds: Math.round(this.playSeconds),
      player: { a: +this.player.a.toFixed(3), b: +this.player.b.toFixed(3), facing: this.player.facing }, slices: structuredClone(this.streamer.states),
      character: structuredClone(this.character.s), reputation: structuredClone(this.reputation), flags: [...this.flags],
    };
  }
  save(slot: string) { writeSave(slot, this.snapshot()); this.say(`Saved (${slot}).`); }
  load(slot: string): boolean {
    const s = readSave(slot);
    if (!s) { this.say(`No save in ${slot}.`); return false; }
    this.streamer.states = structuredClone(s.slices);
    this.streamer.reset();
    this.character = new Character(this.data, s.character ? structuredClone(s.character) : newCharacter(this.data));
    this.reputation = structuredClone(s.reputation);
    this.flags = new Set(s.flags);
    this.panels.close();
    this.combat.reset(); this.pf = undefined;
    this.playSeconds = s.playSeconds;
    this.place(s.player.a, s.player.b, s.player.facing);
    this.say(`Loaded (${slot}).`);
    return true;
  }

  say(m: string) { this.message = m; this.messageUntil = performance.now() + 2500; }
  get currentMessage() { return performance.now() < this.messageUntil ? this.message : ''; }
  where() {
    const [sx, sy] = this.map.sliceOf(this.player.a, this.player.b), info = this.map.info(sx, sy);
    return { sx, sy, info, material: MATERIALS[this.terrain.material(this.player.a, this.player.b)] };
  }
}

// Draw order for things with footprints on the ground. The viewer looks from the
// +a, +b side, so something wholly beyond another along a or b is further away.
// Overlapping footprints fall back to the middle's depth.
type Foot = { a0: number; a1: number; b0: number; b1: number; c: number };
function depthOrder(A: Foot, B: Foot): number {
  const behind = A.a1 <= B.a0 || A.b1 <= B.b0, front = A.a0 >= B.a1 || A.b0 >= B.b1;
  if (behind && !front) return -1;
  if (front && !behind) return 1;
  return A.c - B.c;
}
