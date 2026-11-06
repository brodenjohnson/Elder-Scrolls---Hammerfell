/* =====================================================================
   The interface: Skyrim's functions in our own look (design bible 13).
   HUD: compass with quest and enemy marks, the objective, enemy bar, notifications,
   the activate prompt, Rage, Health and Stamina, speech bubbles, cutscene captions.
   Menus (the game pauses): Tab the four-way hub; I Items; P Skills; M Map (fast travel);
   Esc the Journal (quests, stats, system: save, load, settings); T to wait; E to talk,
   search, open and enter. Conversations, trading, reading notes, the title screen,
   naming him, the content warning, and the screen when he dies.
   ===================================================================== */
import './ui.css';
addEventListener('hf-ready', () => {
  const HF = window.HF, S = HF.state, $ = (s) => document.querySelector(s);
  const stage = $('#stage'), hud = $('#hud'), menu = $('#menu');
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const key = (k) => `<span class="kc">${k}</span>`;
  const voiceOn = () => window.HFV?.on;

  // ---------- HUD ----------
  hud.innerHTML = `
    <div id="compass"><div class="ticks"></div><div class="marks"></div><div class="centre"></div></div>
    <div id="objective"></div>
    <div id="foe"><div class="name"></div><div class="bar"><i></i></div></div>
    <div id="banner"><div class="small"></div><div class="big"></div><div class="sub"></div></div>
    <div id="notes"></div>
    <div id="prompt"></div>
    <div id="bars"><div class="b rage"><i></i></div><div class="b hp"><i></i></div><div class="b st"><i></i></div></div>
    <div id="bubbles"></div>
    <div id="caption"></div><div id="sceneLine"></div><div id="skip">${key('Esc')} skip</div>
    <div id="fury">FURY</div><div id="rage-ready">${key('Q')} RAGE</div>
    <div id="clock"></div>`;
  const notes = $('#notes');
  function note(text, kind) {
    const d = document.createElement('div'); d.className = `n ${kind}`; d.textContent = text; notes.prepend(d);
    while (notes.children.length > 6) notes.lastChild.remove();
    setTimeout(() => d.classList.add('out'), 3800); setTimeout(() => d.remove(), 4600);
  }
  let bannerT = 0;
  function banner(small, big, sub) {
    $('#banner .small').textContent = small || ''; $('#banner .big').textContent = big; $('#banner .sub').textContent = sub || '';
    $('#banner').classList.add('on'); bannerT = performance.now();
  }
  const wrap = (a) => ((a + 540) % 360) - 180;
  function compass() {
    const pl = HF.pl, h = (pl.heading * 180) / Math.PI;
    const ticks = [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]];
    $('#compass .ticks').innerHTML = ticks.map(([t, a]) => { const o = wrap(a - h); return Math.abs(o) < 95 ? `<span class="${t.length > 1 ? 'minor' : ''}" style="left:${50 + (o / 95) * 50}%">${t}</span>` : ''; }).join('');
    const marks = [], bearing = (x, y) => (Math.atan2(x - pl.x, -(y - pl.y)) * 180) / Math.PI;
    const add = (x, y, cls) => { const o = wrap(bearing(x, y) - h); if (Math.abs(o) < 95) marks.push(`<i class="${cls}" style="left:${50 + (o / 95) * 50}%"></i>`); };
    for (const t of HF.questTargets()) if (!t.exit) add(t.x, t.y, 'quest');
    for (const e of HF.foes) if (e.aggro && !e.dead) add(e.x, e.y, 'foe');
    $('#compass .marks').innerHTML = marks.join('');
    const q = HF.questList().find((x) => !x.done && x.main) || HF.questList().find((x) => !x.done);
    const o = q?.objectives.find((x) => x.have < x.need && !x.optional);
    $('#objective').innerHTML = q && o ? `<b>${esc(q.title)}</b> ${esc(o.text)}` : '';
  }
  function bars() {
    const pl = HF.pl, fighting = HF.inCombat();
    const set = (sel, frac, show) => { const b = $(sel); b.querySelector('i').style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`; b.classList.toggle('on', show); };
    set('#bars .hp', pl.hp / pl.maxHp, fighting || pl.hp < pl.maxHp - 0.5);
    set('#bars .st', S.stamina / 100, fighting || S.stamina < 99.5);
    set('#bars .rage', S.rage / 100, fighting || S.rage > 0.5);
    $('#bars .rage').classList.toggle('ready', S.rage >= 60);
    $('#fury').classList.toggle('on', S.fury > 0);
    $('#rage-ready').classList.toggle('on', S.rage >= 60 && S.fury <= 0);
    const t = HF.target();
    $('#foe').classList.toggle('on', !!t);
    if (t) { $('#foe .name').textContent = t.pname || t.name; $('#foe .bar i').style.width = `${Math.max(0, t.hp / t.maxHp) * 100}%`; }
    const a = !menuOpen && !HF.convo && !HF.scene && HF.activatable(), p = $('#prompt');
    if (a) {
      const box = a.ref.loot || a.ref.box, empty = box && !box.gold && !Object.keys(box.items).length;
      p.innerHTML = `${key('E')} ${a.verb} <b>${esc(a.name)}</b>${empty ? ' <span class="dim">(Empty)</span>' : ''}`; p.classList.add('on');
    } else p.classList.remove('on');
    $('#clock').textContent = HF.clock();
  }
  let subtitles = true; try { subtitles = localStorage.getItem('hf.subtitles') !== 'off'; } catch { /* private window */ }
  function bubbles() {
    const B = window.HFV?.bubbles || [], t = performance.now(), el = $('#bubbles');
    if (!subtitles || HF.convo) { el.innerHTML = ''; return; }
    for (let i = B.length - 1; i >= 0; i--) if (B[i].until < t || (B[i].f.dead && B[i].f !== HF.pl)) B.splice(i, 1);
    el.innerHTML = B.map((b) => { const [x, y] = HF.screenOf(b.f.x, b.f.y - 64); return `<div class="bubble ${b.f === HF.pl ? 'you' : ''}" style="left:${x}%;top:${y}%"><b>${esc(b.f.pname || HF.S.name)}</b> ${esc(b.text)}</div>`; }).join('');
  }
  // A scene's caption and spoken line.
  let lastSceneLine = '';
  function sceneView() {
    const sc = HF.scene, v = sc?.view;
    $('#caption').textContent = v?.caption || ''; $('#caption').classList.toggle('on', !!v?.caption);
    const line = v?.line ? `${v.line.speaker}: “${v.line.text}”` : '';
    $('#sceneLine').innerHTML = v?.line ? `<b>${esc(v.line.speaker)}</b> ${esc(v.line.text)}` : ''; $('#sceneLine').classList.toggle('on', !!line && subtitles);
    $('#skip').classList.toggle('on', !!sc);
    if (line && line !== lastSceneLine && voiceOn()) window.HFV.say(v.line.speaker, v.line.text);
    lastSceneLine = line;
  }
  function hudLoop() {
    if (HF.pl) {
      for (const ev of S.events.splice(0)) {
        if (ev.kind === 'discover') { banner('Discovered', ev.text, ev.sub); window.HFA?.play('discover'); }
        else if (ev.kind === 'place') { if (!HF.world.indoor) banner('', ev.text, ''); }
        else if (ev.kind === 'banner') { banner(ev.small, ev.text, ev.sub); window.HFA?.play('level'); }
        else if (ev.kind === 'level') { banner('', ev.text.toUpperCase(), ''); note(ev.text, ev.kind); }
        else if (ev.kind === 'quest' && /^Quest complete/.test(ev.text)) { banner('Quest completed', ev.text.replace(/^Quest complete: /, '').replace(/\.$/, ''), ''); window.HFA?.play('level'); }
        else if (ev.kind === 'quest' && /^New quest/.test(ev.text)) { banner('New quest', ev.text.replace(/^New quest: /, '').replace(/\.$/, ''), ''); }
        else if (ev.kind === 'read') open('read', ev);
        else if (ev.kind === 'open') { if (ev.what?.kind === 'talk') open('talk'); else if (ev.what?.kind === 'shop') open('shop'); }
        else if (ev.kind === 'dead') setTimeout(() => open('dead'), 1600);
        else note(ev.text, ev.kind);
      }
      if (bannerT && performance.now() - bannerT > 3200) { $('#banner').classList.remove('on'); bannerT = 0; }
      compass(); bars(); bubbles(); sceneView();
      stage.classList.toggle('scene', !!HF.scene);
      window.HFA?.update({ combat: HF.inCombat(), fury: S.fury > 0 || HF.pl.anim === 'roar' });
      if (menuOpen === 'items' || menuOpen === 'loot' || menuOpen === 'shop') refreshFooter();
      if (menuOpen === 'talk' && !HF.convo) close();
    }
    requestAnimationFrame(hudLoop);
  }

  // ---------- menus ----------
  let menuOpen = null, sel = 0, cat = 'all', lootRef = null, skillSel = 'OneHanded', journalTab = 'quests', readRef = null, shopSide = 'buy', waitHours = 1;
  function open(which, ref) {
    menuOpen = which; S.paused = which !== 'talk'; HF.keys.clear(); sel = 0;
    if (which === 'loot') lootRef = ref; if (which === 'read') readRef = ref;
    menu.className = `on ${which}`; stage.classList.add('menu-open'); render();
  }
  function close() {
    if (menuOpen === 'shop') HF.closeShop();
    menuOpen = null; S.paused = false; menu.className = ''; menu.innerHTML = ''; stage.classList.remove('menu-open');
  }
  const CATS = [['all', 'All'], ['weapon', 'Weapons'], ['apparel', 'Apparel'], ['potion', 'Potions'], ['food', 'Food'], ['misc', 'Misc']];
  const isEquipped = (e) => Object.values(HF.pl.eq).includes(e);
  const order = { weapon: 0, apparel: 1, potion: 2, food: 3, misc: 4, quest: 5 };
  function rows(src, c) {
    const list = Object.entries(src).filter(([e, n]) => n > 0 && HF.ITEMS[e] && (c === 'all' || HF.ITEMS[e].cat === c || (c === 'misc' && HF.ITEMS[e].cat === 'quest')));
    return list.sort(([a], [b]) => ((order[HF.ITEMS[a].cat] ?? 9) - (order[HF.ITEMS[b].cat] ?? 9)) || (isEquipped(b) - isEquipped(a)) || HF.ITEMS[a].name.localeCompare(HF.ITEMS[b].name));
  }
  function itemCard(edid, price) {
    if (!edid) return '<div class="card empty"></div>';
    const it = HF.ITEMS[edid], stat = [];
    if (it.cat === 'weapon') stat.push(['Damage', it.damage], ['Speed', it.speed], ['Reach', it.reach]);
    if (it.cat === 'apparel') stat.push(['Armour', it.rating], ['Type', it.armourType === 'Clothing' ? 'Clothing' : `${it.armourType} armour`]);
    if (it.heal) stat.push(['Health', `+${it.heal}`]);
    stat.push(['Weight', it.weight], ['Value', it.value]);
    if (price !== undefined) stat.push(['Price', price]);
    const kind = it.cat === 'weapon' ? `${it.hands === 2 ? 'Two-handed' : 'One-handed'} ${it.shape}` : it.cat === 'apparel' ? (it.slot === 'body' ? 'Body' : it.slot === 'shield' ? 'Shield' : it.slot[0].toUpperCase() + it.slot.slice(1)) : it.quest ? 'Kept for the story' : it.cat[0].toUpperCase() + it.cat.slice(1);
    return `<div class="card"><canvas class="icon" data-icon="${edid}"></canvas><h3>${esc(it.name)}</h3><div class="kind">${esc(kind)}</div>
      <div class="stats">${stat.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>${it.desc ? `<p class="desc">${esc(it.desc)}</p>` : ''}</div>`;
  }
  function paintIcons() {
    for (const c of menu.querySelectorAll('canvas[data-icon]')) {
      const src = HF.icon(c.dataset.icon); if (!src) continue;
      const k = Math.max(2, Math.min(6, Math.floor(Math.min(260 / src.width, 170 / src.height))));
      c.width = src.width * k; c.height = src.height * k; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, c.width, c.height);
    }
  }
  function refreshFooter() {
    const f = menu.querySelector('.footer'); if (!f) return;
    f.innerHTML = `<span>Armour <b>${Math.round(HF.armourRating())}</b></span><span>Weight <b>${HF.carried().toFixed(1)}/300</b></span><span>Gold <b>${S.gold}</b></span><span>Health <b>${Math.round(HF.pl.hp)}/${HF.pl.maxHp}</b></span>${HF.shop ? `<span>${esc(HF.shop.npc.pname)}'s gold <b>${HF.shop.s.gold}</b></span>` : ''}`;
  }
  function render() {
    const m = menuOpen;
    if (m === 'hub') {
      menu.innerHTML = `<div class="hub"><button class="dir up" data-go="skills">Skills</button><button class="dir left" data-go="items">Items</button>
        <div class="seal"><small>${esc(HF.S.name)}<br>Level ${S.level}</small></div><button class="dir right" data-go="journal">Journal</button><button class="dir down" data-go="map">Map</button>
        <div class="hint">${key('W')}${key('A')}${key('S')}${key('D')} or click &middot; ${key('Tab')} close</div></div>`;
      return;
    }
    if (m === 'items' || m === 'loot') {
      const loot = m === 'loot', box = loot ? lootRef.loot || lootRef.box : null;
      const src = loot ? { ...box.items, ...(box.gold ? { Gold: 1 } : {}) } : S.inv;
      const list = loot ? Object.entries(src).filter(([, n]) => n > 0) : rows(src, cat);
      sel = Math.max(0, Math.min(sel, list.length - 1));
      const name = (e, n) => (e === 'Gold' ? `${box.gold} Gold` : `${HF.nameOf(e)}${n > 1 ? ` (${n})` : ''}`);
      const listHtml = list.length ? list.map(([e, n], i) => `<div class="row ${i === sel ? 'sel' : ''} ${!loot && isEquipped(e) ? 'eq' : ''}" data-i="${i}"><span>${esc(name(e, n))}</span>${!loot && isEquipped(e) ? '<em>equipped</em>' : ''}</div>`).join('') : `<div class="none">${loot ? 'Empty' : 'Nothing here'}</div>`;
      const cur = list[sel]?.[0], it = HF.ITEMS[cur];
      const verb = it && (it.cat === 'weapon' || it.cat === 'apparel') ? (isEquipped(cur) ? 'Unequip' : 'Equip') : it?.read ? 'Read' : 'Use';
      menu.innerHTML = `<div class="items">
        ${loot ? `<div class="cats"><h2>${esc(lootRef.name || lootRef.pname)}</h2><p class="dim">${lootRef.loot ? 'A body' : 'A container'}</p></div>` : `<div class="cats"><h2>Items</h2>${CATS.map(([k, n]) => `<div class="cat ${k === cat ? 'sel' : ''}" data-cat="${k}">${n}</div>`).join('')}</div>`}
        <div class="list">${listHtml}</div>
        ${cur === 'Gold' ? `<div class="card"><canvas class="icon" data-icon="Gold"></canvas><h3>${box.gold} Gold</h3></div>` : itemCard(cur)}
        <div class="keys">${loot ? `${key('E')} Take &middot; ${key('R')} Take all &middot; ${key('Tab')} Close` : `${key('E')} ${verb} &middot; ${key('R')} Drop &middot; ${key('A')}${key('D')} Category &middot; ${key('Tab')} Back`}</div>
        <div class="footer"></div></div>`;
      paintIcons(); refreshFooter(); menu.querySelector('.row.sel')?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (m === 'shop') {
      const sh = HF.shop, mine = rows(S.inv, 'all').filter(([e]) => !HF.ITEMS[e].quest && (!sh.npc.shop.buys || sh.npc.shop.buys.includes(HF.ITEMS[e].cat)));
      const theirs = Object.entries(sh.s.stock).filter(([, n]) => n > 0);
      const list = shopSide === 'buy' ? theirs : mine;
      sel = Math.max(0, Math.min(sel, list.length - 1));
      const cur = list[sel]?.[0], price = (e) => (shopSide === 'buy' ? HF.buyPrice(e) : HF.sellPrice(e));
      menu.innerHTML = `<div class="items shop">
        <div class="cats"><h2>${esc(sh.npc.pname)}</h2><div class="cat ${shopSide === 'buy' ? 'sel' : ''}" data-side="buy">Buy</div><div class="cat ${shopSide === 'sell' ? 'sel' : ''}" data-side="sell">Sell</div><p class="dim">Prices follow your Speech.</p></div>
        <div class="list">${list.length ? list.map(([e, n], i) => `<div class="row ${i === sel ? 'sel' : ''}" data-i="${i}"><span>${esc(HF.nameOf(e))}${n > 1 ? ` (${n})` : ''}</span><em>${price(e)} gold</em></div>`).join('') : '<div class="none">Nothing</div>'}</div>
        ${itemCard(cur, cur ? price(cur) : undefined)}
        <div class="keys">${key('E')} ${shopSide === 'buy' ? 'Buy' : 'Sell'} &middot; ${key('A')}${key('D')} Buy or sell &middot; ${key('Tab')} Close</div><div class="footer"></div></div>`;
      paintIcons(); refreshFooter(); menu.querySelector('.row.sel')?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (m === 'talk') {
      const c = HF.convo; if (!c) { close(); return; }
      const n = HF.convoWith, cur = c.current, ch = c.choices;
      menu.innerHTML = `<div class="talk"><div class="who">${esc(cur.speaker || n?.pname || '')}</div>
        ${c.spoken ? `<div class="you">${esc(HF.S.name)}: “${esc(c.spoken)}”</div>` : ''}
        <div class="line">${esc(cur.text)}</div>
        <div class="opts">${ch.map((o, i) => `<div class="opt ${i === sel ? 'sel' : ''}" data-opt="${i}">${i + 1}. ${esc(o.text)}</div>`).join('')}</div>
        <div class="keys">${key('1')}-${key('9')} or ${key('W')}${key('S')} and ${key('E')} &middot; ${key('Tab')} leave</div></div>`;
      if (voiceOn() && c.lastSaid !== cur.text) { c.lastSaid = cur.text; window.HFV.say(cur.speaker || n?.pname, cur.text, n); }
      return;
    }
    if (m === 'read') {
      menu.innerHTML = `<div class="journal read"><h3>${esc(readRef.title || '')}</h3><p class="note">${esc(readRef.text).replace(/\n/g, '<br>')}</p><div class="keys">${key('Tab')} or ${key('E')} close</div></div>`;
      return;
    }
    if (m === 'wait') {
      menu.innerHTML = `<div class="wait"><h2>${HF.world.indoor ? 'Sleep' : 'Wait'}</h2><p>${esc(HF.clock())}</p><div class="hours"><button data-wh="-1">-</button><b>${waitHours} hour${waitHours > 1 ? 's' : ''}</b><button data-wh="1">+</button></div>
        <button data-wait="go">${HF.world.indoor ? 'Sleep' : 'Wait'}</button><div class="keys">${key('A')}${key('D')} hours &middot; ${key('E')} ${HF.world.indoor ? 'sleep' : 'wait'} &middot; ${key('Tab')} close</div></div>`;
      return;
    }
    if (m === 'skills') {
      const sk = S.skills, perks = HF.PERKS.filter((p) => p.skill === skillSel);
      const first = perks.filter((p) => !perks.some((q) => q.nextPerk === p.edid));
      const toLvl = 75 + S.level * 25;
      menu.innerHTML = `<div class="skills">
        <div class="lvl"><b>Level ${S.level}</b><div class="bar"><i style="width:${(S.xp / toLvl) * 100}%"></i></div><span>Perks to spend: ${S.perkPoints}${S.ragePoints ? ` &middot; Rage perks: ${S.ragePoints}` : ''}</span></div>
        <div class="trees">${Object.keys(HF.SKILL_NAMES).map((k) => `<div class="tree ${k === skillSel ? 'sel' : ''}" data-skill="${k}"><div class="lv">${sk[k].level}</div><div class="nm">${HF.SKILL_NAMES[k]}</div><div class="bar"><i style="width:${Math.min(100, (sk[k].xp / HF.toNext(k)) * 100)}%"></i></div></div>`).join('')}</div>
        <div class="perks"><h2>${HF.SKILL_NAMES[skillSel]}</h2>${first.sort((a, b) => (a.skillReq[0]?.level || 0) - (b.skillReq[0]?.level || 0)).map((p) => {
          const chain = HF.chainOf(p.edid), r = HF.rank(p.edid), why = HF.canTake(p.edid), nextReq = HF.PERK[chain[Math.min(r, chain.length - 1)]].skillReq[0]?.level || 0;
          return `<div class="perk ${r ? 'own' : ''} ${why === 'ok' ? 'can' : ''} ${HF.NOT_HERE[p.edid] || p.skill === 'Smithing' || p.skill === 'Speech' ? 'na' : ''}" data-perk="${p.edid}">
            <div class="pn">${esc(p.name)}${chain.length > 1 ? ` <span class="rk">${r}/${chain.length}</span>` : r ? ' <span class="rk">taken</span>' : ''}</div><div class="pd">${esc(p.description)}</div>
            <div class="pr">${r < chain.length ? (nextReq ? `${HF.SKILL_NAMES[skillSel]} ${nextReq}` : 'Any level') + ' &middot; ' : ''}<i>${esc(why === 'ok' ? 'Click to take' : why)}</i></div></div>`;
        }).join('')}</div>
        <div class="keys">${key('A')}${key('D')} Skill &middot; click a perk to take it &middot; ${key('Tab')} Back</div></div>`;
      return;
    }
    if (m === 'map') {
      const ov = HF.overview(), sz = HF.mapSize(), places = HF.placesSeen(), pl = HF.pl, onCoast = HF.world.id === 'coast';
      const P = (x, y) => `left:${(x / sz.w) * 100}%;top:${(y / sz.h) * 100}%`;
      menu.innerHTML = `<div class="map"><h2>The Sentinel Coast</h2><div class="sheet"><canvas id="mapc"></canvas><div class="pins">
        ${places.map((p) => `<div class="pin place" data-travel="${p.id}" style="${P(p.x, p.y)}"><i></i><span>${esc(p.name)}</span></div>`).join('')}
        ${onCoast ? `<div class="pin you" style="${P(pl.x, pl.y)};transform:translate(-50%,-50%) rotate(${(pl.heading * 180) / Math.PI}deg)"></div>` : ''}
        ${HF.questTargets().filter((t) => !t.exit && onCoast).map((t) => `<div class="pin quest" title="${esc(t.title)}" style="${P(t.x, t.y)}"></div>`).join('')}
        </div></div><div class="keys">Click a place you have been to travel there (time passes) &middot; ${key('Tab')} Back</div></div>`;
      const c = $('#mapc'); if (ov) { c.width = ov.width; c.height = ov.height; const g = c.getContext('2d'); g.drawImage(ov, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#e8d8b0'; g.fillRect(0, 0, c.width, c.height); }
      return;
    }
    if (m === 'journal') {
      const st = S.stats, tabs = [['quests', 'Quests'], ['stats', 'General Stats'], ['system', 'System']];
      const qs = HF.questList();
      const body = journalTab === 'quests' ? (qs.length ? qs.map((q) => `<div class="quest ${q.done ? 'done' : ''}"><h3>${q.done ? 'Completed: ' : ''}${esc(q.title)}</h3>${q.done ? '' : `<p>${esc(q.text)}</p><ul>${q.objectives.map((o) => `<li class="${o.have >= o.need ? 'done' : ''}">${esc(o.text)}${o.need > 1 ? ` (${o.have}/${o.need})` : ''}${o.optional ? ' <i>(optional)</i>' : ''}</li>`).join('')}</ul>`}</div>`).join('') : '<p>Nothing yet.</p>')
        : journalTab === 'stats' ? `<div class="statlist">${[['Days passed', Math.floor(HF.S.time / 86400)], ['Level', S.level], ['Enemies killed', st.kills], ['Finishers', st.finishers], ['Limbs and heads taken', st.severed], ['Blows blocked', st.blocks], ['Parries', st.parries], ['Items looted', st.looted], ['Gold found', st.gold], ['Infamy', HF.S.reputation.infamy], ['Collateral', HF.S.reputation.collateral]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`
        : `<div class="system">
          <div class="opt"><button data-sys="resume">Resume</button><button data-sys="save">Save</button><button data-sys="load">Load the last save</button><button data-sys="new">New game</button></div>
          <div class="opt"><span>Gore</span>${['full', 'some', 'off'].map((g) => `<button data-gore="${g}" class="${HF.settings.gore === g ? 'on' : ''}">${{ full: 'Full', some: 'Blood only', off: 'Off' }[g]}</button>`).join('')}</div>
          <div class="opt"><span>Sound</span><button data-sound="on" class="${window.HFA?.on ? 'on' : ''}">On</button><button data-sound="off" class="${window.HFA?.on ? '' : 'on'}">Off</button></div>
          <div class="opt"><span>Voices</span><button data-voice="on" class="${voiceOn() ? 'on' : ''}">On</button><button data-voice="off" class="${voiceOn() ? '' : 'on'}">Off</button></div>
          <div class="opt"><span>Subtitles</span><button data-subs="on" class="${subtitles ? 'on' : ''}">On</button><button data-subs="off" class="${subtitles ? '' : 'on'}">Off</button></div>
          <div class="help"><b>Controls</b><br>WASD move, Shift run &middot; left click or J attack, hold for a power attack &middot; right click or K block (a tap just before a blow parries) &middot; block and attack: shield bash (Power Bash perk) &middot; Space dodge, C roll &middot; F finisher &middot; Q Fury (60 Rage) &middot; E talk, search, open, enter &middot; T wait &middot; Tab menu &middot; I items &middot; P skills &middot; M map &middot; Esc journal &middot; F5 quick save, F9 quick load</div></div>`;
      menu.innerHTML = `<div class="journal"><div class="tabs">${tabs.map(([k, n]) => `<div class="tab ${k === journalTab ? 'sel' : ''}" data-tab="${k}">${n}</div>`).join('')}</div><div class="page">${body}</div>
        <div class="keys">${key('A')}${key('D')} Tab &middot; ${key('Esc')} Close</div></div>`;
      return;
    }
    if (m === 'dead') {
      menu.innerHTML = `<div class="dead"><h1>You died</h1><button data-sys="load">Load the last save</button></div>`;
    }
  }

  // ---------- actions ----------
  function curList() {
    if (menuOpen === 'loot') { const box = lootRef.loot || lootRef.box; return Object.entries({ ...box.items, ...(box.gold ? { Gold: 1 } : {}) }).filter(([, n]) => n > 0); }
    if (menuOpen === 'shop') { const sh = HF.shop; return shopSide === 'buy' ? Object.entries(sh.s.stock).filter(([, n]) => n > 0) : rows(S.inv, 'all').filter(([e]) => !HF.ITEMS[e].quest && (!sh.npc.shop.buys || sh.npc.shop.buys.includes(HF.ITEMS[e].cat))); }
    return rows(S.inv, cat);
  }
  function act(kind) {
    const list = curList(), cur = list[sel]?.[0];
    if (menuOpen === 'loot') {
      if (kind === 'take' && cur) HF.lootFrom(lootRef, cur, false);
      if (kind === 'all') { for (const [e] of list) HF.lootFrom(lootRef, e, true); close(); return; }
    } else if (menuOpen === 'shop' && cur) { if (shopSide === 'buy') HF.buy(cur); else HF.sell(cur); }
    else if (menuOpen === 'items' && cur) { if (kind === 'take') { HF.useItem(cur); if (menuOpen !== 'items') return; } if (kind === 'drop') HF.drop(cur); }
    render();
  }
  function choose(i) {
    const c = HF.convo; if (!c || !c.choices[i]) return;
    c.choose(i); if (c.done) { HF.endConversation(); close(); } else { sel = 0; render(); }
  }
  // E in the world: talk, search, open, enter, use.
  function activate() {
    const r = HF.activate(); if (!r) return;
    if (r.kind === 'talk') open('talk'); else if (r.kind === 'shop') open('shop'); else if (r.kind === 'sleep') { waitHours = 8; open('wait'); }
    else if (r.kind === 'body' || r.kind === 'container') open('loot', r.ref);
  }
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const k = e.code;
    if (!HF.pl) return;
    if (!menuOpen) {
      if (HF.scene) return;
      if (HF.convo) { open('talk'); return; }
      if (k === 'Tab') { e.preventDefault(); open('hub'); }
      else if (k === 'KeyI') open('items');
      else if (k === 'KeyP') open('skills');
      else if (k === 'KeyM') open('map');
      else if (k === 'KeyT') { if (HF.inCombat()) note('You cannot wait with enemies nearby.', 'warn'); else { waitHours = 1; open('wait'); } }
      else if (k === 'Escape') { journalTab = 'quests'; open('journal'); }
      else if (k === 'KeyE') activate();
      else return;
      e.stopPropagation(); return;
    }
    e.preventDefault(); e.stopPropagation();
    if (menuOpen === 'dead') return;
    if (menuOpen === 'talk') {
      const n = HF.convo?.choices.length || 0;
      if (/^Digit[1-9]$/.test(k)) return choose(+k.slice(5) - 1);
      if (k === 'KeyW' || k === 'ArrowUp') sel = Math.max(0, sel - 1);
      else if (k === 'KeyS' || k === 'ArrowDown') sel = Math.min(n - 1, sel + 1);
      else if (k === 'KeyE' || k === 'Enter') return choose(sel);
      else if (k === 'Tab' || k === 'Escape') { if (HF.convo?.choices.some((c) => /goodbye|leave|later/i.test(c.text))) { const i = HF.convo.choices.findIndex((c) => /goodbye|leave|later/i.test(c.text)); return choose(i); } return; }
      render(); return;
    }
    if (k === 'Escape') { if (['journal', 'loot', 'hub', 'read', 'shop', 'wait'].includes(menuOpen)) close(); else { journalTab = 'system'; open('journal'); } return; }
    if (k === 'Tab') { if (['hub', 'loot', 'read', 'shop', 'wait'].includes(menuOpen)) close(); else open('hub'); return; }
    if (menuOpen === 'read') { if (k === 'KeyE') close(); return; }
    if (menuOpen === 'hub') { const go = { KeyW: 'skills', ArrowUp: 'skills', KeyA: 'items', ArrowLeft: 'items', KeyD: 'journal', ArrowRight: 'journal', KeyS: 'map', ArrowDown: 'map' }[k]; if (go) { if (go === 'journal') journalTab = 'quests'; open(go); } return; }
    if (menuOpen === 'wait') {
      if (k === 'KeyA' || k === 'ArrowLeft') waitHours = Math.max(1, waitHours - 1);
      if (k === 'KeyD' || k === 'ArrowRight') waitHours = Math.min(24, waitHours + 1);
      if (k === 'KeyE' || k === 'Enter') { if (HF.wait(waitHours)) close(); return; }
      render(); return;
    }
    if (menuOpen === 'items' || menuOpen === 'loot' || menuOpen === 'shop') {
      const n = curList().length;
      if (k === 'KeyW' || k === 'ArrowUp') sel = Math.max(0, sel - 1);
      else if (k === 'KeyS' || k === 'ArrowDown') sel = Math.min(n - 1, sel + 1);
      else if ((k === 'KeyA' || k === 'ArrowLeft' || k === 'KeyD' || k === 'ArrowRight') && menuOpen === 'items') { const i = CATS.findIndex(([c]) => c === cat), d = k === 'KeyA' || k === 'ArrowLeft' ? -1 : 1; cat = CATS[(i + d + CATS.length) % CATS.length][0]; sel = 0; }
      else if ((k === 'KeyA' || k === 'ArrowLeft' || k === 'KeyD' || k === 'ArrowRight') && menuOpen === 'shop') { shopSide = shopSide === 'buy' ? 'sell' : 'buy'; sel = 0; }
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
    const t = e.target.closest('[data-go],[data-cat],[data-i],[data-skill],[data-tab],[data-sys],[data-gore],[data-perk],[data-sound],[data-voice],[data-subs],[data-opt],[data-side],[data-travel],[data-wh],[data-wait]'); if (!t) return;
    const d = t.dataset;
    if (d.opt !== undefined) return choose(+d.opt);
    if (d.go) { if (d.go === 'journal') journalTab = 'quests'; return open(d.go); }
    if (d.cat) { cat = d.cat; sel = 0; }
    if (d.side) { shopSide = d.side; sel = 0; }
    if (d.i !== undefined) { const i = +d.i; if (i === sel) return act('take'); sel = i; }
    if (d.skill) skillSel = d.skill;
    if (d.tab) journalTab = d.tab;
    if (d.perk) HF.takePerk(d.perk);
    if (d.travel) { if (HF.fastTravel(d.travel)) return close(); note('You cannot travel from here now.', 'warn'); }
    if (d.wh) waitHours = Math.max(1, Math.min(24, waitHours + +d.wh));
    if (d.wait) { if (HF.wait(waitHours)) return close(); }
    if (d.sys === 'resume') return close();
    if (d.sys === 'save') { HF.save('manual'); return close(); }
    if (d.sys === 'load') { close(); HF.load(HF.latestSlot()); return; }
    if (d.sys === 'new') { close(); title(true); return; }
    if (d.gore) { HF.settings.gore = d.gore; HF.saveSettings(); }
    if (d.sound) window.HFA?.setOn(d.sound === 'on');
    if (d.voice) window.HFV?.setOn(d.voice === 'on');
    if (d.subs) { subtitles = d.subs === 'on'; try { localStorage.setItem('hf.subtitles', d.subs); } catch { /* private window */ } }
    render();
  });

  // ---------- the title, naming him, the warning ----------
  const front = $('#front');
  function title(fresh = false) {
    const last = !fresh && HF.latestSlot();
    front.hidden = false;
    front.innerHTML = `<div class="frontbox"><h1>The Salt Ledger</h1><p class="dim">Hammerfell, 4E 201. ${esc(HF.version)}</p>
      ${last ? '<button data-front="continue">Continue</button>' : ''}<button data-front="new">New game</button></div>`;
  }
  function naming() {
    front.innerHTML = `<div class="frontbox"><h2>Who is he?</h2><p class="dim">A Redguard farmer on the Sentinel Coast, a husband and a father. Once, long ago, a conscript.</p>
      <label>Name <input id="nameBox" maxlength="24" value="Kasim" autocomplete="off"></label><button data-front="begin">Begin</button></div>`;
    $('#nameBox').focus();
  }
  function warning(then) {
    front.innerHTML = `<div class="frontbox"><h2>Before you play</h2><p>This game has graphic violence: blood, severed limbs and executions, and strong language. It is meant for adults.</p><p class="dim">You can change this at any time in the journal's System tab (Esc).</p>
      <button data-gore="full">Full gore</button><button data-gore="some">Blood only</button><button data-gore="off">No gore</button></div>`;
    front.dataset.then = then;
  }
  front.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.front === 'continue') { front.hidden = true; HF.load(HF.latestSlot()); }
    if (t.dataset.front === 'new') { if (!localStorage.getItem('hf.warned')) warning('naming'); else naming(); }
    if (t.dataset.front === 'begin') { const n = $('#nameBox').value; front.hidden = true; HF.newGame(n); }
    if (t.dataset.gore) { HF.settings.gore = t.dataset.gore; HF.saveSettings(); try { localStorage.setItem('hf.warned', '1'); } catch { /* private window */ } naming(); }
  });
  front.addEventListener('keydown', (e) => { if (e.code === 'Enter' && $('#nameBox')) { front.hidden = true; HF.newGame($('#nameBox').value); } e.stopPropagation(); });
  title();
  requestAnimationFrame(hudLoop);
  window.HFUI = { open, close, get menu() { return menuOpen; }, choose, title };
});
