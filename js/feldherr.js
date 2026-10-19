// Grenzland, Teil 3: Gelände im Spielfeld und die Masse zweier Länder (nur Optik, Regeln bleiben Shogi).
// Grenzbach im Tal zwischen den Anhöhen, Felsgrat mit Höhle (linke Flanke), Zedernwäldchen und Wachturm-Ruine (rechte Flanke),
// Felsbrocken an Rasterkreuzungen. Hinter beiden Lagern Reserve-Regimenter und Marschkolonnen auf den Straßen:
// winzige Soldaten aus wenigen Quadern, je Land eine Instanz-Liste (1 Draw Call), Fahnen wehen im Vertex-Shader.
(function () {
  if (typeof Board3D === 'undefined') return;
  var T = THREE;
  function sm(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  // kleine Quader mit Farbe und Wind-Gewicht zu einer Geometrie zusammenfügen
  function parts(list) {
    var P = [], N = [], C = [], W = [];
    list.forEach(function (q) {
      var g = (q.cone ? new T.ConeGeometry(q.s[0], q.s[1], 6) : new T.BoxGeometry(q.s[0], q.s[1], q.s[2])).toNonIndexed();
      g.translate(q.p[0], q.p[1], q.p[2]);
      var pa = g.attributes.position, na = g.attributes.normal;
      for (var i = 0; i < pa.count; i++) {
        P.push(pa.getX(i), pa.getY(i), pa.getZ(i)); N.push(na.getX(i), na.getY(i), na.getZ(i)); C.push(q.c[0], q.c[1], q.c[2]);
        W.push(q.w ? Math.max(0, (pa.getX(i) - q.p[0] + q.s[0] / 2) / q.s[0]) * q.w : 0);
      }
    });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(C, 3)); g.setAttribute('aW', new T.Float32BufferAttribute(W, 1));
    return g;
  }
  // Soldat (~0,22 hoch wie die Regimenter), Blick nach -z, Rückenfähnchen in Landesfarbe
  function soldierGeo(col) {
    var ar = col === 0 ? [0.32, 0.12, 0.08] : [0.16, 0.19, 0.26], fl = col === 0 ? [0.86, 0.66, 0.2] : [0.92, 0.92, 0.88], dk = [0.12, 0.1, 0.08];
    return parts([
      { s: [0.05, 0.08, 0.03], p: [0, 0.04, 0], c: dk }, { s: [0.075, 0.085, 0.045], p: [0, 0.12, 0], c: ar },
      { s: [0.035, 0.03, 0.035], p: [0, 0.178, 0], c: [0.62, 0.48, 0.36] }, { cone: 1, s: [0.048, 0.022], p: [0, 0.204, 0], c: dk },
      { s: [0.007, 0.36, 0.007], p: [0.045, 0.18, -0.01], c: [0.36, 0.26, 0.16] }, { s: [0.01, 0.035, 0.01], p: [0.045, 0.375, -0.01], c: [0.8, 0.8, 0.78] },
      { s: [0.004, 0.09, 0.004], p: [0, 0.23, 0.028], c: dk }, { s: [0.045, 0.055, 0.004], p: [0.023, 0.245, 0.03], c: fl, w: 0.35 }
    ]);
  }
  // großes Nobori (Pfahl + Tuch), Tuch weht
  function bannerGeo(col) {
    var cl = col === 0 ? [0.82, 0.6, 0.16] : [0.94, 0.94, 0.9], mon = col === 0 ? [0.1, 0.08, 0.06] : [0.72, 0.1, 0.08];
    return parts([{ s: [0.012, 0.78, 0.012], p: [0, 0.39, 0], c: [0.15, 0.1, 0.07] }, { s: [0.11, 0.012, 0.012], p: [0.055, 0.76, 0], c: [0.15, 0.1, 0.07] },
      { s: [0.11, 0.34, 0.006], p: [0.058, 0.58, 0], c: cl, w: 1 }, { s: [0.05, 0.05, 0.008], p: [0.058, 0.62, 0], c: mon, w: 0.6 }]);
  }
  Board3D.prototype.heerMat = function () {
    if (this._heerMat) return this._heerMat;
    var U = this.fieldU, m = new T.MeshLambertMaterial({ vertexColors: true });
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uTime = U.uTime;
      sh.vertexShader = 'uniform float uTime; attribute float aW;\n' + sh.vertexShader.replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        'vec2 ip = vec2(instanceMatrix[3].x, instanceMatrix[3].z);',
        'transformed.z += sin(uTime * 4.0 + position.x * 30.0 + ip.x * 1.7 + ip.y) * 0.035 * aW;', // Tuch weht
        'transformed.x += sin(uTime * 1.4 + ip.x * 5.0 + ip.y * 3.0) * 0.03 * transformed.y;'].join('\n')); // leichtes Wiegen
    };
    m.customProgramCacheKey = function () { return 'heer'; };
    return (this._heerMat = m);
  };

  var bf0 = Board3D.prototype.buildFeldzug;
  Board3D.prototype.buildFeldzug = function (hi) { bf0.call(this, hi); this.buildFeldGelaende(hi); this.buildHeer(hi); };

  // ---- Gelände im Feld ----
  Board3D.prototype.buildFeldGelaende = function (hi) {
    var self = this, scene = this.scene, Y = this.BT, H = Board3D.fieldH, gh = this.gH, mob = this.mobile, rnd = Board3D.rnd(91), m4 = new T.Matrix4(), p3 = new T.Vector3(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), sc = new T.Vector3();
    var rockM = this.texMat('mossy_rock', 1, 0x7a786e), plank = new T.MeshStandardMaterial({ color: 0x5a4434, roughness: 0.9 });
    // Grenzbach: Wasserband im Bachbett, spiegelt den Himmel
    var P = [], I = [], UV = [], NR = [], k = 0, SZ = Board3D.streamZ, SW = Board3D.streamW;
    for (var x = -9.5; x <= 9.51; x += 0.25) {
      var z = SZ(x), w = 0.4 * SW(x) + 0.01, dz = (SZ(x + 0.05) - SZ(x - 0.05)) / 0.1, nl = Math.hypot(1, dz), nx = -dz / nl * w, nz = 1 / nl * w, y = gh(x, z) + 0.12;
      P.push(x - nx, y, z - nz, x + nx, y, z + nz); UV.push(x * 0.3, 0, x * 0.3, 0.3); NR.push(0, 1, 0, 0, 1, 0);
      if (k) I.push(k * 2 - 2, k * 2, k * 2 - 1, k * 2 - 1, k * 2, k * 2 + 1); k++;
    }
    var wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(P, 3)); wg.setAttribute('normal', new T.Float32BufferAttribute(NR, 3)); wg.setAttribute('uv', new T.Float32BufferAttribute(UV, 2)); wg.setIndex(I);
    var wn = Board3D.waveNormal(), wm = new T.MeshStandardMaterial({ color: 0x35505a, roughness: 0.06, envMapIntensity: 1.2, normalMap: wn, normalScale: new T.Vector2(0.3, 0.3), side: T.DoubleSide });
    var water = new T.Mesh(wg, wm); water.position.y = Y; water.receiveShadow = true; water.raycast = function () { }; scene.add(water);
    (this._skyCbs = this._skyCbs || []).push(function (tx) { wm.envMap = tx; wm.needsUpdate = true; });
    this.tweens.push({ forever: true, f: function (tt) { wn.offset.set(tt * 0.00008, Math.sin(tt / 3000) * 0.01); } });

    // Felsgrat links: Höhle in der Steilwand, Blick zum Feld (+x), zwei Fackeln
    var cz = -2.7, cx = Board3D.ridgeX(cz) - 0.08, cy = Y + H(cx + 0.6, cz), cave = new T.Group();
    var hole = new T.Mesh(new T.CircleGeometry(0.62, 18, 0, Math.PI), new T.MeshBasicMaterial({ color: 0x050403 })); hole.scale.set(1.1, 1.3, 1); cave.add(hole);
    var inner = new T.Mesh(new T.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color: 0x0a0806, side: T.BackSide })); inner.rotation.x = -Math.PI / 2; inner.scale.set(1.15, 1, 1.4); inner.position.z = -0.03; cave.add(inner);
    var arch = new T.Mesh(new T.TorusGeometry(0.72, 0.17, 6, 14, Math.PI), rockM); arch.scale.set(1.05, 1.2, 0.8); arch.castShadow = hi; cave.add(arch);
    cave.position.set(cx, cy - 0.04, cz); cave.rotation.y = Math.PI / 2; cave.traverse(function (o) { if (o.isMesh) o.receiveShadow = true; }); scene.add(cave);
    [-1.05, 1.05].forEach(function (s) {
      var tz = cz + s, tx = Board3D.ridgeX(tz) + 0.35, ty = Y + H(tx, tz), po = new T.Mesh(new T.CylinderGeometry(0.018, 0.024, 0.6, 5), plank); po.position.set(tx, ty + 0.3, tz); scene.add(po);
      var fl = new T.Sprite(self.fireMat()); fl.scale.set(0.13, 0.26, 1); fl.center.set(0.5, 0.15); fl.position.set(tx, ty + 0.6, tz); scene.add(fl);
    });
    // Felsbrocken: am Fuß des Grats und an einigen Rasterkreuzungen (dort stehen keine Soldaten)
    var rocks = [], i, j;
    for (i = 0; i < 9; i++) { var rz = -4.6 + i * 0.5 + (rnd() - 0.5) * 0.3; rocks.push([Board3D.ridgeX(rz) + 0.15 + rnd() * 0.35, rz, 0.1 + rnd() * 0.16]); }
    for (j = 0; j <= 9; j++) for (i = 0; i <= 9; i++) {
      var ix = i - 4.5, iz = j - 4.5, sl = Math.abs(gh(ix + 0.3, iz) - gh(ix - 0.3, iz)) + Math.abs(gh(ix, iz + 0.3) - gh(ix, iz - 0.3));
      if (Math.abs(iz - Board3D.streamZ(ix)) < 0.4 || rnd() > (sl > 0.12 ? 0.6 : 0.12) * (mob ? 0.6 : 1)) continue;
      rocks.push([ix + (rnd() - 0.5) * 0.06, iz + (rnd() - 0.5) * 0.06, 0.045 + rnd() * 0.05]);
    }
    var ri = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), rockM, rocks.length);
    rocks.forEach(function (r, n) { q.setFromAxisAngle(up, rnd() * 6.3); m4.compose(p3.set(r[0], Y + gh(r[0], r[1]) - r[2] * 0.25, r[1]), q, sc.set(r[2] * 1.3, r[2] * 0.75, r[2])); ri.setMatrixAt(n, m4); });
    ri.castShadow = hi; ri.receiveShadow = true; ri.raycast = function () { }; scene.add(ri);

    // Wäldchen: Zedern rechts (Sente-Flanke), Kiefern oben auf dem Grat
    function grove(kind, n, x0, x1, z0, z1, s0, s1) {
      var pts = [];
      for (var a = 0; a < n * 6 && pts.length < n; a++) {
        var x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
        if (Board3D.roadD(x, z) < 1.1 || Math.abs(x) < 9.5 && Math.abs(z - Board3D.streamZ(x)) < 1 || pts.some(function (p) { return Math.hypot(p[0] - x, p[1] - z) < 0.55; })) continue;
        pts.push([x, z]);
      }
      if (!pts.length) return;
      var im = new T.InstancedMesh(Board3D.cardTree(kind), self.foliageMat(kind), pts.length), cc = new T.Color(), pal = self.mood.trees[kind === 'leafy' ? 1 : 0];
      pts.forEach(function (p, n) { var s = s0 + rnd() * (s1 - s0); q.setFromAxisAngle(up, rnd() * 6.3); m4.compose(p3.set(p[0], Y + H(p[0], p[1]) - 0.06, p[1]), q, sc.set(s, s * (0.9 + rnd() * 0.3), s)); im.setMatrixAt(n, m4); im.setColorAt(n, cc.set(pal[n % pal.length]).multiplyScalar(0.85 + rnd() * 0.25)); });
      im.castShadow = hi; im.receiveShadow = true; im.raycast = function () { }; im.computeBoundingSphere(); scene.add(im);
    }
    grove('cedar', mob ? 12 : 22, 6.2, 9.6, 0.8, 4.8, 0.3, 0.46);
    grove('pine', mob ? 5 : 9, -9.5, -6.8, -4.4, -1.0, 0.3, 0.45);

    // Wachturm-Ruine auf der rechten Flanke (Gote-Seite): Steinsockel, Pfosten, halbes Dach
    var wx = 6.7, wz = -4.3, wy = Y + H(wx, wz), tw = new T.Group(), stone = this.texMat('mossy_rock', 1, 0x8a867a);
    tw.add(new T.Mesh(new T.BoxGeometry(0.8, 0.45, 0.8), stone)); tw.children[0].position.y = 0.15;
    [[-0.28, -0.28, 1.25], [0.28, -0.28, 1.25], [-0.28, 0.28, 0.9], [0.28, 0.28, 1.25]].forEach(function (p) { var po = new T.Mesh(new T.BoxGeometry(0.06, p[2], 0.06), plank); po.position.set(p[0], 0.37 + p[2] / 2, p[1]); tw.add(po); });
    var deck = new T.Mesh(new T.BoxGeometry(0.72, 0.05, 0.72), plank); deck.position.y = 1.35; deck.rotation.z = 0.06; tw.add(deck);
    var roof = new T.Mesh(new T.ConeGeometry(0.62, 0.35, 4, 1), new T.MeshStandardMaterial({ color: 0x6a5434, roughness: 1, flatShading: true })); roof.position.set(0.08, 1.85, 0); roof.rotation.set(0.25, Math.PI / 4, 0.3); tw.add(roof);
    tw.position.set(wx, wy - 0.08, wz); tw.rotation.y = 0.4; tw.traverse(function (o) { if (o.isMesh) { o.castShadow = hi; o.receiveShadow = true; } }); scene.add(tw);
  };

  // ---- Reserve-Armeen und Marschkolonnen ----
  Board3D.prototype.buildHeer = function (hi) {
    var self = this, scene = this.scene, Y = this.BT, H = Board3D.fieldH, mob = this.mobile, rnd = Board3D.rnd(313), V = Board3D.VILLAGES, RX = Board3D.riverG;
    var m4 = new T.Matrix4(), p3 = new T.Vector3(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), sc = new T.Vector3(1, 1, 1), cc = new T.Color();
    var COLS = mob ? 10 : 16, ROWS = mob ? 7 : 10, NB = mob ? 4 : 7, SX = 0.17, SZ = 0.2, BW = COLS * SX, BD = ROWS * SZ;
    function okSpot(x, z) {
      var c = [[0, 0], [-BW / 2, -BD / 2], [BW / 2, -BD / 2], [-BW / 2, BD / 2], [BW / 2, BD / 2]], hs = [];
      for (var i = 0; i < c.length; i++) {
        var px = x + c[i][0], pz = z + c[i][1];
        if (V.some(function (v) { return Math.hypot(px - v[0], pz - v[1]) < v[2] + 1.8; }) || Board3D.roadD(px, pz) < 0.9 || Math.abs(px - RX(pz)) < 4.6 || Board3D.terraceQ(px, pz) > 0.05) return false;
        if (Math.hypot(px - Board3D.TEMPLE[0], pz - Board3D.TEMPLE[1]) < 6 || Math.abs(px) < 13 && Math.abs(pz) < 15.3) return false;
        hs.push(H(px, pz));
      }
      return Math.max.apply(null, hs) - Math.min.apply(null, hs) < 0.5;
    }
    var land = [[], []];
    [0, 1].forEach(function (col) {
      var sg = col === 0 ? 1 : -1, cand = [];
      for (var z = 15.8; z <= 25; z += 0.9) for (var x = -20; x <= 20; x += 0.9) if (okSpot(x, z * sg)) cand.push([x, z * sg, Math.abs(x) * 0.6 + (z - 15.8)]);
      cand.sort(function (a, b) { return a[2] - b[2]; });
      cand.forEach(function (c) { if (land[col].length < NB && land[col].every(function (b) { return Math.hypot(b[0] - c[0], b[1] - c[1]) > 4.4; })) land[col].push(c); });
    });
    // Marschkolonnen: Straße vom fernen Land zum Lager (Proben alle 0,2 m mit Höhe und Richtung)
    function path(road, col) {
      var pts = road.slice().reverse(), out = [];
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (var u = 0; u < len; u += 0.2) {
          var x = a[0] + (b[0] - a[0]) * u / len, z = a[1] + (b[1] - a[1]) * u / len;
          if (Math.abs(z) < 15.6) return out; out.push([x, z, H(x, z), Math.atan2(b[0] - a[0], b[1] - a[1])]);
        }
      }
      return out;
    }
    var MR = mob ? 14 : 26, MC = 4;
    this.heer = [];
    [0, 1].forEach(function (col) {
      var road = path(Board3D.ROADS[col === 0 ? 0 : 1], col), nStat = land[col].length * COLS * ROWS, nMarch = road.length > 40 ? MR * MC : 0;
      var im = new T.InstancedMesh(soldierGeo(col), self.heerMat(), nStat + nMarch), n = 0, ry = col === 0 ? Math.PI : 0;
      land[col].forEach(function (b) {
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
          var x = b[0] + (c - (COLS - 1) / 2) * SX + (rnd() - 0.5) * 0.04, z = b[1] + ((r - (ROWS - 1) / 2) * SZ) * (col === 0 ? -1 : 1) + (rnd() - 0.5) * 0.04, s = 0.92 + rnd() * 0.16;
          q.setFromAxisAngle(up, ry + (rnd() - 0.5) * 0.25); m4.compose(p3.set(x, Y + H(x, z) - 0.01, z), q, sc.set(s, s, s)); im.setMatrixAt(n, m4);
          im.setColorAt(n++, cc.setScalar(0.8 + rnd() * 0.35));
        }
      });
      for (var k = 0; k < nMarch; k++) im.setColorAt(nStat + k, cc.setScalar(0.8 + rnd() * 0.35));
      im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.raycast = function () { }; scene.add(im);
      // Nobori: hintere Reihe jedes Blocks
      var bn = land[col].length * 5, bm = new T.InstancedMesh(bannerGeo(col), self.heerMat(), Math.max(1, bn)); n = 0;
      land[col].forEach(function (b) {
        for (var j = 0; j < 5; j++) { var x = b[0] + (j - 2) * BW / 4.4, z = b[1] + (BD / 2 + 0.15) * (col === 0 ? -1 : 1); q.setFromAxisAngle(up, ry + Math.PI / 2 + (rnd() - 0.5) * 0.3); m4.compose(p3.set(x, Y + H(x, z) - 0.02, z), q, sc.set(1, 1, 1)); bm.setMatrixAt(n++, m4); }
      });
      bm.count = bn; bm.castShadow = false; bm.receiveShadow = true; bm.raycast = function () { }; bm.computeBoundingSphere(); scene.add(bm);
      if (nMarch) self.heer.push({ im: im, n0: nStat, road: road, ph: rnd() * 100 });
    });
  };
  // Kolonnen marschieren Richtung Lager; vorn und hinten blenden sie über die Größe ein/aus
  var tick0 = Board3D.prototype.fieldTick;
  Board3D.prototype.fieldTick = function (now, dt) {
    var r = tick0.apply(this, arguments);
    if (!this.heer || !this.heer.length) return r;
    var Y = this.BT, m4 = this._hm4 || (this._hm4 = new T.Matrix4()), p3 = new T.Vector3(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), sc = new T.Vector3(), MC = 4;
    this.heer.forEach(function (C) {
      var R = C.road, L = R.length, nM = C.im.count - C.n0, rows = nM / MC, head = (now / 1000 * 0.9 + C.ph) % L; // 0,9 Proben/s = 0,18 m/s
      for (var r = 0; r < rows; r++) {
        var s = head - r * 1.1; if (s < 0) s += L;
        var i = Math.floor(s), f = s - i, a = R[i], b = R[Math.min(L - 1, i + 1)], fade = sm(0, 6, s) * (1 - sm(L - 6, L - 1, s));
        var x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f, y = a[2] + (b[2] - a[2]) * f, ang = a[3], cs = Math.cos(ang), sn = Math.sin(ang);
        q.setFromAxisAngle(up, ang + Math.PI);
        for (var c = 0; c < MC; c++) {
          var o = (c - 1.5) * 0.17, bob = Math.abs(Math.sin(now / 160 + r * 0.9 + c)) * 0.008;
          m4.compose(p3.set(x + o * cs, Y + y - 0.01 + bob, z - o * sn), q, sc.setScalar(Math.max(0.001, fade))); C.im.setMatrixAt(C.n0 + r * MC + c, m4);
        }
      }
      var ia = C.im.instanceMatrix; if (ia.updateRange) { ia.updateRange.offset = C.n0 * 16; ia.updateRange.count = nM * 16; } ia.needsUpdate = true;
    });
    return r;
  };
})();
