// Shovian-Gefechts-Prototyp: Menü, eigenes Gefecht, Aufstellung (teilen, Reserve), Gefecht gegen KI oder Hot-Seat, Ergebnis.
(function () {
  var B = SVB, A = SVA, R = SV;
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function num(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }
  function lvl(x) { return (Math.round(x * 10) / 10).toLocaleString('de'); }
  function cnt(p) { return Math.max(1, Math.ceil(p.n - 1e-9)); }

  // simple Trupp-Symbole (Ersatz, bis die Travian-Bilder per Hotlink kommen)
  var ICO = {
    spear: '<path d="M12 22V6" stroke-width="2.2"/><path d="M12 1.5l-3 5.5h6z" fill="currentColor" stroke="none"/><path d="M8.5 18h7" stroke-width="1.6"/>',
    shield: '<path d="M12 2.5l7.5 3V11c0 5-3.4 8.4-7.5 10.5C7.9 19.4 4.5 16 4.5 11V5.5z" stroke-width="2"/><path d="M12 6v12M7.5 10.5h9" stroke-width="1.6"/>',
    sword: '<path d="M12 2.5V16" stroke-width="2.4"/><path d="M7.5 16h9M12 16v5" stroke-width="2"/><circle cx="12" cy="22" r="1.2" fill="currentColor"/>',
    club: '<path d="M7 22l7-14" stroke-width="2.4"/><circle cx="15.2" cy="5.6" r="3.4" fill="currentColor"/>',
    axe: '<path d="M8 22l6-19" stroke-width="2.2"/><path d="M13.5 4.5c5-1.5 8 2.5 6.5 7l-6.5-2.5z" fill="currentColor"/>',
    horse: '<path d="M6.5 4v8a5.5 5.5 0 0 0 11 0V4" stroke-width="3.2" stroke-linecap="round"/>',
    horse2: '<path d="M6.5 6v6a5.5 5.5 0 0 0 11 0V6" stroke-width="3.2" stroke-linecap="round"/><path d="M3 3l18 0" stroke-width="2"/>',
    ram: '<rect x="3" y="8.5" width="14" height="6" rx="1.5" fill="currentColor"/><path d="M17 8.5l4.5 3-4.5 3z" fill="currentColor"/><circle cx="7" cy="18" r="2.2" stroke-width="1.8"/><circle cx="14" cy="18" r="2.2" stroke-width="1.8"/>',
    cata: '<path d="M3 19.5h17" stroke-width="2"/><path d="M6 17.5L18 5" stroke-width="2.2"/><circle cx="18.6" cy="4.4" r="2.4" fill="currentColor"/><path d="M6 19.5V14M12 19.5v-4" stroke-width="1.8"/>',
    crown: '<path d="M3 18L5 7l4.5 5L12 4.5 14.5 12 19 7l2 11z" fill="currentColor"/><path d="M3 21h18" stroke-width="2"/>',
    banner: '<path d="M6 2v20" stroke-width="2"/><path d="M6 3h12l-3 4.5L18 12H6z" fill="currentColor"/>',
    paw: '<circle cx="12" cy="15.5" r="4.5" fill="currentColor"/><circle cx="5.5" cy="10" r="2.2" fill="currentColor"/><circle cx="18.5" cy="10" r="2.2" fill="currentColor"/><circle cx="9" cy="5.5" r="2.2" fill="currentColor"/><circle cx="15" cy="5.5" r="2.2" fill="currentColor"/>'
  };
  function svg(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linejoin="round">' + (ICO[k] || ICO.spear) + '</svg>'; }

  var SCEN = [
    { id: 'abenteuer', name: 'Abenteuer: Held gegen Wölfe', sub: 'Nur dein Held (1 Figur) gegen 2 Wölfe und 4 Ratten', cfg: { att: { tribe: 'rom', squads: [{ key: 'hero', n: 1 }] }, def: { tribe: 'nat', squads: [{ key: 'wolf', n: 2 }, { key: 'rat', n: 4 }] } } },
    { id: 'oase', name: 'Oase räumen', sub: 'Held, 20 Legionäre, 6 Equites Imperatoris gegen Wildschweine, Wölfe, Spinnen', cfg: { att: { tribe: 'rom', squads: [{ key: 'hero', n: 1 }, { key: 'legion', n: 20 }, { key: 'eimp', n: 6 }] }, def: { tribe: 'nat', squads: [{ key: 'boar', n: 8 }, { key: 'wolf', n: 5 }, { key: 'spider', n: 10 }] } } },
    { id: 'dorf', name: 'Angriff auf ein Gallier-Dorf', sub: 'Römer mit Rammen und Katapulten gegen Palisade Stufe 5', cfg: { att: { tribe: 'rom', squads: [{ key: 'legion', n: 20 }, { key: 'imper', n: 10 }, { key: 'eimp', n: 6 }, { key: 'ram', n: 6 }, { key: 'cata', n: 2 }] }, def: { tribe: 'gal', wall: 5, squads: [{ key: 'phal', n: 25 }, { key: 'sword', n: 8 }, { key: 'druid', n: 4 }] } } },
    { id: 'mauer', name: 'Sturm auf die Stadtmauer', sub: 'Germanen gegen Römer hinter Mauer Stufe 12 (nur eine Lücke)', cfg: { att: { tribe: 'teu', squads: [{ key: 'club', n: 30 }, { key: 'axe', n: 15 }, { key: 'tk', n: 6 }, { key: 'ram', n: 20 }, { key: 'cata', n: 4 }] }, def: { tribe: 'rom', wall: 12, squads: [{ key: 'legion', n: 20 }, { key: 'praet', n: 20 }, { key: 'ecaes', n: 3 }, { key: 'cata', n: 1 }] } } }
  ];
  var SIDE = ['Angreifer', 'Verteidiger'];
  var S = { st: null, cfg: null, mode: 'ai', human: [true, false], phase: 'menu', setupSide: 0, sel: null, chip: null, peek: null, busy: false, cell: 40, start: null };

  // ---------- Menü ----------
  function menu() {
    show('scr-menu'); var m = $('menu'); m.innerHTML = '';
    SCEN.forEach(function (sc) { var b = el('button', 'btn', sc.name + '<small>' + sc.sub + '</small>'); b.onclick = function () { launch(JSON.parse(JSON.stringify(sc.cfg)), sc.name); }; m.appendChild(b); });
    var c = el('button', 'btn', 'Eigenes Gefecht<small>Völker, Truppen und Mauer selbst wählen</small>'); c.onclick = custom; m.appendChild(c);
  }
  // Gegner: KI, Hot-Seat oder vorbereitete Verteidigung (Fernschlacht-Modell: Verteidiger stellt vorab auf, seine KI führt sie)
  var OPP = { ai: 'opp-ai', hs: 'opp-hs', prep: 'opp-prep' };
  Object.keys(OPP).forEach(function (k) { $(OPP[k]).onclick = function () { S.mode = k; Object.keys(OPP).forEach(function (j) { $(OPP[j]).classList.toggle('on', j === k); }); }; });

  // ---------- Vorbereitete Verteidigung ----------
  var HALTUNG = {
    halten: ['Halten', 'Bleibt hinter der Mauer bzw. in der Startzone und lässt den Angreifer kommen. Stark mit hoher Mauer.'],
    kontern: ['Kontern', 'Bleibt stehen und schlägt zu, wenn es sich lohnt. Ohne Mauer stellt er sich dem Angreifer.'],
    ausfallen: ['Ausfallen', 'Geht dem Angreifer entgegen. Gut gegen Rammen und schwache Angriffe, riskant gegen starke.']
  };
  function defKey(cfg) { return 'shovian-def:' + JSON.stringify(cfg.def); }
  function loadDef(cfg) { try { return JSON.parse(localStorage.getItem(defKey(cfg)) || 'null'); } catch (e) { return null; } }
  function saveDef(cfg, d) { try { localStorage.setItem(defKey(cfg), JSON.stringify(d)); return true; } catch (e) { return false; } }
  function launch(cfg, title) {
    if (S.mode !== 'prep') { start(cfg, title); return; }
    var d = loadDef(cfg);
    modal('<h2>' + title + '</h2><p class="note">Fernschlacht-Probe: Der Verteidiger stellt vorher auf und wählt eine Haltung. Danach greift der Angreifer an, die Verteidigung führt die KI nach dieser Haltung. Der Verteidiger sieht hinterher die Wiederholung.</p>' +
      '<p>' + (d ? 'Vorbereitet: <b>' + HALTUNG[d.stance][0] + '</b>, ' + d.pcs.length + ' Trupps' : 'Noch keine Verteidigung vorbereitet (sonst stellt die KI auf, Haltung Kontern).') + '</p>' +
      '<div class="ctrl"><button class="btn" id="p-def">🛡 Verteidigung vorbereiten</button></div>' +
      '<h3>Angreifen</h3><div class="ctrl"><button class="btn go" id="p-self">Selbst angreifen</button></div>' +
      '<div class="ctrl"><button class="btn" id="p-auto">Automatisch (meine KI)</button><label class="note">Rückzug ab <select id="p-rt"><option value="">nie</option><option value="0.3">30 %</option><option value="0.5" selected>50 %</option><option value="0.7">70 %</option></select> Verlust</label></div>');
    $('p-def').onclick = function () { closeModal(); start(cfg, title, { prep: 'def' }); };
    $('p-self').onclick = function () { closeModal(); start(cfg, title, { prep: 'att' }); };
    $('p-auto').onclick = function () { var v = $('p-rt').value; closeModal(); start(cfg, title, { prep: 'att', auto: true, retreatAt: v === '' ? null : +v }); };
  }
  function pickStance() {
    var h = '<h2>Haltung wählen</h2><p class="note">So führt die KI deine Verteidigung, wenn der Angriff ankommt.</p>';
    Object.keys(HALTUNG).forEach(function (k) { h += '<button class="btn" data-st="' + k + '" style="width:100%;margin:4px 0">' + HALTUNG[k][0] + '<small>' + HALTUNG[k][1] + '</small></button>'; });
    modal(h);
    [].forEach.call(document.querySelectorAll('#modalBox [data-st]'), function (b) {
      b.onclick = function () {
        var st = S.st, pcs = st.pcs.filter(function (p) { return p.side === 1 && p.n > 0; }).map(function (p) { return { id: p.id, key: p.key, tribe: p.tribe, n: p.n, x: p.x, y: p.y }; });
        var ok = saveDef(S.cfg, { stance: b.dataset.st, pcs: pcs, t: Date.now() });
        modal('<h2>' + (ok ? 'Verteidigung steht' : 'Speichern ging nicht') + '</h2><p class="note">' + (ok ? 'Haltung ' + HALTUNG[b.dataset.st][0] + '. Greift jemand an, kämpft deine KI so, und du bekommst die Wiederholung.' : 'Der Browser erlaubt keinen Speicher (privates Fenster?).') + '</p><div class="ctrl"><button class="btn" id="d-menu">Menü</button><button class="btn go" id="d-att">Jetzt dagegen angreifen</button></div>');
        $('d-menu').onclick = function () { closeModal(); menu(); };
        $('d-att').onclick = function () { closeModal(); start(JSON.parse(JSON.stringify(S.cfg)), S.title, { prep: 'att' }); };
      };
    });
  }
  // gespeicherte Verteidigung aufs Brett (Ids passen, weil create bei gleicher Konfiguration gleich nummeriert)
  function applyDef(st, d) {
    st.pcs = st.pcs.filter(function (p) { return p.side !== 1; });
    d.pcs.forEach(function (q) { st.pcs.push({ id: q.id, side: 1, tribe: q.tribe, key: q.key, n: q.n, n0: q.n, x: q.x, y: q.y, pro: false }); });
    st.val0 = [B.value(st, 0), B.value(st, 1)];
  }
  function show(id) { ['scr-menu', 'scr-custom', 'scr-battle'].forEach(function (s) { $(s).classList.toggle('hidden', s !== id); }); window.scrollTo(0, 0); }

  // ---------- Eigenes Gefecht ----------
  var CUST = { att: { tribe: 'rom', n: { legion: 20, imper: 10, eimp: 4 }, hero: 1 }, def: { tribe: 'gal', n: { phal: 20, sword: 6 }, hero: 0, wall: 5 } };
  function custom() {
    show('scr-custom'); var box = $('c-sides'); box.innerHTML = '';
    ['att', 'def'].forEach(function (k, side) {
      var c = CUST[k], d = el('div', 'side s' + side), tribes = side === 0 ? ['rom', 'gal', 'teu'] : ['rom', 'gal', 'teu', 'nat'];
      d.innerHTML = '<div class="row"><h3 class="grow">' + SIDE[side] + '</h3><select>' + tribes.map(function (t) { return '<option value="' + t + '"' + (t === c.tribe ? ' selected' : '') + '>' + R.TRIBES[t].name + '</option>'; }).join('') + '</select></div>';
      var g = el('div', 'troops'), units = R.TRIBES[c.tribe].units;
      Object.keys(units).forEach(function (u) { add(units[u].n, c.n[u] || 0, function (v) { c.n[u] = v; }); });
      if (c.tribe !== 'nat') add('Held', c.hero, function (v) { c.hero = Math.min(1, v); }, 1);
      if (side === 1 && c.tribe !== 'nat') add(R.TRIBES[c.tribe].wallName + ' (Stufe)', c.wall, function (v) { c.wall = Math.min(20, v); }, 20);
      function add(label, val, set, max) {
        g.appendChild(el('span', null, label)); var i = el('input'); i.type = 'number'; i.min = 0; i.max = max || 999; i.value = val;
        i.oninput = function () { set(Math.max(0, Math.floor(+i.value || 0))); }; g.appendChild(i);
      }
      d.appendChild(g);
      d.querySelector('select').onchange = function (e) { c.tribe = e.target.value; c.n = {}; if (c.tribe === 'nat') { c.hero = 0; c.wall = 0; } custom(); };
      box.appendChild(d);
    });
  }
  $('c-back').onclick = menu;
  $('c-go').onclick = function () {
    function sq(c) { var out = Object.keys(c.n).filter(function (k) { return c.n[k] > 0 && R.TRIBES[c.tribe].units[k]; }).map(function (k) { return { key: k, n: c.n[k] }; }); if (c.hero) out.unshift({ key: 'hero', n: 1 }); return out; }
    var a = sq(CUST.att), d = sq(CUST.def);
    if (!a.length || !d.length) { alert('Beide Seiten brauchen mindestens eine Truppe.'); return; }
    launch({ att: { tribe: CUST.att.tribe, squads: a }, def: { tribe: CUST.def.tribe, wall: CUST.def.tribe === 'nat' ? 0 : CUST.def.wall, squads: d } }, 'Eigenes Gefecht');
  };

  // ---------- Gefecht aufbauen ----------
  // o.prep: 'def' = nur Verteidigung aufstellen und speichern, 'att' = gegen die gespeicherte Verteidigung angreifen (o.auto: Angreifer-KI, o.retreatAt)
  function start(cfg, title, o) {
    o = o || {};
    S.cfg = JSON.parse(JSON.stringify(cfg)); S.title = title; S.prep = o.prep || null; S.again = o; S.replay = false; S.rec = null;
    S.human = o.prep === 'def' ? [false, true] : o.prep === 'att' ? [!o.auto, false] : [true, S.mode === 'hs'];
    S.st = B.create(cfg); S.sel = S.chip = S.peek = null; S.busy = false; S.logs = [];
    show('scr-battle'); $('b-title').textContent = title; $('log').innerHTML = '';
    buildBoard();
    var st = S.st;
    if (o.prep === 'att') {
      var d = loadDef(cfg);
      if (d) applyDef(st, d); else B.autoPlace(st, 1);
      st.stance = [null, d ? d.stance : 'kontern']; st.retreatAt = o.auto ? o.retreatAt : null;
      log(null, 'Verteidigung: ' + (d ? 'vorbereitet, Haltung ' + HALTUNG[d.stance][0] : 'nicht vorbereitet, KI stellt auf (Kontern)') + '.');
    } else if (!S.human[1]) B.autoPlace(st, 1);
    S.phase = 'setup';
    if (o.prep === 'def') { S.setupSide = 1; B.autoPlace(st, 1); log(null, 'Stell deine Verteidigung auf. Der Angreifer sieht sie erst, wenn er ankommt. Danach wählst du die Haltung.'); refresh(); return; }
    S.setupSide = 0; B.autoPlace(st, 0);
    if (o.auto) { log(null, 'Angriff läuft automatisch' + (o.retreatAt != null ? ', Rückzug ab ' + Math.round(o.retreatAt * 100) + ' % Verlust' : ', ohne Rückzug') + '.'); begin(); return; }
    log(null, 'Aufstellung: Tippe einen Trupp, dann ein Feld in deiner Startzone. „Teilen“ halbiert den gewählten Trupp.');
    refresh();
  }
  function begin() {
    var st = S.st;
    S.phase = 'battle'; S.start = st.pcs.map(function (p) { return { id: p.id, n: p.n }; });
    S.rec = { snap: B.clone(st), moves: [] }; // für die Wiederholung (Gefecht ist ohne Zufall, also reicht Start + Züge)
    log(null, 'Gefecht beginnt. Der Angreifer zieht zuerst. Es läuft, bis eine Seite keine Truppen mehr hat.');
    refresh(); nextTurn();
  }
  function replay() {
    var r = S.rec; if (!r) return;
    S.st = B.clone(r.snap); S.st.stance = r.snap.stance; S.replay = true; S.ri = 0; S.human = [false, false]; S.busy = false; S.sel = S.chip = S.peek = null;
    show('scr-battle'); $('b-title').textContent = 'Wiederholung: ' + S.title; $('log').innerHTML = '';
    buildBoard(); S.phase = 'battle'; S.start = S.st.pcs.map(function (p) { return { id: p.id, n: p.n }; });
    log(null, 'Wiederholung: So ist der Angriff abgelaufen.'); refresh(); nextTurn();
  }
  function buildBoard() {
    var st = S.st, b = $('board'); b.innerHTML = '';
    b.style.gridTemplateColumns = 'repeat(' + st.W + ', 1fr)'; b.style.gridTemplateRows = 'repeat(' + st.H + ', 1fr)';
    for (var y = 0; y < st.H; y++) for (var x = 0; x < st.W; x++) { var c = el('div', 'cell' + (B.inZone(st, 0, y) ? ' zone0' : B.inZone(st, 1, y) ? ' zone1' : '')); c.dataset.x = x; c.dataset.y = y; b.appendChild(c); }
    $('units').innerHTML = ''; $('fx').innerHTML = '';
    st.stones.forEach(function (s) { var d = el('div', 'stone', '<div class="sb"><div class="hp"><i></i></div></div>'); d.dataset.sx = s.x; d.dataset.sy = s.y; $('units').appendChild(d); });
    layout();
  }
  function layout() {
    var w = $('boardWrap').clientWidth - 6; S.cell = w / S.st.W; $('boardWrap').style.setProperty('--cell', S.cell + 'px');
    [].forEach.call(document.querySelectorAll('.stone'), function (d) { d.style.width = d.style.height = S.cell + 'px'; d.style.transform = 'translate(' + d.dataset.sx * S.cell + 'px,' + d.dataset.sy * S.cell + 'px)'; });
    drawUnits();
  }
  addEventListener('resize', function () { if (S.st) layout(); });

  // ---------- Zeichnen ----------
  function unitEl(p) {
    var d = $('units').querySelector('[data-id="' + p.id + '"]');
    if (!d) { d = el('div', 'u s' + p.side); d.dataset.id = p.id; d.innerHTML = '<div class="k"><span class="kj"></span>' + svg(B.U(p).ico) + '<span class="cnt"></span></div><div class="hp"><i></i></div>'; $('units').appendChild(d); }
    return d;
  }
  function drawUnits() {
    var st = S.st;
    st.pcs.forEach(function (p) {
      if (p.n <= 0 && !$('units').querySelector('[data-id="' + p.id + '"]')) return; // gefallen und schon weg
      var d = unitEl(p), on = p.x >= 0 && p.n > 0;
      d.style.display = on || d.classList.contains('dead') ? '' : 'none';
      if (!on) return;
      d.style.width = d.style.height = S.cell + 'px';
      d.style.transform = 'translate(' + p.x * S.cell + 'px,' + p.y * S.cell + 'px)';
      d.classList.toggle('pro', !!p.pro);
      d.querySelector('.kj').textContent = R.KANJI[B.mvType(p)];
      d.querySelector('.cnt').textContent = B.U(p).hero ? Math.round(p.n * 100) + '%' : cnt(p);
      d.querySelector('.hp i').style.width = Math.max(0, p.n / p.n0 * 100) + '%';
      d.classList.toggle('sel', S.sel === p.id); d.classList.toggle('peek', S.peek === p.id);
    });
    st.stones.forEach(function (s) { var d = document.querySelector('.stone[data-sx="' + s.x + '"][data-sy="' + s.y + '"]'); if (d) d.querySelector('.hp i').style.width = st.wallHp / st.wallMax * 100 + '%'; });
  }
  function cellEl(x, y) { return $('board').children[y * S.st.W + x]; }
  function highlights() {
    var st = S.st;
    [].forEach.call($('board').children, function (c) { c.classList.remove('ok', 'atk', 'shoot', 'peek', 'place'); var pv = c.querySelector('.pv'); if (pv) pv.remove(); });
    if (S.phase === 'setup') {
      if (S.chip || S.sel) B.zoneCells(st, S.setupSide).forEach(function (c) { cellEl(c.x, c.y).classList.add('place'); });
      return;
    }
    var p = S.sel ? B.byId(st, S.sel) : S.peek ? B.byId(st, S.peek) : null; if (!p) return;
    B.moves(st, p).forEach(function (m) {
      var c = cellEl(m.x, m.y);
      if (S.peek) { c.classList.add('peek'); return; }
      c.classList.add(m.k === 'move' ? 'ok' : m.k === 'shoot' ? 'shoot' : 'atk');
      if (m.k !== 'move') { var t = preview(p, m); if (t) c.appendChild(el('div', 'pv', t)); }
    });
  }
  // Vorschau: was der Angriff bewirkt (Verluste Ziel / Gegenschlag)
  function preview(p, m) {
    var c = B.clone(S.st), ev = B.apply(c, { id: p.id, x: m.x, y: m.y, k: m.k }), out = '', help = 0;
    ev.forEach(function (e) {
      if (e.t === 'hit' || e.t === 'shoot') out += (e.dead ? '✝' : '−' + num(e.lost));
      if (e.t === 'counter') out += '<br><small>↩' + (e.dead ? '✝' : '−' + num(e.lost)) + '</small>';
      if (e.t === 'help') help++;
      if (e.t === 'stone') out += (e.gone.length ? '💥' : '') + '−' + lvl(e.dmg) + ' St.';
    });
    return out + (help ? '<small> ⚔' + help + '</small>' : '');
  }
  function refresh() {
    var st = S.st, sp = S.phase === 'setup';
    $('setup').classList.toggle('hidden', !sp);
    var stg = $('stage');
    if (sp) { stg.className = 'stage s' + S.setupSide; stg.textContent = SIDE[S.setupSide] + ': Aufstellung'; }
    else if (st.over) { stg.className = 'stage'; stg.textContent = SIDE[st.winner] + ' siegt (' + st.reason + ')'; }
    else { stg.className = 'stage s' + st.turn; stg.textContent = SIDE[st.turn] + ' am Zug' + (S.human[st.turn] ? '' : ' (KI denkt …)'); }
    var wall = B.wallUp(st) ? R.TRIBES[st.tribe[1]].wallName + ' Stufe ' + lvl(B.wallLevel(st)) + '/' + st.wallLvl + ': +' + Math.round((B.wallMult(st) - 1) * 100) + ' % Verteidigung' : st.wallLvl ? 'Mauer geschleift, kein Bonus mehr' : '';
    var ql = B.quietLeft(st), calm = !sp && !st.over && st.quiet >= B.QUIET / 2 ? ' · <b class="warn">Entscheidungsschlacht in ' + ql + ' Zügen ohne Treffer</b>' : '';
    $('meta').innerHTML = '<span><b class="s0">' + R.TRIBES[st.tribe[0]].name + '</b></span><span>' + (sp ? '' : 'Zug ' + (st.moves[0] + st.moves[1] + 1)) + calm + (wall ? ' · ' + wall : '') + '</span><span><b class="s1">' + R.TRIBES[st.tribe[1]].name + '</b></span>';
    $('b-retreat').classList.toggle('hidden', sp || st.over || S.replay || !S.human[0] || st.turn !== 0);
    if (sp) tray();
    drawUnits(); highlights(); info();
  }
  function tray() {
    var t = $('tray'); t.innerHTML = '';
    var res = S.st.pcs.filter(function (p) { return p.side === S.setupSide && p.n > 0 && p.x < 0; });
    if (!res.length) t.appendChild(el('span', 'note', 'Reserve leer: alle Trupps stehen.'));
    res.forEach(function (p) {
      var c = el('div', 'chip' + (S.chip === p.id ? ' sel' : ''), '<i>' + svg(B.U(p).ico) + '</i>' + B.U(p).n + ' ×' + cnt(p));
      c.onclick = function () { S.chip = S.chip === p.id ? null : p.id; S.sel = null; refresh(); }; t.appendChild(c);
    });
    var sel = S.sel && B.byId(S.st, S.sel);
    $('s-split').disabled = !(sel && sel.n >= 2) && !(S.chip && B.byId(S.st, S.chip).n >= 2);
    $('s-back').disabled = !sel;
  }
  function info() {
    var p = S.sel ? B.byId(S.st, S.sel) : S.peek ? B.byId(S.st, S.peek) : S.chip ? B.byId(S.st, S.chip) : null, box = $('info');
    if (!p) { box.classList.add('hidden'); return; }
    var u = B.U(p), mt = B.mvType(p), st = S.st, wb = p.side === 1 && B.wallUp(st) ? ' <span style="color:#ffd76a">(+' + Math.round((B.wallMult(st) - 1) * 100) + ' % Mauer)</span>' : '';
    var sp = [];
    if (u.cav) sp.push('Kavallerie'); if (u.ram) sp.push('senkt die Mauerstufe (1 Ramme = 1 Mauerpunkt)'); if (u.ranged) sp.push('schießt diagonal 1–3 Felder weit, auch über Figuren, ohne Gegenschlag; trifft auch die Mauer (halb so gut wie eine Ramme)');
    if (u.hero) sp.push('Held: % = Lebenskraft'); if (u.chief) sp.push('senkt nach dem Sieg die Zustimmung'); if (p.pro) sp.push('befördert: +25 % Angriff');
    box.classList.remove('hidden');
    box.innerHTML = pattern(p) + '<div class="st"><div class="nm">' + u.n + ' ' + (u.hero ? Math.round(p.n * 100) + ' %' : '×' + cnt(p) + (p.n0 !== p.n ? ' <span class="note">(von ' + p.n0 + ')</span>' : '')) + ' <span class="note">· ' + SIDE[p.side] + '</span></div>' +
      '<div>Angriff ' + Math.round(B.atk(p)) + ' · Verteidigung ' + u.vi + ' / ' + u.vk + ' <span class="note">(gegen Inf./Kav.)</span>' + wb + '</div>' +
      '<div>' + R.KANJI[mt] + ' ' + R.MVNAME[mt] + '</div>' + (sp.length ? '<div class="note">' + sp.join(' · ') + '</div>' : '') + '</div>';
  }
  // 5×5-Zugbild (vorwärts = oben)
  function pattern(p) {
    var mt = B.mvType(p), cells = {}, u = B.U(p);
    (R.STEP[mt] || []).forEach(function (d) { cells[(d[0] + 2) + ',' + (d[1] + 2)] = 's'; });
    (R.SLIDE[mt] || []).forEach(function (d) { for (var i = 1; i <= (u.ranged ? 2 : 2); i++) { var k = (d[0] * i + 2) + ',' + (d[1] * i + 2); if (!cells[k]) cells[k] = i === 1 ? 's' : 'l'; } });
    if (u.ranged) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (d) { for (var i = 1; i <= 2; i++) cells[(d[0] * i + 2) + ',' + (d[1] * i + 2)] = 'r'; });
    var h = '<div class="pat">';
    for (var y = 0; y < 5; y++) for (var x = 0; x < 5; x++) h += '<b class="' + (x === 2 && y === 2 ? 'c' : cells[x + ',' + y] || '') + '"></b>';
    return h + '</div>';
  }
  function log(side, txt) { var d = el('div', side == null ? 'note' : 's' + side, txt); $('log').insertBefore(d, $('log').firstChild); }

  // ---------- Eingabe ----------
  $('boardWrap').addEventListener('pointerdown', function (e) {
    if (!S.st || S.busy) return;
    var r = $('board').getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * S.st.W), y = Math.floor((e.clientY - r.top) / r.height * S.st.H);
    if (x < 0 || y < 0 || x >= S.st.W || y >= S.st.H) return;
    if (S.phase === 'setup') setupTap(x, y); else if (S.phase === 'battle') battleTap(x, y);
  });
  function setupTap(x, y) {
    var st = S.st, side = S.setupSide, p = B.at(st, x, y);
    if (S.chip) {
      var c = B.byId(st, S.chip);
      if (p && p.side === side && p.key === c.key && B.merge(st, c.id, p.id)) { S.chip = null; refresh(); return; } // gleiche Truppe: zusammenlegen
      if (B.inZone(st, side, y) && !p && B.place(st, c.id, x, y)) { S.chip = null; refresh(); return; }
      if (p && p.side === side) { B.unplace(st, p.id); B.place(st, c.id, x, y); S.chip = null; refresh(); return; } // tauschen mit Reserve
    }
    if (S.sel) {
      if (p && p.id === S.sel) { S.sel = null; refresh(); return; }
      if (B.inZone(st, side, y) && (!p || p.side === side)) { B.place(st, S.sel, x, y); S.sel = null; refresh(); return; }
    }
    S.sel = p && p.side === side ? p.id : null; S.chip = null; S.peek = p && p.side !== side ? p.id : null; refresh();
  }
  $('s-split').onclick = function () { var id = S.sel || S.chip; if (!id) return; var q = B.split(S.st, id); if (!q) { log(null, 'Kein Platz mehr in der Startzone zum Teilen.'); return; } S.chip = q.id; S.sel = null; refresh(); };
  $('s-back').onclick = function () { if (S.sel) { B.unplace(S.st, S.sel); S.sel = null; refresh(); } };
  $('s-auto').onclick = function () { B.autoPlace(S.st, S.setupSide, false); S.sel = S.chip = null; refresh(); };
  $('s-done').onclick = function () {
    var st = S.st;
    if (!B.ready(st, S.setupSide)) { B.autoPlace(st, S.setupSide, true); if (!B.ready(st, S.setupSide)) { log(null, 'Nicht alle Trupps haben Platz: zusammenlegen oder in die Reserve.'); refresh(); return; } }
    S.sel = S.chip = S.peek = null;
    if (S.prep === 'def') { refresh(); pickStance(); return; }
    if (S.setupSide === 0 && S.human[1]) { S.setupSide = 1; log(null, 'Jetzt stellt der Verteidiger auf.'); refresh(); return; }
    begin();
  };
  function battleTap(x, y) {
    var st = S.st; if (st.over) return;
    var p = B.at(st, x, y), human = S.human[st.turn];
    if (S.sel && human) {
      var sel = B.byId(st, S.sel), mv = B.moves(st, sel).filter(function (m) { return m.x === x && m.y === y; })[0];
      if (mv) { doMove({ id: sel.id, x: x, y: y, k: mv.k }); return; }
    }
    if (p && p.side === st.turn && human) { S.sel = S.sel === p.id ? null : p.id; S.peek = null; }
    else if (p) { S.peek = S.peek === p.id ? null : p.id; S.sel = null; }
    else { S.sel = S.peek = null; }
    refresh();
  }

  // ---------- Ablauf ----------
  function nextTurn() {
    var st = S.st; refresh();
    if (st.over) { setTimeout(result, 700); return; }
    if (S.replay) {
      var rm = S.rec.moves[S.ri++]; if (!rm) return;
      setTimeout(function () { if (S.st !== st) return; if (rm.k === 'retreat') { B.retreat(st); log(0, 'Angreifer tritt den Rückzug an'); nextTurn(); } else doMove(rm); }, 450);
      return;
    }
    if (A.wantsRetreat(st)) { B.retreat(st); S.rec.moves.push({ k: 'retreat' }); log(0, 'Angreifer tritt den Rückzug an (Verlust ' + Math.round(B.lostPct(st, 0) * 100) + ' %)'); setTimeout(nextTurn, 600); return; }
    if (!S.human[st.turn]) { S.busy = true; setTimeout(function () { var m = A.best(st, 700); S.busy = false; if (m) doMove(m); }, 350); }
  }
  function nm(p) { var u = B.U(p); return u.n + (u.hero ? '' : ' ×' + cnt(p)); }
  async function doMove(m) {
    var st = S.st, p = B.byId(st, m.id), t = B.at(st, m.x, m.y), side = p.side, before = nm(p), tb = t ? nm(t) : '';
    if (S.rec && !S.replay) S.rec.moves.push({ id: m.id, x: m.x, y: m.y, k: m.k });
    S.busy = true; S.sel = S.peek = null; highlights();
    var cur = { x: p.x, y: p.y }, ev = B.apply(st, m), txt = '';
    var ord = function (e) { return e.before ? 0 : e.t === 'help' ? 2 : 1; };
    ev.sort(function (a, b) { return ord(a) - ord(b); }); // erst heranlaufen, dann zuschlagen, dann die Nachbarn
    try { await playEvents(); } catch (err) { console.error('Shovian-Anzeige', err); } // Anzeige-Fehler dürfen das Gefecht nicht blockieren
    if (m.k === 'move') txt = ' zieht';
    log(side, before + txt);
    drawUnits(); S.busy = false; nextTurn();
    async function playEvents() {
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      if (e.t === 'move') { var mvEl = unitEl(p); mvEl.style.transform = 'translate(' + e.x * S.cell + 'px,' + e.y * S.cell + 'px)'; cur = { x: e.x, y: e.y }; await sleep(270); }
      else if (e.t === 'hit' || e.t === 'shoot') {
        if (e.t === 'shoot') await shot(p, e);
        else await lunge(p, cur, e);
        hitFx(e.tid, '−' + (B.U(B.byId(st, e.tid)).hero ? Math.round(e.lost * 100) + '%' : num(e.lost)), e.dead);
        txt += (e.t === 'shoot' ? ' beschießt ' : ' greift an: ') + tb + (e.dead ? ' fällt' : ' verliert ' + num(e.lost));
        await sleep(420);
      } else if (e.t === 'counter') { hitFx(e.tid, '−' + num(e.lost), e.dead); txt += e.dead ? ' · Angriff gescheitert, ' + before + ' fällt' : ' · eigene Verluste −' + num(e.lost); await sleep(420); }
      else if (e.t === 'help') { hitFx(e.id, '−' + num(e.lost), e.dead); txt += ' · ' + B.U(B.byId(st, e.id)).n + ' (mitgekämpft) −' + num(e.lost) + (e.dead ? ' ✝' : ''); await sleep(260); }
      else if (e.t === 'stone') {
        if (m.k === 'shoot') await shot(p, e);
        floatTxt(e.x, e.y, '−' + lvl(e.dmg) + ' Stufen' + (e.gone.length ? ', Bresche!' : ''), 'grey');
        e.gone.forEach(function (g) { var sd = document.querySelector('.stone[data-sx="' + g.x + '"][data-sy="' + g.y + '"]'); if (sd) sd.classList.add('gone'); });
        txt += ' trifft die Mauer (−' + lvl(e.dmg) + ' Stufen' + (e.gone.length ? ', ' + e.gone.length + ' Stein' + (e.gone.length > 1 ? 'e' : '') + ' eingestürzt' : '') + ')';
        drawUnits(); await sleep(420);
      } else if (e.t === 'final') { st.final = e; banner('Entscheidungsschlacht! ' + num(e.A) + ' gegen ' + num(e.D)); txt += ' · Entscheidungsschlacht: Angriff ' + num(e.A) + ' gegen Verteidigung ' + num(e.D); drawUnits(); await sleep(1600); }
      else if (e.t === 'wallDown') { banner('Mauer geschleift! Kein Verteidigungsbonus mehr'); await sleep(900); }
      else if (e.t === 'promo') { var d = unitEl(p); d.classList.add('glow'); setTimeout(function () { d.classList.remove('glow'); }, 1300); floatTxt(p.x, p.y, '⬆ befördert', 'gold'); txt += ', befördert'; await sleep(500); }
    }
    }
  }
  // Nahkampf sichtbar machen: Trupp stößt ein Stück aufs Ziel vor
  function lunge(p, cur, e) {
    var d = unitEl(p), k = 0.38 * S.cell, dx = Math.sign(e.x - cur.x) * k, dy = Math.sign(e.y - cur.y) * k;
    d.style.transform = 'translate(' + (cur.x * S.cell + dx) + 'px,' + (cur.y * S.cell + dy) + 'px)';
    return sleep(150);
  }
  function hitFx(id, t, dead) {
    var q = B.byId(S.st, id), d = unitEl(q); d.classList.add('flash'); setTimeout(function () { d.classList.remove('flash'); }, 340);
    floatTxt(q.x, q.y, t);
    if (dead) { d.classList.add('dead'); setTimeout(function () { d.remove(); }, 450); }
    drawUnits();
  }
  function floatTxt(x, y, t, cls) { var f = el('div', 'dmg' + (cls ? ' ' + cls : ''), t); f.style.left = (x + .5) * S.cell + 'px'; f.style.top = (y + .5) * S.cell + 'px'; $('fx').appendChild(f); setTimeout(function () { f.remove(); }, 1150); }
  function banner(t) { var b = el('div', 'banner', t); $('boardWrap').appendChild(b); setTimeout(function () { b.remove(); }, 1850); }
  function shot(p, e) {
    var s = el('div', 'shot'); s.style.left = (p.x + .5) * S.cell + 'px'; s.style.top = (p.y + .5) * S.cell + 'px'; $('fx').appendChild(s);
    void s.offsetWidth; s.style.transform = 'translate(' + (e.x - p.x) * S.cell + 'px,' + (e.y - p.y) * S.cell + 'px)'; // ohne rAF: hängt sonst in Hintergrund-Tabs
    return sleep(360).then(function () { s.remove(); });
  }

  // ---------- Ergebnis ----------
  function result() {
    var st = S.st, h = '<h2>' + SIDE[st.winner] + ' siegt</h2><p class="note">' + ({ vernichtet: 'Alle Truppen der anderen Seite sind gefallen.', 'Rückzug': 'Der Angreifer hat sich zurückgezogen. Die Überlebenden ziehen heim.', Entscheidungsschlacht: (st.final ? 'Angriff ' + num(st.final.A) + ' gegen Verteidigung ' + num(st.final.D) + ': ' : '') + 'Alle verbliebenen Truppen sind in einer offenen Schlacht aufeinandergeprallt (Travian-Formel).' }[st.reason] || '') + '</p>';
    [0, 1].forEach(function (side) {
      h += '<h3>' + SIDE[side] + ' (' + R.TRIBES[st.tribe[side]].name + ') · Verlust ' + Math.round(B.lostPct(st, side) * 100) + ' %</h3><table class="res">';
      var by = {};
      st.pcs.forEach(function (p) { if (p.side !== side) return; var s0 = S.start.filter(function (x) { return x.id === p.id; })[0]; var k = p.key; by[k] = by[k] || { a: 0, b: 0, u: B.U(p) }; by[k].a += s0 ? s0.n : p.n0; by[k].b += Math.max(0, p.n); });
      Object.keys(by).forEach(function (k) { var x = by[k]; h += '<tr><td>' + x.u.n + '</td><td>' + (x.u.hero ? '100 %' : x.a) + '</td><td>→</td><td>' + (x.u.hero ? Math.round(x.b * 100) + ' %' : Math.floor(x.b + 1e-9)) + '</td></tr>'; });
      h += '</table>';
    });
    if (S.prep === 'att' && !S.replay) h += '<p class="note">Der Verteidiger bekäme jetzt eine Nachricht und kann sich die Wiederholung ansehen.</p>';
    h += '<div class="ctrl"><button class="btn" id="r-menu">Menü</button>' + (S.rec ? '<button class="btn" id="r-replay">▶ Wiederholung</button>' : '') + '<button class="btn go" id="r-again">Nochmal</button></div>';
    modal(h);
    $('r-menu').onclick = function () { closeModal(); menu(); };
    if (S.rec) $('r-replay').onclick = function () { closeModal(); replay(); };
    $('r-again').onclick = function () { closeModal(); start(JSON.parse(JSON.stringify(S.cfg)), S.title, S.again); };
  }
  function modal(h) { $('modalBox').innerHTML = h; $('modal').classList.remove('hidden'); }
  function closeModal() { $('modal').classList.add('hidden'); }
  $('modal').addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal(); });
  $('b-retreat').onclick = function () {
    var st = S.st; if (!st || st.over || S.busy || st.turn !== 0) return;
    modal('<h2>Rückzug?</h2><p class="note">Die Überlebenden ziehen heim, der Verteidiger hält.</p><div class="ctrl"><button class="btn" id="rt-no">Weiterkämpfen</button><button class="btn go" id="rt-yes">Rückzug</button></div>');
    $('rt-no').onclick = function () { $('modal').classList.add('hidden'); };
    $('rt-yes').onclick = function () { $('modal').classList.add('hidden'); if (st.over || S.st !== st) return; B.retreat(st); if (S.rec) S.rec.moves.push({ k: 'retreat' }); log(0, 'Angreifer tritt den Rückzug an'); nextTurn(); };
  };
  $('b-menu').onclick = function () { S.st = null; S.phase = 'menu'; menu(); };
  $('b-help').onclick = function () {
    modal('<h2>So geht das Gefecht</h2><ul>' +
      '<li><b>Jede Figur ist ein Trupp</b> mit Anzahl. Sie zieht wie die Shogi-Figur in der Ecke (歩 金 銀 桂 香 角 飛 王).</li>' +
      '<li><b>Zug auf einen Gegner = Kampf.</b> Gewinnst du, fällt der Gegner und du rückst nach. Verlierst du, fällt dein Trupp. Rote Zahl über dem Ziel: sein Verlust (✝ = fällt), ↩ = dein Verlust.</li>' +
      '<li><b>Unterstützung:</b> Alle Trupps beider Seiten, die an das umkämpfte Feld grenzen, kämpfen mit und teilen das Ergebnis. Zusammenbleiben lohnt sich, einzelne Trupps sind leichte Beute.</li>' +
      '<li><b>Beförderung:</b> In den gegnerischen Startreihen wird ein Trupp befördert (+25 % Angriff, zieht wie Gold), nur für dieses Gefecht.</li>' +
      '<li><b>Kampf wie Travian:</b> Angreifer zählen mit Angriff, Verteidiger mit Verteidigung (gegen Infanterie bzw. Kavallerie), egal wer zieht. Der Schwächere fällt ganz, der Stärkere verliert (schwach/stark)<sup>1,5</sup>. Die Vorschau zeigt es vorher.</li>' +
      '<li><b>Mauer:</b> Bonus wie Travian (Römer 1,03<sup>Stufe</sup>, Gallier 1,025, Germanen 1,02), nur für Verteidiger hinter der Mauer. Rammen senken die Stufe (je Ramme 1 Mauerpunkt, Stufe 5 hat 9, Stufe 10 hat 25), Katapulte halb so stark aus der Ferne. Mit der Stufe stürzen Steine ein.</li>' +
      '<li><b>Ende:</b> Kein Zuglimit. Wer keine Truppen mehr hat, verliert. Der Angreifer kann jederzeit den <b>Rückzug</b> antreten. Gibt es ' + B.QUIET / 2 + ' Züge je Seite keinen Treffer, prallen alle Truppen in einer <b>Entscheidungsschlacht</b> aufeinander (ein Travian-Kampf).</li>' +
      '<li>Gegnerische Figur antippen zeigt ihre Züge (weiß).</li></ul><div class="ctrl"><button class="btn" onclick="document.getElementById(\'modal\').classList.add(\'hidden\')">OK</button></div>');
  };

  window.Shovian = { S: S, start: start, menu: menu, doMove: doMove }; // doMove nur für Tests
  menu();
})();
