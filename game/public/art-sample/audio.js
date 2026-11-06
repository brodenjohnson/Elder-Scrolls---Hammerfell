/* =====================================================================
   The sample's sound: everything is synthesised in the browser (Web Audio), so there
   are no files. Music in the spirit of a Nordic score (our own, not Skyrim's): a low
   drone and plucked strings while exploring, war drums and a string ostinato in a
   fight, a choir-like pad in Fury. Effects: swings, hits, clangs, gore, bash, a roar.
   The roar is a synthesised yell; a recorded voice would replace it in the game.
   ===================================================================== */
window.HFA = (() => {
  let ac = null, master, musicBus, sfxBus, verb, noiseBuf, on = true;
  const layers = {};
  const mix = { combat: 0, fury: 0, explore: 1 };
  const target = { combat: 0, fury: 0 };
  function start() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = on ? 0.8 : 0; master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = 0.32; musicBus.connect(comp);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.85; sfxBus.connect(comp);
    // A hall: a convolver with a decaying noise tail.
    verb = ac.createConvolver(); const len = ac.sampleRate * 2.6, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir; const vg = ac.createGain(); vg.gain.value = 0.5; verb.connect(vg); vg.connect(comp);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    for (const k of ['explore', 'combat', 'fury']) { layers[k] = ac.createGain(); layers[k].gain.value = 0; layers[k].connect(musicBus); }
    drone(); setInterval(schedule, 60);
  }
  addEventListener('keydown', start, { once: false }); addEventListener('pointerdown', start);

  // ---------- small builders ----------
  const t0 = () => ac.currentTime;
  function env(g, t, a, peak, d, end = 0.0001) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d); }
  function noise(t, dur, filt, freq, q, peak, dest = sfxBus, a = 0.004) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = filt; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); env(g, t, a, peak, dur); s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + a + dur + 0.05); return { s, f, g };
  }
  function tone(t, type, freq, dur, peak, dest = sfxBus, a = 0.004, glideTo) {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const g = ac.createGain(); env(g, t, a, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + dur + 0.05); return { o, g };
  }

  // ---------- effects ----------
  const SFX = {
    swing(o = {}) { const t = t0(), n = noise(t, o.heavy ? 0.22 : 0.13, 'bandpass', 700, 1.2, o.heavy ? 0.5 : 0.35); n.f.frequency.exponentialRampToValueAtTime(o.heavy ? 1800 : 3200, t + 0.12); },
    hit(o = {}) { const t = t0(); tone(t, 'sine', o.heavy ? 95 : 130, o.heavy ? 0.25 : 0.14, 0.9, sfxBus, 0.002, 40); noise(t, 0.08, 'lowpass', 1800, 0.7, 0.6); noise(t + 0.01, 0.16, 'bandpass', 420, 2, 0.35); },
    crit() { const t = t0(); tone(t, 'square', 1400, 0.08, 0.12); SFX.hit({ heavy: true }); },
    gore() { const t = t0(); for (let i = 0; i < 3; i++) { const n = noise(t + i * 0.04, 0.12, 'lowpass', 500 + Math.random() * 400, 4, 0.45); n.f.frequency.exponentialRampToValueAtTime(150, t + i * 0.04 + 0.12); } tone(t, 'sine', 70, 0.3, 0.6, sfxBus, 0.002, 35); },
    block() { const t = t0(); for (const [f, p] of [[820, 0.25], [1265, 0.18], [2110, 0.12], [3350, 0.06]]) tone(t, 'triangle', f * (0.98 + Math.random() * 0.04), 0.35, p, sfxBus, 0.001); noise(t, 0.05, 'highpass', 3000, 0.7, 0.4); },
    shieldBlock() { const t = t0(); tone(t, 'sine', 110, 0.2, 0.7, sfxBus, 0.002, 60); noise(t, 0.12, 'bandpass', 900, 1.5, 0.5); },
    parry() { SFX.block(); const t = t0(); tone(t + 0.02, 'triangle', 1660, 0.6, 0.2, verb, 0.001); },
    bash() { const t = t0(); tone(t, 'sine', 80, 0.2, 1, sfxBus, 0.002, 45); noise(t, 0.1, 'lowpass', 900, 1, 0.7); },
    dodge() { const t = t0(), n = noise(t, 0.16, 'bandpass', 500, 0.8, 0.25); n.f.frequency.exponentialRampToValueAtTime(1500, t + 0.15); },
    roll() { const t = t0(); noise(t, 0.35, 'lowpass', 400, 0.7, 0.35); tone(t + 0.28, 'sine', 90, 0.1, 0.4, sfxBus, 0.002, 50); },
    pickup() { const t = t0(); tone(t, 'triangle', 1320, 0.12, 0.12); tone(t + 0.06, 'triangle', 1980, 0.15, 0.08); },
    death() { const t = t0(); tone(t, 'sawtooth', 160, 0.5, 0.08, sfxBus, 0.02, 90); },
    // A war cry: a buzzing voice gliding up then down, shaped by "ah" formants, distorted, in the hall.
    roar() {
      const t = t0(), dur = 1.4, voice = ac.createGain(); env(voice, t, 0.08, 0.9, dur - 0.1);
      const shaper = ac.createWaveShaper(), curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = (i / 512) - 1; curve[i] = Math.tanh(x * 3); } shaper.curve = curve;
      const out = ac.createGain(); out.gain.value = 0.55; shaper.connect(out); out.connect(sfxBus); out.connect(verb);
      for (const [f, q, g] of [[720, 6, 1], [1180, 7, 0.7], [2550, 9, 0.35], [320, 3, 0.5]]) { const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = ac.createGain(); bg.gain.value = g; voice.connect(b); b.connect(bg); bg.connect(shaper); }
      for (const [mul, type] of [[1, 'sawtooth'], [1.01, 'sawtooth'], [0.5, 'square']]) {
        const o = ac.createOscillator(); o.type = type;
        o.frequency.setValueAtTime(105 * mul, t); o.frequency.linearRampToValueAtTime(150 * mul, t + 0.35); o.frequency.linearRampToValueAtTime(140 * mul, t + 0.9); o.frequency.linearRampToValueAtTime(95 * mul, t + dur);
        const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 7; vg.gain.value = 4 * mul; vib.connect(vg); vg.connect(o.frequency); vib.start(t); vib.stop(t + dur + 0.1);
        o.connect(voice); o.start(t); o.stop(t + dur + 0.1);
      }
      const br = noise(t, dur, 'bandpass', 1400, 0.8, 0.35, voice, 0.05);
      // and a low boom under it
      tone(t, 'sine', 55, 1.2, 1, sfxBus, 0.005, 30); noise(t, 0.6, 'lowpass', 200, 0.7, 0.8);
      return br;
    },
    discover() { const t = t0(); for (const [f, d] of [[146.8, 0], [220, 0.02], [293.7, 0.04], [349.2, 0.3]]) { const o = tone(t + d, 'sawtooth', f, 2.4, 0.06, verb, 0.6); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; o.o.disconnect(); o.o.connect(lp); lp.connect(o.g); } },
    level() { const t = t0(); for (const [f, d] of [[293.7, 0], [370, 0.15], [440, 0.3], [587.3, 0.45]]) tone(t + d, 'triangle', f, 1.4, 0.12, verb, 0.02); },
    finisher() { SFX.hit({ heavy: true }); const t = t0(); tone(t, 'sine', 45, 0.8, 0.9, sfxBus, 0.003, 28); noise(t, 0.4, 'lowpass', 300, 0.7, 0.6, verb); },
  };

  // ---------- music ----------
  // D minor, about 92 beats a minute, in bars of six eighths.
  const BPM = 92, EIGHTH = 60 / BPM / 2, PENT = [293.7, 349.2, 392, 440, 523.3, 587.3, 698.5];
  let nextT = 0, step = 0;
  function drone() {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 2; const g = ac.createGain(); g.gain.value = 0.35; lp.connect(g); g.connect(musicBus);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 120; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    for (const f of [73.4, 110, 73.4 * 1.003]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
    // the choir: an "ah" on a D minor chord, faded in by Fury
    const voice = ac.createGain(); voice.gain.value = 0.25;
    for (const [f, q] of [[730, 8], [1090, 9], [2440, 10]]) { const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; voice.connect(b); b.connect(layers.fury); b.connect(verb); }
    for (const f of [146.8, 174.6, 220, 293.7]) for (const d of [0.997, 1.004]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * d; const v = ac.createOscillator(), vg = ac.createGain(); v.frequency.value = 5 + Math.random(); vg.gain.value = 2; v.connect(vg); vg.connect(o.frequency); v.start(); o.connect(voice); o.start(); }
  }
  function drum(t, freq, peak, dest) { tone(t, 'sine', freq * 2.2, 0.35, peak, dest, 0.002, freq); noise(t, 0.05, 'lowpass', 900, 0.7, peak * 0.4, dest); }
  function schedule() {
    if (!ac) return;
    // ease the mix towards where the game is
    for (const k of ['combat', 'fury']) mix[k] += (target[k] - mix[k]) * 0.06;
    mix.explore = 1 - mix.combat;
    const now = t0();
    layers.explore.gain.setTargetAtTime(0.8 * mix.explore, now, 0.3);
    layers.combat.gain.setTargetAtTime(0.9 * mix.combat, now, 0.3);
    layers.fury.gain.setTargetAtTime(0.35 * mix.fury, now, 0.4);
    if (nextT < now) nextT = now + 0.05;
    while (nextT < now + 0.25) {
      const s = step % 12, bar = Math.floor(step / 12);
      // exploring: a plucked note now and then, in the hall
      if (s % 3 === 0 && Math.random() < 0.45) { const f = PENT[Math.floor(Math.random() * PENT.length)] * (Math.random() < 0.3 ? 0.5 : 1); tone(nextT, 'triangle', f, 1.6, 0.18, layers.explore, 0.005); tone(nextT, 'triangle', f, 1.6, 0.08, verb, 0.005); }
      // fighting: war drums in 6/8, and a low string figure
      if ([0, 3, 6, 7, 9].includes(s)) drum(nextT, s === 0 || s === 6 ? 48 : 70, s === 0 ? 0.9 : 0.5, layers.combat);
      if (s % 2 === 1) noise(nextT, 0.04, 'highpass', 6000, 0.7, 0.12, layers.combat);
      const fig = [73.4, 73.4, 87.3, 73.4, 82.4, 73.4, 73.4, 73.4, 87.3, 98, 87.3, 82.4], bass = fig[s] * (bar % 4 === 3 ? 1.122 : 1);
      { const o = tone(nextT, 'sawtooth', bass, EIGHTH * 0.9, 0.22, layers.combat, 0.01); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; o.o.disconnect(); o.o.connect(lp); lp.connect(o.g); }
      // in Fury the drums double
      if (mix.fury > 0.2 && s % 2 === 0) drum(nextT, 40, 0.6 * mix.fury, layers.fury);
      nextT += EIGHTH; step++;
    }
  }

  return {
    play(name, o) { if (!ac || !on) return; try { SFX[name]?.(o); } catch { /* sound is a nicety */ } },
    update({ combat, fury }) { target.combat = combat ? 1 : 0; target.fury = fury ? 1 : 0; },
    setOn(v) { on = v; if (master) master.gain.setTargetAtTime(v ? 0.8 : 0, ac.currentTime, 0.05); },
    get on() { return on; },
  };
})();
