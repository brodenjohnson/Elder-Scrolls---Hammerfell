import type { Character } from '../systems/character';
import type { Conversation } from '../systems/dialogue';
import type { ReputationState } from '../systems/reputation';
import type { SkillId } from '../systems/data';
import { GORE_LEVELS, type Gore, type Settings } from '../systems/settings';
import type { Quests } from '../systems/quests';

// Plain DOM panels over the game: character sheet (C), inventory (I), the level-up
// choice and dialogue. Kept dumb: they read state and call back.

const el = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
const bar = (v: number, max: number, colour: string) => `<span class="bar"><span style="width:${Math.max(0, Math.min(100, (100 * v) / max))}%;background:${colour}"></span></span>`;

export class Panels {
  open: 'none' | 'character' | 'inventory' | 'dialogue' | 'options' | 'journal' = 'none';
  private skill: SkillId = 'OneHanded';
  constructor(private readonly ch: () => Character, private readonly rep: () => ReputationState, private readonly changed: () => void, private readonly use: (edid: string) => void,
    private readonly settings: () => Settings, private readonly setSettings: (s: Partial<Settings>) => void, private readonly quests: () => Quests) {
    el('panel').addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      if (!t) return;
      const [act, arg] = [t.dataset.act!, t.dataset.arg!];
      const c = this.ch();
      if (act === 'skill') this.skill = arg as SkillId;
      if (act === 'perk') c.takePerk(arg);
      if (act === 'equip') c.equip(arg);
      if (act === 'use') this.use(arg);
      if (act === 'gore') this.setSettings({ gore: arg as Gore });
      if (act === 'unequip') c.unequip(arg as never);
      if (act === 'levelup') c.chooseLevelUp(arg as 'health' | 'stamina');
      if (act === 'choose') this.conversation?.choose(+arg);
      this.changed();
      this.render();
    });
  }
  conversation: Conversation | null = null;

  toggle(which: 'character' | 'inventory' | 'options' | 'journal') { this.open = this.open === which ? 'none' : which; this.render(); }
  talk(c: Conversation) { this.conversation = c; this.open = 'dialogue'; this.render(); }
  close() { this.open = 'none'; this.conversation = null; this.render(); }

  render() {
    const p = el('panel');
    if (this.open === 'dialogue' && this.conversation?.done) { this.close(); return; }
    p.hidden = this.open === 'none';
    if (this.open === 'character') p.innerHTML = this.characterHtml();
    if (this.open === 'inventory') p.innerHTML = this.inventoryHtml();
    if (this.open === 'dialogue') p.innerHTML = this.dialogueHtml();
    if (this.open === 'options') p.innerHTML = this.optionsHtml();
    if (this.open === 'journal') p.innerHTML = this.journalHtml();
  }

  private journalHtml() {
    const q = this.quests();
    const active = q.tracker().map((t) => `<div class="quest"><b>${esc(t.title)}</b><div>${esc(t.text)}</div>${t.objectives.map((o) => `<div class="${o.have >= o.need ? 'dim' : ''}">${o.have >= o.need ? '&#10003;' : '&middot;'} ${esc(o.text)}${o.need > 1 ? ` (${o.have}/${o.need})` : ''}${o.optional ? ' <span class="dim">(optional)</span>' : ''}</div>`).join('')}</div>`).join('') || '<div class="dim">No quests in hand.</div>';
    const done = q.s.done.map((id) => `<div class="dim">${esc(q.defs[id]?.title ?? id)}</div>`).join('');
    return `<h2>Journal</h2>${active}${done ? `<h3>Done</h3>${done}` : ''}<div class="dim">J to close</div>`;
  }

  private optionsHtml() {
    const g = this.settings().gore;
    const gore = (Object.keys(GORE_LEVELS) as Gore[]).map((k) => `<div><button data-act="gore" data-arg="${k}" ${k === g ? 'class="sel" disabled' : ''}>${esc(GORE_LEVELS[k].label)}</button></div>`).join('');
    return `<h2>Options</h2><h3>Gore</h3>${gore}<div class="dim">Kept in this browser for every save. O to close</div>`;
  }

  private characterHtml() {
    const c = this.ch(), s = c.s, r = this.rep();
    const lvl = s.pendingLevelUps ? `<div class="levelup">Level up: <button data-act="levelup" data-arg="health">+10 Health</button> <button data-act="levelup" data-arg="stamina">+10 Stamina</button></div>` : '';
    const skills = c.data.skills.map((d) => {
      const k = s.skills[d.skill];
      return `<div class="skill ${d.skill === this.skill ? 'sel' : ''}" data-act="skill" data-arg="${d.skill}"><span>${esc(d.name)}</span><b>${k.level}</b>${bar(k.xp, c.skillXpToNext(d.skill), '#7a6a3a')}</div>`;
    }).join('');
    const tree = c.data.perks;
    const perks = [...tree.values()].filter((p) => p.skill === this.skill).sort((a, b) => (a.skillReq[0]?.level ?? 0) - (b.skillReq[0]?.level ?? 0)).map((p) => {
      const have = s.perks.includes(p.edid), can = c.canTake(p.edid);
      return `<div class="perk ${have ? 'have' : ''}"><b>${esc(p.name)}</b> <span class="dim">${p.skillReq.map((q) => `${q.level}`).join('')}</span> ${have ? '<span class="dim">taken</span>' : can.ok ? `<button data-act="perk" data-arg="${p.edid}">Take</button>` : `<span class="dim">${esc(can.why ?? '')}</span>`}<div class="dim">${esc(p.description ?? '')}</div></div>`;
    }).join('');
    const standing = Object.entries(r.standing).map(([f, v]) => `${esc(f)} ${v}`).join(', ') || 'none yet';
    return `<h2>Character</h2><div>Level ${s.level} ${bar(s.xp, c.xpToNext(), '#8a7a4a')} &middot; Perk points ${s.perkPoints}</div>
      <div>Health ${c.maxHealth} &middot; Stamina ${c.maxStamina} &middot; Armour ${c.armourRating()}</div>
      <div class="dim">Infamy ${r.infamy} &middot; Collateral ${r.collateral} &middot; Standing: ${standing}</div>${lvl}
      <div class="cols"><div class="skills">${skills}</div><div class="perks">${perks}</div></div><div class="dim">C to close</div>`;
  }

  private inventoryHtml() {
    const c = this.ch(), s = c.s;
    const name = (e: string) => c.data.weapons.get(e)?.name ?? c.data.armour.get(e)?.name ?? c.data.items[e]?.name ?? e;
    const equipped = Object.entries(s.equipped).map(([slot, e]) => `<div>${slot}: ${e ? `${esc(name(e))} <button data-act="unequip" data-arg="${slot}">Remove</button>` : '<span class="dim">nothing</span>'}</div>`).join('');
    const items = Object.entries(s.inventory).filter(([, n]) => n > 0).map(([e, n]) => {
      const w = c.data.weapons.get(e), a = c.data.armour.get(e), it = c.data.items[e];
      if (it) return `<div>${esc(it.name)}${n > 1 ? ` x${n}` : ''} <span class="dim">weight ${it.weight}</span> ${it.use ? `<button data-act="use" data-arg="${e}">Use</button>` : ''}</div>`;
      const stat = w ? `damage ${w.damage}` : a ? (a.rating ? `armour ${a.rating}` : 'clothing') : '';
      const worn = Object.values(s.equipped).includes(e);
      return `<div>${esc(name(e))}${n > 1 ? ` x${n}` : ''} <span class="dim">${stat}, weight ${w?.weight ?? a?.weight ?? 0}</span> ${worn ? '<span class="dim">worn</span>' : `<button data-act="equip" data-arg="${e}">Equip</button>`}</div>`;
    }).join('');
    return `<h2>Inventory</h2><div>Armour ${c.armourRating()} &middot; Carrying ${c.carried()}</div><h3>Equipped</h3>${equipped}<h3>Carried</h3>${items}<div class="dim">I to close</div>`;
  }

  private dialogueHtml() {
    const cv = this.conversation!;
    const n = cv.current;
    const choices = cv.choices.map((c, i) => `<div><button data-act="choose" data-arg="${i}">${i + 1}. ${esc(c.text)}</button></div>`).join('');
    return `<h2>${esc(n.speaker)}</h2><p>${esc(n.text)}</p>${choices}`;
  }
}
