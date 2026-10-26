// Shovian-Gefecht: Shogi-Zugregeln mit Trupps (Anzahl × Werte), Schaden und Gegenschlag, Mauersteine, Katapult-Fernkampf.
// Seite 0 = Angreifer (unten, zieht zuerst), Seite 1 = Verteidiger (oben, hinter der Mauer). Reine Logik, keine Oberfläche.
var SVB = (function () {
  var R = typeof SV !== 'undefined' ? SV : require('./rules.js');
  // Kampf nach Travian (kirilloid, Wunsch 25.10.): Angriffspunkte (Anzahl × Angriff) gegen Verteidigungspunkte (Anzahl × Verteidigung gegen Infanterie bzw.
  // Kavallerie × Mauer). Normaler Angriff: der Schwächere fällt komplett, der Stärkere verliert (schwach/stark)^1,5 seiner Truppen.
  var EXP = 1.5;          // Travian-Exponent der Verlustformel
  var PROMO_A = 1.25;     // Beförderte: +25 % Angriff (nur im Gefecht)
  var DEAD = 0.05;        // darunter ist ein Trupp vernichtet
  // Mauer wie Travian: Bonus = Basis^Stufe (Römer 1,030, Gallier 1,025, Germanen 1,020). Rammen senken die Stufe.
  // Mauerpunkte = Rammen, die die Mauer ganz schleifen (geschätzt nach Travian ohne Schmiede-Upgrades): 0,15·L² + L (Stufe 5: 9, 10: 25, 20: 80)
  var RAM_HIT = 1;        // Mauerpunkte je Ramme
  var CATA_HIT = 0.5;     // je Katapult (in Travian treffen Katapulte die Mauer nicht; hier halb so gut wie Rammen, dafür aus der Ferne)
  var RAM_PRE = typeof process !== 'undefined' && process.env && process.env.SV_RAMPRE ? +process.env.SV_RAMPRE : 1; // Anteil der Rammwirkung vor dem Kampf (26.10.: 1, sonst gegen hohe Mauern 15–30 Punkte mehr Verlust als Travian)
  var TROOP_HIT = 0.001;  // andere Truppen je Angriffspunkt (20 Legionäre = 0,8 Rammen)
  function ramsNeeded(L) { return 0.15 * L * L + L; }
  var QUIET = 16;         // kein Zuglimit (Wunsch 25.10.): nach so vielen Halbzügen ohne Treffer kommt die Entscheidungsschlacht (alle gegen alle, Travian-Formel)

  function sizeFor(n) { return n <= 3 ? 5 : n <= 8 ? 7 : 9; }
  function rowsFor(w) { return w === 5 ? 1 : w === 7 ? 2 : 3; }
  function U(p) { return R.unit(p.tribe, p.key); }

  // cfg: { att: { tribe, squads: [{ key, n }] }, def: { tribe, squads, wall }, size? }
  function create(cfg) {
    var nFig = Math.max(cfg.att.squads.length, cfg.def.squads.length);
    var W = cfg.size || sizeFor(nFig), rows = rowsFor(W), id = 1;
    var st = { W: W, H: W, rows: rows, pcs: [], stones: [], turn: 0, moves: [0, 0], quiet: 0, over: false, winner: null, reason: '',
      tribe: [cfg.att.tribe, cfg.def.tribe], wallLvl: cfg.def.wall || 0, wallPct: (R.TRIBES[cfg.def.tribe] || {}).wall || 0, log: [] };
    [cfg.att, cfg.def].forEach(function (s, side) {
      // late = Verstärkung, die erst während des Gefechts ankommt: liegt „in der Hand“ und wird ab dem late-ten eigenen Zug wie im Shogi eingesetzt (Drop)
      s.squads.forEach(function (q) { if (q.n > 0) { var p = { id: id++, side: side, tribe: s.tribe, key: q.key, n: q.n, n0: q.n, x: -1, y: -1, pro: false }; if (q.late != null) { p.hand = true; p.late = q.late; } st.pcs.push(p); } });
    });
    st.wallMax = st.wallHp = st.wallLvl > 0 ? ramsNeeded(st.wallLvl) : 0;
    if (st.wallLvl > 0) {
      var y = rows, gaps = st.wallLvl < 10 ? [1, W - 2] : st.wallLvl < 15 ? [(W - 1) / 2] : [];
      for (var x = 0; x < W; x++) if (gaps.indexOf(x) < 0) st.stones.push({ x: x, y: y });
      st.stones0 = st.stones.length;
    }
    if (st.wallMax && RAM_PRE) {
      // Rammstoß wie in Travian (Rammen wirken vor der Schlacht): ein Teil der Rammwirkung gleich zu Beginn, Steine fallen von der Mitte aus
      var pre = 0; st.pcs.forEach(function (p) { if (p.side === 0 && !p.hand && U(p).ram) pre += p.n * RAM_HIT * RAM_PRE; });
      st.wallHp = Math.max(0, st.wallHp - pre); if (st.wallHp < 0.05) st.wallHp = 0;
      var keep = st.wallHp > 0 ? Math.ceil(st.stones0 * st.wallHp / st.wallMax - 1e-9) : 0, mid = (W - 1) / 2;
      st.stones.sort(function (a, b) { return Math.abs(b.x - mid) - Math.abs(a.x - mid); }); st.stones.length = Math.min(st.stones.length, keep);
      st.stones.sort(function (a, b) { return a.x - b.x; }); st.ramPre = pre;
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
  function wallUp(st) { return st.wallHp > 0; }
  // aktuelle Mauerstufe (mit Kommastellen) und Verteidigungs-Faktor
  function wallLevel(st) { return st.wallMax ? st.wallLvl * st.wallHp / st.wallMax : 0; }
  function wallMult(st) { return Math.pow(1 + st.wallPct, wallLevel(st)); }

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
    var list = st.pcs.filter(function (p) { return p.side === side && p.n > 0 && !p.hand && (!onlyFree || p.x < 0); });
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
  function ready(st, side) { return st.pcs.every(function (p) { return p.side !== side || p.n <= 0 || p.x >= 0 || p.hand; }); }
  // Drop: Verstärkung aus der Hand, sobald sie angekommen ist, auf ein freies Feld der eigenen Startzone (kostet den Zug)
  var DROP_BACK = typeof process !== 'undefined' && process.env && process.env.SV_DROPBACK ? +process.env.SV_DROPBACK : 0; // Drops nur in die hinterste eigene Reihe
  function canDrop(st, p) { return !!p.hand && p.n > 0 && st.moves[p.side] >= p.late; }
  function onBoard(st, side) { return st.pcs.some(function (p) { return p.side === side && p.n > 0 && (p.x >= 0 || canDrop(st, p)); }); }

  // ---------- Züge ----------
  // Ergebnis: [{ x, y, k }] mit k = 'move' | 'attack' | 'wall' | 'shoot'
  function moves(st, p) {
    if (p && p.hand) return canDrop(st, p) ? zoneCells(st, p.side).filter(function (c) { return !at(st, c.x, c.y) && (!DROP_BACK || c.y === (p.side ? 0 : st.H - 1)); }).map(function (c) { return { x: c.x, y: c.y, k: 'drop' }; }) : [];
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
    st.pcs.forEach(function (p) { if (p.side === side && p.n > 0 && (p.x >= 0 || p.hand)) moves(st, p).forEach(function (m) { out.push({ id: p.id, x: m.x, y: m.y, k: m.k }); }); });
    return out;
  }

  // ---------- Kampf ----------
  function atk(p) { return U(p).a * (p.pro ? PROMO_A : 1); }
  // Mauer hilft nur Verteidigern hinter ihr (in der eigenen Startzone); wer ausfällt, kämpft ohne Bonus
  function defOf(st, t, byCav) { var u = U(t), d = byCav ? u.vk : u.vi; return d * (t.side === 1 && (t.hand || inZone(st, 1, t.y)) ? wallMult(st) : 1); }
  function lose(q, f) { var l = Math.min(q.n, q.n * f); q.n -= l; if (q.n < DEAD) { l += q.n; q.n = 0; } return l; }
  // Zusammenstoß wie eine Travian-Schlacht: der Angreifer-Trupp (Seite 0) zählt mit Angriff, der Verteidiger-Trupp (Seite 1) mit Verteidigung,
  // egal wer zieht (in Travian greifen Verteidiger nie mit Angriffswerten an). Liefert [Verlust Ziel, Verlust Ziehender].
  function power(st, mover, target) {
    var o = mover.side === 0 ? mover : target, d = mover.side === 0 ? target : mover;
    return { o: o, d: d, po: o.n * atk(o), pd: d.n * defOf(st, d, !!U(o).cav) };
  }
  // Unterstützung (wie gedeckte Figuren im Shogi, und wie in Travian, wo immer alle mitkämpfen): Trupps beider Seiten,
  // die an das umkämpfte Feld grenzen, kämpfen mit (Nahkampf, keine Katapulte). Sie teilen das Schicksal ihrer Seite.
  var HELP = true, HELP_R = typeof process !== 'undefined' && process.env && process.env.SV_HELPR ? +process.env.SV_HELPR : 2; // Reichweite der Unterstützung in Feldern (26.10.: 2 statt 1, sonst pickt der Angreifer Trupps heraus und schlägt Travian)
  function helpers(st, side, x, y, skip) {
    return st.pcs.filter(function (q) { var d = Math.max(Math.abs(q.x - x), Math.abs(q.y - y)); return q.side === side && q.n > 0 && q.x >= 0 && q !== skip && !U(q).ranged && d >= 1 && d <= HELP_R; });
  }
  function fight(st, a, t, ev) {
    var o = a.side === 0 ? a : t, d = a.side === 0 ? t : a, os = [o], ds = [d];
    if (HELP) { os = os.concat(helpers(st, 0, t.x, t.y, o)); ds = ds.concat(helpers(st, 1, t.x, t.y, d)); }
    var ai = 0, ac = 0; os.forEach(function (q) { if (U(q).cav) ac += q.n * atk(q); else ai += q.n * atk(q); });
    var po = ai + ac, sh = po ? ai / po : 1, pd = 0;
    ds.forEach(function (q) { pd += q.n * (sh * defOf(st, q, false) + (1 - sh) * defOf(st, q, true)); });
    var win = po >= pd ? 0 : 1, f = Math.pow(Math.min(po, pd) / Math.max(po, pd, 1e-9), EXP), res = {};
    os.concat(ds).forEach(function (q) { res[q.id] = lose(q, q.side === win ? f : 1); });
    if (ev) os.concat(ds).forEach(function (q) { if (q !== a && q !== t && res[q.id] > 0) ev.push({ t: 'help', id: q.id, lost: res[q.id], dead: q.n <= 0, x: q.x, y: q.y }); });
    return [res[t.id], res[a.id]];
  }
  // Katapult-Schuss: Katapult-Angriff gegen Verteidigung des Ziels, kein Rückschlag; Ziel verliert seinen Anteil wie beim Travian-Raubzug (gleich stark = 50 %)
  function shoot(st, a, t) {
    var pa = a.n * atk(a), pd = t.n * defOf(st, t, false), x = Math.pow(Math.min(pa, pd) / Math.max(pa, pd), EXP);
    return lose(t, pa >= pd ? 1 / (1 + x) : x / (1 + x));
  }
  // Zug ausführen; liefert Ereignisse für die Anzeige
  function apply(st, mv) {
    var p = byId(st, mv.id), ev = [], fx = p.x, fy = p.y;
    if (mv.k === 'move') { p.x = mv.x; p.y = mv.y; ev.push({ t: 'move', id: p.id, fx: fx, fy: fy, x: mv.x, y: mv.y }); }
    else if (mv.k === 'drop') { p.hand = false; p.x = mv.x; p.y = mv.y; fx = mv.x; fy = mv.y; ev.push({ t: 'drop', id: p.id, x: mv.x, y: mv.y }); }
    else if (mv.k === 'attack' || mv.k === 'shoot') {
      var t = at(st, mv.x, mv.y);
      if (t) {
        var res = mv.k === 'shoot' ? [shoot(st, p, t), 0] : fight(st, p, t, ev);
        ev.push({ t: mv.k === 'shoot' ? 'shoot' : 'hit', id: p.id, tid: t.id, lost: res[0], dead: t.n <= 0, x: t.x, y: t.y });
        if (res[1] > 0) ev.push({ t: 'counter', id: t.id, tid: p.id, lost: res[1], dead: p.n <= 0, x: p.x, y: p.y });
        if (t.n <= 0 && mv.k === 'attack' && p.n > 0) { p.x = mv.x; p.y = mv.y; ev.push({ t: 'move', id: p.id, fx: fx, fy: fy, x: mv.x, y: mv.y }); }
        else if (mv.k === 'attack' && p.n > 0) {
          // Nahkampf aus der Distanz (Lanze, Läufer, Turm): Ziel lebt noch, dann bleibt der Trupp auf dem Feld direkt davor stehen (Wunsch 25.10., sonst wirkt es wie Fernkampf)
          var dx = mv.x - fx, dy = mv.y - fy, sx = Math.sign(dx), sy = Math.sign(dy);
          if ((dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) && Math.max(Math.abs(dx), Math.abs(dy)) > 1) {
            p.x = mv.x - sx; p.y = mv.y - sy; ev.push({ t: 'move', id: p.id, fx: fx, fy: fy, x: p.x, y: p.y, before: true });
          }
        }
      } else {
        var s = stoneAt(st, mv.x, mv.y); if (s) wallHit(st, p, s, mv, ev, fx, fy);
      }
    } else if (mv.k === 'wall') { var s2 = stoneAt(st, mv.x, mv.y); if (s2) wallHit(st, p, s2, mv, ev, fx, fy); }
    if (p.n > 0 && canPromote(p) && (p.side === 0 ? p.y < st.rows : p.y >= st.H - st.rows) && (p.x !== fx || p.y !== fy)) { p.pro = true; ev.push({ t: 'promo', id: p.id }); }
    st.moves[p.side]++;
    st.quiet = ev.some(function (e) { return e.t === 'hit' || e.t === 'shoot' || e.t === 'stone'; }) ? 0 : st.quiet + 1;
    endTurn(st, ev);
    return ev;
  }
  // Treffer auf die Mauer senkt ihre Stufe; Steine fallen anteilig (der getroffene zuerst, dann die nächsten daneben)
  function wallHit(st, p, s, mv, ev, fx, fy) {
    var u = U(p), l0 = wallLevel(st), dmg = u.ram ? p.n * RAM_HIT : u.ranged ? p.n * CATA_HIT : p.n * atk(p) * TROOP_HIT;
    st.wallHp = Math.max(0, st.wallHp - dmg); if (st.wallHp < 0.05) st.wallHp = 0;
    var keep = st.wallHp > 0 ? Math.ceil(st.stones0 * st.wallHp / st.wallMax - 1e-9) : 0, gone = [];
    while (st.stones.length > keep) {
      var q = st.stones.indexOf(s) >= 0 ? s : st.stones.slice().sort(function (a, b) { return Math.abs(a.x - s.x) - Math.abs(b.x - s.x); })[0];
      st.stones.splice(st.stones.indexOf(q), 1); gone.push({ x: q.x, y: q.y });
    }
    var broke = st.stones.indexOf(s) < 0;
    ev.push({ t: 'stone', id: p.id, x: s.x, y: s.y, dmg: l0 - wallLevel(st), broke: broke, gone: gone });
    if (!st.wallHp && l0 > 0) ev.push({ t: 'wallDown' });
    if (broke && mv.k === 'wall') { p.x = s.x; p.y = s.y; ev.push({ t: 'move', id: p.id, fx: fx, fy: fy, x: s.x, y: s.y }); }
  }
  function endTurn(st, ev) {
    var a0 = onBoard(st, 0), a1 = onBoard(st, 1); // Verstärkung, die noch nicht da ist, rettet das Gefecht nicht
    if (!a0 || !a1) { finish(st, a0 ? 0 : 1, 'vernichtet'); ev.push({ t: 'over' }); return; }
    if (st.quiet >= QUIET) { decide(st, ev); return; }
    st.turn = 1 - st.turn;
    if (allMoves(st, st.turn).length) return;
    st.turn = 1 - st.turn; // kann nicht ziehen: der andere zieht weiter
    if (!allMoves(st, st.turn).length) decide(st, ev);
  }
  // Entscheidungsschlacht wie ein Travian-Angriff: alle Angriffspunkte (Infanterie/Kavallerie) gegen die gewichtete Verteidigung aller Verteidiger
  // (Mauer nur für die hinter ihr). Verlierer fällt komplett, Sieger verliert (Verlierer/Sieger)^1,5 jedes Trupps.
  function decide(st, ev) {
    var here = function (p) { return p.x >= 0 || canDrop(st, p); }, o = alive(st, 0).filter(here), d = alive(st, 1).filter(here), ai = 0, ac = 0, di = 0, dc = 0;
    o.forEach(function (p) { if (U(p).cav) ac += p.n * atk(p); else ai += p.n * atk(p); });
    d.forEach(function (p) { di += p.n * defOf(st, p, false); dc += p.n * defOf(st, p, true); });
    var A = ai + ac, sh = A ? ai / A : 1, D = sh * di + (1 - sh) * dc, win = A > D ? 0 : 1, f = Math.pow(Math.min(A, D) / Math.max(A, D, 1e-9), EXP);
    var lost = [0, 0];
    o.concat(d).forEach(function (p) { lost[p.side] += lose(p, p.side === win ? f : 1) * U(p).cost; });
    ev.push({ t: 'final', A: A, D: D, winner: win, f: f });
    finish(st, win, 'Entscheidungsschlacht'); ev.push({ t: 'over' });
  }
  // Angreifer bricht ab: Überlebende ziehen heim, Verteidiger hält
  function retreat(st) { if (!st.over) finish(st, 1, 'Rückzug'); }
  function quietLeft(st) { return QUIET - st.quiet; }
  function lostPct(st, side) { return st.val0[side] ? 1 - value(st, side) / st.val0[side] : 0; }
  function finish(st, w, why) { st.over = true; st.winner = w; st.reason = why; }

  return { create: create, clone: clone, value: value, alive: alive, at: at, stoneAt: stoneAt, inZone: inZone, mvType: mvType, place: place, unplace: unplace,
    split: split, merge: merge, autoPlace: autoPlace, ready: ready, canDrop: canDrop, zoneCells: zoneCells, byId: byId, moves: moves, allMoves: allMoves, apply: apply,
    power: power, helpers: helpers, setHelp: function (v) { HELP = v; }, lostPct: lostPct, retreat: retreat, quietLeft: quietLeft, QUIET: QUIET, defOf: defOf, atk: atk, U: U, wallUp: wallUp, wallLevel: wallLevel, wallMult: wallMult, ramsNeeded: ramsNeeded };
})();
if (typeof module !== 'undefined') module.exports = SVB;
