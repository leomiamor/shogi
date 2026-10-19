// Schlachtfeld der Hunde-Edition „Rudel der Rassen“: verspielt und freundlich, kein Feuer, kein Rauch, keine Ruinen.
// Bauernhof (rote Scheune, Silo, Heuballen, Zäune, Felder, Windrad), Hundeschau (Agility-Parcours, Tribüne mit Wimpelketten, Siegerpodest),
// Stadtpark (Teich, Springbrunnen, Bänke, Laternen, Wege). Lager: Hundehütten in Rudelfarbe, Wimpelketten, Näpfe, Bälle, Hydrant.
(function () {
  if (typeof Board3D === 'undefined' || !Board3D.edMood) return;
  var T = THREE;
  var PACK = [{ c: 0x2a8ad8, roof: 0x1c5a9a }, { c: 0xd84a3a, roof: 0x9a2a22 }];
  var BUNT = [0xff5a5a, 0xffd23f, 0x46d7ff, 0x7ad84a, 0xff9ad8, 0xffffff];
  // Wimpelkette zwischen zwei Punkten (durchhängend), bunte Dreiecke als Instanzen
  function bunting(K, scene, segs, n, cols) {
    // alle Ketten in einem Aufruf: eine Instanz-Gruppe für die Dreiecke, eine Linie für die Schnüre (spart Draw-Calls am Handy)
    var tri = new T.BufferGeometry(); tri.setAttribute('position', new T.Float32BufferAttribute([-0.06, 0, 0, 0.06, 0, 0, 0, -0.12, 0], 3)); tri.computeVertexNormals();
    var im = new T.InstancedMesh(tri, new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: 0.8 }), segs.length * n), m4 = new T.Matrix4(), q = new T.Quaternion(), c = new T.Color(), one = new T.Vector3(1, 1, 1), k = 0, L = [];
    segs.forEach(function (sg) {
      var a = sg[0], b = sg[1], sag = 0.18 * a.distanceTo(b) / 3, pt = function (t) { var v = a.clone().lerp(b, t); v.y -= Math.sin(t * Math.PI) * sag; return v; };
      q.setFromAxisAngle(new T.Vector3(0, 1, 0), -Math.atan2(b.z - a.z, b.x - a.x));
      for (var i = 0; i < n; i++) { m4.compose(pt((i + 0.5) / n), q, one); im.setMatrixAt(k, m4); im.setColorAt(k++, c.set(cols[i % cols.length])); }
      for (var u = 0; u < 10; u++) { var p0 = pt(u / 10), p1 = pt((u + 1) / 10); L.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z); }
    });
    im.raycast = function () { }; scene.add(im);
    var lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(L, 3)); var line = new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0x3a3028 })); line.raycast = function () { }; scene.add(line);
  }
  // Hundehütte: Kasten, Satteldach in Rudelfarbe, runde Tür, Napf davor
  function kennel(K, wallM, roofM, s) {
    var g = new T.Group(); K.box(g, 0.5 * s, 0.36 * s, 0.6 * s, wallM, 0, 0.18 * s, 0);
    var sh = new T.Shape(); sh.moveTo(-0.3 * s, 0); sh.lineTo(0, 0.24 * s); sh.lineTo(0.3 * s, 0); sh.lineTo(-0.3 * s, 0);
    var rg = new T.ExtrudeGeometry(sh, { depth: 0.68 * s, bevelEnabled: false }); rg.translate(0, 0.36 * s, -0.34 * s); g.add(new T.Mesh(rg, roofM));
    var door = new T.Mesh(new T.CircleGeometry(0.12 * s, 14, 0, Math.PI), new T.MeshBasicMaterial({ color: 0x1a1410 })); door.position.set(0, 0.03 * s, 0.302 * s); g.add(door);
    var dr = new T.Mesh(new T.PlaneGeometry(0.24 * s, 0.03 * s), new T.MeshBasicMaterial({ color: 0x1a1410 })); dr.position.set(0, 0.015 * s, 0.302 * s); g.add(dr);
    return g;
  }
  Board3D.EDITION_CAMP.hunde = function (col, hi, MD) {
    var self = this, K = Board3D.edKit(this, hi), zs = col === 0 ? 1 : -1, P = PACK[col], scene = this.scene, Y = this.BT, H = Board3D.fieldH;
    var wallM = K.std(0xf0e6d0, { roughness: 0.85 }), roofM = K.std(P.roof, { roughness: 0.7 }), packM = K.std(P.c, { roughness: 0.6 }), wood = K.std(0x8a6a48);
    // Hundehütten in Reihen, große Rudel-Hütte hinten in der Mitte
    var big = kennel(K, wallM, roofM, 2.4); K.at(big, 0, 12.4 * zs, col === 0 ? Math.PI : 0);
    for (var side = -1; side <= 1; side += 2) for (var r = 0; r < 2; r++) for (var k = 0; k < 4; k++) K.at(kennel(K, wallM, roofM, 1), side * (7.2 + k * 1.0 + r * 0.45), (7.6 + r * 1.4 + (k % 2) * 0.2) * zs, (col === 0 ? Math.PI : 0) + (Math.random() - 0.5) * 0.3);
    // Näpfe, Tennisbälle, Knochen, Hydrant
    var bowlG = new T.CylinderGeometry(0.07, 0.05, 0.04, 12), ballM = K.std(0xd8f040, { roughness: 0.9 }), boneM = K.std(0xf4efe4);
    for (var b = 0; b < 10; b++) { var x = (b < 5 ? -1 : 1) * (6.6 + (b % 5) * 0.9), z = (7.1 + (b % 2) * 1.5) * zs, g = new T.Group(); var bw = new T.Mesh(bowlG, packM); bw.position.y = 0.02; g.add(bw); K.at(g, x, z); }
    for (var t = 0; t < 14; t++) { var bx = (Math.random() - 0.5) * 9, bz = (6.4 + Math.random() * 6) * zs; if (Math.abs(bx) < 1.5) continue; var g2 = new T.Group(); if (t % 3) { var bl = new T.Mesh(new T.SphereGeometry(0.035, 10, 8), ballM); bl.position.y = 0.035; g2.add(bl); } else { K.box(g2, 0.16, 0.025, 0.03, boneM, 0, 0.015, 0); [-0.08, 0.08].forEach(function (e) { var kn = new T.Mesh(new T.SphereGeometry(0.022, 8, 6), boneM); kn.position.set(e, 0.02, 0.012); g2.add(kn); var kn2 = kn.clone(); kn2.position.z = -0.012; g2.add(kn2); }); } K.at(g2, bx, bz, Math.random() * 6); }
    var hyd = new T.Group(), hm = K.std(0xd8302a, { roughness: 0.5 }); K.cyl(hyd, 0.06, 0.07, 0.26, hm); var hc = new T.Mesh(new T.SphereGeometry(0.065, 10, 6, 0, 6.3, 0, 1.6), hm); hc.position.y = 0.26; hyd.add(hc); K.cyl(hyd, 0.025, 0.025, 0.2, hm, 0, 0.17, 0).rotation.z = Math.PI / 2; K.at(hyd, -5.6 * (col ? -1 : 1), 6.5 * zs);
    // Wimpelketten zwischen Pfosten über dem Lager, Rudelfahnen (wehen)
    var posts = [[-11, 6.5], [-6.3, 6.5], [-6.3, 11.5], [-11, 11.5], [6.3, 6.5], [11, 6.5], [11, 11.5], [6.3, 11.5]];
    posts.forEach(function (p) { var g3 = new T.Group(); K.cyl(g3, 0.02, 0.025, 1.1, wood); K.at(g3, p[0], p[1] * zs); });
    bunting(K, scene, [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7]].map(function (e) { var a = posts[e[0]], c = posts[e[1]]; return [new T.Vector3(a[0], Y + H(a[0], a[1] * zs) + 1.05, a[1] * zs), new T.Vector3(c[0], Y + H(c[0], c[1] * zs) + 1.05, c[1] * zs)]; }), 14, BUNT);
    var c2 = document.createElement('canvas'); c2.width = 64; c2.height = 192; var g4 = c2.getContext('2d'); g4.fillStyle = '#' + new T.Color(P.c).getHexString(); g4.fillRect(0, 0, 64, 192); g4.fillStyle = '#fff';
    // Pfotenabdruck
    [[32, 110, 16], [16, 82, 7], [28, 74, 7], [40, 74, 7], [50, 82, 7]].forEach(function (d) { g4.beginPath(); g4.ellipse(d[0], d[1], d[2], d[2] * 1.15, 0, 0, 6.3); g4.fill(); });
    var ft = new T.CanvasTexture(c2); ft.colorSpace = T.SRGBColorSpace; var fm = new T.MeshStandardMaterial({ map: ft, side: T.DoubleSide, roughness: 0.7 });
    for (var n = 0; n < 8; n++) { var fg = new T.Group(); K.flag(fg, fm, 0, 0, 1.0, 0.17, 0.42); K.at(fg, (n < 4 ? -1 : 1) * (5.9 + (n % 4) * 0.8), (6.0 + (n % 2) * 0.2) * zs, col === 1 ? Math.PI : 0); }
  };

  function hundeBuild(hi, MD) {
    var self = this, scene = this.scene, Y = this.BT, H = Board3D.fieldH, K = Board3D.edKit(this, hi), mob = this.mobile, rnd = Board3D.rnd(4711);
    var red = K.std(0xa8322a, { roughness: 0.8 }), white = K.std(0xf4f0e8, { roughness: 0.7 }), wood = K.std(0x8a6a48), hayM = K.std(0xd8b860, { roughness: 1 }), metal = K.std(0xb8bcc0, { metalness: 0.6, roughness: 0.4 });
    // ---- Bauernhof: rote Scheune, Silo, Heuballen, Zäune, Felder, Windrad ----
    if (MD.farm) {
      var fp = MD.farm, g = new T.Group();
      K.box(g, 6, 3.4, 4, red, 0, 1.7, 0); var sh = new T.Shape(); sh.moveTo(-3.3, 0); sh.lineTo(-2.4, 1.6); sh.lineTo(0, 2.6); sh.lineTo(2.4, 1.6); sh.lineTo(3.3, 0); sh.lineTo(-3.3, 0);
      var rg = new T.ExtrudeGeometry(sh, { depth: 4.3, bevelEnabled: false }); rg.translate(0, 3.4, -2.15); g.add(new T.Mesh(rg, K.std(0x5a4a44)));
      K.box(g, 2, 2.4, 0.08, white, 0, 1.2, 2.02); K.box(g, 0.1, 2.6, 0.1, white, 0, 1.2, 2.06).rotation.z = 0.7; K.box(g, 0.1, 2.6, 0.1, white, 0, 1.2, 2.06).rotation.z = -0.7;
      K.cyl(g, 1.1, 1.1, 6.5, metal, 4.4, 3.25, -0.5, 16); var dome = new T.Mesh(new T.SphereGeometry(1.1, 16, 8, 0, 6.3, 0, 1.57), metal); dome.position.set(4.4, 6.5, -0.5); g.add(dome);
      g.rotation.y = fp[2]; K.at(g, fp[0], fp[1], fp[2], 0.05);
      // Bauernhaus
      var hs = new T.Group(); K.box(hs, 3, 2, 2.4, white, 0, 1, 0); var hr = new T.Mesh(new T.ConeGeometry(2.3, 1.4, 4), red); hr.rotation.y = Math.PI / 4; hr.scale.set(1, 1, 0.8); hr.position.y = 2.7; hs.add(hr);
      K.at(hs, fp[0] - 8, fp[1] + 2, 0.3);
    }
    // Heuballen (Rundballen), auch im Vorfeld
    var baleG = new T.CylinderGeometry(0.42, 0.42, 0.5, 14); baleG.rotateZ(Math.PI / 2);
    for (var k = 0; k < (MD.bales || 0); k++) {
      var a = rnd() * 6.283, d = 7 + rnd() * 20, x = Math.cos(a) * d * 1.2, z = Math.sin(a) * d; if (Math.abs(x) < 13 && Math.abs(z) < 15) continue; if (Board3D.fieldE(x, z) < 2) continue;
      var bg = new T.Group(); var bl = new T.Mesh(baleG, hayM); bl.position.y = 0.4; bg.add(bl); K.at(bg, x, z, rnd() * 6);
    }
    // Felder: Reihen aus kleinen grünen/gelben Pflanzen (Instanzen) hinter dem Hof
    if (MD.fields) {
      var cropG = new T.ConeGeometry(0.12, 0.35, 5); cropG.translate(0, 0.17, 0);
      var cn = mob ? 1500 : 4000, im = new T.InstancedMesh(cropG, new T.MeshLambertMaterial({ color: 0xffffff }), cn), m4 = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), p3 = new T.Vector3(), sc = new T.Vector3(), cc = new T.Color(), n = 0;
      MD.fields.forEach(function (f, fi) { var col = fi % 2 ? [0.95, 0.8, 0.3] : [0.45, 0.75, 0.3]; for (var rr = 0; rr < 14 && n < cn; rr++) for (var c = 0; c < 40 && n < cn; c++) {
        var lx = (c - 20) * 0.4, lz = (rr - 7) * 0.6, ca = Math.cos(f[2]), sa = Math.sin(f[2]), x = f[0] + lx * ca - lz * sa, z = f[1] + lx * sa + lz * ca;
        q.setFromAxisAngle(up, rnd() * 6); m4.compose(p3.set(x, Y + H(x, z), z), q, sc.setScalar(0.8 + rnd() * 0.5)); im.setMatrixAt(n, m4); im.setColorAt(n++, cc.setRGB(col[0] * (0.85 + rnd() * 0.3), col[1], col[2])); } });
      im.count = n; im.raycast = function () { }; scene.add(im);
    }
    // Windrad (Westernmühle) dreht sich
    if (MD.wind) { var wg = new T.Group(), w = MD.wind; for (var l = 0; l < 4; l++) { var leg = K.cyl(wg, 0.04, 0.06, 6, metal, (l % 2 ? 1 : -1) * 0.5, 3, (l < 2 ? 1 : -1) * 0.5, 4); leg.rotation.set((l < 2 ? -1 : 1) * 0.08, 0, (l % 2 ? -1 : 1) * 0.08); }
      var rot = new T.Group(); rot.position.set(0, 6.1, 0.3); wg.add(rot); var bladeM = new T.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.4, roughness: 0.5, transparent: true, opacity: 1 });
      for (var k2 = 0; k2 < 12; k2++) { var bd = new T.Mesh(new T.BoxGeometry(0.18, 1.3, 0.02), bladeM); bd.position.set(Math.sin(k2 / 12 * 6.283) * 0.7, Math.cos(k2 / 12 * 6.283) * 0.7, 0); bd.rotation.z = -k2 / 12 * 6.283; rot.add(bd); }
      K.at(wg, w[0], w[1], 0.4); this.tweens.push({ forever: true, f: function (t) { rot.rotation.z = t / 600; } }); }
    // Weidezäune (Holz, zwei Latten) entlang von Linien
    (MD.fences || []).forEach(function (f) {
      var a = new T.Vector2(f[0], f[1]), b = new T.Vector2(f[2], f[3]), len = a.distanceTo(b), n2 = Math.ceil(len / 1.2), ang = Math.atan2(b.y - a.y, b.x - a.x);
      for (var i = 0; i < n2; i++) { var u = i / n2, x = a.x + (b.x - a.x) * u, z = a.y + (b.y - a.y) * u, g5 = new T.Group(); K.box(g5, 0.06, 0.5, 0.06, f[4] ? white : wood, 0, 0.25, 0); var r1 = K.box(g5, 1.2, 0.05, 0.03, f[4] ? white : wood, 0.6, 0.38, 0); var r2 = K.box(g5, 1.2, 0.05, 0.03, f[4] ? white : wood, 0.6, 0.18, 0); K.at(g5, x, z, -ang); }
    });
    // ---- Hundeschau: Agility (Hürden, Tunnel, Slalomstangen), Tribüne mit Wimpelketten, Siegerpodest, Festzelte ----
    if (MD.show) {
      var stripeM = function (c1) { var c = document.createElement('canvas'); c.width = 64; c.height = 8; var g6 = c.getContext('2d'); for (var x2 = 0; x2 < 64; x2 += 16) { g6.fillStyle = (x2 / 16) % 2 ? '#ffffff' : c1; g6.fillRect(x2, 0, 16, 8); } var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return new T.MeshStandardMaterial({ map: t, roughness: 0.6 }); };
      var sR = stripeM('#e83a3a'), sB = stripeM('#2a7ad8');
      [[-9, -8], [-11, -3], [10, -7], [12, -2], [-10, 3], [11, 3]].forEach(function (p, i) { var g7 = new T.Group(); K.box(g7, 0.05, 0.6, 0.05, white, -0.5, 0.3, 0); K.box(g7, 0.05, 0.6, 0.05, white, 0.5, 0.3, 0); K.box(g7, 1, 0.04, 0.04, i % 2 ? sR : sB, 0, 0.4, 0); K.at(g7, p[0], p[1], 0.3 * (i % 3)); });
      var tun = new T.Mesh(new T.TorusGeometry(1.4, 0.32, 10, 16, Math.PI * 0.9), K.std(0x2ab84a, { roughness: 0.7, side: T.DoubleSide })); tun.rotation.x = Math.PI / 2; var tg = new T.Group(); tun.position.y = 0.3; tun.rotation.set(0, 0, 0); tun.scale.set(1, 1, 1); var tg2 = new T.Group(); var tc = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 2.8, 14, 1, true), K.std(0x2ab84a, { side: T.DoubleSide })); tc.rotation.z = Math.PI / 2; tc.position.y = 0.33; tg2.add(tc); K.at(tg2, -13, -9, 0.5);
      for (var k3 = 0; k3 < 8; k3++) { var pg = new T.Group(); K.cyl(pg, 0.02, 0.02, 0.8, k3 % 2 ? sR : sB, 0, 0.4, 0, 6); K.at(pg, 12 + k3 * 0.4, -10); }
      // Tribüne: Stufen mit Zuschauerflecken, Dach, Wimpelkette
      var st = new T.Group(); for (var s = 0; s < 5; s++) K.box(st, 14, 0.4, 0.8, s % 2 ? white : K.std(0x3a6ab8), 0, 0.2 + s * 0.4, -s * 0.8);
      var crowd = new T.InstancedMesh(new T.SphereGeometry(0.16, 6, 4), new T.MeshLambertMaterial(), mob ? 120 : 260), m5 = new T.Matrix4(), c5 = new T.Color();
      for (var k4 = 0; k4 < crowd.count; k4++) { m5.makeTranslation((rnd() - 0.5) * 13, 0.55 + (k4 % 5) * 0.4, -(k4 % 5) * 0.8); crowd.setMatrixAt(k4, m5); crowd.setColorAt(k4, c5.set(BUNT[k4 % BUNT.length]).multiplyScalar(0.8)); }
      st.add(crowd); K.box(st, 14.4, 0.1, 4.4, white, 0, 3.6, -1.6); [-7, 7].forEach(function (x) { K.box(st, 0.12, 3.6, 0.12, white, x, 1.8, 0.4); K.box(st, 0.12, 3.6, 0.12, white, x, 1.8, -3.6); });
      K.at(st, 0, -22); bunting(K, scene, [[new T.Vector3(-7, Y + H(-7, -21.6) + 3.5, -21.6), new T.Vector3(7, Y + H(7, -21.6) + 3.5, -21.6)]], 30, BUNT);
      // Siegerpodest 1-2-3
      var pd = new T.Group(); [[0, 0.9, 0xffd23f], [-1, 0.6, 0xc8ccd0], [1, 0.4, 0xc87a3a]].forEach(function (p) { K.box(pd, 0.95, p[1], 0.9, K.std(p[2], { metalness: 0.3, roughness: 0.5 }), p[0], p[1] / 2, 0); }); K.at(pd, -16, -15, 0.4);
      // Festzelte (weiß mit Spitzdach)
      [[15, -15], [18, -12], [-18, -11]].forEach(function (p) { var g8 = new T.Group(); K.box(g8, 2.6, 1.2, 2.6, white, 0, 0.6, 0); var tr = new T.Mesh(new T.ConeGeometry(2.2, 1.4, 4), white); tr.rotation.y = Math.PI / 4; tr.position.y = 1.9; g8.add(tr); K.at(g8, p[0], p[1], 0.2); });
      // Riesen-Rosette (Schleife) am Tribünendach
      var rc = document.createElement('canvas'); rc.width = rc.height = 128; var rg2 = rc.getContext('2d'); for (var k5 = 0; k5 < 24; k5++) { rg2.fillStyle = k5 % 2 ? '#2a7ad8' : '#4a9ae8'; rg2.beginPath(); rg2.moveTo(64, 64); rg2.arc(64, 64, 60, k5 / 24 * 6.283, (k5 + 1) / 24 * 6.283); rg2.fill(); }
      rg2.fillStyle = '#ffd23f'; rg2.beginPath(); rg2.arc(64, 64, 26, 0, 6.3); rg2.fill(); rg2.fillStyle = '#2a2a2a'; rg2.font = 'bold 26px sans-serif'; rg2.textAlign = 'center'; rg2.textBaseline = 'middle'; rg2.fillText('1', 64, 66);
      var ros = new T.Mesh(new T.CircleGeometry(1.2, 24), new T.MeshStandardMaterial({ map: new T.CanvasTexture(rc), side: T.DoubleSide })); ros.position.set(0, Y + H(0, -22) + 4.5, -21.5); scene.add(ros);
    }
    // ---- Stadtpark: Teich, Springbrunnen, Wege, Bänke, Laternen, ferne Häuser ----
    if (MD.park) {
      var water = new T.Mesh(new T.CircleGeometry(4, 32), new T.MeshStandardMaterial({ color: 0x3a6a7a, roughness: 0.08, metalness: 0.1 })); water.rotation.x = -Math.PI / 2; water.scale.set(1.6, 1, 1); water.position.set(-15, Y + H(-15, -12) + 0.03, -12); scene.add(water);
      (this._skyCbs = this._skyCbs || []).push(function (tx) { water.material.envMap = tx; water.material.needsUpdate = true; });
      var rim = new T.Mesh(new T.TorusGeometry(4, 0.12, 6, 32), K.std(0x9a958c)); rim.rotation.x = Math.PI / 2; rim.scale.set(1.6, 1, 1); rim.position.copy(water.position); scene.add(rim);
      var fn = new T.Group(), sto = K.std(0xc8c0b0); K.cyl(fn, 1.6, 1.7, 0.4, sto, 0, 0.2, 0, 20); K.cyl(fn, 0.15, 0.2, 1, sto, 0, 0.6, 0, 8); K.cyl(fn, 0.7, 0.4, 0.15, sto, 0, 1.1, 0, 14);
      var jet = new T.Mesh(new T.ConeGeometry(0.25, 1.2, 10, 1, true), new T.MeshBasicMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.45, depthWrite: false })); jet.position.y = 1.7; jet.rotation.x = Math.PI; fn.add(jet); K.at(fn, 14, -12);
      this.tweens.push({ forever: true, f: function (t) { jet.scale.y = 0.9 + Math.sin(t / 150) * 0.1; } });
      var bench = function (x, z, r) { var g9 = new T.Group(); K.box(g9, 1, 0.05, 0.3, wood, 0, 0.3, 0); K.box(g9, 1, 0.25, 0.04, wood, 0, 0.48, -0.14); [-0.42, 0.42].forEach(function (e) { K.box(g9, 0.04, 0.3, 0.3, K.dark, e, 0.15, 0); }); K.at(g9, x, z, r); };
      [[-7.5, -2, 1.57], [7.5, -2, -1.57], [-7.5, 3, 1.57], [7.5, 3, -1.57], [-11, -14, 0.3], [11, -16, -0.3]].forEach(function (b) { bench(b[0], b[1], b[2]); });
      var lampM = new T.MeshBasicMaterial({ color: 0xfff0c8 });
      [[-6.5, -6], [6.5, -6], [-6.5, 6], [6.5, 6], [-12, -8], [12, -8]].forEach(function (p) { var g10 = new T.Group(); K.cyl(g10, 0.03, 0.04, 1.4, K.dark); var gl = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), lampM); gl.position.y = 1.45; g10.add(gl); K.at(g10, p[0], p[1]); });
      // Stadthäuser in der Ferne (hell, bunt)
      var hc = [0xf0e0c8, 0xe8c8b0, 0xd8e0e8, 0xf4f0e0, 0xe0d0e8], hG = new T.BoxGeometry(1, 1, 1); hG.translate(0, 0.5, 0);
      var hi2 = new T.InstancedMesh(hG, new T.MeshStandardMaterial({ map: Board3D.parkFacade(), roughness: 0.9 }), mob ? 30 : 60), m6 = new T.Matrix4(), q6 = new T.Quaternion(), c6 = new T.Color(), n6 = 0;
      for (var k6 = 0; k6 < 300 && n6 < hi2.count; k6++) { var a6 = -Math.PI / 2 + (rnd() - 0.5) * 2.6, d6 = 34 + rnd() * 20, x6 = Math.cos(a6) * d6 * 1.3, z6 = Math.sin(a6) * d6; q6.setFromAxisAngle(new T.Vector3(0, 1, 0), -a6); m6.compose(new T.Vector3(x6, Y + H(x6, z6) - 0.1, z6), q6, new T.Vector3(3 + rnd() * 3, 3 + rnd() * 7, 3 + rnd() * 2)); hi2.setMatrixAt(n6, m6); hi2.setColorAt(n6++, c6.set(hc[k6 % hc.length])); }
      hi2.count = n6; hi2.raycast = function () { }; scene.add(hi2);
    }
    // Ballons (Hundeschau, Park): schweben langsam
    this.edShips = this.edShips || [];
    for (var k7 = 0; k7 < (MD.balloons || 0); k7++) {
      var bg2 = new T.Group(), bm = new T.MeshStandardMaterial({ color: BUNT[k7 % BUNT.length], roughness: 0.4, transparent: true, opacity: 1 }), ball = new T.Mesh(new T.SphereGeometry(0.9, 16, 12), bm); ball.scale.y = 1.2; bg2.add(ball);
      var bk = new T.Mesh(new T.BoxGeometry(0.4, 0.3, 0.4), new T.MeshStandardMaterial({ color: 0x8a6a48, transparent: true, opacity: 1 })); bk.position.y = -1.6; bg2.add(bk); bg2.traverse(function (o) { o.raycast = function () { }; }); scene.add(bg2);
      this.edShips.push({ o: bg2, r: 26 + rnd() * 16, h: 10 + rnd() * 6, sp: 0.008 + rnd() * 0.006, ph: rnd() * 6, cz: -22 - rnd() * 10, flat: true });
    }
  }
  // Fassaden der Parkhäuser: Fensterreihen auf Weiß
  Board3D.parkFacade = function () {
    if (Board3D._pf) return Board3D._pf;
    var c = document.createElement('canvas'); c.width = 64; c.height = 128; var g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 128);
    for (var y = 8; y < 128; y += 16) for (var x = 6; x < 64; x += 14) { g.fillStyle = '#5a7a9a'; g.fillRect(x, y, 8, 10); }
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return (Board3D._pf = t);
  };

  var LEAF = [[0xffffff, 0xe8f0e0], [0x6aa844, 0x7ab84e, 0x5a9a3c, 0x8ac858], [0xd8e4d0, 0xc8d8c0]];
  Board3D.edMood('hunde', 'h_hof', 'Bauernhof', {
    sky: 'sky_kloofendal_38d_partly_cloudy_puresky.webp', skyI: 1, exp: 1.06, sun: [0xfff0d0, 2.6, [-0.55, 0.45, 0.6]], hemi: [0xd6e4f2, 0x5a5a30, 0.7], fog: [0xbcc8d0, 0.009], tint: [1.02, 1.03, 0.98], snow: 999,
    trees: LEAF, flowers: [0xffe27a, 0xffffff, 0xff9ad8, 0xffd23f], part: { color: 0xffffff, size: 0.04, area: 20, speed: 0.12, opacity: 0.4 }, noFire: true,
    farm: [-14, -24, 0.3], bales: 16, fields: [[14, -20, 0.2], [20, -30, -0.1], [-26, -14, 1.2]], wind: [22, -12],
    fences: [[-20, -14, -6, -18], [-6, -18, 6, -30], [9, -14, 26, -15], [-24, 10, -14, 18]], balloons: 0, build: hundeBuild
  });
  Board3D.edMood('hunde', 'h_schau', 'Hundeschau', {
    sky: 'sky_kloppenheim_06_puresky.webp', skyI: 1, exp: 1.04, sun: [0xffe8c8, 2.5, [-0.5, 0.4, -0.75]], hemi: [0xc8dcf4, 0x4a5a30, 0.7], fog: [null, 0.008], fogS: [0.74, 0.8, 0.88], tint: [1, 1.02, 1], snow: 999, shape: 'flach',
    trees: LEAF, flowers: [0xffffff, 0xffe27a], noFire: true, show: true, bales: 6, balloons: 4,
    fences: [[-14, -6, -14, 8, 1], [14, -6, 14, 8, 1], [-14, -17, 14, -17, 1]], build: hundeBuild
  });
  Board3D.edMood('hunde', 'h_park', 'Stadtpark', {
    sky: 'sky_qwantani_dusk_2_puresky.webp', skyI: 0.85, exp: 1.06, sun: [0xffc898, 2.3, [-0.6, 0.3, -0.72]], hemi: [0xc0c8e8, 0x4a5030, 0.68], fog: [null, 0.009], glow: [0xffc080, 0.45, 6], tint: [1.02, 1, 0.98], snow: 999, shape: 'flach',
    trees: LEAF, flowers: [0xff9ad8, 0xffffff, 0xffe27a], part: { color: 0xffe0f0, size: 0.05, area: 22, speed: 0.15, opacity: 0.5 }, noFire: true, park: true, balloons: 2, build: hundeBuild
  });
})();
