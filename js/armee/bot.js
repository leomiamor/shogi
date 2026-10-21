// Armee-Modus: einfache KI für Übungspartien und Selbstspiel-Tests. Plant mit denselben Aktionen wie ein Mensch.
// stil: 'breit' (viele billige Truppen), 'elite' (wenige starke, aufwerten), 'mix' (Standard)
(function (root) {
  'use strict';
  var AK = root.AK || (typeof require !== 'undefined' ? require('./engine.js') : null);
  var N = AK.N, T = AK.TYPES;
  var VAL = { fu: 0.9, ky: 3.3, ke: 3.2, gi: 4.2, ki: 4.4, ka: 5.2, hi: 6.4 }; // Wert pro Typ (für den Kauf)

  function freeCells(g, p, rows) {
    var out = [];
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (AK.ownRows(p, y, rows) && !AK.at(g, x, y)) out.push([x, y]);
    return out;
  }
  // Platz wählen: Fernkämpfer/Feldherr-Schutz hinten, Nahkampf vorn, Spalten mit Gegnern bevorzugt
  function spot(g, p, t, rows, r) {
    var cells = freeCells(g, p, rows); if (!cells.length) return null;
    var me = g.units.filter(function (u) { return u.p === p && u.t === 'ou'; })[0];
    var foes = g.units.filter(function (u) { return u.p !== p; });
    var back = t === 'ka' || t === 'hi' || t === 'ky';
    var best = null, bs = -1e9;
    cells.forEach(function (c) {
      var depth = p === 0 ? N - 1 - c[1] : c[1]; // 0 = hinterste Reihe
      var s = back ? -Math.abs(depth - 1) * 2 : depth * 1.5;
      if (me) s -= Math.max(Math.abs(me.x - c[0]), 0) * 0.6;
      foes.forEach(function (f) { if (Math.abs(f.x - c[0]) <= 1) s += 0.4; });
      if (t === 'ky' || t === 'hi') { var col = foes.filter(function (f) { return f.x === c[0]; }).length; s += col * 1.2; }
      s += r() * 0.8;
      if (s > bs) { bs = s; best = c; }
    });
    return best;
  }
  // lvl: 0 leicht (stürmt blind, kauft nach Laune), 1 mittel (Standard), 2 schwer (probiert Varianten im Kopf durch)
  function plan(g, p, stil, seed, lvl) {
    if (lvl === 2) return planHard(g, p, seed, ['mix', 'elite', 'breit'], 3);
    if (lvl === 1) return planHard(g, p, seed, ['mix'], 2);
    var w = AK.clone(g), acts = [], r = AK.rng(AK.hash(seed || 1, g.round, p, 991));
    stil = stil || 'mix'; var easy = lvl === 0, EZ = (typeof AK_EZ !== 'undefined' && AK_EZ) || {}; var ez = function (k) { return easy || EZ[k]; };
    function act(a) { if (!AK.apply(w, p, a, 'plan')) { acts.push(a); return true; } return false; }
    // 1) Überläufer einsetzen (kostenlos)
    // die wertvollsten zuerst
    for (var d = 0; d < 4 && w.hand[p].length > 1 && !ez('drop'); d++) { // einen für die Reaktion behalten (dort gratis)
      var bi = 0; w.hand[p].forEach(function (t, i) { if (T[t].cost > T[w.hand[p][bi]].cost) bi = i; });
      var s0 = spot(w, p, w.hand[p][bi], 4, r); if (!s0 || !act({ k: 'drop', i: bi, x: s0[0], y: s0[1] })) break;
    }
    // 2) kaufen, bis das Gold alle ist (Elite spart für Aufwertungen)
    for (var guard = 0, bought = 0; guard < 12 && !(easy && bought >= 3); guard++) { // leicht kauft höchstens 3 pro Runde
      var gold = w.gold[p], best = -1, bv = 0;
      w.offers[p].forEach(function (o, i) {
        if (o.sold || T[o.t].cost > gold) return;
        var v = ez('buy') ? r() : VAL[o.t] / T[o.t].cost;
        if (stil === 'breit') v += o.t === 'fu' ? 0.6 : 0;
        if (stil === 'elite') v += T[o.t].cost >= 6 ? 0.5 : T[o.t].cost <= 1 ? -0.8 : 0;
        v += r() * 0.15;
        if (v > bv) { bv = v; best = i; }
      });
      if (best < 0) {
        // nichts Passendes: einmal neu würfeln, wenn genug Gold übrig
        if (gold >= 5 && w.rerolls[p] < 1 && act({ k: 'reroll' })) continue;
        break;
      }
      var tt = w.offers[p][best].t, s = ez('spot') ? (function (c) { return c.length ? c[Math.floor(r() * c.length)] : null; })(freeCells(w, p, 3)) : spot(w, p, tt, 3, r); if (!s) break;
      if (act({ k: 'buy', i: best, x: s[0], y: s[1] })) bought++;
    }
    // 3) Restgold in Aufwertungen (stärkste zuerst)
    var mine = w.units.filter(function (u) { return u.p === p && u.t !== 'ou'; }).sort(function (a, b) { return (T[T[b.t].base || b.t].cost - T[T[a.t].base || a.t].cost) || (a.id - b.id); });
    if (!ez('up')) mine.forEach(function (u) { act({ k: 'up', id: u.id }); });
    // 4) Befehle: halten, solange der Gegner (mit seinem Gold für neue Käufe) stärker ist (Halten gibt +1 Schaden), sonst angreifen
    function val(q) { return w.units.filter(function (u) { return u.p === q && u.t !== 'ou'; }).reduce(function (s, u) { return s + T[T[u.t].base || u.t].cost * u.hp / u.mhp + u.lv * 2; }, 0); }
    var go = ez('vor') ? true : (typeof AK_OLDBOT !== 'undefined' && AK_OLDBOT) ? (w.units.filter(function (u) { return u.p === p && u.t !== 'ou'; }).length >= w.units.filter(function (u) { return u.p !== p && u.t !== 'ou'; }).length || g.round >= 4)
      : val(p) >= (val(1 - p) + g.gold[1 - p] * 0.8) * (typeof AK_HOLDF !== 'undefined' ? AK_HOLDF : 0.9);
    w.units.forEach(function (u) { if (u.p === p && u.t !== 'ou') { var o = go ? 'vor' : 'halt'; if (u.ord !== o) act({ k: 'ord', id: u.id, ord: o }); } });
    return acts;
  }
  function val(w, q) { return w.units.filter(function (u) { return u.p === q && u.t !== 'ou'; }).reduce(function (s, u) { return s + T[T[u.t].base || u.t].cost * u.hp / u.mhp + u.lv * 2; }, 0); }
  function withOrders(g, p, acts, mode) {
    var w = AK.clone(g); acts.forEach(function (a) { AK.apply(w, p, a, 'plan'); });
    var out = acts.filter(function (a) { return a.k !== 'ord'; });
    w.units.forEach(function (u) {
      if (u.p !== p || u.t === 'ou') return;
      var o = mode === 'vor' ? 'vor' : mode === 'halt' ? 'halt' : (u.t === 'ka' || u.t === 'hi' || u.t === 'ky' || u.t === 'um' || u.t === 'ry' || u.t === 'ny' ? 'halt' : 'vor');
      if (o !== u.ord) out.push({ k: 'ord', id: u.id, ord: o });
    });
    return out;
  }
  // Schwer: Kandidaten (Stile × Befehle) gegen zwei vermutete Gegnerpläne durchspielen, den besten nehmen
  function planHard(g, p, seed, stile, nf) {
    var cands = [];
    stile.forEach(function (st, i) {
      var base = plan(g, p, st, (seed || 1) + i * 17, 'base');
      cands.push(base); cands.push(withOrders(g, p, base, 'vor')); cands.push(withOrders(g, p, base, 'halt')); cands.push(withOrders(g, p, base, 'shoot'));
    });
    var foes = [plan(g, 1 - p, 'mix', (seed || 1) + 101, 'base'), withOrders(g, 1 - p, plan(g, 1 - p, 'breit', (seed || 1) + 303, 'base'), 'vor'), plan(g, 1 - p, 'elite', (seed || 1) + 202, 'base')].slice(0, nf);
    var best = cands[0], bs = -1e9;
    cands.forEach(function (c) {
      var sc = 0;
      foes.forEach(function (f) {
        var w = AK.clone(g), pl = [[], []]; pl[p] = c; pl[1 - p] = f;
        AK.playRound(w, pl, function (gg) { var r = [[], []]; r[p] = react(gg, p, seed); r[1 - p] = react(gg, 1 - p, seed + 1); return r; });
        if (w.over != null) { sc += w.over === p ? 1000 : -1000; return; }
        var k = function (q) { var u = w.units.filter(function (u) { return u.p === q && u.t === 'ou'; })[0]; return u ? u.hp : 0; };
        sc += val(w, p) - val(w, 1 - p) + (k(p) - k(1 - p)) * 0.6 + (w.gold[p] - w.gold[1 - p]) * 0.5 + (w.hand[p].length - w.hand[1 - p].length) * 1.5;
      });
      if (sc > bs) { bs = sc; best = c; }
    });
    return best;
  }
  // Reaktion: Überläufer an die Front, Feldherr in Not zurückhalten (er hält ohnehin)
  function react(g, p, seed) {
    var w = AK.clone(g), acts = [], r = AK.rng(AK.hash(seed || 1, g.round, p, 313));
    for (var i = 0; i < AK.R.reactDrops && w.hand[p].length; i++) {
      var s = spot(w, p, w.hand[p][0], 4, r); if (!s) break;
      var a = { k: 'drop', i: 0, x: s[0], y: s[1] }; if (!AK.apply(w, p, a, 'react')) acts.push(a);
    }
    return acts;
  }
  var API = { plan: plan, react: react };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.AKBot = API;
})(this);
