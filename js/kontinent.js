// Schlachtfeld „Kontinent“ im Armee-Modus (Wunsch 19.10.: „zu kleiner Maßstab, wie ein Krieg um einen Kontinent“).
// Das 9×9-Feld ist ein Frontabschnitt am Grenzfluss zweier Reiche (Sente im Süden, Gote im Norden). Drumherum ein ganzer Kontinent
// im Kartenmaßstab wie die Kampagnenkarte von Total War: Golf und Meer, Gebirge mit Schnee, Hauptstädte mit Burg, Städte mit Äckern,
// Straßen, Provinzgrenzen in Reichsfarbe, Miniatur-Wälder, und die Front zieht sich mit Armeen beider Reiche den Fluss entlang.
// Kosten: Gelände und Landnutzung einmal beim Aufbau; Wälder, Häuser, Armeen je eine Instanz-Liste, Wasser ein Mesh.
(function () {
  if (typeof Board3D === 'undefined') return;
  var T = THREE, N = Board3D.noise, SL = Board3D.SEA = -0.28; // Meeresspiegel über der Spielebene
  function sm(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  Board3D.FIELD_MOODS.kontinent = {
    sky: 'sky_kloofendal_38d_partly_cloudy_puresky.webp', skyI: 0.95, exp: 1.02, sun: [0xffd8a8, 2.5, [-13, 11, 5]], hemi: [0xcfe0f0, 0x4a4430, 0.62],
    fog: [null, 0.0026], fogS: [0.72, 0.78, 0.86], hfog: [0.3, 0.02, 0.3], glow: [0xffd8b0, 0.3, 6], tint: [1, 1, 0.97], shape: 'kontinent', snow: 27,
    trees: [[0xe0e8d8, 0xd0dcc4], [0x5e8c3e, 0x6c9a44, 0x557f38, 0x7aa64e]], flowers: [0xffe27a, 0xffffff, 0xd8a0e0], mounds: []
  };
  // Golf: Kopf an der Flussmündung links vorn, öffnet sich nach Nordwesten (vom Sente-Blick aus links im Bild)
  var HEAD = [-32, -12], GD = [-0.45, -0.893];
  // Hauptstädte [x, z, Reich]: 0 = Sente (Süden, +z), 1 = Gote (Norden)
  var CAP = Board3D.CAPITALS = [[-8, 92, 0], [6, -95, 1]];
  // Küste: > 0 Land. Kontinent als verbeulte Ellipse, dazu der Golf als Keil vom Kopf aus
  function coast(x, z) {
    var a = Math.atan2(z + 40, x), r = Math.hypot(x / 1.2, z + 40);
    var c = 290 + (N(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5, 4) - 0.5) * 190 - r;
    var px = x - HEAD[0], pz = z - HEAD[1], t = px * GD[0] + pz * GD[1], dd = t < 0 ? Math.hypot(px, pz) : Math.abs(px * GD[1] - pz * GD[0]);
    var b = dd - (3 + Math.max(0, t) * 0.36) + ((N(x * 0.035 + 2, z * 0.035 - 6, 3) - 0.5) * 40 + (N(x * 0.14, z * 0.14, 2) - 0.5) * 8) * sm(0, 40, t);
    return Math.min(c, b);
  }
  Board3D.coast = coast;
  // Grenzfluss: im Feld der Grenzbach, außerhalb ein breiter Strom (Mündung im Golf, Quelle im Ostgebirge)
  function bigZ(x) {
    var m = sm(9, 30, Math.abs(x)), w = x < 0 ? -13 * sm(-9, -32, x) : -16 * sm(9, 150, x);
    return w + (3.5 * Math.sin(x * 0.075 + 0.4) + 1.3 * Math.sin(x * 0.19 + 2)) * m;
  }
  Board3D.riverZ = function (x) { var b = sm(7, 12, Math.abs(x)); return Board3D.streamZ(x) * (1 - b) + bigZ(x) * b; };
  Board3D.riverW = function (x) { return 0.16 + 0.03 * Math.max(0, Math.abs(x) - 8); };
  // Reich an einer Stelle: westlich der Mündung trennt der Golf, sonst der Fluss
  Board3D.realm = function (x, z) { var bz = x < HEAD[0] ? HEAD[1] + (x - HEAD[0]) * GD[1] / GD[0] : Board3D.riverZ(Math.min(x, 160)); return z > bz ? 0 : 1; };

  var capH = [];
  function landH(x, z) {
    var rid = 1 - Math.abs(N(x * 0.011 + 9, z * 0.011 + 2, 5) * 2 - 1);
    var hills = (N(x * 0.03 + 3, z * 0.03 - 7, 4) - 0.4) * 6;
    var north = sm(-125, -205, z), east = sm(130, 195, x) * (1 - sm(60, 140, z)), south = sm(150, 210, z) * sm(20, 90, x);
    var mt = Math.max(north, east * 0.85, south * 0.6);
    return Math.max(0.35, 0.35 + hills) + mt * (6 + rid * rid * 44) + rid * rid * 5 * (1 - mt);
  }
  function contH(x, z) {
    var h = landH(x, z);
    for (var i = 0; i < CAP.length; i++) { // Hauptstadt auf einer Anhöhe mit ebener Kuppe
      var c = CAP[i], d = Math.hypot(x - c[0], z - c[1]); if (d > 12) continue;
      if (capH[i] == null) capH[i] = landH(c[0], c[1]) + 1.6;
      h += (capH[i] - h) * (1 - sm(6.5, 12, d));
    }
    return h;
  }
  var H1 = Board3D.fieldH;
  Board3D.fieldH = function (x, z) {
    if (Board3D.FIELD_SHAPE !== 'kontinent') return H1(x, z);
    var e = Board3D.fieldE(x, z), ax = Math.abs(x), h = Board3D.fieldHill(x, z) + contH(x, z) * sm(5, 30, e);
    var ra = sm(-40, -33, x) * (1 - sm(150, 168, x));
    if (ra > 0) {
      var d = Math.abs(z - Board3D.riverZ(x)), ex = Math.max(0, ax - 8), w = 0.16 + 0.03 * ex;
      h *= 1 - ra * (1 - sm(w, w + 8 + ex * 0.25, d)) * 0.75 * sm(8, 20, ax); // flache Aue am Strom (nicht im Feld)
      var c = ra * (1 - sm(w, w + 0.25 + 0.14 * ex, d));
      h = h * (1 - c) + (SL - 0.18 - 0.3 * sm(8, 30, ax)) * c;
    }
    var cs = coast(x, z), k = sm(-2, 10, cs);
    return h * k + Math.max(SL - 4, SL - 0.25 + Math.min(0, cs) * 0.05) * (1 - k);
  };
  // Gelände-Raster: innen fein (Feld), außen wachsend bis 700 m; z bleibt bis ±20 fein, dort läuft der Strom
  var FW1 = Board3D.fieldWarp;
  Board3D.fieldWarp = function (shape, mob) {
    if (shape !== 'kontinent') return FW1 ? FW1(shape, mob) : null;
    var S = mob ? 240 : 340, L = mob ? 15 : 20, u0 = mob ? 0.45 : 0.4, K = (700 - L) / Math.pow(1 - u0, 2.5);
    return { S: S, f: function (u) { var a = Math.abs(u); return Math.sign(u) * (L * a + (a > u0 ? K * Math.pow(a - u0, 2.5) : 0)); } };
  };

  var mood0 = Board3D.prototype.buildMood;
  Board3D.prototype.buildMood = function (hi) { mood0.call(this, hi); if (this.mood && this.mood.shape === 'kontinent') this.buildKontinent(hi); };
  var lm0 = Board3D.prototype.buildLandmarks; // Burg/Pagode im Menschenmaßstab passen nicht zur Karte
  Board3D.prototype.buildLandmarks = function (hi) { if (Board3D.FIELD_SHAPE === 'kontinent') return; return lm0.apply(this, arguments); };
  var fc0 = Board3D.prototype.fireCandidates; // Brände breiten sich in den Frontstädten aus
  Board3D.prototype.fireCandidates = function () { return this.kFire ? this.kFire.slice() : fc0.apply(this, arguments); };

  Board3D.prototype.buildKontinent = function (hi) {
    var self = this, scene = this.scene, Y = this.BT, H = Board3D.fieldH, E = Board3D.fieldE, RZ = Board3D.riverZ, RW = Board3D.riverW, RE = Board3D.realm;
    var mob = this.mobile, rnd = Board3D.rnd(4242), m4 = new T.Matrix4(), p3 = new T.Vector3(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), sc = new T.Vector3(), cc = new T.Color();
    this.maxR = 240; this.camera.far = 3000; this.camera.updateProjectionMatrix();
    if (this.fieldGrid) this.fieldGrid.visible = false;
    this.fieldU.uGrid.value = 1;
    this.buildHeights();

    // ---- Höhenraster über ±400 m (Platzierung, Strand, Provinzen) ----
    var R0 = 400, G = mob ? 2.5 : 2, NG = Math.round(R0 * 2 / G) + 1, hg = new Float32Array(NG * NG), i, j, x, z;
    for (j = 0; j < NG; j++) for (i = 0; i < NG; i++) hg[j * NG + i] = H(-R0 + i * G, -R0 + j * G);
    function hAt(x, z) { var i = Math.round((x + R0) / G), j = Math.round((z + R0) / G); return i < 0 || j < 0 || i >= NG || j >= NG ? SL - 1 : hg[j * NG + i]; }
    function slope(x, z) { return Math.abs(hAt(x + G, z) - hAt(x - G, z)) + Math.abs(hAt(x, z + G) - hAt(x, z - G)); }
    function riverD(x, z) { return x < -34 || x > 160 ? 99 : Math.abs(z - RZ(x)) - RW(x); }
    function frontZone(x, z) { return Math.abs(x) > 11 && x > -34 && x < 155 && riverD(x, z) < 12; }

    // ---- Städte: zwei Hauptstädte, dazu Städte im Land (nicht im Gebirge, nicht am Feld) ----
    var towns = CAP.map(function (c) { return { x: c[0], z: c[1], r: c[2], cap: true, n: mob ? 150 : 280, rad: 8 }; }), tries = 0;
    while (towns.length < (mob ? 30 : 48) && tries++ < 6000) {
      x = (rnd() - 0.5) * 560; z = (rnd() - 0.5) * 540 - 10;
      var hh = hAt(x, z);
      if (hh < SL + 0.6 || hh > 6.5 || E(x, z) < 18 || slope(x, z) > 0.9 || riverD(x, z) < 5 || Board3D.coast(x, z) < 3) continue;
      if (towns.some(function (t) { return Math.hypot(t.x - x, t.z - z) < (t.cap ? 28 : 18); })) continue;
      towns.push({ x: x, z: z, r: RE(x, z), n: 10 + Math.floor(rnd() * 16), rad: 1.5 + rnd() * 1.1 });
    }
    var hamlets = []; tries = 0;
    while (hamlets.length < (mob ? 24 : 50) && tries++ < 4000) {
      x = (rnd() - 0.5) * 220; z = (rnd() - 0.5) * 200;
      var h2 = hAt(x, z);
      if (h2 < SL + 0.5 || h2 > 5 || E(x, z) < 14 || slope(x, z) > 0.8 || riverD(x, z) < 9 || Board3D.coast(x, z) < 3) continue;
      if (towns.concat(hamlets).some(function (t) { return Math.hypot(t.x - x, t.z - z) < (t.cap ? 14 : 8); })) continue;
      hamlets.push({ x: x, z: z, r: RE(x, z), n: 3 + Math.floor(rnd() * 4), rad: 0.8, ham: true });
    }
    // ---- Straßen: jede Stadt zur nächsten schon angebundenen ihres Reichs, Hauptstadt zur Front; leicht geschwungen ----
    function wet(a, b) { var n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2); for (var k = 1; k < n; k++) { var xx = a[0] + (b[0] - a[0]) * k / n, zz = a[1] + (b[1] - a[1]) * k / n; if (hAt(xx, zz) < SL + 0.15 || hAt(xx, zz) > 12) return true; } return false; }
    function curve(a, b) {
      var len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(len / 5)), nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len, pts = [];
      for (var k = 0; k <= n; k++) { var u = k / n, o = (N(a[0] * 0.1 + u * 3, a[1] * 0.1 + 7, 2) - 0.5) * Math.min(8, len * 0.15) * Math.sin(u * Math.PI); pts.push([a[0] + (b[0] - a[0]) * u + nx * o, a[1] + (b[1] - a[1]) * u + nz * o]); }
      return pts;
    }
    var roads = [], main = [];
    [0, 1].forEach(function (rl) {
      var cap = towns[rl], sg = rl === 0 ? 1 : -1, done = [cap], rest = towns.filter(function (t) { return !t.cap && t.r === rl; });
      var front = curve([cap.x, cap.z], [0, sg * 15.2]); roads.push(front); main.push(front);
      rest.sort(function (a, b) { return Math.hypot(a.x - cap.x, a.z - cap.z) - Math.hypot(b.x - cap.x, b.z - cap.z); });
      rest.forEach(function (t) {
        var cand = done.slice().sort(function (a, b) { return Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z); });
        for (var k = 0; k < Math.min(3, cand.length); k++) if (!wet([t.x, t.z], [cand[k].x, cand[k].z])) { roads.push(curve([t.x, t.z], [cand[k].x, cand[k].z])); break; }
        done.push(t);
      });
    });
    // Raster-Masken (gleiches Raster wie die Höhen): Straße ja/nein, Abstand zur nächsten Stadt
    function cell(x, z) { var i = Math.round((x + R0) / G), j = Math.round((z + R0) / G); return i < 0 || j < 0 || i >= NG || j >= NG ? -1 : j * NG + i; }
    var rmask = new Uint8Array(NG * NG), tdist = new Float32Array(NG * NG).fill(1e9);
    roads.forEach(function (r) { for (var k = 1; k < r.length; k++) { var a = r[k - 1], b = r[k], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (G * 0.5)); for (var u = 0; u <= n; u++) { var c = cell(a[0] + (b[0] - a[0]) * u / n, a[1] + (b[1] - a[1]) * u / n); if (c >= 0) rmask[c] = 1; } } });
    towns.concat(hamlets).forEach(function (t) { var R = t.rad + 30; for (var zz = t.z - R; zz <= t.z + R; zz += G) for (var xx = t.x - R; xx <= t.x + R; xx += G) { var c = cell(xx, zz); if (c >= 0) tdist[c] = Math.min(tdist[c], Math.hypot(xx - t.x, zz - t.z) - t.rad); } });
    function onRoad(x, z) { var c = cell(x, z); return c >= 0 && rmask[c] === 1; }
    function townD(x, z) { var c = cell(x, z); return c < 0 ? 1e9 : tdist[c]; }
    function forest(x, z) { return sm(0.46, 0.6, N(x * 0.021 + 21, z * 0.021 - 13, 4)); }
    function woodOk(x, z, h) { return h > SL + 0.35 && h < 16 && E(x, z) > 11 && slope(x, z) < 2.2 && riverD(x, z) > 1.5 && townD(x, z) > 3 && !onRoad(x, z) && !frontZone(x, z); }

    // ---- Landnutzung als Textur über ±400 m (Gelände-Shader, uLandS): Waldboden, Strand, Äcker, Provinzgrenzen, Straßen, Stadtplätze ----
    var L = mob ? 2048 : 4096, lc = document.createElement('canvas'); lc.width = lc.height = L; var lg = lc.getContext('2d'), px = L / (R0 * 2);
    function P(x, z) { return [(x + R0) * px, (z + R0) * px]; }
    function dot(x, z, r, col) { var p = P(x, z); lg.fillStyle = col; lg.beginPath(); lg.arc(p[0], p[1], r * px, 0, 6.2832); lg.fill(); }
    // Masken-Bild im Höhenraster, weich hochskaliert: Waldboden (dunkel), Strand (Sand)
    var mc = document.createElement('canvas'); mc.width = mc.height = NG; var mg = mc.getContext('2d'), md = mg.createImageData(NG, NG), D = md.data;
    for (j = 0; j < NG; j++) for (i = 0; i < NG; i++) {
      x = -R0 + i * G; z = -R0 + j * G; var h0 = hg[j * NG + i], o = (j * NG + i) * 4;
      if (h0 > SL - 0.5 && h0 < SL + 0.4 && Board3D.coast(x, z) < 14) { D[o] = 198; D[o + 1] = 184; D[o + 2] = 146; D[o + 3] = 200; continue; }
      var fd = woodOk(x, z, h0) ? forest(x, z) * (1 - sm(12, 16, h0)) : 0;
      if (fd > 0.02) { D[o] = 30; D[o + 1] = 50; D[o + 2] = 24; D[o + 3] = 150 * fd; }
    }
    mg.putImageData(md, 0, 0); lg.imageSmoothingEnabled = true; lg.drawImage(mc, -G * px / 2, -G * px / 2, NG * G * px, NG * G * px);
    // Äcker um die Städte: kleine gedrehte Rechtecke mit Reihen, Hecken dazwischen
    var CROP = [[176, 150, 82], [104, 132, 62], [126, 100, 66], [86, 120, 98], [150, 140, 70]];
    towns.concat(hamlets).forEach(function (t) {
      var n = t.cap ? (mob ? 200 : 380) : t.ham ? 18 : 60 + t.n * 4, r0 = t.rad + 0.6, r1 = t.cap ? 24 : t.ham ? 4.5 : t.rad + 14;
      for (var k = 0; k < n; k++) {
        var a = rnd() * 6.2832, d = r0 + Math.pow(rnd(), 0.7) * (r1 - r0), fx = t.x + Math.cos(a) * d, fz = t.z + Math.sin(a) * d;
        var fh = hAt(fx, fz); if (fh < SL + 0.35 || slope(fx, fz) > 0.7 || riverD(fx, fz) < 1.5 || E(fx, fz) < 14) continue;
        var w = 1.2 + rnd() * 2.2, dpt = 0.8 + rnd() * 1.4, ang = a + (rnd() < 0.5 ? 0 : Math.PI / 2) + (rnd() - 0.5) * 0.3, col = CROP[Math.floor(rnd() * CROP.length)], p = P(fx, fz);
        lg.save(); lg.translate(p[0], p[1]); lg.rotate(ang); lg.fillStyle = 'rgba(' + col.join(',') + ',0.82)'; lg.fillRect(-w * px / 2, -dpt * px / 2, w * px, dpt * px);
        lg.fillStyle = 'rgba(0,0,0,0.08)'; for (var rr = 0; rr < 4; rr++) lg.fillRect(-w * px / 2, (-0.5 + (rr + 0.3) / 4) * dpt * px, w * px, dpt * px * 0.08);
        lg.strokeStyle = 'rgba(40,56,26,0.55)'; lg.lineWidth = Math.max(1, px * 0.12); lg.strokeRect(-w * px / 2, -dpt * px / 2, w * px, dpt * px); lg.restore();
      }
      var p0 = P(t.x, t.z), gr = lg.createRadialGradient(p0[0], p0[1], 0, p0[0], p0[1], (t.rad + 0.8) * px);
      gr.addColorStop(0, 'rgba(140,118,86,0.9)'); gr.addColorStop(0.75, 'rgba(140,118,86,0.6)'); gr.addColorStop(1, 'rgba(140,118,86,0)'); lg.fillStyle = gr; lg.fillRect(p0[0] - (t.rad + 1) * px, p0[1] - (t.rad + 1) * px, (t.rad + 1) * 2 * px, (t.rad + 1) * 2 * px);
    });
    // Provinzen: jedes Stück Land gehört zur nächsten Stadt seines Reichs; Grenzen als weiche Linie in Reichsfarbe (Reichsgrenze kräftiger)
    var prov = new Int16Array(NG * NG), RC = [[236, 190, 84], [214, 228, 250]];
    for (j = 0; j < NG; j++) for (i = 0; i < NG; i++) {
      x = -R0 + i * G; z = -R0 + j * G;
      if (hg[j * NG + i] < SL + 0.1) { prov[j * NG + i] = -1; continue; }
      var rl = RE(x, z), best = -1, bd = 1e9;
      for (var k = 0; k < towns.length; k++) { var t = towns[k]; if (t.r !== rl) continue; var dd = (t.x - x) * (t.x - x) + (t.z - z) * (t.z - z); if (dd < bd) { bd = dd; best = k; } }
      prov[j * NG + i] = best;
    }
    lg.lineCap = 'round'; lg.lineWidth = Math.max(1.5, 0.32 * px);
    for (j = 1; j < NG - 1; j++) for (i = 1; i < NG - 1; i++) {
      var pv = prov[j * NG + i]; if (pv < 0) continue;
      [prov[j * NG + i + 1], prov[(j + 1) * NG + i]].forEach(function (ov, dir) {
        if (ov < 0 || ov === pv || towns[ov].r !== towns[pv].r) return;
        var bx = -R0 + i * G + (dir ? 0 : G / 2), bz = -R0 + j * G + (dir ? G / 2 : 0); if (E(bx, bz) < 16 || riverD(bx, bz) < 2 || hAt(bx, bz) > 7) return;
        var A = towns[pv], B = towns[ov], nx = B.x - A.x, nz = B.z - A.z, nl = Math.hypot(nx, nz); nx /= nl; nz /= nl;
        var mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2, dd = (bx - mx) * nx + (bz - mz) * nz; bx -= dd * nx; bz -= dd * nz; // auf die Mittelsenkrechte
        var a = P(bx + nz * G * 0.7, bz - nx * G * 0.7), b = P(bx - nz * G * 0.7, bz + nx * G * 0.7), cl = RC[A.r];
        lg.strokeStyle = 'rgba(' + cl.join(',') + ',0.55)'; lg.beginPath(); lg.moveTo(a[0], a[1]); lg.lineTo(b[0], b[1]); lg.stroke();
      });
    }
    // Straßen
    lg.lineCap = lg.lineJoin = 'round';
    [[1.3, 'rgba(110,90,62,0.45)'], [0.7, 'rgba(158,134,96,0.95)']].forEach(function (st) {
      lg.strokeStyle = st[1]; lg.lineWidth = st[0] * px;
      roads.forEach(function (r) { lg.beginPath(); r.forEach(function (pt, k) { var p = P(pt[0], pt[1]); if (k) lg.lineTo(p[0], p[1]); else lg.moveTo(p[0], p[1]); }); lg.stroke(); });
    });
    // Feld und Lager bleiben Wiese: Textur dort ausblenden
    lg.globalCompositeOperation = 'destination-out'; var c0 = P(0, 0), fade = lg.createRadialGradient(c0[0], c0[1], 9 * px, c0[0], c0[1], 15 * px);
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = fade; lg.fillRect(c0[0] - 16 * px, c0[1] - 16 * px, 32 * px, 32 * px); lg.globalCompositeOperation = 'source-over';
    var lt = new T.CanvasTexture(lc); lt.colorSpace = T.SRGBColorSpace; lt.flipY = false; lt.anisotropy = 8;
    this.fieldU.tLand.value = lt; this.fieldU.uLand.value = 1; this.fieldU.uLandS.value = R0 * 2;

    // ---- Boden: Fels nur an steilen Hängen (nicht pauschal in der Ferne), Feld grün ----
    var geo = this.fieldGeo, pos = geo.attributes.position, nrm = geo.attributes.normal, mix = geo.attributes.aMix;
    for (i = 0; i < pos.count; i++) {
      x = pos.getX(i); z = pos.getZ(i); var e1 = E(x, z);
      if (Math.abs(x) < 4.9 && Math.abs(z) < 4.9) { mix.setXYZ(i, 0.85, 0.15, 0); continue; }
      if (e1 < 12) continue;
      var rock = sm(0.3, 0.55, 1 - nrm.getY(i)) + sm(9, 16, pos.getY(i)) * 0.5, dirt = pos.getY(i) < SL + 0.05 ? 0.8 : 0; rock = Math.min(1, rock);
      mix.setXYZ(i, Math.max(0, 1 - rock - dirt), dirt * (1 - rock), rock);
    }
    mix.needsUpdate = true;

    scene.children.slice().forEach(function (o) { if (o.isMesh && !o.isInstancedMesh && o.geometry.type === 'IcosahedronGeometry' && E(o.position.x, o.position.z) > 6) scene.remove(o); });
    // ---- Alte Instanzen räumen: Kartenbäume (Menschenmaßstab) ganz weg, Gras nur am Feld ----
    var m5 = new T.Matrix4();
    scene.children.forEach(function (o) {
      if (!o.isInstancedMesh || o.userData.army) return;
      var grass = o.geometry.attributes.position.count === 27, nn = o.count;
      if (!grass) { if (o.material.alphaTest > 0) o.count = 0; return; }
      for (var jj = 0; jj < nn;) { o.getMatrixAt(jj, m4); p3.setFromMatrixPosition(m4); if (E(p3.x, p3.z) > 6.5 || riverD(p3.x, p3.z) < 0.3) { nn--; if (jj < nn) { o.getMatrixAt(nn, m5); o.setMatrixAt(jj, m5); if (o.instanceColor) { o.getColorAt(nn, cc); o.setColorAt(jj, cc); } } } else jj++; }
      o.count = nn; o.instanceMatrix.needsUpdate = true; if (o.instanceColor) o.instanceColor.needsUpdate = true; o.computeBoundingSphere();
    });

    // ---- Meer, Golf und Strom: eine Wasserfläche auf Meereshöhe (Gelände darunter ist Bett) ----
    var wn = Board3D.waveNormal(); wn.repeat.set(500, 500);
    var wm = new T.MeshStandardMaterial({ color: 0x2a4652, roughness: 0.07, envMapIntensity: 1.15, normalMap: wn, normalScale: new T.Vector2(0.28, 0.28) });
    var sea = new T.Mesh(new T.PlaneGeometry(4000, 4000), wm); sea.rotation.x = -Math.PI / 2; sea.position.y = Y + SL; sea.receiveShadow = true; sea.raycast = function () { }; scene.add(sea);
    (this._skyCbs = this._skyCbs || []).push(function (tx) { wm.envMap = tx; wm.needsUpdate = true; });
    this.tweens.push({ forever: true, f: function (tt) { wn.offset.set(tt * 0.000012, Math.sin(tt / 5000) * 0.003); } });

    // ---- Miniatur-Wälder: Nadel- und Laubbäume als Instanzen (wenige Dreiecke), dicht nahe der Front, fern größer und lichter ----
    function treeGeo(conifer) {
      var crown = conifer ? new T.ConeGeometry(0.3, 0.9, 6) : new T.IcosahedronGeometry(0.36, 0), trunk = new T.CylinderGeometry(0.04, 0.05, 0.3, 4);
      crown.translate(0, conifer ? 0.7 : 0.58, 0); trunk.translate(0, 0.15, 0);
      var gs = [crown.toNonIndexed(), trunk.toNonIndexed()], Pp = [], Nn = [], C = [];
      gs.forEach(function (g, gi) { var pa = g.attributes.position, na = g.attributes.normal; for (var v = 0; v < pa.count; v++) { Pp.push(pa.getX(v), pa.getY(v), pa.getZ(v)); Nn.push(na.getX(v), na.getY(v), na.getZ(v)); var s = gi ? 0.5 : 0.75 + 0.25 * Math.max(0, pa.getY(v) - 0.3); if (gi) C.push(0.42 * s * 2, 0.3 * s * 2, 0.2 * s * 2); else C.push(s, s, s); } });
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(Pp, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(Nn, 3)); g.setAttribute('color', new T.Float32BufferAttribute(C, 3)); return g;
    }
    var tm = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }), TN = mob ? [9000, 7000] : [34000, 26000];
    [true, false].forEach(function (con, ti) {
      var im = new T.InstancedMesh(treeGeo(con), tm, TN[ti]), n = 0, tr = 0;
      while (n < TN[ti] && tr++ < TN[ti] * 12) {
        // nah dichter: Radius mit Gewicht zur Mitte
        var rad = 10 + Math.pow(rnd(), 1.8) * 300, an = rnd() * 6.2832; x = Math.cos(an) * rad * 1.1; z = Math.sin(an) * rad - 10;
        var th = hAt(x, z), fd = forest(x, z) * (con ? sm(1, 6, th) * 0.6 + 0.4 : 1 - sm(4, 10, th)) * (1 - sm(12, 16, th));
        if (rnd() > fd || !woodOk(x, z, th) || townD(x, z) < (rad < 60 ? 6 : 3)) continue;
        var s = (0.7 + rnd() * 0.5) * (1 + sm(40, 250, rad) * 1.6);
        q.setFromAxisAngle(up, rnd() * 6.3); m4.compose(p3.set(x, Y + H(x, z) - 0.04, z), q, sc.set(s, s * (0.85 + rnd() * 0.35), s)); im.setMatrixAt(n, m4);
        var g = con ? [0.2, 0.34, 0.2] : [0.3, 0.46, 0.2], v = 0.8 + rnd() * 0.4; cc.setRGB(g[0] * v * 1.6, g[1] * v * 1.6, g[2] * v * 1.6);
        if (!con && rnd() < 0.08) cc.setRGB(0.9, 0.5, 0.2); // vereinzelt Herbstlaub
        im.setColorAt(n++, cc);
      }
      im.count = n; im.raycast = function () { }; im.computeBoundingSphere(); scene.add(im);
    });

    // ---- Städte: kleine Häuser als Instanzen, Hauptstädte mit Mauerring und Burg ----
    var wall = new T.BoxGeometry(1, 0.6, 0.75); wall.translate(0, 0.3, 0);
    var roof = new T.ConeGeometry(0.78, 0.45, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1, 1, 0.8); roof.translate(0, 0.82, 0); roof = roof.toNonIndexed(); roof.computeVertexNormals();
    var hs = []; towns.concat(hamlets).forEach(function (t) {
      var n = Math.round(t.n * (mob ? 0.6 : 1)), k = 0, tr2 = 0;
      while (k < n && tr2++ < n * 8) {
        var a = rnd() * 6.2832, d = Math.sqrt(rnd()) * t.rad, hx = t.x + Math.cos(a) * d, hz = t.z + Math.sin(a) * d;
        if (t.cap && (d < 2.8 || Math.abs(d - 4.8) < 0.45)) continue; // Burgplatz und Mauer frei
        if (hAt(hx, hz) < SL + 0.3) continue;
        hs.push([hx, hz, a + (rnd() < 0.5 ? 0 : Math.PI / 2), 0.3 * (0.8 + rnd() * 0.5), t.r]); k++;
      }
    });
    var wi = new T.InstancedMesh(wall, new T.MeshLambertMaterial({ color: 0xffffff }), hs.length), ri = new T.InstancedMesh(roof, new T.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), hs.length);
    hs.forEach(function (h, n) {
      q.setFromAxisAngle(up, h[2]); m4.compose(p3.set(h[0], Y + H(h[0], h[1]) - 0.03, h[1]), q, sc.set(h[3], h[3], h[3])); wi.setMatrixAt(n, m4); ri.setMatrixAt(n, m4);
      wi.setColorAt(n, cc.set(rnd() < 0.75 ? 0xe2dccb : 0x9a7a5a)); ri.setColorAt(n, cc.set(rnd() < 0.35 ? 0x7a6038 : h[4] === 0 ? 0x3e3632 : 0x3e4652).multiplyScalar(0.85 + rnd() * 0.3)); // Stroh oder Ziegel (Gote bläulich)
    });
    [wi, ri].forEach(function (o) { o.raycast = function () { }; o.computeBoundingSphere(); scene.add(o); });
    var plaster = new T.MeshStandardMaterial({ color: 0xeeeae0, roughness: 0.85 }), tile = new T.MeshStandardMaterial({ color: 0x3b414a, roughness: 0.6 }), stone = new T.MeshStandardMaterial({ color: 0x8e8a80, roughness: 0.95 }), goldR = new T.MeshStandardMaterial({ color: 0x4a3c34, roughness: 0.6 });
    function box(g, w, h, d, mat, x, y, z) { var o = new T.Mesh(new T.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); g.add(o); return o; }
    function hip(g, w, h, d, mat, y) { var r2 = new T.Mesh(new T.ConeGeometry(0.72, 1, 4, 1), mat); r2.rotation.y = Math.PI / 4; r2.scale.set(w, h, d); r2.position.y = y; g.add(r2); }
    towns.slice(0, 2).forEach(function (t) {
      var g = new T.Group(), cy = H(t.x, t.z), rf = t.r === 0 ? goldR : tile;
      // Mauerring (Achteck) mit Ecktürmen
      for (var k = 0; k < 8; k++) { var a = k / 8 * 6.2832, a2 = (k + 1) / 8 * 6.2832, R = 4.8, mx = (Math.cos(a) + Math.cos(a2)) / 2 * R, mz = (Math.sin(a) + Math.sin(a2)) / 2 * R, w2 = new T.Mesh(new T.BoxGeometry(2 * R * Math.sin(Math.PI / 8), 0.5, 0.3), stone); w2.position.set(mx, 0.25, mz); w2.rotation.y = -(a + a2) / 2 + Math.PI / 2; g.add(w2);
        var tw = box(g, 0.6, 0.8, 0.6, plaster, Math.cos(a) * R, 0.4, Math.sin(a) * R); hip({ add: function (o) { o.position.add(tw.position); g.add(o); } }, 0.75, 0.35, 0.75, rf, 0.55); }
      // Burg: Steinsockel, drei Stockwerke mit Walmdächern
      box(g, 2.4, 0.7, 2, stone, 0, 0.35, 0);
      [[1.9, 1.6, 0.55], [1.4, 1.15, 0.5], [0.95, 0.8, 0.45]].forEach(function (s, k) { var y = 0.7 + k * 0.62; box(g, s[0], s[2], s[1], plaster, 0, y + s[2] / 2, 0); hip(g, s[0] * 0.95, 0.32, s[1] * 0.95, rf, y + s[2] + 0.12); });
      g.position.set(t.x, Y + cy - 0.05, t.z); g.rotation.y = t.r === 0 ? Math.PI : 0; scene.add(g);
    });

    // ---- Front: Armeen beider Reiche den Strom entlang bis in den Dunst (je Reich eine Instanz-Liste), Lagerfeuer-Rauch ----
    var HG = Board3D.heerGeo, KS = (Board3D.ARMY_KS || 1) * 1.35, COLS = mob ? 9 : 14, ROWS = mob ? 5 : 7, SX = 0.17 * KS, SZ = 0.2 * KS, BW = COLS * SX, BD = ROWS * SZ;
    var blocks = [[], []];
    [0, 1].forEach(function (col) {
      var sg = col === 0 ? 1 : -1;
      for (var bx = -30; bx <= 150; bx += mob ? 7 : 4.2) {
        if (Math.abs(bx) < 13) continue;
        for (var row = 0; row < 2; row++) {
          if (row === 1 && (mob || rnd() < 0.45)) continue;
          var xx = bx + (rnd() - 0.5) * 1.4, off = RW(xx) + 2.2 + row * 3.4 + rnd() * 0.8, zz = RZ(xx) + sg * off, ang = Math.atan2(RZ(xx + 1) - RZ(xx - 1), 2);
          var hs2 = [[0, 0], [-BW / 2, -BD / 2], [BW / 2, -BD / 2], [-BW / 2, BD / 2], [BW / 2, BD / 2]].map(function (c) { return hAt(xx + c[0], zz + c[1]); });
          if (Math.min.apply(null, hs2) < SL + 0.25 || Math.max.apply(null, hs2) - Math.min.apply(null, hs2) > 0.9 || townD(xx, zz) < 2) continue;
          blocks[col].push([xx, zz, ang]);
        }
      }
    });
    this.kFront = blocks;
    [0, 1].forEach(function (col) {
      var B = blocks[col], im = new T.InstancedMesh(HG.soldier(col), self.heerMat(), B.length * COLS * ROWS), n = 0, ry0 = col === 0 ? Math.PI : 0, sg = col === 0 ? -1 : 1;
      B.forEach(function (b) {
        var ca = Math.cos(-b[2]), sa = Math.sin(-b[2]);
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
          var lx = (c - (COLS - 1) / 2) * SX + (rnd() - 0.5) * 0.04 * KS, lz = (r - (ROWS - 1) / 2) * SZ * sg + (rnd() - 0.5) * 0.04 * KS, sx = b[0] + lx * ca + lz * sa, sz = b[1] - lx * sa + lz * ca, s = (0.92 + rnd() * 0.16) * KS;
          q.setFromAxisAngle(up, ry0 - b[2] + (rnd() - 0.5) * 0.25); m4.compose(p3.set(sx, Y + H(sx, sz) - 0.01, sz), q, sc.set(s, s, s)); im.setMatrixAt(n, m4); im.setColorAt(n++, cc.setScalar(0.8 + rnd() * 0.35));
        }
      });
      im.count = n; im.raycast = function () { }; im.computeBoundingSphere(); scene.add(im);
      var bm = new T.InstancedMesh(HG.banner(col), self.heerMat(), Math.max(1, B.length * 2)); n = 0;
      B.forEach(function (b) { [-1, 1].forEach(function (s2) { var bx2 = b[0] + s2 * BW * 0.32, bz2 = b[1] - sg * (BD / 2 + 0.12); q.setFromAxisAngle(up, ry0 - b[2] + Math.PI / 2); m4.compose(p3.set(bx2, Y + H(bx2, bz2) - 0.02, bz2), q, sc.set(1.3, 1.3, 1.3)); bm.setMatrixAt(n++, m4); }); });
      bm.count = n; bm.raycast = function () { }; bm.computeBoundingSphere(); scene.add(bm);
      // Lagerfeuer hinter jedem 7. Block: dünne Rauchsäule
      B.forEach(function (b, k) {
        if (k % (mob ? 9 : 7) !== 3) return;
        var fx = b[0], fz = b[1] - sg * (BD / 2 + 1.4), puffs = [];
        for (var pp = 0; pp < 3; pp++) { var sp = new T.Sprite(self.smokeMat()); sp.material.color.set(0xb8b4ac); sp.userData.t = pp / 3; scene.add(sp); puffs.push(sp); }
        self.campFires.push({ x: fx, y: Y + H(fx, fz) + 0.1, z: fz, fl: new T.Object3D(), puffs: puffs, big: 1.4, rise: 7 });
      });
    });
    // Frontstädte brennen (schwarzer Rauch über dem Land), weitere Brände breiten sich dort aus (fieldfx)
    var ft = towns.filter(function (t) { return !t.cap && riverD(t.x, t.z) < 40 && t.x > -40; }).sort(function (a, b) { return Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z); });
    this.kFire = [];
    ft.forEach(function (t, k) {
      if (k < (mob ? 2 : 4)) {
        var fx = t.x + (rnd() - 0.5) * t.rad, fz = t.z + (rnd() - 0.5) * t.rad, fy = Y + H(fx, fz), flames = [], puffs = [];
        for (var f2 = 0; f2 < 3; f2++) { var fl = new T.Sprite(self.fireMat()); fl.position.set(fx + (f2 - 1) * 0.3, fy + 0.15, fz); fl.userData.s = [0.5, 0.9]; fl.center.set(0.5, 0.15); scene.add(fl); flames.push(fl); }
        for (var pp = 0; pp < (mob ? 6 : 10); pp++) { var sp = new T.Sprite(self.smokeMat()); sp.material.color.set(0x2a2622); sp.userData.t = pp / 10; scene.add(sp); puffs.push(sp); }
        self.campFires.push({ x: fx, y: fy + 0.3, z: fz, fl: flames[1], flames: flames, puffs: puffs, big: 4.5, rise: 20 });
      } else if (self.kFire.length < 10) self.kFire.push([t.x, t.z]);
    });

    // ---- Marschkolonnen: von beiden Hauptstädten zur Front (läuft über die Kolonnen-Logik in feldherr.js) ----
    this.heer = [];
    main.forEach(function (rd, col) {
      var pts = rd.slice().map(function (p) { return p; }), out = [];
      for (var k = 1; k < pts.length; k++) {
        var a = pts[k - 1], b = pts[k], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (var u = 0; u < len; u += 0.2) { var xx = a[0] + (b[0] - a[0]) * u / len, zz = a[1] + (b[1] - a[1]) * u / len; out.push([xx, zz, H(xx, zz), Math.atan2(b[0] - a[0], b[1] - a[1])]); }
      }
      var MR = mob ? 40 : 90, MC = mob ? 3 : 5, im = new T.InstancedMesh(HG.soldier(col), self.heerMat(), MR * MC);
      for (var k2 = 0; k2 < MR * MC; k2++) im.setColorAt(k2, cc.setScalar(0.8 + rnd() * 0.35));
      im.frustumCulled = false; im.raycast = function () { }; scene.add(im);
      self.heer.push({ im: im, n0: 0, road: out, ph: rnd() * 100, mc: MC });
    });

    // ---- Wolken über dem Kontinent: erst beim Herauszoomen sichtbar ----
    var cvs = document.createElement('canvas'); cvs.width = 256; cvs.height = 128; var cg = cvs.getContext('2d'), cr = Board3D.rnd(55);
    for (k = 0; k < 30; k++) { var cx = 40 + cr() * 176, cy2 = 40 + cr() * 50, crr = 16 + cr() * 26, gg = cg.createRadialGradient(cx, cy2, 0, cx, cy2, crr); gg.addColorStop(0, 'rgba(255,255,255,0.5)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); cg.fillStyle = gg; cg.fillRect(0, 0, 256, 128); }
    var ctex = new T.CanvasTexture(cvs); this.kClouds = [];
    for (k = 0; k < (mob ? 10 : 18); k++) {
      var cs2 = new T.Sprite(new T.SpriteMaterial({ map: ctex, transparent: true, opacity: 0, depthWrite: false, fog: false })), w3 = 50 + cr() * 60;
      cs2.scale.set(w3, w3 * 0.45, 1); cs2.position.set((cr() - 0.5) * 520, Y + 32 + cr() * 18, (cr() - 0.5) * 480 - 20); scene.add(cs2); this.kClouds.push(cs2);
    }
    this.buildSiedlung(hi); // Hütten und Gebietsfarbe auf dem Feld (feldherr.js)
    Board3D.kTowns = towns; // für Tests
  };

  var intro0 = Board3D.prototype.armyIntro;
  Board3D.prototype.armyIntro = function () {
    if (!this.kClouds) return intro0.apply(this, arguments);
    var self = this, o = this.orbit, end = null, vs = this.viewShift, el = this.renderer.domElement, fn, stop = function () { self.tweens.forEach(function (tw) { if (tw.f === fn) tw.start = -1e12; }); };
    function lerp(a, b, k) { return a + (b - a) * k; }
    el.addEventListener('pointerdown', stop, { once: true });
    this.introOn = true;
    return this.tween(this.mobile ? 6500 : 7500, fn = function (k) {
      if (!end) end = { x: o.target.x, y: o.target.y, z: o.target.z, r: o.user ? o.radius : o.fit || o.radius, ph: o.phi0 || o.phi, th: o.thetaGoal };
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      o.target.set(end.x, end.y, end.z); o.radius = Math.exp(lerp(Math.log(200), Math.log(end.r), e)); o.phi = lerp(0.55, end.ph, e);
      o.theta = o.thetaGoal = lerp(end.th - 0.6, end.th, e); self.viewShift = vs * e;
    }).then(function () { el.removeEventListener('pointerdown', stop); self.introOn = false; o.target.set(end.x, end.y, end.z); o.radius = end.r; o.phi = end.ph; o.theta = o.thetaGoal = end.th; self.viewShift = vs; });
  };

  // Kamera: Nahsicht bleibt scharf, weit draußen ein großer Sichtbereich; Wolken erst ab ~60 m Abstand
  var tick0 = Board3D.prototype.fieldTick;
  Board3D.prototype.fieldTick = function (now, dt) {
    var r = tick0.apply(this, arguments);
    if (this.kClouds) {
      var R = this.orbit.radius, cam = this.camera, nr = Math.max(0.1, Math.min(2, R * 0.006));
      if (Math.abs(cam.near - nr) > 0.02 || cam.far !== 3000) { cam.near = nr; cam.far = 3000; cam.updateProjectionMatrix(); }
      var o = 0.85 * sm(55, 140, R);
      this.kClouds.forEach(function (c, i) { c.material.opacity = o; c.position.x += Math.sin(now / 20000 + i) * 0.004; });
    }
    return r;
  };
})();
