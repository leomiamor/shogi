// Hauptprogramm: Bildschirme, Spielablauf, Coach, Kampagne, Duell.
(function () {
  'use strict';
  var OWNER_HASH = 'f0ea9529b89b2bb9';
  var STORE = 'shogiPfad.v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function cyrb(str) { var h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (var i = 0; i < str.length; i++) { var ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16); }

  // ---------- Profil ----------
  var DEFAULTS = { render: '2d', quality: 'high', pieceStyle: 'both', sfx: 0.8, music: 0.35, mute: false, fights: 'voll', army: false, armyLook: 'farbe', armySashi: true, threats: true, coach: true, dots: true, autoFlip: true, models: true, theme: 'feudal', figSet: 'statue', statueMats: ['gold', 'silber'], komaStyle: 'stein', boardTone: 'urushi', scene: 'buehne', name: 'Du', skin: 'classic', palette: 'abend' };
  var P = load();
  function load() {
    var d = null; try { d = JSON.parse(localStorage.getItem(STORE)); } catch (e) { }
    d = d || {}; d.settings = Object.assign({}, DEFAULTS, d.settings || {});
    if (!d.settings.moodV) { if (!d.settings.fieldMood || d.settings.fieldMood === 'feldzug') d.settings.fieldMood = 'kontinent'; d.settings.moodV = 1; } // Kontinent ist neuer Standard (einmalig, 19.10.)
    d.xp = d.xp || 0; d.lessons = d.lessons || {}; d.puzzles = d.puzzles || {}; d.stats = d.stats || { w: 0, l: 0 }; d.duels = d.duels || [];
    d.rating = d.rating || { r: Rating.START.never, rd: 350, n: 0, hist: [] }; d.prating = d.prating || { r: 800, rd: 350, n: 0 };
    d.titles = d.titles || []; d.skins = d.skins || ['classic']; d.cards = d.cards || {}; d.charges = d.charges || 0; d.losses = d.losses || {}; d.easy = d.easy || {};
    d.rival = d.rival || { r: null, rd: 300, w: 0, l: 0, d: 0, platform: 'ccBlitz', chess: null }; d.daily = d.daily || { last: '', streak: 0 };
    return d;
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(P)); } catch (e) { } }
  var S = P.settings;
  // Besitzer-Modus: lokale Datei oder geheimer Link (#key=...)
  (function () {
    var m = location.hash.match(/key=([\w-]+)/);
    if (m && cyrb(m[1]) === OWNER_HASH) { P.owner = true; save(); history.replaceState(null, '', location.pathname + location.search); toastLater('Besitzer-Modus freigeschaltet. Willkommen, Fürst!'); }
    if (location.protocol === 'file:') P.owner = true;
  })();
  addEventListener('hashchange', function () { var m = location.hash.match(/key=([\w-]+)/); if (m && cyrb(m[1]) === OWNER_HASH && !P.owner) { P.owner = true; save(); location.replace(location.pathname + location.search); } });
  var OWNER = !!P.owner;
  var TH = THEMES[S.theme] && THEMES[S.theme].ready ? THEMES[S.theme] : THEMES.feudal;
  var HAS3D = typeof THREE !== 'undefined';
  if (!HAS3D && S.render === '3d') S.render = '2d';
  Sfx.setVolume(S.sfx, S.music, S.mute);

  // ---------- Lautstärke ----------
  // Regler 0–100 % fühlt sich linear an: Pegel = Max · (Regler)²
  var VMAX = { sfx: 1, music: 0.7 };
  function volPct(key) { return Math.round(Math.sqrt(Math.min(1, S[key] / VMAX[key])) * 100); }
  function volIcon() { if (S.mute) return '🔇'; var p = Math.max(volPct('sfx'), volPct('music')); return p === 0 ? '🔇' : p < 34 ? '🔈' : p < 67 ? '🔉' : '🔊'; }
  function volRefresh() { document.querySelectorAll('.vol-ico').forEach(function (b) { b.textContent = volIcon(); b.classList.toggle('muted', S.mute); }); }
  function volApply() { Sfx.setVolume(S.sfx, S.music, S.mute); volRefresh(); }
  function toggleMute() { S.mute = !S.mute; save(); Sfx.unlock(); volApply(); if (!S.mute) Sfx.play('ui'); }
  function volControls() {
    var box = h('div', 'vol-box');
    var mb = h('button', 'btn vol-mute'); box.appendChild(mb);
    function paintMute() { mb.innerHTML = S.mute ? 'Stumm · tippen für Ton' : 'Ton an · tippen für stumm'; mb.classList.toggle('on', S.mute); box.classList.toggle('is-muted', S.mute); }
    mb.onclick = function () { toggleMute(); paintMute(); };
    [['music', 'Musik'], ['sfx', 'Effekte']].forEach(function (o) {
      var key = o[0], row = h('label', 'vol-row');
      row.innerHTML = '<span class="vl">' + o[1] + '</span><input type="range" min="0" max="100" step="1"><b class="vp"></b>';
      var r = row.querySelector('input'), vp = row.querySelector('.vp');
      function show() { var p = +r.value; vp.textContent = p ? p + ' %' : 'aus'; r.style.setProperty('--p', p + '%'); }
      r.value = volPct(key); show();
      r.oninput = function () { var p = +r.value / 100; S[key] = Math.round(VMAX[key] * p * p * 1000) / 1000; if (S.mute && p > 0) { S.mute = false; paintMute(); } show(); volApply(); };
      r.onchange = function () { save(); if (key === 'sfx') Sfx.play('ui'); };
      box.appendChild(row);
    });
    paintMute(); return box;
  }
  function volPanel() {
    Sfx.unlock();
    var b = modal('<h2>Lautstärke</h2><div class="vol-slot"></div><p class="vol-tip">Tipp am PC: Taste <b>M</b> schaltet stumm.</p><div class="acts"><button class="btn" id="vol-ok">Fertig</button></div>', 'vol-modal');
    b.querySelector('.vol-slot').appendChild(volControls());
    $('#vol-ok').onclick = function () { closeModal(); };
  }
  addEventListener('keydown', function (e) { if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) { toggleMute(); } });
  function applyPalette() { document.documentElement.dataset.pal = S.palette; var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(); }
  applyPalette();

  // ---------- Rang ----------
  function xpFor(i) { return 60 * i + 15 * i * i; }
  function rankOf(xp) { var i = 0; while (i < TH.ranks.length - 1 && xp >= xpFor(i + 1)) i++; return i; }
  function addXP(n) {
    var before = rankOf(P.xp); P.xp += n; save(); var after = rankOf(P.xp);
    return after > before ? after : -1;
  }
  function rankHTML() {
    var r = rankOf(P.xp), a = xpFor(r), b = xpFor(r + 1), pct = r >= TH.ranks.length - 1 ? 100 : Math.round((P.xp - a) / (b - a) * 100), R = realRank();
    return '<div class="rank-emblem' + (R.sure ? '' : ' unsure') + '">' + Rating.kanji(R.name).replace(/(\d+)/, '$1<br>') + '</div><div style="flex:1"><b style="font-family:var(--font-d)">' + (P.title || TH.rankTitles[r]) + ' · ' + R.name + (R.sure ? '' : ' (vorläufig)') + '</b><div class="xpbar"><i style="width:' + pct + '%"></i></div><small style="color:var(--mute)">Wertung ' + P.rating.r + ' · ' + TH.ranks[r] + ' · ' + P.xp + ' XP</small></div>';
  }
  // Echter Rang aus der Wertung (Lishogi-Skala). Sicher erst ab Unsicherheit < 110.
  function realRank() { var rt = Rating.age(P.rating, Date.now()), i = Rating.shownRank(rt.r, P.rating.shown); return { i: i, name: Rating.rankName(i), sure: rt.rd < 110, r: rt.r, rd: rt.rd }; }
  // Partie gegen KI (oder Gegenspieler) werten. Gibt Infozeile für das Ergebnis zurück.
  function rateGame(oppR, oppRD, s) {
    var before = realRank(), old = P.rating.r, nr = Rating.update(Rating.age(P.rating, Date.now()), oppR, oppRD, s);
    P.rating.r = nr.r; P.rating.rd = nr.rd; P.rating.n++; P.rating.t = Date.now();
    P.rating.hist.push(nr.r); if (P.rating.hist.length > 60) P.rating.hist.shift();
    var after = realRank(); if (after.sure) P.rating.shown = after.i; save();
    var d = nr.r - old, line = 'Wertung ' + nr.r + ' (' + (d >= 0 ? '+' : '') + d + ')';
    if (after.sure && (!before.sure || after.i > before.i)) line += ' · Neuer Rang: <b>' + after.name + '</b>';
    return { line: line, up: after.sure && (!before.sure || after.i > before.i) ? after.name : null };
  }

  // ---------- Bildschirme ----------
  var current = 'title';
  function go(name) {
    if (name !== 'game' && G) G.stop();
    $$('.screen').forEach(function (s) { s.classList.remove('active'); });
    $('#scr-' + name).classList.add('active'); current = name;
    if (name === 'title') renderTitle();
    if (name === 'map') renderMap();
    if (name === 'puzzles') renderPuzzles();
    if (name === 'battle') renderBattle();
    if (name === 'duel') renderDuel();
    if (name === 'codex') renderCodex();
    if (name === 'settings') renderSettings();
    if (name === 'rating') renderRating();
    Sfx.setIntensity(0);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]'); if (b) { Sfx.play('ui'); go(b.dataset.go); }
  });
  if (!OWNER) $$('.owner-only').forEach(function (e) { e.classList.add('hidden'); });
  $('#theme-name').textContent = TH.name;

  // Tippen zum Starten (nötig für Audio am Handy)
  $('#tap-start').addEventListener('click', start);
  $('#vol-fab').addEventListener('click', function (e) { e.stopPropagation(); volPanel(); });
  volRefresh();
  $('#scr-title').addEventListener('click', function (e) { if (!$('#main-menu').classList.contains('hidden')) return; start(); });
  function start() {
    if (!$('#main-menu').classList.contains('hidden')) return;
    Sfx.unlock(); Sfx.play('promote'); Sfx.music(true);
    $('#tap-start').classList.add('hidden'); $('#main-menu').classList.remove('hidden');
    renderTitle();
    // Online-Link: #duell=CODE
    var m = location.hash.match(/duell=([A-Z0-9]{6})/i);
    if (m) { history.replaceState(null, '', location.pathname + location.search); joinOnline(m[1].toUpperCase()); }
  }
  function renderTitle() {
    $('#profile-badge').innerHTML = rankHTML();
    var r = $('#btn-resume');
    if (OWNER && P.saved && P.saved.moves) { r.classList.remove('hidden'); r.onclick = function () { resumeSaved(); }; } else r.classList.add('hidden');
  }

  // Hintergrund-Partikel (Glühwürmchen/Blüten) im Menü
  (function bg() {
    var c = $('#bgfx'), g = c.getContext('2d'), parts = [];
    function size() { c.width = innerWidth; c.height = innerHeight; } size(); addEventListener('resize', size);
    for (var i = 0; i < 40; i++) parts.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, s: 1 + Math.random() * 2.5, v: 0.2 + Math.random() * 0.5, p: Math.random() * 6 });
    (function loop(t) {
      requestAnimationFrame(loop);
      if (current === 'game') { g.clearRect(0, 0, c.width, c.height); return; }
      g.clearRect(0, 0, c.width, c.height);
      parts.forEach(function (p) { p.y -= p.v; p.x += Math.sin(t / 1000 + p.p) * 0.4; if (p.y < -10) { p.y = c.height + 10; p.x = Math.random() * c.width; } g.globalAlpha = 0.4 + Math.sin(t / 400 + p.p) * 0.3; g.fillStyle = p.p > 3 ? '#ffd76a' : '#ffb6cf'; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.fill(); });
      g.globalAlpha = 1;
    })(0);
  })();

  function toast(msg, ms) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, ms || 2600); }
  function toastLater(m) { setTimeout(function () { toast(m, 4000); }, 600); }
  function modal(html, cls) { var m = $('#modal'); $('#modal-box').innerHTML = html; $('#modal-box').className = 'modal-box ' + (cls || ''); m.classList.remove('hidden'); return $('#modal-box'); }
  function closeModal() { $('#modal').classList.add('hidden'); }

  function komaHTML(t, col, style) {
    var u = TH.units[t]; style = style || S.pieceStyle;
    var kan = t === 8 && col === 1 ? (u.kanji2 || u.kanji) : u.kanji;
    var inner = '';
    if (style !== 'kanji') inner += '<div class="koma-icon">' + unitSVG(TH, t, col, { color: komaInk(t, col) }) + '</div>';
    if (style !== 'icon') inner += style === 'kanji' ? komaKanjiHTML(kan) : '<div class="koma-kanji">' + kan + '</div>';
    return '<div class="koma c' + col + (t >= 9 ? ' promo' : '') + (t === 8 ? ' king' : '') + '"><div class="koma-in">' + inner + '</div></div>';
  }
  // Gemalte Porträts (Flux, img/p/<id>.webp); sonst Symbol auf Farbverlauf
  var PORTRAITS = ['kappa', 'tanuki', 'onichief', 'kage', 'warden', 'hayato', 'siege', 'ronin', 'monk', 'abbot', 'guardian', 'dragon', 'trader', 'gaston', 'white', 'shadow', 'bandit', 'kenji', 'takeda', 'raijin', 'meister', 'mentor'];
  Object.keys(FOES).forEach(function (k) { FOES[k].id = k; });
  function portraitHTML(o, size) {
    var icon = o.icon || 'king';
    if (o.id && PORTRAITS.indexOf(o.id) >= 0) return '<div class="portrait pimg" style="background-image:url(img/p/' + o.id + '.webp);--pc:' + (o.color || '#888') + '"></div>';
    return '<div class="portrait" style="background:radial-gradient(circle at 35% 30%,' + o.color + ',#1a1020)">' + '<svg viewBox="0 0 100 100" fill="#fff4dc">' + ICONS[icon] + '</svg></div>';
  }
  function mentorHTML() { return '<div class="portrait pimg" style="background-image:url(img/p/mentor.webp)"></div>'; }

  // Geschichte im Visual-Novel-Stil
  function story(lines, unit, done) {
    var i = 0;
    function show() {
      var ub = unit ? '<div class="unit-banner"><div class="pv">' + komaHTML(unit, 0) + '</div><div style="text-align:left"><b style="font-family:var(--font-d);font-size:18px;color:var(--gold)">' + TH.units[unit].name + '</b><br><small style="color:var(--mute)">' + TH.units[unit].real + ' · ' + TH.units[unit].kanji + '</small></div></div>' : '';
      var box = modal(ub + '<div class="story">' + mentorHTML() + '<p>' + lines[i] + '</p></div><div class="story-step">' + TH.mentor.name + ' · ' + (i + 1) + '/' + lines.length + '</div><div class="acts"><button class="btn gold" id="st-next">' + (i < lines.length - 1 ? 'Weiter' : 'Los geht\'s!') + '</button></div>');
      $('#st-next', box).onclick = function () { Sfx.play('ui'); i++; if (i < lines.length) show(); else { closeModal(); done && done(); } };
    }
    if (!lines || !lines.length) { done && done(); return; }
    show();
  }

  // ---------- Kampagnenkarte ----------
  function lessonDone(id) { return (P.lessons[id] || 0) > 0; }
  function lessonUnlocked(L) { var idx = LESSONS.indexOf(L); return idx === 0 || lessonDone(LESSONS[idx - 1].id); }
  function chapterState(ch) { var ls = LESSONS.filter(function (l) { return l.ch === ch.id; }); var done = ls.every(function (l) { return lessonDone(l.id); }); var open = lessonUnlocked(ls[0]); return { ls: ls, done: done, open: open }; }
  var TYPES = { T: ['📜', 'Tutorial'], M: ['🎯', 'Mission'], R: ['🧩', 'Rätsel'], G: ['⚔', 'Gegner'], MB: ['💀', 'Mini-Boss'], S: ['⛩', 'Schrein'], B: ['👹', 'Boss'] };
  function renderMap() {
    var map = $('#map'); map.innerHTML = '';
    var R = realRank();
    $('#xp-mini').innerHTML = '<small>' + R.name + (R.sure ? '' : '?') + ' · 🦊' + P.charges + '</small>';
    var svg = '<svg class="paths" viewBox="0 0 100 100" preserveAspectRatio="none">';
    for (var i = 1; i < CHAPTERS.length; i++) { var a = CHAPTERS[i - 1], b = CHAPTERS[i], st = chapterState(b); svg += '<path d="M' + a.x + ' ' + a.y + ' Q ' + ((a.x + b.x) / 2 + 6) + ' ' + ((a.y + b.y) / 2 - 6) + ' ' + b.x + ' ' + b.y + '" stroke="' + (st.open ? '#ffd76a' : 'rgba(255,255,255,.25)') + '" stroke-dasharray="2 1.5" fill="none" vector-effect="non-scaling-stroke" style="stroke-width:3px"/>'; }
    map.innerHTML = svg + '</svg>';
    var curSet = false;
    CHAPTERS.forEach(function (ch, i) {
      var st = chapterState(ch), n = h('div', 'node' + (st.open ? '' : ' locked') + (st.done ? ' done' : '')), boss = st.ls.filter(function (l) { return l.type === 'B'; })[0];
      if (st.open && !st.done && !curSet) { n.classList.add('current'); curSet = true; }
      n.style.left = ch.x + '%'; n.style.top = ch.y + '%';
      var stars = st.ls.reduce(function (s2, l) { return s2 + (P.lessons[l.id] || 0); }, 0);
      n.innerHTML = '<div class="disc" style="background-image:url(img/ch/' + ch.id + '.webp)"><span>' + '一二三四五六七八'[i] + '</span></div>' + (boss ? '<div class="boss-pin" style="background-image:url(img/p/' + boss.foe + '.webp);--pc:' + FOES[boss.foe].color + '">' + (st.done ? '<i>👑</i>' : '') + '</div>' : '') + '<div class="lbl">' + ch.name + (st.open ? '<br><span class="st">★ ' + stars + '/' + st.ls.length * 3 + '</span>' : '') + '</div>';
      n.onclick = function () { if (!st.open) { Sfx.play('error'); toast('Erst das vorige Kapitel schaffen.'); return; } Sfx.play('ui'); openChapter(ch); };
      map.appendChild(n);
    });
    $('#chapter-panel').classList.add('hidden');
  }
  function lessonHC(L) { return HC_ORDER[Math.min(HC_ORDER.length - 1, HC_ORDER.indexOf(L.hc) + (P.easy[L.id] || 0))]; }
  function foeOpp(L) {
    var f = FOES[L.foe], hc = lessonHC(L);
    return { id: L.foe, name: f.name, title: f.title, icon: f.icon, color: f.color, say: f.say, lvl: L.ch, opts: Object.assign({}, f.opts, L.opts || {}), r: Rating.effective(f.r, hc), hc: hc };
  }
  function openChapter(ch) {
    var p = $('#chapter-panel'), st = chapterState(ch);
    p.innerHTML = '<div style="display:flex;align-items:center;gap:10px"><div style="flex:1"><h3>' + ch.name + '</h3><small style="color:var(--mute)">' + ch.sub + '</small></div><button class="btn icon" id="cp-close">×</button></div>';
    st.ls.forEach(function (L) {
      var un = lessonUnlocked(L), stars = P.lessons[L.id] || 0, ty = TYPES[L.type] || TYPES.T, d = h('div', 'lesson t-' + L.type + (un ? '' : ' locked'));
      var ico = L.foe ? portraitHTML(FOES[L.foe]) : '<div style="position:relative;width:100%;height:100%">' + komaHTML(L.unit || (L.kind === 'puzzles' ? 5 : 8), 0) + '</div>';
      var sub = ty[1];
      if (L.kind === 'tsume') sub += ' · Matt in ' + (L.plies || 1); else if (L.kind === 'puzzles') sub += ' · ' + L.count + ' Rätsel'; else if (L.kind === 'quiz') sub += ' · Wissen';
      if (L.foe) sub += ' · ' + HANDICAPS[lessonHC(L)].name + ' · ~' + foeOpp(L).r;
      d.innerHTML = '<div class="ico">' + ico + '<span class="tbadge">' + ty[0] + '</span></div><div class="t"><b>' + L.id + ' · ' + L.title + '</b><small>' + sub + '</small></div><div class="stars">' + (L.kind === 'shrine' ? (stars ? '✓' : '') : starStr(stars)) + '</div>';
      d.onclick = function () { if (!un) { Sfx.play('error'); toast('Erst die vorige Station schaffen.'); return; } Sfx.play('ui'); p.classList.add('hidden'); startLesson(L); };
      p.appendChild(d);
    });
    p.classList.remove('hidden');
    $('#cp-close').onclick = function () { p.classList.add('hidden'); };
  }
  function starStr(n) { var s = ''; for (var i = 0; i < 3; i++) s += i < n ? '★' : '<span class="off">★</span>'; return s; }
  function oppById(id) { return TH.opponents.filter(function (o) { return o.id === id; })[0]; }

  // ---------- Rätsel-Liste ----------
  var SETS = [
    { id: 'm1', name: 'Matt in 1', desc: 'Ein Zug, und der Daimyō fällt.', unit: 5 },
    { id: 'm3', name: 'Matt in 3', desc: 'Schach, Antwort, Matt.', unit: 7 },
    { id: 'tac', name: 'Tesuji', desc: 'Gabeln, Drops, Material gewinnen.', unit: 3 },
    { id: 'rush', name: 'Matt-Sturm', desc: '3 Leben, 3 Minuten. Wie viele schaffst du?', unit: 14 }
  ];
  function today(off) { var d = new Date(Date.now() - (off || 0) * 864e5); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function dailyPick() { var t = today(), hsh = parseInt(cyrb(t).slice(0, 6), 16), sets = ['m1', 'tac', 'm1', 'm3', 'm1', 'tac', 'm3'], set = sets[new Date().getDay()]; return { set: set, idx: hsh % PUZZLES[set].length }; }
  function renderPuzzles() {
    var list = $('#puzzle-list'); list.innerHTML = '';
    var dp = dailyPick(), done = P.daily.last === today(), streak = P.daily.last === today() || P.daily.last === today(1) ? P.daily.streak : 0;
    var dc = h('div', 'card click daily' + (done ? ' done' : ''));
    dc.innerHTML = '<div class="opp-card"><div class="streak">🔥<b>' + streak + '</b></div><div><h3>Tagesrätsel</h3><p>' + (done ? 'Heute geschafft! Morgen kommt das nächste.' : 'Ein Rätsel pro Tag hält die Serie am Leben.') + '</p><small style="color:var(--gold)">Rätsel-Wertung ' + P.prating.r + '</small></div></div>';
    dc.onclick = function () { if (done) { toast('Heute schon gelöst. Serie: ' + streak); return; } Sfx.play('ui'); playPuzzle(dp.set, dp.idx, '· Tagesrätsel', function (ok) { if (ok) { P.daily.streak = (P.daily.last === today(1) ? P.daily.streak : 0) + 1; P.daily.last = today(); var rk = addXP(20); save(); toast('🔥 Serie: ' + P.daily.streak + ' Tage'); } go('puzzles'); }); };
    list.appendChild(dc);
    SETS.forEach(function (st) {
      var arr = st.id === 'rush' ? PUZZLES.m1 : PUZZLES[st.id], solved = st.id === 'rush' ? 0 : arr.filter(function (p, i) { return P.puzzles[st.id + i]; }).length;
      var c = h('div', 'card click'), best = st.id === 'rush' ? (P.rushBest || 0) : 0;
      c.innerHTML = '<div class="opp-card"><div style="position:relative;width:52px;height:56px">' + komaHTML(st.unit, 0) + '</div><div><h3>' + st.name + '</h3><p>' + st.desc + '</p><small style="color:var(--gold)">' + (st.id === 'rush' ? 'Rekord: ' + best : solved + ' / ' + arr.length + ' gelöst') + '</small></div></div>';
      c.onclick = function () { Sfx.play('ui'); if (st.id === 'rush') startRush(); else startPuzzleSet(st.id, nextPuzzleIdx(st.id), 9999); };
      list.appendChild(c);
    });
  }
  function nextPuzzleIdx(set) {
    // Wiederholung: zuerst falsch gelöste, dann ungelöste
    var arr = PUZZLES[set], i;
    for (i = 0; i < arr.length; i++) if (P.puzzles[set + i] === -1) return i;
    for (i = 0; i < arr.length; i++) if (!P.puzzles[set + i]) return i;
    return Math.floor(Math.random() * arr.length);
  }

  // ---------- Gefecht ----------
  function renderBattle() {
    var list = $('#opp-list'); list.innerHTML = '';
    TH.opponents.forEach(function (o) {
      var c = h('div', 'card click'), wins = (P.stats.opp || {})[o.id] || 0;
      var ch = Math.round(Rating.expect(P.rating.r, o.r, 0) * 100);
      c.innerHTML = '<div class="opp-card">' + portraitHTML(o) + '<div><h3>' + o.name + '</h3><div class="lvl">' + Rating.rankName(Rating.rankIdx(o.r)) + ' (~' + o.r + ') · ' + o.title + ' · Siegchance ~' + ch + ' %</div><p style="margin-top:6px">„' + o.quote + '“' + (o.note ? '<br><i>' + o.note + '</i>' : '') + '</p><small style="color:var(--gold)">Siege: ' + wins + '</small></div></div>';
      c.onclick = function () { Sfx.play('ui'); chooseColor(function (col) { startGame({ mode: 'battle', opp: o, human: col }); }); };
      list.appendChild(c);
    });
  }
  function chooseColor(cb) {
    var box = modal('<h2>Deine Seite</h2><p>Kitsune zieht zuerst.</p><div class="acts"><button class="btn" data-c="0">🦊 Kitsune</button><button class="btn" data-c="1">👹 Oni</button><button class="btn" data-c="r">🎲 Zufall</button></div><div class="acts"><button class="btn small" id="cc-x">Abbrechen</button></div>');
    $$('[data-c]', box).forEach(function (b) { b.onclick = function () { closeModal(); var c = b.dataset.c === 'r' ? (Math.random() < .5 ? 0 : 1) : +b.dataset.c; cb(c); }; });
    $('#cc-x', box).onclick = closeModal;
  }

  // ---------- Wertung ----------
  function spark(arr) {
    if (arr.length < 2) return '';
    var mn = Math.min.apply(null, arr) - 20, mx = Math.max.apply(null, arr) + 20, w = 300, hgt = 60;
    var pts = arr.map(function (v, i) { return (i / (arr.length - 1) * w).toFixed(1) + ',' + (hgt - (v - mn) / (mx - mn) * hgt).toFixed(1); }).join(' ');
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + hgt + '" preserveAspectRatio="none"><polyline points="' + pts + '" fill="none" stroke="#ffd76a" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>';
  }
  function rivalR() { return P.rival.r != null ? P.rival.r : Rating.START.chess; }
  function renderRating() {
    var box = $('#rating'); box.innerHTML = '';
    var R = realRank(), nx = Rating.nextInfo(R.r), me = h('div', 'card');
    me.innerHTML = '<div class="rating-hero"><div class="rank-emblem big' + (R.sure ? '' : ' unsure') + '">' + Rating.kanji(R.name).replace(/(\d+)/, '$1<br>') + '</div><div style="flex:1"><h3>' + R.name + (R.sure ? '' : ' <small>(vorläufig)</small>') + '</h3><div class="big-num">' + R.r + ' <small>± ' + R.rd + '</small></div>' +
      (nx ? '<div class="xpbar"><i style="width:' + nx.pct + '%"></i></div><small style="color:var(--mute)">Noch ' + nx.need + ' Punkte bis ' + nx.name + '</small>' : '') + '</div></div>' + spark(P.rating.hist) +
      '<p style="color:var(--mute);font-size:13px">' + P.rating.n + ' gewertete Partien. Skala wie Lishogi (15 Kyū bis 8 Dan). ' + (R.sure ? '' : 'Der Rang wird fest, sobald die Unsicherheit unter 110 fällt (ca. 10 bis 15 Partien). ') + 'Die KI-Stärken sind geschätzt.</p>';
    box.appendChild(me);
    if (!P.rating.n) {
      var st = h('div', 'card', '<h3>Wo startest du?</h3><p>Nur für den Startwert. Danach zählt jede Partie.</p><div class="seg n3" id="r-start"></div>');
      box.appendChild(st);
      [['never', 'Nie gespielt'], ['rules', 'Kenne die Regeln'], ['chess', 'Starker Schachspieler']].forEach(function (o) { var b = h('button', P.rating.r === Rating.START[o[0]] ? 'on' : '', o[1]); b.onclick = function () { P.rating.r = Rating.START[o[0]]; save(); renderRating(); }; $('#r-start', st).appendChild(b); });
    }
    box.appendChild(h('div', 'card', '<h3>Rätsel-Wertung</h3><div class="big-num">' + P.prating.r + ' <small>± ' + P.prating.rd + ' · ' + P.prating.n + ' Rätsel</small></div><p style="color:var(--mute);font-size:13px">Wie bei Lichess: Jedes Rätsel ist ein Gegner. Ein Hinweis zählt als Fehlversuch.</p>'));
    // Gegenspieler
    var riv = h('div', 'card'), plats = Object.keys(Rating.PLATFORMS);
    var est = P.rival.chess ? Rating.chessToShogi(P.rival.platform, P.rival.chess) : null, mine = Rating.shogiToChess(R.r);
    var dr = rivalR(), diff = dr - R.r, sug = Rating.suggestHC(Math.abs(diff));
    riv.innerHTML = '<h3>Du gegen den Schachspieler</h3>' +
      '<div class="row"><label>Seine Schach-Wertung</label><select id="riv-pf">' + plats.map(function (k) { return '<option value="' + k + '"' + (P.rival.platform === k ? ' selected' : '') + '>' + Rating.PLATFORMS[k] + '</option>'; }).join('') + '</select><input id="riv-val" type="number" inputmode="numeric" placeholder="z. B. 1800" value="' + (P.rival.chess || '') + '"></div>' +
      (est ? '<p>Er ist besser als etwa <b>' + est.pct + ' %</b> der Online-Schachspieler. Derselbe Prozentrang im Shogi wäre <b>' + est.rank + '</b> (~' + est.shogi + '). <small style="color:var(--mute)">Schätzung, es gibt keine offizielle Umrechnung.</small></p>' +
        '<p>Aber: Beim Umstieg starten starke Schachspieler laut Erfahrungswerten bei etwa <b>10 bis 6 Kyū</b> und brauchen 6 bis 12 Monate bis 1 oder 2 Dan, wenn sie Burgen und Tsume lernen. Genau da liegt dein Vorsprung.</p>' : '<p style="color:var(--mute)">Trag seine Schach-Wertung ein, dann schätze ich, wo er im Shogi stünde.</p>') +
      (mine.low ? '<p>Deine ' + R.r + ' sind noch Einsteiger-Bereich (wie im Schach unter ~600 auf Chess.com). Ab etwa 1170 (5 Kyū) kann man sauber vergleichen.</p>' : '<p>Deine ' + R.r + ' entsprechen vom Prozentrang her etwa <b>Chess.com Blitz ~' + mine.ccBlitz + '</b>, Lichess Blitz ~' + mine.liBlitz + ', FIDE ~' + mine.fide + '.</p>') +
      '<div class="vs-row"><div><small>Du</small><b>' + R.r + '</b></div><div class="vs">' + P.rival.w + ' : ' + P.rival.l + (P.rival.d ? ' : ' + P.rival.d : '') + '<br><small>Bilanz</small></div><div><small>Schachspieler (App)</small><b>' + (P.rival.r != null ? P.rival.r : '?') + '</b></div></div>' +
      '<p style="font-size:13px;color:var(--mute)">Seine App-Wertung startet bei ' + Rating.START.chess + ' (starker Schachspieler, Shogi-Neuling) und ändert sich mit jedem gewerteten Duell. Nach einem Duell fragt die App, ob es gegen ihn war.</p>' +
      (Math.abs(diff) >= 60 ? '<p>Faire Vorgabe gerade: <b>' + HANDICAPS[sug].name + '</b> (' + (diff > 0 ? 'er' : 'du') + ' gibt vor, ' + Rating.HC_ELO[sug] + ' Elo).</p>' : '<p>Ihr seid etwa gleich stark: ohne Vorgabe spielen.</p>');
    box.appendChild(riv);
    $('#riv-pf', riv).onchange = function () { P.rival.platform = this.value; save(); renderRating(); };
    $('#riv-val', riv).onchange = function () { var v = parseInt(this.value, 10); P.rival.chess = v > 0 ? v : null; save(); renderRating(); };
    // Leiter
    var lad = h('div', 'card'), rows = '', marks = {};
    function mark(r, txt) { var i = Rating.rankIdx(r); (marks[i] = marks[i] || []).push(txt); }
    mark(R.r, '<b class="me">Du</b>'); if (P.rival.r != null) mark(P.rival.r, '<b class="riv">Schachspieler</b>'); if (est) mark(est.shogi, '<span class="riv">Schachspieler (Schach-%)</span>');
    LESSONS.forEach(function (L) { if (L.type === 'B') mark(foeOpp(L).r, '<span class="boss">' + FOES[L.foe].name + '</span>'); });
    for (var i = Rating.RANKS.length - 1; i >= 0; i--) rows += '<tr' + (i === R.i ? ' class="cur"' : '') + '><td>' + Rating.RANKS[i][0] + '</td><td>' + Rating.RANKS[i][1] + '+</td><td>' + (marks[i] || []).join(' ') + '</td></tr>';
    lad.innerHTML = '<h3>Kyū/Dan-Leiter</h3><table class="ladder">' + rows + '</table>';
    box.appendChild(lad);
  }
  // Duell gegen den Gegenspieler werten (beide Wertungen, Vorgabe zählt für den Empfänger)
  function recordDuel(ownerScore, ownerCol, hc) {
    var my = Rating.age(P.rating, Date.now()), riv = { r: rivalR(), rd: P.rival.rd || 300 };
    var giverIsOwner = ownerCol === 1 && hc !== 'none', fx = hc === 'none' ? 0 : Rating.hcEffect(giverIsOwner ? my.r : riv.r, hc);
    var myEff = my.r + (giverIsOwner ? 0 : fx), rivalEff = riv.r + (giverIsOwner ? fx : 0);
    // aus Sicht des Besitzers: Gegner-Stärke relativ zur eigenen effektiven Stärke
    var line = rateGame(my.r + (rivalEff - myEff), riv.rd, ownerScore);
    var nd = Rating.update(riv, myEff, my.rd, 1 - ownerScore); P.rival.r = nd.r; P.rival.rd = nd.rd;
    if (ownerScore === 1) P.rival.w++; else if (ownerScore === 0) P.rival.l++; else P.rival.d++;
    save(); return line;
  }
  function askDuelRecord(scoreFor, hc, onlineCol) {
    if (!OWNER) return;
    var box = modal('<h2>Gegen den Schachspieler werten?</h2><p>Dann zählt die Partie für deine Wertung und die Bilanz.</p><div class="acts" style="flex-direction:column">' + (onlineCol != null ? '<button class="btn gold" data-c="' + onlineCol + '">Ja, war gegen ihn</button>' : '<button class="btn gold" data-c="0">Ich war 🦊 Kitsune (unten)</button><button class="btn gold" data-c="1">Ich war 👹 Oni (oben)</button>') + '<button class="btn small" data-c="x">Nicht werten</button></div>');
    $$('[data-c]', box).forEach(function (b) { b.onclick = function () { closeModal(); if (b.dataset.c === 'x') return; var col = +b.dataset.c, res = recordDuel(scoreFor(col), col, hc); toast('Gewertet: ' + res.line.replace(/<[^>]+>/g, ''), 4000); }; });
  }

  // ---------- Kodex ----------
  function renderCodex() {
    var list = $('#codex'); list.innerHTML = '';
    var album = h('div', 'card', '<h3>Sammelkarten</h3><div class="album">' + Object.keys(CARDS).map(function (k) { var c = CARDS[k], has = P.cards[k]; return '<div class="tcard' + (has ? '' : ' off') + '"><div class="jp">' + (has ? c.jp : '?') + '</div><b>' + (has ? c.name : '???') + '</b><small>' + (has ? c.txt : 'In der Kampagne finden') + '</small></div>'; }).join('') + '</div>');
    list.appendChild(album);
    [8, 7, 6, 5, 4, 3, 2, 1, 14, 13, 9].forEach(function (t) {
      var u = TH.units[t], c = h('div', 'card');
      c.innerHTML = '<div class="codex-card"><div><div style="position:relative;width:58px;height:64px;margin-bottom:8px">' + komaHTML(t, 0) + '</div>' + moveGrid(t) + '</div><div><h3>' + u.name + '</h3><small style="color:var(--mute)">' + u.real + ' · ' + u.kanji + '</small><p style="margin-top:6px">' + u.lore + '</p></div></div>';
      list.appendChild(c);
    });
    var leg = h('div', 'card', '<h3>Legende</h3><p><span style="color:var(--good)">■</span> 1 Feld &nbsp; <span style="color:#2fa8d8">■</span> beliebig weit &nbsp; <span style="color:#ff9a3c">■</span> Sprung</p><p>Alle beförderten kleinen Einheiten (Ashigaru, Lanze, Späher, Silber) ziehen wie die Goldwache.</p>');
    list.appendChild(leg);
    var cred = h('div', 'card', '<h3>Credits</h3><p>Figuren, Karte und Porträts: lokal generiert mit TRELLIS.2 (Microsoft, MIT) und FLUX.2 klein.</p><p>2D-Steinschrift: „kanji_light“ von Ka-hu (lishogi.org, CC BY 4.0).</p><p>Kampfklänge (CC0): Kenney (Impact Sounds, RPG Audio), StarNinjas (OpenGameArt), craigsmith, joelcarrsound, PearceWilsonKing, leonelmail (Freesound).</p><small id="cred-env" style="color:var(--mute)"></small>');
    list.appendChild(cred);
    fetch('models/env/credits.json').then(function (r) { return r.json(); }).then(function (cs) {
      $('#cred-env').innerHTML = 'Umgebung (Poly Pizza): ' + cs.map(function (c) { return c.title + ' von ' + c.author + ' (' + c.licence + ')'; }).join(' · ');
    }).catch(function () {});
  }
  function moveGrid(t) {
    var cells = new Array(25).fill(''); cells[12] = 'me';
    var st = Shogi.STEP[0][t], sl = Shogi.SLIDE[0][t];
    Shogi.DIRS.forEach(function (d, i) {
      var b = 1 << i;
      if (sl & b) { cells[(2 + d[0]) * 5 + 2 + d[1]] = 'sl'; cells[(2 + 2 * d[0]) * 5 + 2 + 2 * d[1]] = 'sl'; }
      else if (st & b) cells[(2 + d[0]) * 5 + 2 + d[1]] = 'st';
    });
    if (t === 3) { cells[1] = 'jp'; cells[3] = 'jp'; }
    return '<div class="mv-grid">' + cells.map(function (c) { return '<i class="' + c + '"></i>'; }).join('') + '</div>';
  }

  // ---------- 3D-Ansicht: Steine / Steine mit Figur / Armee ----------
  var VIEW3D = [['steine', 'Steine'], ['figuren', 'Figuren'], ['armee', 'Armee']];
  function view3d() { return S.army ? 'armee' : S.models === false ? 'steine' : 'figuren'; }
  function setView3d(v) { S.models = v !== 'steine'; S.army = v === 'armee'; if (v === 'armee') S.quality = 'high'; }
  function view3dSeg() {
    return '<div class="seg n' + VIEW3D.length + '">' + VIEW3D.map(function (o) { return '<button data-v3="' + o[0] + '" class="' + (view3d() === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }

  // ---------- Stil & Welt ----------
  function mapName() { var m = (TH.maps || []).filter(function (x) { return x.id === S.scene; })[0]; return m ? m.name : ''; }
  // Edition (Fantasy, Sci-Fi, ...) und deren Welten wählen; done() baut danach neu (z. B. Brett im Spiel)
  function styleWorld(done) {
    var sel = S.theme && THEMES[S.theme] ? S.theme : 'feudal';
    function render() {
      var T = THEMES[sel], html = '<h2>Stil & Welt</h2><div class="sw-h">Stil</div><div class="sw-grid sw-themes">';
      Object.keys(THEMES).forEach(function (k) { var t = THEMES[k]; html += '<button class="sw-card' + (k === sel ? ' on' : '') + (t.ready ? '' : ' soon') + '" data-th="' + k + '"><b>' + t.sub + '</b><small>' + t.name + (t.ready ? '' : ' · bald') + '</small></button>'; });
      html += '</div><div class="sw-h">3D-Ansicht' + (S.render === '3d' ? '' : ' <small>(schaltet 3D ein)</small>') + '</div>' + view3dSeg();
      html += '<div class="sw-h">Welt' + (S.render === '3d' ? '' : ' <small>(nur in 3D, wird eingeschaltet)</small>') + (S.army ? ' <small>(Armee spielt immer auf dem Schlachtfeld)</small>' : '') + '</div><div class="sw-grid sw-maps">';
      (T.maps || []).forEach(function (m) {
        var on = T.ready && S.scene === m.id;
        html += '<button class="sw-card sw-map' + (on ? ' on' : '') + (T.ready ? '' : ' soon') + '" data-map="' + m.id + '"' + (T.ready ? ' style="background-image:url(img/maps/' + m.id + '.webp)"' : '') + '><b>' + m.name + '</b><small>' + (T.ready ? m.sub || '' : 'bald') + '</small></button>';
      });
      html += '</div><div class="sw-h">Brett</div><div class="seg n3">' + [['urushi', 'Schwarzlack & Gold'], ['carbon', 'Carbon & Cyan'], ['honig', 'Helles Holz']].map(function (o) { return '<button data-tone="' + o[0] + '" class="' + (S.boardTone === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>';
      html += '<div class="acts"><button class="btn" id="sw-ok">Fertig</button></div>';
      var box = modal(html, 'sw-box');
      box.querySelectorAll('[data-th]').forEach(function (b) { b.onclick = function () { Sfx.play('ui'); sel = b.dataset.th; render(); }; });
      box.querySelectorAll('[data-map]').forEach(function (b) { b.onclick = function () {
        if (!THEMES[sel].ready) { toast('Diese Edition kommt noch.'); return; }
        Sfx.play('ui'); if (S.theme !== sel && THEMES[sel].board) S.boardTone = THEMES[sel].board;
        S.theme = sel; TH = THEMES[sel]; $('#theme-name').textContent = TH.name; S.scene = b.dataset.map; if (HAS3D) S.render = '3d'; save(); render(); done && done();
      }; });
      box.querySelectorAll('[data-v3]').forEach(function (b) { b.onclick = function () { Sfx.play('ui'); setView3d(b.dataset.v3); if (HAS3D) S.render = '3d'; save(); render(); done && done(); }; });
      box.querySelectorAll('[data-tone]').forEach(function (b) { b.onclick = function () { Sfx.play('ui'); S.boardTone = b.dataset.tone; save(); render(); done && done(); }; });
      $('#sw-ok', box).onclick = closeModal;
    }
    render();
  }

  // ---------- Einstellungen ----------
  function renderSettings() {
    var box = $('#settings'), grp = box; box.innerHTML = '';
    function sec(title, cls) { box.appendChild(h('div', 'set-h ' + (cls || ''), title)); grp = h('div', 'set-group ' + (cls || '')); box.appendChild(grp); }
    box.classList.toggle('is2d', S.render !== '3d'); // 3D-Abschnitt nur zeigen, wenn 3D an ist
    function seg(key, label, sub, opts, cb) {
      var d = h('div', 'set' + (opts.length > 2 ? ' stack' : '')); d.innerHTML = '<div class="l"><b>' + label + '</b><small>' + (sub || '') + '</small></div>';
      var sg = h('div', 'seg n' + opts.length);
      opts.forEach(function (o) { var b = h('button', S[key] === o[0] ? 'on' : '', o[1]); b.dataset.v = o[0]; b.onclick = function () { S[key] = o[0]; save(); Sfx.setVolume(S.sfx, S.music); Sfx.play('ui'); if (key === 'music') Sfx.music(S.music > 0); cb && cb(); renderSettings(); }; sg.appendChild(b); });
      d.appendChild(sg); grp.appendChild(d);
    }
    // Bewusst wenige Optionen (Wunsch 19.10.): Armee-Aussehen, Rückenfähnchen, Steine im 3D, Zugziele, Hot-Seat-Drehen
    // stehen nicht mehr hier, es gelten die Werte aus DEFAULTS (bzw. der zuletzt gespeicherte Wert).
    sec('Darstellung');
    var sw = h('div', 'set set-sw'); sw.style.setProperty('--img', 'url(' + new URL('img/maps/' + S.scene + '.webp', location.href).href + ')'); sw.innerHTML = '<div class="l"><b>Stil & Welt</b><small>' + TH.sub + ' · ' + mapName() + '</small></div>';
    var swb = h('button', 'btn small', '🗺 Ändern'); swb.onclick = function () { Sfx.play('ui'); styleWorld(renderSettings); }; sw.appendChild(swb); grp.appendChild(sw);
    seg('palette', 'Farbstil', 'Menüs und Titelbild', [['abend', 'Abendrot'], ['tusche', 'Tusche & Gold'], ['lack', 'Zinnober-Lack'], ['jade', 'Mitternacht-Jade']], applyPalette);
    seg('render', 'Grafik', HAS3D ? '2D-Brett oder 3D-Schlachtfeld' : '3D nicht verfügbar (offline?)', HAS3D ? [['2d', '2D'], ['3d', '3D']] : [['2d', '2D']]);
    sec('3D', 'grp-3d');
    seg('quality', '3D-Qualität', 'Niedrig für ältere Handys', [['high', 'Hoch'], ['low', 'Niedrig']], function () { if (S.quality === 'low' && S.army) { setView3d('figuren'); save(); } });
    var v3 = h('div', 'set stack'); v3.innerHTML = '<div class="l"><b>3D-Ansicht</b><small></small></div>' + view3dSeg();
    v3.querySelectorAll('[data-v3]').forEach(function (b) { b.onclick = function () { setView3d(b.dataset.v3); save(); Sfx.play('ui'); renderSettings(); }; });
    grp.appendChild(v3);
    seg('fights', 'Kämpfe', 'Figuren kämpfen, bevor eine geschlagen wird', [['voll', 'Voll'], ['kurz', 'Kurz'], ['aus', 'Aus']]);
    if (S.army) { S.fieldMood = S.fieldMood || 'kontinent'; seg('fieldMood', 'Schlachtfeld', 'Gelände, Tageszeit und Wetter im Armee-Modus', [['kontinent', 'Kontinent'], ['feldzug', 'Grenzland'], ['pass', 'Gebirgspass'], ['tal', 'Flusstal'], ['belagerung', 'Belagerung'], ['mittag', 'Sommertag']]); seg('fieldWeather', 'Wetter', 'Wechselnd: zieht im Lauf der Partie auf und wieder ab', [['wechsel', 'Wechselnd'], ['klar', 'Klar'], ['regen', 'Regen'], ['gewitter', 'Gewitter'], ['nebel', 'Nebel']]); }
    sec('Ton');
    var vs = h('div', 'set set-vol'); vs.innerHTML = '<div class="l"><b>Lautstärke</b><small>Am PC: Taste M = stumm</small></div>'; vs.appendChild(volControls()); grp.appendChild(vs);
    sec('Spiel');
    if (OWNER && P.skins.length > 1) seg('skin', 'Brett', 'Freigespielt in der Kampagne', P.skins.map(function (k) { return [k, SKINS[k].name]; }));
    if (OWNER && P.titles.length) { var tt = h('div', 'set' + (P.titles.length > 2 ? ' stack' : '')); tt.innerHTML = '<div class="l"><b>Titel</b><small>Wird im Profil gezeigt</small></div>'; var tsg = h('div', 'seg n' + P.titles.length); P.titles.forEach(function (t) { var b = h('button', P.title === t ? 'on' : '', t); b.onclick = function () { P.title = t; save(); renderSettings(); }; tsg.appendChild(b); }); tt.appendChild(tsg); grp.appendChild(tt); }
    if (OWNER) {
      sec('Training');
      seg('threats', 'Gefahren-Sicht', 'Rot = hängende Figur, Lila = Schach-Drop möglich', [[true, 'An'], [false, 'Aus']]);
      seg('coach', 'Coach Hoshi', 'Bewertet deine Züge gegen die KI', [[true, 'An'], [false, 'Aus']]);
      var rs = h('div', 'set'); rs.innerHTML = '<div class="l"><b>Fortschritt</b><small>' + P.xp + ' XP, ' + Object.keys(P.lessons).length + ' Lektionen</small></div>';
      var rb = h('button', 'btn small', 'Zurücksetzen'); rb.onclick = function () { if (confirm('Wirklich alles zurücksetzen?')) { var o = P.owner; P = load(); localStorage.removeItem(STORE); P = load(); P.owner = o; S = P.settings; save(); renderSettings(); } }; rs.appendChild(rb); grp.appendChild(rs);
    }
  }

  // =====================================================================
  //                               SPIEL
  // =====================================================================
  var G = null;
  function Game(cfg) {
    this.cfg = cfg; this.mode = cfg.mode; this.busy = false; this.sel = null; this.alive = true;
    this.state = Shogi.fromSFEN(cfg.sfen || Shogi.START);
    this.human = cfg.human == null ? 0 : cfg.human; // Farbe des Menschen (hotseat: beide)
    this.moveCount = 0; this.drops = 0; this.hints = 0; this.undos = 0;
    var training = OWNER && (this.mode === 'battle' || this.mode === 'lessonBattle');
    this.assist = { threats: training && S.threats, coach: training && S.coach, hint: OWNER && this.mode !== 'online' && this.mode !== 'hotseat', undo: OWNER && (training || this.mode === 'mission') };
    if (this.mode === 'mission' || this.mode === 'tsume' || this.mode === 'puzzle' || this.mode === 'rush') this.assist.threats = false;
    this.L = this.mode === 'lessonBattle' ? cfg.lesson : null; this.aiMoves = 0; this.startTurn = this.state.turn; this.flags = {}; this.lastTaunt = -9;
    if (this.L && this.L.noAssist) this.assist = { threats: false, coach: false, hint: false, undo: false };
    this.boss = !!(this.L && (this.L.type === 'B' || this.L.type === 'MB'));
  }
  Game.prototype.isHuman = function (col) {
    if (this.mode === 'hotseat') return true;
    if (this.mode === 'online') return col === this.human && this.online && this.online.ready;
    return col === this.human;
  };
  Game.prototype.start = function () {
    var self = this;
    G = this; go('game');
    var wrap = $('#board-wrap'); wrap.classList.toggle('mode3d', S.render === '3d');
    this.makeRenderer();
    this.flip = this.mode === 'hotseat' ? (S.autoFlip && this.state.turn === 1) : this.human === 1;
    this.r.setFlip(this.flip); this.r.sync(this.state);
    this.buildToolbar(); this.updateAll();
    $('#coach').classList.add('hidden');
    this.goalbar();
    Sfx.setIntensity(this.mode === 'battle' || this.mode === 'lessonBattle' ? 0.2 : 0);
    setTimeout(function () { self.nextTurn(); }, 350);
  };
  Game.prototype.makeRenderer = function () {
    var self = this, root = $('#board');
    if (this.r) this.r.destroy();
    root.classList.toggle('kanjistyle', S.pieceStyle === 'kanji');
    var sk = SKINS[P.skins.indexOf(S.skin) >= 0 ? S.skin : 'classic'];
    root.style.setProperty('--wa', sk.a); root.style.setProperty('--wb', sk.b); root.style.setProperty('--wl', sk.line); root.classList.toggle('chess-skin', !!sk.check);
    var rs = Object.assign({}, S, { skin: sk });
    this.r = S.render === '3d' && HAS3D ? new Board3D(root, TH, rs) : new Board2D(root, TH, rs);
    this.r.onSquare = function (sq) { self.onSquare(sq); };
  };
  Game.prototype.stop = function () { this.alive = false; Engine.ai.cancel(); Engine.coach.cancel(); if (this.r) { this.r.destroy(); this.r = null; } if (this.mode === 'online') Net.leave(); if (this.rushTimer) clearInterval(this.rushTimer); clearInterval(this.mvTimer); $('#taunt').classList.remove('show'); G = null; };

  // ---------- Anzeige ----------
  Game.prototype.sideInfo = function (col) {
    var f = TH.factions[col];
    if (this.mode === 'battle' || this.mode === 'lessonBattle') { if (col !== this.human) return { name: this.cfg.opp.name, sub: this.cfg.opp.title, p: this.cfg.opp }; return { name: S.name, sub: f.name, p: { color: f.color, icon: 'king' } }; }
    if (this.mode === 'online') { var me = col === this.human; return { name: me ? 'Du' : 'Gegner', sub: f.name + (me ? '' : (this.online && this.online.peerSeen ? ' · online' : ' · offline')), p: { color: f.color, icon: 'king' } }; }
    if (this.mode === 'hotseat') return { name: col === 0 ? 'Spieler 1' : 'Spieler 2', sub: f.name, p: { color: f.color, icon: 'king' } };
    if (col === this.human) return { name: S.name, sub: f.name, p: { color: f.color, icon: 'king' } };
    return { name: this.mode === 'mission' ? 'Strohpuppen' : 'Verteidiger', sub: f.name, p: { color: f.color, icon: this.mode === 'mission' ? 'pawn' : 'king' } };
  };
  Game.prototype.updateAll = function () {
    var bottom = this.flip ? 1 : 0, top = 1 - bottom, st = this.state;
    var self = this;
    [['top', top], ['bot', bottom]].forEach(function (x) {
      var col = x[1], inf = self.sideInfo(col), hud = $('#hud-' + x[0]);
      hud.className = 'hud' + (st.turn === col ? ' turn' : '');
      hud.innerHTML = portraitHTML(inf.p) + '<div class="grow"><div class="nm' + (self.thinking && st.turn === col ? ' thinking' : '') + '">' + inf.name + '</div><div class="sub">' + inf.sub + '</div></div>' + (x[0] === 'bot' && self.mode === 'rush' ? '<div class="clock" id="rush-clock"></div>' : '') + (self.L && self.L.moveTime && col === self.human ? '<div class="clock" id="move-clock">' + self.L.moveTime + '</div>' : '') + (self.cfg.series && col !== self.human ? '<div class="clock">' + self.cfg.series.w + ':' + self.cfg.series.l + '</div>' : '');
      var hand = $('#hand-' + x[0]); hand.innerHTML = '';
      if (self.L && self.L.fog && col !== self.human && !self.over) { var cnt = 0; for (var tt = 1; tt < 8; tt++) cnt += st.hands[col][tt]; if (cnt) hand.innerHTML = '<div class="hand-slot fog">🌫<div class="cnt">' + cnt + '</div></div>'; return; }
      [7, 6, 5, 4, 3, 2, 1].forEach(function (t) {
        var n = st.hands[col][t]; if (!n) return;
        var slot = h('div', 'hand-slot' + (self.sel && self.sel.drop === t && st.turn === col ? ' sel' : ''), komaHTML(t, col, S.render === '3d' ? null : 'kanji') + (n > 1 ? '<div class="cnt">' + n + '</div>' : ''));
        slot.dataset.col = col; slot.dataset.t = t;
        // Steine in der Hand zeigen zum Gegner, wie auf dem Brett
        var k = slot.querySelector('.koma'); k.style.setProperty('--rot', ((col === 1) !== self.flip ? 180 : 0) + 'deg');
        slot.onclick = function () { self.onHand(col, t); };
        hand.appendChild(slot);
      });
    });
    this.highlights();
    if (this.L) this.goalbar();
    if (this.mode === 'rush') this.rushClock();
  };
  Game.prototype.highlights = function () {
    var st = this.state, hl = {}, last = st.moves[st.moves.length - 1];
    if (last) { var d = Shogi.decode(last.m); hl.last = { from: d.from, to: d.to }; }
    if (this.sel) {
      hl.selected = this.sel.from != null ? this.sel.from : -1;
      if (S.dots || this.mode === 'mission') { hl.targets = []; hl.captures = []; var self = this; this.selTargets().forEach(function (q) { (st.board[q] ? hl.captures : hl.targets).push(q); }); }
    }
    if (Shogi.inCheck(st, st.turn)) hl.checkSq = st.king[st.turn];
    if (this.assist.threats && this.isHuman(st.turn) && !this.over) { var th = threatInfo(st, this.human); hl.threats = th.hanging; hl.dropDanger = th.drops; }
    if (this.hintMove) { var hd = Shogi.decode(this.hintMove); hl.hint = { from: hd.from, to: hd.to }; }
    if (this.cfg.marks) hl.marks = this.cfg.marks;
    this.r.setHighlights(hl);
  };
  // Hängende Figuren (angegriffen, nicht gedeckt bzw. von Billigerem angegriffen) und Schach-Drop-Felder des Gegners
  function threatInfo(st, col) {
    var enemy = 1 - col, atk = Shogi.attackMap(st, enemy), def = Shogi.attackMap(st, col), sgn = col === 0 ? 1 : -1, hanging = [], drops = [];
    for (var q = 0; q < 81; q++) { var p = st.board[q] * sgn; if (p > 0 && p !== 8 && atk[q] && (!def[q] || Shogi.VALUE[p] >= 8)) hanging.push(q); }
    var k = st.king[col];
    if (k >= 0) {
      var hand = st.hands[enemy], esg = -sgn;
      for (var t = 1; t < 8; t++) {
        if (!hand[t]) continue;
        for (q = 0; q < 81; q++) {
          if (st.board[q] || drops.indexOf(q) >= 0) continue;
          if (Shogi.mustPromote(enemy, t, (q / 9) | 0)) continue;
          st.board[q] = t * esg; var chk = Shogi.isAttacked(st, k, enemy); st.board[q] = 0;
          if (chk) drops.push(q);
        }
      }
    }
    return { hanging: hanging, drops: drops };
  }
  Game.prototype.selTargets = function () {
    var self = this, out = [];
    this.legal.forEach(function (m) {
      var d = Shogi.decode(m);
      if (self.sel.drop ? d.drop === self.sel.drop : d.from === self.sel.from) if (out.indexOf(d.to) < 0) out.push(d.to);
    });
    return out;
  };
  Game.prototype.pop = function (sq, text, color) {
    if (!this.r) return; var p = this.r.screenPos(sq), e = h('div', 'pop', text);
    var wrap = $('#board-wrap').getBoundingClientRect(), br = $('#board').getBoundingClientRect();
    e.style.left = (p.x + br.left - wrap.left) + 'px'; e.style.top = (p.y + br.top - wrap.top) + 'px'; e.style.color = color || '#ffd76a';
    $('#pops').appendChild(e); setTimeout(function () { e.remove(); }, 1400);
  };
  Game.prototype.banner = function (text, cls) { var b = $('#banner'); b.className = 'banner'; void b.offsetWidth; b.textContent = text; b.className = 'banner show ' + cls; };
  Game.prototype.goalbar = function (txt) {
    var g = $('#goalbar'), c = this.cfg, t = txt;
    if (!t) {
      if (this.mode === 'mission') { var gl = c.lesson.goal; t = (gl.kind === 'capture' ? '🎯 Erobere alle Puppen' : gl.kind === 'reach' ? '🚩 Erreiche das Banner' : '🏯 Bau die Formation') + ' · Zug ' + this.moveCount + '/' + c.lesson.max + ' (★★★ bei ' + c.lesson.par + ')'; }
      else if (this.mode === 'tsume' || this.mode === 'puzzle' || this.mode === 'rush') t = c.puzzleTitle || '';
      else if (this.L) {
        var L = this.L, parts = [];
        if (L.maxMoves) parts.push('⏳ ' + this.moveCount + '/' + L.maxMoves);
        if (L.castleBy) parts.push(this.flags.castle ? '🏯 Burg ✓' : '🏯 Burg bis Zug ' + L.castleBy + ' (' + this.moveCount + ')');
        if (L.noDropUntil && this.moveCount + 1 < L.noDropUntil) parts.push('⛓ Drops ab Zug ' + L.noDropUntil);
        var nxt = (L.reinforce || []).map(function (x) { return x.at; }).concat(L.phase ? [L.phase.at] : []).filter(function (a) { return a > this.aiMoves; }, this).sort(function (a, b) { return a - b; })[0];
        if (nxt) parts.push('⚠ Gegner-Zug ' + nxt + ': ' + (L.phase && L.phase.at === nxt ? 'Phase 2' : 'Verstärkung'));
        if (c.series) parts.push('🏆 ' + c.series.w + ':' + c.series.l);
        t = parts.join(' · ');
      }
    }
    if (t) { g.innerHTML = t; g.classList.remove('hidden'); } else g.classList.add('hidden');
  };

  // ---------- Toolbar ----------
  Game.prototype.buildToolbar = function () {
    var tb = $('#toolbar'), self = this; tb.innerHTML = '';
    function btn(label, title, fn, on) { var b = h('button', 'btn' + (on ? ' on' : ''), label); b.title = title; b.onclick = function () { Sfx.play('ui'); fn(b); }; tb.appendChild(b); return b; }
    btn('☰', 'Menü', function () { self.menu(); });
    if (this.assist.hint) this.hintBtn = btn(this.boss ? '🦊' + P.charges : '💡', this.boss ? 'Fuchsgeist (kostet 1 Ladung)' : 'Hinweis', function () { self.hint(); });
    if (this.assist.undo) btn('↶', 'Zug zurück', function () { self.undo(); });
    if (OWNER && (this.mode === 'battle' || this.mode === 'lessonBattle')) btn('👁', 'Gefahren-Sicht', function (b) { self.assist.threats = !self.assist.threats; S.threats = self.assist.threats; save(); b.classList.toggle('on', self.assist.threats); self.highlights(); }, this.assist.threats);
    btn('⟲', 'Brett drehen', function () { self.flip = !self.flip; self.r.setFlip(self.flip); self.updateAll(); });
    if (HAS3D) btn(S.render === '3d' ? '2D' : '3D', 'Grafik wechseln', function (b) { S.render = S.render === '3d' ? '2d' : '3d'; save(); $('#board-wrap').classList.toggle('mode3d', S.render === '3d'); self.makeRenderer(); self.r.setFlip(self.flip); self.r.sync(self.state); self.updateAll(); b.textContent = S.render === '3d' ? '2D' : '3D'; });
    if (HAS3D) btn('🗺', 'Stil & Welt', function () { styleWorld(function () { self.rerender(); }); });
    if (this.mode === 'online') btn('🔗', 'Link teilen', function () { shareLink(self.online.code); });
  };
  // Renderer neu bauen (z. B. nach Wechsel von Welt oder 2D/3D)
  Game.prototype.rerender = function () { $('#board-wrap').classList.toggle('mode3d', S.render === '3d'); this.makeRenderer(); this.r.setFlip(this.flip); this.r.sync(this.state); this.updateAll(); this.buildToolbar(); };
  Game.prototype.menu = function () {
    var self = this, box = modal('<h2>Pause</h2><div class="acts" style="flex-direction:column"><button class="btn" id="pm-go">Weiterspielen</button>' + (this.mode === 'mission' || this.mode === 'tsume' || this.mode === 'puzzle' ? '<button class="btn" id="pm-re">Neu starten</button>' : '') + (this.mode === 'online' ? '<button class="btn" id="pm-res">Aufgeben</button>' : '') + (this.mode === 'battle' || this.mode === 'lessonBattle' || this.mode === 'hotseat' ? '<button class="btn" id="pm-res">Aufgeben</button>' : '') + '<button class="btn" id="pm-vol">Lautstärke</button><button class="btn" id="pm-q">Zum Hauptmenü</button></div>');
    $('#pm-go', box).onclick = closeModal;
    $('#pm-vol', box).onclick = volPanel;
    if ($('#pm-re', box)) $('#pm-re', box).onclick = function () { closeModal(); self.restart(); };
    if ($('#pm-res', box)) $('#pm-res', box).onclick = function () { closeModal(); self.resign(); };
    $('#pm-q', box).onclick = function () { closeModal(); self.saveProgress(); go(self.cfg.back || 'title'); };
  };
  Game.prototype.restart = function () { var c = this.cfg; this.stop(); new Game(c).start(); };

  // ---------- Eingabe ----------
  Game.prototype.onSquare = function (sq) {
    if (this.busy || this.over || !this.isHuman(this.state.turn)) { if (this.mode === 'online' && !this.over && !this.busy) toast('Warte auf den Zug deines Gegners.'); return; }
    var st = this.state, sgn = st.turn === 0 ? 1 : -1, p = st.board[sq] * sgn;
    if (this.sel) {
      var self = this, cand = this.legal.filter(function (m) { var d = Shogi.decode(m); return d.to === sq && (self.sel.drop ? d.drop === self.sel.drop : d.from === self.sel.from); });
      if (cand.length) {
        if (cand.length === 2) { this.askPromote(cand); return; }
        this.playHuman(cand[0]); return;
      }
      if (p > 0 && this.sel.from !== sq) { this.select(sq); return; }
      this.sel = null; this.updateAll(); return;
    }
    if (p > 0) this.select(sq);
  };
  Game.prototype.select = function (sq) {
    this.sel = { from: sq }; this.hintMove = null;
    if (!this.selTargets().length) { Sfx.play('error'); this.pop(sq, 'Kein Zug möglich', '#ff9a8a'); }
    else Sfx.play('select');
    this.updateAll();
  };
  Game.prototype.onHand = function (col, t) {
    if (this.busy || this.over || !this.isHuman(this.state.turn) || col !== this.state.turn) return;
    if (this.sel && this.sel.drop === t) { this.sel = null; this.updateAll(); return; }
    this.sel = { drop: t }; this.hintMove = null; Sfx.play('select');
    if (!this.selTargets().length) toast('Diese Figur kann gerade nirgends hin.');
    this.updateAll();
  };
  Game.prototype.askPromote = function (cand) {
    var self = this, st = this.state, d = Shogi.decode(cand[0]), t = Math.abs(st.board[d.from]), col = st.turn;
    var box = modal('<h2>Aufstieg?</h2><p>Deine Einheit erreicht das Feindesland.</p><div class="promo-choice"><div class="opt" data-p="1"><div class="pv">' + komaHTML(Shogi.PROMOTE[t], col, S.render === '3d' ? null : 'kanji') + '</div><b>' + TH.units[Shogi.PROMOTE[t]].name + '</b><br><small>befördern</small></div><div class="opt" data-p="0"><div class="pv">' + komaHTML(t, col, S.render === '3d' ? null : 'kanji') + '</div><b>' + TH.units[t].name + '</b><br><small>bleiben</small></div></div>');
    $$('.opt', box).forEach(function (o) { o.onclick = function () { closeModal(); var pr = o.dataset.p === '1'; self.playHuman(cand.filter(function (m) { return Shogi.decode(m).promo === pr; })[0]); }; });
  };

  // ---------- Zugablauf ----------
  Game.prototype.playHuman = function (m) {
    var self = this; this.sel = null; this.hintMove = null; $('#coach').classList.add('hidden'); clearInterval(this.mvTimer);
    var before = Shogi.clone(this.state);
    this.preEval = this.preEval || null;
    var done = this.doMove(m);
    if (this.mode === 'online') this.sendOnline(); // sofort senden, nicht erst nach der Animation (Handy gesperrt → Zug ginge sonst verloren)
    done.then(function () { self.afterHuman(m, before); });
  };
  Game.prototype.doMove = function (m) {
    var self = this, st = this.state, d = Shogi.decode(m), col = st.turn, cap = d.from >= 0 ? st.board[d.to] : 0;
    this.busy = true;
    var info = { from: d.from, to: d.to, drop: d.drop, col: col, cap: cap, promo: d.promo };
    Shogi.play(st, m); info.state = st;
    if (d.drop) { if (this.isHuman(col)) this.drops++; Sfx.play('drop'); } else Sfx.play('tok');
    if (!this.isHuman(col)) this.aiMoves++;
    if (this.isHuman(col)) this.moveCount++;
    // Treffer-Effekte (Ton, Text, Wackeln): im 3D-Kampf genau beim Todesstoß, sonst nach kurzer Zeit
    var hitDone = false;
    info.onHit = function () { if (hitDone || !cap) return; hitDone = true; hitFx(); };
    // Animation mit Notbremse: hängt sie (Tab im Hintergrund), geht das Spiel trotzdem weiter
    var anim = Promise.race([this.r.animate(info), new Promise(function (r) { setTimeout(r, info.usesHit ? 8000 : 2500); })]);
    function hitFx() { Sfx.play('capture', Math.abs(cap) >= 6); var u = TH.units[Shogi.BASE[Math.abs(cap)]]; self.pop(d.to, '⚔ ' + TH.units[Math.abs(cap)].name + ' gefangen!', TH.factions[col].color); if (S.render === '2d') { var w = $('#board-wrap'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); } }
    if (cap && !info.usesHit) setTimeout(info.onHit, S.render === '3d' ? 250 : 230);
    return anim.then(function () {
      if (!self.alive) return;
      if (d.promo) { Sfx.play('promote'); self.pop(d.to, '⬆ ' + TH.units[Math.abs(st.board[d.to])].name + '!', '#ffd76a'); }
      self.legal = [];
      self.busy = false;
      var status = Shogi.status(st);
      if (status.check && !status.over) { Sfx.play('check'); self.banner('SCHACH!', 'check'); self.r.fx('check', st.king[st.turn]); }
      if (self.L && !status.over) { if (col !== self.human) self.taunt(status.check ? 'check' : cap ? 'capture' : d.drop ? 'drop' : null); else if (cap && Shogi.VALUE[Math.abs(cap)] >= Shogi.VALUE[5]) self.taunt('hurt'); }
      // Musik-Spannung: Boss, Schach, Spieldauer und Endspiel (viele Steine in der Hand); hoch = Taiko
      var inHand = 0; for (var hc = 0; hc < 2; hc++) for (var ht = 1; ht < 8; ht++) inHand += st.hands[hc][ht] || 0;
      Sfx.setIntensity((self.mode === 'battle' || self.mode === 'lessonBattle' ? 0.2 : 0) + (status.check ? 0.6 : 0) + Math.min(0.3, st.ply / 300) + Math.min(0.3, Math.max(0, inHand - 4) * 0.05));
      self.updateAll();
      self.lastStatus = status;
    });
  };
  Game.prototype.nextTurn = function () {
    if (!this.alive || this.over) return;
    var self = this, st = this.state, status = this.lastStatus || Shogi.status(st);
    if (status.over && this.mode !== 'mission') { this.gameOver(status); return; }
    this.legal = Shogi.legalMoves(st);
    if (this.L && this.L.noDropUntil && st.turn === this.human && this.moveCount + 1 < this.L.noDropUntil) this.legal = this.legal.filter(function (m) { return !Shogi.decode(m).drop; });
    if (this.L && this.L.moveTime && st.turn === this.human) this.startMoveClock();
    if (this.mode === 'hotseat' && S.autoFlip) { var want = st.turn === 1; if (want !== this.flip) { this.flip = want; this.r.setFlip(want); } }
    this.updateAll();
    if (this.isHuman(st.turn)) {
      // Coach analysiert im Hintergrund schon mal
      if (this.assist.coach || this.assist.hint) { this.preEval = null; var pre = Engine.coach.think(Shogi.clone(st), { time: 800 }); this.prePromise = pre; pre.then(function (r) { if (r && self.alive) self.preEval = r; }); }
      return;
    }
    if (this.mode === 'online') return; // wartet auf Netz
    if (this.mode === 'battle' || this.mode === 'lessonBattle') this.aiTurn();
    else if (this.mode === 'tsume' || this.mode === 'puzzle' || this.mode === 'rush') this.defendTurn();
  };
  Game.prototype.aiTurn = function () {
    var self = this, st = this.state;
    if (!this.aiPromise) this.rulesBeforeAI();
    this.thinking = true; this.updateAll();
    var t0 = Date.now(), p = this.aiPromise || Engine.ai.think(Shogi.clone(st), this.cfg.opp.opts);
    this.aiPromise = null;
    p.then(function (r) {
      if (!self.alive || !r) return;
      var wait = Math.max(0, 450 - (Date.now() - t0));
      setTimeout(function () {
        self.thinking = false;
        var legal = Shogi.legalMoves(self.state), m = legal.indexOf(r.move) >= 0 ? r.move : legal[0];
        if (!m) { self.nextTurn(); return; }
        self.doMove(m).then(function () { self.saveProgress(); self.nextTurn(); });
      }, wait);
    });
  };

  // Nach Zug des Menschen: Modus-Logik
  Game.prototype.afterHuman = function (m, before) {
    var self = this, st = this.state, mode = this.mode;
    if (mode === 'mission') return this.missionCheck();
    if (mode === 'tsume' || mode === 'puzzle' || mode === 'rush') return this.puzzleCheck(m, before);
    if (mode === 'online') return this.nextTurn();
    if (mode === 'hotseat') { this.saveProgress(); return this.nextTurn(); }
    // Gefecht: KI rechnet sofort, Coach bewertet parallel
    var status = this.lastStatus;
    if (status.over) return this.nextTurn();
    if (this.L && this.ruleChecks()) return;
    this.rulesBeforeAI();
    this.aiPromise = Engine.ai.think(Shogi.clone(st), this.cfg.opp.opts);
    if (!this.assist.coach) return this.nextTurn();
    var post = Engine.coach.think(Shogi.clone(st), { time: 800 });
    var pre = this.preEval ? Promise.resolve(this.preEval) : (this.prePromise || Promise.resolve(null));
    this.thinking = true; this.updateAll();
    Promise.all([pre, post]).then(function (res) {
      if (!self.alive) return;
      var a = res[0], b = res[1];
      if (!a || !b) return self.nextTurn();
      var loss = a.score - (-b.score), g = grade(loss, m === a.move, a.score);
      self.showGrade(g, m, a, b, before);
    });
  };
  // ---------- Kampagnen-Regeln ----------
  // Mino-Burg für Farbe col (bei Gote gespiegelt), optional mit Turm auf 6h
  function minoOk(st, col, rook) {
    var need = Object.assign({}, MINO); if (rook) need['6h'] = 'R';
    return Object.keys(need).every(function (k) { var q = SQ(k), want = Shogi.LETTERS.indexOf(need[k]); if (col === 1) q = 80 - q; var p = st.board[q] * (col === 0 ? 1 : -1); return p === want; });
  }
  Game.prototype.ruleChecks = function () {
    var L = this.L, st = this.state, me = this.human, self = this;
    if (!this.flags.mino && minoOk(st, me, false)) { this.flags.mino = true; this.pop(st.king[me], '🏯 Mino-Burg!', '#ffd76a'); Sfx.play('star', 2); }
    if (!this.flags.castle && minoOk(st, me, true)) this.flags.castle = true;
    if (!this.flags.promote2) { var hasR = false, hasB = false, sg = me === 0 ? 1 : -1; for (var q = 0; q < 81; q++) { if (st.board[q] * sg === 14) hasR = true; if (st.board[q] * sg === 13) hasB = true; } if (hasR && hasB) { this.flags.promote2 = true; this.pop(st.king[me], '⬆⬆ Doppel-Aufstieg!', '#ffd76a'); } }
    if (L.castleBy && !this.flags.castle && this.moveCount >= L.castleBy) { this.gameOver({ over: true, winner: 1 - me, reason: 'castle' }); return true; }
    if (L.maxMoves && this.moveCount >= L.maxMoves) { this.gameOver({ over: true, winner: 1 - me, reason: 'moves' }); return true; }
    return false;
  };
  Game.prototype.rulesBeforeAI = function () {
    var L = this.L; if (!L) return;
    var k = this.aiMoves + 1, st = this.state, ai = 1 - this.human, self = this, changed = false;
    this.applied = this.applied || {}; if (this.applied[k]) return; this.applied[k] = 1;
    (L.reinforce || []).forEach(function (x) { if (x.at === k) { st.hands[ai][x.t]++; changed = true; self.banner('VERSTÄRKUNG!', 'check'); self.taunt('phase', TH.units[x.t].name + ' in der Hand!'); Sfx.play('drop'); } });
    if (L.phase && L.phase.at === k) {
      this.cfg.opp.opts = Object.assign({}, this.cfg.opp.opts, { style: Object.assign({}, this.cfg.opp.opts.style || {}, L.phase.style || {}) });
      (L.phase.give || []).forEach(function (t) { st.hands[ai][t]++; changed = true; });
      this.banner('PHASE 2', 'mate'); this.taunt('phase', null, true); Sfx.play('levelup'); Sfx.setIntensity(0.9); this.flags.phase = true;
      $('#board-wrap').classList.add('rage');
    }
    if (changed) { Shogi.rehash(st); this.updateAll(); }
  };
  Game.prototype.taunt = function (key, extra, force) {
    var say = this.cfg.opp && this.cfg.opp.say; if (!say) return;
    var txt = key && say[key]; if (!txt && !extra) return;
    if (!force && this.state.ply - this.lastTaunt < 4 && key !== 'phase') return;
    if (!force && key !== 'phase' && Math.random() < 0.4) return;
    this.lastTaunt = this.state.ply;
    var t = $('#taunt'); t.innerHTML = '<b>' + this.cfg.opp.name + ':</b> ' + (txt || '') + (extra ? ' <i>' + extra + '</i>' : '');
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(function () { t.classList.remove('show'); }, 3200);
  };
  Game.prototype.startMoveClock = function () {
    var self = this, end = Date.now() + this.L.moveTime * 1000; clearInterval(this.mvTimer);
    this.mvTimer = setInterval(function () {
      if (!self.alive || self.over || self.state.turn !== self.human) { clearInterval(self.mvTimer); return; }
      var left = Math.ceil((end - Date.now()) / 1000), c = $('#move-clock');
      if (c) { c.textContent = Math.max(0, left); c.classList.toggle('low', left <= 5); }
      if (left <= 5 && left > 0) Sfx.play('hover');
      if (left <= 0) { clearInterval(self.mvTimer); if (!self.busy) self.gameOver({ over: true, winner: 1 - self.human, reason: 'time' }); }
    }, 1000);
  };
  function grade(loss, best, preScore) {
    if (best || loss <= 25) return 5;
    if (loss <= 70) return 4; if (loss <= 150) return 3; if (loss <= 350) return 2; if (loss <= 900) return 1; return 0;
  }
  var GRADES = ['Patzer!!', 'Fehler', 'Ungenau', 'Okay', 'Gut', 'Bester Zug!'];
  Game.prototype.showGrade = function (g, m, pre, post, before) {
    var self = this, st = this.state, d = Shogi.decode(m), col = this.human;
    this.pop(d.to, GRADES[g], ['#ff3a6a', '#ff5a4e', '#ffb347', '#d8e070', '#58e08a', '#46d7ff'][g]);
    Sfx.play('grade', g);
    if (g >= 5) { var r = addXP(3); if (r >= 0) this.pendingRank = r; }
    if (g >= 2) return this.nextTurn();
    // Erklärung bei Fehlern
    var reasons = [], th = threatInfo(st, col);
    var hang = th.hanging.filter(function (q) { return Math.abs(st.board[q]) !== 8; }).sort(function (x, y) { return Shogi.VALUE[Math.abs(st.board[y])] - Shogi.VALUE[Math.abs(st.board[x])]; });
    if (hang.length) reasons.push('Dein <b>' + TH.units[Math.abs(st.board[hang[0]])].name + '</b> auf ' + Shogi.sqName(hang[0]) + ' hängt.');
    if (post.pv && post.pv[0]) { var c2 = Shogi.clone(st); reasons.push('Der Gegner droht <b>' + niceMove(c2, post.pv[0]) + '</b>.'); }
    if (Math.abs(post.score) > ShogiAI.MATE - 200 && post.score > 0) reasons.push('Achtung: Danach gibt es ein erzwungenes Matt gegen dich!');
    var bestTxt = niceMove(Shogi.clone(before), pre.move);
    this.coachSay('<span class="grade g' + g + '">' + GRADES[g] + '</span>' + reasons.join(' ') + ' Besser war <b>' + bestTxt + '</b>.', [
      { t: '↶ Zeitumkehr', f: function () { self.undo(true); } },
      { t: 'Weiter', f: function () { self.nextTurn(); } }
    ]);
  };
  function niceMove(st, m) {
    var d = Shogi.decode(m), t = d.drop || Math.abs(st.board[d.from]), u = TH.units[t];
    return (d.drop ? u.name + ' beschwören auf ' : u.name + ' nach ') + Shogi.sqName(d.to) + (d.promo ? ' + Aufstieg' : '') + ' <small>(' + Shogi.moveToStr(st, m) + ')</small>';
  }
  Game.prototype.coachSay = function (html, acts) {
    var c = $('#coach'); c.innerHTML = mentorHTML() + '<div class="bubble">' + html + (acts ? '<div class="acts"></div>' : '') + '</div>';
    c.classList.remove('hidden');
    if (acts) { var a = $('.acts', c); acts.forEach(function (x) { var b = h('button', 'btn small', x.t); b.onclick = function () { Sfx.play('ui'); c.classList.add('hidden'); x.f(); }; a.appendChild(b); }); }
    else { clearTimeout(this._ct); this._ct = setTimeout(function () { c.classList.add('hidden'); }, 6000); }
    this.thinking = false; this.updateAll();
  };
  Game.prototype.hint = function () {
    var self = this;
    if (this.busy || !this.isHuman(this.state.turn)) return;
    if (this.mode === 'puzzle' || this.mode === 'tsume') {
      this.hints++;
      var sol = this.cfg.solution; if (sol) { this.hintMove = sol; this.updateAll(); this.coachSay('Probier mal ' + niceMove(Shogi.clone(this.state), sol) + '.'); }
      return;
    }
    if (this.boss) { if (P.charges <= 0) { Sfx.play('error'); toast('Keine Fuchsgeist-Ladung mehr. Besuch die Schreine!'); return; } P.charges--; save(); if (this.hintBtn) this.hintBtn.textContent = '🦊' + P.charges; }
    var p = this.preEval ? Promise.resolve(this.preEval) : (this.prePromise || Engine.coach.think(Shogi.clone(this.state), { time: 800 }));
    this.coachSay('Hoshi überlegt …');
    p.then(function (r) { if (!r || !self.alive) return; self.hints++; self.hintMove = r.move; self.updateAll(); self.coachSay('Mein Vorschlag: ' + niceMove(Shogi.clone(self.state), r.move) + '.'); });
  };
  Game.prototype.undo = function (fromCoach) {
    if (this.busy) return;
    var st = this.state, self = this;
    Engine.ai.cancel(); this.aiPromise = null; this.thinking = false;
    if (this.mode === 'mission') { if (!st.moves.length) return; Shogi.undo(st); if (st.turn !== this.human) Shogi.passTurn(st); this.moveCount = Math.max(0, this.moveCount - 1); }
    else {
      // bis der Mensch wieder am Zug ist
      var n = 0; while (st.moves.length && (n === 0 || st.turn !== this.human)) { Shogi.undo(st); n++; }
      if (st.turn !== this.human) return;
    }
    var me = this.human, s0 = this.startTurn; this.aiMoves = st.moves.filter(function (_, i) { return (s0 + i) % 2 !== me; }).length;
    this.undos++; this.sel = null; this.hintMove = null; this.lastStatus = null; $('#coach').classList.add('hidden');
    Sfx.play('drop'); this.r.sync(st); this.goalbar(); this.nextTurn();
  };
  Game.prototype.resign = function () { this.gameOver({ over: true, winner: this.mode === 'hotseat' ? 1 - this.state.turn : 1 - this.human, reason: 'resign' }); };

  // ---------- Ende ----------
  Game.prototype.gameOver = function (status) {
    if (this.over) return; this.over = true;
    var self = this, st = this.state, win = status.winner === this.human, draw = status.winner < 0;
    var reasonTxt = { mate: 'Schachmatt', nomoves: 'Keine Züge mehr', resign: 'Aufgabe', perpetual: 'Dauerschach (verboten)', repetition: 'Stellungswiederholung', king: 'König geschlagen' }[status.reason] || '';
    if (status.reason === 'mate' && st.king[st.turn] >= 0) { this.r.fx('mate', st.king[st.turn]); this.banner('MATT!', 'mate'); }
    if (!draw && this.r.armyEnd) this.r.armyEnd(status.winner); // Armee: Verlierer fliehen, Sieger jubeln
    Sfx.setIntensity(0);
    if (this.mode === 'online') { this.sendOnline(); }
    if (this.mode === 'hotseat' || this.mode === 'online') {
      var who = draw ? 'Unentschieden' : this.mode === 'online' ? (win ? 'Du hast gewonnen!' : 'Du hast verloren') : (TH.factions[status.winner].name + ' siegt!');
      if (this.mode !== 'online' || win) Sfx.play(draw ? 'lose' : 'win'); else Sfx.play('lose');
      P.saved = null; save();
      var hcK = 'none', sf = (this.mode === 'online' ? this.online.startSfen : this.cfg.sfen || '').split(' ')[0];
      Object.keys(HANDICAPS).forEach(function (k) { if (hcSFEN(k).split(' ')[0] === sf) hcK = k; });
      var scoreFor = function (col) { return draw ? 0.5 : status.winner === col ? 1 : 0; };
      if (OWNER && st.moves.length >= 6) setTimeout(function () { if (self.mode === 'online') { if (self.human >= 0) askDuelRecord(scoreFor, hcK, self.human); } else askDuelRecord(scoreFor, hcK, null); }, 3600);
      setTimeout(function () { self.resultModal(who, reasonTxt, -1, 0, [{ t: 'Revanche', f: function () { if (self.mode === 'online') self.onlineRematch(); else { var c = self.cfg; self.stop(); new Game(c).start(); } } }, { t: 'Menü', f: function () { go('title'); } }]); }, 1500);
      return;
    }
    // Gefecht / Lektions-Schlacht
    var opp = this.cfg.opp, L = this.L, c = this.cfg;
    reasonTxt = { castle: 'Burg nicht rechtzeitig fertig', moves: 'Zu viele Züge', time: 'Zeit abgelaufen' }[status.reason] || reasonTxt;
    clearInterval(this.mvTimer); $('#board-wrap').classList.remove('rage');
    if (win) { P.stats.w++; P.stats.opp = P.stats.opp || {}; P.stats.opp[opp.id] = (P.stats.opp[opp.id] || 0) + 1; } else P.stats.l++;
    var rt = rateGame(opp.r || 600, 80, win ? 1 : draw ? 0.5 : 0), lines = [reasonTxt, rt.line];
    var xp = Math.max(10, win ? 40 + (opp.lvl || 1) * 30 - this.undos * 5 : 10);
    // Best-of-Serie
    if (c.series) {
      if (win) c.series.w++; else c.series.l++;
      var needW = Math.ceil(L.bestOf / 2);
      if (c.series.w < needW && c.series.l < needW) {
        P.saved = null; addXP(xp); save();
        setTimeout(function () {
          Sfx.play(win ? 'win' : 'lose');
          self.resultModal(win ? 'Partie gewonnen!' : 'Partie verloren', lines.join('<br>') + '<br><b style="font-size:22px">Stand ' + c.series.w + ' : ' + c.series.l + '</b>', -1, xp, [
            { t: 'Nächste Partie', f: function () { var nc = Object.assign({}, c, { human: 1 - self.human }); self.stop(); new Game(nc).start(); } }
          ]);
        }, 1600);
        return;
      }
      win = c.series.w > c.series.l;
    }
    var helps = this.hints + this.undos, bonusOk = true, b = L && L.bonus;
    if (b) bonusOk = b.kind === 'fast' ? this.moveCount <= b.n : b.kind === 'noUndo' ? this.undos === 0 : b.kind === 'promote2' ? !!this.flags.promote2 : b.kind === 'mino' ? !!this.flags.mino : b.kind === 'drops' ? this.drops >= b.n : true;
    var stars = win ? (helps === 0 && bonusOk ? 3 : helps <= 3 ? 2 : 1) : 0;
    if (L && P.easy[L.id]) stars = Math.min(stars, 2);
    if (b && win) lines.push((bonusOk ? '✓ ' : '✗ ') + b.txt);
    var rewards = [];
    if (L) {
      var first = win && !lessonDone(L.id);
      if (win) { P.lessons[L.id] = Math.max(P.lessons[L.id] || 0, stars); P.losses[L.id] = 0; } else P.losses[L.id] = (P.losses[L.id] || 0) + 1;
      if (first && L.reward) {
        if (L.reward.title && P.titles.indexOf(L.reward.title) < 0) { P.titles.push(L.reward.title); P.title = L.reward.title; rewards.push('🏅 Titel „' + L.reward.title + '“'); }
        if (L.reward.skin && P.skins.indexOf(L.reward.skin) < 0) { P.skins.push(L.reward.skin); rewards.push('🎨 Brett „' + SKINS[L.reward.skin].name + '“'); }
        if (L.reward.charge) { P.charges += L.reward.charge; rewards.push('🦊 +' + L.reward.charge + ' Fuchsgeist'); }
      }
      if (first && L.card && !P.cards[L.card]) { P.cards[L.card] = 1; rewards.push('🃏 Karte „' + CARDS[L.card].name + '“'); }
      if (first) xp += L.type === 'B' ? 120 : L.type === 'MB' ? 70 : 30;
      if (!win && P.losses[L.id] === 2) lines.push('Tipp: Du kannst die Schlacht jetzt leichter machen.');
    }
    if (rewards.length) lines.push('<span class="rewards">' + rewards.join('<br>') + '</span>');
    if (opp.say) lines.unshift('<i>' + opp.name + ': „' + (win ? opp.say.lose : opp.say.win) + '“</i>');
    P.saved = null;
    var rk = addXP(xp); save();
    var next = L ? LESSONS[LESSONS.indexOf(L) + 1] : null;
    setTimeout(function () {
      Sfx.play(win ? 'win' : 'lose');
      self.resultModal(win ? (L && L.type === 'B' ? 'Boss besiegt!' : 'Sieg!') : draw ? 'Unentschieden' : 'Niederlage', lines.join('<br>'), win ? stars : -1, xp, [
        win ? { t: next ? 'Weiter: ' + next.title : 'Weiter', f: function () { if (next && L) startLesson(next); else go(c.back || 'title'); } } : { t: 'Nochmal', f: function () { if (L) { self.stop(); go('map'); battleIntro(L); } else { self.stop(); new Game(Object.assign({}, c, { series: c.series ? { w: 0, l: 0 } : null })).start(); } } },
        { t: L ? 'Karte' : 'Menü', f: function () { go(L ? 'map' : 'title'); } }
      ], rk);
    }, 1600);
  };
  Game.prototype.resultModal = function (title, sub, stars, xp, acts, rank) {
    var box = modal('<h2>' + title + '</h2><p style="color:var(--mute)">' + sub + '</p>' + (stars >= 0 ? '<div class="result-stars"><span>★</span><span>★</span><span>★</span></div>' : '') + (xp ? '<p style="font:900 20px var(--font-d);color:var(--gold)">+' + xp + ' XP</p>' : '') + '<div class="acts"></div>');
    var a = $('.acts', box);
    acts.forEach(function (x, i) { var b = h('button', 'btn' + (i === 0 ? ' gold' : ''), x.t); b.onclick = function () { Sfx.play('ui'); closeModal(); x.f(); }; a.appendChild(b); });
    if (stars >= 0) $$('.result-stars span', box).forEach(function (s, i) { setTimeout(function () { if (i < stars) { s.classList.add('in'); Sfx.play('star', i); } else { s.classList.add('in', 'off'); } }, 300 + i * 350); });
    if (rank >= 0) setTimeout(function () { levelUp(rank); }, 1800);
  };
  function levelUp(r) {
    Sfx.play('levelup');
    var box = modal('<h2>Aufstieg!</h2><div class="rank-emblem" style="width:90px;height:90px;margin:10px auto;font-size:22px">' + TH.ranks[r].replace(' ', '<br>').replace('Kyū', '級').replace('Dan', '段') + '</div><p style="font:900 20px var(--font-d)">' + TH.rankTitles[r] + '</p><p style="color:var(--mute)">Neuer Rang: ' + TH.ranks[r] + '</p><div class="acts"><button class="btn gold" id="lu-ok">Ehre!</button></div>');
    $('#lu-ok', box).onclick = closeModal;
  }

  // ---------- Missionen ----------
  Game.prototype.missionCheck = function () {
    var st = this.state, L = this.cfg.lesson, gl = L.goal, ok = false, self = this;
    if (gl.kind === 'capture') { ok = true; for (var q = 0; q < 81; q++) if (st.board[q] < 0) ok = false; if (ok && gl.requireDrop && !this.drops) { ok = false; if (!this._warnedDrop) { this._warnedDrop = true; this.coachSay('Fast! Aber du musst mindestens einmal aus der Reserve beschwören. Probier es nochmal.', [{ t: 'Neu starten', f: function () { self.restart(); } }]); return; } } }
    if (gl.kind === 'reach') ok = gl.sq.some(function (s) { return Math.abs(st.board[SQ(s)]) === gl.piece && st.board[SQ(s)] > 0; });
    if (gl.kind === 'pattern') ok = Object.keys(gl.need).every(function (s) { var want = gl.need[s], p = st.board[SQ(s)]; return p > 0 && Shogi.LETTERS[p] === want; });
    this.goalbar();
    if (ok) {
      this.over = true;
      var stars = this.moveCount <= L.par ? 3 : this.moveCount <= L.par + 2 ? 2 : 1;
      if (this.hints) stars = Math.min(stars, 2);
      return this.lessonWin(stars);
    }
    if (this.moveCount >= L.max) { this.over = true; Sfx.play('lose'); return this.resultModal('Zu viele Züge', 'Versuch es mit weniger Zügen. Ziel: ' + L.par, -1, 0, [{ t: 'Nochmal', f: function () { self.restart(); } }, { t: 'Karte', f: function () { go('map'); } }]); }
    Shogi.passTurn(st); // Puppen ziehen nicht
    this.lastStatus = null;
    this.nextTurn();
  };
  Game.prototype.lessonWin = function (stars) {
    var L = this.cfg.lesson, self = this, first = !lessonDone(L.id), prev = P.lessons[L.id] || 0;
    P.lessons[L.id] = Math.max(prev, stars);
    var xp = first ? 25 + stars * 10 : Math.max(0, stars - prev) * 10;
    var rk = addXP(xp); save();
    var lastSq = Shogi.decode(this.state.moves[this.state.moves.length - 1].m).to;
    this.r.fx('mate', lastSq); this.banner('GESCHAFFT!', 'mate'); Sfx.play('win');
    var idx = LESSONS.indexOf(L), next = LESSONS[idx + 1];
    setTimeout(function () {
      self.resultModal('Mission erfüllt!', L.title, stars, xp, [
        next ? { t: 'Weiter: ' + next.title, f: function () { startLesson(next); } } : { t: 'Karte', f: function () { go('map'); } },
        { t: 'Nochmal', f: function () { startLesson(L); } }, { t: 'Karte', f: function () { go('map'); } }
      ], rk);
    }, 1200);
  };

  // ---------- Rätsel ----------
  Game.prototype.puzzleCheck = function (m, before) {
    var self = this, st = this.state, c = this.cfg, mated = this.lastStatus.over && this.lastStatus.winner === this.human;
    if (c.kind === 'tac') {
      if (m === c.solution) return this.puzzleSolved();
      // Gleichwertige Alternative? Beide Stellungen kurz bewerten
      this.coachSay('Hoshi prüft deinen Zug …');
      var alt = Shogi.clone(before); Shogi.play(alt, c.solution);
      Promise.all([Engine.coach.think(Shogi.clone(st), { time: 700 }), Engine.coach.think(alt, { time: 700 })]).then(function (r) {
        if (!self.alive) return; $('#coach').classList.add('hidden');
        if (r[0] && r[1] && -r[0].score >= -r[1].score - 80) self.puzzleSolved('Auch stark!');
        else self.puzzleFail(before);
      });
      return;
    }
    if (mated) return this.puzzleSolved();
    var remaining = (c.plies || 1) - this.moveCount * 2 + 1;
    var check = Shogi.inCheck(st, st.turn);
    if (remaining <= 0 || !check) return this.puzzleFail(before);
    // Gibt es nach jeder Verteidigung noch Matt? (Matt in 3: nach Zug 1 prüfen)
    var defs = Shogi.legalMoves(st), forced = defs.length > 0 && defs.every(function (dm) { var u = Shogi.make(st, dm), ok = !!Shogi.findMate(st, 1); Shogi.unmake(st, u); return ok; });
    if (!forced) return this.puzzleFail(before);
    this.nextTurn();
  };
  Game.prototype.defendTurn = function () {
    // Verteidiger wählt die zäheste Antwort (zufällig unter den gleich guten)
    var self = this, st = this.state, defs = Shogi.legalMoves(st);
    this.thinking = true; this.updateAll();
    setTimeout(function () {
      if (!self.alive) return; self.thinking = false;
      var good = defs.filter(function (dm) { var u = Shogi.make(st, dm), m1 = Shogi.findMate(st, 1); Shogi.unmake(st, u); return !m1; });
      var pool = good.length ? good : defs, m = pool[Math.floor(Math.random() * pool.length)];
      self.doMove(m).then(function () { self.nextTurn(); });
    }, 600);
  };
  Game.prototype.puzzleSolved = function (txt) {
    var self = this, c = this.cfg; this.over = true;
    this.banner(txt || 'GELÖST!', 'mate'); Sfx.play('win');
    var lastSq = Shogi.decode(this.state.moves[this.state.moves.length - 1].m).to; this.r.fx('mate', lastSq);
    if (c.onSolved) return setTimeout(function () { c.onSolved(self.hints === 0); }, 1100);
  };
  Game.prototype.puzzleFail = function (before) {
    var self = this, c = this.cfg; this.over = true; Sfx.play('error');
    this.pop(Shogi.decode(this.state.moves[this.state.moves.length - 1].m).to, '✗ Nicht ganz', '#ff5a4e');
    if (c.onFail) return setTimeout(function () { c.onFail(); }, 900);
  };

  // =====================================================================
  //                         Starter für die Modi
  // =====================================================================
  function startGame(cfg) { new Game(cfg).start(); }
  function startLesson(L) {
    var intro = L.intro;
    if (L.kind === 'quiz') return story(intro, L.unit, function () { runQuiz(L); });
    if (L.kind === 'shrine') return story(intro, null, function () {
      var first = !lessonDone(L.id);
      if (first && L.reward && L.reward.charge) { P.charges += L.reward.charge; toastLater('🦊 +' + L.reward.charge + ' Fuchsgeist-Ladung (jetzt ' + P.charges + ')'); }
      lessonFinishSimple(L, 3);
    });
    story(intro, L.unit, function () {
      if (L.kind === 'mission') {
        var marks = L.goal.kind === 'reach' ? L.goal.sq.map(SQ) : L.goal.kind === 'pattern' ? Object.keys(L.goal.need).map(SQ) : null;
        startGame({ mode: 'mission', sfen: L.sfen, lesson: L, marks: marks, back: 'map' });
      } else if (L.kind === 'tsume') {
        var st = Shogi.fromSFEN(L.sfen), sol = Shogi.findMate(st, L.plies || 1);
        startGame({ mode: 'tsume', sfen: L.sfen, plies: L.plies || 1, solution: sol, puzzleTitle: '⚔ Matt in ' + (L.plies || 1), back: 'map', onSolved: function (clean) { lessonFinishSimple(L, clean ? 3 : 2); }, onFail: function () { retryModal(function () { startLesson(L); }); } });
      } else if (L.kind === 'puzzles') {
        var set = PUZZLES[L.set], off = L.offset || 0, i = 0, errors = 0;
        (function next() {
          if (i >= L.count) return lessonFinishSimple(L, errors === 0 ? 3 : errors <= 2 ? 2 : 1);
          var idx = (off + i) % set.length;
          playPuzzle(L.set, idx, '(' + (i + 1) + '/' + L.count + ')', function (ok) { if (ok) i++; else errors++; next(); }, 'map');
        })();
      } else if (L.kind === 'battle') battleIntro(L);
    });
  }
  function ruleChips(L, opp) {
    var r = ['🎌 ' + HANDICAPS[opp.hc].name];
    if (L.maxMoves) r.push('⏳ Sieg in ≤ ' + L.maxMoves + ' Zügen');
    if (L.reinforce) r.push('📦 Verstärkung bei Zug ' + L.reinforce.map(function (x) { return x.at; }).join(', '));
    if (L.phase) r.push('🔥 Phase 2 ab Zug ' + L.phase.at);
    if (L.noDropUntil) r.push('⛓ Drops erst ab deinem ' + L.noDropUntil + '. Zug');
    if (L.fog) r.push('🌫 Gegner-Reserve verborgen');
    if (L.moveTime) r.push('⏱ ' + L.moveTime + ' s pro Zug');
    if (L.castleBy) r.push('🏯 Mino-Burg + Turm 6h bis Zug ' + L.castleBy);
    if (L.bestOf) r.push('🏆 Best of ' + L.bestOf);
    if (L.noAssist) r.push('🚫 Keine Hilfen');
    return r.map(function (x) { return '<span class="chip">' + x + '</span>'; }).join('');
  }
  function battleIntro(L) {
    var opp = foeOpp(L), boss = L.type === 'B' || L.type === 'MB', chance = Math.round(Rating.expect(P.rating.r, opp.r, 0) * 100);
    var rw = L.reward ? [L.reward.title ? 'Titel „' + L.reward.title + '“' : '', L.reward.skin ? 'Brett „' + SKINS[L.reward.skin].name + '“' : '', L.reward.charge ? '🦊×' + L.reward.charge : ''].filter(Boolean).join(' · ') : '';
    var easier = (P.losses[L.id] || 0) >= 2 && !L.bestOf && HC_ORDER.indexOf(lessonHC(L)) < HC_ORDER.length - 1;
    var box = modal('<div class="foe-head' + (boss ? ' boss' : '') + '">' + (boss ? '<div class="boss-tag">' + (L.type === 'B' ? 'BOSS' : 'MINI-BOSS') + '</div>' : '') + portraitHTML(opp) + '<div style="text-align:left"><h2>' + opp.name + '</h2><div class="lvl">' + opp.title + ' · Wertung ~' + opp.r + '</div></div></div>' +
      '<p class="say">„' + opp.say.start + '“</p><div class="chips">' + ruleChips(L, opp) + '</div>' +
      '<p style="color:var(--mute);font-size:13px">★ Sieg · ★★ mit ≤ 3 Hilfen · ★★★ ohne Hilfen' + (L.bonus ? ' + ' + L.bonus.txt : '') + (P.easy[L.id] ? ' (leichter: max. ★★)' : '') + '<br>Siegchance laut Wertung ~' + chance + ' %' + (rw ? '<br>Belohnung: <b style="color:var(--gold)">' + rw + '</b>' : '') + '</p>' +
      '<div class="acts"><button class="btn big gold" id="bt-go">⚔ Zur Schlacht</button></div>' + (easier ? '<div class="acts"><button class="btn small" id="bt-easy">Leichter machen (+1 Vorgabe)</button></div>' : '') + (P.easy[L.id] ? '<div class="acts"><button class="btn small" id="bt-hard">Wieder normal</button></div>' : ''));
    $('#bt-go', box).onclick = function () { closeModal(); Sfx.play('check'); startGame({ mode: 'lessonBattle', opp: opp, human: 0, lesson: L, sfen: hcSFEN(opp.hc), back: 'map', series: L.bestOf ? { w: 0, l: 0, g: 1 } : null }); };
    if ($('#bt-easy', box)) $('#bt-easy', box).onclick = function () { P.easy[L.id] = (P.easy[L.id] || 0) + 1; P.losses[L.id] = 0; save(); battleIntro(L); };
    if ($('#bt-hard', box)) $('#bt-hard', box).onclick = function () { P.easy[L.id] = 0; save(); battleIntro(L); };
  }
  function retryModal(again) {
    var box = modal('<h2>Nicht ganz</h2><p>Das war kein zwingendes Matt. Versuch es nochmal!</p><div class="acts"><button class="btn gold" id="rt-a">Nochmal</button><button class="btn" id="rt-m">Karte</button></div>');
    $('#rt-a', box).onclick = function () { closeModal(); again(); }; $('#rt-m', box).onclick = function () { closeModal(); go('map'); };
  }
  function lessonFinishSimple(L, stars) {
    var first = !lessonDone(L.id), prev = P.lessons[L.id] || 0; P.lessons[L.id] = Math.max(prev, stars);
    var xp = first ? 25 + stars * 10 : Math.max(0, stars - prev) * 10, rk = addXP(xp); save();
    var idx = LESSONS.indexOf(L), next = LESSONS[idx + 1];
    var fake = { resultModal: Game.prototype.resultModal };
    fake.resultModal('Lektion geschafft!', L.title, stars, xp, [next ? { t: 'Weiter: ' + next.title, f: function () { startLesson(next); } } : { t: 'Karte', f: function () { go('map'); } }, { t: 'Karte', f: function () { go('map'); } }], rk);
  }
  function runQuiz(L) {
    var i = 0, errors = 0;
    function q() {
      if (i >= L.questions.length) { return lessonFinishSimple(L, errors === 0 ? 3 : errors === 1 ? 2 : 1); }
      var Q = L.questions[i];
      var box = modal('<h2>Frage ' + (i + 1) + '/' + L.questions.length + '</h2><div id="qz-board" style="height:220px;position:relative;margin:6px 0"></div><p style="font-size:16px">' + Q.q + '</p><div class="acts">' + Q.a.map(function (a, k) { return '<button class="btn" data-k="' + k + '">' + a + '</button>'; }).join('') + '</div>');
      var b2 = new Board2D($('#qz-board', box), TH, S), st = Shogi.fromSFEN(Q.sfen); b2.sync(st);
      $$('[data-k]', box).forEach(function (b) {
        b.onclick = function () {
          var ok = +b.dataset.k === Q.ok; if (!ok) errors++;
          Sfx.play(ok ? 'star' : 'error', 2);
          b2.destroy();
          var bx = modal('<h2>' + (ok ? '✓ Richtig!' : '✗ Leider falsch') + '</h2><div class="story">' + mentorHTML() + '<p>' + Q.why + '</p></div><div class="acts"><button class="btn gold" id="qz-n">Weiter</button></div>');
          $('#qz-n', bx).onclick = function () { i++; q(); };
        };
      });
    }
    q();
  }
  function playPuzzle(set, idx, label, done, back) {
    var pz = PUZZLES[set][idx];
    var names = { m1: 'Matt in 1', m3: 'Matt in 3', tac: 'Tesuji: gewinne Material' };
    var st = Shogi.fromSFEN(pz.sfen), human = st.turn;
    startGame({ mode: 'puzzle', kind: set, sfen: pz.sfen, human: human, plies: set === 'm3' ? 3 : 1, solution: pz.m, puzzleTitle: '🧩 ' + names[set] + ' ' + (label || ''), back: back || 'puzzles',
      onSolved: function (clean) { P.puzzles[set + idx] = 1; ratePuzzle(set, idx, clean ? 1 : 0); var rk = addXP(clean ? 15 : 8); save(); if (rk >= 0) levelUp(rk); done(true); },
      onFail: function () {
        P.puzzles[set + idx] = -1; ratePuzzle(set, idx, 0); save();
        var bx = modal('<h2>Nicht ganz</h2><p>Lösung: <b>' + niceMove(Shogi.fromSFEN(pz.sfen), pz.m) + '</b></p><div class="acts"><button class="btn gold" id="pf-a">Nochmal</button><button class="btn" id="pf-n">Weiter</button></div>');
        $('#pf-a', bx).onclick = function () { closeModal(); playPuzzle(set, idx, label, done, back); };
        $('#pf-n', bx).onclick = function () { closeModal(); done(false); };
      } });
  }
  // Rätsel-Wertung: jedes Rätsel hat eine feste Wertung (Typ + Anzahl Steine), Hinweis = Fehlversuch
  function puzzleR(set, idx) { var pz = PUZZLES[set][idx], n = (pz.sfen.split(' ')[0].match(/[a-zA-Z]/g) || []).length; return { m1: 650, tac: 1000, m3: 1250 }[set] + Math.round(n * 4); }
  function ratePuzzle(set, idx, s) { var nr = Rating.update(P.prating, puzzleR(set, idx), 60, s); P.prating.r = nr.r; P.prating.rd = nr.rd; P.prating.n++; }
  function startPuzzleSet(set, idx) {
    playPuzzle(set, idx, '', function () { startPuzzleSet(set, nextPuzzleIdx(set)); });
  }
  // Matt-Sturm: 3 Leben, 3 Minuten
  function startRush() {
    var lives = 3, score = 0, end = Date.now() + 180000, order = PUZZLES.m1.map(function (_, i) { return i; }).sort(function () { return Math.random() - .5; }), k = 0;
    function next() {
      if (lives <= 0 || Date.now() > end) return finish();
      var idx = order[k++ % order.length], pz = PUZZLES.m1[idx], st = Shogi.fromSFEN(pz.sfen);
      var cfg = { mode: 'rush', kind: 'm1', sfen: pz.sfen, human: st.turn, plies: 1, solution: pz.m, back: 'puzzles', puzzleTitle: '⚡ Matt-Sturm · ' + score + ' · ' + '❤'.repeat(lives),
        onSolved: function () { score++; Sfx.play('star', Math.min(4, score % 5)); next(); },
        onFail: function () { lives--; Sfx.play('error'); toast('Lösung: ' + Shogi.moveToStr(Shogi.fromSFEN(pz.sfen), pz.m)); setTimeout(next, 900); } };
      var g = new Game(cfg); g.rushEnd = end; g.start();
    }
    function finish() {
      if (G) G.stop();
      var best = P.rushBest || 0, rec = score > best; if (rec) P.rushBest = score; var rk = addXP(score * 5); save();
      go('puzzles');
      var fake = { resultModal: Game.prototype.resultModal };
      fake.resultModal(rec ? 'Neuer Rekord!' : 'Matt-Sturm vorbei', score + ' Matts gefunden', -1, score * 5, [{ t: 'Nochmal', f: startRush }, { t: 'Zurück', f: function () { go('puzzles'); } }], rk);
    }
    next();
  }
  Game.prototype.rushClock = function () {
    var self = this; if (!this.rushEnd) return;
    clearInterval(this.rushTimer);
    var tick = function () { var c = $('#rush-clock'); var left = Math.max(0, self.rushEnd - Date.now()); if (c) c.textContent = Math.floor(left / 60000) + ':' + ('0' + Math.floor(left / 1000) % 60).slice(-2); if (!left && !self.over) { self.over = true; self.cfg.onFail && (self.cfg.onFail = null); clearInterval(self.rushTimer); } };
    tick(); this.rushTimer = setInterval(tick, 500);
  };

  // ---------- Speichern / Fortsetzen ----------
  Game.prototype.saveProgress = function () {
    if (this.over || !OWNER) return;
    if (this.mode !== 'battle' && this.mode !== 'hotseat') return;
    P.saved = { mode: this.mode, opp: this.cfg.opp && this.cfg.opp.id, human: this.human, moves: this.state.moves.map(function (x) { return x.m; }) };
    save();
  };
  function resumeSaved() {
    var sv = P.saved, cfg = { mode: sv.mode, human: sv.human, opp: sv.opp ? oppById(sv.opp) : null };
    var g = new Game(cfg); sv.moves.forEach(function (m) { Shogi.play(g.state, m); }); g.start();
  }

  // =====================================================================
  //                               Duell
  // =====================================================================
  (function () { var sel = $('#duel-hc'); ['none', 'lance', 'bishop', 'rook', 'rooklance', 'two', 'four', 'six'].forEach(function (k) { var o = h('option', null, k === 'none' ? 'Keine Vorgabe' : HANDICAPS[k].name + ' (' + Rating.HC_ELO[k] + ' Elo)'); o.value = k; sel.appendChild(o); }); })();
  function duelHC() { return $('#duel-hc').value || 'none'; }
  $('#btn-hotseat').onclick = function () { Sfx.play('ui'); var hc = duelHC(); startGame({ mode: 'hotseat', human: 0, back: 'duel', hc: hc, sfen: hcSFEN(hc) }); };
  $('#btn-create').onclick = function () {
    Sfx.play('ui'); var v = $('#duel-color').value, col = v === 'r' ? (Math.random() < .5 ? 0 : 1) : +v;
    var code = Net.code();
    rememberDuel(code, col);
    startOnline(code, { create: true, color: col, sfen: hcSFEN(duelHC()), hc: duelHC() });
  };
  $('#btn-join').onclick = function () { var c = ($('#duel-code').value || '').trim().toUpperCase(); if (c.length !== 6) { toast('Code hat 6 Zeichen'); return; } joinOnline(c); };
  function joinOnline(code) { startOnline(code, { create: false }); }
  function rememberDuel(code, col) { P.duels = (P.duels || []).filter(function (d) { return d.code !== code; }); P.duels.unshift({ code: code, col: col, t: Date.now() }); P.duels = P.duels.slice(0, 5); save(); }
  function renderDuel() {
    var r = $('#duel-recent'); r.innerHTML = '';
    (P.duels || []).forEach(function (d) { var b = h('button', 'btn small', '↻ ' + d.code); b.style.margin = '4px'; b.onclick = function () { joinOnline(d.code); }; r.appendChild(b); });
    if ((P.duels || []).length) r.insertAdjacentHTML('afterbegin', '<small style="color:var(--mute)">Laufende Partien:</small><br>');
  }
  function shareLink(code) {
    var url = location.origin + location.pathname + '#duell=' + code;
    if (location.protocol === 'file:') { toast('Teilen geht erst auf der Webseite. Code: ' + code, 4000); return; }
    if (navigator.share) navigator.share({ title: 'Shogi-Duell', text: 'Fordere mich heraus! Code ' + code, url: url }).catch(function () { });
    else if (navigator.clipboard) { navigator.clipboard.writeText(url); toast('Link kopiert!'); }
  }
  function startOnline(code, opt) {
    var g = new Game({ mode: 'online', human: opt.create ? opt.color : 0, back: 'duel', sfen: opt.sfen || Shogi.START });
    g.online = { code: code, ready: false, peerSeen: false, startSfen: opt.sfen || Shogi.START, reset: 0 };
    g.start();
    g.coachSay('Verbinde mit Raum <b>' + code + '</b> …');
    // Netz-Stände nacheinander abarbeiten (nie zwei gleichzeitig), immer nur den neuesten
    var netBusy = false, netNext = null;
    function onNet(d) { netNext = d; if (!netBusy) drainNet(); }
    function drainNet() {
      if (!netNext || !g.alive) return;
      var d = netNext; netNext = null; netBusy = true;
      var done = function () { netBusy = false; drainNet(); };
      applyNet(d).then(done, function (e) { console.warn('Netz-Stand', e); done(); });
    }
    function rebuild(start, list) {
      g.state = Shogi.fromSFEN(start); g.over = false;
      for (var i = 0; i < list.length; i++) { if (Shogi.legalMoves(g.state).indexOf(list[i]) < 0) { console.warn('Zug ungültig, Abbruch bei', i, list[i]); break; } Shogi.play(g.state, list[i]); }
      g.r.sync(g.state);
    }
    function applyNet(d) {
      if (!g.alive || !d.seats) return Promise.resolve();
      var me = Net.me();
      g.online.gotState = true; g.online.seats = d.seats;
      // Platz einnehmen
      if (d.seats[0] !== me && d.seats[1] !== me) {
        var free = d.seats[0] ? (d.seats[1] ? -1 : 1) : 0;
        if (free < 0) { g.coachSay('Diese Partie ist schon voll. Du kannst nur zuschauen.'); g.human = -1; }
        else { d.seats[free] = me; Net.publishState(d); }
      }
      g.human = d.seats[0] === me ? 0 : d.seats[1] === me ? 1 : -1;
      g.online.ready = !!(d.seats[0] && d.seats[1]);
      rememberDuel(code, g.human);
      g.flip = g.human === 1; g.r.setFlip(g.flip);
      var start = d.start || g.online.startSfen, net = d.moves || [];
      var chain = Promise.resolve(), changed = !g.online.shown || g.online.ready !== g.online.wasReady;
      g.online.shown = true; g.online.wasReady = g.online.ready;
      // nur der neueste Stand zählt (ältere/gleiche Echos von einem Broker ignorieren)
      if (d === Net.last()) {
        changed = true;
        if (start !== g.online.startSfen || g.online.reset !== (d.reset || 0)) { g.online.startSfen = start; g.online.reset = d.reset || 0; rebuild(start, []); }
        var loc = g.state.moves.map(function (x) { return x.m; }), k = 0;
        while (k < net.length && k < loc.length && net[k] === loc[k]) k++;
        if (k < loc.length) rebuild(start, net); // lokal abgewichen: Netz-Stand ist maßgeblich
        else if (net.length > k) {
          var add = net.slice(k);
          if (add.length > 2) rebuild(start, net);
          else add.forEach(function (m) {
            chain = chain.then(function () {
              if (!g.alive) return;
              if (Shogi.legalMoves(g.state).indexOf(m) < 0) { rebuild(start, net); return; }
              return g.doMove(m);
            });
          });
        }
      }
      return chain.then(function () {
        if (!g.alive || !changed) return; // Echo des eigenen Zugs: nichts tun (sonst Eingriff in laufende Animation)
        g.lastStatus = null;
        if (!g.online.ready) g.coachSay('Raum <b>' + code + '</b>: Warte auf deinen Gegner. Schick ihm den Link! <div class="code-big">' + code + '</div>', [{ t: '🔗 Link teilen', f: function () { shareLink(code); g.coachSay('Warte auf deinen Gegner …'); } }]);
        else { $('#coach').classList.add('hidden'); if (g.human >= 0 && g.state.turn === g.human && net.length) Sfx.play('select'); }
        g.updateAll(); g.nextTurn();
      });
    }
    Net.connect(code, onNet, function (peer) { if (!g.online.peerSeen) { g.online.peerSeen = true; g.updateAll(); } }, function (s) {
      if (!g.alive) return;
      if (s === 'online' && opt.create && !g.online.created) {
        g.online.created = true;
        // neuer Raum: nur anlegen, wenn noch keiner existiert
        setTimeout(function () { if (!g.online.gotState) { var seats = {}; seats[opt.color] = Net.me(); seats[1 - opt.color] = null; Net.publishState({ v: 1, start: g.online.startSfen, moves: [], seats: seats, reset: 0, t: Date.now() }); } }, 1200);
      }
      if (s === 'offline') g.coachSay('Keine Verbindung (MQTT-Bibliothek nicht geladen). Bist du online?');
    });
    var origCb = g.online; g.online.gotState = false;
    var oldSync = Net.publishState;
    g.sendOnline = function () {
      var me = Net.me(), seats = {}; seats[g.human] = me;
      var last = g._lastNet || {};
      Net.publishState({ v: 1, start: g.online.startSfen, moves: g.state.moves.map(function (x) { return x.m; }), seats: g.online.seats || last.seats || seats, reset: g.online.reset, t: Date.now() });
    };
    // Sitze merken für sendOnline
    var wrapCb = Net.publishState;
    g.onlineRematch = function () { g.online.reset++; g.over = false; g.state = Shogi.fromSFEN(g.online.startSfen); g.r.sync(g.state); g.sendOnline(); };
    // Sitzplätze aus eingehenden Nachrichten übernehmen
    var oldOnState = null;
    setInterval(function () { if (g.alive) Net.ping(); }, 20000);
  }
  // Sitzplätze in sendOnline: aus letztem Netzzustand
  var _pub = Net.publishState;
  Net.publishState = function (st) { if (G && G.mode === 'online' && G.online) { G.online.gotState = true; if (st.seats) G.online.seats = st.seats; } _pub(st); };

  // Debug-Zugriff
  window.ShogiApp = { go: go, startGame: startGame, startLesson: startLesson, battleIntro: battleIntro, P: function () { return P; }, G: function () { return G; }, setTheme: function (id) { if (THEMES[id]) { S.theme = id; TH = THEMES[id]; } } };
})();
