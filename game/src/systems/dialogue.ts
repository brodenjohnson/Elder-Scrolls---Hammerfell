import type { Character } from './character';
import type { SkillId } from './data';
import { applyReputation, type ReputationState } from './reputation';
import type { Quests } from './quests';

// Data-driven dialogue (public/data/dialogue/*.json). A conversation is a set of
// nodes; each has a line and choices. Choices can be gated by conditions and carry
// effects. Speech checks use the player's Speech skill and train it.

export type Condition = { skill?: { id: SkillId; atLeast: number }; standing?: { faction: string; atLeast: number }; flag?: string; notFlag?: string; has?: string };
export type Effect = {
  standing?: Record<string, number>; infamy?: number; collateral?: number;
  give?: Record<string, number>; take?: Record<string, number>;
  train?: { skill: SkillId; amount: number }; setFlag?: string;
  startQuest?: string; questEvent?: string; // start a quest; send a "talk" event to the quests
};
export type Choice = { text: string; next?: string; if?: Condition; do?: Effect;
  // A Speech check: succeed if Speech is at least `level`, going to `pass` or `fail`.
  check?: { skill: SkillId; level: number; pass: string; fail: string } };
export type DialogueNode = { speaker: string; text: string; choices: Choice[] };
export type Dialogue = { id: string; title: string; start: string; nodes: Record<string, DialogueNode> };

export type DialogueContext = { character: Character; reputation: ReputationState; flags: Set<string>; say: (m: string) => void; quests?: Quests };

export function allowed(c: Condition | undefined, ctx: DialogueContext): boolean {
  if (!c) return true;
  if (c.skill && ctx.character.s.skills[c.skill.id].level < c.skill.atLeast) return false;
  if (c.standing && (ctx.reputation.standing[c.standing.faction] ?? 0) < c.standing.atLeast) return false;
  if (c.flag && !ctx.flags.has(c.flag)) return false;
  if (c.notFlag && ctx.flags.has(c.notFlag)) return false;
  if (c.has && !ctx.character.s.inventory[c.has]) return false;
  return true;
}

function apply(e: Effect | undefined, what: string, ctx: DialogueContext) {
  if (!e) return;
  if (e.standing || e.infamy || e.collateral) applyReputation(ctx.reputation, what, { standing: e.standing, infamy: e.infamy, collateral: e.collateral });
  for (const [k, n] of Object.entries(e.give ?? {})) { ctx.character.give(k, n); ctx.say(`Received ${n > 1 ? `${n} x ` : ''}${ctx.character.data.weapons.get(k)?.name ?? ctx.character.data.armour.get(k)?.name ?? ctx.character.data.items[k]?.name ?? k}.`); }
  for (const [k, n] of Object.entries(e.take ?? {})) { ctx.character.s.inventory[k] = Math.max(0, (ctx.character.s.inventory[k] ?? 0) - n); }
  if (e.train) ctx.character.useSkill(e.train.skill, e.train.amount);
  if (e.setFlag) ctx.flags.add(e.setFlag);
  if (e.startQuest) { ctx.flags.add(`quest:${e.startQuest}`); ctx.quests?.start(e.startQuest); }
  if (e.questEvent) ctx.quests?.notify({ type: 'talk', target: e.questEvent });
  if (e.setFlag) ctx.quests?.checkFlags();
}

// One conversation in progress.
export class Conversation {
  node: string;
  done = false;
  constructor(readonly d: Dialogue, readonly ctx: DialogueContext) { this.node = d.start; }
  get current() { return this.d.nodes[this.node]; }
  get choices() { return this.current.choices.filter((c) => allowed(c.if, this.ctx)); }
  choose(i: number) {
    const c = this.choices[i];
    if (!c) return;
    apply(c.do, `${this.d.id}: ${c.text}`, this.ctx);
    let next = c.next;
    if (c.check) {
      const pass = this.ctx.character.s.skills[c.check.skill].level >= c.check.level;
      // Skyrim trains Speech on a successful persuasion; a failure teaches a little.
      this.ctx.character.useSkill(c.check.skill, pass ? 6 : 1);
      next = pass ? c.check.pass : c.check.fail;
    }
    if (!next || next === 'end') this.done = true; else this.node = next;
  }
}
