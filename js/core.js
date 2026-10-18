// Shogi-Regelwerk. Reine Logik, kein DOM. Läuft im Browser, im Worker (via Factory.toString) und in Node (Tests).
// Brett: 81 Felder, idx = r*9+c. r=0 oben (Gote-Seite), c=0 links (= Linie 9). Sente (0) unten, zieht nach oben.
// Figur: +typ = Sente, -typ = Gote. Züge sind Integer: from | to<<7 | promo<<14. Drop: from = 81+typ.
function ShogiCoreFactory() {
  'use strict';
  var P = 1, L = 2, N = 3, S = 4, G = 5, B = 6, R = 7, K = 8, PP = 9, PL = 10, PN = 11, PS = 12, PB = 13, PR = 14;
  var PROMOTE = [0, 9, 10, 11, 12, 0, 13, 14, 0, 0, 0, 0, 0, 0, 0];
  var BASE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 6, 7];
  var LETTERS = ['', 'P', 'L', 'N', 'S', 'G', 'B', 'R', 'K', '+P', '+L', '+N', '+S', '+B', '+R'];
  var DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  // Richtungsmasken aus Sicht von Sente (vorwärts = r-1)
  var GOLD = (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 6);
  var ALL8 = 255, DIAG = (1 << 0) | (1 << 2) | (1 << 5) | (1 << 7), ORTH = (1 << 1) | (1 << 3) | (1 << 4) | (1 << 6);
  var STEP0 = [0, 1 << 1, 0, 0, (1 << 0) | (1 << 1) | (1 << 2) | (1 << 5) | (1 << 7), GOLD, 0, 0, ALL8, GOLD, GOLD, GOLD, GOLD, ORTH, DIAG];
  var SLIDE0 = [0, 0, 1 << 1, 0, 0, 0, DIAG, ORTH, 0, 0, 0, 0, 0, DIAG, ORTH];
  function flipMask(m) { var o = 0; for (var i = 0; i < 8; i++) if (m & (1 << i)) o |= 1 << (7 - i); return o; }
  var STEP = [STEP0, STEP0.map(flipMask)], SLIDE = [SLIDE0, SLIDE0.map(flipMask)];
  var VALUE = [0, 1, 3, 4, 5, 6, 8, 10, 0, 6, 6, 6, 6, 10, 12]; // grobe Werte für Lern-UI

  // Zobrist (deterministischer PRNG, damit Worker und Hauptthread gleiche Hashes haben)
  var seed = 0x9E3779B9;
  function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; }
  var ZB1 = new Int32Array(81 * 29), ZB2 = new Int32Array(81 * 29);
  var ZH1 = new Int32Array(2 * 8 * 20), ZH2 = new Int32Array(2 * 8 * 20);
  for (var i = 0; i < ZB1.length; i++) { ZB1[i] = rnd(); ZB2[i] = rnd(); }
  for (i = 0; i < ZH1.length; i++) { ZH1[i] = rnd(); ZH2[i] = rnd(); }
  var ZS1 = rnd(), ZS2 = rnd();
  function pidx(p) { return p > 0 ? p : 14 - p; }
  function hidx(col, t, n) { return (col * 8 + t) * 20 + n; }

  var START = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';

  function emptyState() {
    return { board: new Int8Array(81), hands: [new Int8Array(8), new Int8Array(8)], turn: 0, king: [-1, -1], h1: 0, h2: 0, ply: 0,
      hist: [], checks: [], moves: [], stack: [] };
  }
  function rehash(s) {
    var h1 = 0, h2 = 0;
    s.king[0] = s.king[1] = -1;
    for (var q = 0; q < 81; q++) { var p = s.board[q]; if (p) { h1 ^= ZB1[q * 29 + pidx(p)]; h2 ^= ZB2[q * 29 + pidx(p)]; if (p === K) s.king[0] = q; if (p === -K) s.king[1] = q; } }
    for (var c = 0; c < 2; c++) for (var t = 1; t < 8; t++) { var n = s.hands[c][t]; if (n) { h1 ^= ZH1[hidx(c, t, n)]; h2 ^= ZH2[hidx(c, t, n)]; } }
    if (s.turn) { h1 ^= ZS1; h2 ^= ZS2; }
    s.h1 = h1; s.h2 = h2;
  }

  var SF = { p: P, l: L, n: N, s: S, g: G, b: B, r: R, k: K };
  function fromSFEN(str) {
    var s = emptyState(), parts = (str || START).trim().split(/\s+/), rows = parts[0].split('/');
    for (var r = 0; r < 9; r++) {
      var c = 0, prom = false, row = rows[r] || '';
      for (var k = 0; k < row.length; k++) {
        var ch = row[k];
        if (ch === '+') { prom = true; continue; }
        if (ch >= '1' && ch <= '9') { c += +ch; continue; }
        var t = SF[ch.toLowerCase()]; if (prom) t = PROMOTE[t];
        s.board[r * 9 + c] = ch === ch.toUpperCase() ? t : -t; c++; prom = false;
      }
    }
    s.turn = parts[1] === 'w' ? 1 : 0;
    s.ply = Math.max(0, (+parts[3] || 1) - 1);
    if (parts[2] && parts[2] !== '-') {
      var num = 0;
      for (k = 0; k < parts[2].length; k++) {
        ch = parts[2][k];
        if (ch >= '0' && ch <= '9') { num = num * 10 + (+ch); continue; }
        s.hands[ch === ch.toUpperCase() ? 0 : 1][SF[ch.toLowerCase()]] += num || 1; num = 0;
      }
    }
    rehash(s);
    s.hist.push(key(s)); s.checks.push(inCheck(s, s.turn));
    return s;
  }
  function toSFEN(s) {
    var out = [];
    for (var r = 0; r < 9; r++) {
      var row = '', e = 0;
      for (var c = 0; c < 9; c++) {
        var p = s.board[r * 9 + c];
        if (!p) { e++; continue; }
        if (e) { row += e; e = 0; }
        var l = LETTERS[Math.abs(p)]; row += p > 0 ? l : l.toLowerCase();
      }
      if (e) row += e; out.push(row);
    }
    var hand = '', order = [R, B, G, S, N, L, P];
    for (var col = 0; col < 2; col++) order.forEach(function (t) { var n = s.hands[col][t]; if (n) hand += (n > 1 ? n : '') + (col ? LETTERS[t].toLowerCase() : LETTERS[t]); });
    return out.join('/') + ' ' + (s.turn ? 'w' : 'b') + ' ' + (hand || '-') + ' ' + (s.ply + 1);
  }
  function clone(s) {
    var n = emptyState();
    n.board.set(s.board); n.hands[0].set(s.hands[0]); n.hands[1].set(s.hands[1]);
    n.turn = s.turn; n.king = s.king.slice(); n.h1 = s.h1; n.h2 = s.h2; n.ply = s.ply;
    n.hist = s.hist.slice(); n.checks = s.checks.slice(); n.moves = s.moves.slice();
    return n;
  }
  function key(s) { return (s.h1 >>> 0).toString(36) + ':' + (s.h2 >>> 0).toString(36); }

  // ---------- Angriffe ----------
  function isAttacked(s, sq, by) {
    var b = s.board, r0 = (sq / 9) | 0, c0 = sq % 9, sgn = by === 0 ? 1 : -1;
    var st = STEP[by], sl = SLIDE[by];
    for (var d = 0; d < 8; d++) {
      var dr = DIRS[d][0], dc = DIRS[d][1], r = r0 + dr, c = c0 + dc, dist = 1, need = 1 << (7 - d);
      while (r >= 0 && r < 9 && c >= 0 && c < 9) {
        var p = b[r * 9 + c];
        if (p) {
          if (p * sgn > 0) { var t = p * sgn; if ((sl[t] & need) || (dist === 1 && (st[t] & need))) return true; }
          break;
        }
        r += dr; c += dc; dist++;
      }
    }
    // Springer: Sente-Springer springt r-2, also steht er bei r0+2
    var kr = r0 + 2 * sgn;
    if (kr >= 0 && kr < 9) {
      if (c0 > 0 && b[kr * 9 + c0 - 1] === N * sgn) return true;
      if (c0 < 8 && b[kr * 9 + c0 + 1] === N * sgn) return true;
    }
    return false;
  }
  function inCheck(s, col) { var k = s.king[col]; return k >= 0 && isAttacked(s, k, 1 - col); }

  // ---------- Züge ----------
  function inZone(col, r) { return col === 0 ? r <= 2 : r >= 6; }
  function mustPromote(col, t, r) {
    if (t === P || t === L) return col === 0 ? r === 0 : r === 8;
    if (t === N) return col === 0 ? r <= 1 : r >= 7;
    return false;
  }
  function pushPiece(s, col, t, from, to, out, smart) {
    var rf = (from / 9) | 0, rt = (to / 9) | 0;
    if (PROMOTE[t] && (inZone(col, rf) || inZone(col, rt))) {
      out.push(from | (to << 7) | (1 << 14));
      // "smart": unbeförderter P/B/R in der Zone ist praktisch nie besser (Engine-Trick)
      if (!mustPromote(col, t, rt) && !(smart && (t === P || t === B || t === R))) out.push(from | (to << 7));
    } else out.push(from | (to << 7));
  }
  function genPseudo(s, out, smart, capturesOnly) {
    var b = s.board, col = s.turn, sgn = col === 0 ? 1 : -1, st = STEP[col], sl = SLIDE[col];
    for (var q = 0; q < 81; q++) {
      var p = b[q] * sgn; if (p <= 0) continue;
      var r0 = (q / 9) | 0, c0 = q % 9;
      if (p === N) {
        var nr = r0 - 2 * sgn;
        if (nr >= 0 && nr < 9) for (var dc = -1; dc <= 1; dc += 2) {
          var nc = c0 + dc; if (nc < 0 || nc > 8) continue;
          var tq = nr * 9 + nc, tp = b[tq] * sgn;
          if (tp > 0 || (capturesOnly && !tp)) continue;
          pushPiece(s, col, p, q, tq, out, smart);
        }
        continue;
      }
      var stm = st[p], slm = sl[p];
      for (var d = 0; d < 8; d++) {
        var bit = 1 << d; if (!((stm | slm) & bit)) continue;
        var dr = DIRS[d][0], dcc = DIRS[d][1], r = r0 + dr, c = c0 + dcc;
        while (r >= 0 && r < 9 && c >= 0 && c < 9) {
          var t2 = r * 9 + c, x = b[t2] * sgn;
          if (x > 0) break;
          if (!capturesOnly || x < 0) pushPiece(s, col, p, q, t2, out, smart);
          if (x < 0 || !(slm & bit)) break;
          r += dr; c += dcc;
        }
      }
    }
    if (capturesOnly) return out;
    var hand = s.hands[col], pawnCols = 0;
    if (hand[P]) for (q = 0; q < 81; q++) if (b[q] === P * sgn) pawnCols |= 1 << (q % 9);
    for (var t = 1; t < 8; t++) {
      if (!hand[t]) continue;
      for (q = 0; q < 81; q++) {
        if (b[q]) continue;
        var rr = (q / 9) | 0;
        if (mustPromote(col, t, rr)) continue;
        if (t === P && (pawnCols & (1 << (q % 9)))) continue;
        out.push((81 + t) | (q << 7));
      }
    }
    return out;
  }
  function make(s, m) {
    var from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 1, b = s.board, col = s.turn, sgn = col === 0 ? 1 : -1;
    var u = { m: m, cap: b[to], h1: s.h1, h2: s.h2, k0: s.king[0], k1: s.king[1] };
    var h1 = s.h1, h2 = s.h2, cap = b[to];
    if (cap) {
      h1 ^= ZB1[to * 29 + pidx(cap)]; h2 ^= ZB2[to * 29 + pidx(cap)];
      var bt = BASE[Math.abs(cap)], hn = s.hands[col][bt];
      if (hn) { h1 ^= ZH1[hidx(col, bt, hn)]; h2 ^= ZH2[hidx(col, bt, hn)]; }
      s.hands[col][bt] = hn + 1; h1 ^= ZH1[hidx(col, bt, hn + 1)]; h2 ^= ZH2[hidx(col, bt, hn + 1)];
      if (Math.abs(cap) === K) s.king[1 - col] = -1;
    }
    var np;
    if (from > 80) {
      var t = from - 81, n = s.hands[col][t];
      h1 ^= ZH1[hidx(col, t, n)]; h2 ^= ZH2[hidx(col, t, n)];
      s.hands[col][t] = n - 1; if (n - 1) { h1 ^= ZH1[hidx(col, t, n - 1)]; h2 ^= ZH2[hidx(col, t, n - 1)]; }
      np = t * sgn;
    } else {
      var p = b[from]; h1 ^= ZB1[from * 29 + pidx(p)]; h2 ^= ZB2[from * 29 + pidx(p)]; b[from] = 0;
      np = promo ? PROMOTE[Math.abs(p)] * sgn : p;
      if (Math.abs(p) === K) s.king[col] = to;
    }
    b[to] = np; h1 ^= ZB1[to * 29 + pidx(np)]; h2 ^= ZB2[to * 29 + pidx(np)];
    h1 ^= ZS1; h2 ^= ZS2;
    s.h1 = h1; s.h2 = h2; s.turn = 1 - col; s.ply++;
    return u;
  }
  function unmake(s, u) {
    var m = u.m, from = m & 127, to = (m >> 7) & 127, b = s.board;
    s.turn = 1 - s.turn; s.ply--;
    var col = s.turn, sgn = col === 0 ? 1 : -1;
    if (from > 80) s.hands[col][from - 81]++;
    else { var p = b[to]; b[from] = ((m >> 14) & 1) ? BASE[Math.abs(p)] * sgn : p; }
    b[to] = u.cap;
    if (u.cap) s.hands[col][BASE[Math.abs(u.cap)]]--;
    s.h1 = u.h1; s.h2 = u.h2; s.king[0] = u.k0; s.king[1] = u.k1;
  }
  // Bauern-Drop-Matt (uchifuzume) ist verboten
  function isPawnDropMate(s, m) {
    var from = m & 127; if (from !== 81 + P) return false;
    var to = (m >> 7) & 127, col = s.turn, ek = s.king[1 - col];
    if (ek < 0) return false;
    var front = col === 0 ? to - 9 : to + 9;
    if (front !== ek) return false;
    var u = make(s, m), mate = !hasLegal(s);
    unmake(s, u);
    return mate;
  }
  function legalAfter(s, m) { // s ist schon nach make(m); prüft ob der Ziehende (1-turn) sicher steht
    return !inCheck(s, 1 - s.turn);
  }
  function hasLegal(s) {
    var list = genPseudo(s, [], false, false);
    for (var i = 0; i < list.length; i++) {
      var u = make(s, list[i]), ok = legalAfter(s); unmake(s, u);
      if (ok) return true;
    }
    return false;
  }
  function legalMoves(s, smart) {
    var list = genPseudo(s, [], smart, false), out = [];
    for (var i = 0; i < list.length; i++) {
      var m = list[i], u = make(s, m), ok = legalAfter(s); unmake(s, u);
      if (ok && !isPawnDropMate(s, m)) out.push(m);
    }
    return out;
  }

  // ---------- Spielebene ----------
  function play(s, m) { // macht Zug inkl. Historie & Notation
    var txt = moveToStr(s, m);
    var u = make(s, m);
    s.moves.push({ m: m, txt: txt, cap: u.cap });
    s.stack.push(u);
    s.hist.push(key(s)); s.checks.push(inCheck(s, s.turn));
    return u;
  }
  function undo(s) {
    var u = s.stack.pop(); if (!u) return false;
    unmake(s, u); s.moves.pop(); s.hist.pop(); s.checks.pop();
    return true;
  }
  function passTurn(s) { s.turn = 1 - s.turn; s.h1 ^= ZS1; s.h2 ^= ZS2; }
  function status(s) {
    if (s.king[s.turn] < 0 && s.king[1 - s.turn] >= 0) return { over: true, winner: 1 - s.turn, reason: 'king' };
    if (!hasLegal(s)) return { over: true, winner: 1 - s.turn, reason: inCheck(s, s.turn) ? 'mate' : 'nomoves' };
    var k = s.hist[s.hist.length - 1], cnt = 0;
    for (var i = s.hist.length - 1; i >= 0; i -= 2) if (s.hist[i] === k) cnt++;
    if (cnt >= 4) {
      // Dauerschach: wer die ganze Zeit Schach gegeben hat, verliert
      var first = -1; for (i = 0; i < s.hist.length; i++) if (s.hist[i] === k) { first = i; break; }
      for (var side = 0; side < 2; side++) {
        var all = true, any = false;
        for (i = first + 1; i < s.hist.length; i++) { var mover = (s.turn + (s.hist.length - 1 - i)) % 2 === 0 ? 1 - s.turn : s.turn; if (mover === side) { any = true; if (!s.checks[i]) { all = false; break; } } }
        if (any && all) return { over: true, winner: 1 - side, reason: 'perpetual' };
      }
      return { over: true, winner: -1, reason: 'repetition' };
    }
    return { over: false, check: inCheck(s, s.turn) };
  }
  function sqName(q) { return (9 - q % 9) + 'abcdefghi'[(q / 9) | 0]; }
  function moveToStr(s, m) {
    var from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 1;
    if (from > 80) return LETTERS[from - 81] + '*' + sqName(to);
    var p = Math.abs(s.board[from]), cap = s.board[to];
    var str = LETTERS[p] + (cap ? 'x' : '-') + sqName(to);
    if (promo) str += '+';
    else if (PROMOTE[p] && (inZone(s.turn, (from / 9) | 0) || inZone(s.turn, (to / 9) | 0))) str += '=';
    return str;
  }
  function mv(from, to, promo) { return from | (to << 7) | (promo ? 1 << 14 : 0); }
  function drop(t, to) { return (81 + t) | (to << 7); }
  function decode(m) { var f = m & 127; return { from: f > 80 ? -1 : f, drop: f > 80 ? f - 81 : 0, to: (m >> 7) & 127, promo: !!((m >> 14) & 1) }; }

  // Wie oft greift Seite col jedes Feld an (für Gefahren-Ansicht)
  function attackMap(s, col) {
    var map = new Int8Array(81), save = s.turn;
    s.turn = col;
    var list = genPseudo(s, [], false, false);
    s.turn = save;
    // genPseudo liefert nur Ziele ohne eigene Figuren; für Deckung prüfen wir eigene Felder separat
    var seen = {};
    for (var i = 0; i < list.length; i++) { var f = list[i] & 127; if (f > 80) continue; var t = (list[i] >> 7) & 127, k2 = f * 81 + t; if (seen[k2]) continue; seen[k2] = 1; map[t]++; }
    for (var q = 0; q < 81; q++) {
      var p = s.board[q]; if (!p || (p > 0 ? 0 : 1) !== col) continue;
      // Deckung: Figur kurz entfernen und prüfen, ob col das Feld angreift
      s.board[q] = -p; if (isAttacked(s, q, col)) map[q]++; s.board[q] = p;
    }
    return map;
  }
  // Mattsuche: Angreifer gibt nur Schach (Tsume-Regel). plies ungerade (1,3,5)
  function findMate(s, plies) {
    var atk = s.turn;
    function att(depth) {
      var moves = legalMoves(s, false);
      for (var i = 0; i < moves.length; i++) {
        var u = make(s, moves[i]);
        if (inCheck(s, s.turn)) {
          var ok = depth <= 1 ? !hasLegal(s) : def(depth - 1);
          if (ok) { unmake(s, u); return moves[i]; }
        }
        unmake(s, u);
      }
      return 0;
    }
    function def(depth) {
      var moves = legalMoves(s, false);
      if (!moves.length) return true;
      for (var i = 0; i < moves.length; i++) {
        var u = make(s, moves[i]); var r = att(depth - 1); unmake(s, u);
        if (!r) return false;
      }
      return true;
    }
    return s.turn === atk ? att(plies) : 0;
  }

  return {
    P: P, L: L, N: N, S: S, G: G, B: B, R: R, K: K, PP: PP, PL: PL, PN: PN, PS: PS, PB: PB, PR: PR,
    PROMOTE: PROMOTE, BASE: BASE, LETTERS: LETTERS, VALUE: VALUE, STEP: STEP, SLIDE: SLIDE, DIRS: DIRS, START: START,
    fromSFEN: fromSFEN, toSFEN: toSFEN, clone: clone, key: key, rehash: rehash,
    isAttacked: isAttacked, inCheck: inCheck, inZone: inZone, mustPromote: mustPromote,
    genPseudo: genPseudo, make: make, unmake: unmake, legalMoves: legalMoves, hasLegal: hasLegal, isPawnDropMate: isPawnDropMate,
    play: play, undo: undo, passTurn: passTurn, status: status, moveToStr: moveToStr, sqName: sqName,
    mv: mv, drop: drop, decode: decode, attackMap: attackMap, findMate: findMate
  };
}
var Shogi = ShogiCoreFactory();
if (typeof module !== 'undefined') module.exports = { Shogi: Shogi, ShogiCoreFactory: ShogiCoreFactory };
