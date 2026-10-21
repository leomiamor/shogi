// Armee-Modus (Prototyp): Bedienung. Planen (Laden, Aufstellen, Überläufer, Befehle, Aufwerten), Probelauf,
// Schlacht-Wiedergabe in Takten (Pause, Schritt, Tempo, Überspringen), Reaktion, Rundenbericht. KI oder zu zweit an einem Gerät.
(function () {
  'use strict';
  var T = AK.TYPES, N = AK.N, R = AK.R;
  var MASK = { fu: 'FU', ky: 'KY', ke: 'KE', gi: 'GI', ki: 'KI', ka: 'KA', hi: 'HI', ou: 'OU', to: 'TO', ny: 'NY', nk: 'NK', ng: 'NG', um: 'UM', ry: 'RY' };
  var SHORT = { fu: 'Bau', ky: 'Lan', ke: 'Spr', gi: 'Sil', ki: 'Gol', ka: 'Läu', hi: 'Tur', ou: 'Herr', to: 'Bau+', ny: 'Lan+', nk: 'Spr+', ng: 'Sil+', um: 'Pfd', ry: 'Dra' };
  var SAVE = 'armee.v1';
  var $ = function (s) { return document.querySelector(s); };
  var opt = { big: false, lab: 'kanji', react: true, hc: 0 }; // hc: Gold pro Runde für die KI bzw. Spieler 2 (−2 … +2)
  try { var o0 = JSON.parse(localStorage.getItem('armee.opt') || '{}'); if (o0.big) opt.big = true; if (o0.lab) opt.lab = o0.lab; if (o0.react === false) opt.react = false; if (o0.hc) opt.hc = o0.hc; } catch (e) { }
  function saveOpt() { try { localStorage.setItem('armee.opt', JSON.stringify(opt)); } catch (e) { } }

  // S: ganzer Spielzustand der Seite
  var S = null;
  function names(p) { return S.mode === 'ki' ? (p === 0 ? 'Du' : 'KI') : 'Spieler ' + (p + 1); }

  // ---------- Start ----------
  function newMatch(mode) {
    var seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    S = { mode: mode, g: AK.newGame(seed, [0, opt.hc]), acts: [[], []], reacts: [[], []], viewer: 0, stage: 'plan', sel: null, log: [] };
    S.log.push({ t: 'Runde 1', s: 'Die Armeen stehen. Kaufe Truppen und stelle sie in deinen 3 Reihen auf.' });
    show('game'); beginPlan(0);
  }
  function save() { try { if (S && S.g.over == null && (S.stage === 'plan' || S.stage === 'handover') && S.viewer === 0 && !S.acts[0].length) localStorage.setItem(SAVE, JSON.stringify({ mode: S.mode, g: S.g, log: S.log.slice(-60) })); else if (S && S.g.over != null) localStorage.removeItem(SAVE); } catch (e) { } }
  function resume() {
    var d; try { d = JSON.parse(localStorage.getItem(SAVE)); } catch (e) { } if (!d) return;
    S = { mode: d.mode, g: d.g, acts: [[], []], reacts: [[], []], viewer: 0, stage: 'plan', sel: null, log: d.log || [] };
    show('game'); beginPlan(0);
  }
  function show(w) { $('#scr-menu').classList.toggle('hidden', w !== 'menu'); $('#scr-game').classList.toggle('hidden', w !== 'game'); if (w === 'menu') $('#m-resume').classList.toggle('hidden', !hasSave()); }
  function hasSave() { try { return !!localStorage.getItem(SAVE); } catch (e) { return false; } }

  // ---------- Ansicht der Planung: Grundstand + eigene Aktionen ----------
  function view() {
    var w = AK.clone(S.g); w.drops = [0, 0];
    if (S.stage === 'react') { S.reacts[S.viewer].forEach(function (a) { AK.apply(w, S.viewer, a, 'react'); }); }
    else S.acts[S.viewer].forEach(function (a) { AK.apply(w, S.viewer, a, 'plan'); });
    return w;
  }
  function myActs() { return S.stage === 'react' ? S.reacts[S.viewer] : S.acts[S.viewer]; }

  function beginPlan(p) {
    S.viewer = p; S.sel = null;
    if (S.mode === 'hot') { S.stage = 'handover'; cover(names(p) + ' plant', 'Gerät an ' + names(p) + ' geben. Der andere schaut bitte weg.', 'Ich bin ' + names(p) + ' – los', function () { S.stage = 'plan'; render(); }); }
    else S.stage = 'plan';
    save(); render();
  }
  function beginReact(p) {
    S.viewer = p; S.sel = null;
    var go = function () { S.stage = 'react'; render(); };
    if (S.mode === 'hot') { S.stage = 'handover'; cover('Reaktion: ' + names(p), 'Kurze Pause in der Schlacht. ' + names(p) + ' darf Befehle ändern und 1 Überläufer einsetzen.', 'Ich bin ' + names(p) + ' – los', go); }
    else go();
    render();
  }

  // ---------- Darstellung ----------
  function pos(x, y) { var v = S.viewer === 1 && S.stage !== 'battle' && S.mode === 'hot' ? 1 : 0; return v ? [N - 1 - x, N - 1 - y] : [x, y]; }
  function flipped() { return S.viewer === 1 && S.stage !== 'battle' && S.mode === 'hot'; }
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
    var g = S.g, p = S.viewer, planning = S.stage === 'plan' || S.stage === 'react';
    var w = planning ? view() : S.disp || g;
    $('#g-round').textContent = 'Runde ' + g.round;
    $('#g-who').innerHTML = '<span class="p' + p + 'c">' + names(p) + '</span>';
    $('#g-gold').textContent = w.gold[p];
    var st = { plan: 'Planung – ' + names(p), react: 'Reaktion – ' + names(p) + (R.reactFree ? ' (Befehle, 1 Überläufer gratis)' : ' (Befehle, 1 Überläufer)'), battle: S.probe ? 'Probelauf (zählt nicht)' : 'Schlacht – Teil ' + (S.phase + 1), handover: 'Bitte warten …', over: 'Partie vorbei' }[S.stage] || '';
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
    if (S.stage !== 'battle') drawBoard(w, marks);
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
    inf.innerHTML = ih; inf.classList.toggle('hidden', !ih);
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
    myActs().push(a); return true;
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
    var t = e.target.closest('[data-shop],[data-hand],[data-ord],[data-up]');
    if (t && S) {
      if (t.dataset.shop != null) { var i = +t.dataset.shop, o = view().offers[S.viewer][i]; if (o.sold) return; S.sel = S.sel && S.sel.shop === i ? null : { shop: i }; }
      else if (t.dataset.hand != null) { var j = +t.dataset.hand; S.sel = S.sel && S.sel.hand === j ? null : { hand: j }; }
      else if (t.dataset.ord) { var cu = AK.unit(view(), S.sel.id); if (cu && cu.ord !== t.dataset.ord) act({ k: 'ord', id: S.sel.id, ord: t.dataset.ord }); }
      else if (t.dataset.up) act({ k: 'up', id: S.sel.id });
      render(); return;
    }
  });
  $('#boardWrap').addEventListener('click', function (e) {
    var r = $('#board').getBoundingClientRect(), cx = Math.floor((e.clientX - r.left) / r.width * N), cy = Math.floor((e.clientY - r.top) / r.height * N);
    if (cx < 0 || cy < 0 || cx >= N || cy >= N) return;
    if (flipped()) { cx = N - 1 - cx; cy = N - 1 - cy; }
    clickCell(cx, cy);
  });
  $('#b-undo').onclick = function () { myActs().pop(); S.sel = null; S.newIds = null; render(); };
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
    if (S.mode === 'hot' && S.viewer === 0) return beginPlan(1);
    if (S.mode === 'ki') S.acts[1] = AKBot.plan(S.g, 1, 'mix', S.g.seed);
    var g = S.g; AK.applyAll(g, S.acts, 'plan'); S.acts = [[], []];
    var snap = AK.clone(g), ev = AK.runPhase(g, 0);
    S.stage = 'battle'; S.phase = 0;
    playPhase(snap, ev, 0, function () {
      if (g.over != null) return gameOver(); S.reacts = [[], []];
      if (!opt.react) { S.viewer = 0; return submitReact(true); } // ohne Reaktionspause geht Teil 2 direkt weiter
      beginReact(0);
    });
  }
  function submitReact(auto) {
    S.sel = null; S.newIds = null;
    if (!auto && S.mode === 'hot' && S.viewer === 0) return beginReact(1);
    if (!auto && S.mode === 'ki') S.reacts[1] = AKBot.react(S.g, 1, S.g.seed);
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
    var king = [0, 1].map(function (p) { var k = g.units.filter(function (u) { return u.p === p && u.t === 'ou'; })[0]; return k ? k.hp : 0; });
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
    else if (S.resigned != null) h = '<h2>' + (S.mode === 'ki' ? 'Aufgegeben' : names(w) + ' gewinnt!') + '</h2><p>' + (S.mode === 'ki' && S.resigned === 0 ? 'Du hast' : names(S.resigned) + ' hat') + ' in Runde ' + S.g.round + ' aufgegeben.</p>';
    else h = '<h2>' + (S.mode === 'ki' ? (w === 0 ? 'Sieg!' : 'Niederlage') : names(w) + ' gewinnt!') + '</h2><p>' + (S.mode === 'ki' ? (w === 0 ? 'Der KI-Feldherr' : 'Dein Feldherr') : 'Der Feldherr von ' + names(1 - w)) + ' ist in Runde ' + S.g.round + ' gefallen.</p>';
    S.stage = 'over'; try { localStorage.removeItem(SAVE); } catch (e) { }
    S.log.push({ t: 'Ende', s: w === 'remis' ? 'Remis.' : names(w) + ' gewinnt in Runde ' + S.g.round + '.' });
    render(); modal(h, 'Zum Menü', function () { S = null; show('menu'); }, 'Brett ansehen');
  }

  // ---------- Wiedergabe ----------
  var PL = { timer: null, paused: false, speed: 1, step: null, fin: null };
  function playPhase(snap, ticks, ph, done) {
    S.stage = 'battle'; S.phase = ph; S.disp = AK.clone(snap); S.sel = null;
    render(); drawBoard(S.disp, {});
    var i = 0; S.roundLoss = S.roundLoss || [0, 0];
    var lbl = (S.probe ? 'Probe ' : '') + 'Teil ' + (ph + 1);
    if (!ticks.length || ticks.every(function (e) { return !e.length; })) S.log.push({ t: lbl, s: 'Niemand in Reichweite, keiner rückt vor.' });
    function finish() { clearTimeout(PL.timer); PL.timer = null; PL.fin = null; PL.step = null; done(); }
    function next() {
      if (i >= ticks.length) return finish();
      var ev = ticks[i++]; doTick(ev, lbl + ', Takt ' + i);
      if (!PL.paused) PL.timer = setTimeout(next, 1100 / PL.speed);
    }
    PL.step = function () { clearTimeout(PL.timer); next(); };
    PL.fin = function () { // Überspringen: Rest ohne Animation
      clearTimeout(PL.timer);
      while (i < ticks.length) { var ev = ticks[i++]; applyEv(S.disp, ev, lbl + ', Takt ' + i); }
      drawBoard(S.disp, {}); finish();
    };
    $('#p-pause').textContent = PL.paused ? '▶ Weiter' : '⏸ Pause';
    PL.timer = setTimeout(next, 500 / PL.speed);
  }
  // Namen mit richtigem Artikel: „Dein Turm“, „Deine Lanze“, „KI-Turm“, „Roter Turm“
  function nm(u) {
    var n = T[u.t].n, fem = u.t === 'ky' || u.t === 'ny';
    if (S.mode === 'ki') return u.p === 0 ? (fem ? 'Deine ' : 'Dein ') + n : 'KI-' + n;
    return n + (u.p === 0 ? ' (Rot)' : ' (Blau)');
  }
  // Ereignisse eines Takts auf die Anzeige anwenden (ohne Animation) und knapp in den Bericht schreiben:
  // Schaden je Seite plus das Wichtige (Gefallene, Überläufer, Beförderungen)
  function applyEv(d, ev, lbl) {
    var lines = [], dmg = [0, 0];
    ev.forEach(function (e) {
      var u = AK.unit(d, e.id);
      if (e.e === 'atk') { var t = AK.unit(d, e.to); if (t) { t.hp -= e.dmg; if (u) dmg[u.p] += e.dmg; } }
      else if (e.e === 'die') { if (u) { u.hp = 0; lines.push('<b>' + nm(u) + ' fällt</b>' + (u.t !== 'ou' ? ' (wird Überläufer für ' + (S.mode === 'ki' ? (u.p === 0 ? 'die KI' : 'dich') : names(1 - u.p)) + ')' : '')); if (!S.probe) S.roundLoss[u.p]++; } }
      else if (e.e === 'flee' && T[e.t].cost >= 3) lines.push('Hand voll: ' + (S.mode === 'ki' ? (e.p === 0 ? 'dein' : 'ihr') : names(e.p) + 's') + ' Überläufer ' + T[e.t].n + ' läuft davon');
      else if (e.e === 'move' && u) { u.x = e.tx; u.y = e.ty; }
      else if (e.e === 'promo' && u) { var add = T[e.t].hp - T[T[e.t].base].hp, old = nm(u); u.t = e.t; u.mhp += add; u.hp += add; lines.push(old + ' wird befördert: <b>' + T[e.t].n + '</b>'); }
    });
    if (dmg[0] || dmg[1]) lines.unshift('Schaden ' + names(0) + ' ' + dmg[0] + ', ' + names(1) + ' ' + dmg[1]);
    if (lines.length) S.log.push({ t: lbl, s: lines.join(' · ') });
  }
  function doTick(ev, lbl) {
    var d = S.disp, U = $('#units'), fx = $('#fx'), dur = Math.round(320 / PL.speed);
    document.documentElement.style.setProperty('--mv', dur + 'ms');
    // Angriffe: Linien und Schadenszahlen
    var svg = '<svg viewBox="0 0 9 9">';
    ev.forEach(function (e) { if (e.e === 'atk') { var a = pos(e.x, e.y), b = pos(e.tx, e.ty), u = AK.unit(d, e.id); svg += '<line x1="' + (a[0] + .5) + '" y1="' + (a[1] + .5) + '" x2="' + (b[0] + .5) + '" y2="' + (b[1] + .5) + '" stroke="' + (u && u.p === 1 ? '#4fb4ff' : '#f0a336') + '" stroke-width=".09" stroke-linecap="round" opacity=".9"/>'; } });
    fx.innerHTML = svg + '</svg>';
    ev.forEach(function (e) {
      if (e.e !== 'atk') return; var q = pos(e.tx, e.ty), el = document.createElement('div');
      el.className = 'dmg'; el.textContent = '−' + e.dmg; el.style.left = (q[0] + .5) / 9 * 100 + '%'; el.style.top = (q[1] + .5) / 9 * 100 + '%'; fx.appendChild(el);
      var tu = U.querySelector('[data-id="' + e.to + '"]'); if (tu) tu.classList.add('flash');
    });
    applyEv(d, ev, lbl);
    // Lebensbalken, Tote, Bewegungen
    setTimeout(function () {
      U.querySelectorAll('.u').forEach(function (el) {
        el.classList.remove('flash'); var u = AK.unit(d, +el.dataset.id); if (!u) return;
        var bar = el.querySelector('.hp i'); if (bar) bar.style.width = Math.max(0, 100 * u.hp / u.mhp) + '%';
        if (u.hp <= 0) el.classList.add('dead');
      });
      ev.forEach(function (e) {
        if (e.e === 'move') { var el = U.querySelector('[data-id="' + e.id + '"]'); if (el) place(el, e.tx, e.ty); }
        if (e.e === 'promo') { var el2 = U.querySelector('[data-id="' + e.id + '"]'), u = AK.unit(d, e.id); if (el2 && u) { var tmp = document.createElement('div'); tmp.innerHTML = unitHTML(u); var nu = tmp.firstChild; nu.style.transform = el2.style.transform; el2.replaceWith(nu); } }
      });
      setTimeout(function () { fx.innerHTML = ''; }, dur);
    }, dur);
    renderLog();
  }
  $('#p-pause').onclick = function () { PL.paused = !PL.paused; this.textContent = PL.paused ? '▶ Weiter' : '⏸ Pause'; if (!PL.paused && PL.step) PL.step(); };
  $('#p-step').onclick = function () { PL.paused = true; $('#p-pause').textContent = '▶ Weiter'; if (PL.step) PL.step(); };
  $('#p-speed').onclick = function () { PL.speed = PL.speed === 1 ? 2 : PL.speed === 2 ? 0.5 : 1; this.textContent = 'Tempo ' + (PL.speed === 0.5 ? '½' : PL.speed) + '×'; };
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
    modal('<h2>Regeln (Grundregeln)</h2><ul>' +
      '<li><b>Ziel:</b> Der gegnerische Feldherr (王) fällt.</li>' +
      '<li><b>Runde:</b> Beide planen geheim. Dann läuft die Schlacht von selbst: Teil 1, kurze Reaktion, Teil 2. Die Truppen bleiben danach stehen.</li>' +
      '<li><b>Planen:</b> Truppen im Laden kaufen und in deinen 3 Reihen aufstellen. Aufwerten (★) gibt mehr Leben und Schaden. Neue Angebote kosten 1 Gold. Übriges Gold bleibt.</li>' +
      '<li><b>Kampf:</b> Jede Truppe schlägt nur in ihre Richtungen (Bild auf der Karte, wie im Shogi). Ist niemand in Reichweite, läuft sie zum nächsten Gegner und stellt sich passend hin. Alle schlagen gleichzeitig, immer den Schwächsten.</li>' +
      '<li><b>Befehle:</b> ⚔ Vorrücken oder 🛡 Halten: bleibt stehen und schlägt mit +' + R.holdAtk + ' Schaden zu. Halten lohnt gegen Angreifer, Schützen kontern es aus der Ferne.</li>' +
      '<li><b>Schützen:</b> Läufer und Turm schießen 3 Felder weit, auch über eigene Truppen.</li>' +
      '<li><b>Beförderung:</b> In den hinteren 3 Reihen des Gegners werden Truppen stärker.</li>' +
      '<li><b>Überläufer:</b> Wen du schlägst, der kann für dich kämpfen: in deiner Hälfte, 2 pro Planung zum halben Preis, 1 in der Reaktion gratis. Mehr als ' + R.handMax + ' in der Hand: der billigste läuft davon.</li>' +
      '<li><b>Gold:</b> ' + R.start + ' am Anfang, dann ' + R.income(2) + ' pro Runde, steigt bis ' + R.income(99) + '.</li>' +
      '<li><b>Nachschub:</b> Für jede verlorene Truppe gibt es nächste Runde 1 Gold extra (höchstens ' + R.lossGoldMax + ').</li>' +
      '<li><b>Sturm aufs Lager:</b> Hat eine Seite am Rundenende keine Truppen mehr, trifft jede überlebende gegnerische Truppe ihren Feldherrn mit ' + R.storm + '-fachem Schaden.</li>' +
      '<li><b>Generalangriff:</b> Ab Runde ' + R.pattRound + ' rücken alle Truppen vor, Halten gilt nicht mehr.</li>' +
      '<li><b>Aufgeben:</b> im Menü ☰, wie beim Shogi.</li>' +
      '<li><b>Probelauf:</b> Zeigt, wie deine Aufstellung gegen den jetzigen Stand des Gegners laufen würde.</li></ul>', 'Verstanden');
  }

  // ---------- Menü ----------
  function applyOpt() { document.documentElement.classList.toggle('big', opt.big); $('#m-big').textContent = 'Große Schrift: ' + (opt.big ? 'an' : 'aus'); $('#m-lab').textContent = 'Beschriftung: ' + (opt.lab === 'kanji' ? 'Kanji' : 'Deutsch'); $('#m-react').textContent = 'Reaktionspause: ' + (opt.react ? 'an' : 'aus (einfacher)');
    $('#m-hc').textContent = 'KI / Spieler 2: ' + ({ '-2': 'viel schwächer (−2 Gold/Runde)', '-1': 'schwächer (−1 Gold/Runde)', '0': 'gleich stark', '1': 'Vorgabe +1 Gold/Runde', '2': 'Vorgabe +2 Gold/Runde' })[opt.hc]; }
  $('#m-ki').onclick = function () { newMatch('ki'); };
  $('#m-hot').onclick = function () { newMatch('hot'); };
  $('#m-resume').onclick = resume;
  $('#m-rules').onclick = rules; $('#g-help').onclick = rules;
  $('#m-big').onclick = function () { opt.big = !opt.big; saveOpt(); applyOpt(); };
  var HC = [0, 1, 2, -1, -2]; // ±1 Gold pro Runde ≈ 72 % Siegchance im Selbstspiel, ±2 ≈ 88 %
  $('#m-hc').onclick = function () { opt.hc = HC[(HC.indexOf(opt.hc) + 1) % HC.length]; saveOpt(); applyOpt(); };
  $('#m-react').onclick = function () { opt.react = !opt.react; saveOpt(); applyOpt(); };
  $('#m-lab').onclick = function () { opt.lab = opt.lab === 'kanji' ? 'de' : 'kanji'; saveOpt(); applyOpt(); };
  $('#g-menu').onclick = function () {
    modal('<h2>Menü</h2><p>Die Partie wird zu Beginn jeder Runde gespeichert.</p><div class="row"><button class="btn small" id="o-big">Große Schrift: ' + (opt.big ? 'an' : 'aus') + '</button><button class="btn small" id="o-lab">Beschriftung: ' + (opt.lab === 'kanji' ? 'Kanji' : 'Deutsch') + '</button></div>' + (S && S.g.over == null && (S.stage === 'plan' || S.stage === 'react') ? '<div class="row" style="margin-top:10px"><button class="btn small" id="o-resign">🏳 Aufgeben (' + names(S.viewer) + ')</button></div>' : ''), 'Zurück zum Spiel', null, 'Zum Hauptmenü');
    var rs = $('#o-resign'); if (rs) rs.onclick = function () { confirmBox('Wirklich aufgeben?', names(S.viewer) + ' gibt die Partie verloren.', 'Aufgeben', function () { S.g.over = 1 - S.viewer; S.resigned = S.viewer; gameOver(); }); };
    $('#o-big').onclick = function () { opt.big = !opt.big; saveOpt(); applyOpt(); this.textContent = 'Große Schrift: ' + (opt.big ? 'an' : 'aus'); render(); };
    $('#o-lab').onclick = function () { opt.lab = opt.lab === 'kanji' ? 'de' : 'kanji'; saveOpt(); applyOpt(); this.textContent = 'Beschriftung: ' + (opt.lab === 'kanji' ? 'Kanji' : 'Deutsch'); render(); };
    $('#mAlt').onclick = function () { $('#modal').classList.add('hidden'); clearTimeout(PL.timer); S = null; show('menu'); };
  };
  window.addEventListener('resize', function () { if (S && S.stage !== 'battle') render(); });
  Object.keys(MASK).forEach(function (k) { new Image().src = 'img/koma/' + MASK[k] + '.svg'; }); // Kanji vorladen, sonst fehlen sie beim ersten Bild kurz
  applyOpt(); show('menu');
  window.AKUI = { S: function () { return S; }, newMatch: newMatch, PL: PL };
})();
