/* =====================================================================
   The sample's interface: Skyrim's functions in our own look (design bible 13).
   HUD: compass, enemy bar, notifications, activate prompt, Rage, Health and Stamina.
   Menus: Tab opens the four-way hub (Skills, Items, Map, Journal); I, P and M open
   Items, Skills and Map directly; Esc opens the Journal (and its System tab); E searches
   bodies and opens containers. The game is paused while a menu is open.
   ===================================================================== */
addEventListener('hf-ready', () => {
  const HF = window.HF, S = HF.state, $ = (s) => document.querySelector(s);
  const stage = $('#stage'), hud = $('#hud'), menu = $('#menu');
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const key = (k) => `<span class="kc">${k}</span>`;

  // ---------- HUD ----------
  hud.innerHTML = `
    <div id="compass"><div class="ticks"></div><div class="marks"></div><div class="centre"></div></div>
    <div id="foe"><div class="name"></div><div class="bar"><i></i></div></div>
    <div id="banner"><div class="small"></div><div class="big"></div><div class="sub"></div></div>
    <div id="notes"></div>
    <div id="prompt"></div>
    <div id="bars"><div class="b rage"><i></i></div><div class="b hp"><i></i></div><div class="b st"><i></i></div></div>
    <div id="fury">FURY</div>`;
  const notes = $('#notes');
  function note(text, kind) {
    const d = document.createElement('div'); d.className = `n ${kind}`; d.textContent = text; notes.prepend(d);
    while (notes.children.length > 6) notes.lastChild.remove();
    setTimeout(() => d.classList.add('out'), 3800); setTimeout(() => d.remove(), 4600);
  }
  let bannerT = 0;
  function banner(small, big, sub) {
    $('#banner .small').textContent = small; $('#banner .big').textContent = big; $('#banner .sub').textContent = sub || '';
    $('#banner').classList.add('on'); bannerT = performance.now();
  }
  // The compass: the heading he last moved in is at the centre; letters and marks slide past.
  const wrap = (a) => ((a + 540) % 360) - 180;
  function compass() {
    const pl = HF.pl, h = (pl.heading * 180) / Math.PI;
    const ticks = [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]];
    $('#compass .ticks').innerHTML = ticks.map(([t, a]) => { const o = wrap(a - h); return Math.abs(o) < 95 ? `<span class="${t.length > 1 ? 'minor' : ''}" style="left:${50 + (o / 95) * 50}%">${t}</span>` : ''; }).join('');
    const marks = [];
    const bearing = (x, y) => (Math.atan2(x - pl.x, -(y - pl.y)) * 180) / Math.PI;
    const add = (x, y, cls) => { const o = wrap(bearing(x, y) - h); if (Math.abs(o) < 95) marks.push(`<i class="${cls}" style="left:${50 + (o / 95) * 50}%"></i>`); };
    if (!S.discovered) add(HF.world.camp.x, HF.world.camp.y, 'place');
    if (!S.quest.done) { const c = HF.containers().find((x) => x.id === 'chiefChest'); const chief = HF.foes.find((f) => f.chief); if (!S.quest.chief && chief) add(chief.x, chief.y, 'quest'); else if (!S.quest.chest) add(c.x, c.y, 'quest'); }
    for (const e of HF.foes) if (e.aggro && !e.dead) add(e.x, e.y, 'foe');
    $('#compass .marks').innerHTML = marks.join('');
  }
  function bars() {
    const pl = HF.pl, fighting = HF.inCombat();
    const set = (sel, frac, show) => { const b = $(sel); b.querySelector('i').style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`; b.classList.toggle('on', show); };
    set('#bars .hp', pl.hp / pl.maxHp, fighting || pl.hp < pl.maxHp - 0.5);
    set('#bars .st', S.stamina / 100, fighting || S.stamina < 99.5);
    set('#bars .rage', S.rage / 100, fighting || S.rage > 0.5);
    $('#bars .rage').classList.toggle('ready', S.rage >= 60);
    $('#fury').classList.toggle('on', S.fury > 0);
    const t = HF.target();
    $('#foe').classList.toggle('on', !!t);
    if (t) { $('#foe .name').textContent = t.name; $('#foe .bar i').style.width = `${Math.max(0, t.hp / t.maxHp) * 100}%`; }
    const a = !menuOpen && HF.activatable();
    const p = $('#prompt');
    if (a) { const box = a.ref.loot || a.ref, empty = !box.gold && !Object.keys(box.items).length; p.innerHTML = `${key('E')} ${a.verb} <b>${esc(a.name)}</b>${empty ? ' <span class="dim">(Empty)</span>' : ''}`; p.classList.add('on'); }
    else p.classList.remove('on');
  }
  function hudLoop() {
    for (const ev of S.events.splice(0)) {
      if (ev.kind === 'discover') banner('Discovered', ev.text, 'Bandit camp');
      else if (ev.kind === 'level') { banner('', ev.text.toUpperCase(), ''); note(ev.text, ev.kind); }
      else if (ev.kind === 'quest' && /^Quest complete/.test(ev.text)) banner('Quest completed', 'Bandits on the Coast Road', '');
      else note(ev.text, ev.kind);
    }
    if (bannerT && performance.now() - bannerT > 3200) { $('#banner').classList.remove('on'); bannerT = 0; }
    compass(); bars();
    if (menuOpen === 'items' || menuOpen === 'loot') refreshFooter();
    requestAnimationFrame(hudLoop);
  }

  // ---------- menus ----------
  let menuOpen = null, sel = 0, cat = 'all', lootRef = null, skillSel = 'OneHanded', journalTab = 'quests';
  function open(which, ref) {
    menuOpen = which; S.paused = true; HF.keys.clear(); sel = 0; if (ref) lootRef = ref;
    menu.className = `on ${which}`; stage.classList.add('menu-open'); render();
  }
  function close() { menuOpen = null; S.paused = false; menu.className = ''; menu.innerHTML = ''; stage.classList.remove('menu-open'); }

  const CATS = [['all', 'All'], ['weapon', 'Weapons'], ['apparel', 'Apparel'], ['potion', 'Potions'], ['food', 'Food'], ['misc', 'Misc']];
  const isEquipped = (e) => Object.values(HF.pl.eq).includes(e);
  function rows(src, c) {
    const list = Object.entries(src).filter(([e, n]) => n > 0 && HF.ITEMS[e] && (c === 'all' || HF.ITEMS[e].cat === c));
    const order = { weapon: 0, apparel: 1, potion: 2, food: 3, misc: 4 };
    return list.sort(([a], [b]) => (order[HF.ITEMS[a].cat] - order[HF.ITEMS[b].cat]) || (isEquipped(b) - isEquipped(a)) || HF.ITEMS[a].name.localeCompare(HF.ITEMS[b].name));
  }
  function itemCard(edid) {
    if (!edid) return '<div class="card empty"></div>';
    const it = HF.ITEMS[edid], stat = [];
    if (it.cat === 'weapon') stat.push(['Damage', it.damage], ['Speed', it.speed], ['Reach', it.reach]);
    if (it.cat === 'apparel') stat.push(['Armour', it.rating], ['Type', it.armourType === 'Clothing' ? 'Clothing' : `${it.armourType} armour`]);
    stat.push(['Weight', it.weight], ['Value', it.value]);
    const kind = it.cat === 'weapon' ? `${it.hands === 2 ? 'Two-handed' : 'One-handed'} ${it.shape}` : it.cat === 'apparel' ? (it.slot === 'body' ? 'Body' : it.slot === 'shield' ? 'Shield' : it.slot[0].toUpperCase() + it.slot.slice(1)) : it.cat[0].toUpperCase() + it.cat.slice(1);
    return `<div class="card"><canvas class="icon" data-icon="${edid}"></canvas><h3>${esc(it.name)}</h3><div class="kind">${esc(kind)}</div>
      <div class="stats">${stat.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>${it.desc ? `<p class="desc">${esc(it.desc)}</p>` : ''}</div>`;
  }
  function paintIcons() {
    for (const c of menu.querySelectorAll('canvas[data-icon]')) {
      const src = HF.icon(c.dataset.icon), k = Math.max(2, Math.min(6, Math.floor(Math.min(260 / src.width, 170 / src.height))));
      c.width = src.width * k; c.height = src.height * k; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, c.width, c.height);
    }
  }
  function refreshFooter() {
    const f = menu.querySelector('.footer'); if (!f) return;
    f.innerHTML = `<span>Armour <b>${Math.round(HF.armourRating())}</b></span><span>Weight <b>${HF.carried().toFixed(1)}/300</b></span><span>Gold <b>${S.gold}</b></span><span>Health <b>${Math.round(HF.pl.hp)}/${HF.pl.maxHp}</b></span>`;
  }
  function render() {
    if (menuOpen === 'hub') {
      menu.innerHTML = `<div class="hub">
        <button class="dir up" data-go="skills">Skills</button>
        <button class="dir left" data-go="items">Items</button>
        <div class="seal">${esc(HF.SKILL_NAMES ? 'Kasim' : '')}<small>Level ${S.level}</small></div>
        <button class="dir right" data-go="journal">Journal</button>
        <button class="dir down" data-go="map">Map</button>
        <div class="hint">${key('W')}${key('A')}${key('S')}${key('D')} or click &middot; ${key('Tab')} close</div></div>`;
      return;
    }
    if (menuOpen === 'items' || menuOpen === 'loot') {
      const loot = menuOpen === 'loot', box = loot ? lootRef.loot || lootRef : null;
      const src = loot ? { ...box.items, ...(box.gold ? { Gold: 1 } : {}) } : S.inv;
      const list = loot ? Object.entries(src).filter(([, n]) => n > 0) : rows(src, cat);
      sel = Math.max(0, Math.min(sel, list.length - 1));
      const name = (e, n) => (e === 'Gold' ? `${box.gold} Gold` : `${HF.ITEMS[e].name}${n > 1 ? ` (${n})` : ''}`);
      const listHtml = list.length ? list.map(([e, n], i) => `<div class="row ${i === sel ? 'sel' : ''} ${!loot && isEquipped(e) ? 'eq' : ''}" data-i="${i}"><span>${esc(name(e, n))}</span>${!loot && isEquipped(e) ? '<em>equipped</em>' : ''}</div>`).join('') : `<div class="none">${loot ? 'Empty' : 'Nothing here'}</div>`;
      const cur = list[sel]?.[0];
      menu.innerHTML = `<div class="items">
        ${loot ? `<div class="cats"><h2>${esc(lootRef.name)}</h2><p class="dim">${lootRef.loot ? 'A body' : 'A container'}</p></div>` : `<div class="cats"><h2>Items</h2>${CATS.map(([k, n]) => `<div class="cat ${k === cat ? 'sel' : ''}" data-cat="${k}">${n}</div>`).join('')}</div>`}
        <div class="list">${listHtml}</div>
        ${cur === 'Gold' ? `<div class="card"><canvas class="icon" data-icon="Gold"></canvas><h3>${box.gold} Gold</h3></div>` : itemCard(cur)}
        <div class="keys">${loot ? `${key('E')} Take &middot; ${key('R')} Take all &middot; ${key('Tab')} Close` : `${key('E')} ${cur && ['weapon', 'apparel'].includes(HF.ITEMS[cur]?.cat) ? (isEquipped(cur) ? 'Unequip' : 'Equip') : 'Use'} &middot; ${key('R')} Drop &middot; ${key('A')}${key('D')} Category &middot; ${key('Tab')} Back`}</div>
        <div class="footer"></div></div>`;
      paintIcons(); refreshFooter();
      menu.querySelector('.row.sel')?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (menuOpen === 'skills') {
      const sk = S.skills, perks = HF.PERKS.filter((p) => p.skill === skillSel);
      const first = perks.filter((p) => !perks.some((q) => q.nextPerk === p.edid)); // the first rank of each perk
      const toLvl = 75 + S.level * 25;
      menu.innerHTML = `<div class="skills">
        <div class="lvl"><b>Level ${S.level}</b><div class="bar"><i style="width:${(S.xp / toLvl) * 100}%"></i></div><span>Perks to spend: ${S.perkPoints}</span></div>
        <div class="trees">${Object.keys(HF.SKILL_NAMES).map((k) => `<div class="tree ${k === skillSel ? 'sel' : ''}" data-skill="${k}"><div class="lv">${sk[k].level}</div><div class="nm">${HF.SKILL_NAMES[k]}</div><div class="bar"><i style="width:${(sk[k].xp / HF.toNext(sk[k])) * 100}%"></i></div></div>`).join('')}</div>
        <div class="perks"><h2>${HF.SKILL_NAMES[skillSel]}</h2>${first.sort((a, b) => (a.skillReq[0]?.level || 0) - (b.skillReq[0]?.level || 0)).map((p) => {
          let ranks = 1; for (let q = p; q.nextPerk && perks.find((x) => x.edid === q.nextPerk); q = perks.find((x) => x.edid === q.nextPerk)) ranks++;
          const req = p.skillReq[0]?.level || 0, can = sk[skillSel].level >= req;
          return `<div class="perk ${can ? 'open' : ''}"><div class="pn">${esc(p.name)}${ranks > 1 ? ` <span class="dim">(${ranks} ranks)</span>` : ''}</div><div class="pd">${esc(p.description)}</div><div class="pr">${req ? `${HF.SKILL_NAMES[skillSel]} ${req}` : 'Any level'}</div></div>`;
        }).join('')}</div>
        <div class="keys">${key('A')}${key('D')} Skill &middot; ${key('Tab')} Back &middot; Perks are shown, not taken, in this sample.</div></div>`;
      return;
    }
    if (menuOpen === 'map') {
      menu.innerHTML = `<div class="map"><h2>Sentinel Coast <span class="dim">&middot; Coast Road</span></h2><div class="sheet"><canvas id="mapc"></canvas><div class="pins"></div></div>
        <div class="keys">${key('Tab')} Back &middot; Fast travel and the wider coast come with the region.</div></div>`;
      const c = $('#mapc'), m = HF.mapCanvas(); c.width = m.width; c.height = m.height; c.getContext('2d').drawImage(m, 0, 0);
      const pl = HF.pl, P = (x, y) => `left:${(x / HF.world.W) * 100}%;top:${(y / HF.world.H) * 100}%`;
      const chest = HF.containers().find((x) => x.id === 'chiefChest'), chief = HF.foes.find((f) => f.chief);
      $('.map .pins').innerHTML = `<div class="pin place" style="${P(HF.world.camp.x, HF.world.camp.y - 40)}"><span>${S.discovered ? 'Coast Road Camp' : '?'}</span></div>
        <div class="pin you" style="${P(pl.x, pl.y)};transform:translate(-50%,-50%) rotate(${(pl.heading * 180) / Math.PI}deg)"></div>
        ${!S.quest.done ? `<div class="pin quest" style="${!S.quest.chief ? P(chief.x, chief.y) : P(chest.x, chest.y)}"></div>` : ''}
        <div class="pin road" style="${P(70, 360)}"><span>to the coast road</span></div>`;
      return;
    }
    if (menuOpen === 'journal') {
      const q = S.quest, st = S.stats, tabs = [['quests', 'Quests'], ['stats', 'General Stats'], ['system', 'System']];
      const body = journalTab === 'quests' ? `<div class="quest"><h3>${q.done ? 'Completed: ' : ''}Bandits on the Coast Road</h3>
          <p>The coast road has been shut by bandits for a month. Their camp is on the rise above the track. Whoever pays them, it is not the Crown.</p>
          <ul><li class="${S.discovered ? 'done' : ''}">Find the bandit camp</li><li class="${q.chief ? 'done' : ''}">Kill the bandit chief</li><li class="${q.chest ? 'done' : ''}">Search the chief's chest</li></ul></div>`
        : journalTab === 'stats' ? `<div class="statlist">${[['Level', S.level], ['Bandits killed', st.kills], ['Finishers', st.finishers], ['Limbs and heads taken', st.severed], ['Blows blocked', st.blocks], ['Parries', st.parries], ['Items looted', st.looted], ['Gold found', st.gold], ['Gold carried', S.gold]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`
        : `<div class="system">
          <button data-sys="resume">Resume</button>
          <button data-sys="reset">Reset the camp</button>
          <div class="opt"><span>Gore</span>${['full', 'some', 'off'].map((g) => `<button data-gore="${g}" class="${HF.settings.gore === g ? 'on' : ''}">${{ full: 'Full', some: 'Blood only', off: 'Off' }[g]}</button>`).join('')}</div>
          <div class="opt"><span>Light</span>${['dusk', 'day'].map((l) => `<button data-light="${l}" class="${HF.settings.light === l ? 'on' : ''}">${l === 'dusk' ? 'Dusk' : 'Day'}</button>`).join('')}</div>
          <div class="help"><b>Controls</b><br>WASD move, Shift run &middot; left click or J attack, hold for a power attack &middot; right click or K block (a tap just before a blow parries) &middot; Space dodge &middot; F finisher &middot; Q Fury (60 Rage) &middot; E search or open &middot; Tab menu &middot; I items &middot; P skills &middot; M map &middot; Esc journal</div></div>`;
      menu.innerHTML = `<div class="journal"><div class="tabs">${tabs.map(([k, n]) => `<div class="tab ${k === journalTab ? 'sel' : ''}" data-tab="${k}">${n}</div>`).join('')}</div><div class="page">${body}</div>
        <div class="keys">${key('A')}${key('D')} Tab &middot; ${key('Esc')} Close</div></div>`;
    }
  }

  // ---------- menu actions ----------
  function curList() {
    if (menuOpen === 'loot') { const box = lootRef.loot || lootRef; return Object.entries({ ...box.items, ...(box.gold ? { Gold: 1 } : {}) }).filter(([, n]) => n > 0); }
    return rows(S.inv, cat);
  }
  function act(kind) {
    const list = curList(), cur = list[sel]?.[0];
    if (menuOpen === 'loot') {
      if (kind === 'take' && cur) HF.lootFrom(lootRef, cur, false);
      if (kind === 'all') { for (const [e] of list) HF.lootFrom(lootRef, e, true); close(); return; }
    } else if (menuOpen === 'items' && cur) {
      if (kind === 'take') HF.useItem(cur);
      if (kind === 'drop') HF.drop(cur);
    }
    render();
  }
  const ORDER = { skills: ['up'], items: ['left'], journal: ['right'], map: ['down'] };
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const k = e.code;
    if (!menuOpen) {
      if (k === 'Tab') { e.preventDefault(); open('hub'); }
      else if (k === 'KeyI') open('items');
      else if (k === 'KeyP') open('skills');
      else if (k === 'KeyM') open('map');
      else if (k === 'Escape') { journalTab = 'quests'; open('journal'); }
      else if (k === 'KeyE') { const a = HF.activatable(); if (a) open('loot', a.ref); }
      else return;
      e.stopPropagation(); return;
    }
    e.preventDefault(); e.stopPropagation();
    if (k === 'Escape') { if (menuOpen === 'journal' || menuOpen === 'loot' || menuOpen === 'hub') close(); else { journalTab = 'system'; open('journal'); } return; }
    if (k === 'Tab') { if (menuOpen === 'hub' || menuOpen === 'loot') close(); else open('hub'); return; }
    if (menuOpen === 'hub') {
      const go = { KeyW: 'skills', ArrowUp: 'skills', KeyA: 'items', ArrowLeft: 'items', KeyD: 'journal', ArrowRight: 'journal', KeyS: 'map', ArrowDown: 'map' }[k];
      if (go) { if (go === 'journal') journalTab = 'quests'; open(go); }
      return;
    }
    if (menuOpen === 'items' || menuOpen === 'loot') {
      const n = curList().length;
      if (k === 'KeyW' || k === 'ArrowUp') sel = Math.max(0, sel - 1);
      else if (k === 'KeyS' || k === 'ArrowDown') sel = Math.min(n - 1, sel + 1);
      else if ((k === 'KeyA' || k === 'ArrowLeft' || k === 'KeyD' || k === 'ArrowRight') && menuOpen === 'items') { const i = CATS.findIndex(([c]) => c === cat), d = k === 'KeyA' || k === 'ArrowLeft' ? -1 : 1; cat = CATS[(i + d + CATS.length) % CATS.length][0]; sel = 0; }
      else if (k === 'KeyE' || k === 'Enter') return act('take');
      else if (k === 'KeyR') return act(menuOpen === 'loot' ? 'all' : 'drop');
      else if (k === 'KeyI' && menuOpen === 'items') return close();
      render(); return;
    }
    if (menuOpen === 'skills') {
      const ks = Object.keys(HF.SKILL_NAMES), i = ks.indexOf(skillSel);
      if (k === 'KeyA' || k === 'ArrowLeft') skillSel = ks[(i + ks.length - 1) % ks.length];
      if (k === 'KeyD' || k === 'ArrowRight') skillSel = ks[(i + 1) % ks.length];
      if (k === 'KeyP') return close();
      render(); return;
    }
    if (menuOpen === 'map' && k === 'KeyM') return close();
    if (menuOpen === 'journal') {
      const t = ['quests', 'stats', 'system'], i = t.indexOf(journalTab);
      if (k === 'KeyA' || k === 'ArrowLeft') journalTab = t[(i + 2) % 3];
      if (k === 'KeyD' || k === 'ArrowRight') journalTab = t[(i + 1) % 3];
      render();
    }
  }, true);
  menu.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go],[data-cat],[data-i],[data-skill],[data-tab],[data-sys],[data-gore],[data-light]'); if (!t) return;
    if (t.dataset.go) { if (t.dataset.go === 'journal') journalTab = 'quests'; return open(t.dataset.go); }
    if (t.dataset.cat) { cat = t.dataset.cat; sel = 0; }
    if (t.dataset.i !== undefined) { const i = +t.dataset.i; if (i === sel) return act('take'); sel = i; }
    if (t.dataset.skill) skillSel = t.dataset.skill;
    if (t.dataset.tab) journalTab = t.dataset.tab;
    if (t.dataset.sys === 'resume') return close();
    if (t.dataset.sys === 'reset') { HF.reset(); return close(); }
    if (t.dataset.gore) HF.settings.gore = t.dataset.gore;
    if (t.dataset.light) HF.settings.light = t.dataset.light;
    render();
  });
  // Buttons on the page outside the game: open a menu.
  document.addEventListener('click', (e) => { const t = e.target.closest('[data-open]'); if (t) { t.blur(); if (t.dataset.open === 'journal') journalTab = 'quests'; open(t.dataset.open); } });

  // ---------- the armoury (on the page, outside the game) ----------
  const lineup = $('#lineup'), lg = lineup.getContext('2d');
  const SETS = Object.keys(HF.SETS), WEAPONS = ['IronSword', 'Scimitar', 'IronWarAxe', 'IronMace', 'IronDagger', 'IronGreatsword', 'IronBattleaxe', 'IronWarhammer'];
  const SHIELDS = [null, 'ArmorHideShield', 'ArmorIronShield', 'ArmorSteelShield', 'ArmorOrcishShield'];
  function drawLineup(now) {
    const cell = 60, rowH = 70, cols = 8;
    if (lineup.width !== cols * cell * 2) { lineup.width = cols * cell * 2; lineup.height = rowH * 4 * 2; }
    lg.setTransform(2, 0, 0, 2, 0, 0); lg.imageSmoothingEnabled = false; lg.fillStyle = '#211c15'; lg.fillRect(0, 0, cols * cell, rowH * 4);
    const pe = HF.pl.eq, at = [0, 1, 2, 1][Math.floor(now / 260) % 4];
    const draw = (eq, anim, i, face, col, row) => { const c = HF.frameFor('kasim', eq, anim, i, face); lg.drawImage(c, col * cell + cell / 2 - 50, row * rowH + rowH - 4 - 84); };
    const frame = (col, row, on) => { if (on) { lg.strokeStyle = '#c9a45a'; lg.lineWidth = 1; lg.strokeRect(col * cell + 1, row * rowH + 1, cell - 2, rowH - 2); } };
    SETS.forEach((s, i) => { const eq = { ...pe, ...HF.SETS[s].pieces }; if (!HF.SETS[s].pieces.head) eq.head = null; if (!HF.SETS[s].pieces.hands) eq.hands = null; draw(eq, 'idle', at, Math.PI, i, 0); draw(eq, 'idle', at, -Math.PI / 2, i, 1); frame(i, 0, pe.body === HF.SETS[s].pieces.body); });
    WEAPONS.forEach((w, i) => { draw({ ...pe, weapon: w }, 'show', 0, -Math.PI / 2, i, 2); frame(i, 2, pe.weapon === w); });
    SHIELDS.forEach((s, i) => { draw({ ...pe, weapon: pe.weapon && HF.ITEMS[pe.weapon].hands === 1 ? pe.weapon : 'IronSword', shield: s }, 'idle', at, Math.PI, i, 3); frame(i, 3, pe.shield === s); });
    lg.fillStyle = '#9b917a'; lg.font = '9px Georgia'; lg.fillText('No shield', 8, rowH * 3 + 12);
    requestAnimationFrame(drawLineup);
  }
  lineup.addEventListener('click', (e) => {
    const r = lineup.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 480, y = ((e.clientY - r.top) / r.height) * 280, col = Math.floor(x / 60), row = Math.floor(y / 70);
    if (row <= 1 && SETS[col]) HF.wearSet(SETS[col]);
    if (row === 2 && WEAPONS[col]) HF.wear(WEAPONS[col]);
    if (row === 3 && col < SHIELDS.length) HF.wear(SHIELDS[col]);
  });

  requestAnimationFrame(hudLoop); requestAnimationFrame(drawLineup);
  window.HFUI = { open, close, get menu() { return menuOpen; } };
});
