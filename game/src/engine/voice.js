/* =====================================================================
   Voices for the sample: bandits who taunt, swear and react to what you do to their
   mates, and Kasim's few, flat words (the Punisher, bible 1). The lines are data
   (data/voice/lines.json). Where a recording has been made for a line
   (scripts/voices.mjs, ElevenLabs) it is played; otherwise the browser's own
   text-to-speech reads it, which is robotic but shows the timing.
   ===================================================================== */
window.HFV = (() => {
  const synth = window.speechSynthesis;
  let on = true, voices = [], LINES = null, MANIFEST = {};
  const load = () => { voices = synth ? synth.getVoices().filter((v) => /^en/i.test(v.lang)) : []; };
  if (synth) { load(); synth.onvoiceschanged = load; }
  fetch('./data/voice/lines.json').then((r) => r.json()).then((j) => { LINES = j; }).catch(() => {});
  fetch('./audio/voice/manifest.json').then((r) => (r.ok ? r.json() : {})).then((j) => { MANIFEST = j; }).catch(() => {});

  // Priority 3 lines interrupt anything; 0 is idle talk.
  const PRIO = { allyHead: 3, allyArm: 3, allyCrushed: 3, allyThroat: 3, allyDeath: 2, fury: 3, spot: 2, victory: 3, disarmed: 2, scared: 2, taunt: 1, hurt: 1, attack: 0, kill: 1, finisher: 2, low: 2, clear: 1, note: 2, chat: 0 };
  const bubbles = [], last = {};
  let busyUntil = 0, chatAt = performance.now() + 4000, chatIdx = 0, playing = null;
  const speakerOf = (f) => (f.person === 'kasim' ? 'kasim' : (f.pname || '').toLowerCase());

  // Say line i of a set: the recording if there is one, otherwise text-to-speech.
  function speak(f, set, i, ctx, prio) {
    const def = LINES?.sets[set]; if (!def) return false;
    const now = performance.now();
    if (prio < 3 && now < busyUntil) return false;
    if (prio < 2 && now - (last[f.vid] || 0) < 4000) return false;
    const raw = def.lines[i], name = raw.includes('{name}') ? ctx.name : null, text = name ? raw.replaceAll('{name}', name) : raw;
    last[f.vid] = now; busyUntil = now + 900 + text.length * 55;
    for (let k = bubbles.length - 1; k >= 0; k--) if (bubbles[k].f === f) bubbles.splice(k, 1);
    bubbles.push({ f, text, until: now + 1800 + text.length * 55 });
    if (!on) return true;
    const who = speakerOf(f), id = `${set}.${i}${name ? `.${name.toLowerCase()}` : ''}`;
    if (MANIFEST[who]?.[id]) {
      if (prio >= 3 && playing) playing.pause();
      playing = new Audio(`./audio/voice/${who}/${id}.mp3`); playing.volume = 1; playing.play().catch(() => {});
    } else if (synth && voices.length) {
      if (prio >= 3) synth.cancel();
      const u = new SpeechSynthesisUtterance(text), v = f.voice || { pitch: 0.8, rate: 1.05, v: 1 };
      const male = voices.filter((x) => /david|mark|guy|george|ryan|james|daniel|male|thomas|fred|alex/i.test(x.name) && !/female|zira|hazel|susan|libby|sonia|aria|jenny/i.test(x.name));
      const pool = male.length ? male : voices;
      u.voice = pool[v.v % pool.length]; u.pitch = v.pitch; u.rate = v.rate; u.volume = 1;
      synth.speak(u);
    }
    return true;
  }
  return {
    bubbles,
    bark(kind, f, ctx = {}) {
      if (!f || !LINES) return;
      const sets = f.person === 'kasim' ? [`kasim.${kind}`] : f.chief ? [`chief.${kind}`, `bandit.${kind}`] : [`bandit.${kind}`];
      const set = sets.find((s) => LINES.sets[s]); if (!set) return;
      speak(f, set, Math.floor(Math.random() * LINES.sets[set].lines.length), ctx, PRIO[kind] ?? 1);
    },
    // Two men by the fire trade a line each, now and then (the chat lines come in pairs).
    chat(a, b) {
      const now = performance.now();
      if (now < chatAt || !a || !b || !LINES) return;
      const n = LINES.sets['bandit.chat'].lines.length / 2, k = chatIdx++ % n;
      if (speak(a, 'bandit.chat', k * 2, {}, 0)) setTimeout(() => speak(b, 'bandit.chat', k * 2 + 1, {}, 0), 900 + LINES.sets['bandit.chat'].lines[k * 2].length * 55);
      chatAt = now + 9000;
    },
    // A line of dialogue or a scene, read aloud by text-to-speech until recordings exist.
    // Women and the girl get a woman's voice; men their own pitch.
    say(name, text, actor) {
      if (!on || !synth || !voices.length || !text) return;
      synth.cancel();
      const female = actor ? ['woman', 'girl'].includes(actor.build) : /^(Nadira|Tavi|Zeyna|Amira|Dalia|Khadija|Mother)/.test(name || '');
      const pool = voices.filter((x) => (female ? /zira|hazel|susan|libby|sonia|aria|jenny|female|samantha|karen/i : /david|mark|guy|george|ryan|james|daniel|male|thomas|fred|alex/i).test(x.name));
      const u = new SpeechSynthesisUtterance(text.replace(/\[[^\]]*\]/g, '')), v = actor?.voice;
      u.voice = (pool.length ? pool : voices)[(v?.v ?? (name || '').length) % (pool.length || voices.length)];
      u.pitch = v?.pitch ?? (actor?.build === 'girl' || /^Tavi/.test(name || '') ? 1.6 : female ? 1.05 : 0.75); u.rate = v?.rate ?? 0.95;
      synth.speak(u);
    },
    setOn(v) { on = v; if (!v) { synth?.cancel(); playing?.pause(); } },
    get on() { return on; },
    get available() { return !!(synth && voices.length) || Object.keys(MANIFEST).length > 0; },
    get recorded() { return Object.values(MANIFEST).reduce((n, s) => n + Object.keys(s).length, 0); },
  };
})();
