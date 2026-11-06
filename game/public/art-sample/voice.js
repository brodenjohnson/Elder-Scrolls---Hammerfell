/* =====================================================================
   Voices for the sample: bandits who taunt, swear and react to what you do to their
   mates, and Kasim's few, flat words (the Punisher, bible 1). The lines are data (as they
   would be in the game). They are spoken here by the browser's own text-to-speech, which
   is robotic; the game would play recorded AI voice lines instead, generated from the same
   lines (see the design bible, voice pipeline).
   ===================================================================== */
window.HFV = (() => {
  const synth = window.speechSynthesis;
  let on = true, voices = [];
  const load = () => { voices = synth ? synth.getVoices().filter((v) => /^en/i.test(v.lang)) : []; };
  if (synth) { load(); synth.onvoiceschanged = load; }

  // {name}: the man the line is about. Priority 3 lines interrupt anything.
  const BANDIT = {
    spot: ['Oi! We have company!', 'Who the fuck are you?', 'Farmer took a wrong turn. Let us show him the way out.', 'Kill him! Kill the bastard!', 'Another hero. Gut him.'],
    attack: ['Die!', 'Come here, you!', 'Hold still!', 'Bleed, you bastard!', 'Got you now!', 'Hah!'],
    hurt: ['Argh! Fuck!', 'You will pay for that!', 'Bastard!', 'Shit! Shit!'],
    scared: ['Gods, he is a devil!', 'I am not dying for salt money!', 'Back off! Back off!'],
    taunt: ['You are done, farmer.', 'Look at him bleed!', 'Lie down and die!', 'Not so tough now, are you?'],
    allyHead: ['You motherfucker! You cut off {name}\'s head!', '{name}! Oh gods, his head!', 'He took {name}\'s fucking head off!'],
    allyArm: ['His arm! You took his fucking arm!', '{name}! Your arm!'],
    allyCrushed: ['You caved his skull in!', '{name}... there is nothing left of his face!'],
    allyThroat: ['He opened {name}\'s throat!', '{name} is choking on it!'],
    allyDeath: ['{name}! No!', 'You will hang for {name}!', 'That is {name} dead. You are next.', 'Bastard killed {name}!'],
    fury: ['What the fuck is he?', 'He has gone mad! Watch out!', 'Stay back from him!'],
    disarmed: ['My blade!', 'Shit, my sword!'],
    victory: ['Hah! Farmer is dead.', 'Strip him. Check his boots.'],
  };
  const CHIEF = {
    spot: ['Kill him! Fifty septims for his head!', 'You walked into the wrong camp, farmer.'],
    hurt: ['Is that all?', 'You will die slow for that.'],
    allyDeath: ['Useless. All of you.', 'Then I will do it myself!'],
  };
  const KASIM = {
    spot: ['Bandits.', 'Get it over with.'],
    kill: ['Next.', 'Stay down.', 'One less.'],
    finisher: ['Should have run.', 'Quiet now.', 'That is for the road.'],
    low: ['Not yet.', 'Not like this.'],
    clear: ['Quiet. Good.'],
    note: ['Hegathe.'],
  };
  const PRIO = { allyHead: 3, allyArm: 3, allyCrushed: 3, allyThroat: 3, allyDeath: 2, fury: 3, spot: 2, victory: 3, disarmed: 2, scared: 2, taunt: 1, hurt: 1, attack: 0, kill: 1, finisher: 2, low: 2, clear: 1, note: 2, chat: 0 };
  // Idle talk round the fire, before they have seen you.
  const CHAT = [
    ['Saltmaker is late again.', 'He is always late. Pays, though.'],
    ['What if the Crown comes up this road?', 'Then we go in the sea with the rest of them.'],
    ['Smell that? Rain is coming.', 'That is you, Fenn.'],
    ['Who keeps eating the bread?', 'Nobody. Shut up.'],
  ];

  const bubbles = [], last = {};
  let busyUntil = 0, chatAt = performance.now() + 4000, chatIdx = 0;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function speak(f, text, prio) {
    const now = performance.now();
    if (prio < 3 && now < busyUntil) return false;
    if (prio < 2 && now - (last[f.vid] || 0) < 4000) return false;
    last[f.vid] = now; busyUntil = now + 900 + text.length * 55;
    for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].f === f) bubbles.splice(i, 1);
    bubbles.push({ f, text, until: now + 1800 + text.length * 55 });
    if (on && synth && voices.length) {
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
      if (!f) return;
      const set = f.person === 'kasim' ? KASIM : (f.chief && CHIEF[kind]) || BANDIT;
      const lines = f.person === 'kasim' ? set[kind] : set[kind] || BANDIT[kind];
      if (!lines) return;
      speak(f, pick(lines).replace(/\{(\w+)\}/g, (m, k) => ctx[k] ?? m), PRIO[kind] ?? 1);
    },
    // Two men by the fire trade a line each, now and then.
    chat(a, b) {
      const now = performance.now();
      if (now < chatAt || !a || !b) return;
      const [x, y] = CHAT[chatIdx++ % CHAT.length];
      if (speak(a, x, 0)) setTimeout(() => speak(b, y, 0), 900 + x.length * 55);
      chatAt = now + 9000;
    },
    setOn(v) { on = v; if (!v && synth) synth.cancel(); },
    get on() { return on; },
    get available() { return !!(synth && voices.length); },
  };
})();
