// Data-driven quests (public/data/quests.json). A quest is a list of stages; a stage
// has objectives, and finishing them all applies the stage's effects and moves on.
// Objectives are met by game events (talk to someone, use a thing, kill, reach a
// place) or by a story flag, so quests never reach into game code.

export type QuestEvent = { type: 'talk' | 'interact' | 'kill' | 'reach' | 'flag'; target: string };
export type Objective = { id: string; text: string; on: QuestEvent; count?: number; optional?: boolean };
export type StageEffect = { setFlag?: string; give?: Record<string, number>; startQuest?: string; say?: string };
export type Stage = { id: string; text: string; objectives: Objective[]; then?: StageEffect; next?: string };
export type QuestDef = { id: string; title: string; giver?: string; stages: Stage[] };

// Saved: each active quest's stage and progress per objective, and the finished quests.
export type QuestState = { active: Record<string, { stage: string; progress: Record<string, number> }>; done: string[] };
export const newQuestState = (): QuestState => ({ active: {}, done: [] });

export type QuestHooks = { flags: () => Set<string>; give: (edid: string, n: number) => void; say: (m: string) => void };

export class Quests {
  constructor(readonly defs: Record<string, QuestDef>, public s: QuestState, private readonly hooks: QuestHooks) {}

  stage(id: string) { const a = this.s.active[id], q = this.defs[id]; return a && q ? q.stages.find((x) => x.id === a.stage) : undefined; }
  isActive(id: string) { return !!this.s.active[id]; }
  isDone(id: string) { return this.s.done.includes(id); }

  start(id: string) {
    const q = this.defs[id];
    if (!q || this.isActive(id) || this.isDone(id)) return false;
    this.s.active[id] = { stage: q.stages[0].id, progress: {} };
    this.hooks.flags().add(`quest:${id}`);
    this.hooks.say(`New quest: ${q.title}.`);
    this.checkFlags();
    return true;
  }

  // Something happened in the world: count it against every active objective it meets.
  notify(e: QuestEvent) {
    for (const id of Object.keys(this.s.active)) {
      const a = this.s.active[id], st = this.stage(id);
      if (!st) continue;
      let changed = false;
      for (const o of st.objectives) {
        if (o.on.type !== e.type || o.on.target !== e.target) continue;
        const need = o.count ?? 1, have = a.progress[o.id] ?? 0;
        if (have >= need) continue;
        a.progress[o.id] = have + 1; changed = true;
        if (have + 1 >= need) this.hooks.say(`Done: ${o.text}.`);
      }
      if (changed) this.advance(id);
    }
  }
  // Flag objectives are checked whenever flags may have changed.
  checkFlags() { for (const f of this.hooks.flags()) this.notify({ type: 'flag', target: f }); }

  private complete(o: Objective, a: { progress: Record<string, number> }) { return (a.progress[o.id] ?? 0) >= (o.count ?? 1); }
  private advance(id: string) {
    const a = this.s.active[id], st = this.stage(id), q = this.defs[id];
    if (!a || !st || !st.objectives.every((o) => o.optional || this.complete(o, a))) return;
    const t = st.then;
    if (t?.setFlag) this.hooks.flags().add(t.setFlag);
    for (const [k, n] of Object.entries(t?.give ?? {})) this.hooks.give(k, n);
    if (t?.say) this.hooks.say(t.say);
    const next = st.next ? q.stages.find((x) => x.id === st.next) : undefined;
    if (next) { a.stage = next.id; a.progress = {}; this.checkFlags(); }
    else { delete this.s.active[id]; this.s.done.push(id); this.hooks.flags().add(`done:${id}`); this.hooks.say(`Quest complete: ${q.title}.`); }
    if (t?.startQuest) this.start(t.startQuest);
  }

  // What the tracker shows: each active quest's title, stage text and objectives.
  tracker() {
    return Object.keys(this.s.active).map((id) => {
      const a = this.s.active[id], st = this.stage(id)!;
      return { id, title: this.defs[id].title, text: st.text, objectives: st.objectives.map((o) => ({ text: o.text, have: Math.min(a.progress[o.id] ?? 0, o.count ?? 1), need: o.count ?? 1, optional: !!o.optional })) };
    });
  }
}
