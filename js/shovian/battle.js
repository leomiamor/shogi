// Shovian-Gefecht: Shogi-Zugregeln mit Trupps (Anzahl × Werte), Schaden und Gegenschlag, Mauersteine, Katapult-Fernkampf.
// Seite 0 = Angreifer (unten, zieht zuerst), Seite 1 = Verteidiger (oben, hinter der Mauer). Reine Logik, keine Oberfläche.
var SVB = (function () {
  var R = typeof SV !== 'undefined' ? SV : require('./rules.js');
  var K = 0.5;            // Schadensfaktor: gleich starke Trupps brauchen ~2 Treffer
  var COUNTER = 0.5;      // Gegenschlag: Anteil des eigenen Angriffs
  var RAM_X = 3;          // Rammen gegen Mauersteine
  var SHOOT_TROOP = 0.5;  // Katapult gegen Truppen
  var PROMO_A = 1.25;     // Beförderte: +25 % Angriff
  var DEAD = 0.05;        // darunter ist ein Trupp vernichtet
  var STONE_HP = 120;     // Leben pro Stein je Mauerstufe

  function sizeFor(n) { return n <= 3 ? 5 : n <= 8 ? 7 : 9; }
  function rowsFor(w) { return w === 5 ? 1 : w === 7 ? 2 : 3; }
  function U(p) { return R.unit(p.tribe, p.key); }

  // cfg: { att: { tribe, squads: [{ key, n }] }, def: { tribe, squads, wall }, size?, limit? }
  function create(cfg) {
    var nFig = Math.max(cfg.att.squads.length, cfg.def.squads.length);
    var W = cfg.size || sizeFor(nFig), rows = rowsFor(W), id = 1;
    var st = { W: W, H: W, rows: rows, pcs: [], stones: [], turn: 0, moves: [0, 0], limit: cfg.limit || 10, over: false, winner: null, reason: '',
      tribe: [cfg.att.tribe, cfg.def.tribe], wallLvl: cfg.def.wall || 0, wallPct: (R.TRIBES[cfg.def.tribe] || {}).wall || 0, log: [] };
    [cfg.att, cfg.def].forEach(function (s, side) {
      s.squads.forEach(function (q) { if (q.n > 0) st.pcs.push({ id: id++, side: side, tribe: q.key === 'hero' ? s.tribe : s.tribe, key: q.key, n: q.n, n0: q.n, x: -1, y: -1, pro: false }); });
    });
    if (st.wallLvl > 0) {
      var y = rows, gaps = st.wallLvl < 10 ? [1, W - 2] : st.wallLvl < 15 ? [(W - 1) / 2] : [];
      for (var x = 0; x < W; x++) if (gaps.indexOf(x) < 0) st.stones.push({ x: x, y: y, hp: STONE_HP * st.wallLvl, max: STONE_HP * st.wallLvl });
    }
    st.val0 = [value(st, 0), value(st, 1)];
    return st;
  }
  function clone(st) {
    var c = Object.assign({}, st);
    c.pcs = st.pcs.map(function (p) { return Object.assign({}, p); });
    c.stones = st.stones.map(function (s) { return Object.assign({}, s); });
    c.moves = st.moves.slice(); c.log = [];
    return c;
  }
  function value(st, side) { var v = 0; st.pcs.forEach(function (p) { if (p.side === side && p.n > 0) v += p.n * U(p).cost; }); return v; }
  function alive(st, side) { return st.pcs.filter(function (p) { return p.side === side && p.n > 0; }); }
  function at(st, x, y) { for (var i = 0; i < st.pcs.length; i++) { var p = st.pcs[i]; if (p.x === x && p.y === y && p.n > 0) return p; } return null; }
  function stoneAt(st, x, y) { for (var i = 0; i < st.stones.length; i++) { var s = st.stones[i]; if (s.x === x && s.y === y) return s; } return null; }
  function inB(st, x, y) { return x >= 0 && y >= 0 && x < st.W && y < st.H; }
  function inZone(st, side, y) { return side === 0 ? y >= st.H - st.rows : y < st.rows; }
  function mvType(p) { var b = U(p).mv; return p.pro && R.PROMO[b] ? R.PROMO[b] : b; }
  function canPromote(p) { var u = U(p); return !p.pro && !u.hero && !u.ranged && !u.ram && !u.chief && !!R.PROMO[u.mv]; }
  function wallUp(st) { return st.stones.length > 0; }

  // ---------- Aufstellung ----------
  function place(st, id, x, y) {
    var p = byId(st, id); if (!p || !inB(st, x, y) || !inZone(st, p.side, y) || stoneAt(st, x, y)) return false;
    var o = at(st, x, y); if (o && o !== p) { if (o.side !== p.side) return false; o.x = p.x; o.y = p.y; } // tauschen
    p.x = x; p.y = y; return true;
  }
  function unplace(st, id) { var p = byId(st, id); if (p) { p.x = -1; p.y = -1; } }
  function byId(st, id) { for (var i = 0; i < st.pcs.length; i++) if (st.pcs[i].id === id) return st.pcs[i]; return null; }
  function zoneCells(st, side) { var out = []; for (var y = 0; y < st.H; y++) for (var x = 0; x < st.W; x++) if (inZone(st, side, y) && !stoneAt(st, x, y)) out.push({ x: x, y: y }); return out; }
  function squads(st, side) { return st.pcs.filter(function (p) { return p.side === side && p.n > 0; }).length; }
  // Trupp teilen (Hälfte, mindestens 1), nur wenn noch Platz in der Startzone ist
  function split(st, id) {
    var p = byId(st, id); if (!p || p.n < 2 || squads(st, p.side) >= zoneCells(st, p.side).length) return null;
    var k = Math.floor(p.n / 2), q = Object.assign({}, p, { id: nextId(st), n: k, n0: k, x: -1, y: -1 });
    p.n -= k; p.n0 = p.n; st.pcs.push(q); return q;
  }
  // zwei gleiche Trupps zusammenlegen
  function merge(st, id, into) {
    var p = byId(st, id), q = byId(st, into); if (!p || !q || p === q || p.side !== q.side || p.key !== q.key || U(p).hero) return false;
    q.n += p.n; q.n0 = q.n; st.pcs.splice(st.pcs.indexOf(p), 1); return true;
  }
  function nextId(st) { var m = 0; st.pcs.forEach(function (p) { m = Math.max(m, p.id); }); return m + 1; }
  // automatisch aufstellen: Nahkampf vorn (Schutz vorn), Fernkampf/Held/Anführer hinten, Reiter an die Flanken
  function autoPlace(st, side, onlyFree) {
    var cells = zoneCells(st, side), fwd = side === 0 ? -1 : 1;
    function rank(c) { return side === 0 ? st.H - 1 - c.y : c.y; } // 0 = hinterste Reihe
    var free = cells.filter(function (c) { var o = at(st, c.x, c.y); return !o || (!onlyFree && o.side === side); });
    var list = st.pcs.filter(function (p) { return p.side === side && p.n > 0 && (!onlyFree || p.x < 0); });
    if (!onlyFree) list.forEach(function (p) { p.x = -1; p.y = -1; });
    function role(p) { var u = U(p); return u.ranged || u.hero || u.chief ? 0 : u.cav ? 1 : 2; } // 2 = ganz vorn
    list.sort(function (a, b) { return role(b) - role(a) || U(b).vi - U(a).vi; });
    var mid = (st.W - 1) / 2;
    list.forEach(function (p) {
      var r = role(p), best = null, bs = -1e9;
      free.forEach(function (c) {
        if (at(st, c.x, c.y)) return;
        var front = rank(c), s = r === 2 ? front * 10 - Math.abs(c.x - mid) : r === 1 ? front * 4 + Math.abs(c.x - mid) * 2 : -front * 10 - Math.abs(c.x - mid);
        if (s > bs) { bs = s; best = c; }
      });
      if (best) { p.x = best.x; p.y = best.y; }
    });
    return list.every(function (p) { return p.x >= 0; });
  }
  function ready(st, side) { return st.pcs.every(function (p) { return p.side !== side || p.n <= 0 || p.x >= 0; }); }

  // ---------- Züge ----------
  // Ergebnis: [{ x, y, k }] mit k = 'move' | 'attack' | 'wall' | 'shoot'
  function moves(st, p) {
    if (!p || p.n <= 0 || p.x < 0) return [];
    var u = U(p), out = [], f = p.side === 0 ? 1 : -1, t = mvType(p);
    function look(x, y) {
      if (!inB(st, x, y)) return 'out';
      var s = stoneAt(st, x, y);
      if (s) { if (p.side === 0 && !u.ranged) out.push({ x: x, y: y, k: 'wall' }); return 'block'; }
      var o = at(st, x, y);
      if (!o) { out.push({ x: x, y: y, k: 'move' }); return 'free'; }
      if (o.side !== p.side && !u.ranged) out.push({ x: x, y: y, k: 'attack' });
      return 'block';
    }
    (R.STEP[t] || []).forEach(function (d) { look(p.x + d[0], p.y + d[1] * f); });
    var maxRun = u.ranged ? 2 : 99;
    (R.SLIDE[t] || []).forEach(function (d) {
      for (var i = 1; i <= maxRun; i++) if (look(p.x + d[0] * i, p.y + d[1] * i * f) !== 'free') break;
    });
    if (u.ranged) { // schießt diagonal 1–3 Felder weit, auch über Figuren hinweg
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (d) {
        for (var i = 1; i <= 3; i++) {
          var x = p.x + d[0] * i, y = p.y + d[1] * i; if (!inB(st, x, y)) break;
          var o = at(st, x, y), s = stoneAt(st, x, y);
          if ((o && o.side !== p.side) || (s && p.side === 0)) out.push({ x: x, y: y, k: 'shoot' });
        }
      });
    }
    return out;
  }
  function allMoves(st, side) {
    var out = [];
    st.pcs.forEach(function (p) { if (p.side === side && p.n > 0 && p.x >= 0) moves(st, p).forEach(function (m) { out.push({ id: p.id, x: m.x, y: m.y, k: m.k }); }); });
    return out;
  }

  // ---------- Kampf ----------
  function atk(p) { return U(p).a * (p.pro ? PROMO_A : 1); }
  function defOf(st, t, byCav) { var u = U(t), d = byCav ? u.vk : u.vi; return d * (t.side === 1 && wallUp(st) ? 1 + st.wallPct * st.wallLvl : 1); }
  function strike(st, a, t, mult) {
    var dmg = a.n * atk(a) * K * (mult || 1), lost = Math.min(t.n, dmg / Math.max(1, defOf(st, t, !!U(a).cav)));
    t.n -= lost; if (t.n < DEAD) { lost += t.n; t.n = 0; }
    return lost;
  }
  // Zug ausführen; liefert Ereignisse für die Anzeige
  function apply(st, mv) {
    var p = byId(st, mv.id), ev = [], fx = p.x, fy = p.y;
    if (mv.k === 'move') { p.x = mv.x; p.y = mv.y; ev.push({ t: 'move', id: p.id, fx: fx, fy: fy, x: mv.x, y: mv.y }); }
    else if (mv.k === 'attack' || mv.k === 'shoot') {
      var t = at(st, mv.x, mv.y);
      if (t) {
        var lost = strike(st, p, t, mv.k === 'shoot' ? SHOOT_TROOP : 1);
        ev.push({ t: mv.k === 'shoot' ? 'shoot' : 'hit', id: p.id, tid: t.id, lost: lost, dead: t.n <= 0, x: t.x, y: t.y });
        if (t.n > 0 && mv.k === 'attack') {
          var back = strike(st, t, p, COUNTER);
          ev.push({ t: 'counter', id: t.id, tid: p.id, lost: back, dead: p.n <= 0, x: p.x, y: p.y });
        }
        if (t.n <= 0 && mv.k === 'attack' && p.n > 0) { p.x = mv.x; p.y = mv.y; ev.push({ t: 'move', id: p.id, fx: fx, fy: fy, x: mv.x, y: mv.y }); }
      } else {
        var s = stoneAt(st, mv.x, mv.y); if (s) wallHit(st, p, s, mv, ev, fx, fy);
      }
    } else if (mv.k === 'wall') { var s2 = stoneAt(st, mv.x, mv.y); if (s2) wallHit(st, p, s2, mv, ev, fx, fy); }
    if (p.n > 0 && canPromote(p) && (p.side === 0 ? p.y < st.rows : p.y >= st.H - st.rows) && p.x === mv.x && p.y === mv.y) { p.pro = true; ev.push({ t: 'promo', id: p.id }); }
    st.moves[p.side]++;
    endTurn(st, ev);
    return ev;
  }
  function wallHit(st, p, s, mv, ev, fx, fy) {
    var u = U(p), dmg = p.n * atk(p) * K * (u.ram ? RAM_X : 1);
    s.hp -= dmg; var broke = s.hp <= 0;
    ev.push({ t: 'stone', id: p.id, x: s.x, y: s.y, dmg: dmg, broke: broke });
    if (broke) {
      st.stones.splice(st.stones.indexOf(s), 1);
      if (!st.stones.length) ev.push({ t: 'wallDown' });
      if (mv.k === 'wall') { p.x = s.x; p.y = s.y; ev.push({ t: 'move', id: p.id, fx: fx, fy: fy, x: s.x, y: s.y }); }
    }
  }
  function endTurn(st, ev) {
    var a0 = alive(st, 0).length, a1 = alive(st, 1).length;
    if (!a0 || !a1) { finish(st, a0 ? 0 : 1, 'vernichtet'); ev.push({ t: 'over' }); return; }
    st.turn = 1 - st.turn;
    for (var tries = 0; tries < 2; tries++) {
      if (st.moves[0] >= st.limit && st.moves[1] >= st.limit) { score(st); ev.push({ t: 'over' }); return; }
      if (st.moves[st.turn] < st.limit && allMoves(st, st.turn).length) return;
      st.moves[st.turn] = Math.max(st.moves[st.turn], st.limit); // kann nicht mehr ziehen
      st.turn = 1 - st.turn;
    }
    score(st); ev.push({ t: 'over' });
  }
  function lostPct(st, side) { return st.val0[side] ? 1 - value(st, side) / st.val0[side] : 0; }
  function score(st) { var l0 = lostPct(st, 0), l1 = lostPct(st, 1); finish(st, l0 < l1 ? 0 : 1, 'Wertung'); }
  function finish(st, w, why) { st.over = true; st.winner = w; st.reason = why; }

  return { create: create, clone: clone, value: value, alive: alive, at: at, stoneAt: stoneAt, inZone: inZone, mvType: mvType, place: place, unplace: unplace,
    split: split, merge: merge, autoPlace: autoPlace, ready: ready, zoneCells: zoneCells, byId: byId, moves: moves, allMoves: allMoves, apply: apply,
    lostPct: lostPct, defOf: defOf, atk: atk, U: U, wallUp: wallUp, K: K, COUNTER: COUNTER };
})();
if (typeof module !== 'undefined') module.exports = SVB;
