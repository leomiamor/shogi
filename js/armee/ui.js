// Armee-Modus: Bedienung. Planen (Laden, Aufstellen, Überläufer, Befehle, Aufwerten), Probelauf,
// Schlacht-Wiedergabe in Takten (Pause, Schritt, Tempo, Überspringen), Reaktion, Rundenbericht. KI oder zu zweit an einem Gerät.
(function () {
  'use strict';
  var T = AK.TYPES, N = AK.N, R = AK.R;
  var MASK = { fu: 'FU', ky: 'KY', ke: 'KE', gi: 'GI', ki: 'KI', ka: 'KA', hi: 'HI', ou: 'OU', to: 'TO', ny: 'NY', nk: 'NK', ng: 'NG', um: 'UM', ry: 'RY' };
  var SHORT = { fu: 'Bau', ky: 'Lan', ke: 'Spr', gi: 'Sil', ki: 'Gol', ka: 'Läu', hi: 'Tur', ou: 'Herr', to: 'Bau+', ny: 'Lan+', nk: 'Spr+', ng: 'Sil+', um: 'Pfd', ry: 'Dra' };
  var SAVE = 'armee.v1';
  var $ = function (s) { return document.querySelector(s); };
  var opt = { big: false, lab: 'kanji', react: true, hc: 0, danger: true, lvl: 1, snd: true, clock: 0, d3: !!(window.AK3D && AK3D.supported()) }; // hc: Gold pro Runde für die KI bzw. Spieler 2 (−2 … +2)
  try { var o0 = JSON.parse(localStorage.getItem('armee.opt') || '{}'); if (o0.big) opt.big = true; if (o0.lab) opt.lab = o0.lab; if (o0.react === false) opt.react = false; if (o0.hc) opt.hc = o0.hc; if (o0.danger === false) opt.danger = false; if (o0.lvl != null) opt.lvl = o0.lvl; if (o0.snd === false) opt.snd = false; if (o0.clock) opt.clock = o0.clock; if (o0.d3 === false) opt.d3 = false; } catch (e) { }
  function saveOpt() { try { localStorage.setItem('armee.opt', JSON.stringify(opt)); } catch (e) { } }

  // ---------- Ton: wenige kurze Samples (CC0, snd/credits.txt), laden erst bei der ersten Schlacht ----------
  var SND = (function () {
    var ctx = null, out = null, buf = {}, last = {}, voices = 0, loading = false;
    var FILES = { clash: ['clash1', 'clash2', 'clash3'], hit: ['body1', 'body2', 'hit1', 'hit2'], die: ['die1', 'die2', 'die3'], drum: ['drum1', 'drum2'], cheer: ['cheer'], horn: ['horn'], promo: ['cut1'] };
    var VOL = { clash: .35, hit: .45, die: .4, drum: .6, cheer: .5, horn: .45, promo: .4 }, GAP = { clash: 60, hit: 60, die: 250, drum: 200, cheer: 2000, horn: 2000, promo: 300 };
    function init() {
      if (ctx || !opt.snd) return; var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); out = ctx.createGain(); out.gain.value = window.AK_MUTE ? 0 : 1; out.connect(ctx.destination);
    }
    function load() {
      if (!ctx || loading) return; loading = true;
      Object.keys(FILES).forEach(function (k) { FILES[k].forEach(function (f) { fetch('snd/' + f + '.mp3').then(function (r) { return r.arrayBuffer(); }).then(function (a) { return new Promise(function (ok, no) { ctx.decodeAudioData(a, ok, no); }); }).then(function (b) { (buf[k] = buf[k] || []).push(b); }).catch(function () { }); }); });
    }
    function play(k, delay) {
      if (!opt.snd || !ctx || document.hidden || !buf[k] || voices >= 6) return;
      var now = performance.now(); if (last[k] && now - last[k] < GAP[k]) return; last[k] = now;
      if (ctx.state === 'suspended') ctx.resume();
      var src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf[k][Math.floor(Math.random() * buf[k].length)];
      src.playbackRate.value = 0.92 + Math.random() * 0.16; g.gain.value = VOL[k]; src.connect(g); g.connect(out);
      voices++; src.onended = function () { voices--; }; src.start(ctx.currentTime + (delay || 0));
      if (window.AK_SNDLOG) window.AK_SNDLOG.push(k);
    }
    // erstes Tippen: Audio darf erst nach einer Geste starten (Handy)
    document.addEventListener('pointerdown', function () { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }, { capture: true });
    return { init: init, load: load, play: play, mute: function (m) { if (out) out.gain.value = m ? 0 : 1; } };
  })();

  // S: ganzer Spielzustand der Seite
  var S = null;
  function names(p) { return S.mode === 'ki' ? (p === 0 ? 'Du' : 'KI') : S.mode === 'net' ? (p === S.me ? 'Du' : 'Gegner') : 'Spieler ' + (p + 1); }

  // ---------- Start ----------
  function newMatch(mode) {
    var seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    S = { mode: mode, lvl: opt.lvl, g: AK.newGame(seed, [0, mode === 'ki' ? 0 : opt.hc]), acts: [[], []], reacts: [[], []], viewer: 0, stage: 'plan', sel: null, log: [] };
    S.log.push({ t: 'Runde 1', s: 'Die Armeen stehen. Kaufe Truppen und stelle sie in deinen 3 Reihen auf.' });
    show('game'); beginPlan(0);
  }
  function save() { try { if (S && S.g.over == null && (S.stage === 'plan' || S.stage === 'handover') && S.viewer === 0 && !S.acts[0].length) localStorage.setItem(SAVE, JSON.stringify({ mode: S.mode, lvl: S.lvl, g: S.g, log: S.log.slice(-60) })); else if (S && S.g.over != null) localStorage.removeItem(SAVE); } catch (e) { } }
  function resume() {
    var d; try { d = JSON.parse(localStorage.getItem(SAVE)); } catch (e) { } if (!d) return;
    S = { mode: d.mode, lvl: d.lvl != null ? d.lvl : 1, g: d.g, acts: [[], []], reacts: [[], []], viewer: 0, stage: 'plan', sel: null, log: d.log || [] };
    show('game'); beginPlan(0);
  }
  // 3D-Schlachtfeld: lädt im Hintergrund, sobald eine Partie offen ist; bis dahin läuft die Schlacht in 2D
  function load3d() { if (opt.d3 && window.AK3D && AK3D.state === 'off') AK3D.load().then(function () { if (S && S.stage !== 'battle') render(); }).catch(function () { }); }
  if (window.AK3D) {
    AK3D.onCell = function (x, y) { clickCell(x, y); };
    // über jedem Regiment in der Planung: Kanji, Sterne, Halten
    AK3D.badge = function (u) { return '<span class="v3k" style="--km:url(img/koma/' + MASK[u.t] + '.svg)"></span>' + (u.lv ? '<span class="v3s">' + '★'.repeat(u.lv) + '</span>' : '') + (u.ord === 'halt' && u.t !== 'ou' && S.g.round < R.pattRound ? '🛡' : ''); };
  }
  // Planung und Warten in 3D (Brett darunter bleibt für 2D); Partieende: Bild friert ein
  function plan3d(w, marks) {
    if (S.stage === 'over') { if (S.d3) AK3D.freeze(5000); return; }
    var on = opt.d3 && window.AK3D && AK3D.state === 'ready' && S.stage !== 'handover';
    $('#boardWrap').classList.toggle('d3', !!on);
    if (!on) { if (S.d3) { S.d3 = false; AK3D.hide(); } return; }
    var sel = S.sel && S.sel.id && AK.unit(w, S.sel.id);
    S.d3 = AK3D.plan($('#v3d'), w, flipped(), marks, sel ? sel.y * N + sel.x : -1);
    if (!S.d3) $('#boardWrap').classList.remove('d3');
  }
  if (window.AK3D) AK3D.onSlow = function () { opt.d3 = false; saveOpt(); applyOpt(); AK3D.hide(); toast('3D ruckelt auf diesem Gerät – Schlacht wieder in 2D (im Menü einschaltbar)'); };
  function show(w) {
    $('#scr-menu').classList.toggle('hidden', w !== 'menu'); $('#scr-game').classList.toggle('hidden', w !== 'game');
    $('#boardWrap').classList.remove('d3'); if (window.AK3D) AK3D.hide(); if (w === 'game') load3d();
    if (w === 'menu') { $('#m-resume').classList.toggle('hidden', !hasSave()); $('#m-netlist').innerHTML = netList().map(function (x) { return '<button class="btn small" data-net="' + x.code + '">↻ Online-Partie ' + x.code + '</button>'; }).join(''); }
  }
  function hasSave() { try { return !!localStorage.getItem(SAVE); } catch (e) { return false; } }

  // ---------- Ansicht der Planung: Grundstand + eigene Aktionen ----------
  function view() {
    var w = AK.clone(S.g); w.drops = [0, 0];
    if (S.stage === 'react') { S.reacts[S.viewer].forEach(function (a) { AK.apply(w, S.viewer, a, 'react'); }); }
    else S.acts[S.viewer].forEach(function (a) { AK.apply(w, S.viewer, a, 'plan'); });
    return w;
  }
  function myActs() { return S.stage === 'react' ? S.reacts[S.viewer] : S.acts[S.viewer]; }
  // Entwurf der laufenden Planung sichern (Handy-Browser werfen Tabs im Hintergrund weg)
  function draftKey() { return (S.mode === 'net' ? S.net.code : S.mode + S.g.seed) + '/' + S.g.round + '/' + S.stage + '/' + S.viewer; }
  function saveDraft() { if (!S || S.mode === 'hot' || (S.stage !== 'plan' && S.stage !== 'react')) return; try { localStorage.setItem('armee.draft', JSON.stringify({ k: draftKey(), a: myActs() })); } catch (e) { } }
  function loadDraft() { try { var d = JSON.parse(localStorage.getItem('armee.draft') || 'null'); if (d && d.k === draftKey() && d.a.length) { var w = AK.clone(S.g); w.drops = [0, 0]; var ok = d.a.filter(function (a) { return !AK.apply(w, S.viewer, a, S.stage); }); myActs().length = 0; Array.prototype.push.apply(myActs(), ok); if (ok.length) S.log.push({ t: 'Runde ' + S.g.round, s: 'Deine angefangene Planung ist wieder da.' }); } } catch (e) { } }

  function beginPlan(p) {
    if (S.mode === 'net') { S.viewer = S.me; S.sel = null; S.acts = [[], []]; S.nph = 'plan'; if (ent(S.net.st, S.g.round, 'plan', S.me)) { S.stage = 'wait'; return netTry(); } S.stage = 'plan'; loadDraft(); return render(); }
    S.viewer = p; S.sel = null;
    if (S.mode === 'hot') { S.stage = 'handover'; cover(names(p) + ' plant', 'Gerät an ' + names(p) + ' geben. Der andere schaut bitte weg.', 'Ich bin ' + names(p) + ' – los', function () { S.stage = 'plan'; render(); }); }
    else { S.stage = 'plan'; loadDraft(); }
    save(); render();
  }
  // Reaktion nur, wenn man einen Überläufer einsetzen kann (sonst spart das im Zu-zweit-Modus zwei Gerätewechsel)
  function needReact(p) { return S.g.hand[p].length > 0 && S.g.units.some(function (u) { return u.p === p && u.t === 'ou'; }); }
  function beginReact(p) {
    if (p === -1) return submitReact(true);
    if (!needReact(p)) { if (S.mode === 'hot' && p === 0) return beginReact(needReact(1) ? 1 : -1); return submitReact(true); }
    S.viewer = p; S.sel = null;
    var go = function () { S.stage = 'react'; render(); };
    if (S.mode === 'hot') { S.stage = 'handover'; cover('Reaktion: ' + names(p), 'Kurze Pause in der Schlacht. ' + names(p) + ' darf Befehle ändern und 1 Überläufer einsetzen.', 'Ich bin ' + names(p) + ' – los', go); }
    else go();
    render();
  }

  // ---------- Darstellung ----------
  function pos(x, y) { return flipped() ? [N - 1 - x, N - 1 - y] : [x, y]; }
  function flipped() { return S.mode === 'net' ? S.me === 1 : S.viewer === 1 && S.stage !== 'battle' && S.mode === 'hot'; }
  function unitHTML(u, extra) {
    var pro = !!T[u.t].base, lab = opt.lab === 'kanji' ? '<i class="kj" style="--km:url(img/koma/' + MASK[u.t] + '.svg)"></i>' : '<span class="tx">' + SHORT[u.t] + '</span>';
    return '<div class="u p' + u.p + ((u.p === 1) !== flipped() ? ' down' : '') + (pro ? ' pro' : '') + (extra || '') + '" data-id="' + u.id + '">' +
      '<div class="k">' + lab + '</div><div class="hp"><i style="width:' + Math.max(0, 100 * u.hp / u.mhp) + '%"></i></div>' +
      (u.lv ? '<span class="lv">' + '★'.repeat(u.lv) + '</span>' : '') + (u.ord === 'halt' && u.t !== 'ou' && S.g.round < R.pattRound ? '<span class="hold">🛡</span>' : '') + '</div>';
  }
  function place(el, x, y) { var q = pos(x, y); el.style.transform = 'translate(' + q[0] * 100 + '%,' + q[1] * 100 + '%)'; }
  function drawBoard(w, marks) {
    var b = $('#board'), h = '';
    for (var dy = 0; dy < N; dy++) for (var dx = 0; dx < N; dx++) {
      var xy = flipped() ? [N - 1 - dx, N - 1 - dy] : [dx, dy], x = xy[0], y = xy[1], c = 'cell';
      if (AK.ownRows(0, y, 3)) c += ' zone0'; else if (AK.ownRows(1, y, 3)) c += ' zone1';
      var m = marks && marks[y * N + x]; if (m) c += ' ' + m;
      h += '<div class="' + c + '" data-x="' + x + '" data-y="' + y + '"></div>';
    }
    b.innerHTML = h;
    var U = $('#units'), uh = '', isNew = {};
    if (S.stage === 'plan' || S.stage === 'react') (S.newIds || []).forEach(function (i) { isNew[i] = 1; });
    w.units.forEach(function (u) { if (u.hp > 0) uh += unitHTML(u, (S.sel && S.sel.id === u.id ? ' sel' : '') + (isNew[u.id] ? ' new' : '')); });
    U.innerHTML = uh;
    U.querySelectorAll('.u').forEach(function (el) { var u = AK.unit(w, +el.dataset.id); place(el, u.x, u.y); });
    var cs = b.getBoundingClientRect().width / N; document.documentElement.style.setProperty('--cell', cs + 'px');
  }
  function patCells(u, x, y) { // Felder, die die Truppe von (x, y) aus angreifen kann (ohne Blockaden)
    var out = [], s = AK.fwd(u.p);
    T[u.t].pat.forEach(function (m) { for (var k = 1; k <= m.r; k++) { var tx = x + m.d[0] * k, ty = y + m.d[1] * k * s; if (tx < 0 || ty < 0 || tx >= N || ty >= N) break; out.push([tx, ty]); } });
    return out;
  }
  function patHTML(t) { // 5×5-Bild der Angriffsrichtungen aus eigener Sicht
    var g = [], i; for (i = 0; i < 25; i++) g.push('');
    g[12] = 'c';
    T[t].pat.forEach(function (m) { for (var k = 1; k <= Math.min(m.r, 2); k++) { var x = 2 + m.d[0] * k, y = 2 + m.d[1] * k; if (x < 0 || y < 0 || x > 4 || y > 4) break; g[y * 5 + x] = m.leap ? 'j' : m.r > 1 ? 'l' : 's'; } });
    return '<div class="pat">' + g.map(function (c) { return '<b class="' + c + '"></b>'; }).join('') + '</div>';
  }
  function patText(t) {
    var P = T[t].pat, txt = [];
    var ln = P.filter(function (m) { return m.r > 1; });
    if (ln.length) txt.push('Reichweite ' + ln[0].r + (ln[0].over ? ', schießt über eigene Truppen' : ''));
    if (P.some(function (m) { return m.leap; })) txt.push('springt, läuft 2 Felder pro Takt');
    return txt.join(' · ');
  }
  function infoCard(u, w, p) {
    var mine = u.p === S.viewer, base = T[u.t].base || u.t, h = '';
    h += patHTML(u.t) + '<div class="stats"><div class="nm">' + nm(u) + (u.lv ? ' ' + '★'.repeat(u.lv) : '') + '</div>';
    h += '<div>Leben <b>' + u.hp + '/' + u.mhp + '</b> · Schaden <b>' + u.atk + '</b></div>';
    var pt = patText(u.t); if (pt) h += '<div class="note">' + pt + '</div>';
    if (T[u.t].pr) h += '<div class="note">In der Gegnerzone befördert zu ' + T[T[u.t].pr].n + '.</div>';
    if (u.t === 'ou') h += '<div class="note">Fällt er, ist die Partie verloren. Heilt 2 pro Runde.</div>';
    if (mine && w.over == null) {
      h += '<div class="row" style="margin-top:6px">';
      if (u.t === 'ou') h += '<span class="note">Der Feldherr hält immer seine Stellung.</span>';
      else if (w.round >= R.pattRound) h += '<span class="note">Generalangriff: alle rücken vor.</span>';
      else h += '<button class="btn small' + (u.ord === 'vor' ? ' on' : '') + '" data-ord="vor">' + (u.ord === 'vor' ? '✓ ' : '') + '⚔ Vorrücken</button><button class="btn small' + (u.ord === 'halt' ? ' on' : '') + '" data-ord="halt">' + (u.ord === 'halt' ? '✓ ' : '') + '🛡 Halten (+' + R.holdAtk + ' Schaden)</button>';
      if (S.stage === 'plan' && u.t !== 'ou') { var c = R.up.cost(base); h += '<button class="btn small" data-up="1"' + (AK.canDo(w, p, { k: 'up', id: u.id }) ? ' disabled' : '') + '>★ Aufwerten (' + c + ' Gold, +' + R.up.hp + ' Leben, +' + R.up.atk + ' Schaden)</button>'; }
      h += '</div>';
    }
    h += '</div>';
    return h;
  }
  function typeCard(t, p) {
    var u = { t: t, p: p, hp: T[t].hp, mhp: T[t].hp, atk: T[t].atk, lv: 0, ord: 'vor' };
    return patHTML(t) + '<div class="stats"><div class="nm">' + T[t].n + ' · ' + T[t].cost + ' Gold</div><div>Leben <b>' + u.hp + '</b> · Schaden <b>' + u.atk + '</b></div>' +
      (patText(t) ? '<div class="note">' + patText(t) + '</div>' : '') + (T[t].pr ? '<div class="note">In der Gegnerzone befördert zu ' + T[T[t].pr].n + '.</div>' : '') + '</div>';
  }
  function render() {
    if (!S) return;
    if (!S.g) { if (S.d3) { S.d3 = false; AK3D.hide(); } $('#boardWrap').classList.remove('d3'); $('#g-stage').textContent = 'Verbinde mit Partie ' + S.net.code + ' …'; ['#pane-plan', '#ctrl-plan', '#ctrl-play', '#info'].forEach(function (q) { $(q).classList.add('hidden'); }); return; }
    var g = S.g, p = S.viewer, planning = S.stage === 'plan' || S.stage === 'react';
    var w = planning ? view() : S.stage === 'wait' ? waitView() : S.disp || g;
    $('#g-round').textContent = 'Runde ' + g.round;
    $('#g-who').innerHTML = '<span class="p' + p + 'c">' + names(p) + '</span>';
    $('#g-gold').textContent = w.gold[p];
    var st = { plan: 'Planung – ' + names(p), react: 'Reaktion – ' + names(p) + (R.reactFree ? ' (Befehle, 1 Überläufer gratis)' : ' (Befehle, 1 Überläufer)'), battle: S.probe ? 'Probelauf (zählt nicht)' : 'Schlacht – Teil ' + (S.phase + 1), handover: 'Bitte warten …', over: 'Partie vorbei', wait: waitText() }[S.stage] || '';
    $('#g-stage').textContent = st;
    $('#pane-plan').classList.toggle('hidden', !planning);
    $('#lbl-shop').classList.toggle('hidden', S.stage !== 'plan');
    $('#ctrl-plan').classList.toggle('hidden', !planning);
    $('#ctrl-play').classList.toggle('hidden', S.stage !== 'battle');
    $('#b-probe').classList.toggle('hidden', S.stage !== 'plan');
    $('#b-undo').disabled = !myActs().length;
    $('#b-done').textContent = S.stage === 'react' ? 'Weiter kämpfen' : 'Fertig';
    // Markierungen
    var marks = {};
    if (planning && S.sel) {
      if (S.sel.shop != null || S.sel.hand != null) {
        var rows = S.sel.shop != null ? 3 : 4;
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (AK.ownRows(p, y, rows) && !AK.at(w, x, y)) marks[y * N + x] = 'ok';
      } else if (S.sel.id) {
        var su = AK.unit(w, S.sel.id);
        if (su) { patCells(su, su.x, su.y).forEach(function (c) { marks[c[1] * N + c[0]] = 'reach'; }); AK.targetsFrom(w, su, su.x, su.y).forEach(function (e) { marks[e.y * N + e.x] = 'hit'; }); }
      }
    }
    if (planning && opt.danger) w.units.forEach(function (e) { if (e.p !== p && e.hp > 0) patCells(e, e.x, e.y).forEach(function (c) { var k = c[1] * N + c[0]; if (!marks[k]) marks[k] = 'danger'; }); });
    $('#b-danger').classList.toggle('on', opt.danger); $('#b-danger').classList.toggle('hidden', !planning);
    // Lage: beide Seiten auf einen Blick
    var kh = function (q) { var k = w.units.filter(function (u) { return u.p === q && u.t === 'ou'; })[0]; return k ? Math.max(0, k.hp) : 0; };
    var tr = function (q) { return w.units.filter(function (u) { return u.p === q && u.t !== 'ou' && u.hp > 0; }).length; };
    $('#g-net').classList.toggle('hidden', S.mode !== 'net');
    if (S.mode === 'net') $('#g-net').innerHTML = (S.net.status === 'online' ? '<span style="color:var(--good)">● online</span>' : '<span style="color:var(--bad)">● ' + (S.net.status || 'verbinde') + ' …</span>') + ' · ' + peerText() + (S.net.st && !S.net.st.seats[1] ? ' · <button class="btn small" id="g-share">Link an Gegner schicken</button>' : '');
    document.title = (S.stage === 'plan' || S.stage === 'react') && S.mode === 'net' && ent(S.net.st, S.g.round, S.nph, 1 - S.me) ? '⚔ Du bist dran – Armee' : 'Armee';
    $('#g-sides').innerHTML = [p, 1 - p].map(function (q) { return '<span class="p' + q + 'c">' + names(q) + '</span> 王 ' + kh(q) + '/' + T.ou.hp + ' · ' + tr(q) + ' Truppen · ' + (q === p ? '' : '<span class="gold">' + g.gold[q] + '</span> Gold · ') + w.hand[q].length + ' Überl.'; }).join('<br>');
    if (S.stage !== 'battle') { drawBoard(w, marks); plan3d(w, marks); }
    // Laden
    var shop = $('#shop');
    shop.innerHTML = S.stage === 'plan' ? w.offers[p].map(function (o, i) {
      var c = 'card' + (o.sold ? ' sold' : '') + (S.sel && S.sel.shop === i ? ' sel' : '') + (!o.sold && w.gold[p] < T[o.t].cost ? ' poor' : '');
      return '<button class="' + c + '" data-shop="' + i + '"><div class="ck"><i style="--km:url(img/koma/' + MASK[o.t] + '.svg)"></i></div><div class="cn">' + T[o.t].n + '</div><div class="cc gold">' + (o.sold ? 'gekauft' : T[o.t].cost) + '</div></button>';
    }).join('') : '<div class="note" style="grid-column:1/-1">Laden geschlossen, nur Befehle und 1 Überläufer.</div>';
    $('#b-reroll').classList.toggle('hidden', S.stage !== 'plan');
    $('#b-reroll').disabled = !!AK.canDo(w, p, { k: 'reroll' });
    var dl = S.stage === 'react' ? R.reactDrops : R.dropMax;
    $('#dropinfo').textContent = 'Überläufer diese Runde: ' + (w.drops ? w.drops[p] || 0 : 0) + '/' + dl;
    $('#hand').innerHTML = w.hand[p].length ? w.hand[p].map(function (t, i) {
      var c = S.stage === 'react' && R.reactFree ? 0 : R.dropCost(t);
      return '<button class="card' + (S.sel && S.sel.hand === i ? ' sel' : '') + (w.gold[p] < c ? ' poor' : '') + '" data-hand="' + i + '"><div class="ck"><i style="--km:url(img/koma/' + MASK[t] + '.svg)"></i></div><div class="cn">' + T[t].n + '</div><div class="cc gold">' + (c ? c : 'gratis') + '</div></button>';
    }).join('') : '<span class="note">noch keine</span>';
    // Info
    var inf = $('#info'), ih = '';
    if (S.sel && S.sel.id) { var iu = AK.unit(w, S.sel.id); if (iu) ih = infoCard(iu, w, p); }
    else if (S.sel && S.sel.shop != null) ih = typeCard(w.offers[p][S.sel.shop].t, p);
    else if (S.sel && S.sel.hand != null) ih = typeCard(w.hand[p][S.sel.hand], p);
    inf.innerHTML = ih ? ih + '<button class="x" data-close="1" aria-label="Schließen">✕</button>' : ''; inf.classList.toggle('hidden', !ih);
    renderLog();
  }
  function renderLog() {
    var L = $('#log'); L.innerHTML = S.log.slice(-80).map(function (l) { return '<div><span class="t">' + l.t + ':</span> ' + l.s + '</div>'; }).join('');
    L.scrollTop = L.scrollHeight;
  }

  // ---------- Eingaben in der Planung ----------
  function act(a) {
    var w = view(), err = AK.canDo(w, S.viewer, a, S.stage === 'react' ? 'react' : 'plan');
    if (err) { toast(err); return false; }
    myActs().push(a); saveDraft(); return true;
  }
  function clickCell(x, y) {
    if (S.stage !== 'plan' && S.stage !== 'react') return;
    var w = view(), p = S.viewer, u = AK.at(w, x, y);
    if (S.sel && (S.sel.shop != null || S.sel.hand != null) && !u) {
      var a = S.sel.shop != null ? { k: 'buy', i: S.sel.shop, x: x, y: y } : { k: 'drop', i: S.sel.hand, x: x, y: y };
      if (act(a)) { var w2 = view(), nu = AK.at(w2, x, y); S.newIds = (S.newIds || []).concat(nu ? [nu.id] : []); S.sel = nu ? { id: nu.id } : null; }
      render(); return;
    }
    S.sel = u ? { id: u.id } : null; render();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-shop],[data-hand],[data-ord],[data-up],[data-close]');
    if (t && S) {
      if (t.dataset.shop != null) { var i = +t.dataset.shop, o = view().offers[S.viewer][i]; if (o.sold) return; S.sel = S.sel && S.sel.shop === i ? null : { shop: i }; }
      else if (t.dataset.hand != null) { var j = +t.dataset.hand; S.sel = S.sel && S.sel.hand === j ? null : { hand: j }; }
      else if (t.dataset.ord) { var cu = AK.unit(view(), S.sel.id); if (cu && cu.ord !== t.dataset.ord) act({ k: 'ord', id: S.sel.id, ord: t.dataset.ord }); }
      else if (t.dataset.up) act({ k: 'up', id: S.sel.id });
      else if (t.dataset.close) S.sel = null;
      render(); return;
    }
  });
  $('#boardWrap').addEventListener('click', function (e) {
    if ($('#boardWrap').classList.contains('d3')) return; // 3D: Tippen kommt über AK3D.onCell
    var r = $('#board').getBoundingClientRect(), cx = Math.floor((e.clientX - r.left) / r.width * N), cy = Math.floor((e.clientY - r.top) / r.height * N);
    if (cx < 0 || cy < 0 || cx >= N || cy >= N) return;
    if (flipped()) { cx = N - 1 - cx; cy = N - 1 - cy; }
    clickCell(cx, cy);
  });
  $('#b-danger').onclick = function () { opt.danger = !opt.danger; saveOpt(); render(); };
  $('#b-undo').onclick = function () { myActs().pop(); saveDraft(); S.sel = null; S.newIds = null; render(); };
  $('#b-reroll').onclick = function () { act({ k: 'reroll' }); S.sel = null; render(); };
  $('#b-done').onclick = function () {
    if (S.stage === 'react') return submitReact();
    var w = view(), left = w.gold[S.viewer], unused = w.offers[S.viewer].some(function (o) { return !o.sold && T[o.t].cost <= left; });
    confirmBox('Aufstellung abschicken?', (unused ? 'Du hast noch ' + left + ' Gold und könntest etwas kaufen. Übriges Gold bleibt dir.<br>' : '') + 'Danach ist keine Änderung mehr möglich.', 'Abschicken', submitPlan);
  };
  $('#b-probe').onclick = function () {
    // eigene Aufstellung gegen den aktuellen Stand des Gegners (ohne dessen neue Käufe), beide Teile ohne Reaktion
    var w = view();
    S.probe = true; S.back = { stage: S.stage }; S.stage = 'battle';
    var snap = AK.clone(w), e1 = AK.runPhase(w, 0), snap2 = AK.clone(w), e2 = w.over == null ? AK.runPhase(w, 1) : [];
    S.log.push({ t: 'Probelauf', s: 'Deine Aufstellung gegen den jetzigen Stand des Gegners (seine neuen Käufe kennst du nicht).' });
    playPhase(snap, e1, 0, function () {
      var after = function () {
        var lost = [0, 1].map(function (q) { return snap.units.filter(function (u) { return u.p === q; }).length - w.units.filter(function (u) { return u.p === q && u.hp > 0; }).length; });
        S.log.push({ t: 'Probelauf', s: 'Du würdest ' + lost[S.viewer] + ' Truppen verlieren, der Gegner ' + lost[1 - S.viewer] + (w.over != null ? (w.over === S.viewer ? ' – sein Feldherr fällt!' : w.over === 'remis' ? ' – beide Feldherren fallen.' : ' – dein Feldherr fällt!') : '.') });
        S.probe = false; S.stage = S.back.stage; S.disp = null; render();
        modal('<h2>Probelauf</h2><p>' + S.log[S.log.length - 1].s + '</p><p class="note">Seine neuen Käufe dieser Runde kennst du nicht: ' + names(1 - S.viewer) + ' hat ' + S.g.gold[1 - S.viewer] + ' Gold' + (S.g.hand[1 - S.viewer].length ? ' und ' + S.g.hand[1 - S.viewer].length + ' Überläufer' : '') + '. Du kannst deine Aufstellung noch ändern.</p>', 'Zurück zur Planung');
      };
      if (e2.length) playPhase(snap2, e2, 1, after); else after();
    });
  };

  // ---------- Runde abwickeln ----------
  function submitPlan() {
    S.sel = null; S.newIds = null;
    if (S.mode === 'net') return netSubmit('plan', S.acts[S.me]);
    if (S.mode === 'hot' && S.viewer === 0) return beginPlan(1);
    if (S.mode === 'ki') S.acts[1] = AKBot.plan(S.g, 1, 'mix', S.g.seed + S.g.round, S.lvl);
    var g = S.g; AK.applyAll(g, S.acts, 'plan'); S.acts = [[], []];
    var snap = AK.clone(g), ev = AK.runPhase(g, 0);
    S.stage = 'battle'; S.phase = 0;
    playPhase(snap, ev, 0, function () {
      if (g.over != null) return gameOver(); S.reacts = [[], []];
      if (!opt.react) { S.viewer = 0; return submitReact(true); } // ohne Reaktionspause geht Teil 2 direkt weiter
      if (S.mode === 'ki') { S.reacts[1] = AKBot.react(S.g, 1, S.g.seed + S.g.round); if (!needReact(0)) return submitReact(true); }
      beginReact(0);
    });
  }
  function submitReact(auto) {
    S.sel = null; S.newIds = null;
    if (S.mode === 'net') return netSubmit('react', S.reacts[S.me]);
    if (!auto && S.mode === 'hot' && S.viewer === 0) return beginReact(needReact(1) ? 1 : -1);
    var g = S.g; AK.applyAll(g, S.reacts, 'react'); S.reacts = [[], []];
    var snap = AK.clone(g), ev = AK.runPhase(g, 1);
    S.stage = 'battle'; S.phase = 1;
    playPhase(snap, ev, 1, function () { if (g.over != null) return gameOver(); roundEnd(); });
  }
  function roundEnd() {
    var g = S.g, r = g.round, lost = S.roundLoss || [0, 0];
    var nach = [0, 1].map(function (p) { return Math.min(R.lossGoldMax, R.lossGold * ((g.lost || [0, 0])[p])); });
    var ev = AK.endRound(g), inc = R.income(g.round), bo = g.bonus || [0, 0];
    var storm = ev.filter(function (e) { return e.e === 'storm'; });
    storm.forEach(function (e) { S.log.push({ t: 'Runde ' + r, s: '<b>Sturm aufs Lager:</b> ' + names(e.p) + ' hat keine Truppen mehr, ' + e.n + ' Gegner treffen den Feldherrn (−' + e.dmg + ')' }); });
    if (g.over != null) return gameOver();
    var king = [0, 1].map(function (p) { var k = g.units.filter(function (u) { return u.p === p && u.t === 'ou'; })[0]; return k ? Math.max(0, k.hp) : 0; });
    var h = '<h2>Runde ' + r + ' vorbei</h2><div class="sum">';
    [0, 1].forEach(function (p) {
      var n = g.units.filter(function (u) { return u.p === p && u.t !== 'ou'; }).length;
      h += '<div><span class="p' + p + 'c">' + names(p) + '</span>: ' + lost[p] + ' verloren · ' + n + ' Truppen stehen · Feldherr ' + king[p] + '/' + T.ou.hp + ' · ' + g.hand[p].length + ' Überläufer · <span class="gold">+' + (inc + bo[p] + nach[p]) + ' Gold</span>' + (nach[p] ? ' (davon ' + nach[p] + ' Nachschub)' : '') + '</div>';
    });
    storm.forEach(function (e) { h += '<div style="margin-top:6px"><b>Sturm aufs Lager!</b> ' + names(e.p) + ' hat keine Truppen mehr. ' + e.n + ' Gegner treffen den Feldherrn: −' + e.dmg + ' Leben.</div>'; });
    h += '<div style="margin-top:8px" class="note">Alle heilen 1 Leben, der Feldherr 2.</div>';
    if (g.round === R.pattRound) h += '<div style="margin-top:6px"><b>Generalangriff!</b> Ab jetzt rücken alle Truppen vor, Halten gilt nicht mehr.</div>';
    else if (g.round === R.pattRound - 2) h += '<div class="note">Ab Runde ' + R.pattRound + ' ist Generalangriff: dann rücken alle vor.</div>';
    h += '</div>';
    S.roundLoss = [0, 0];
    S.log.push({ t: 'Runde ' + r, s: 'vorbei. Verluste: ' + names(0) + ' ' + lost[0] + ', ' + names(1) + ' ' + lost[1] + '.' });
    S.log.push({ t: 'Runde ' + g.round, s: 'beginnt.' });
    modal(h, 'Weiter zu Runde ' + g.round, function () { beginPlan(0); });
  }
  function gameOver() {
    var w = S.g.over, h;
    if (w === 'remis') h = '<h2>Remis</h2><p>Beide Feldherren sind gefallen.</p>';
    else if (S.resigned != null) h = '<h2>' + (S.mode === 'ki' ? 'Aufgegeben' : names(w) + ' gewinnt!') + '</h2><p>' + ((S.mode === 'ki' && S.resigned === 0) || (S.mode === 'net' && S.resigned === S.me) ? 'Du hast' : names(S.resigned) + ' hat') + ' in Runde ' + S.g.round + ' aufgegeben.</p>';
    else if (S.mode === 'net') h = '<h2>' + (w === S.me ? 'Sieg!' : 'Niederlage') + '</h2><p>' + (w === S.me ? 'Der gegnerische Feldherr' : 'Dein Feldherr') + ' ist in Runde ' + S.g.round + ' gefallen.</p>';
    else h = '<h2>' + (S.mode === 'ki' ? (w === 0 ? 'Sieg!' : 'Niederlage') : names(w) + ' gewinnt!') + '</h2><p>' + (S.mode === 'ki' ? (w === 0 ? 'Der KI-Feldherr' : 'Dein Feldherr') : 'Der Feldherr von ' + names(1 - w)) + ' ist in Runde ' + S.g.round + ' gefallen.</p>';
    S.stage = 'over'; try { localStorage.removeItem(SAVE); if (S.mode === 'net') localStorage.setItem('armee.net', JSON.stringify(netList().filter(function (x) { return x.code !== S.net.code; }))); } catch (e) { } // beendete Online-Partie nicht mehr im Menü anbieten
    var meW = S.mode === 'net' ? S.me : 0; SND.play(w === meW || S.mode === 'hot' ? 'cheer' : 'horn');
    S.log.push({ t: 'Ende', s: w === 'remis' ? 'Remis.' : (S.mode === 'net' ? (w === S.me ? 'Du gewinnst' : 'Der Gegner gewinnt') : names(w) + ' gewinnt') + ' in Runde ' + S.g.round + '.' });
    render();
    if (S.mode === 'net') { modal(h + '<div class="row" style="margin-top:8px"><button class="btn small" id="o-menu">Zum Menü</button></div>', 'Revanche', rematch, 'Brett ansehen'); $('#o-menu').onclick = function () { $('#modal').classList.add('hidden'); toMenu(); }; }
    else modal(h, 'Zum Menü', toMenu, 'Brett ansehen');
  }

  // ---------- Wiedergabe ----------
  var PL = { timer: null, paused: false, speed: 1, step: null, fin: null };
  function playPhase(snap, ticks, ph, done) {
    S.stage = 'battle'; S.phase = ph; S.disp = AK.clone(snap); S.sel = null;
    SND.init(); SND.load(); if (!S.probe) SND.play('drum');
    if (navigator.vibrate && opt.snd && ph === 0 && !S.probe && S.mode === 'net') try { navigator.vibrate(60); } catch (e) { }
    render(); drawBoard(S.disp, {});
    var on3 = opt.d3 && window.AK3D && AK3D.state === 'ready'; $('#boardWrap').classList.toggle('d3', !!on3); // erst Größe, dann Kamera
    S.d3 = on3 && AK3D.show($('#v3d'), S.disp, flipped(), PL.speed); if (!S.d3) $('#boardWrap').classList.remove('d3');
    var i = 0; S.roundLoss = S.roundLoss || [0, 0];
    var lbl = (S.probe ? 'Probe ' : '') + 'Teil ' + (ph + 1);
    if (!ticks.length || ticks.every(function (e) { return !e.length; })) S.log.push({ t: lbl, s: 'Niemand in Reichweite, keiner rückt vor.' });
    function finish() { clearTimeout(PL.timer); PL.timer = null; PL.fin = null; PL.step = null; done(); }
    function next() {
      if (i >= ticks.length) return finish();
      var ev = ticks[i++]; doTick(ev, lbl + ', Takt ' + i);
      if (!PL.paused) PL.timer = setTimeout(next, 1250 / PL.speed);
    }
    PL.step = function () { clearTimeout(PL.timer); next(); };
    PL.fin = function () { // Überspringen: Rest ohne Animation
      clearTimeout(PL.timer);
      while (i < ticks.length) { var ev = ticks[i++]; applyEv(S.disp, ev, lbl + ', Takt ' + i); }
      drawBoard(S.disp, {}); if (S.d3) AK3D.sync(S.disp); finish();
    };
    $('#p-pause').textContent = PL.paused ? '▶ Weiter' : '⏸ Pause';
    PL.timer = setTimeout(next, 500 / PL.speed + (S.d3 ? AK3D.introMs || 0 : 0)); // 3D: Nachschub erst ankommen lassen
  }
  // Namen mit richtigem Artikel: „Dein Turm“, „Deine Lanze“, „KI-Turm“, „Roter Turm“
  function nm(u) {
    var n = T[u.t].n, fem = u.t === 'ky' || u.t === 'ny';
    if (S.mode === 'ki') return u.p === 0 ? (fem ? 'Deine ' : 'Dein ') + n : 'KI-' + n;
    if (S.mode === 'net') return u.p === S.me ? (fem ? 'Deine ' : 'Dein ') + n : 'Gegner-' + n;
    return n + (u.p === 0 ? ' (Orange)' : ' (Blau)');
  }
  // Ereignisse eines Takts auf die Anzeige anwenden (ohne Animation) und knapp in den Bericht schreiben:
  // Schaden je Seite plus das Wichtige (Gefallene, Überläufer, Beförderungen)
  function applyEv(d, ev, lbl) {
    var lines = [], dmg = [0, 0];
    ev.forEach(function (e) {
      var u = AK.unit(d, e.id);
      if (e.e === 'atk') { var t = AK.unit(d, e.to); if (t) { t.hp -= e.dmg; if (u) dmg[u.p] += e.dmg; } }
      else if (e.e === 'die') { if (u) { u.hp = 0; lines.push('<b>' + nm(u) + ' fällt</b>' + (u.t !== 'ou' ? ' (wird Überläufer für ' + (S.mode === 'ki' ? (u.p === 0 ? 'die KI' : 'dich') : S.mode === 'net' ? (u.p === S.me ? 'den Gegner' : 'dich') : names(1 - u.p)) + ')' : '')); if (!S.probe) S.roundLoss[u.p]++; } }
      else if (e.e === 'flee' && T[e.t].cost >= 3) lines.push('Hand voll: ' + (S.mode === 'ki' ? (e.p === 0 ? 'dein' : 'ihr') : names(e.p) + 's') + ' Überläufer ' + T[e.t].n + ' läuft davon');
      else if (e.e === 'move' && u) { u.x = e.tx; u.y = e.ty; }
      else if (e.e === 'promo' && u) { var add = T[e.t].hp - T[T[e.t].base].hp, old = nm(u); u.t = e.t; u.mhp += add; u.hp += add; lines.push(old + ' wird befördert: <b>' + T[e.t].n + '</b>'); }
    });
    if (dmg[0] || dmg[1]) lines.unshift('Schaden ' + names(0) + ' ' + dmg[0] + ', ' + names(1) + ' ' + dmg[1]);
    if (lines.length) S.log.push({ t: lbl, s: lines.join(' · ') });
  }
  function b2(e) { var a = pos(e.x, e.y), b = pos(e.tx, e.ty); return { x: b[0] - a[0], y: b[1] - a[1] }; }
  function puff(x, y, cls) { var q = pos(x, y), el = document.createElement('div'); el.className = cls; el.style.left = (q[0] + .5) / 9 * 100 + '%'; el.style.top = (q[1] + .5) / 9 * 100 + '%'; $('#fx').appendChild(el); }
  function doTick(ev, lbl) {
    var d = S.disp, U = $('#units'), fx = $('#fx'), dur = Math.round(380 / PL.speed);
    document.documentElement.style.setProperty('--mv', dur + 'ms');
    // Angriffe: Linien und Schadenszahlen
    var svg = '<svg viewBox="0 0 9 9">';
    ev.forEach(function (e) { if (e.e === 'atk') { var a = pos(e.x, e.y), b = pos(e.tx, e.ty), u = AK.unit(d, e.id); svg += '<line x1="' + (a[0] + .5) + '" y1="' + (a[1] + .5) + '" x2="' + (b[0] + .5) + '" y2="' + (b[1] + .5) + '" stroke="' + (u && u.p === 1 ? '#4fb4ff' : '#f0a336') + '" stroke-width=".09" stroke-linecap="round" opacity=".9"/>'; } });
    fx.querySelectorAll('svg,.dmg').forEach(function (n) { n.remove(); }); fx.insertAdjacentHTML('beforeend', svg + '</svg>');
    ev.forEach(function (e) {
      if (e.e !== 'atk') return; var q = pos(e.tx, e.ty), el = document.createElement('div');
      el.className = 'dmg'; el.textContent = '−' + e.dmg; el.style.left = (q[0] + .5) / 9 * 100 + '%'; el.style.top = (q[1] + .5) / 9 * 100 + '%'; fx.appendChild(el);
      var tu = U.querySelector('[data-id="' + e.to + '"]'); if (tu) { tu.classList.remove('flash'); void tu.offsetWidth; tu.classList.add('flash'); }
      var au = U.querySelector('[data-id="' + e.id + '"]'); if (au) { var dx = Math.sign(b2(e).x), dy = Math.sign(b2(e).y); au.style.setProperty('--bx', dx * 22 + '%'); au.style.setProperty('--by', dy * 22 + '%'); au.classList.add('bump'); }
    });
    applyEv(d, ev, lbl);
    if (S.d3) AK3D.tick(ev, d);
    var na = 0; ev.forEach(function (e) { if (e.e === 'atk' && na < 3) { SND.play(na % 2 ? 'hit' : 'clash', na * 0.07); na++; } });
    if (ev.some(function (e) { return e.e === 'die'; })) SND.play('die', 0.25);
    if (ev.some(function (e) { return e.e === 'promo'; })) SND.play('promo', 0.3);
    setTimeout(function () {
      U.querySelectorAll('.u').forEach(function (el) {
        el.classList.remove('bump', 'flash'); var u = AK.unit(d, +el.dataset.id); if (!u) return;
        var bar = el.querySelector('.hp i'); if (bar) bar.style.width = Math.max(0, 100 * u.hp / u.mhp) + '%';
        if (u.hp <= 0 && !el.classList.contains('dead')) { el.classList.add('dead'); puff(u.x, u.y, 'puff'); }
      });
      ev.forEach(function (e) {
        if (e.e === 'move') { var el = U.querySelector('[data-id="' + e.id + '"]'); if (el) place(el, e.tx, e.ty); }
        if (e.e === 'promo') { var el2 = U.querySelector('[data-id="' + e.id + '"]'), u = AK.unit(d, e.id); if (el2 && u) { var tmp = document.createElement('div'); tmp.innerHTML = unitHTML(u); var nu = tmp.firstChild; nu.style.transform = el2.style.transform; nu.classList.add('promo'); el2.replaceWith(nu); puff(u.x, u.y, 'puff gold'); } }
      });
      setTimeout(function () { fx.querySelectorAll('svg,.dmg').forEach(function (n) { n.remove(); }); }, dur); setTimeout(function () { fx.querySelectorAll('.puff').forEach(function (n) { n.remove(); }); }, 900);
    }, dur);
    renderLog();
  }
  $('#p-pause').onclick = function () { PL.paused = !PL.paused; this.textContent = PL.paused ? '▶ Weiter' : '⏸ Pause'; if (!PL.paused && PL.step) PL.step(); };
  $('#p-step').onclick = function () { PL.paused = true; $('#p-pause').textContent = '▶ Weiter'; if (PL.step) PL.step(); };
  $('#p-speed').onclick = function () { PL.speed = PL.speed === 1 ? 2 : PL.speed === 2 ? 0.5 : 1; this.textContent = 'Tempo ' + (PL.speed === 0.5 ? '½' : PL.speed) + '×'; if (window.AK3D) AK3D.setSpeed(PL.speed); };
  $('#p-skip').onclick = function () { if (PL.fin) PL.fin(); };

  // ---------- Dialoge ----------
  function modal(html, ok, fn, alt) {
    var m = $('#modal'), b = $('#modalBox');
    b.innerHTML = html + '<div class="row" style="margin-top:12px;justify-content:flex-end">' + (alt ? '<button class="btn small" id="mAlt">' + alt + '</button>' : '') + '<button class="btn go" id="mOk">' + ok + '</button></div>';
    m.classList.remove('hidden');
    $('#mOk').onclick = function () { m.classList.add('hidden'); if (fn) fn(); };
    if (alt) $('#mAlt').onclick = function () { m.classList.add('hidden'); };
  }
  function confirmBox(title, txt, ok, fn) { modal('<h2>' + title + '</h2><p>' + txt + '</p>', ok, fn, 'Abbrechen'); }
  function cover(title, txt, btn, fn) {
    var c = $('#cover'); c.innerHTML = '<h1>' + title + '</h1><p>' + txt + '</p><button class="btn go" id="cGo">' + btn + '</button>';
    c.classList.remove('hidden'); $('#cGo').onclick = function () { c.classList.add('hidden'); fn(); };
  }
  var toastT;
  function toast(s) { var st = $('#g-stage'), old = st.textContent; st.textContent = '⚠ ' + s; st.style.color = '#ff8a70'; clearTimeout(toastT); toastT = setTimeout(function () { st.style.color = ''; render(); }, 1600); }
  function rules() {
    modal('<h2>Regeln</h2><ul>' +
      '<li><b>Ziel:</b> Der gegnerische Feldherr (王) fällt.</li>' +
      '<li><b>Runde:</b> Beide planen geheim. Dann läuft die Schlacht von selbst: Teil 1, kurze Reaktion (nur wer Überläufer hat), Teil 2. Die Truppen bleiben danach stehen.</li>' +
      '<li><b>Planen:</b> Truppen im Laden kaufen und in deinen 3 Reihen aufstellen. Aufwerten (★) gibt mehr Leben und Schaden. Neue Angebote kosten 1 Gold. Übriges Gold bleibt.</li>' +
      '<li><b>Kampf:</b> Jede Truppe schlägt nur in ihre Richtungen (Bild auf der Karte, wie im Shogi). Ist niemand in Reichweite, läuft sie zum nächsten Gegner und stellt sich passend hin. Alle schlagen gleichzeitig, immer den Schwächsten.</li>' +
      '<li><b>Befehle:</b> ⚔ Vorrücken oder 🛡 Halten: bleibt stehen und schlägt mit +' + R.holdAtk + ' Schaden zu. Halten lohnt gegen Angreifer, Schützen kontern es aus der Ferne.</li>' +
      '<li><b>Schützen:</b> Läufer und Turm schießen 3 Felder weit, auch über eigene Truppen.</li>' +
      '<li><b>Beförderung:</b> In den hinteren 3 Reihen des Gegners werden Truppen stärker.</li>' +
      '<li><b>Überläufer:</b> Wen du schlägst, der kann für dich kämpfen: in deiner Hälfte, 2 pro Planung zum halben Preis, 1 in der Reaktion gratis. Mehr als ' + R.handMax + ' in der Hand: der billigste läuft davon.</li>' +
      '<li><b>Gold:</b> ' + R.start + ' am Anfang, dann ' + R.income(2) + ' pro Runde, steigt bis ' + R.income(99) + '.</li>' +
      '<li><b>Gebiet:</b> Jede Truppe außerhalb deiner 3 Reihen bringt am Rundenende 1 Gold (höchstens ' + R.terrMax + '). Wer nur hält, verdient weniger.</li>' +
      '<li><b>Nachschub:</b> Für jede verlorene Truppe gibt es nächste Runde 1 Gold extra (höchstens ' + R.lossGoldMax + ').</li>' +
      '<li><b>Sturm aufs Lager:</b> Hat eine Seite am Rundenende keine Truppen mehr, trifft jede überlebende gegnerische Truppe ihren Feldherrn mit ' + R.storm + '-fachem Schaden.</li>' +
      '<li><b>Generalangriff:</b> Ab Runde ' + R.pattRound + ' rücken alle Truppen vor, Halten gilt nicht mehr.</li>' +
      '<li><b>Aufgeben:</b> im Menü ☰, wie beim Shogi.</li>' +
      '<li><b>⚠ Gefahr:</b> färbt beim Planen die Felder, die der Gegner treffen kann.</li>' +
      '<li><b>Online:</b> Im Menü „Online gegen ein zweites Handy“ und den Link schicken. Jeder plant auf seinem Gerät, die Partie wird gespeichert. Mit Rundenuhr wird bei 0:00 automatisch abgeschickt.</li>' +
      '<li><b>Probelauf:</b> Zeigt, wie deine Aufstellung gegen den jetzigen Stand des Gegners laufen würde.</li></ul>', 'Verstanden');
  }

  // ---------- Online gegen ein zweites Gerät ----------
  // Netz-Stand: { game, seed, bonus, seats, moves: [{ r, ph: 'plan'|'react'|'resign', p, acts }], t }.
  // Beide Geräte vereinigen die Einträge und rechnen die Schlacht selbst (Regeln sind deterministisch).
  var ORD = { plan: 0, react: 1, resign: 2 }, myId = null;
  function cid() { return Net.me(); } // net.js nimmt ?cid= zum Testen mit zwei Tabs
  function ent(st, r, ph, p) { if (!st) return null; for (var i = 0; i < st.moves.length; i++) { var m = st.moves[i]; if (m.r === r && m.ph === ph && m.p === p) return m; } return null; }
  function merge(a, b) {
    if (!a) return b; if (!b) return a;
    if (a.seed !== b.seed) return (b.t || 0) > (a.t || 0) ? b : a;
    var m = a.moves.slice();
    b.moves.forEach(function (x) { if (!ent({ moves: m }, x.r, x.ph, x.p)) m.push(x); });
    m.sort(function (x, y) { return x.r - y.r || ORD[x.ph] - ORD[y.ph] || x.p - y.p; });
    var s1 = a.seats[1] && b.seats[1] ? (a.seats[1] < b.seats[1] ? a.seats[1] : b.seats[1]) : a.seats[1] || b.seats[1] || null;
    var nx = a.next && b.next ? (a.next < b.next ? a.next : b.next) : a.next || b.next;
    var o = { game: 'armee', seed: a.seed, bonus: a.bonus, clock: a.clock || b.clock || 0, seats: { 0: a.seats[0] || b.seats[0], 1: s1 }, moves: m, t: Math.max(a.t || 0, b.t || 0) }; if (nx) o.next = nx; return o;
  }
  function netRebuild(st) {
    var g = AK.newGame(st.seed, st.bonus), nph = 'plan';
    for (var k = 0; k < 200 && g.over == null; k++) {
      var r = g.round, a0 = ent(st, r, 'plan', 0), a1 = ent(st, r, 'plan', 1);
      if (!a0 || !a1) { nph = 'plan'; break; }
      AK.applyAll(g, [a0.acts, a1.acts], 'plan'); AK.runPhase(g, 0); if (g.over != null) break;
      var b0 = ent(st, r, 'react', 0), b1 = ent(st, r, 'react', 1);
      if (!b0 || !b1) { nph = 'react'; break; }
      AK.applyAll(g, [b0.acts, b1.acts], 'react'); AK.runPhase(g, 1); if (g.over != null) break;
      AK.endRound(g);
    }
    return { g: g, nph: nph };
  }
  function netList() { try { return JSON.parse(localStorage.getItem('armee.net') || '[]'); } catch (e) { return []; } }
  function netRemember(code) { var l = netList().filter(function (x) { return x.code !== code; }); l.unshift({ code: code, t: Date.now() }); try { localStorage.setItem('armee.net', JSON.stringify(l.slice(0, 4))); } catch (e) { } }
  function netLoad(cb) { if (typeof mqtt !== 'undefined') return cb(); var sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js'; sc.onload = sc.onerror = function () { cb(); }; document.head.appendChild(sc); }
  function netUrl(code) { return location.origin + location.pathname + '#armee=' + code; }
  function shareNet() {
    var code = S.net.code, url = netUrl(code);
    modal('<h2>Gegner einladen</h2><p>Schick diesen Link an dein Gegenüber. Wer ihn öffnet, spielt Blau gegen dich.</p><p style="word-break:break-all"><b>' + url + '</b></p><p class="note">Ihr plant gleichzeitig, jeder auf seinem Handy. Die Schlacht läuft auf beiden Geräten gleich ab. Du kannst die Seite schließen und später weiterspielen.</p>', 'Link teilen', function () {
      if (navigator.share) navigator.share({ title: 'Armee', text: 'Spiel Armee gegen mich!', url: url }).catch(function () { });
      else if (navigator.clipboard) { navigator.clipboard.writeText(url); toast('Link kopiert'); }
    }, 'Später');
  }
  function netCreate() {
    var code = Net.code(), st = { game: 'armee', seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, bonus: [0, opt.hc], clock: opt.clock, seats: { 0: cid(), 1: null }, moves: [], t: Date.now() };
    netStart(code, st); shareNet();
  }
  function netStart(code, st) {
    clearTimeout(PL.timer);
    document.getElementById('modal').classList.add('hidden');
    S = { mode: 'net', me: st ? 0 : -1, net: { code: code, st: st, status: 'verbinde' }, g: null, acts: [[], []], reacts: [[], []], viewer: 0, stage: 'wait', sel: null, log: [] };
    try { history.replaceState(null, '', '#armee=' + code); } catch (e) { }
    netRemember(code); show('game');
    if (st) { S.g = AK.newGame(st.seed, st.bonus); S.viewer = 0; S.log.push({ t: 'Runde 1', s: 'Neue Online-Partie. Du spielst Orange (unten).' }); beginPlan(0); } else render();
    netLoad(function () {
      if (typeof mqtt === 'undefined') { S.net.status = 'offline'; render(); toast('Keine Verbindung zum Netz'); return; }
      Net.connect('armee-' + code, onNet, function () { if (S && S.mode === 'net') { S.net.peer = Date.now(); if (S.stage !== 'battle') render(); } }, function (x) { if (S && S.mode === 'net') { S.net.status = x; if (S.stage !== 'battle') render(); } });
      if (st) Net.publishState(st);
    });
  }
  function onNet(d) {
    if (!S || S.mode !== 'net' || !d || d.game !== 'armee' || !d.moves || !d.seats) return;
    var st = merge(S.net.st, d);
    if (st.seats[0] !== cid() && st.seats[1] !== cid() && !st.seats[1]) st = merge(st, { game: 'armee', seed: st.seed, bonus: st.bonus, seats: { 0: st.seats[0], 1: cid() }, moves: [], t: st.t });
    S.net.st = st;
    if (JSON.stringify(st) !== JSON.stringify(d)) Net.publishState(st);
    if (st.next && S.stage === 'over' && !S.askedNext) { S.askedNext = true; modal('<h2>Revanche?</h2><p>Dein Gegner will noch eine Partie.</p>', 'Annehmen', function () { netStart(st.next, null); }, 'Nein danke'); }
    if (!S.g) {
      var me = st.seats[0] === cid() ? 0 : st.seats[1] === cid() ? 1 : -1;
      if (me < 0) { modal('<h2>Partie ist voll</h2><p>Hier spielen schon zwei. Starte im Menü eine neue Online-Partie.</p>', 'Zum Menü', toMenu); return; }
      S.me = me; S.viewer = me;
      var rb = netRebuild(st); S.g = rb.g; S.nph = rb.nph;
      S.log.push({ t: 'Runde ' + S.g.round, s: st.moves.length ? 'Partie geladen.' : 'Du spielst ' + (me === 0 ? 'Orange (unten)' : 'Blau, dein Lager ist unten') + '.' });
      if (S.g.over != null) { gameOver(); if (st.next) { S.askedNext = true; modal('<h2>Revanche?</h2><p>Dein Gegner will noch eine Partie.</p>', 'Annehmen', function () { netStart(st.next, null); }, 'Später'); } return; }
      if (netResign()) return;
      if (S.nph === 'plan') beginPlan(me); else beginReactNet();
      return;
    }
    netTry();
  }
  function netResign() { var rs = S.net.st.moves.filter(function (m) { return m.ph === 'resign'; })[0]; if (rs && S.g.over == null) { S.g.over = 1 - rs.p; S.resigned = rs.p; gameOver(); return true; } return false; }
  function netSubmit(ph, acts) {
    var st = S.net.st, m = st.moves.slice(); m.push({ r: S.g.round, ph: ph, p: S.me, acts: acts });
    S.net.st = merge(st, { game: 'armee', seed: st.seed, bonus: st.bonus, seats: st.seats, moves: m, t: Date.now() });
    Net.publishState(S.net.st); S.stage = 'wait'; S.sel = null; S.newIds = null; netTry();
  }
  function netTry() {
    if (!S || S.mode !== 'net' || !S.g || S.stage === 'battle' || S.stage === 'over') return;
    if (netResign()) return;
    var st = S.net.st, g = S.g;
    if ((S.stage === 'plan' || S.stage === 'react') && ent(st, g.round, S.nph, S.me)) { S.stage = 'wait'; S.sel = null; S.acts = [[], []]; S.reacts = [[], []]; } // schon abgeschickt (z. B. älterer Stand beim Laden)
    if (S.stage !== 'wait') return render();
    var e0 = ent(st, g.round, S.nph, 0), e1 = ent(st, g.round, S.nph, 1);
    if (!e0 || !e1) return render();
    if (S.nph === 'plan') {
      AK.applyAll(g, [e0.acts, e1.acts], 'plan');
      var snap = AK.clone(g), ev = AK.runPhase(g, 0);
      playPhase(snap, ev, 0, function () { if (g.over != null) return gameOver(); S.nph = 'react'; beginReactNet(); });
    } else {
      AK.applyAll(g, [e0.acts, e1.acts], 'react');
      var snap2 = AK.clone(g), ev2 = AK.runPhase(g, 1);
      playPhase(snap2, ev2, 1, function () { if (g.over != null) return gameOver(); S.nph = 'plan'; roundEnd(); });
    }
  }
  function beginReactNet() {
    S.viewer = S.me; S.sel = null; S.reacts = [[], []]; S.nph = 'react';
    if (ent(S.net.st, S.g.round, 'react', S.me)) { S.stage = 'wait'; return netTry(); }
    if (!needReact(S.me)) return netSubmit('react', []);
    S.stage = 'react'; loadDraft(); render();
  }
  function waitView() { var w = AK.clone(S.g), e = ent(S.net && S.net.st, S.g.round, S.nph, S.me); w.drops = [0, 0]; if (e) e.acts.forEach(function (a) { AK.apply(w, S.me, a, S.nph); }); return w; }
  function peerText() {
    if (!S.net.st || !S.net.st.seats[1]) return 'Partie ' + S.net.code;
    var t = S.net.peer; if (!t) return 'Gegner noch nicht gesehen';
    var m = Math.round((Date.now() - t) / 60000); return Date.now() - t < 70000 ? '<span style="color:var(--good)">Gegner ist da</span>' : 'Gegner zuletzt vor ' + (m < 60 ? m + ' Min.' : Math.round(m / 60) + ' Std.');
  }
  setInterval(function () { if (S && S.mode === 'net' && !document.hidden) { try { Net.ping(); } catch (e) { } if (S.stage !== 'battle') render(); } }, 25000);
  // Revanche: wer zuerst drückt, legt die neue Partie an und hinterlegt ihren Code in der alten
  function rematch() {
    var st = S.net.st, code = st.next || Net.code();
    if (st.next) return netStart(st.next, null);
    var nst = { game: 'armee', seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, bonus: st.bonus, clock: st.clock || 0, seats: { 0: cid(), 1: null }, moves: [], t: Date.now() };
    st = merge(st, { game: 'armee', seed: st.seed, bonus: st.bonus, seats: st.seats, moves: [], t: st.t, next: code }); S.net.st = st; Net.publishState(st);
    if (st.next !== code) return netStart(st.next, null);
    toast('Revanche wird angelegt …');
    setTimeout(function () { netStart(code, nst); }, 1500); // kurz warten, damit der Hinweis in der alten Partie ankommt
  }
  function clockLeft() {
    if (!S || S.mode !== 'net' || !S.net.st || !S.net.st.clock || (S.stage !== 'plan' && S.stage !== 'react') || !S.net.st.seats[1]) return null;
    var k = 'armee.clock/' + S.net.code + '/' + S.g.round + '/' + S.nph + '/' + S.me, d;
    try { d = +localStorage.getItem(k); if (!d) { d = Date.now() + (S.nph === 'react' ? Math.max(30, Math.round(S.net.st.clock / 3)) : S.net.st.clock) * 1000; localStorage.setItem(k, d); } } catch (e) { d = Date.now() + 60000; }
    return Math.max(0, Math.round((d - Date.now()) / 1000));
  }
  function clockText(t) { return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
  setInterval(function () {
    var t = clockLeft(); if (t == null) return;
    var st = $('#g-stage'); st.textContent = st.textContent.replace(/ · ⏱.*$/, '') + ' · ⏱ ' + clockText(t); st.style.color = t <= 15 ? '#ff8a70' : '';
    if (t === 0) { $('#modal').classList.add('hidden'); toast('Zeit um – deine Planung wird abgeschickt'); if (S.stage === 'react') submitReact(); else submitPlan(); }
  }, 1000);
  function waitText() { if (S.mode !== 'net') return ''; if (!S.net.st || !S.net.st.seats[1]) return 'Warte, bis dein Gegner den Link öffnet …'; return S.nph === 'react' ? 'Warte auf die Reaktion des Gegners …' : 'Warte auf den Gegner, er plant noch …'; }
  function toMenu() { if (S && S.mode === 'net') { try { Net.leave(); } catch (e) { } try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } } S = null; show('menu'); }
  document.addEventListener('click', function (e) { if (e.target.id === 'g-share' && S && S.net) shareNet(); });

  // ---------- Einführung ----------
  function introSeen() { try { return !!localStorage.getItem('armee.intro'); } catch (e) { return true; } }
  function mini(cells) { // kleines Brett 5×3: 'o' eigene Truppe, 'x' Gegner, 'k' Feldherr, '.' leer
    return '<div class="mini" style="grid-template-rows:repeat(' + cells.length / 5 + ', 26px)">' + cells.split('').map(function (c) { return '<b class="' + (c === '.' ? '' : c) + '"></b>'; }).join('') + '</div>';
  }
  var INTRO = [
    function () { return '<div class="big-k">軍</div><h2>Armee</h2><p>Zwei Feldherren, zwei Armeen. Du kaufst Truppen, stellst sie auf und gibst Befehle. <b>Dann kämpfen sie von selbst.</b></p><p>Gewonnen hat, wessen Truppen den <b>gegnerischen Feldherrn (王)</b> besiegen.</p><p class="note">Dauert etwa 10 Runden. Die Truppen kennst du vom Shogi.</p>'; },
    function () { return '<h2>1 · Planen</h2><p>Jede Runde bekommst du <span class="gold">Gold</span>. Tippe im <b>Laden</b> auf eine Truppe und dann auf ein freies Feld in deinen <b>3 unteren Reihen</b> (grün).</p>' + mini('.xkx.' + '..x..' + '.....' + '.....' + 'zzozz' + 'zozoz' + 'zzkzz') + '<p class="note" style="text-align:center"><span class="p0c">Orange</span> = du, <span class="p1c">Blau</span> = Gegner, weiß umrandet = Feldherr</p><p>Beide planen <b>gleichzeitig und geheim</b>. Übriges Gold bleibt dir.</p>'; },
    function () { return '<h2>2 · Wie Truppen kämpfen</h2><p>Jede Truppe schlägt nur in ihre Shogi-Richtungen (rot). Die Karte zeigt es, wenn du eine Truppe antippst.</p><div class="row" style="gap:16px;justify-content:center">' + ['fu', 'ki', 'ka'].map(function (t) { return '<div style="text-align:center">' + patHTML(t) + '<div class="note">' + T[t].n + '</div></div>'; }).join('') + '</div><p>Ist kein Gegner in Reichweite, läuft sie zum nächsten. Alle schlagen gleichzeitig, immer den Schwächsten. <b>Läufer und Turm schießen</b> von hinten.</p>'; },
    function () { return '<h2>3 · Die Schlacht</h2><p>Wenn beide fertig sind, läuft die Schlacht von selbst: <b>Teil 1</b>, kurze <b>Reaktion</b>, <b>Teil 2</b>. Danach bleiben alle stehen, wo sie sind, und die nächste Runde beginnt.</p><p>Wer fällt, wird <b>Überläufer</b> für den Gegner: Den kannst du später für dich einsetzen, in der Reaktion sogar gratis.</p><p>Truppen in den hinteren Reihen des Gegners werden <b>befördert</b> und stärker.</p>'; },
    function () { return '<h2>4 · Befehle</h2><p>Tippe eine eigene Truppe an: <b>⚔ Vorrücken</b> oder <b>🛡 Halten</b> (bleibt stehen, schlägt härter zu).</p><p>Aber: Jede Truppe <b>außerhalb deiner 3 Reihen</b> bringt am Rundenende 1 Gold extra. Wer nur hält, verdient weniger.</p><p class="note">Ab Runde ' + R.pattRound + ' greifen alle an.</p>'; },
    function () { return '<h2>Tipps</h2><ul><li><b>⚠ Gefahr</b> färbt die Felder rot, die der Gegner treffen kann.</li><li><b>Probelauf</b> zeigt vorher, wie deine Aufstellung ausgehen würde.</li><li>Billige Bauern vorn schützen teure Truppen dahinter.</li><li>Unter <b>?</b> stehen alle Regeln, unter <b>☰</b> große Schrift.</li></ul><p>Am besten erst eine Übungspartie gegen die KI auf <b>leicht</b>.</p>'; }
  ];
  function intro(done) {
    var i = 0, el = $('#intro');
    function draw() {
      el.innerHTML = '<div class="box">' + INTRO[i]() + '<div class="dots">' + INTRO.map(function (_, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('') + '</div><div class="row" style="justify-content:space-between;margin-top:10px">' +
        (i ? '<button class="btn small" id="i-back">Zurück</button>' : '<button class="btn small" id="i-skip">Überspringen</button>') + '<button class="btn go" id="i-next">' + (i < INTRO.length - 1 ? 'Weiter' : 'Los geht\'s') + '</button></div></div>';
      var b = $('#i-back'), sk = $('#i-skip');
      if (b) b.onclick = function () { i--; draw(); };
      if (sk) sk.onclick = fin;
      $('#i-next').onclick = function () { if (i < INTRO.length - 1) { i++; draw(); } else fin(); };
    }
    function fin() { el.classList.add('hidden'); try { localStorage.setItem('armee.intro', '1'); } catch (e) { } if (done) done(); }
    el.classList.remove('hidden'); draw();
  }

  // ---------- Menü ----------
  function applyOpt() { document.documentElement.classList.toggle('big', opt.big); $('#m-big').textContent = 'Große Schrift: ' + (opt.big ? 'an' : 'aus'); $('#m-lab').textContent = 'Beschriftung: ' + (opt.lab === 'kanji' ? 'Kanji' : 'Deutsch'); $('#m-react').textContent = 'Reaktionspause: ' + (opt.react ? 'an' : 'aus (einfacher)');
    $('#m-hc').textContent = 'Vorgabe zu zweit: ' + ({ '-2': 'Spieler 2 −2 Gold/Runde', '-1': 'Spieler 2 −1 Gold/Runde', '0': 'keine', '1': 'Spieler 2 +1 Gold/Runde', '2': 'Spieler 2 +2 Gold/Runde' })[opt.hc];
    $('#m-snd').textContent = 'Ton: ' + (opt.snd ? 'an' : 'aus');
    $('#m-3d').textContent = '3D-Schlachtfeld: ' + (opt.d3 ? 'an' : 'aus (2D)'); $('#m-3d').classList.toggle('hidden', !(window.AK3D && AK3D.supported()));
    $('#m-clock').textContent = 'Rundenuhr online: ' + (opt.clock ? opt.clock / 60 + ' Min. pro Planung' : 'aus (ohne Zeitdruck)');
    $('#m-lvl').textContent = 'KI-Stärke: ' + ['leicht', 'mittel', 'schwer'][opt.lvl]; }
  $('#m-clock').onclick = function () { opt.clock = opt.clock === 0 ? 120 : opt.clock === 120 ? 300 : 0; saveOpt(); applyOpt(); };
  $('#m-3d').onclick = function () { opt.d3 = !opt.d3; saveOpt(); applyOpt(); };
  $('#m-snd').onclick = function () { opt.snd = !opt.snd; saveOpt(); applyOpt(); if (opt.snd) SND.init(); };
  $('#m-lvl').onclick = function () { opt.lvl = (opt.lvl + 1) % 3; saveOpt(); applyOpt(); };
  $('#m-ki').onclick = function () { newMatch('ki'); };
  $('#m-net').onclick = netCreate;
  $('#m-netlist').onclick = function (e) { var b = e.target.closest('[data-net]'); if (b) netStart(b.dataset.net, null); };
  $('#m-hot').onclick = function () { newMatch('hot'); };
  $('#m-resume').onclick = resume;
  $('#m-rules').onclick = rules; $('#m-intro').onclick = function () { intro(); }; $('#g-help').onclick = rules;
  $('#m-big').onclick = function () { opt.big = !opt.big; saveOpt(); applyOpt(); };
  var HC = [0, 1, 2, -1, -2]; // ±1 Gold pro Runde ≈ 72 % Siegchance im Selbstspiel, ±2 ≈ 88 %
  $('#m-hc').onclick = function () { opt.hc = HC[(HC.indexOf(opt.hc) + 1) % HC.length]; saveOpt(); applyOpt(); };
  $('#m-react').onclick = function () { opt.react = !opt.react; saveOpt(); applyOpt(); };
  $('#m-lab').onclick = function () { opt.lab = opt.lab === 'kanji' ? 'de' : 'kanji'; saveOpt(); applyOpt(); };
  $('#g-menu').onclick = function () {
    modal('<h2>Menü</h2><p>Die Partie wird zu Beginn jeder Runde gespeichert.</p><div class="row"><button class="btn small" id="o-big">Große Schrift: ' + (opt.big ? 'an' : 'aus') + '</button><button class="btn small" id="o-lab">Beschriftung: ' + (opt.lab === 'kanji' ? 'Kanji' : 'Deutsch') + '</button><button class="btn small" id="o-snd">Ton: ' + (opt.snd ? 'an' : 'aus') + '</button><button class="btn small" id="o-3d">3D: ' + (opt.d3 ? 'an' : 'aus') + '</button></div>' + (S && S.g && S.g.over == null && (S.stage === 'plan' || S.stage === 'react' || S.stage === 'wait') ? '<div class="row" style="margin-top:10px"><button class="btn small" id="o-resign">🏳 Aufgeben (' + names(S.viewer) + ')</button></div>' : ''), 'Zurück zum Spiel', null, 'Zum Hauptmenü');
    var rs = $('#o-resign'); if (rs) rs.onclick = function () { confirmBox('Wirklich aufgeben?', (S.mode === 'net' ? 'Du gibst' : names(S.viewer) + ' gibt') + ' die Partie verloren.', 'Aufgeben', function () { if (S.mode === 'net') return netSubmit('resign', []); S.g.over = 1 - S.viewer; S.resigned = S.viewer; gameOver(); }); };
    $('#o-3d').onclick = function () { opt.d3 = !opt.d3; saveOpt(); applyOpt(); load3d(); this.textContent = '3D: ' + (opt.d3 ? 'an' : 'aus'); };
    $('#o-snd').onclick = function () { opt.snd = !opt.snd; saveOpt(); applyOpt(); if (opt.snd) SND.init(); this.textContent = 'Ton: ' + (opt.snd ? 'an' : 'aus'); };
    $('#o-big').onclick = function () { opt.big = !opt.big; saveOpt(); applyOpt(); this.textContent = 'Große Schrift: ' + (opt.big ? 'an' : 'aus'); render(); };
    $('#o-lab').onclick = function () { opt.lab = opt.lab === 'kanji' ? 'de' : 'kanji'; saveOpt(); applyOpt(); this.textContent = 'Beschriftung: ' + (opt.lab === 'kanji' ? 'Kanji' : 'Deutsch'); render(); };
    $('#mAlt').onclick = function () { $('#modal').classList.add('hidden'); clearTimeout(PL.timer); toMenu(); };
    if (S && S.mode === 'net' && S.stage === 'over') { $('#modalBox').insertAdjacentHTML('afterbegin', '<button class="btn go" id="o-re" style="float:right">Revanche</button>'); $('#o-re').onclick = function () { $('#modal').classList.add('hidden'); rematch(); }; }
  };
  window.addEventListener('resize', function () { if (S && S.stage !== 'battle') render(); });
  Object.keys(MASK).forEach(function (k) { new Image().src = 'img/koma/' + MASK[k] + '.svg'; }); // Kanji vorladen, sonst fehlen sie beim ersten Bild kurz
  applyOpt(); show('menu');
  function fromHash() { var hm = location.hash.match(/armee=([A-Z0-9]{6})/i); if (hm && !(S && S.net && S.net.code === hm[1].toUpperCase())) { if (S && S.mode === 'net') try { Net.leave(); } catch (e) { } netStart(hm[1].toUpperCase(), null); } }
  fromHash(); window.addEventListener('hashchange', fromHash);
  if (!introSeen()) intro(); // beim ersten Mal (auch über einen Online-Link) zuerst die Einführung
  window.AKUI = { S: function () { return S; }, newMatch: newMatch, PL: PL };
})();
