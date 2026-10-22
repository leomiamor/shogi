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
  // ---------- Regel-Varianten (Test, je Partie in g.vars) ----------
  // A „Rückkehr“ (Mechabellum): Armee steht jede Runde vollzählig wieder auf ihren Plätzen, Rundensieger trifft den Feldherrn
  // B „Feldherr als Held“ (Hero's Hour, Songs of Conquest, HoMM): Stufen mit Skill-Wahl aus 3, Zauber in der Reaktion mit Mana
  // C „Verstärkung und Forschung“ (Mechabellum): je Runde 1 aus 3 Verstärkungskarten, Forschung gilt für alle Truppen eines Typs
  var TECH = {
    fu: [{ n: 'Drill', d: '+2 Leben', hp: 2 }, { n: 'Speere', d: '+1 Schaden', atk: 1 }],
    ky: [{ n: 'Lange Pike', d: 'Reichweite +1', rng: 1 }, { n: 'Rüstung', d: '+3 Leben', hp: 3 }],
    ke: [{ n: 'Lanzenreiter', d: '+1 Schaden', atk: 1 }, { n: 'Schwere Pferde', d: '+3 Leben', hp: 3 }],
    gi: [{ n: 'Klingen', d: '+1 Schaden', atk: 1 }, { n: 'Panzer', d: '+3 Leben', hp: 3 }],
    ki: [{ n: 'Klingen', d: '+1 Schaden', atk: 1 }, { n: 'Panzer', d: '+3 Leben', hp: 3 }],
    ka: [{ n: 'Weitblick', d: 'Reichweite +1', rng: 1 }, { n: 'Feuerpfeile', d: '+1 Schaden', atk: 1 }],
    hi: [{ n: 'Weitblick', d: 'Reichweite +1', rng: 1 }, { n: 'Feuerpfeile', d: '+1 Schaden', atk: 1 }]
  };
  var SKILL = {
    drill: { n: 'Drill', d: 'Bauern +2 Leben', types: ['fu'], hp: 2 },
    pike: { n: 'Pikeniere', d: 'Lanzen +1 Schaden', types: ['ky'], atk: 1 },
    reiter: { n: 'Reiterei', d: 'Springer +1 Schaden, +1 Leben', types: ['ke'], atk: 1, hp: 1 },
    wall: { n: 'Schildwall', d: 'Silber und Gold +2 Leben', types: ['gi', 'ki'], hp: 2 },
    archer: { n: 'Schützenmeister', d: 'Läufer und Turm +1 Schaden', types: ['ka', 'hi'], atk: 1 },
    logistik: { n: 'Logistik', d: '+2 Gold pro Runde', gold: 2 },
    leib: { n: 'Leibwache', d: 'Feldherr +8 Leben, +1 Schaden', king: 1 },
    weise: { n: 'Weisheit', d: '+1 Mana pro Runde, sofort +2', mana: 1 },
    l_ruf: { n: 'Zauber: Kriegsruf', d: 'Teil 2: alle eigenen Truppen +1 Schaden (3 Mana)', spell: 'ruf' },
    l_heil: { n: 'Zauber: Heilung', d: 'alle eigenen Truppen +3 Leben (2 Mana)', spell: 'heil' },
    l_schild: { n: 'Zauber: Schutzsegen', d: 'Teil 2: eigene Truppen nehmen 1 Schaden weniger (3 Mana)', spell: 'schild' },
    l_feuer: { n: 'Zauber: Feuersturm', d: '4 Schaden auf ein Feld und die 4 Nachbarn (5 Mana)', spell: 'feuer' }
  };
  var SPELL = {
    hagel: { n: 'Pfeilhagel', d: '2 Schaden auf ein Feld und die 4 Nachbarn (nur Gegner)', mana: 2, target: 1, dmg: 2 },
    feuer: { n: 'Feuersturm', d: '4 Schaden auf ein Feld und die 4 Nachbarn (nur Gegner)', mana: 5, target: 1, dmg: 4 },
    ruf: { n: 'Kriegsruf', d: 'Teil 2: alle eigenen Truppen +1 Schaden', mana: 3 },
    heil: { n: 'Heilung', d: 'alle eigenen Truppen +3 Leben', mana: 2 },
    schild: { n: 'Schutzsegen', d: 'Teil 2: eigene Truppen nehmen 1 Schaden weniger', mana: 3 }
  };
  var XPN = [0, 4, 10, 18, 28, 40, 54, 70, 88];   // Erfahrung für Stufe 2, 3, …
  function vv(g, k) { return !!(g.vars && g.vars[k]); }
  function base(t) { return TYPES[t].base || t; }
  // Boni aus Forschung (C) und Heldenskills (B) für einen Grundtyp
  function bonus(g, p, t) {
    var b = { hp: 0, atk: 0, rng: 0 };
    if (vv(g, 'C') && g.tech && TECH[t]) Object.keys(g.tech[p][t] || {}).forEach(function (j) { var e = TECH[t][j]; b.hp += e.hp || 0; b.atk += e.atk || 0; b.rng += e.rng || 0; });
    if (vv(g, 'B') && g.hero) g.hero[p].skills.forEach(function (k) { var e = SKILL[k]; if (e.types && e.types.indexOf(t) >= 0) { b.hp += e.hp || 0; b.atk += e.atk || 0; } });
    return b;
  }
  // neuen Bonus auf alle stehenden Truppen (und die Aufstellung von Variante A) übertragen
  function boost(g, p, types, e) {
    [g.units, g.roster || []].forEach(function (L) { L.forEach(function (u) { if (u.p !== p || types.indexOf(base(u.t)) < 0) return; u.mhp += e.hp || 0; u.hp += e.hp || 0; u.atk += e.atk || 0; u.rg = (u.rg || 0) + (e.rng || 0); }); });
  }
  function makeCards(g, p) {
    var r = rng(hash(g.seed, g.round, p, 555)), pool = [], R2 = g.round;
    pool.push({ c: 'gold', v: 2 + Math.floor(R2 / 2) });
    pool.push({ c: 'unit2', t: 'fu' });
    var cheap = SHOP.filter(function (t) { return TYPES[t].cost >= 3 && TYPES[t].cost <= 3 + Math.floor(R2 / 2); });
    pool.push({ c: 'unit', t: cheap[Math.floor(r() * cheap.length)] });
    pool.push({ c: 'tech' }); pool.push({ c: 'up' });
    if (vv(g, 'B')) pool.push({ c: 'mana', v: 3 });
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), x = pool[i]; pool[i] = pool[j]; pool[j] = x; }
    return pool.slice(0, 3);
  }
  function heroNew() { return { lv: 1, xp: 0, mana: 2, skills: [], spells: ['hagel'], pick: null, cast: null }; }
  function heroPick(g, p) {
    var h = g.hero[p], r = rng(hash(g.seed, g.round, p, h.lv, 444)), opts = Object.keys(SKILL).filter(function (k) { var e = SKILL[k]; return h.skills.indexOf(k) < 0 && !(e.spell && h.spells.indexOf(e.spell) >= 0); });
    for (var i = opts.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), x = opts[i]; opts[i] = opts[j]; opts[j] = x; }
    return opts.slice(0, 3);
  }
  function learn(g, p, k) {
    var h = g.hero[p], e = SKILL[k]; h.skills.push(k);
    if (e.spell) h.spells.push(e.spell);
    if (e.types) boost(g, p, e.types, e);
    if (e.mana) h.mana = Math.min(R.manaMax, h.mana + 2);
    if (e.king) [g.units, g.roster || []].forEach(function (L) { L.forEach(function (u) { if (u.p === p && u.t === 'ou') { u.mhp += 8; u.hp += 8; u.atk += 1; } }); });
  }
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
    startArmy: [['ou', 4, 8], ['fu', 3, 6], ['fu', 5, 6], ['ky', 4, 7]],
    // Variante A: Rundenschaden = Wertunterschied der Überlebenden × rvK (mind. rvMin), Feldherr hat rvKing Leben
    rvK: 1, rvMin: 3, rvEsc: 1, rvDraw: 1, rvKing: 40, rvDefect: 1, rvCap: 12, rvTicks: [2, 3],
    // Variante B: Mana pro Runde, Höchstwert
    mana: 2, manaMax: 8,
    techCost: function (t) { return 3 + Math.ceil(TYPES[t].cost / 2); }
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

  function newGame(seed, bonus, vars) {
    var g = { seed: seed >>> 0, round: 1, over: null, nid: [1, 1], units: [], gold: [R.start, R.start], hand: [[], []], log: [], rerolls: [0, 0], drops: [0, 0], lost: [0, 0], bonus: bonus || [0, 0] };
    if (vars && (vars.A || vars.B || vars.C)) g.vars = { A: vars.A ? 1 : 0, B: vars.B ? 1 : 0, C: vars.C ? 1 : 0 };
    if (vv(g, 'B')) g.hero = [heroNew(), heroNew()];
    if (vv(g, 'C')) { g.tech = [{}, {}]; g.free = [{ tech: 0, up: 0 }, { tech: 0, up: 0 }]; g.cardUsed = [0, 0]; }
    R.startArmy.forEach(function (a) { addUnit(g, 0, a[0], a[1], a[2]); addUnit(g, 1, a[0], N - 1 - a[1], N - 1 - a[2]); });
    if (vv(g, 'A')) g.units.forEach(function (u) { if (u.t === 'ou') { u.hp = u.mhp = R.rvKing; } });
    g.offers = [makeOffers(g, 0), makeOffers(g, 1)];
    if (vv(g, 'C')) g.cards = [makeCards(g, 0), makeCards(g, 1)];
    return g;
  }
  function addUnit(g, p, t, x, y) {
    // eigener Nummernkreis je Spieler (gerade/ungerade): sonst verschoben die Käufe von Spieler 1 die Nummern
    // der Käufe von Spieler 2, und dessen Befehle/Aufwertungen für neue Truppen gingen ins Leere
    if (!g.nid) g.nid = [g.nextId || 1, g.nextId || 1];
    var T = TYPES[t], u = { id: g.nid[p]++ * 2 + p, p: p, t: t, x: x, y: y, hp: T.hp, mhp: T.hp, atk: T.atk, lv: 0, ord: t === 'ou' ? 'halt' : 'vor' };
    if (g.vars && t !== 'ou') { var b = bonus(g, p, base(t)); u.hp += b.hp; u.mhp += b.hp; u.atk += b.atk; if (b.rng) u.rg = b.rng; }
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
  // Variante A: Armee-Obergrenze (sonst ist das Feld nach ein paar Runden voll)
  function full(g, p) { return vv(g, 'A') && R.rvCap && g.units.filter(function (u) { return u.p === p && u.t !== 'ou' && u.hp > 0; }).length >= R.rvCap; }
  function canDo(g, p, a, phase) {
    phase = phase || 'plan';
    if (g.over != null) return 'Spiel vorbei';
    if (phase === 'react' && a.k !== 'drop' && a.k !== 'ord' && a.k !== 'cast') return 'In der Reaktion nur Befehle, Überläufer und Zauber';
    if (phase !== 'react' && a.k === 'cast') return 'Zauber nur in der Reaktion';
    if (a.k === 'buy') {
      var o = g.offers[p][a.i]; if (!o || o.sold) return 'Angebot weg';
      if (!o.free && g.gold[p] < TYPES[o.t].cost) return 'Zu wenig Gold';
      if (!inB(a.x, a.y) || !ownRows(p, a.y, 3)) return 'Nur in deinen 3 Reihen';
      if (at(g, a.x, a.y)) return 'Feld besetzt';
      if (full(g, p)) return 'Armee voll (' + R.rvCap + ' Truppen)';
      return null;
    }
    if (a.k === 'drop') {
      if (full(g, p)) return 'Armee voll (' + R.rvCap + ' Truppen)';
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
      if (!(g.free && g.free[p].up) && g.gold[p] < R.up.cost(TYPES[u.t].base || u.t)) return 'Zu wenig Gold';
      return null;
    }
    if (a.k === 'mv') {
      if (!vv(g, 'A')) return 'Umstellen gibt es nur mit „Rückkehr“';
      var mu = unit(g, a.id); if (!mu || mu.p !== p || mu.hp <= 0) return 'Keine eigene Truppe';
      if (!inB(a.x, a.y) || !ownRows(p, a.y, 3)) return 'Nur in deinen 3 Reihen';
      if (at(g, a.x, a.y)) return 'Feld besetzt';
      return null;
    }
    if (a.k === 'card') {
      if (!vv(g, 'C')) return 'Keine Verstärkung';
      if (g.cardUsed[p]) return 'Verstärkung schon gewählt';
      var cd = g.cards[p][a.i]; if (!cd) return 'Keine Karte';
      if (cd.c === 'mana' && !vv(g, 'B')) return 'Kein Mana';
      return null;
    }
    if (a.k === 'tech') {
      if (!vv(g, 'C')) return 'Keine Forschung';
      if (!TECH[a.t] || !TECH[a.t][a.j]) return 'Forschung?';
      if ((g.tech[p][a.t] || {})[a.j]) return 'Schon erforscht';
      if (!g.free[p].tech && g.gold[p] < R.techCost(a.t)) return 'Zu wenig Gold';
      return null;
    }
    if (a.k === 'skill') {
      var h = vv(g, 'B') && g.hero[p]; if (!h || !h.pick) return 'Keine Stufe offen';
      return h.pick[a.i] ? null : 'Skill?';
    }
    if (a.k === 'cast') {
      var hh = vv(g, 'B') && g.hero[p], sp = SPELL[a.s]; if (!hh || !sp) return 'Kein Zauber';
      if (hh.spells.indexOf(a.s) < 0) return 'Zauber unbekannt';
      if (hh.cast) return 'Nur ein Zauber pro Reaktion';
      if (hh.mana < sp.mana) return 'Zu wenig Mana';
      if (!g.units.some(function (u) { return u.p === p && u.t === 'ou' && u.hp > 0; })) return 'Feldherr gefallen';
      if (sp.target && !inB(a.x, a.y)) return 'Ziel antippen';
      return null;
    }
    if (a.k === 'ord') { var v = unit(g, a.id); if (!v || v.p !== p || v.hp <= 0) return 'Keine eigene Truppe'; return a.ord === 'vor' || a.ord === 'halt' ? null : 'Befehl?'; }
    if (a.k === 'reroll') return g.gold[p] < R.reroll ? 'Zu wenig Gold' : null;
    return 'Unbekannt';
  }
  function apply(g, p, a, phase) {
    var err = canDo(g, p, a, phase); if (err) return err;
    if (a.k === 'buy') { var o = g.offers[p][a.i]; o.sold = true; if (!o.free) g.gold[p] -= TYPES[o.t].cost; addUnit(g, p, o.t, a.x, a.y); }
    else if (a.k === 'drop') { var t = g.hand[p].splice(a.i, 1)[0]; if (!(phase === 'react' && R.reactFree)) g.gold[p] -= R.dropCost(t); g.drops[p] = (g.drops[p] || 0) + 1; addUnit(g, p, t, a.x, a.y); }
    else if (a.k === 'up') { var u = unit(g, a.id); if (g.free && g.free[p].up) g.free[p].up = 0; else g.gold[p] -= R.up.cost(TYPES[u.t].base || u.t); u.lv++; u.mhp += R.up.hp; u.hp += R.up.hp; u.atk += R.up.atk; }
    else if (a.k === 'mv') { var mu = unit(g, a.id); mu.x = a.x; mu.y = a.y; }
    else if (a.k === 'card') {
      var cd = g.cards[p][a.i]; g.cardUsed[p] = 1;
      if (cd.c === 'gold') g.gold[p] += cd.v;
      else if (cd.c === 'unit') g.offers[p].push({ t: cd.t, sold: false, free: 1 });
      else if (cd.c === 'unit2') { g.offers[p].push({ t: cd.t, sold: false, free: 1 }); g.offers[p].push({ t: cd.t, sold: false, free: 1 }); }
      else if (cd.c === 'tech') g.free[p].tech = 1;
      else if (cd.c === 'up') g.free[p].up = 1;
      else if (cd.c === 'mana') g.hero[p].mana = Math.min(R.manaMax, g.hero[p].mana + cd.v);
    }
    else if (a.k === 'tech') { if (g.free[p].tech) g.free[p].tech = 0; else g.gold[p] -= R.techCost(a.t); (g.tech[p][a.t] = g.tech[p][a.t] || {})[a.j] = 1; boost(g, p, [a.t], TECH[a.t][a.j]); }
    else if (a.k === 'skill') { var h = g.hero[p], k = h.pick[a.i]; h.pick = null; learn(g, p, k); }
    else if (a.k === 'cast') { var hh = g.hero[p]; hh.mana -= SPELL[a.s].mana; hh.cast = { s: a.s, x: a.x, y: a.y }; }
    else if (a.k === 'ord') unit(g, a.id).ord = a.ord;
    else if (a.k === 'reroll') { g.gold[p] -= R.reroll; g.rerolls[p]++; g.offers[p] = makeOffers(g, p); }
    return null;
  }
  // geheime Planung beider Seiten zusammenführen: erst Spieler 0, dann 1 (Felder sind getrennt, also unabhängig)
  function applyAll(g, acts, phase) {
    g.drops = [0, 0]; [0, 1].forEach(function (p) { (acts[p] || []).forEach(function (a) { apply(g, p, a, phase); }); });
    // Variante A: so wie jetzt aufgestellt steht die Armee nach jeder Runde wieder da (Reaktions-Überläufer kommen dazu)
    if (vv(g, 'A')) {
      if (phase === 'plan') g.roster = clone(g.units);
      else { var have = {}; g.roster.forEach(function (u) { have[u.id] = 1; }); g.units.forEach(function (u) { if (!have[u.id]) { var c = clone(u); c.hp = c.mhp; g.roster.push(c); } }); }
    }
  }

  // ---------- Kampf ----------
  // Ziele, die Truppe u von Feld (x, y) aus schlagen kann
  function targetsFrom(g, u, x, y) {
    var T = TYPES[u.t], s = fwd(u.p), out = [];
    T.pat.forEach(function (m) {
      var mr = m.r > 1 ? m.r + (u.rg || 0) : m.r;
      for (var k = 1; k <= mr; k++) {
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
      var t = tg[0], d = u.atk + (holds(g, u) && u.t !== 'ou' ? R.holdAtk : 0) + (g.buff ? g.buff[u.p].atk : 0);
      if (holds(g, t) && t.t !== 'ou') d = Math.max(1, d - R.holdArmor);
      if (g.buff && g.buff[t.p].arm) d = Math.max(1, d - g.buff[t.p].arm);
      if (R.wall && (t.t === 'fu' || t.t === 'to') && Math.max(Math.abs(t.x - u.x), Math.abs(t.y - u.y)) > 1 && [-1, 1].some(function (dx) { var n = at(g, t.x + dx, t.y); return n && n.p === t.p; })) d = Math.max(1, d - R.wall);
      dmg[t.id] = (dmg[t.id] || 0) + d; attacked[u.id] = 1; ev.push({ e: 'atk', id: u.id, to: t.id, x: u.x, y: u.y, tx: t.x, ty: t.y, dmg: d });
    });
    var died = [];
    alive.forEach(function (u) { if (dmg[u.id]) { u.hp -= dmg[u.id]; if (u.hp <= 0) died.push(u); } });
    if (bury(g, died, ev)) return;
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
  // Gefallene: Ereignis, Überläufer für den Sieger, Erfahrung für dessen Feldherrn; true = Partie vorbei
  function bury(g, died, ev) {
    died.forEach(function (u) {
      ev.push({ e: 'die', id: u.id, x: u.x, y: u.y, t: u.t, p: u.p }); (g.lost = g.lost || [0, 0])[u.p]++; // alte Spielstände haben kein lost
      if (vv(g, 'B') && u.t !== 'ou') g.hero[1 - u.p].xp++;
      if (u.t !== 'ou' && TYPES[TYPES[u.t].base || u.t].cost >= R.defectMin && !(vv(g, 'A') && !R.rvDefect)) { var b = TYPES[u.t].base || u.t; var h = g.hand[1 - u.p]; h.push(b); if (h.length > R.handMax) { var lo = 0; h.forEach(function (x, k) { if (TYPES[x].cost < TYPES[h[lo]].cost) lo = k; }); ev.push({ e: 'flee', t: h.splice(lo, 1)[0], p: 1 - u.p }); } ev.push({ e: 'defect', t: b, p: 1 - u.p }); }
    });
    var kings = [0, 1].map(function (p) { return g.units.some(function (u) { return u.p === p && u.t === 'ou' && u.hp > 0; }); });
    if (!g.noKing && (!kings[0] || !kings[1])) { g.over = !kings[0] && !kings[1] ? 'remis' : kings[0] ? 0 : 1; ev.push({ e: 'end', w: g.over }); return true; }
    return false;
  }
  // Variante B: Zauber aus der Reaktion wirken zu Beginn von Teil 2 (erst Spieler 0, dann 1)
  function casts(g) {
    var ev = [], died = [];
    [0, 1].forEach(function (p) {
      var h = g.hero[p], c = h.cast; if (!c) return; var sp = SPELL[c.s];
      ev.push({ e: 'spell', p: p, s: c.s, x: c.x, y: c.y });
      if (sp.target) [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var u = at(g, c.x + o[0], c.y + o[1]); if (u && u.p !== p && u.hp > 0) { u.hp -= sp.dmg; ev.push({ e: 'hurt', id: u.id, dmg: sp.dmg, x: u.x, y: u.y }); if (u.hp <= 0) died.push(u); } });
      else if (c.s === 'heil') g.units.forEach(function (u) { if (u.p === p && u.hp > 0 && u.t !== 'ou' && u.hp < u.mhp) { var v = Math.min(3, u.mhp - u.hp); u.hp += v; ev.push({ e: 'heal', id: u.id, v: v, x: u.x, y: u.y }); } });
      else if (c.s === 'ruf') g.buff[p].atk = 1;
      else if (c.s === 'schild') g.buff[p].arm = 1;
    });
    bury(g, died, ev);
    return ev;
  }
  // eine Phase rechnen: liefert Ereignisse je Takt (für die Wiedergabe)
  function runPhase(g, ph) {
    var out = [];
    if (vv(g, 'B')) { if (!g.buff) g.buff = [{ atk: 0, arm: 0 }, { atk: 0, arm: 0 }]; if (ph === 1) { var ce = casts(g); if (ce.length) out.push(ce); } }
    var TK = vv(g, 'A') ? R.rvTicks : R.ticks;
    for (var i = 0; i < TK[ph] && g.over == null; i++) { var ev = []; tick(g, ev); out.push(ev); if (!ev.length) break; }
    g.units = g.units.filter(function (u) { return u.hp > 0; });
    return out;
  }
  function armyVal(g, p) { return g.units.filter(function (u) { return u.p === p && u.t !== 'ou' && u.hp > 0; }).reduce(function (s, u) { return s + TYPES[base(u.t)].cost * u.hp / u.mhp + u.lv; }, 0); }
  function endRound(g) {
    var ev = [];
    // Variante A: wer mehr Truppenwert übrig hat, gewinnt die Runde und trifft den gegnerischen Feldherrn
    if (vv(g, 'A')) {
      var v = [armyVal(g, 0), armyVal(g, 1)], w = v[0] > v[1] + 0.01 ? 0 : v[1] > v[0] + 0.01 ? 1 : null;
      var esc = R.rvMin + R.rvEsc * g.round; // Mindestschaden wächst mit der Runde (gegen endlose Patt-Runden)
      var kg = function (q) { return g.units.filter(function (u) { return u.p === q && u.t === 'ou'; })[0]; };
      if (w != null) { var lo = 1 - w, kk = kg(lo), d = Math.max(esc, Math.round((v[w] - v[lo]) * R.rvK)); if (kk) { kk.hp -= d; ev.push({ e: 'rdmg', p: lo, dmg: d, v: [Math.round(v[0] * 10) / 10, Math.round(v[1] * 10) / 10] }); } }
      else { var dd = R.rvDraw ? Math.ceil(esc / 2) : 0; [0, 1].forEach(function (q) { var k2 = kg(q); if (k2) k2.hp -= dd; }); ev.push({ e: 'rdmg', p: null, dmg: dd, v: [Math.round(v[0] * 10) / 10, Math.round(v[1] * 10) / 10] }); }
    }
    if (R.storm && !vv(g, 'A')) [0, 1].forEach(function (p) {
      var mine = g.units.filter(function (u) { return u.p === p && u.t !== 'ou'; }), foes = g.units.filter(function (u) { return u.p !== p && u.t !== 'ou'; }), k = g.units.filter(function (u) { return u.p === p && u.t === 'ou'; })[0];
      if (!k || mine.length || !foes.length) return;
      var d = Math.round(R.storm * foes.reduce(function (s, u) { return s + u.atk; }, 0)); k.hp -= d; ev.push({ e: 'storm', p: p, dmg: d, n: foes.length });
    });
    var kings = [0, 1].map(function (p) { return g.units.some(function (u) { return u.p === p && u.t === 'ou' && u.hp > 0; }); });
    if (!kings[0] || !kings[1]) { g.over = !kings[0] && !kings[1] ? 'remis' : kings[0] ? 0 : 1; ev.push({ e: 'end', w: g.over }); return ev; }
    g.units.forEach(function (u) { if (u.hp < u.mhp) u.hp = Math.min(u.mhp, u.hp + (u.t === 'ou' ? R.kingHeal : R.heal)); });
    var terr = [0, 1].map(function (p) { return Math.min(R.terrMax, R.terrGold * g.units.filter(function (u) { return u.p === p && u.t !== 'ou' && !ownRows(p, u.y, 3); }).length); });
    g.terr = terr;
    var lossG = vv(g, 'A') ? [0, 0] : [0, 1].map(function (p) { return Math.min(R.lossGoldMax, R.lossGold * (g.lost ? g.lost[p] : 0)); });
    var heroG = [0, 1].map(function (p) { return vv(g, 'B') && g.hero[p].skills.indexOf('logistik') >= 0 ? 2 : 0; });
    g.round++; g.gold = g.gold.map(function (v, p) { return Math.max(0, v + terr[p] + R.income(g.round) + (g.bonus ? g.bonus[p] : 0) + lossG[p] + heroG[p]); });
    g.lost = [0, 0]; g.rerolls = [0, 0]; // bonus: Vorgabe bzw. KI-Stärke
    g.offers = [makeOffers(g, 0), makeOffers(g, 1)];
    // Variante A: Armee steht wieder vollzählig auf ihren Plätzen, nur der Feldherr behält seinen Schaden
    if (vv(g, 'A') && g.roster) {
      var kings = {}; g.units.forEach(function (u) { if (u.t === 'ou') kings[u.p] = u; });
      g.units = g.roster.map(function (r0) { var u = clone(r0); if (u.t === 'ou') { u.hp = kings[u.p] ? kings[u.p].hp : u.hp; u.mhp = kings[u.p] ? kings[u.p].mhp : u.mhp; } else u.hp = u.mhp; return u; });
      g.roster = null; ev.push({ e: 'revive' });
    }
    if (vv(g, 'B')) [0, 1].forEach(function (p) {
      var h = g.hero[p]; if (h.pick) { var k0 = h.pick[0]; h.pick = null; learn(g, p, k0); } // nicht gewählt: erste Karte
      h.xp += 1; h.cast = null; h.mana = Math.min(R.manaMax, h.mana + R.mana + (h.skills.indexOf('weise') >= 0 ? 1 : 0));
      if (h.lv < XPN.length && h.xp >= XPN[h.lv]) { h.lv++; h.pick = heroPick(g, p); ev.push({ e: 'lvl', p: p, lv: h.lv }); }
      g.buff = null;
    });
    if (vv(g, 'C')) { g.cardUsed = [0, 0]; g.cards = [makeCards(g, 0), makeCards(g, 1)]; }
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

  var API = { TECH: TECH, SKILL: SKILL, SPELL: SPELL, XPN: XPN, vv: vv, bonus: bonus, armyVal: armyVal, makeCards: makeCards, holds: holds, N: N, TYPES: TYPES, SHOP: SHOP, R: R, newGame: newGame, canDo: canDo, apply: apply, applyAll: applyAll, runPhase: runPhase, endRound: endRound, playRound: playRound, targetsFrom: targetsFrom, at: at, unit: unit, clone: clone, ownRows: ownRows, inZone: inZone, fwd: fwd, rng: rng, hash: hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.AK = API;
})(this);
