// Spielfeld im Armee-Modus detailreicher (Wunsch 19.10.: „Bodenspuren, Raster als Pflöcke/Seile, Gegnergebiet erkennbar“), nur Optik.
// Gilt für die Schlachtfelder im Menschenmaßstab (Gebirgspass, Flusstal, Belagerung, Sommertag), nicht für Grenzland/Kontinent.
// Boden: eine Textur über dem Feld (Gelände-Shader tLand): Feldmitten zertrampelt, an den Rasterlinien bleibt Gras, Huf- und Wagenspuren,
// Pfützen, Pfeile, Speerschäfte, Steine. Raster: Holzpflöcke an den Kreuzungen mit durchhängendem Strohseil (ein Mesh + eine Instanz-Liste).
// Gegnergebiet (je drei Reihen): an der Grenze ein dickes Shimenawa-Seil mit Papierstreifen (Shide) und Wimpeln in Lagerfarbe.
(function () {
  if (typeof Board3D === 'undefined') return;
  var T = THREE;
  function big(shape) { return shape === 'feldzug' || shape === 'kontinent'; }

  var mood0 = Board3D.prototype.buildMood;
  Board3D.prototype.buildMood = function (hi) {
    mood0.apply(this, arguments);
    if (this.mood && !big(this.mood.shape)) this.buildSpielfeld(hi);
  };

  Board3D.prototype.buildSpielfeld = function (hi) {
    var self = this, scene = this.scene, Y = this.BT, rnd = Board3D.rnd(777), mob = this.mobile, N = Board3D.noise;

    // ---- Bodentextur über ±5 m ----
    var S = 10, L = mob ? 1024 : 2048, px = L / S, c = document.createElement('canvas'); c.width = c.height = L; var g = c.getContext('2d');
    function P(x, z) { return [(x + S / 2) * px, (z + S / 2) * px]; }
    function blob(x, z, r, col, a) { var p = P(x, z), gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * px); gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = gr; g.fillRect(p[0] - r * px, p[1] - r * px, r * 2 * px, r * 2 * px); }
    var i, j, k, x, z;
    // Feldmitten: ausgetretene Erde, ungleichmäßig (mehrere Flecken je Feld), vorn an der Front stärker
    for (j = 0; j < 9; j++) for (i = 0; i < 9; i++) {
      var front = 1 - Math.abs(j - 4) / 5;
      for (k = 0; k < 6; k++) blob(i - 4 + (rnd() - 0.5) * 0.4, j - 4 + (rnd() - 0.5) * 0.4, 0.22 + rnd() * 0.14, ['112,88,60', '92,70,48', '128,104,74'][k % 3], 0.32 + 0.28 * front);
      if (rnd() < 0.5) blob(i - 4 + (rnd() - 0.5) * 0.5, j - 4 + (rnd() - 0.5) * 0.5, 0.1 + rnd() * 0.08, '62,46,32', 0.45 * front + 0.15); // dunkler Schlamm
    }
    // Gras an den Rasterlinien: grüne Büschel-Flecken entlang der Linien (Linie selbst bleibt wie ein Trampelpfad schmal frei)
    for (k = 0; k <= 9; k++) for (var u = -4.5; u <= 4.5; u += 0.06) {
      [[k - 4.5, u], [u, k - 4.5]].forEach(function (q) {
        if (rnd() < 0.55) return;
        var side = (rnd() < 0.5 ? -1 : 1) * (0.06 + rnd() * 0.09), gx = q[0] + (q[0] === k - 4.5 ? side : 0), gz = q[1] + (q[1] === k - 4.5 ? side : 0);
        blob(gx, gz, 0.03 + rnd() * 0.04, rnd() < 0.5 ? '86,112,48' : '104,124,58', 0.55);
      });
    }
    // Wagenspuren: zwei parallele Rillen, schräg übers Feld
    g.lineCap = 'round';
    for (k = 0; k < 2; k++) {
      var x0 = -5 + rnd() * 2, z0 = -3 + rnd() * 6, ang = (rnd() - 0.5) * 0.6 + (k ? Math.PI * 0.08 : -Math.PI * 0.06), pts = [];
      for (var s = 0; s <= 10.5; s += 0.25) pts.push([x0 + Math.cos(ang) * s, z0 + Math.sin(ang) * s + Math.sin(s * 0.5 + k) * 0.25]);
      [-0.09, 0.09].forEach(function (o) {
        [[0.05, 'rgba(70,52,34,0.5)'], [0.022, 'rgba(52,38,26,0.55)']].forEach(function (st) {
          g.strokeStyle = st[1]; g.lineWidth = st[0] * px; g.beginPath();
          pts.forEach(function (p, n) { var q = P(p[0] - Math.sin(ang) * o, p[1] + Math.cos(ang) * o); if (n) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke();
        });
      });
    }
    // Hufspuren: Reiterpfade aus kleinen Hufeisen-Abdrücken
    for (k = 0; k < 5; k++) {
      x = (rnd() - 0.5) * 8; z = (rnd() - 0.5) * 8; var a = rnd() * 6.28, turn = (rnd() - 0.5) * 0.25;
      for (var st2 = 0; st2 < 40; st2++) {
        a += turn * 0.1; x += Math.cos(a) * 0.09; z += Math.sin(a) * 0.09; if (Math.abs(x) > 4.6 || Math.abs(z) > 4.6) break;
        var side2 = st2 % 2 ? 1 : -1, hx = x - Math.sin(a) * 0.035 * side2, hz = z + Math.cos(a) * 0.035 * side2, p = P(hx, hz);
        g.save(); g.translate(p[0], p[1]); g.rotate(a + Math.PI / 2); g.strokeStyle = 'rgba(48,34,22,0.6)'; g.lineWidth = 0.007 * px;
        g.beginPath(); g.arc(0, 0, 0.014 * px, 0.3, Math.PI - 0.3, true); g.stroke(); g.restore();
      }
    }
    // Pfützen: dunkler Schlamm mit nassem Rand
    for (k = 0; k < (mob ? 4 : 6); k++) {
      x = (rnd() - 0.5) * 8; z = (rnd() - 0.5) * 8; var pr = 0.12 + rnd() * 0.16;
      blob(x, z, pr * 1.6, '74,58,40', 0.5);
      for (var b2 = 0; b2 < 4; b2++) blob(x + (rnd() - 0.5) * pr, z + (rnd() - 0.5) * pr * 0.6, pr * (0.5 + rnd() * 0.4), '58,62,62', 0.85);
    }
    // Pfeile (mit Federn), zerbrochene Speerschäfte, Steine: mehr an der Front
    function debrisPos() { var zz; do { zz = (rnd() - 0.5) * 9; } while (rnd() > 0.35 + 0.65 * (1 - Math.abs(zz) / 4.5)); return [(rnd() - 0.5) * 9, zz]; }
    for (k = 0; k < (mob ? 160 : 300); k++) {
      var d = debrisPos(), p2 = P(d[0], d[1]), r2 = rnd() * 6.28, kind = rnd();
      g.save(); g.translate(p2[0], p2[1]); g.rotate(r2);
      if (kind < 0.55) { // Pfeil
        var len = (0.17 + rnd() * 0.06) * px; g.strokeStyle = 'rgba(40,28,18,0.95)'; g.lineWidth = Math.max(1.5, 0.008 * px); g.beginPath(); g.moveTo(-len / 2, 0); g.lineTo(len / 2, 0); g.stroke();
        g.fillStyle = 'rgba(230,226,214,0.9)'; g.beginPath(); g.moveTo(-len / 2, 0); g.lineTo(-len / 2 + 0.045 * px, -0.013 * px); g.lineTo(-len / 2 + 0.045 * px, 0.013 * px); g.fill();
      } else if (kind < 0.75) { // Speerschaft, gebrochen
        var l2 = (0.25 + rnd() * 0.2) * px; g.strokeStyle = 'rgba(92,66,40,0.9)'; g.lineWidth = Math.max(1.5, 0.011 * px); g.beginPath(); g.moveTo(-l2 / 2, 0); g.lineTo(l2 / 2, 0); g.stroke();
        if (rnd() < 0.5) { g.fillStyle = 'rgba(150,150,146,0.9)'; g.fillRect(l2 / 2, -0.007 * px, 0.04 * px, 0.014 * px); }
      } else { // Stein
        var sr = (0.012 + rnd() * 0.02) * px; g.fillStyle = 'rgba(' + (110 + rnd() * 30 | 0) + ',' + (106 + rnd() * 26 | 0) + ',100,0.9)'; g.beginPath(); g.ellipse(0, 0, sr, sr * 0.75, 0, 0, 6.28); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(-sr * 0.25, -sr * 0.2, sr * 0.45, sr * 0.3, 0, 0, 6.28); g.fill();
      }
      g.restore();
    }
    var fc = [new T.Color(0x1c1814), new T.Color(0xf1ede4)]; // Wimpel wie die Feldzeichen: Sente schwarz, Gote weiß
    // Außenrand weich ausblenden (Feldrand geht ins Gelände über)
    g.globalCompositeOperation = 'destination-in'; var ctr = P(0, 0), fe = g.createRadialGradient(ctr[0], ctr[1], 4.9 * px, ctr[0], ctr[1], 6.6 * px);
    fe.addColorStop(0, 'rgba(0,0,0,1)'); fe.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fe; g.fillRect(0, 0, L, L); g.globalCompositeOperation = 'source-over';
    var lt = new T.CanvasTexture(c); lt.colorSpace = T.SRGBColorSpace; lt.flipY = false; lt.anisotropy = 8;
    if (this.fieldU && !this.fieldU.tLand.value) { this.fieldU.tLand.value = lt; this.fieldU.uLand.value = 1; this.fieldU.uLandS.value = S; }

    // ---- Raster: Pflöcke an den Kreuzungen, Strohseil dazwischen (hängt durch) ----
    var wood = new T.MeshStandardMaterial({ color: 0x6a4c30, roughness: 0.9 }), straw = new T.MeshStandardMaterial({ color: 0xc8b07a, roughness: 0.95 });
    var stakeG = new T.CylinderGeometry(0.011, 0.014, 1, 5); stakeG.translate(0, 0.5, 0);
    var stakes = new T.InstancedMesh(stakeG, wood, 100), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p3 = new T.Vector3(), sc = new T.Vector3(), top = [];
    for (j = 0; j <= 9; j++) for (i = 0; i <= 9; i++) {
      x = i - 4.5; z = j - 4.5; var edge = i === 0 || i === 9 || j === 0 || j === 9, zone = j === 3 || j === 6, h = edge || zone ? 0.11 : 0.075, tx = (rnd() - 0.5) * 0.12, tz = (rnd() - 0.5) * 0.12;
      e.set(tx, 0, tz); q.setFromEuler(e); m4.compose(p3.set(x, Y - 0.01, z), q, sc.set(edge || zone ? 1.3 : 1, h, edge || zone ? 1.3 : 1)); stakes.setMatrixAt(j * 10 + i, m4);
      top[j * 10 + i] = new T.Vector3(x + Math.sin(tz) * -h * 0.9, Y + h * 0.9, z + Math.sin(tx) * h * 0.9);
    }
    stakes.castShadow = hi; stakes.receiveShadow = true; stakes.raycast = function () { }; scene.add(stakes);
    // Seile: je Spanne eine Kurve mit Durchhang; Gegnergebiet-Grenze (z = ±1,5) dickes Shimenawa
    var thin = [], thick = [];
    function span(a, b, sag) { var pts = []; for (var n = 0; n <= 6; n++) { var t = n / 6, v = a.clone().lerp(b, t); v.y -= Math.sin(t * Math.PI) * sag; pts.push(v); } return new T.CatmullRomCurve3(pts); }
    for (j = 0; j <= 9; j++) for (i = 0; i <= 9; i++) {
      var A = top[j * 10 + i];
      if (i < 9) (j === 3 || j === 6 ? thick : thin).push(span(A, top[j * 10 + i + 1], j === 3 || j === 6 ? 0.035 : 0.03));
      if (j < 9) thin.push(span(A, top[(j + 1) * 10 + i], 0.03));
    }
    function tubes(list, r) {
      var parts = list.map(function (cv) { return new T.TubeGeometry(cv, 8, r, 4, false).toNonIndexed(); }), n = 0, pos, nor, o = 0;
      parts.forEach(function (pg) { n += pg.attributes.position.count; }); pos = new Float32Array(n * 3); nor = new Float32Array(n * 3);
      parts.forEach(function (pg) { pos.set(pg.attributes.position.array, o); nor.set(pg.attributes.normal.array, o); o += pg.attributes.position.array.length; pg.dispose(); });
      var gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(pos, 3)); gg.setAttribute('normal', new T.BufferAttribute(nor, 3)); return gg;
    }
    [[thin, 0.0035], [thick, 0.013]].forEach(function (q2) { var mm = new T.Mesh(tubes(q2[0], q2[1]), straw); mm.castShadow = hi; mm.receiveShadow = true; mm.raycast = function () { }; scene.add(mm); });
    // Shide: weiße Papierstreifen im Zickzack am Shimenawa, Wimpel in Lagerfarbe an den Grenzpflöcken
    var shG = new T.PlaneGeometry(0.026, 0.075); shG.translate(0, -0.04, 0);
    var shide = new T.InstancedMesh(shG, new T.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.8, side: T.DoubleSide }), 2 * 9 * 3), ns = 0;
    thick.forEach(function (cv) { [0.2, 0.5, 0.8].forEach(function (t) { var v = cv.getPoint(t); q.setFromAxisAngle(new T.Vector3(0, 1, 0), (rnd() - 0.5) * 0.4); m4.compose(v, q, sc.set(1, 1, 1)); shide.setMatrixAt(ns++, m4); }); });
    shide.count = ns; shide.raycast = function () { }; scene.add(shide);
    var penG = new T.BufferGeometry(); penG.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 0, -0.08, 0, 0.17, -0.04, 0], 3)); penG.computeVertexNormals();
    this.spPennants = [];
    [3, 6].forEach(function (jj) {
      var col = jj === 6 ? 0 : 1, pm = new T.MeshStandardMaterial({ color: fc[col], roughness: 0.7, side: T.DoubleSide });
      for (var ii = 0; ii <= 9; ii++) { var pen = new T.Mesh(penG, pm.clone()) /* eigenes Material: mergeStatic fasst es nicht zusammen */, tp = top[jj * 10 + ii]; pen.position.set(tp.x, tp.y + 0.005, tp.z); pen.raycast = function () { }; scene.add(pen); self.spPennants.push(pen); }
    });
    if (this.fieldGrid) this.fieldGrid.visible = false; // gemaltes Raster nicht mehr nötig
  };

  // Wimpel flattern
  var tick0 = Board3D.prototype.fieldTick;
  Board3D.prototype.fieldTick = function (now, dt) {
    var r = tick0.apply(this, arguments);
    if (this.spPennants) this.spPennants.forEach(function (p, i) { p.rotation.y = 0.6 + Math.sin(now / 420 + i * 1.3) * 0.35; });
    return r;
  };
})();
