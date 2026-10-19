// Schlachtfeld „Grenzland“ im Armee-Modus: Shogi als Übersicht eines großen Krieges zwischen zwei Ländern.
// Das Spielfeld ist echtes Gelände mit sanften Hügeln (Truppen steigen mit), das Raster liegt als Linie im Gelände-Shader.
// Drumherum: Dörfer an Straßen, Flusstal mit Brücke, Felswand mit Höhle, Wälder und Hügel, Burgen beider Seiten.
// Alles als Instanzen bzw. ein Mesh je Art (wenige Draw Calls), am Handy weniger Häuser und kleinere Texturen.
(function () {
  if (typeof Board3D === 'undefined') return;
  var T = THREE;
  function sm(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  Board3D.FIELD_MOODS.feldzug = {
    sky: 'sky_kloofendal_38d_partly_cloudy_puresky.webp', skyI: 0.95, exp: 1.02, sun: [0xffd8a8, 2.5, [-13, 11, 5]], hemi: [0xcfe0f0, 0x4a4430, 0.6],
    fog: [null, 0.0085], fogS: [0.72, 0.78, 0.86], hfog: [0.3, 0.025, 0.35], glow: [0xffd8b0, 0.3, 6], tint: [1, 1, 0.97], shape: 'feldzug', snow: 26,
    trees: [[0xe0e8d8, 0xd0dcc4], [0x5e8c3e, 0x6c9a44, 0x557f38, 0x7aa64e, 0x8aa848]], mist: { c: 0xeef2f4, o: 0.28, n: 8, r: [34, 70], h: 2 }, flowers: [0xffe27a, 0xffffff, 0xd8a0e0],
    // Burg Gote, Pagode, Torii, Tempel (Reihenfolge wie MOUNDS0)
    mounds: [[0, -37, 9, 4.2], [26, -30, 5, 2.4], [-28, 26, 6, 2.6], [3, 38, 8, 3.4], [-27, -27, 4.5, 2.6]]
  };
  // Dörfer [x, z, Radius, Häuser]: werden eingeebnet, Äcker im Ring darum
  Board3D.VILLAGES = [[0, -23, 3, 9], [-12, -24, 3.2, 9], [11, -19.5, 2.6, 7], [-26, -4, 3, 8], [23, 5, 3, 7], [-11, 21, 3, 8], [11, 22, 3, 8], [0, 29, 3.4, 10]];
  // Straßen als Polylinien (vom Feld in beide Länder und zu den Seiten)
  Board3D.ROADS = [[[0, -5], [0, -14], [0.5, -20], [0, -26], [0, -31]], [[0, 5], [0, 14], [-0.5, 22], [0, 31]],
    [[-4.8, 2.6], [-10, 2.5], [-19, 2], [-26, -2], [-32, -6]], [[4.8, -2.6], [10, -2.5], [17, 0.5], [23, 4], [30, 9]],
    [[0.5, -20], [-6, -22.5], [-12, -24]], [[0.5, -20], [6, -19], [11, -19.5], [14, -22]], [[-0.5, 22], [-6, 21.5], [-11, 21]], [[-0.5, 22], [6, 22.5], [11, 22]]];
  Board3D.TEMPLE = [-27, -27]; Board3D.MILL = -9; // Tempel im Wald (x, z), Mühle am Fluss (z)
  // Fluss im Tal links (Lauf x über z)
  Board3D.riverG = function (z) { return -17.5 + Math.sin(z * 0.08 + 0.5) * 2.4 + Math.sin(z * 0.21) * 0.7; };
  function segD(x, z, a, b) { var dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
  Board3D.roadD = function (x, z) { var d = 1e9; Board3D.ROADS.forEach(function (r) { for (var i = 1; i < r.length; i++) d = Math.min(d, segD(x, z, r[i - 1], r[i])); }); return d; };

  // Gelände: Hügel näher ans Feld, Flusstal, Felswand mit Höhle, Dörfer eingeebnet
  var H0 = Board3D.fieldH, villH = {};
  function rawH(x, z) {
    var h = H0(x, z), N = Board3D.noise, e = Board3D.fieldE(x, z);
    h += (N(x * 0.09 + 3, z * 0.09, 3) - 0.42) * 3 * sm(1.6, 9, e) * (1 - sm(30, 50, e));
    // Felswand hinten rechts: Hochfläche, steile Front zum Feld hin
    var fx = Math.max(Math.abs(x - 15) - 6, 0), cl = sm(-0.4, 1.2, -24 - z - fx * 0.4) * (1 - sm(0, 4, fx));
    h = Math.max(h, cl * (5 + (N(x * 0.3, z * 0.3, 3) - 0.5) * 1.6));
    var rd = Math.abs(x - Board3D.riverG(z)), carve = (1 - sm(1.4, 4.4, rd)) * (1 - sm(42, 54, Math.abs(z)));
    return h * (1 - carve) - carve * 1.1;
  }
  function baseH(x, z) {
    var h = rawH(x, z), e = Board3D.fieldE(x, z);
    // Reisterrassen am Westufer: jede Parzelle eben auf der Höhe ihrer Mitte, nach außen leicht ansteigend
    var tq = Board3D.terraceQ(x, z), tc = tq > 0 && Board3D.terrCell(x, z);
    if (tc) { var cz = Board3D.terrZ(tc[1], tc[0]), hq = Math.max(rawH(Board3D.riverG(cz) - 3.8 - (tc[0] + 0.5) * 1.5, cz), 0.05) + tc[0] * 0.14; h += (hq - h) * tq; }
    // Hohlwege: Straßen schneiden sich durch die Hügel
    if (e > 7 && h > 0.4) { var dr = Board3D.roadD(x, z); if (dr < 2.6) h -= (h - 0.4) * 0.6 * (1 - sm(0.9, 2.6, dr)); }
    return h;
  }
  // Terrassen-Parzelle: Band b (parallel zum Fluss, 1,5 m breit) und Abschnitt k (5,5 m lang, jedes zweite Band versetzt)
  Board3D.terrCell = function (x, z) { var wx = Board3D.riverG(z) - x - 3.8; if (wx < 0 || wx >= 9) return null; var b = Math.floor(wx / 1.5); return [b, Math.floor((z + 30) / 5.5 + (b % 2) * 0.5)]; };
  Board3D.terrZ = function (k, b) { return (k - (b % 2) * 0.5 + 0.5) * 5.5 - 30; }; // Mitte des Abschnitts
  Board3D.terraceQ = function (x, z) { var wx = Board3D.riverG(z) - x; return sm(3.6, 5, wx) * (1 - sm(11, 13.5, wx)) * (1 - sm(14, 19, Math.abs(z + 2))); };
  // Hügel auf dem Spielfeld [x, z, Radius, Höhe]: sanft genug, dass jedes Feld lesbar bleibt (max. ~0,6 = 4–5 m)
  // [x, z, Radius quer, Radius längs, Höhe]: lange Rücken in Blickrichtung der Spieler, Täler zwischen den Spalten. Hänge quer zur Kamera bleiben flach,
  // sonst verdeckt ein Hügel die Felder dahinter (Kamera ~20° über dem Boden: Hang > 0,35 versteckt Boden)
  Board3D.HILLS = [[-3.1, -2.2, 1.5, 3.2, 0.6], [3.2, 2.4, 1.5, 3.2, 0.6], [3.3, -3.2, 1.1, 2.2, 0.32], [-3.3, 3.1, 1.1, 2.2, 0.32], [0.2, -4.4, 1.6, 1.2, 0.18], [-0.2, 4.4, 1.6, 1.2, 0.18]];
  // Grenzbach quer durchs Tal zwischen den Anhöhen (Lauf z über x), Felsgrat mit Höhle an der linken Flanke (Gote-Seite)
  Board3D.streamZ = function (x) { return 0.35 * Math.sin(x * 0.7 + 1) + 0.15 * Math.sin(x * 1.9); };
  // Gelände-Raster: innen linear (PC 0,14 m, Handy 0,15 m bis x = 8 bzw. 6,75), außen wachsend bis 150 m
  Board3D.fieldWarp = function (shape, mob) {
    if (shape !== 'feldzug') return null;
    var S = mob ? 200 : 280, L = mob ? 15 : 20, u0 = mob ? 0.45 : 0.4, K = (150 - L) / Math.pow(1 - u0, 2.5);
    return { S: S, f: function (u) { var a = Math.abs(u); return Math.sign(u) * (L * a + (a > u0 ? K * Math.pow(a - u0, 2.5) : 0)); } };
  };
  Board3D.streamW = function (x) { return 1 - sm(7.5, 9.5, Math.abs(x)); };
  Board3D.ridgeX = function (z) { return -5.6 - 0.3 * Math.sin(z * 0.8); };
  Board3D.ridgeH = function (x, z) { return 2.2 * sm(0, 1.1, Board3D.ridgeX(z) - x) * (1 - sm(1.6, 2.5, Math.abs(z + 2.7))) * (1 - sm(9, 13, -x)); };
  function hillS(x, z) {
    var h = 0; Board3D.HILLS.forEach(function (q) { var dx = (x - q[0]) / q[2], dz = (z - q[1]) / q[3]; h += q[4] * Math.exp(-(dx * dx + dz * dz) * 1.4); });
    h += (Board3D.noise(x * 0.21 + 7, z * 0.21 - 2, 2) - 0.45) * 0.16;
    h *= 0.35 + 0.65 * sm(0.3, 2.6, Math.abs(z - Board3D.streamZ(x))); // Tal am Bach
    return Math.max(0, h) * (1 - sm(4.5, 11, Board3D.fieldE(x, z)));
  }
  // Im Spielfeld Plateau je Feld: Mitte eben (Regiment steht gerade), Hang nur im Randstreifen an den Rasterlinien
  var cellH = null;
  Board3D.fieldHill = function (x, z) {
    if (!cellH) { cellH = []; for (var j = -1; j <= 9; j++) for (var i = -1; i <= 9; i++) cellH.push(hillS(i - 4, j - 4)); }
    var ex = Math.max(Math.abs(x), Math.abs(z)), hs = hillS(x, z); if (ex > 5.6) return hs;
    var ci = Math.max(-1, Math.min(9, Math.round(x + 4))), cj = Math.max(-1, Math.min(9, Math.round(z + 4))), ux = x + 4 - ci, uz = z + 4 - cj;
    var ni = Math.max(-1, Math.min(9, ci + (ux < 0 ? -1 : 1))), nj = Math.max(-1, Math.min(9, cj + (uz < 0 ? -1 : 1)));
    var wx = sm(0.25, 0.5, Math.abs(ux)) * 0.5, wz = sm(0.25, 0.5, Math.abs(uz)) * 0.5, C = function (i, j) { return cellH[(j + 1) * 11 + i + 1]; };
    var hp = (C(ci, cj) * (1 - wx) + C(ni, cj) * wx) * (1 - wz) + (C(ci, nj) * (1 - wx) + C(ni, nj) * wx) * wz;
    return hp + (hs - hp) * sm(4.6, 5.6, ex);
  };
  Board3D.fieldH = function (x, z) {
    if (Board3D.FIELD_SHAPE !== 'feldzug') return H0(x, z);
    var h = baseH(x, z) + Board3D.fieldHill(x, z);
    Board3D.VILLAGES.forEach(function (v, i) { var d = Math.hypot(x - v[0], z - v[1]); if (d > v[2] + 6) return; var hc = villH[i] != null ? villH[i] : (villH[i] = baseH(v[0], v[1])); h += (hc - h) * (1 - sm(v[2] + 2.5, v[2] + 6, d)); });
    if (x < -4.5 && x > -14 && z > -6 && z < 0.5) h += Board3D.ridgeH(x, z) * (0.85 + Board3D.noise(x * 0.7, z * 0.7, 2) * 0.3);
    if (Math.abs(x) < 9.5) h -= 0.2 * Board3D.streamW(x) * (1 - sm(0.16, 0.62, Math.abs(z - Board3D.streamZ(x))));
    return h;
  };

  var mood0 = Board3D.prototype.buildMood;
  Board3D.prototype.buildMood = function (hi) {
    mood0.call(this, hi);
    if (this.mood && this.mood.shape === 'feldzug') this.buildFeldzug(hi);
  };

  Board3D.prototype.buildFeldzug = function (hi) {
    var self = this, scene = this.scene, Y = this.BT, H = Board3D.fieldH, N = Board3D.noise, mob = this.mobile, rnd = Board3D.rnd(23), V = Board3D.VILLAGES, RX = Board3D.riverG;
    // Grundfarben (sRGB) je Nutzung und Musterfarbe der Reihen
    var CROP = [null, { b: [150, 120, 58], r: [186, 156, 88] }, { b: [64, 98, 84], r: [88, 132, 60] }, { b: [90, 70, 48], r: [76, 106, 50] }, { b: [116, 94, 68], r: [98, 78, 56] }];
    function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
    // ein Acker als gedrehtes Rechteck mit Reihen und Körnung (cx, cy Mitte in Pixeln, w/h Größe, ang Winkel)
    function plot(g, k, cx, cy, w, h, ang, rows, a) {
      var C = CROP[k], j; g.save(); g.translate(cx, cy); g.rotate(ang); g.globalAlpha = a;
      g.fillStyle = rgba(C.b, 1); g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle = rgba(C.r, k === 1 ? 0.55 : 0.85);
      for (j = 0; j < rows; j++) { var o = -h / 2 + (j + 0.5) / rows * h; g.fillRect(-w / 2, o - h / rows * 0.2, w, h / rows * 0.4); }
      for (j = 0; j < w * h / 60; j++) { var v = Math.random(); g.fillStyle = v < 0.5 ? 'rgba(0,0,0,' + v * 0.16 + ')' : 'rgba(255,240,200,' + (v - 0.5) * 0.14 + ')'; g.fillRect(-w / 2 + Math.random() * w, -h / 2 + Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3); }
      g.restore();
    }

    // ---- Spielfeld: Wiese auf Hügeln, Raster als Linie im Gelände-Shader (uGrid), flache Rastertextur aus ----
    if (this.fieldGrid) this.fieldGrid.visible = false;
    if (this.fieldU.uGrid) this.fieldU.uGrid.value = 1;
    this.buildHeights();

    // ---- Landnutzung ums Feld (Textur im Gelände-Shader, 96 m): Äcker in Streifen, Hecken, Straßen, Dorfplätze ----
    var L = mob ? 1024 : 2048, lc = document.createElement('canvas'); lc.width = lc.height = L; var lg = lc.getContext('2d'), px = L / 96;
    function P(x, z) { return [(x + 48) * px, (z + 48) * px]; }
    function slope(x, z) { var h = H(x, z); return Math.abs(H(x + 1, z) - h) + Math.abs(H(x, z + 1) - h); }
    function freeLand(x, z) {
      if (Math.abs(x) < 6 && Math.abs(z) < 6) return false;                     // Spielfeld
      if (Math.abs(x) < 13 && Math.abs(z) > 5.5 && Math.abs(z) < 15) return false; // Feldlager
      if (Math.abs(x - RX(z)) < 4.4 || Board3D.roadD(x, z) < 1.2) return false;
      if (V.some(function (v) { return Math.hypot(x - v[0], z - v[1]) < v[2] + 0.4; })) return false;
      if (Math.abs(x - 15) < 8 && z < -22) return false;                           // Felswand
      if (Board3D.terraceQ(x, z) > 0.05 || Math.hypot(x - Board3D.TEMPLE[0], z - Board3D.TEMPLE[1]) < 6) return false; // Reisterrassen, Tempelwald
      return slope(x, z) < 0.35 && H(x, z) < 3.2 && Board3D.fieldE(x, z) < 34;
    }
    var farms = [];
    for (var gx = -40; gx <= 40; gx += 2.3) for (var gz = -40; gz <= 40; gz += 2.3) {
      var x = gx + (rnd() - 0.5) * 1.2, z = gz + (rnd() - 0.5) * 1.2;
      var near = V.some(function (v) { return Math.hypot(x - v[0], z - v[1]) < v[2] + 9; });
      if (!freeLand(x, z) || rnd() > (near ? 0.95 : Math.min(0.9, 0.7 * Board3D.noise(x * 0.06, z * 0.06, 2) * 2))) continue;
      // Ausrichtung nach der nächsten Straße (Felder liegen quer oder längs zum Weg)
      var ang = Math.round(Math.atan2(z, x) / (Math.PI / 2)) * Math.PI / 2 + (Board3D.noise(x * 0.05 + 9, z * 0.05, 2) - 0.5) * 0.8;
      farms.push([x, z, ang, 2.4 + rnd() * 1.2, 1.3 + rnd() * 1.4, 1 + Math.floor(rnd() * 4)]);
    }
    farms.forEach(function (f) { var p = P(f[0], f[1]); plot(lg, f[5], p[0], p[1], f[3] * px, f[4] * px, f[2], Math.max(4, Math.round(f[4] * 4)), 0.78); });
    // Hecken/Raine zwischen den Äckern: dunkle grüne Ränder
    lg.strokeStyle = 'rgba(38,58,22,0.75)'; lg.lineWidth = Math.max(1.5, px * 0.16);
    farms.forEach(function (f) { var p = P(f[0], f[1]); lg.save(); lg.translate(p[0], p[1]); lg.rotate(f[2]); lg.strokeRect(-f[3] * px / 2, -f[4] * px / 2, f[3] * px, f[4] * px); lg.restore(); });
    // Dorfplätze: festgetretene Erde
    V.forEach(function (v) { var p = P(v[0], v[1]), gr = lg.createRadialGradient(p[0], p[1], 0, p[0], p[1], (v[2] + 1) * px); gr.addColorStop(0, 'rgba(132,110,80,0.85)'); gr.addColorStop(0.7, 'rgba(132,110,80,0.6)'); gr.addColorStop(1, 'rgba(132,110,80,0)'); lg.fillStyle = gr; lg.fillRect(p[0] - (v[2] + 1) * px, p[1] - (v[2] + 1) * px, (v[2] + 1) * 2 * px, (v[2] + 1) * 2 * px); });
    // Reisterrassen: Parzellen als Bänder entlang des Flusses, mal Wasser, mal Setzlinge, helle Dämme als Umriss
    var TC = ['rgba(70,98,96,0.95)', 'rgba(86,122,60,0.95)', 'rgba(78,110,88,0.95)', 'rgba(118,136,66,0.93)', 'rgba(70,98,96,0.95)'];
    for (var tb = 0; tb < 6; tb++) for (var tk = 0; tk < 12; tk++) {
      var za = (tk - (tb % 2) * 0.5) * 5.5 - 30, zb = za + 5.5, zc2 = za + 2.75, wa = 3.8 + tb * 1.5, wb = wa + 1.5;
      var tqc = Board3D.terraceQ(Board3D.riverG(zc2) - (wa + wb) / 2, zc2);
      if (tqc < 0.5 || V.some(function (v) { return Math.hypot(Board3D.riverG(zc2) - (wa + wb) / 2 - v[0], zc2 - v[1]) < v[2] + 2; })) continue;
      lg.beginPath();
      for (var zz = za; zz <= zb + 0.01; zz += 0.5) { var q1 = P(Board3D.riverG(zz) - wa, zz); if (zz === za) lg.moveTo(q1[0], q1[1]); else lg.lineTo(q1[0], q1[1]); }
      for (zz = zb; zz >= za - 0.01; zz -= 0.5) { var q2 = P(Board3D.riverG(zz) - wb, zz); lg.lineTo(q2[0], q2[1]); }
      lg.closePath(); lg.globalAlpha = Math.min(1, (tqc - 0.5) * 3 + 0.4);
      lg.fillStyle = TC[(tb * 3 + tk * 7) % 5]; lg.fill();
      lg.strokeStyle = 'rgba(124,110,72,0.95)'; lg.lineWidth = 0.22 * px; lg.stroke();
    }
    lg.globalAlpha = 1;
    // Straßen: Erde mit Fahrspuren, weicher Rand
    lg.lineCap = lg.lineJoin = 'round';
    [[1.6, 'rgba(118,96,66,0.45)'], [1.0, 'rgba(150,126,90,0.95)'], [0.12, 'rgba(110,88,60,0.6)']].forEach(function (st, si) {
      Board3D.ROADS.forEach(function (r) {
        [-0.22, 0.22].slice(0, si === 2 ? 2 : 1).forEach(function (off) {
          lg.strokeStyle = st[1]; lg.lineWidth = st[0] * px; lg.beginPath();
          r.forEach(function (pt, j) { var p = P(pt[0] + (si === 2 ? off : 0), pt[1] + (si === 2 ? off : 0)); if (j) lg.lineTo(p[0], p[1]); else lg.moveTo(p[0], p[1]); }); lg.stroke();
        });
      });
    });
    var lt = new T.CanvasTexture(lc); lt.colorSpace = T.SRGBColorSpace; lt.flipY = false; lt.anisotropy = 8;
    this.fieldU.tLand.value = lt; this.fieldU.uLand.value = 1;

    // ---- Boden: Spielfeld grün statt zertrampelt (die Äcker liegen darüber) ----
    var geo = this.fieldGeo, pos = geo.attributes.position, mix = geo.attributes.aMix, i;
    for (i = 0; i < pos.count; i++) {
      var vx = pos.getX(i), vz = pos.getZ(i);
      if (Math.abs(vx) < 4.9 && Math.abs(vz) < 4.9) mix.setXYZ(i, 0.85, 0.15, 0);
    }
    mix.needsUpdate = true;

    // ---- Reisfelder auf den Terrassen: flache Stellen bekommen eine spiegelnde Wasserparzelle ----
    var cells = []; // Reisfelder stecken jetzt in der Landnutzungs-Textur
    var TP = Board3D.TEMPLE;
    // ---- Instanzen räumen: Gras/Bäume nicht auf Wegen, im Fluss, in Dörfern, auf Äckern ----
    var farmAt = function (x, z) { return farms.some(function (f) { var dx = x - f[0], dz = z - f[1], ca = Math.cos(f[2]), sa = Math.sin(f[2]), u = dx * ca + dz * sa, v = -dx * sa + dz * ca; return Math.abs(u) < f[3] / 2 && Math.abs(v) < f[4] / 2; }); };
    function blocked(x, z, tree) {
      if (Math.abs(x - RX(z)) < (tree ? 4.6 : 3)) return true;
      if (Board3D.roadD(x, z) < (tree ? 1.6 : 0.8)) return true;
      if (V.some(function (v) { return Math.hypot(x - v[0], z - v[1]) < v[2] + (tree ? 3.2 : 0.4); })) return true;
      if (Math.abs(x) < 9.5 && Math.abs(z - Board3D.streamZ(x)) < (tree ? 0.9 : 0.42) * Board3D.streamW(x)) return true; // Grenzbach
      if (!tree && x < -5 && x > -10 && z < 0 && z > -5.5) { var rh = Board3D.ridgeH(x, z); if (rh > 0.2 && rh < 2.0) return true; } // Steilwand des Grats
      if (Math.abs(x) < 4.9 && Math.abs(z) < 4.9) return tree; // Spielfeld: Gras ja, Bäume nein
      if (!tree && Math.abs(x) < 42 && Math.abs(z) < 42 && farmAt(x, z)) return true;
      var tdx = x - TP[0], tdz = z - TP[1], td = Math.hypot(tdx, tdz);
      if (td < (tree ? 5 : 3.4)) return true;
      if (tree && td < 14 && (tdx * -TP[0] + tdz * -TP[1]) / (td * Math.hypot(TP[0], TP[1])) > 0.85) return true; // Lichtung Richtung Feld, Tempel sichtbar
      if (!tree && x < -12 && x > -37 && Board3D.terraceQ(x, z) > 0.5) return true; // Reisterrassen
      if (tree && Board3D.terraceQ(x, z) > 0.3) return true;
      return Math.abs(x - 15) < 7 && z < -23 && z > -26 && !tree; // Fuß der Felswand
    }
    var m4 = new T.Matrix4(), m5 = new T.Matrix4(), p3 = new T.Vector3(), cc = new T.Color();
    scene.children.forEach(function (o) {
      if (!o.isInstancedMesh || o.userData.army) return;
      var tree = o.geometry.attributes.position.count !== 27, nn = o.count; // Grasbüschel haben 9 Halme = 27 Ecken
      for (var j = 0; j < nn;) {
        o.getMatrixAt(j, m4); p3.setFromMatrixPosition(m4);
        if (blocked(p3.x, p3.z, tree)) { nn--; if (j < nn) { o.getMatrixAt(nn, m5); o.setMatrixAt(j, m5); if (o.instanceColor) { o.getColorAt(nn, cc); o.setColorAt(j, cc); } } } else j++;
      }
      if (nn !== o.count) { o.count = nn; o.instanceMatrix.needsUpdate = true; if (o.instanceColor) o.instanceColor.needsUpdate = true; o.computeBoundingSphere(); }
    });

    // ---- Dörfer: Bauernhäuser als Instanzen (Sockel aus Holz, Wand, Dach) ----
    var maxH = mob ? 45 : 100, body = new T.BoxGeometry(1, 1, 1); body.translate(0, 0.5, 0);
    var rf = new T.CylinderGeometry(0.16, 0.72, 1, 4, 1); rf.rotateY(Math.PI / 4); rf.translate(0, 0.5, 0); rf = rf.toNonIndexed(); rf.computeVertexNormals();
    var wallM = new T.MeshStandardMaterial({ roughness: 0.9 }), roofM = new T.MeshStandardMaterial({ roughness: 1, flatShading: true });
    var houses = [];
    V.forEach(function (v) {
      var cnt = Math.round(v[3] * (mob ? 0.6 : 1)), tries = 0, put = [];
      while (put.length < cnt && tries++ < 300) {
        var a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * (v[2] + 0.6), x = v[0] + Math.cos(a) * d, z = v[1] + Math.sin(a) * d;
        if (Board3D.roadD(x, z) < 1.05 || put.some(function (p) { return Math.hypot(p[0] - x, p[1] - z) < 1.9; })) continue;
        put.push([x, z]);
        // Häuser stehen mit der Traufseite zur Straße
        var gote = v[1] < 0, rd = Board3D.roadD(x + 0.3, z) - Board3D.roadD(x - 0.3, z), ry = (Math.abs(rd) > 0.25 ? 0 : Math.PI / 2) + (rnd() - 0.5) * 0.25;
        houses.push({ x: x, z: z, w: 1.4 + rnd() * 0.6, d: 0.95 + rnd() * 0.35, ry: ry, h: 0.55 + rnd() * 0.15, tile: rnd() < (gote ? 0.5 : 0.25), gote: gote, big: rnd() < 0.15 });
      }
    });
    houses = houses.slice(0, maxH);
    var nearH = houses.filter(function (h) { return Math.abs(h.x) < 15 && Math.abs(h.z) < 15; }), farH = houses.filter(function (h) { return !(Math.abs(h.x) < 15 && Math.abs(h.z) < 15); });
    [[nearH, hi], [farH, false]].forEach(function (grp) {
      var list = grp[0]; if (!list.length) return;
      var wi = new T.InstancedMesh(body, wallM, list.length * 2), ri = new T.InstancedMesh(rf, roofM, list.length), qq = new T.Quaternion(), up = new T.Vector3(0, 1, 0), col = new T.Color(), sc3 = new T.Vector3();
      list.forEach(function (h, j) {
        var y = Y + H(h.x, h.z) - 0.04, s = h.big ? 1.3 : 1; qq.setFromAxisAngle(up, h.ry);
        // dunkler Holzsockel, darüber helle Lehmwand
        m4.compose(p3.set(h.x, y, h.z), qq, sc3.set(h.w * s, h.h * 0.45, h.d * s)); wi.setMatrixAt(j * 2, m4); wi.setColorAt(j * 2, col.set(0x4a3a2c));
        m4.compose(p3.set(h.x, y + h.h * 0.45, h.z), qq, sc3.set(h.w * s * 0.97, h.h * 0.55, h.d * s * 0.97)); wi.setMatrixAt(j * 2 + 1, m4); wi.setColorAt(j * 2 + 1, col.set(rnd() < 0.7 ? 0xe4dccb : 0x8a6e52));
        m4.compose(p3.set(h.x, y + h.h - 0.03, h.z), qq, sc3.set(h.w * s * 1.32, (h.tile ? 0.5 : 0.78) * s, h.d * s * 1.5)); ri.setMatrixAt(j, m4);
        ri.setColorAt(j, col.set(h.tile ? (h.gote ? 0x46505e : 0x3a3430) : 0x7a6038).multiplyScalar(0.85 + rnd() * 0.25));
      });
      [wi, ri].forEach(function (o) { o.castShadow = grp[1]; o.receiveShadow = true; o.raycast = function () { }; o.computeBoundingSphere(); scene.add(o); });
    });

    // ---- Bäume an Straßen und in Dörfern (eine Instanz-Liste Laubbäume, Handy halb) ----
    var tg = Board3D.cardTree('leafy'), tm = this.foliageMat('leafy'), trees = [];
    Board3D.ROADS.forEach(function (r) { for (var j = 1; j < r.length; j++) { var a0 = r[j - 1], a1 = r[j], len = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]), nx = -(a1[1] - a0[1]) / len, nz = (a1[0] - a0[0]) / len;
      for (var u = 0; u < len; u += 2.4 + rnd() * 1.5) { var side = rnd() < 0.5 ? -1 : 1, x = a0[0] + (a1[0] - a0[0]) * u / len + nx * side * 1.5, z = a0[1] + (a1[1] - a0[1]) * u / len + nz * side * 1.5;
        if (rnd() < 0.55 && Board3D.fieldE(x, z) > 3 && !(Math.abs(x) < 13 && Math.abs(z) > 5 && Math.abs(z) < 15) && Math.abs(x - RX(z)) > 3.5) trees.push([x, z, 0.45 + rnd() * 0.25]); } } });
    V.forEach(function (v) { for (var j = 0; j < 4; j++) { var a = rnd() * 6.28, x = v[0] + Math.cos(a) * (v[2] + 1.2), z = v[1] + Math.sin(a) * (v[2] + 1.2); if (Board3D.roadD(x, z) > 1.3) trees.push([x, z, 0.6 + rnd() * 0.3]); } });
    if (mob) trees = trees.filter(function (_, j) { return j % 2 === 0; });
    if (trees.length) {
      var ti = new T.InstancedMesh(tg, tm, trees.length), qt = new T.Quaternion(), upt = new T.Vector3(0, 1, 0), ct = new T.Color(), pal = this.mood.trees[1];
      trees.forEach(function (tr, j) { qt.setFromAxisAngle(upt, rnd() * 6.28); m4.compose(p3.set(tr[0], Y + H(tr[0], tr[1]) - 0.08, tr[1]), qt, new T.Vector3(tr[2], tr[2] * (0.9 + rnd() * 0.3), tr[2])); ti.setMatrixAt(j, m4); ti.setColorAt(j, ct.set(pal[j % pal.length]).multiplyScalar(0.9 + rnd() * 0.2)); });
      ti.castShadow = hi; ti.receiveShadow = true; ti.raycast = function () { }; ti.computeBoundingSphere(); scene.add(ti);
    }

    // ---- Fluss im Tal links, Holzbrücke an der Straße ----
    var P = [], I = [], UVr = [], NR = [], zz, kk = 0;
    for (zz = -54; zz <= 52; zz += 1.5) { var rx = RX(zz), rw = 2.4; P.push(rx - rw, 0, zz, rx + rw, 0, zz); UVr.push(0, zz * 0.12, 1.3, zz * 0.12); NR.push(0, 1, 0, 0, 1, 0); if (kk) I.push(kk * 2 - 2, kk * 2, kk * 2 - 1, kk * 2 - 1, kk * 2, kk * 2 + 1); kk++; }
    var wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(P, 3)); wg.setAttribute('normal', new T.Float32BufferAttribute(NR, 3)); wg.setAttribute('uv', new T.Float32BufferAttribute(UVr, 2)); wg.setIndex(I);
    var wn = Board3D.waveNormal(), wm = new T.MeshStandardMaterial({ color: 0x2c4450, roughness: 0.08, envMapIntensity: 1.2, normalMap: wn, normalScale: new T.Vector2(0.35, 0.35), side: T.DoubleSide });
    var water = new T.Mesh(wg, wm); water.position.y = Y - 0.62; water.receiveShadow = true; water.raycast = function () { }; scene.add(water);
    this.tweens.push({ forever: true, f: function (tt) { wn.offset.set(Math.sin(tt / 4000) * 0.02, -tt * 0.00012); } });
    (this._skyCbs = this._skyCbs || []).push(function (tx) { wm.envMap = tx; wm.needsUpdate = true; });
    var plank = new T.MeshStandardMaterial({ color: 0x5a4434, roughness: 0.9 }), br = new T.Group(), bz = 1.5, bx = RX(bz);
    br.add(new T.Mesh(new T.BoxGeometry(6.4, 0.08, 1.1), plank));
    [-0.55, 0.55].forEach(function (zr) { var rl = new T.Mesh(new T.BoxGeometry(6.4, 0.05, 0.05), plank); rl.position.set(0, 0.32, zr); br.add(rl); for (var j = -3; j <= 3; j++) { var po = new T.Mesh(new T.BoxGeometry(0.06, 0.34, 0.06), plank); po.position.set(j, 0.15, zr); br.add(po); } });
    [-2, 0, 2].forEach(function (px) { [-0.5, 0.5].forEach(function (zr) { var pl = new T.Mesh(new T.CylinderGeometry(0.06, 0.07, 1.4, 6), plank); pl.position.set(px, -0.7, zr); br.add(pl); }); });
    br.traverse(function (o) { if (o.isMesh) { o.castShadow = hi; o.receiveShadow = true; } }); br.position.set(bx, Y - 0.12, bz); br.rotation.y = -0.05; scene.add(br);

    // ---- Höhle in der Felswand hinten rechts: dunkle Öffnung, Felsbogen, zwei Fackeln ----
    var cx = 13.5, cz = -23.7, cy = Y + H(cx, cz + 1.2), rockM = this.texMat('mossy_rock', 1, 0x7a786e), cave = new T.Group();
    var hole = new T.Mesh(new T.CircleGeometry(1.15, 20, 0, Math.PI), new T.MeshBasicMaterial({ color: 0x050403 })); hole.scale.set(1.1, 1.25, 1); cave.add(hole);
    var inner = new T.Mesh(new T.SphereGeometry(1.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color: 0x0a0806, side: T.BackSide })); inner.rotation.x = -Math.PI / 2; inner.scale.set(1.15, 1, 1.3); inner.position.z = -0.05; cave.add(inner);
    var arch = new T.Mesh(new T.TorusGeometry(1.32, 0.3, 6, 14, Math.PI), rockM); arch.scale.set(1.05, 1.15, 0.8); cave.add(arch);
    [-1.9, 1.9].forEach(function (sx) {
      var po = new T.Mesh(new T.CylinderGeometry(0.03, 0.04, 1.1, 5), plank); po.position.set(sx, 0.55, 0.5); cave.add(po);
      var fl = new T.Sprite(self.fireMat()); fl.scale.set(0.22, 0.42, 1); fl.center.set(0.5, 0.15); fl.position.set(cx + sx, cy + 1.08, cz + 0.5); scene.add(fl);
    });
    cave.position.set(cx, cy - 0.05, cz + 0.1); cave.traverse(function (o) { if (o.isMesh) o.receiveShadow = true; }); scene.add(cave);
    this.buildFeldzug2(hi, cells, plank, rockM);
    var geoR = new T.IcosahedronGeometry(1, 1); [[-2.6, 0.9], [2.8, 1.2], [-1.2, 2.4], [3.6, 0.3]].forEach(function (p) { var s = 0.3 + rnd() * 0.4, rk = new T.Mesh(geoR, rockM); rk.scale.set(s * 1.3, s * 0.8, s); rk.position.set(cx + p[0], Y + H(cx + p[0], cz + p[1]) - 0.1, cz + p[1]); rk.rotation.y = rnd() * 6; scene.add(rk); });
  };

  // Teil 2: Reisfelder, Wassermühle, Tempel im Wald, Rauch aus den Dörfern
  Board3D.prototype.buildFeldzug2 = function (hi, cells, plank, rockM) {
    var self = this, scene = this.scene, Y = this.BT, H = Board3D.fieldH, mob = this.mobile, rnd = Board3D.rnd(57), RX = Board3D.riverG, m4 = new T.Matrix4();
    function mesh(geo, mat, x, y, z) { var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = hi; m.receiveShadow = true; return m; }
    // Reisfelder: Wasser spiegelt den Himmel, Setzlinge in Reihen (je eine Instanz-Liste)
    if (cells.length) {
      var pg = new T.PlaneGeometry(0.8, 0.8); pg.rotateX(-Math.PI / 2);
      var pm = new T.MeshStandardMaterial({ color: 0x4a6660, roughness: 0.1, envMapIntensity: 1.1 }), paddy = new T.InstancedMesh(pg, pm, cells.length);
      cells.forEach(function (c, i) { m4.makeTranslation(c[0], Y + c[1], c[2]); paddy.setMatrixAt(i, m4); }); paddy.receiveShadow = true; paddy.raycast = function () { }; scene.add(paddy);
      (this._skyCbs = this._skyCbs || []).push(function (t) { pm.envMap = t; pm.needsUpdate = true; });
      var sg = new T.ConeGeometry(0.025, 0.09, 4, 1, true); sg.translate(0, 0.045, 0);
      var sp = new T.InstancedMesh(sg, new T.MeshStandardMaterial({ color: 0x7cb04a, roughness: 0.9 }), cells.length * 4), n = 0;
      cells.forEach(function (c) { for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) { m4.makeTranslation(c[0] - 0.2 + a * 0.4, Y + c[1] - 0.01, c[2] - 0.2 + b * 0.4); sp.setMatrixAt(n++, m4); } });
      sp.raycast = function () { }; scene.add(sp);
    }
    // Wassermühle am Fluss (Westufer): Haus auf Stelzen, Rad dreht sich (nicht zusammengefasst: Material „durchsichtig“ markiert)
    var mz = Board3D.MILL, mx = RX(mz) - 3.1, my = Y + H(mx, mz), mill = new T.Group(), dark = new T.MeshStandardMaterial({ color: 0x3e3026, roughness: 0.85 });
    mill.add(mesh(new T.BoxGeometry(1.8, 0.9, 1.3), dark, 0, 0.45, 0));
    var r = new T.CylinderGeometry(0.15, 0.72, 1, 4, 1); r.rotateY(Math.PI / 4); var ro = mesh(r, new T.MeshStandardMaterial({ color: 0x7a6038, roughness: 1, flatShading: true }), 0, 1.2, 0); ro.scale.set(2.5, 0.8, 1.9); mill.add(ro);
    mill.position.set(mx, my - 0.05, mz); scene.add(mill);
    var wm = new T.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.9, transparent: true, opacity: 1 }), wheel = new T.Group();
    wheel.add(new T.Mesh(new T.TorusGeometry(0.75, 0.05, 5, 18), wm)); wheel.add(new T.Mesh(new T.TorusGeometry(0.4, 0.04, 5, 12), wm));
    for (var k = 0; k < 10; k++) { var pd = new T.Mesh(new T.BoxGeometry(0.06, 0.32, 0.3), wm); var an = k / 10 * Math.PI * 2; pd.position.set(Math.cos(an) * 0.78, Math.sin(an) * 0.78, 0); pd.rotation.z = an; wheel.add(pd); var sk = new T.Mesh(new T.BoxGeometry(0.03, 0.75, 0.03), wm); sk.position.set(Math.cos(an) * 0.4, Math.sin(an) * 0.4, 0); sk.rotation.z = an + Math.PI / 2; wheel.add(sk); }
    wheel.rotation.y = Math.PI / 2; var wpiv = new T.Group(); wpiv.add(wheel); wpiv.position.set(mx + 1.08, my + 0.62, mz); wpiv.scale.setScalar(1.15); scene.add(wpiv);
    var fl = mesh(new T.BoxGeometry(0.3, 0.14, 3.2), dark, mx + 1.08, my + 1.62, mz - 1.75); mill.parent.add(fl);
    var fw = new T.Mesh(new T.BoxGeometry(0.2, 0.02, 3.2), new T.MeshStandardMaterial({ color: 0x5a7a88, roughness: 0.08 })); fw.position.set(mx + 1.08, my + 1.7, mz - 1.75); scene.add(fw);
    [-3.1, -1.6].forEach(function (dz) { scene.add(mesh(new T.BoxGeometry(0.08, 1.7, 0.08), dark, mx + 1.08, my + 0.8, mz + dz)); });
    wheel.traverse(function (o) { if (o.isMesh) o.castShadow = hi; });
    this.tweens.push({ forever: true, f: function (t) { wheel.rotation.x = -t * 0.0009; } });
    // Tempel im Wald auf dem Hügel: Haupthalle in Zinnoberrot, geschwungenes Dach, Torii, Steinlaternen
    var tx = Board3D.TEMPLE[0], tz = Board3D.TEMPLE[1], ty = Y + H(tx, tz) - 0.05, tp = new T.Group(), red = new T.MeshStandardMaterial({ color: 0x9a2e1e, roughness: 0.6 }), tile = new T.MeshStandardMaterial({ color: 0x353a42, roughness: 0.55, metalness: 0.2 }), stone = new T.MeshStandardMaterial({ color: 0x8a8880, roughness: 0.95 });
    tp.add(mesh(new T.BoxGeometry(3, 0.25, 2.3), stone, 0, 0.12, 0)); tp.add(mesh(new T.BoxGeometry(2.4, 1, 1.7), red, 0, 0.75, 0));
    var tr = new T.CylinderGeometry(0.2, 0.74, 1, 4, 1); tr.rotateY(Math.PI / 4); var trm = mesh(tr, tile, 0, 1.6, 0); trm.scale.set(3.6, 0.9, 2.8); tp.add(trm);
    var ev = new T.CylinderGeometry(0.74, 0.82, 1, 4, 1, true); ev.rotateY(Math.PI / 4); var evm = mesh(ev, tile, 0, 1.18, 0); evm.scale.set(3.6, 0.07, 2.8); tp.add(evm);
    // Torii vor der Halle (zum Feld hin), zwei Steinlaternen
    var to = new T.Group(); [-0.75, 0.75].forEach(function (sx) { to.add(mesh(new T.CylinderGeometry(0.07, 0.08, 1.6, 8), red, sx, 0.8, 0)); });
    to.add(mesh(new T.BoxGeometry(2.1, 0.12, 0.16), red, 0, 1.62, 0)); to.add(mesh(new T.BoxGeometry(1.7, 0.08, 0.12), red, 0, 1.36, 0)); to.add(mesh(new T.BoxGeometry(2.3, 0.06, 0.2), tile, 0, 1.71, 0));
    to.position.set(0, 0, 2.9); tp.add(to);
    [-1, 1].forEach(function (sx) { var l = new T.Group(); l.add(mesh(new T.CylinderGeometry(0.08, 0.12, 0.5, 6), stone, 0, 0.25, 0)); l.add(mesh(new T.BoxGeometry(0.24, 0.2, 0.24), stone, 0, 0.6, 0)); var lr = mesh(new T.ConeGeometry(0.22, 0.16, 4), stone, 0, 0.78, 0); lr.rotation.y = Math.PI / 4; l.add(lr); l.position.set(sx * 1.2, 0, 2); tp.add(l); });
    tp.position.set(tx, ty, tz); tp.rotation.y = Math.atan2(-tx, -tz); scene.add(tp);
    // Rauch aus den Dörfern: je Dorf eine dünne Säule (Handy jedes zweite), läuft über die Lagerfeuer-Logik
    Board3D.VILLAGES.forEach(function (v, i) {
      if (mob && i % 2) return;
      var x = v[0] + (rnd() - 0.5) * v[2], z = v[1] + (rnd() - 0.5) * v[2], puffs = [];
      for (var j = 0; j < (mob ? 3 : 4); j++) { var s2 = new T.Sprite(self.smokeMat()); s2.material.color.set(0xc8c4bc); s2.userData.t = j / 4; scene.add(s2); puffs.push(s2); }
      self.campFires.push({ x: x, y: Y + H(x, z) + 0.9, z: z, fl: new T.Object3D(), puffs: puffs, big: 0.8, rise: 3.2 });
    });
  };
})();

