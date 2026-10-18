// KI: Alpha-Beta (PVS) mit Iterativer Vertiefung, TT, Killer/History, Quiescence.
// Persönlichkeit über opts.style (z. B. "Schachspieler" der Handfiguren unterschätzt und keine Burg baut).
function ShogiAIFactory(Shogi) {
  'use strict';
  var K = 8, P = 1, G = 5, S = 4;
  var VAL = [0, 90, 230, 260, 370, 450, 570, 650, 0, 530, 490, 510, 500, 830, 950];
  var HAND = [0, 105, 260, 290, 410, 490, 650, 740];
  var ATK = [0, 2, 3, 6, 8, 8, 6, 9, 0, 8, 8, 8, 8, 12, 14];
  var MATE = 30000, INF = 32000;
  var DIST = new Int8Array(81 * 81);
  for (var a = 0; a < 81; a++) for (var b = 0; b < 81; b++) DIST[a * 81 + b] = Math.max(Math.abs(((a / 9) | 0) - ((b / 9) | 0)), Math.abs(a % 9 - b % 9));
  var TTS = 1 << 19, TTM = TTS - 1;
  var ttKey = new Int32Array(TTS), ttMove = new Int32Array(TTS), ttScore = new Int32Array(TTS), ttDepth = new Int8Array(TTS), ttFlag = new Int8Array(TTS);
  var hist = new Int32Array(128 * 81);
  var style = {};

  function evaluate(s) {
    var sc = 0, bd = s.board, kingW = style.kingSafety == null ? 1 : style.kingSafety, handF = style.handFactor == null ? 1 : style.handFactor;
    for (var q = 0; q < 81; q++) {
      var p = bd[q]; if (!p) continue;
      var t = p > 0 ? p : -p, col = p > 0 ? 0 : 1, v = VAL[t];
      if (t !== K) {
        var k = s.king[col], ek = s.king[1 - col];
        if (k >= 0 && (t === G || t === S || (t >= 9 && t <= 12))) { var d = DIST[k * 81 + q]; if (d === 1) v += 28 * kingW; else if (d === 2) v += 10 * kingW; }
        if (ek >= 0) { var d2 = DIST[ek * 81 + q]; if (d2 <= 2) v += ATK[t] * (3 - d2) * 3; }
        if (t === P) { var r = (q / 9) | 0; v += (col === 0 ? 6 - r : r - 2) * 2; }
      } else {
        // König im Zentrum / weit vorne ist gefährlich
        var kr = (q / 9) | 0, kc = q % 9, adv = col === 0 ? 8 - kr : kr;
        v -= adv * 12 * kingW; if (kc >= 3 && kc <= 5) v -= 15 * kingW;
      }
      sc += col === 0 ? v : -v;
    }
    for (var c = 0; c < 2; c++) {
      var hs = 0, h = s.hands[c];
      for (var tt = 1; tt < 8; tt++) if (h[tt]) hs += HAND[tt] * h[tt] * handF + (h[tt] > 1 ? -10 * (h[tt] - 1) : 0);
      // Handfiguren gegen einen offenen König sind gefährlich
      var ek2 = s.king[1 - c];
      if (ek2 >= 0) {
        var empt = 0, er = (ek2 / 9) | 0, ec = ek2 % 9;
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) { var rr = er + dr, cc = ec + dc; if (rr >= 0 && rr < 9 && cc >= 0 && cc < 9 && !bd[rr * 9 + cc]) empt++; }
        var cnt = 0; for (tt = 1; tt < 8; tt++) cnt += h[tt];
        hs += Math.min(cnt, 5) * empt * 4;
      }
      sc += c === 0 ? hs : -hs;
    }
    return s.turn === 0 ? sc : -sc;
  }

  var nodes, deadline, stopped, killers, path, rootBest;
  function timeUp() { if ((++nodes & 2047) === 0 && Date.now() > deadline) stopped = true; return stopped; }

  function orderMoves(s, moves, ttm, ply) {
    var sc = new Array(moves.length), bd = s.board;
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i], from = m & 127, to = (m >> 7) & 127, x = 0;
      if (m === ttm) x = 1e9;
      else {
        var cap = bd[to];
        if (cap) x = 1e6 + VAL[cap > 0 ? cap : -cap] * 10 - (from < 81 ? VAL[Math.abs(bd[from])] : 50);
        if ((m >> 14) & 1) x += 5e5;
        if (!x) { if (killers[ply * 2] === m) x = 4e5; else if (killers[ply * 2 + 1] === m) x = 3e5; else x = hist[(from) * 81 + to]; }
      }
      sc[i] = x;
    }
    // Insertion sort (Listen sind klein genug)
    for (i = 1; i < moves.length; i++) {
      var mv = moves[i], v = sc[i], j = i - 1;
      while (j >= 0 && sc[j] < v) { moves[j + 1] = moves[j]; sc[j + 1] = sc[j]; j--; }
      moves[j + 1] = mv; sc[j + 1] = v;
    }
  }

  function qsearch(s, alpha, beta, ply) {
    if (timeUp()) return 0;
    var chk = Shogi.inCheck(s, s.turn);
    if (!chk) {
      var stand = evaluate(s);
      if (stand >= beta || ply > 30) return stand;
      if (stand > alpha) alpha = stand;
    }
    var moves = Shogi.genPseudo(s, [], true, !chk), legal = 0;
    orderMoves(s, moves, 0, Math.min(ply, 63));
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      if (!chk) { var cap = s.board[(m >> 7) & 127]; if (stand + VAL[cap > 0 ? cap : -cap] + 250 < alpha && !((m >> 14) & 1)) continue; }
      if ((m & 127) === 82 && Shogi.isPawnDropMate(s, m)) continue;
      var u = Shogi.make(s, m);
      if (Shogi.inCheck(s, 1 - s.turn)) { Shogi.unmake(s, u); continue; }
      legal++;
      var v = -qsearch(s, -beta, -alpha, ply + 1);
      Shogi.unmake(s, u);
      if (stopped) return 0;
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    if (chk && !legal) return -MATE + ply;
    return alpha;
  }

  function negamax(s, depth, alpha, beta, ply, ext) {
    if (timeUp()) return 0;
    var chk = Shogi.inCheck(s, s.turn);
    if (depth <= 0 && !chk) return qsearch(s, alpha, beta, ply);
    if (ply > 0) {
      var k = s.h1;
      for (var i = path.length - 2; i >= 0; i -= 2) if (path[i] === k) return 0;
    }
    var idx = s.h1 & TTM, ttm = 0;
    if (ttKey[idx] === s.h2) {
      ttm = ttMove[idx];
      if (ply > 0 && ttDepth[idx] >= depth) {
        var ts = ttScore[idx], f = ttFlag[idx];
        if (f === 0 || (f === 1 && ts >= beta) || (f === 2 && ts <= alpha)) return ts;
      }
    }
    var moves = Shogi.genPseudo(s, [], true, false);
    orderMoves(s, moves, ttm, Math.min(ply, 63));
    var best = -INF, bestM = 0, legal = 0, a0 = alpha;
    path.push(s.h1);
    for (i = 0; i < moves.length; i++) {
      var m = moves[i];
      if ((m & 127) === 82 && Shogi.isPawnDropMate(s, m)) continue;
      var u = Shogi.make(s, m);
      if (Shogi.inCheck(s, 1 - s.turn)) { Shogi.unmake(s, u); continue; }
      legal++;
      var gives = Shogi.inCheck(s, s.turn), e = (gives && ext < 6) ? 1 : 0, nd = depth - 1 + e, v;
      // Late move reduction für ruhige Züge
      var quiet = !u.cap && !((m >> 14) & 1) && !gives && !chk;
      if (legal === 1) v = -negamax(s, nd, -beta, -alpha, ply + 1, ext + e);
      else {
        var red = (quiet && depth >= 3 && legal > 4) ? 1 : 0;
        v = -negamax(s, nd - red, -alpha - 1, -alpha, ply + 1, ext + e);
        if (v > alpha && !stopped) v = -negamax(s, nd, -beta, -alpha, ply + 1, ext + e);
      }
      Shogi.unmake(s, u);
      if (stopped) { path.pop(); return 0; }
      if (v > best) { best = v; bestM = m; if (ply === 0) rootBest = { m: m, v: v }; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        if (quiet) { var kp = Math.min(ply, 63) * 2; if (killers[kp] !== m) { killers[kp + 1] = killers[kp]; killers[kp] = m; } hist[(m & 127) * 81 + ((m >> 7) & 127)] += depth * depth; }
        break;
      }
    }
    path.pop();
    if (!legal) return -MATE + ply;
    ttKey[idx] = s.h2; ttMove[idx] = bestM; ttScore[idx] = best; ttDepth[idx] = depth;
    ttFlag[idx] = best >= beta ? 1 : (best <= a0 ? 2 : 0);
    return best;
  }

  function pv(s, first, n) {
    var out = [], us = [], m = first;
    for (var i = 0; i < n && m; i++) {
      var legal = Shogi.legalMoves(s, false);
      if (legal.indexOf(m) < 0) break;
      out.push(m); us.push(Shogi.make(s, m));
      var idx = s.h1 & TTM; m = ttKey[idx] === s.h2 ? ttMove[idx] : 0;
    }
    while (us.length) Shogi.unmake(s, us.pop());
    return out;
  }

  // opts: {time ms, depth, noise cp, style}
  function search(s, opts) {
    opts = opts || {};
    style = opts.style || {};
    nodes = 0; stopped = false; killers = new Int32Array(128); path = [];
    for (var i = 0; i < hist.length; i++) hist[i] >>= 2;
    deadline = Date.now() + (opts.time || 1000);
    var maxD = opts.depth || 64, legal = Shogi.legalMoves(s, true);
    if (!legal.length) return { move: 0, score: -MATE, depth: 0, pv: [] };
    // schwache Stufen: jeder Wurzelzug voll bewertet, dann zufällig unter den "guten genug"
    if (opts.noise) {
      var d = Math.min(maxD, 3), scored = [];
      deadline = Date.now() + (opts.time || 4000);
      for (i = 0; i < legal.length; i++) {
        var u = Shogi.make(s, legal[i]); path = [s.h1];
        var v = -negamax(s, d - 1, -INF, INF, 1, 0); Shogi.unmake(s, u);
        scored.push({ m: legal[i], v: v });
      }
      scored.sort(function (x, y) { return y.v - x.v; });
      var top = scored[0].v, pool = scored.filter(function (x) { return x.v >= top - opts.noise && x.v > -MATE + 100; });
      if (!pool.length) pool = [scored[0]];
      var pick = pool[Math.floor(Math.random() * pool.length)];
      return { move: pick.m, score: pick.v, best: scored[0].m, bestScore: top, second: scored.length > 1 ? scored[1].v : -INF, depth: d, nodes: nodes, pv: [pick.m] };
    }
    var res = { move: legal[0], score: 0, depth: 0 };
    for (d = 1; d <= maxD; d++) {
      rootBest = null;
      var sc = negamax(s, d, -INF, INF, 0, 0);
      if (stopped) { if (rootBest && d > 1 && rootBest.v > res.score - 50) { res.move = rootBest.m; } break; }
      var idx = s.h1 & TTM;
      if (ttKey[idx] === s.h2 && ttMove[idx]) res.move = ttMove[idx];
      res.score = sc; res.depth = d;
      if (Math.abs(sc) > MATE - 200) break;
      if (Date.now() > deadline - (opts.time || 1000) * 0.45 && d >= 2) break;
    }
    if (legal.indexOf(res.move) < 0) res.move = legal[0];
    res.nodes = nodes; res.pv = pv(s, res.move, 8);
    return res;
  }

  return { search: search, evaluate: evaluate, MATE: MATE, VAL: VAL };
}

