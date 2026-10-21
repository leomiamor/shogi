// Armee-Modus (Prototyp, Grundregeln): eigenes Spiel auf 9×9. Beide planen geheim (Laden, Aufstellen, Überläufer, Befehle),
// dann kämpfen die Regimenter automatisch in zwei Phasen, dazwischen eine geheime Reaktion. Truppen bleiben über die Runden stehen.
// Rein deterministisch (gleicher Stand + gleiche Eingaben = gleiches Ergebnis), läuft im Browser und in Node (Selbstspiel-Tests).
(function (root) {
  'use strict';
  var N = 9;
  // Muster aus Sicht von Spieler 0 (unten, „vorn“ = y − 1). sl = Reichweite bei Linien (Lanze, Läufer, Turm)
  var ST = { f: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0], fl: [-1, -1], fr: [1, -1], bl: [-1, 1], br: [1, 1] };
  function steps(keys) { return keys.map(function (k) { return { d: ST[k], r: 1 }; }); }
  function lines(keys, r, over) { return keys.map(function (k) { return { d: ST[k], r: r, over: over }; }); } // over: schießt über eigene Truppen
  var GOLD = steps(['f', 'fl', 'fr', 'l', 'r', 'b']);
  // Werte: cost Gold, hp Lebenspunkte, atk Schaden pro Schlag, mv Schritte pro Takt, w Häufigkeit im Laden
  var TYPES = {
    fu: { n: 'Bauer', k: '歩', cost: 1, hp: 3, atk: 1, mv: 1, w: 5, pat: steps(['f']), pr: 'to' },
    ky: { n: 'Lanze', k: '香', cost: 3, hp: 5, atk: 2, mv: 1, w: 3, pat: lines(['f'], 2), pr: 'ny' },
    ke: { n: 'Springer', k: '桂', cost: 3, hp: 4, atk: 3, mv: 2, w: 3, pat: [{ d: [-1, -2], r: 1, leap: 1 }, { d: [1, -2], r: 1, leap: 1 }], pr: 'nk' },
    gi: { n: 'Silber', k: '銀', cost: 4, hp: 8, atk: 2, mv: 1, w: 3, pat: steps(['f', 'fl', 'fr', 'bl', 'br']), pr: 'ng' },
    ki: { n: 'Gold', k: '金', cost: 4, hp: 8, atk: 2, mv: 1, w: 3, pat: GOLD },
    ka: { n: 'Läufer', k: '角', cost: 5, hp: 6, atk: 3, mv: 1, w: 2, pat: lines(['fl', 'fr', 'bl', 'br'], 3, 1), pr: 'um' },
    hi: { n: 'Turm', k: '飛', cost: 6, hp: 8, atk: 3, mv: 1, w: 2, pat: lines(['f', 'b', 'l', 'r'], 3, 1), pr: 'ry' },
    ou: { n: 'Feldherr', k: '王', cost: 0, hp: 30, atk: 2, mv: 1, w: 0, pat: steps(['f', 'b', 'l', 'r', 'fl', 'fr', 'bl', 'br']) },
    // befördert (betritt die gegnerische Zone): Bonus auf Lebenspunkte/Schaden, neues Muster
    to: { n: 'Bauer+', k: 'と', base: 'fu', hp: 6, atk: 2, mv: 1, pat: GOLD },
    ny: { n: 'Lanze+', k: '杏', base: 'ky', hp: 7, atk: 2, mv: 1, pat: GOLD },
    nk: { n: 'Springer+', k: '圭', base: 'ke', hp: 6, atk: 2, mv: 2, pat: GOLD },
    ng: { n: 'Silber+', k: '全', base: 'gi', hp: 8, atk: 2, mv: 1, pat: GOLD },
    um: { n: 'Pferd', k: '馬', base: 'ka', hp: 8, atk: 3, mv: 1, pat: lines(['fl', 'fr', 'bl', 'br'], 3, 1).concat(steps(['f', 'b', 'l', 'r'])) },
    ry: { n: 'Drache', k: '龍', base: 'hi', hp: 10, atk: 3, mv: 1, pat: lines(['f', 'b', 'l', 'r'], 3, 1).concat(steps(['fl', 'fr', 'bl', 'br'])) }
  };
  var SHOP = ['fu', 'ky', 'ke', 'gi', 'ki', 'ka', 'hi'];
  // Regeln (eine Stelle zum Feintunen)
  var R = {
    start: 10,           // Gold in Runde 1
    income: function (round) { return Math.min(R.incMax, R.inc0 + Math.floor(round * R.incStep)); },
    inc0: 5, incStep: 1, incMax: 12,
    offers: 5, reroll: 1,
    up: { max: 2, hp: 2, atk: 1, base: 2, mul: 1, cost: function (t) { return R.up.base + Math.ceil(TYPES[t].cost * R.up.mul); } },
    ticks: [2, 3],       // Takte je Phase: kurz, damit Armeen die Runde überleben (Ø 7 statt 4,7 Truppen, Aufholjagden 29 → 40 %)
    heal: 1,             // Lebenspunkte zurück am Rundenende
    pattRound: 12,       // Generalangriff: ab hier rücken alle Truppen vor, Halten gilt nicht mehr (gegen Patt)
    reactDrops: 1,       // Überläufer in der Reaktion
    dropMax: 2,          // Überläufer pro Planung
    dropCost: function (t) { return Math.ceil(TYPES[t].cost / 2); }, // halber Preis (Shogi-Gefühl, aber kein Schneeball)
    handMax: 4,          // mehr Überläufer laufen davon (älteste zuerst)
    kingHeal: 2,
    reactFree: 1,        // Überläufer in der Reaktion kostenlos (sonst war die Pause in 79 % der Fälle leer, weil das Gold verplant war)
    lossGold: 1,         // Nachschub: Gold je eigener verlorener Truppe in der Runde (Aufholjagden 15 → 25 %)
    lossGoldMax: 6,
    terrGold: 1,         // Gebiet: +1 Gold je Truppe außerhalb der eigenen 3 Reihen am Rundenende (belohnt Vorrücken, Dauer-Halten kostet Einkommen)
    terrMax: 3,
    holdArmor: 0,        // Halten: so viel weniger Schaden pro Treffer (mind. 1)
    holdAtk: 1,          // Halten: +1 Schaden pro Schlag (vorher war Halten eine Falle: immer halten gewann 7 %, jetzt 73 % gegen blindes Anstürmen)
    defectMin: 3,        // nur Truppen ab diesem Preis werden Überläufer (Bauern nicht; vorher ~95 pro Partie, Hand dauernd voll)
    wall: 0,             // aus: erzeugte Seitenvorteil 55/45 und Bauern-Schwärme;             // Schildwall: Bauer mit eigener Truppe links/rechts nimmt von Fernangriffen so viel weniger Schaden (mind. 1)
    storm: 3,            // Sturm aufs Lager (gegen das zähe Ausspielen: Ø 2,7 → 1,3 Runden, ×4 wäre zu hart). Rundenende: Feldherr ohne eigene Truppen bekommt Schaden = storm × Schaden aller überlebenden Gegner
    startArmy: [['ou', 4, 8], ['fu', 3, 6], ['fu', 5, 6], ['ky', 4, 7]]
  };

  if (typeof process !== 'undefined' && process.env && process.env.ARMEE_R) { var ov = JSON.parse(process.env.ARMEE_R); Object.keys(ov).forEach(function (k) { if (k === 'kingHp') TYPES.ou.hp = ov[k]; else if (k.indexOf('.') > 0) { var q = k.split('.'); (TYPES[q[0]] || R[q[0]])[q[1]] = ov[k]; } else R[k] = ov[k]; }); }
  function holds(g, u) { return u.ord === 'halt' && (u.t === 'ou' || g.round < R.pattRound); }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function hash() { var h = 2166136261; for (var i = 0; i < arguments.length; i++) { h ^= arguments[i] & 0xffff; h = Math.imul(h, 16777619) >>> 0; h ^= arguments[i] >>> 16; h = Math.imul(h, 16777619) >>> 0; } return h; }
  function fwd(p) { return p === 0 ? 1 : -1; } // Muster-y mit fwd multiplizieren: Spieler 1 spiegelt
  function inZone(p, y) { return p === 0 ? y <= 2 : y >= 6; }       // gegnerische Zone (Beförderung)
  function ownRows(p, y, n) { return p === 0 ? y >= N - n : y < n; } // eigene n Reihen
  var NB = [[0, -1], [-1, -1], [1, -1], [-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1]];
  function inB(x, y) { return x >= 0 && y >= 0 && x < N && y < N; }

  function newGame(seed, bonus) {
    var g = { seed: seed >>> 0, round: 1, over: null, nid: [1, 1], units: [], gold: [R.start, R.start], hand: [[], []], log: [], rerolls: [0, 0], drops: [0, 0], lost: [0, 0], bonus: bonus || [0, 0] };
    R.startArmy.forEach(function (a) { addUnit(g, 0, a[0], a[1], a[2]); addUnit(g, 1, a[0], N - 1 - a[1], N - 1 - a[2]); });
    g.offers = [makeOffers(g, 0), makeOffers(g, 1)];
    return g;
  }
  function addUnit(g, p, t, x, y) {
    // eigener Nummernkreis je Spieler (gerade/ungerade): sonst verschoben die Käufe von Spieler 1 die Nummern
    // der Käufe von Spieler 2, und dessen Befehle/Aufwertungen für neue Truppen gingen ins Leere
    if (!g.nid) g.nid = [g.nextId || 1, g.nextId || 1];
    var T = TYPES[t], u = { id: g.nid[p]++ * 2 + p, p: p, t: t, x: x, y: y, hp: T.hp, mhp: T.hp, atk: T.atk, lv: 0, ord: t === 'ou' ? 'halt' : 'vor' };
    g.units.push(u); return u;
  }
  function makeOffers(g, p) {
    var r = rng(hash(g.seed, g.round, p, g.rerolls[p], 77)), tot = 0, out = [];
    SHOP.forEach(function (t) { tot += TYPES[t].w; });
    for (var i = 0; i < R.offers; i++) { var v = r() * tot, t; for (var j = 0; j < SHOP.length; j++) { v -= TYPES[SHOP[j]].w; if (v < 0) { t = SHOP[j]; break; } } out.push({ t: t || 'fu', sold: false }); }
    return out;
  }
  function at(g, x, y) { for (var i = 0; i < g.units.length; i++) { var u = g.units[i]; if (u.x === x && u.y === y && u.hp > 0) return u; } return null; }
  function unit(g, id) { for (var i = 0; i < g.units.length; i++) if (g.units[i].id === id) return g.units[i]; return null; }
  function clone(g) { return JSON.parse(JSON.stringify(g)); }

  // ---------- Planung: Aktionen prüfen und anwenden (gleich für Mensch, KI und später Online) ----------
  // a = { k: 'buy', i, x, y } | { k: 'drop', i, x, y } | { k: 'up', id } | { k: 'ord', id, ord } | { k: 'reroll' }
  function canDo(g, p, a, phase) {
    phase = phase || 'plan';
    if (g.over != null) return 'Spiel vorbei';
    if (phase === 'react' && a.k !== 'drop' && a.k !== 'ord') return 'In der Reaktion nur Befehle und Überläufer';
    if (a.k === 'buy') {
      var o = g.offers[p][a.i]; if (!o || o.sold) return 'Angebot weg';
      if (g.gold[p] < TYPES[o.t].cost) return 'Zu wenig Gold';
      if (!inB(a.x, a.y) || !ownRows(p, a.y, 3)) return 'Nur in deinen 3 Reihen';
      if (at(g, a.x, a.y)) return 'Feld besetzt';
      return null;
    }
    if (a.k === 'drop') {
      if (a.i == null || !g.hand[p][a.i]) return 'Kein Überläufer';
      if ((g.drops[p] || 0) >= (phase === 'react' ? R.reactDrops : R.dropMax)) return 'Diese Runde keine weiteren Überläufer';
      if (!(phase === 'react' && R.reactFree) && g.gold[p] < R.dropCost(g.hand[p][a.i])) return 'Zu wenig Gold';
      if (!inB(a.x, a.y) || !ownRows(p, a.y, 4)) return 'Nur in deiner Hälfte';
      if (at(g, a.x, a.y)) return 'Feld besetzt';
      return null;
    }
    if (a.k === 'up') {
      var u = unit(g, a.id); if (!u || u.p !== p || u.hp <= 0) return 'Keine eigene Truppe';
      if (u.t === 'ou') return 'Feldherr steigt nicht auf';
      if (u.lv >= R.up.max) return 'Schon voll aufgewertet';
      if (g.gold[p] < R.up.cost(TYPES[u.t].base || u.t)) return 'Zu wenig Gold';
      return null;
    }
    if (a.k === 'ord') { var v = unit(g, a.id); if (!v || v.p !== p || v.hp <= 0) return 'Keine eigene Truppe'; return a.ord === 'vor' || a.ord === 'halt' ? null : 'Befehl?'; }
    if (a.k === 'reroll') return g.gold[p] < R.reroll ? 'Zu wenig Gold' : null;
    return 'Unbekannt';
  }
  function apply(g, p, a, phase) {
    var err = canDo(g, p, a, phase); if (err) return err;
    if (a.k === 'buy') { var o = g.offers[p][a.i]; o.sold = true; g.gold[p] -= TYPES[o.t].cost; addUnit(g, p, o.t, a.x, a.y); }
    else if (a.k === 'drop') { var t = g.hand[p].splice(a.i, 1)[0]; if (!(phase === 'react' && R.reactFree)) g.gold[p] -= R.dropCost(t); g.drops[p] = (g.drops[p] || 0) + 1; addUnit(g, p, t, a.x, a.y); }
    else if (a.k === 'up') { var u = unit(g, a.id); g.gold[p] -= R.up.cost(TYPES[u.t].base || u.t); u.lv++; u.mhp += R.up.hp; u.hp += R.up.hp; u.atk += R.up.atk; }
    else if (a.k === 'ord') unit(g, a.id).ord = a.ord;
    else if (a.k === 'reroll') { g.gold[p] -= R.reroll; g.rerolls[p]++; g.offers[p] = makeOffers(g, p); }
    return null;
  }
  // geheime Planung beider Seiten zusammenführen: erst Spieler 0, dann 1 (Felder sind getrennt, also unabhängig)
  function applyAll(g, acts, phase) { g.drops = [0, 0]; [0, 1].forEach(function (p) { (acts[p] || []).forEach(function (a) { apply(g, p, a, phase); }); }); }

  // ---------- Kampf ----------
  // Ziele, die Truppe u von Feld (x, y) aus schlagen kann
  function targetsFrom(g, u, x, y) {
    var T = TYPES[u.t], s = fwd(u.p), out = [];
    T.pat.forEach(function (m) {
      for (var k = 1; k <= m.r; k++) {
        var tx = x + m.d[0] * k, ty = y + m.d[1] * k * s; if (!inB(tx, ty)) break;
        var o = at(g, tx, ty); if (o && o.id === u.id) o = null;
        if (o) { if (o.p !== u.p) { out.push(o); if (!m.leap) break; } else if (!m.leap && !m.over) break; }
      }
    });
    return out;
  }
  // Wegesuche: kürzester Weg (8 Richtungen, Springer 2 Schritte) zu einem Feld, von dem aus ein Gegner in Reichweite ist
  function plan(g, u, occ) {
    var key = function (x, y) { return y * N + x; }, dist = {}, prev = {}, q = [[u.x, u.y]], best = null, bestScore = 1e9;
    dist[key(u.x, u.y)] = 0;
    var enemies = g.units.filter(function (e) { return e.hp > 0 && e.p !== u.p; });
    if (!enemies.length) return null;
    while (q.length) {
      var c = q.shift(), d = dist[key(c[0], c[1])];
      if (d > 0 || true) {
        var tg = targetsFrom(g, u, c[0], c[1]);
        if (tg.length && d > 0) { var sc = d * 10 + (tg.some(function (e) { return e.t === 'ou'; }) ? 0 : 1); if (sc < bestScore) { bestScore = sc; best = c; } }
      }
      if (best && d * 10 > bestScore) break;
      for (var di = 0; di < 8; di++) { // Richtungen aus Sicht der Truppe (beide Seiten gleich behandelt)
        var dx = NB[di][0] * fwd(u.p), dy = NB[di][1] * fwd(u.p), nx = c[0] + dx, ny = c[1] + dy, kk = key(nx, ny);
        if (!inB(nx, ny) || dist[kk] != null || occ[kk]) continue;
        dist[kk] = d + 1; prev[kk] = c; q.push([nx, ny]);
      }
    }
    if (!best) { // kein Angriffsfeld erreichbar: dem nächsten Gegner annähern
      var bx = null, bd = 1e9;
      // Gleichstand aus Sicht der Truppe auflösen (vorher entschied die Feld-Reihenfolge oben links → Seitenvorteil)
      Object.keys(dist).forEach(function (k) { var x = k % N, y = (k / N) | 0, rk = u.p === 0 ? +k : N * N - 1 - k; enemies.forEach(function (e) { var dd = (Math.max(Math.abs(e.x - x), Math.abs(e.y - y)) * 10 + dist[k]) * 100 + rk; if (dd < bd) { bd = dd; bx = [x, y]; } }); });
      if (!bx || (bx[0] === u.x && bx[1] === u.y)) return null; best = bx;
    }
    var path = [best]; while (prev[key(path[0][0], path[0][1])]) path.unshift(prev[key(path[0][0], path[0][1])]);
    path.shift(); // Startfeld weg
    return path;
  }
  function tick(g, ev) {
    var alive = g.units.filter(function (u) { return u.hp > 0; });
    // 1) alle schlagen gleichzeitig: Ziel mit den wenigsten Lebenspunkten, Feldherr bei Gleichstand zuerst
    var dmg = {}, attacked = {};
    alive.forEach(function (u) {
      var tg = targetsFrom(g, u, u.x, u.y); if (!tg.length) return;
      tg.sort(function (a, b) { return (a.hp - b.hp) || ((a.t === 'ou') ? -1 : (b.t === 'ou') ? 1 : 0) || (a.id - b.id); });
      var t = tg[0], d = u.atk + (holds(g, u) && u.t !== 'ou' ? R.holdAtk : 0);
      if (holds(g, t) && t.t !== 'ou') d = Math.max(1, d - R.holdArmor);
      if (R.wall && (t.t === 'fu' || t.t === 'to') && Math.max(Math.abs(t.x - u.x), Math.abs(t.y - u.y)) > 1 && [-1, 1].some(function (dx) { var n = at(g, t.x + dx, t.y); return n && n.p === t.p; })) d = Math.max(1, d - R.wall);
      dmg[t.id] = (dmg[t.id] || 0) + d; attacked[u.id] = 1; ev.push({ e: 'atk', id: u.id, to: t.id, x: u.x, y: u.y, tx: t.x, ty: t.y, dmg: d });
    });
    var died = [];
    alive.forEach(function (u) { if (dmg[u.id]) { u.hp -= dmg[u.id]; if (u.hp <= 0) died.push(u); } });
    died.forEach(function (u) {
      ev.push({ e: 'die', id: u.id, x: u.x, y: u.y, t: u.t, p: u.p }); (g.lost = g.lost || [0, 0])[u.p]++; // alte Spielstände haben kein lost
      if (u.t !== 'ou' && TYPES[TYPES[u.t].base || u.t].cost >= R.defectMin) { var b = TYPES[u.t].base || u.t; var h = g.hand[1 - u.p]; h.push(b); if (h.length > R.handMax) { var lo = 0; h.forEach(function (x, k) { if (TYPES[x].cost < TYPES[h[lo]].cost) lo = k; }); ev.push({ e: 'flee', t: h.splice(lo, 1)[0], p: 1 - u.p }); } ev.push({ e: 'defect', t: b, p: 1 - u.p }); }
    });
    var kings = [0, 1].map(function (p) { return g.units.some(function (u) { return u.p === p && u.t === 'ou' && u.hp > 0; }); });
    if (!g.noKing && (!kings[0] || !kings[1])) { g.over = !kings[0] && !kings[1] ? 'remis' : kings[0] ? 0 : 1; ev.push({ e: 'end', w: g.over }); return; }
    // 2) wer nicht geschlagen hat und „vor“ hat, rückt nach (nächste zuerst, Felder werden reserviert)
    var movers = alive.filter(function (u) { return u.hp > 0 && !attacked[u.id] && !holds(g, u); });
    var occ = {}; g.units.forEach(function (u) { if (u.hp > 0) occ[u.y * N + u.x] = u.id; });
    var plans = movers.map(function (u) { var p = plan(g, u, occ); return { u: u, path: p }; }).filter(function (m) { return m.path && m.path.length; });
    var first = hash(g.seed || 1, g.round, (g.tk = (g.tk || 0) + 1), 77) & 1; // wer bei Gleichstand zuerst zieht: Münzwurf je Takt (strikter Wechsel gab einer Seite 54 %)
    plans.sort(function (a, b) { return (a.path.length - b.path.length) || ((a.u.p === first ? 0 : 1) - (b.u.p === first ? 0 : 1)) || (a.u.id - b.u.id); });
    plans.forEach(function (m) {
      var u = m.u, n = Math.min(TYPES[u.t].mv, m.path.length), fx = u.x, fy = u.y;
      for (var i = 0; i < n; i++) {
        var s = m.path[i], k = s[1] * N + s[0]; if (occ[k]) break;
        delete occ[u.y * N + u.x]; u.x = s[0]; u.y = s[1]; occ[k] = u.id;
        if (targetsFrom(g, u, u.x, u.y).length) break; // in Reichweite: stehen bleiben
      }
      if (u.x !== fx || u.y !== fy) ev.push({ e: 'move', id: u.id, x: fx, y: fy, tx: u.x, ty: u.y });
      if (TYPES[u.t].pr && inZone(u.p, u.y)) { var T2 = TYPES[TYPES[u.t].pr], add = T2.hp - TYPES[u.t].hp; u.t = TYPES[u.t].pr; u.mhp += add; u.hp += add; u.atk += T2.atk - TYPES[TYPES[u.t].base].atk; ev.push({ e: 'promo', id: u.id, t: u.t, x: u.x, y: u.y }); }
    });
  }
  // eine Phase rechnen: liefert Ereignisse je Takt (für die Wiedergabe)
  function runPhase(g, ph) {
    var out = [];
    for (var i = 0; i < R.ticks[ph] && g.over == null; i++) { var ev = []; tick(g, ev); out.push(ev); if (!ev.length) break; }
    g.units = g.units.filter(function (u) { return u.hp > 0; });
    return out;
  }
  function endRound(g) {
    var ev = [];
    if (R.storm) [0, 1].forEach(function (p) {
      var mine = g.units.filter(function (u) { return u.p === p && u.t !== 'ou'; }), foes = g.units.filter(function (u) { return u.p !== p && u.t !== 'ou'; }), k = g.units.filter(function (u) { return u.p === p && u.t === 'ou'; })[0];
      if (!k || mine.length || !foes.length) return;
      var d = Math.round(R.storm * foes.reduce(function (s, u) { return s + u.atk; }, 0)); k.hp -= d; ev.push({ e: 'storm', p: p, dmg: d, n: foes.length });
    });
    var kings = [0, 1].map(function (p) { return g.units.some(function (u) { return u.p === p && u.t === 'ou' && u.hp > 0; }); });
    if (!kings[0] || !kings[1]) { g.over = !kings[0] && !kings[1] ? 'remis' : kings[0] ? 0 : 1; ev.push({ e: 'end', w: g.over }); return ev; }
    g.units.forEach(function (u) { if (u.hp < u.mhp) u.hp = Math.min(u.mhp, u.hp + (u.t === 'ou' ? R.kingHeal : R.heal)); });
    var terr = [0, 1].map(function (p) { return Math.min(R.terrMax, R.terrGold * g.units.filter(function (u) { return u.p === p && u.t !== 'ou' && !ownRows(p, u.y, 3); }).length); });
    g.terr = terr;
    g.round++; g.gold = g.gold.map(function (v, p) { return Math.max(0, v + terr[p] + R.income(g.round) + (g.bonus ? g.bonus[p] : 0) + Math.min(R.lossGoldMax, R.lossGold * (g.lost ? g.lost[p] : 0))); });
    g.lost = [0, 0]; g.rerolls = [0, 0]; // bonus: Vorgabe bzw. KI-Stärke
    g.offers = [makeOffers(g, 0), makeOffers(g, 1)];
    return ev;
  }
  // ganze Runde (für Tests/KI): plan-Aktionen, dann Phase 1, Reaktion, Phase 2
  function playRound(g, plans, reactFn) {
    applyAll(g, plans, 'plan');
    var r = { p1: runPhase(g, 0) };
    if (g.over == null) { applyAll(g, reactFn ? reactFn(g) : [[], []], 'react'); r.p2 = runPhase(g, 1); }
    if (g.over == null) r.end = endRound(g);
    return r;
  }

  var API = { holds: holds, N: N, TYPES: TYPES, SHOP: SHOP, R: R, newGame: newGame, canDo: canDo, apply: apply, applyAll: applyAll, runPhase: runPhase, endRound: endRound, playRound: playRound, targetsFrom: targetsFrom, at: at, unit: unit, clone: clone, ownRows: ownRows, inZone: inZone, fwd: fwd, rng: rng, hash: hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.AK = API;
})(this);