// Höhe über der Spielebene für alles auf dem Spielfeld (Soldaten in armyDraw, Fahnen, Markierungen, Klick).
// Tabelle 0,125 m über x ±10, z ±16 (bilinear), außerhalb direkt fieldH.
(function () {
  if (typeof Board3D === 'undefined') return;
  var T = THREE, X0 = -10, Z0 = -16, ST = 0.125, NX = 161, NZ = 257;
  Board3D.prototype.buildHeights = function () {
    var H = Board3D.fieldH, tab = new Float32Array(NX * NZ), i, j;
    for (j = 0; j < NZ; j++) for (i = 0; i < NX; i++) tab[j * NX + i] = H(X0 + i * ST, Z0 + j * ST);
    this.gH = function (x, z) {
      var fx = (x - X0) / ST, fz = (z - Z0) / ST, i = Math.floor(fx), j = Math.floor(fz);
      if (i < 0 || j < 0 || i >= NX - 1 || j >= NZ - 1) return H(x, z);
      fx -= i; fz -= j; var k = j * NX + i;
      return (tab[k] * (1 - fx) + tab[k + 1] * fx) * (1 - fz) + (tab[k + NX] * (1 - fx) + tab[k + NX + 1] * fx) * fz;
    };
  };
  // Markierungen schmiegen sich ans Gelände: Feld-Kacheln als eigenes Gitter, Punkte und Ringe angehoben (Kacheln entstehen erst nach buildField)
  Board3D.prototype.fitTiles = function () {
    if (this._tilesFit || !this.tiles || this.tiles.length < 81) return; this._tilesFit = true;
    var self = this, BT = this.BT, gh = this.gH;
    this.tiles.forEach(function (tm, q) {
      var p = self.sqPos(q), g = new T.PlaneGeometry(0.97, 0.97, 6, 6); g.rotateX(-Math.PI / 2);
      var pa = g.attributes.position; for (var v = 0; v < pa.count; v++) pa.setY(v, gh(p.x + pa.getX(v), p.z + pa.getZ(v)) + 0.025);
      tm.geometry = g; tm.rotation.x = 0; tm.position.y = BT;
      var d = self.dots[q], h0 = gh(p.x, p.z); d.dot.position.y = BT + h0 + 0.04; d.ring.position.y = BT + h0 + 0.4;
    });
  };
  var setH0 = Board3D.prototype.setHighlights;
  Board3D.prototype.setHighlights = function (h) {
    if (this.gH) this.fitTiles();
    var r = setH0.apply(this, arguments);
    if (this.gH && this.checkRing.visible) this.checkRing.position.y = this.BT + 0.02 + this.gH(this.checkRing.position.x, this.checkRing.position.z);
    return r;
  };
  var tag0 = Board3D.prototype.showTag;
  Board3D.prototype.showTag = function (sq) {
    var r = tag0.apply(this, arguments);
    if (this.gH && this.tag) this.tag.position.y = this.BT + 0.02 + this.gH(this.tag.position.x, this.tag.position.z);
    return r;
  };
  var emit0 = Board3D.prototype.emit;
  Board3D.prototype.emit = function (x, y, z) {
    if (this.gH && y < this.BT + 1.5 && Math.abs(x) < 10 && Math.abs(z) < 16) { var a = Array.prototype.slice.call(arguments); a[1] = y + this.gH(x, z); return emit0.apply(this, a); }
    return emit0.apply(this, arguments);
  };
  // Klick: Strahl gegen das Gelände
  var pick0 = Board3D.prototype.pickSq;
  Board3D.prototype.pickSq = function (cx, cy) {
    if (!this.gH) return pick0.apply(this, arguments);
    var rect = this.renderer.domElement.getBoundingClientRect(), ray = new T.Raycaster();
    ray.setFromCamera(new T.Vector2((cx - rect.left) / rect.width * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1), this.camera);
    var hits = ray.intersectObjects(this.pieceGroup.children, true), x, z;
    if (hits.length) { var o = hits[0].object; while (o.parent && o.parent !== this.pieceGroup) o = o.parent; x = o.position.x; z = o.position.z; }
    else {
      // Strahl in 5-cm-Schritten abtasten bis unter das Gelände, dann halbieren (Nachführen über die Höhe schwingt an Hängen auf)
      var o0 = ray.ray.origin, d0 = ray.ray.direction, BT = this.BT, gh = this.gH, under = function (t) { return o0.y + d0.y * t <= BT + gh(o0.x + d0.x * t, o0.z + d0.z * t); };
      if (d0.y >= 0) return null;
      var tMax = (o0.y - BT + 1) / -d0.y, t0 = 0, t1 = -1;
      for (var t = 0; t <= tMax; t += 0.05) { if (under(t)) { t1 = t; break; } t0 = t; }
      if (t1 < 0) return null;
      for (var k = 0; k < 10; k++) { var tm = (t0 + t1) / 2; if (under(tm)) t1 = tm; else t0 = tm; }
      x = o0.x + d0.x * t1; z = o0.z + d0.z * t1;
    }
    var c = Math.round(x + 4), r = Math.round(z + 4);
    return c < 0 || c > 8 || r < 0 || r > 8 ? null : r * 9 + c;
  };
  // Fahnen stehen auf dem Gelände (Soldaten hebt armyDraw an)
  var tick0 = Board3D.prototype.fieldTick;
  Board3D.prototype.fieldTick = function (now, dt) {
    var r = tick0.apply(this, arguments), gh = this.gH;
    if (gh) this.fitTiles();
    if (gh && this.pieceGroup) this.pieceGroup.children.forEach(function (g) {
      var b = g.userData.banner; if (!b) return;
      var c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y), bx = b.position.x, bz = b.position.z;
      b.position.y = gh(g.position.x + bx * c + bz * s, g.position.z - bx * s + bz * c);
    });
    return r;
  };
})();
