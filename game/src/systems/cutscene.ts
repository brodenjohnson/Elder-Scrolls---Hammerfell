// Cutscenes (bible 6.3: they carry the prologue). A scene is a list of steps run in
// order; the game shows the result (fade, letterbox caption, a line spoken, the camera)
// and the player's input is off until it ends. Escape skips to the end, still applying
// every flag and quest so a skipped scene changes the story the same way.

export type Step =
  | { fade: 'in' | 'out'; seconds: number }
  | { caption: string; seconds: number }
  | { say: { speaker: string; text: string }; seconds: number }
  | { camera: [number, number] | 'player'; seconds: number } // pan to a ground point, or back to the player
  | { wait: number }
  | { setFlag: string }
  | { startQuest: string }
  | { run: string }; // a named game action: move someone, change the time, change the world
export type Scene = { id: string; steps: Step[] };

export type SceneView = { fade: number; caption: string; line: { speaker: string; text: string } | null; camera: [number, number] | null };
export type SceneHooks = { flag: (f: string) => void; startQuest: (id: string) => void; player: () => [number, number]; token: (s: string) => string; run?: (action: string) => void };

const dur = (s: Step) => ('seconds' in s ? s.seconds : 'wait' in s ? s.wait : 0);

export class Cutscene {
  private i = -1;
  private t = 0;
  done = false;
  view: SceneView = { fade: 0, caption: '', line: null, camera: null };
  private from: [number, number] = [0, 0];

  constructor(readonly scene: Scene, private readonly hooks: SceneHooks, startFade = 0) {
    this.view.fade = startFade;
    this.next();
  }

  private next() {
    this.i++; this.t = 0;
    const s = this.scene.steps[this.i];
    if (!s) { this.done = true; this.view.caption = ''; this.view.line = null; return; }
    if ('setFlag' in s) { this.hooks.flag(s.setFlag); this.next(); return; }
    if ('startQuest' in s) { this.hooks.startQuest(s.startQuest); this.next(); return; }
    if ('run' in s) { this.hooks.run?.(s.run); this.next(); return; }
    this.view.caption = 'caption' in s ? this.hooks.token(s.caption) : '';
    this.view.line = 'say' in s ? { speaker: this.hooks.token(s.say.speaker), text: this.hooks.token(s.say.text) } : null;
    if ('camera' in s) this.from = this.view.camera ?? this.hooks.player();
  }

  update(dt: number) {
    if (this.done) return;
    const s = this.scene.steps[this.i];
    this.t += dt;
    const u = Math.min(1, this.t / Math.max(0.001, dur(s)));
    const ease = u * u * (3 - 2 * u);
    if ('fade' in s) this.view.fade = s.fade === 'out' ? ease : 1 - ease;
    if ('camera' in s) {
      const to = s.camera === 'player' ? this.hooks.player() : s.camera;
      this.view.camera = [this.from[0] + (to[0] - this.from[0]) * ease, this.from[1] + (to[1] - this.from[1]) * ease];
      if (u >= 1 && s.camera === 'player') this.view.camera = null;
    }
    if (this.t >= dur(s)) this.next();
  }

  // Run every remaining step's story effects at once; the screen returns to play.
  skip() {
    while (!this.done) {
      const s = this.scene.steps[this.i];
      if (s && 'fade' in s) this.view.fade = s.fade === 'out' ? 1 : 0;
      this.next();
    }
    this.view = { fade: 0, caption: '', line: null, camera: null };
  }
}