// ---------- Hauptthread: Worker-Wrapper ----------
if (typeof window !== 'undefined') {
  window.ShogiAI = ShogiAIFactory(Shogi);
  window.Engine = (function () {
    function makeWorker() {
      try {
        var src = ShogiCoreFactory.toString() + '\n' + ShogiAIFactory.toString() +
          '\nvar Shogi=ShogiCoreFactory();var AI=ShogiAIFactory(Shogi);' +
          'onmessage=function(e){var d=e.data;var s=Shogi.fromSFEN(d.sfen);var r=AI.search(s,d.opts);postMessage({id:d.id,res:r});};';
        return new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      } catch (e) { return null; }
    }
    // Ein Kanal = ein Worker. "ai" für den Gegner, "coach" für Analyse.
    function Channel() { this.w = makeWorker(); this.seq = 0; this.wait = {}; var self = this;
      if (this.w) this.w.onmessage = function (e) { var cb = self.wait[e.data.id]; delete self.wait[e.data.id]; if (cb) cb(e.data.res); };
    }
    Channel.prototype.think = function (state, opts) {
      var sfen = Shogi.toSFEN(state), self = this, id = ++this.seq;
      return new Promise(function (resolve) {
        if (!self.w) { setTimeout(function () { resolve(window.ShogiAI.search(Shogi.fromSFEN(sfen), opts)); }, 30); return; }
        self.wait[id] = resolve; self.w.postMessage({ id: id, sfen: sfen, opts: opts });
      });
    };
    Channel.prototype.cancel = function () {
      if (!this.w) return;
      this.w.terminate(); var pend = this.wait; this.wait = {};
      Object.keys(pend).forEach(function (k) { pend[k](null); });
      this.w = makeWorker(); var self = this;
      if (this.w) this.w.onmessage = function (e) { var cb = self.wait[e.data.id]; delete self.wait[e.data.id]; if (cb) cb(e.data.res); };
    };
    return { ai: new Channel(), coach: new Channel() };
  })();
}
if (typeof module !== 'undefined') module.exports = { ShogiAIFactory: ShogiAIFactory };
