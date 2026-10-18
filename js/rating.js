// Wertung: Glicko-1, echte Kyū/Dan-Skala (Lishogi), Vorgabe-Elo (Kaufman), Schach-Vergleich (Schätzung).
// Quellen und Herleitung: ../recherche-wertung.md
var Rating = (function () {
  var Q = Math.LN10 / 400;
  function g(rd) { return 1 / Math.sqrt(1 + 3 * Q * Q * rd * rd / (Math.PI * Math.PI)); }
  function expect(r, rj, rdj) { return 1 / (1 + Math.pow(10, -g(rdj) * (r - rj) / 400)); }
  // Ein Ergebnis (s: 1 Sieg, 0.5 remis, 0 verloren) gegen Gegner rj ± rdj
  function update(me, rj, rdj, s) {
    var gg = g(rdj), E = expect(me.r, rj, rdj), d2 = 1 / (Q * Q * gg * gg * E * (1 - E));
    var den = 1 / (me.rd * me.rd) + 1 / d2;
    return { r: Math.round(me.r + Q / den * gg * (s - E)), rd: Math.max(50, Math.round(Math.sqrt(1 / den))) };
  }
  // Unsicherheit wächst, wenn man länger nicht spielt (ca. +15 pro Woche)
  function age(me, now) {
    if (!me.t) return me; var weeks = (now - me.t) / 6048e5; if (weeks < 1) return me;
    return { r: me.r, rd: Math.min(350, Math.round(Math.sqrt(me.rd * me.rd + 225 * weeks))), t: me.t, n: me.n, hist: me.hist, shown: me.shown };
  }
  // Lishogi-Ränge (lishogi.org/rating-ranks): Untergrenze je Rang
  var RANKS = [
    ['15 Kyū', 0], ['14 Kyū', 475], ['13 Kyū', 550], ['12 Kyū', 625], ['11 Kyū', 700], ['10 Kyū', 775], ['9 Kyū', 850], ['8 Kyū', 925],
    ['7 Kyū', 1000], ['6 Kyū', 1075], ['5 Kyū', 1150], ['4 Kyū', 1225], ['3 Kyū', 1300], ['2 Kyū', 1375], ['1 Kyū', 1450],
    ['1 Dan', 1550], ['2 Dan', 1650], ['3 Dan', 1750], ['4 Dan', 1850], ['5 Dan', 1975], ['6 Dan', 2125], ['7 Dan', 2275], ['8 Dan', 2500]
  ];
  function rankIdx(r) { var i = 0; while (i < RANKS.length - 1 && r >= RANKS[i + 1][1]) i++; return i; }
  // Mit Hysterese: Aufstieg an der Schwelle, Abstieg erst 40 Punkte darunter
  function shownRank(r, prev) {
    var i = rankIdx(r);
    if (prev != null && i < prev && r >= RANKS[prev][1] - 40) return prev;
    return i;
  }
  function rankName(i) { return RANKS[i][0]; }
  function kanji(name) { return name.replace(' Kyū', '級').replace(' Dan', '段'); }
  function nextInfo(r) { var i = rankIdx(r); if (i >= RANKS.length - 1) return null; return { name: RANKS[i + 1][0], need: RANKS[i + 1][1] - r, pct: Math.round((r - RANKS[i][1]) / (RANKS[i + 1][1] - RANKS[i][1]) * 100) }; }

  // Vorgabe-Werte in Elo (Kaufman, statistisch). 8/10/nackt extrapoliert.
  var HC_ELO = { none: 0, lance: 75, bishop: 225, rook: 300, rooklance: 400, two: 600, four: 750, six: 1200, eight: 1400, ten: 1600, naked: 1900 };
  // Anfänger können Vorgaben schlechter ausnutzen: Wirkung skaliert mit der Stärke des Gebers
  function hcEffect(baseR, hc) { return Math.round((HC_ELO[hc] || 0) * Math.min(1, Math.max(0.25, baseR / 2000))); }
  function effective(baseR, hc) { return Math.max(100, baseR - hcEffect(baseR, hc)); }
  // Passende Vorgabe für eine Wertungsdifferenz (Stärkerer gibt vor)
  function suggestHC(diff) {
    var order = ['none', 'lance', 'bishop', 'rook', 'rooklance', 'two', 'four', 'six'], best = 'none';
    order.forEach(function (k) { if (HC_ELO[k] <= diff + 40) best = k; });
    return best;
  }

  // Schach-Plattformen → Lichess Blitz (ChessGoals-Tabelle, Juli 2026)
  var CHESS = {
    ccBlitz: [[800, 1290], [1000, 1425], [1200, 1555], [1400, 1685], [1600, 1820], [1800, 1950], [2000, 2080], [2200, 2210], [2450, 2450]],
    ccRapid: [[1085, 1290], [1255, 1425], [1420, 1555], [1580, 1685], [1730, 1820], [1870, 1950], [1995, 2080], [2110, 2210], [2300, 2400]],
    liBlitz: [[0, 0], [3000, 3000]],
    liRapid: [[1490, 1290], [1615, 1425], [1740, 1555], [1850, 1685], [1960, 1820], [2065, 1950], [2165, 2080], [2260, 2210]],
    fide: [[1150, 1290], [1285, 1425], [1415, 1555], [1540, 1685], [1655, 1820], [1775, 1950], [1890, 2080], [2010, 2210], [2250, 2450]]
  };
  var PLATFORMS = { ccBlitz: 'Chess.com Blitz', ccRapid: 'Chess.com Rapid', liBlitz: 'Lichess Blitz', liRapid: 'Lichess Rapid', fide: 'FIDE' };
  // Lichess Blitz → Lishogi bei gleichem Prozentrang (SCHÄTZUNG aus Verteilungen)
  var PCT = [[900, 700, 3], [1150, 1170, 15], [1350, 1310, 30], [1500, 1450, 45], [1750, 1620, 65], [1850, 1710, 75], [2000, 1840, 87], [2150, 1960, 93], [2250, 2040, 96], [2450, 2180, 99]];
  function interp(tab, x, a, b) {
    if (a == null) a = 0; if (b == null) b = 1;
    if (x <= tab[0][a]) return tab[0][b] + (x - tab[0][a]) * (tab.length > 1 ? (tab[1][b] - tab[0][b]) / (tab[1][a] - tab[0][a]) : 1);
    for (var i = 1; i < tab.length; i++) if (x <= tab[i][a]) { var t = (x - tab[i - 1][a]) / (tab[i][a] - tab[i - 1][a]); return tab[i - 1][b] + t * (tab[i][b] - tab[i - 1][b]); }
    var n = tab.length - 1; return tab[n][b] + (x - tab[n][a]) * (tab[n][b] - tab[n - 1][b]) / (tab[n][a] - tab[n - 1][a]);
  }
  function chessToShogi(platform, val) {
    var li = interp(CHESS[platform], val, 0, 1);
    var sh = Math.round(interp(PCT, li, 0, 1)), pct = Math.round(Math.max(1, Math.min(99.5, interp(PCT, li, 0, 2))));
    return { lichess: Math.round(li), shogi: sh, rank: rankName(rankIdx(sh)), pct: pct };
  }
  function shogiToChess(r) {
    var li = interp(PCT, r, 1, 0), out = {};
    Object.keys(CHESS).forEach(function (k) { out[k] = Math.max(100, Math.round(interp(CHESS[k], li, 1, 0))); });
    out.low = li < 1150; // unterhalb der Tabelle: nur grobe Aussage
    return out;
  }
  // Startwerte nach Selbsteinschätzung
  var START = { never: 450, rules: 700, chess: 950 };
  return { update: update, age: age, expect: expect, RANKS: RANKS, rankIdx: rankIdx, shownRank: shownRank, rankName: rankName, kanji: kanji, nextInfo: nextInfo,
    HC_ELO: HC_ELO, hcEffect: hcEffect, effective: effective, suggestHC: suggestHC, PLATFORMS: PLATFORMS, chessToShogi: chessToShogi, shogiToChess: shogiToChess, START: START };
})();
if (typeof module !== 'undefined') module.exports = Rating;
