// Shovian-Gefechts-KI: Minimax mit Alpha-Beta über die echten Züge, Bewertung = Truppenwert, Mauer, Drohungen, Vorrücken.
var SVA = (function () {
  var B = typeof SVB !== 'undefined' ? SVB : require('./battle.js');

  // Bewertung aus Sicht von side
  function evalSt(st, side) {
    if (st.over) return st.winner === side ? 1e7 : -1e7;
    var v = [B.value(st, 0) / (st.val0[0] || 1), B.value(st, 1) / (st.val0[1] || 1)], s = (v[side] - v[1 - side]) * 1000;
    // Mauer zählt für den Verteidiger
    var wall = 0; st.stones.forEach(function (x) { wall += x.hp / x.max; });
    if (st.stones.length) s += (side === 1 ? 1 : -1) * wall * 15;
    // Vorrücken (nur leicht) und Beförderte
    st.pcs.forEach(function (p) {
      if (p.n <= 0 || p.x < 0) return;
      var sg = p.side === side ? 1 : -1, adv = p.side === 0 ? (st.H - 1 - p.y) : p.y, u = B.U(p);
      if (!u.hero && !u.ranged) s += sg * adv * 2;
      if (p.pro) s += sg * 20;
    });
    // Mobilität: wer am Zug ist, kann zuerst zuschlagen
    s += (st.turn === side ? 1 : -1) * 8;
    return s;
  }
  function order(st, list) {
    // Angriffe zuerst (größter Zielwert), dann Rest
    return list.map(function (m) {
      var t = B.at(st, m.x, m.y), sc = m.k === 'attack' || m.k === 'shoot' ? (t ? t.n * B.U(t).cost : 0) + 1e6 : m.k === 'wall' ? 5e5 : 0;
      return { m: m, s: sc };
    }).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.m; });
  }
  // Minimax aus Sicht von side (max, wenn side am Zug ist, sonst min), mit Alpha-Beta
  function minimax(st, depth, alpha, beta, side, deadline) {
    if (depth === 0 || st.over || Date.now() > deadline) return evalSt(st, side);
    var list = B.allMoves(st, st.turn);
    if (!list.length) return evalSt(st, side);
    var maxi = st.turn === side, best = maxi ? -1e12 : 1e12;
    list = order(st, list);
    for (var i = 0; i < list.length; i++) {
      var c = B.clone(st); B.apply(c, list[i]);
      var sc = minimax(c, depth - 1, alpha, beta, side, deadline);
      if (maxi) { if (sc > best) best = sc; if (best > alpha) alpha = best; }
      else { if (sc < best) best = sc; if (best < beta) beta = best; }
      if (alpha >= beta) break;
    }
    return best;
  }
  // bester Zug für st.turn; ms = Zeitbudget. Iterativ tiefer, solange Zeit ist (nur fertig gerechnete Tiefen zählen)
  function best(st, ms) {
    var side = st.turn, list = order(st, B.allMoves(st, side)); if (!list.length) return null;
    var deadline = Date.now() + (ms || 600), bestM = list[0], noise = list.map(function () { return Math.random() * 2; }); // kleine Streuung gegen immer gleiche Züge
    for (var depth = 1; depth <= 6; depth++) {
      var dm = null, ds = -1e12;
      for (var i = 0; i < list.length; i++) {
        var c = B.clone(st); B.apply(c, list[i]);
        var sc = minimax(c, depth - 1, -1e12, 1e12, side, deadline) + noise[i];
        if (sc > ds) { ds = sc; dm = list[i]; }
        if (Date.now() > deadline) break;
      }
      if (Date.now() > deadline && depth > 1) break;
      bestM = dm;
      if (ds > 1e6) break; // sicherer Sieg gefunden
    }
    return bestM;
  }
  return { best: best, evalSt: evalSt };
})();
if (typeof module !== 'undefined') module.exports = SVA;
