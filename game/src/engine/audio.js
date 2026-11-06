/* =====================================================================
   The sample's sound: everything is synthesised in the browser (Web Audio), so there
   are no files. Music in the spirit of a Nordic score (our own, not Skyrim's): a low
   drone and plucked strings while exploring, war drums and a string ostinato in a
   fight, and heavy metal in Fury (drop-D chugs, double kick, a crash on every bar).
   Impacts depend on the weapon and what it hits: blades slice flesh and clang off
   steel, blunt weapons thud and crack bone, shields ring or thunk. Every sound varies
   a little each time. The roar is a synthesised war cry; a recorded voice would
   replace it in the game. The title has its own theme: strings, a low choir, a horn
   and timpani, slow and in D minor.
   ===================================================================== */
window.HFA = (() => {
  let ac = null, master, musicBus, sfxBus, verb, noiseBuf, dist, on = true;
  const layers = {};
  const mix = { combat: 0, fury: 0, title: 0 };
  const target = { combat: 0, fury: 0, title: 0 };
  const R = (a, b) => a + Math.random() * (b - a), pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
  function start() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = on ? 0.8 : 0; master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; comp.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = 0.32; musicBus.connect(comp);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(comp);
    verb = ac.createConvolver(); const len = ac.sampleRate * 2.6, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir; const vg = ac.createGain(); vg.gain.value = 0.45; verb.connect(vg); vg.connect(comp);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    dist = shaper(9);
    for (const k of ['explore', 'combat', 'fury']) { layers[k] = ac.createGain(); layers[k].gain.value = 0; layers[k].connect(musicBus); }
    layers.title = ac.createGain(); layers.title.gain.value = 0; layers.title.connect(comp);
    drone(); guitarRig(); setInterval(schedule, 50);
  }
  addEventListener('keydown', start); addEventListener('pointerdown', start);

  // ---------- small builders ----------
  const now = () => ac.currentTime;
  function shaper(k) { const s = ac.createWaveShaper(), c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1024 - 1; c[i] = Math.tanh(x * k); } s.curve = c; return s; }
  function env(g, t, a, peak, d) { peak = Math.max(peak, 0.0002); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function noise(t, dur, type, freq, q, peak, dest = sfxBus, a = 0.003) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = R(0.85, 1.15);
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); env(g, t, a, peak, dur); s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + a + dur + 0.05); return { s, f, g };
  }
  function tone(t, type, freq, dur, peak, dest = sfxBus, a = 0.003, glideTo) {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + a + dur);
    const g = ac.createGain(); env(g, t, a, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + dur + 0.05); return { o, g };
  }
  // Pieces impacts are built from.
  const P = {
    // a blade through the air: a filtered rush, longer and lower for big weapons
    whoosh(t, size, heavy) { const d = 0.08 + size * 0.016, n = noise(t, d, 'bandpass', heavy ? 380 : 700, R(0.8, 1.4), heavy ? 0.55 : 0.38); n.f.frequency.exponentialRampToValueAtTime((heavy ? 1300 : 3200) * R(0.85, 1.15), t + d); },
    // a cut: a bright, falling hiss
    slice(t, k = 1) { const n = noise(t, R(0.06, 0.1), 'highpass', R(2500, 4200), 0.7, 0.45 * k); n.f.frequency.exponentialRampToValueAtTime(900, t + 0.09); },
    // wet: a few low, resonant blips, as flesh parts
    wet(t, k = 1, count = 3) { for (let i = 0; i < count; i++) { const tt = t + i * R(0.015, 0.045), n = noise(tt, R(0.06, 0.14), 'bandpass', R(250, 800), R(3, 7), 0.45 * k); n.f.frequency.exponentialRampToValueAtTime(R(120, 220), tt + 0.12); } },
    // a body blow
    thud(t, f = 110, k = 1) { tone(t, 'sine', f * R(0.9, 1.1), 0.16, 0.9 * k, sfxBus, 0.002, f * 0.4); noise(t, 0.05, 'lowpass', 900, 0.7, 0.45 * k); },
    // bone giving way: a rattle of tiny cracks over a low thud
    crunch(t, k = 1) { P.thud(t, 90, k); for (let i = 0; i < 9; i++) noise(t + i * R(0.006, 0.014), 0.012, 'bandpass', R(1800, 4200), 2, R(0.25, 0.5) * k); },
    snap(t) { noise(t, 0.02, 'bandpass', 3200, 3, 0.8); noise(t + 0.012, 0.03, 'bandpass', 1900, 3, 0.6); tone(t, 'square', 600, 0.02, 0.15); },
    // metal on metal: inharmonic partials ringing, with a scrape
    ring(t, base, decay, k = 1) { for (const [m, p] of [[1, 0.24], [1.58, 0.17], [2.69, 0.12], [4.12, 0.07], [5.4, 0.05]]) tone(t, 'triangle', base * m * R(0.98, 1.02), decay * R(0.8, 1.2) / m ** 0.3, p * k, sfxBus, 0.001); noise(t, 0.04, 'highpass', 4000, 0.7, 0.35 * k); },
    scrape(t, dur = 0.18) { const n = noise(t, dur, 'bandpass', R(3000, 5000), 6, 0.18); n.f.frequency.linearRampToValueAtTime(R(1500, 2500), t + dur); },
    // dull metal: a dented bong
    bong(t, k = 1) { tone(t, 'sine', R(180, 240), 0.35, 0.5 * k, sfxBus, 0.002, 140); tone(t, 'triangle', R(520, 640), 0.2, 0.18 * k, sfxBus, 0.001); noise(t, 0.06, 'lowpass', 1200, 0.7, 0.4 * k); },
    // wood: a hollow knock
    knock(t, k = 1) { tone(t, 'sine', R(150, 200), 0.12, 0.8 * k, sfxBus, 0.001, 110); noise(t, 0.05, 'bandpass', R(700, 1000), 3, 0.5 * k); },
    // leather: a slap
    slap(t, k = 1) { noise(t, 0.05, 'bandpass', R(1000, 1500), 1.4, 0.5 * k); P.thud(t, 140, 0.5 * k); },
    // a fountain of blood: a hiss that pulses like a heartbeat
    spurt(t, dur = 1.2) {
      const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1.2;
      const g = ac.createGain(); g.gain.value = 0; const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 2.6; lg.gain.value = 0.22; lfo.connect(lg); lg.connect(g.gain);
      const out = ac.createGain(); env(out, t, 0.02, 1, dur); s.connect(f); f.connect(g); g.connect(out); out.connect(sfxBus); s.start(t); s.stop(t + dur + 0.1); lfo.start(t); lfo.stop(t + dur + 0.1);
    },
    // choking: a throaty bubbling
    gurgle(t, dur = 1.1) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(R(100, 130), t); o.frequency.linearRampToValueAtTime(70, t + dur);
      const am = ac.createOscillator(), amg = ac.createGain(); am.frequency.value = R(9, 14); amg.gain.value = 0.5; am.connect(amg);
      const g = ac.createGain(); g.gain.value = 0.5; amg.connect(g.gain);
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 4; const out = ac.createGain(); env(out, t, 0.05, 0.5, dur);
      o.connect(g); g.connect(f); f.connect(out); out.connect(sfxBus); o.start(t); o.stop(t + dur + 0.1); am.start(t); am.stop(t + dur + 0.1);
      P.wet(t + 0.1, 0.6, 4);
    },
    // a man's voice: a short cry, groan or gasp shaped by formants
    voice(t, f0, f1, dur, vowel, k = 0.4) {
      const F = { ah: [730, 1090, 2440], uh: [520, 1190, 2390], oh: [570, 840, 2410], eh: [530, 1840, 2480] }[vowel];
      const src = ac.createGain(); env(src, t, 0.02, 1, dur); const out = ac.createGain(); out.gain.value = k; out.connect(sfxBus);
      for (const [f, q, g] of [[F[0], 8, 1], [F[1], 9, 0.6], [F[2], 10, 0.25]]) { const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = ac.createGain(); bg.gain.value = g; src.connect(b); b.connect(bg); bg.connect(out); }
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); o.connect(src); o.start(t); o.stop(t + dur + 0.05);
      noise(t, dur, 'bandpass', 1500, 0.8, 0.12 * k, out, 0.01);
    },
  };

  // ---------- effects ----------
  // What a weapon sounds like through the air, by its shape.
  const SIZE = { dagger: 3, none: 2, sword: 7, scimitar: 7, waraxe: 6, mace: 6, greatsword: 12, battleaxe: 12, warhammer: 12 };
  const SFX = {
    swing(o = {}) { const t = now(), s = SIZE[o.shape] ?? 7; P.whoosh(t, s, o.heavy || s > 10); if (o.shape === 'dagger') P.whoosh(t + 0.05, 2, false); },
    // A blow landing: what struck, on what. cls: blade, axe, blunt, dagger, fist. mat: flesh, leather, metal.
    impact(o = {}) {
      const t = now(), k = o.heavy ? 1.25 : 1, gore = o.gore !== false;
      const flesh = o.mat === 'flesh', metal = o.mat === 'metal';
      switch (o.cls) {
        case 'blade': if (metal) { P.ring(t, R(700, 900), 0.4, k); P.scrape(t + 0.01); } else { P.slice(t, k); if (o.mat === 'leather') P.slap(t, 0.6); } if (gore && !metal) P.wet(t + 0.02, k); P.thud(t, 120, 0.5 * k); break;
        case 'axe': if (metal) { P.ring(t, R(500, 650), 0.35, k); P.bong(t, 0.6); } else { P.thud(t, 100, k); P.slice(t, 0.6); } if (gore) P.wet(t + 0.02, k * (metal ? 0.5 : 1.2), 4); break;
        case 'blunt': if (metal) P.bong(t, k * 1.2); else P.thud(t, 85, k * 1.2); if (o.mat !== 'metal' || o.heavy) P.crunch(t + 0.005, flesh ? k : 0.6 * k); if (gore && flesh) P.wet(t + 0.03, 0.7); break;
        case 'dagger': if (metal) P.ring(t, R(1100, 1400), 0.2, 0.7); else { P.slice(t, 0.5); P.wet(t, 1, 2); } P.thud(t, 160, 0.4); break;
        default: P.thud(t, 120, k); if (flesh) P.slap(t, 0.5); break;
      }
      if (o.crit) { P.snap(t + 0.01); tone(t, 'square', 1500, 0.06, 0.1); }
      if (o.hurt) P.voice(t + 0.03, R(150, 190), R(110, 130), R(0.15, 0.25), pick(['uh', 'ah', 'eh']), 0.3);
    },
    // A blow stopped by a weapon or a shield: what struck, on what kind of guard.
    clash(o = {}) {
      const t = now(), metalWeapon = o.cls !== 'fist';
      if (o.guard === 'wood') { P.knock(t, 1.2); if (metalWeapon) P.ring(t, R(900, 1100), 0.12, 0.3); }
      else if (o.guard === 'metal') { P.ring(t, R(420, 560), 0.6, 1.3); P.bong(t, 0.7); }
      else { P.ring(t, R(800, 1000), 0.5, 1.1); P.scrape(t + 0.03, 0.25); } // blade on blade
      if (o.parry) { tone(t + 0.02, 'triangle', R(1550, 1750), 0.8, 0.2, verb, 0.001); P.scrape(t + 0.05, 0.3); }
    },
    bash(o = {}) { const t = now(); P.thud(t, 75, 1.3); if (o.guard === 'metal') P.bong(t, 0.8); else P.knock(t, 1); P.voice(t + 0.04, 170, 120, 0.18, 'uh', 0.3); },
    dodge() { const t = now(), n = noise(t, 0.16, 'bandpass', 500, 0.8, 0.25); n.f.frequency.exponentialRampToValueAtTime(1500, t + 0.15); },
    roll() { const t = now(); noise(t, 0.35, 'lowpass', 400, 0.7, 0.35); P.thud(t + 0.28, 90, 0.5); },
    pickup() { const t = now(); tone(t, 'triangle', R(1250, 1400), 0.12, 0.12); tone(t + 0.06, 'triangle', R(1900, 2050), 0.15, 0.08); },
    // Gore.
    decap() { const t = now(); P.slice(t, 1.4); P.snap(t + 0.02); P.wet(t + 0.03, 1.4, 5); P.spurt(t + 0.1, 1.6); },
    dismember() { const t = now(); P.slice(t, 1.2); P.crunch(t + 0.01, 0.8); P.wet(t + 0.03, 1.3, 5); P.spurt(t + 0.1, 1.1); P.voice(t + 0.05, 260, 140, 0.6, 'ah', 0.45); },
    crush() { const t = now(); P.thud(t, 70, 1.5); P.crunch(t, 1.4); P.crunch(t + 0.03, 1); P.wet(t + 0.05, 1.5, 6); },
    impale() { const t = now(); P.slice(t, 0.8); P.wet(t, 1.4, 4); P.crunch(t + 0.02, 0.5); P.voice(t + 0.08, 200, 150, 0.7, 'ah', 0.4); P.gurgle(t + 0.6, 0.6); },
    stab() { const t = now(); P.wet(t, 1.2, 3); P.thud(t, 150, 0.6); P.voice(t + 0.04, R(170, 210), 140, 0.2, 'uh', 0.35); },
    throat() { const t = now(); P.slice(t, 1); P.wet(t + 0.02, 1.2, 4); P.gurgle(t + 0.15, 1.3); P.spurt(t + 0.1, 1.4); },
    snapLeg() { const t = now(); P.snap(t); P.crunch(t + 0.01, 1.2); P.voice(t + 0.05, 240, 160, 0.5, 'ah', 0.5); },
    land() { const t = now(); P.thud(t, R(120, 180), 0.5); P.wet(t, 0.5, 2); }, // a head or arm hitting the ground
    death(o = {}) { const t = now(); P.voice(t, R(150, 180), R(70, 90), R(0.5, 0.8), pick(['uh', 'oh', 'ah']), 0.35); P.thud(t + R(0.35, 0.55), 90, 0.7); },
    hurt() { const t = now(); P.voice(t, R(140, 170), R(100, 120), 0.18, pick(['uh', 'eh']), 0.4); },
    // The war cry: two voices an octave apart, with a growl, gliding up to a scream and down,
    // then a slam: a sub drop, a crash and the hall.
    roar() {
      const t = now(), dur = 2.1;
      const out = ac.createGain(); out.gain.value = 0.75; const sh = shaper(6); sh.connect(out); out.connect(sfxBus); out.connect(verb);
      const voiceIn = ac.createGain(); env(voiceIn, t, 0.06, 1, dur - 0.1);
      const growl = ac.createGain(); growl.gain.value = 0.6; const am = ac.createOscillator(), amg = ac.createGain(); am.frequency.value = 38; amg.gain.value = 0.4; am.connect(amg); amg.connect(growl.gain); am.start(t); am.stop(t + dur + 0.1);
      voiceIn.connect(growl);
      for (const [f, q, g] of [[720, 5, 1], [1150, 6, 0.75], [2500, 8, 0.4], [330, 3, 0.6], [3300, 9, 0.2]]) { const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = ac.createGain(); bg.gain.value = g; growl.connect(b); b.connect(bg); bg.connect(sh); }
      for (const [mul, type, det] of [[1, 'sawtooth', 0], [1, 'sawtooth', 7], [0.5, 'sawtooth', -5], [0.5, 'square', 3], [2, 'sawtooth', 10]]) {
        const o = ac.createOscillator(); o.type = type; o.detune.value = det;
        o.frequency.setValueAtTime(100 * mul, t); o.frequency.linearRampToValueAtTime(175 * mul, t + 0.45); o.frequency.linearRampToValueAtTime(160 * mul, t + 1.3); o.frequency.linearRampToValueAtTime(90 * mul, t + dur);
        const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = R(5.5, 7.5); vg.gain.value = 5 * mul; vib.connect(vg); vg.connect(o.frequency); vib.start(t); vib.stop(t + dur + 0.1);
        const og = ac.createGain(); og.gain.value = mul === 2 ? 0.25 : mul === 0.5 ? 0.7 : 1; o.connect(og); og.connect(voiceIn); o.start(t); o.stop(t + dur + 0.1);
      }
      noise(t, dur, 'bandpass', 1500, 0.7, 0.4, voiceIn, 0.05);
      tone(t, 'sine', 60, 1.6, 1.2, sfxBus, 0.004, 25); tone(t + 0.05, 'sine', 42, 1.8, 0.8, verb, 0.01, 22);
      noise(t, 2.2, 'highpass', 5000, 0.5, 0.45, sfxBus, 0.002); noise(t, 0.5, 'lowpass', 220, 0.7, 1, sfxBus);
      // the metal comes in hard on the roar
      mix.fury = 1; target.fury = 1; metalStep = 0; metalT = t + 0.35;
    },
    discover() { const t = now(); for (const [f, d] of [[146.8, 0], [220, 0.02], [293.7, 0.04], [349.2, 0.3]]) { const o = tone(t + d, 'sawtooth', f, 2.4, 0.06, verb, 0.6); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; o.o.disconnect(); o.o.connect(lp); lp.connect(o.g); } },
    level() { const t = now(); for (const [f, d] of [[293.7, 0], [370, 0.15], [440, 0.3], [587.3, 0.45]]) tone(t + d, 'triangle', f, 1.4, 0.12, verb, 0.02); },
    finisher() { const t = now(); tone(t, 'sine', 45, 0.8, 1, sfxBus, 0.003, 26); noise(t, 0.4, 'lowpass', 300, 0.7, 0.6, verb); },
    // At a station: hammer on the anvil, the grindstone's rasp, the smelter's roar, a hide pulled taut.
    smith(o = {}) {
      const t = now();
      if (o.station === 'grindstone') { for (let i = 0; i < 3; i++) P.scrape(t + i * 0.22, 0.2); }
      else if (o.station === 'smelter') { noise(t, 0.9, 'lowpass', 500, 0.7, 0.6, sfxBus, 0.2); P.ring(t + 0.7, R(500, 600), 0.4, 0.5); }
      else if (o.station === 'tanning') { P.slap(t, 0.8); noise(t + 0.15, 0.3, 'bandpass', 900, 1, 0.3); }
      else for (let i = 0; i < 3; i++) { P.ring(t + i * 0.28, R(1100, 1300), 0.5, 0.7); tone(t + i * 0.28, 'sine', 180, 0.08, 0.5, sfxBus, 0.001, 120); }
    },
    // Steel drawn from the scabbard (a scrape and a ring) or put back (a scrape and a knock).
    sheathe(o = {}) { const t = now(); P.scrape(t, 0.3); if (o.draw) P.ring(t + 0.16, R(1500, 1700), 0.25, 0.35); else P.knock(t + 0.2, 0.5); },
    torch() { const t = now(); const n = noise(t, 0.4, 'bandpass', 600, 0.7, 0.4, sfxBus, 0.05); n.f.frequency.exponentialRampToValueAtTime(2400, t + 0.35); },
    // The title appears: a timpani roll swelling into a struck chord and a crash.
    reveal() {
      const t = now();
      for (let i = 0; i < 22; i++) timp(t + i * 0.07, 73.4, 0.15 + (i / 22) * 0.5, layers.title);
      timp(t + 1.6, 73.4, 1.3, layers.title); noise(t + 1.6, 2.6, 'highpass', 4000, 0.5, 0.35, layers.title, 0.002); noise(t + 0.2, 1.4, 'highpass', 6000, 0.5, 0.2, layers.title, 1.3);
      strings(t + 1.6, ['D2', 'A2', 'D3', 'F3', 'A3', 'D4'], 4.5, 0.9);
    },
  };

  // ---------- music ----------
  // Exploring and fighting: D minor, about 92 beats a minute, in bars of six eighths.
  const BPM = 92, EIGHTH = 60 / BPM / 2, PENT = [293.7, 349.2, 392, 440, 523.3, 587.3, 698.5];
  let nextT = 0, step = 0;
  function drone() {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 2; const g = ac.createGain(); g.gain.value = 0.35; lp.connect(g); g.connect(layers.explore); g.connect(layers.combat);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 120; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    for (const f of [73.4, 110, 73.4 * 1.003]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
  }
  function drum(t, freq, peak, dest) { tone(t, 'sine', freq * 2.2, 0.35, peak, dest, 0.002, freq); noise(t, 0.05, 'lowpass', 900, 0.7, peak * 0.4, dest); }
  // Fury: heavy metal at 168 beats a minute, in sixteenths. Drop D: a palm-muted chug on the
  // low D, stabs up to F, G and A flat, a bass doubling the root, double kick and snare.
  const MBPM = 168, SIXT = 60 / MBPM / 4;
  let metalT = 0, metalStep = 0, guitarIn;
  function guitarRig() {
    guitarIn = ac.createGain(); guitarIn.gain.value = 0.5;
    const pre = ac.createBiquadFilter(); pre.type = 'highpass'; pre.frequency.value = 90;
    const d1 = shaper(22), d2 = shaper(4), cab = ac.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = 3800; cab.Q.value = 1;
    const mid = ac.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 900; mid.gain.value = -6; const out = ac.createGain(); out.gain.value = 0.22;
    guitarIn.connect(pre); pre.connect(d1); d1.connect(d2); d2.connect(cab); cab.connect(mid); mid.connect(out); out.connect(layers.fury);
  }
  // A power chord: root, fifth and octave, two guitars a hair apart. mute: palm muted.
  function chord(t, root, dur, mute) {
    const g = ac.createGain(); env(g, t, 0.003, 1, dur); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = mute ? 900 : 6000; g.connect(lp); lp.connect(guitarIn);
    for (const m of [1, 1.4983, 2]) for (const det of [-6, 6]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = root * m; o.detune.value = det; o.connect(g); o.start(t); o.stop(t + dur + 0.05); }
    const b = tone(t, 'sawtooth', root / 2, dur, 0.25, layers.fury, 0.003); const blp = ac.createBiquadFilter(); blp.type = 'lowpass'; blp.frequency.value = 400; b.o.disconnect(); b.o.connect(blp); blp.connect(b.g);
  }
  const D2 = 73.42, RIFF = [ // [root multiple, length in sixteenths, muted], one bar of 16
    [1, 1, 1], [1, 1, 1], [1, 1, 1], [0], [1, 1, 1], [1, 1, 1], [1.189, 2, 0], [0], [1, 1, 1], [1, 1, 1], [1.335, 2, 0], [0], [1, 1, 1], [1.414, 1, 0], [1.335, 1, 0], [1.189, 1, 0],
  ];
  function scheduleMetal(t) {
    const s = metalStep % 16, bar = Math.floor(metalStep / 16), r = RIFF[s];
    if (r[0]) chord(t, D2 * r[0] * (bar % 4 === 3 && s < 6 ? 1.189 : 1), SIXT * r[1] * (r[2] ? 0.7 : 1.6), r[2]);
    // double kick on every sixteenth, snare on 2 and 4, a crash at the top of every bar
    tone(t, 'sine', 120, 0.08, 0.7, layers.fury, 0.001, 45); noise(t, 0.012, 'highpass', 2500, 0.7, 0.25, layers.fury);
    if (s === 4 || s === 12) { noise(t, 0.16, 'bandpass', 1900, 0.8, 0.8, layers.fury); tone(t, 'triangle', 190, 0.1, 0.4, layers.fury, 0.001, 140); }
    if (s % 2 === 0) noise(t, 0.03, 'highpass', 7000, 0.7, 0.2, layers.fury);
    if (s === 0) noise(t, 1.1, 'highpass', 4500, 0.5, 0.5, layers.fury, 0.001);
  }
  // ---------- the title theme ----------
  // Eight bars at 66 beats a minute: strings and a low choir hold each chord, a horn carries the tune,
  // timpani mark the phrases. Our own melody, in the spirit of the old Elder Scrolls themes.
  const TB = 60 / 66, TBAR = TB * 4;
  const NOTE = (s) => { const m = s.match(/^([A-G])([#b]?)(\d)$/); return 440 * Math.pow(2, ({ C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] - 4) * 12) / 12); };
  const CHORDS = [['D3', 'F3', 'A3', 'D4'], ['Bb2', 'F3', 'Bb3', 'D4'], ['F2', 'C3', 'F3', 'A3'], ['C3', 'G3', 'C4', 'E4'], ['D3', 'A3', 'D4', 'F4'], ['G2', 'D3', 'G3', 'Bb3'], ['A2', 'E3', 'A3', 'C#4'], ['D3', 'A3', 'D4', 'F4']];
  const TUNE = [[['D4', 2], ['A4', 2]], [['Bb4', 1.5], ['A4', 0.5], ['F4', 2]], [['A4', 1], ['C5', 1], ['A4', 2]], [['G4', 3], ['E4', 1]],
    [['F4', 1], ['A4', 1], ['D5', 2]], [['D5', 1], ['C5', 1], ['Bb4', 2]], [['A4', 1], ['C#5', 1], ['E5', 1], ['C#5', 1]], [['D5', 4]]];
  let titleOn = false, titleT = 0, titleBar = 0;
  function strings(t, notes, dur, k = 0.6) {
    const g = ac.createGain(); env(g, t, 0.9, k * 0.09, dur); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; g.connect(lp); lp.connect(layers.title); lp.connect(verb);
    for (const n of notes) for (const det of [-9, 0, 8]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(n); o.detune.value = det; o.connect(g); o.start(t); o.stop(t + dur + 1.2); }
  }
  function choir(t, notes, dur) {
    const out = ac.createGain(); env(out, t, 1.2, 0.05, dur); out.connect(layers.title); out.connect(verb);
    for (const [f, q, g] of [[730, 8, 1], [1090, 9, 0.5], [2440, 10, 0.2]]) {
      const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = ac.createGain(); bg.gain.value = g; b.connect(bg); bg.connect(out);
      for (const n of notes) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(n) / 2; const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = R(4.5, 5.5); vg.gain.value = 2; vib.connect(vg); vg.connect(o.frequency); o.connect(b); o.start(t); o.stop(t + dur + 1.4); vib.start(t); vib.stop(t + dur + 1.4); }
    }
  }
  function horn(t, n, dur) {
    const g = ac.createGain(); env(g, t, 0.09, 0.16, dur * 0.95); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1300, t + 0.15); lp.Q.value = 1.5;
    g.connect(lp); lp.connect(layers.title); lp.connect(verb);
    for (const [type, mul, k] of [['sawtooth', 1, 0.6], ['triangle', 1, 1], ['sine', 0.5, 0.5]]) { const o = ac.createOscillator(); o.type = type; o.frequency.value = NOTE(n) * mul; const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 5; vg.gain.value = 3; vib.connect(vg); vg.connect(o.frequency); const og = ac.createGain(); og.gain.value = k; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.2); vib.start(t); vib.stop(t + dur + 0.2); }
  }
  function timp(t, f, k, dest) { tone(t, 'sine', f * 1.4, 0.9, k, dest, 0.003, f); noise(t, 0.12, 'lowpass', 400, 0.7, k * 0.5, dest); }
  function scheduleTitle(t) {
    const b = titleBar % 8;
    strings(t, CHORDS[b], TBAR * 1.05, 0.7); choir(t, CHORDS[b], TBAR * 1.05);
    // the horn comes in on the second half of the first time round
    if (titleBar >= 4) { let at = 0; for (const [n, beats] of TUNE[b]) { horn(t + at * TB, n, beats * TB); at += beats; } }
    if (b === 0 || b === 4) timp(t, 73.4, 0.8, layers.title);
    if (b === 7) for (let i = 0; i < 6; i++) timp(t + TB * 2.5 + i * 0.12, 73.4, 0.2 + i * 0.08, layers.title);
  }
  function schedule() {
    if (!ac) return;
    for (const k of ['combat', 'fury']) mix[k] += (target[k] - mix[k]) * (k === 'fury' && target.fury === 0 ? 0.05 : 0.08);
    mix.title += (target.title - mix.title) * 0.04;
    const t = now(), explore = (1 - mix.combat) * (1 - mix.fury) * (1 - mix.title);
    layers.title.gain.setTargetAtTime(0.9 * mix.title, t, 0.2);
    if (titleOn) { if (titleT < t) titleT = t + 0.1; while (titleT < t + 0.3) { scheduleTitle(titleT); titleT += TBAR; titleBar++; } }
    layers.explore.gain.setTargetAtTime(0.8 * explore, t, 0.3);
    layers.combat.gain.setTargetAtTime(0.9 * mix.combat * (1 - mix.fury), t, 0.15);
    layers.fury.gain.setTargetAtTime(1.0 * mix.fury, t, 0.08);
    if (nextT < t) nextT = t + 0.05;
    while (nextT < t + 0.25) {
      const s = step % 12, bar = Math.floor(step / 12);
      if (s % 3 === 0 && Math.random() < 0.45) { const f = PENT[Math.floor(Math.random() * PENT.length)] * (Math.random() < 0.3 ? 0.5 : 1); tone(nextT, 'triangle', f, 1.6, 0.18, layers.explore, 0.005); tone(nextT, 'triangle', f, 1.6, 0.06 * explore, verb, 0.005); }
      if ([0, 3, 6, 7, 9].includes(s)) drum(nextT, s === 0 || s === 6 ? 48 : 70, s === 0 ? 0.9 : 0.5, layers.combat);
      if (s % 2 === 1) noise(nextT, 0.04, 'highpass', 6000, 0.7, 0.12, layers.combat);
      const fig = [73.4, 73.4, 87.3, 73.4, 82.4, 73.4, 73.4, 73.4, 87.3, 98, 87.3, 82.4], bass = fig[s] * (bar % 4 === 3 ? 1.122 : 1);
      { const o = tone(nextT, 'sawtooth', bass, EIGHTH * 0.9, 0.22, layers.combat, 0.01); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; o.o.disconnect(); o.o.connect(lp); lp.connect(o.g); }
      nextT += EIGHTH; step++;
    }
    // The metal only plays while it can be heard.
    if (mix.fury > 0.02) {
      if (metalT < t) metalT = t + 0.02;
      while (metalT < t + 0.2) { scheduleMetal(metalT); metalT += SIXT; metalStep++; }
    }
  }

  return {
    play(name, o) { if (!ac || !on) return; try { SFX[name]?.(o); } catch (e) { console.warn('sound', name, e); } },
    update({ combat, fury }) { target.combat = combat ? 1 : 0; target.fury = fury ? 1 : 0; },
    // The title theme: on while the title shows, faded out when a game starts.
    title(v) { start(); if (v && !titleOn) { titleOn = true; titleBar = 0; titleT = 0; mix.title = 1; } if (!v) titleOn = false; target.title = v ? 1 : 0; },
    setOn(v) { on = v; if (master) master.gain.setTargetAtTime(v ? 0.8 : 0, ac.currentTime, 0.05); },
    get on() { return on; },
  };
})();
