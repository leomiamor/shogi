// Schlachtfeld der Fantasy-Edition „Kronen & Drachen“ (Vorbild Total War: Warhammer): grüne Hügel mit Burg, Dorf, Windmühle,
// Steinkreis mit leuchtenden Runen; Drachenhort mit Lava und kreisenden Drachen; verwunschener Wald mit Riesenbaum und Leuchtpilzen.
// Heerlager: Rundzelte in Hausfarben, Wappenbanner (Löwenherz blau/gold, Rabenstein rot/schwarz), Lagerfeuer, Waffenständer, Palisade.
(function () {
  if (typeof Board3D === 'undefined' || !Board3D.edMood) return;
  var T = THREE;
  var HOUSE = [{ bg: '#1c3a8a', fg: '#d8b25a', tent: [0x2a4a9a, 0xe8e0c8] }, { bg: '#8a1c1c', fg: '#1a1a1a', tent: [0x9a2a22, 0x2a2420] }];
  function wappenMat(col) { return new T.MeshStandardMaterial({ map: Board3D.bannerTex(HOUSE[col].bg, HOUSE[col].fg), side: T.DoubleSide, roughness: 0.8, alphaTest: 0.5 }); }
  // Fachwerk-Fassade als Textur
  function fachwerk() {
    if (Board3D._fw) return Board3D._fw;
    var c = document.createElement('canvas'); c.width = 128; c.height = 64; var g = c.getContext('2d');
    g.fillStyle = '#e8e0cc'; g.fillRect(0, 0, 128, 64); g.strokeStyle = '#4a3020'; g.lineWidth = 5;
    g.strokeRect(2, 2, 124, 60); [32, 64, 96].forEach(function (x) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }); g.beginPath(); g.moveTo(0, 32); g.lineTo(128, 32); g.stroke();
    g.beginPath(); g.moveTo(0, 64); g.lineTo(32, 32); g.moveTo(96, 32); g.lineTo(128, 0); g.stroke(); g.fillStyle = '#2a3440'; g.fillRect(42, 10, 12, 14); g.fillRect(74, 10, 12, 14); g.fillRect(52, 40, 22, 24);
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return (Board3D._fw = t);
  }
  // Satteldach-Haus mit Fachwerk (w, d, h), Dach in Farbe
  function house(K, wallM, roofM, w, d, h) {
    var g = new T.Group(); K.box(g, w, h, d, wallM, 0, h / 2, 0);
    var sh = new T.Shape(); sh.moveTo(-w / 2 - 0.08, 0); sh.lineTo(0, h * 0.75); sh.lineTo(w / 2 + 0.08, 0); sh.lineTo(-w / 2 - 0.08, 0);
    var rg = new T.ExtrudeGeometry(sh, { depth: d + 0.16, bevelEnabled: false }); rg.translate(0, h, -d / 2 - 0.08); g.add(new T.Mesh(rg, roofM)); return g;
  }

  Board3D.EDITION_CAMP.fantasy = function (col, hi, MD) {
    var self = this, K = Board3D.edKit(this, hi), zs = col === 0 ? 1 : -1, H = HOUSE[col];
    var stripe = function (a, b) { var c = document.createElement('canvas'); c.width = 256; c.height = 32; var g = c.getContext('2d'); for (var x = 0; x < 256; x += 32) { g.fillStyle = (x / 32) % 2 ? b : a; g.fillRect(x, 0, 32, 32); } var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
    var tentM = new T.MeshStandardMaterial({ map: stripe('#' + new T.Color(H.tent[0]).getHexString(), '#' + new T.Color(H.tent[1]).getHexString()), roughness: 0.85, side: T.DoubleSide });
    var wood = K.std(0x5a4030, { roughness: 0.9 }), gold = K.std(0xd8b25a, { metalness: 0.6, roughness: 0.4 }), wm = wappenMat(col);
    // Rundzelte (Pavillons): Wand + Kegeldach, Wimpel oben; großes Feldherrenzelt hinten in der Mitte
    function pav(x, z, r, h) {
      var g = new T.Group(); K.cyl(g, r, r, h * 0.45, tentM, 0, h * 0.225, 0, 12);
      var roof = new T.Mesh(new T.ConeGeometry(r * 1.12, h * 0.6, 12), tentM); roof.position.y = h * 0.45 + h * 0.3; g.add(roof);
      K.cyl(g, 0.008, 0.008, 0.3, wood, 0, h * 0.75 + 0.15, 0, 4); var pen = new T.Mesh(new T.PlaneGeometry(0.12, 0.05), new T.MeshStandardMaterial({ color: H.bg, side: T.DoubleSide })); pen.position.set(0.06, h * 0.75 + 0.27, 0); g.add(pen);
      var door = new T.Mesh(new T.PlaneGeometry(r * 0.6, h * 0.36), new T.MeshBasicMaterial({ color: 0x14100c })); door.position.set(0, h * 0.18, (r + 0.005) * -zs); if (zs > 0) door.rotation.y = Math.PI; g.add(door);
      return K.at(g, x, z, (Math.random() - 0.5) * 0.3);
    }
    pav(0, 12.4 * zs, 0.9, 1.3);
    for (var side = -1; side <= 1; side += 2) for (var r = 0; r < 2; r++) for (var k = 0; k < 4; k++) pav(side * (7.2 + k * 1.05 + r * 0.45), (7.6 + r * 1.4 + (k % 2) * 0.2) * zs, 0.36, 0.72);
    // Lagerfeuer mit Rauch
    [[-8.3, 9.8], [8.4, 9.6], [0, 13.9]].forEach(function (p) {
      var x = p[0], z = p[1] * zs, f = new T.Group();
      for (var j = 0; j < 5; j++) { var lg = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 0.22, 5), wood); lg.rotation.set(Math.PI / 2 - 0.5, j * 1.26, 0); lg.position.y = 0.04; f.add(lg); }
      var fl = new T.Mesh(new T.ConeGeometry(0.06, 0.18, 6), new T.MeshBasicMaterial({ color: 0xffa040 })); fl.position.y = 0.1; f.add(fl); K.at(f, x, z); fl.castShadow = false;
      var puffs = []; for (var j2 = 0; j2 < 7; j2++) { var sp = new T.Sprite(self.smokeMat()); sp.userData.t = j2 / 7; self.scene.add(sp); puffs.push(sp); }
      self.campFires.push({ x: x, y: self.BT + Board3D.fieldH(x, z) + 0.15, z: z, fl: fl, puffs: puffs });
    });
    // Palisade (angespitzte Pfähle) an den Flanken, Mitte frei
    var stakeG = new T.CylinderGeometry(0.035, 0.04, 0.42, 6); stakeG.translate(0, 0.21, 0); var tip = new T.ConeGeometry(0.04, 0.09, 6); tip.translate(0, 0.46, 0);
    [-1, 1].forEach(function (s) { for (var k = 0; k < 18; k++) { var g = new T.Group(); g.add(new T.Mesh(stakeG, wood)); g.add(new T.Mesh(tip, wood)); K.at(g, s * (11.4 + (k % 2) * 0.03), (6.6 + k * 0.42) * zs, 0, 0.02).rotation.z = s * 0.1; } });
    // Waffenständer mit Speeren und Schilden in Hausfarbe
    var shieldM = K.std(new T.Color(H.bg).getHex(), { roughness: 0.6 });
    for (var j = 0; j < 4; j++) {
      var rack = new T.Group(); for (var sp2 = 0; sp2 < 6; sp2++) { var s2 = K.cyl(rack, 0.006, 0.006, 0.75, wood, (sp2 - 2.5) * 0.06, 0.36, 0, 4); s2.rotation.z = (sp2 - 2.5) * 0.04; }
      K.box(rack, 0.45, 0.02, 0.02, wood, 0, 0.3, 0); for (var sh = 0; sh < 2; sh++) { var sd = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.02, 10), shieldM); sd.rotation.x = Math.PI / 2; sd.position.set(-0.15 + sh * 0.3, 0.12, 0.05 * zs); rack.add(sd); }
      K.at(rack, (j < 2 ? -1 : 1) * (6.4 + (j % 2) * 3.6), 8.9 * zs, (Math.random() - 0.5) * 0.4);
    }
    // Vorratswagen
    var wg = new T.Group(); K.box(wg, 0.6, 0.18, 0.34, wood, 0, 0.2, 0); [-0.2, 0.2].forEach(function (x) { [-1, 1].forEach(function (s) { var wh = K.cyl(wg, 0.11, 0.11, 0.03, wood, x, 0.11, s * 0.19, 10); wh.rotation.x = Math.PI / 2; }); });
    var cover = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 0.56, 10, 1, false, 0, Math.PI), K.std(0xe8e0c8)); cover.rotation.z = Math.PI / 2; cover.rotation.y = Math.PI / 2; cover.rotation.order = 'YZX'; cover.position.y = 0.29; wg.add(cover);
    K.at(wg, -10.2, 11.6 * zs, 0.5);
    // Wappenbanner am Lagerrand (wehen)
    for (var n = 0; n < 8; n++) { var fg = new T.Group(); K.flag(fg, wm, 0, 0, 1.05, 0.17, 0.34); var top = K.box(fg, 0.04, 0.04, 0.04, gold, 0, 1.06, 0); K.at(fg, (n < 4 ? -1 : 1) * (5.9 + (n % 4) * 0.8), (6.7 + (n % 2) * 0.2) * zs, col === 1 ? Math.PI : 0); }
  };

  function fantasyBuild(hi, MD) {
    var self = this, scene = this.scene, Y = this.BT, H = Board3D.fieldH, K = Board3D.edKit(this, hi), mob = this.mobile, rnd = Board3D.rnd(808);
    var stone = this.texMat('castle_brick_07', [3, 3], MD.hort ? 0x6a5e58 : 0xb8b0a0), roofB = K.std(0x34405a, { roughness: 0.7 }), roofR = K.std(0x8a3a24, { roughness: 0.8 }), thatch = K.std(0x9a7a44, { roughness: 1 });
    var fwM = new T.MeshStandardMaterial({ map: fachwerk(), roughness: 0.9 }), wood = K.std(0x5a4030, { roughness: 0.9 });
    // ---- Burg auf dem Hügel: Bergfried, vier Rundtürme, Mauern mit Zinnen, Banner ----
    if (MD.castle) {
      var c = MD.castle, g = new T.Group(), R = 6;
      K.box(g, 4, 9, 4, stone, 0, 4.5, 0); var kr = new T.Mesh(new T.ConeGeometry(3.2, 3.5, 4), roofB); kr.rotation.y = Math.PI / 4; kr.position.y = 10.75; g.add(kr);
      [[-R, -R], [R, -R], [-R, R], [R, R]].forEach(function (p) { K.cyl(g, 1.3, 1.45, 7, stone, p[0], 3.5, p[1], 14); var cr = new T.Mesh(new T.ConeGeometry(1.6, 2.6, 14), roofB); cr.position.set(p[0], 8.3, p[1]); g.add(cr); });
      [[0, -R, 2 * R, 0], [0, R, 2 * R, 0], [-R, 0, 2 * R, Math.PI / 2], [R, 0, 2 * R, Math.PI / 2]].forEach(function (w) {
        var wl = K.box(g, w[2], 4.4, 0.9, stone, w[0], 2.2, w[1]); wl.rotation.y = w[3];
        for (var q = -w[2] / 2 + 0.5; q < w[2] / 2; q += 1) { var m = K.box(g, 0.5, 0.55, 0.9, stone, w[0] + (w[3] ? 0 : q), 4.65, w[1] + (w[3] ? q : 0)); }
      });
      K.box(g, 2.4, 3, 0.4, K.std(0x2a1c14), 0, 1.5, R + 0.3);
      [[-R, -R], [R, -R], [0, 0]].forEach(function (p, i) { var bm = wappenMat(i % 2); var b = new T.Mesh(new T.PlaneGeometry(1.4, 2.8), bm); b.position.set(p[0], i === 2 ? 7 : 5.2, p[1] + (i === 2 ? 2.05 : 1.5)); g.add(b); });
      g.scale.setScalar(c[2]); g.position.set(c[0], Y + H(c[0], c[1]) - 0.3, c[1]); g.rotation.y = c[3] || 0; scene.add(g);
    }
    // ---- Dorf: Fachwerkhäuser mit roten/Strohdächern, Brunnen ----
    (MD.villages || []).forEach(function (v) {
      for (var k = 0; k < (mob ? 6 : 11); k++) {
        var a = rnd() * 6.283, d = Math.sqrt(rnd()) * v[2], x = v[0] + Math.cos(a) * d, z = v[1] + Math.sin(a) * d;
        if (Math.abs(x) < 13 && Math.abs(z) < 15) continue;
        var hs = house(K, fwM, rnd() < 0.5 ? roofR : thatch, 1 + rnd() * 0.6, 0.8 + rnd() * 0.3, 0.7 + rnd() * 0.3); K.at(hs, x, z, rnd() * 6.28, 0.05);
      }
    });
    // ---- Windmühle mit drehenden Flügeln ----
    (MD.mills || []).forEach(function (p) {
      var g = new T.Group(); K.cyl(g, 0.9, 1.4, 5, fwM, 0, 2.5, 0, 10); var cap = new T.Mesh(new T.ConeGeometry(1.15, 1.4, 10), thatch); cap.position.y = 5.7; g.add(cap);
      var hub = new T.Group(); hub.position.set(0, 4.6, 1.35); g.add(hub); var sailM = new T.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.9, side: T.DoubleSide, transparent: true, opacity: 1 }), armM = new T.MeshStandardMaterial({ color: 0x4a3426, transparent: true, opacity: 1 });
      for (var k = 0; k < 4; k++) { var arm = new T.Group(); arm.rotation.z = k * Math.PI / 2; hub.add(arm); var a1 = new T.Mesh(new T.BoxGeometry(0.1, 3.4, 0.06), armM); a1.position.y = 1.7; arm.add(a1); var s1 = new T.Mesh(new T.PlaneGeometry(0.7, 2.6), sailM); s1.position.set(0.4, 2, 0.04); arm.add(s1); }
      g.rotation.y = p[2] || 0; K.at(g, p[0], p[1], p[2] || 0, 0.1); self.tweens.push({ forever: true, f: function (t) { hub.rotation.z = -t / 1400; } });
    });
    // ---- Steinkreis mit leuchtenden Runen (magische Ruine) ----
    if (MD.ring) {
      var rc = MD.ring, rg = new T.Group(), rs = this.texMat('rock_face_03', 1, 0x8a8478), runeC = document.createElement('canvas'); runeC.width = 64; runeC.height = 128; var cg = runeC.getContext('2d');
      cg.strokeStyle = MD.runeC || '#7ae0ff'; cg.lineWidth = 5; cg.shadowColor = cg.strokeStyle; cg.shadowBlur = 10; [[32, 20, 32, 108], [14, 40, 50, 60], [50, 70, 14, 90]].forEach(function (l) { cg.beginPath(); cg.moveTo(l[0], l[1]); cg.lineTo(l[2], l[3]); cg.stroke(); });
      var runeM = new T.MeshBasicMaterial({ map: new T.CanvasTexture(runeC), transparent: true, blending: T.AdditiveBlending, depthWrite: false });
      for (var k = 0; k < 9; k++) {
        var a = k / 9 * 6.283, st = K.box(rg, 0.7, 2.2 + rnd() * 0.8, 0.4, rs, Math.cos(a) * 4, 1.1, Math.sin(a) * 4); st.rotation.y = -a + Math.PI / 2; st.rotation.z = (rnd() - 0.5) * 0.15;
        if (k % 3 === 2) { st.scale.y = 0.5; st.position.y = 0.5; continue; }
        var rn = new T.Mesh(new T.PlaneGeometry(0.4, 0.9), runeM); rn.position.set(Math.cos(a) * 3.78, 1.3, Math.sin(a) * 3.78); rn.lookAt(0, 1.3, 0); rg.add(rn);
      }
      K.box(rg, 3, 0.4, 0.5, rs, 0, 2.6, -4).position.set(Math.cos(0) * 4, 2.6, 0);
      var glow = new T.Mesh(new T.CircleGeometry(2.2, 24), new T.MeshBasicMaterial({ color: MD.runeHex || 0x5ad8ff, transparent: true, opacity: 0.25, blending: T.AdditiveBlending, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; rg.add(glow);
      rg.scale.setScalar(rc[2]); K.at(rg, rc[0], rc[1]); this.tweens.push({ forever: true, f: function (t) { runeM.opacity = 0.6 + Math.sin(t / 600) * 0.35; glow.material.opacity = 0.18 + Math.sin(t / 600) * 0.1; } });
    }
    // ---- Drachenhort: Lavaspalten, Goldhaufen, verkohlte Bäume ----
    if (MD.hort) {
      var lavaM = new T.MeshBasicMaterial({ color: 0xff5a10, transparent: true, opacity: 0.95 }), lavaG = new T.PlaneGeometry(1, 1); lavaG.rotateX(-Math.PI / 2);
      for (var k2 = 0; k2 < (mob ? 14 : 26); k2++) {
        var lx = (rnd() - 0.5) * 60, lz = -8 - rnd() * 40; if (Math.abs(lx) < 13 && lz > -15) continue;
        var lv = new T.Mesh(lavaG, lavaM); lv.scale.set(0.25 + rnd() * 0.3, 1, 3 + rnd() * 6); lv.rotation.y = rnd() * 3; lv.position.set(lx, Y + H(lx, lz) + 0.03, lz); lv.raycast = function () { }; scene.add(lv);
        if (k2 % 4 === 0) K.smoke(lx, Y + H(lx, lz) + 0.2, lz, mob ? 3 : 5, 0x3a2a24, 2.2, 8);
      }
      this.tweens.push({ forever: true, f: function (t) { lavaM.color.setHSL(0.04 + Math.sin(t / 900) * 0.01, 1, 0.5 + Math.sin(t / 500) * 0.06); } });
      [[-14, -18, 1.4, 0.8], [15, -20, 1.8, 1], [-4, -26, 1.2, 0.7]].forEach(function (p) { self.coinPile(p[0], p[1], Y + H(p[0], p[1]) - 0.05, p[2], p[3], mob ? 80 : 180); });
    }
    // ---- Leuchtpilze und Riesenbaum (Zauberwald) ----
    if (MD.shrooms) {
      var capM = new T.MeshStandardMaterial({ color: 0x7a5aff, emissive: 0x5a3aff, emissiveIntensity: 1.2, roughness: 0.4 }), capM2 = new T.MeshStandardMaterial({ color: 0x3affc8, emissive: 0x20d8a0, emissiveIntensity: 1.1, roughness: 0.4 }), stemM = K.std(0xe8e0d0);
      for (var k3 = 0; k3 < (mob ? 30 : 70); k3++) {
        var a3 = rnd() * 6.283, d3 = 6.5 + rnd() * 18, x3 = Math.cos(a3) * d3 * 1.2, z3 = Math.sin(a3) * d3; if (Math.abs(x3) < 13 && Math.abs(z3) < 15 && Math.abs(x3) < 6) continue; if (Board3D.fieldE(x3, z3) < 1.2) continue;
        var g3 = new T.Group(), s3 = 0.15 + rnd() * 0.35; K.cyl(g3, 0.05, 0.07, 0.3, stemM, 0, 0.15, 0, 6); var cp = new T.Mesh(new T.SphereGeometry(0.2, 10, 6, 0, 6.3, 0, 1.5), k3 % 3 ? capM : capM2); cp.position.y = 0.28; g3.add(cp);
        g3.scale.setScalar(s3); K.at(g3, x3, z3, rnd() * 6);
      }
      if (MD.bigTree) { var bt = MD.bigTree, tg = new T.Group(), bark = this.texMat('bark_brown_02', [2, 4], 0x8a7a6a);
        K.cyl(tg, 1.6, 2.6, 12, bark, 0, 6, 0, 12); for (var k4 = 0; k4 < 6; k4++) { var br = K.cyl(tg, 0.4, 0.8, 7, bark, 0, 10, 0, 8); br.rotation.set(0.9, k4 * 1.05, 0); br.position.set(Math.sin(k4 * 1.05) * 2.6, 11.5, Math.cos(k4 * 1.05) * 2.6); }
        var crownM = K.std(0x2a5a4a, { roughness: 0.9 }); for (var k5 = 0; k5 < 7; k5++) { var cr = new T.Mesh(new T.IcosahedronGeometry(3.5 + rnd() * 2, 1), crownM); cr.position.set((rnd() - 0.5) * 9, 15 + rnd() * 4, (rnd() - 0.5) * 9); tg.add(cr); }
        for (var k6 = 0; k6 < 5; k6++) { var root = K.cyl(tg, 0.2, 0.7, 5, bark, 0, 0.6, 0, 6); root.rotation.set(1.2, k6 * 1.26, 0); root.position.set(Math.sin(k6 * 1.26) * 2.6, 0.6, Math.cos(k6 * 1.26) * 2.6); }
        K.at(tg, bt[0], bt[1], 0, 0.3); }
    }
    // ---- Drachen kreisen am Himmel (Flügelschlag) ----
    this.edShips = this.edShips || [];
    for (var d4 = 0; d4 < (MD.dragons || 0) && d4 < (mob ? 1 : 3); d4++) {
      var dg = new T.Group(), dm = new T.MeshStandardMaterial({ color: d4 % 2 ? 0x6a1a14 : 0x2a3a2a, roughness: 0.6, transparent: true, opacity: 1, side: T.DoubleSide });
      var body = new T.Mesh(new T.SphereGeometry(0.5, 10, 8), dm); body.scale.set(0.8, 0.7, 2.2); dg.add(body);
      var neck = new T.Mesh(new T.ConeGeometry(0.22, 1.6, 8), dm); neck.rotation.x = -Math.PI / 2 - 0.3; neck.position.set(0, 0.3, -1.6); dg.add(neck);
      var hd = new T.Mesh(new T.BoxGeometry(0.35, 0.3, 0.7), dm); hd.position.set(0, 0.55, -2.4); dg.add(hd);
      var tail = new T.Mesh(new T.ConeGeometry(0.22, 2.8, 8), dm); tail.rotation.x = Math.PI / 2; tail.position.set(0, 0, 2.4); dg.add(tail);
      var wsh = new T.Shape(); wsh.moveTo(0, 0); wsh.lineTo(3.6, 0.6); wsh.lineTo(3.2, -0.4); wsh.lineTo(2.2, -0.9); wsh.lineTo(1.2, -1.4); wsh.lineTo(0, -1.2); var wgG = new T.ShapeGeometry(wsh); wgG.rotateX(-Math.PI / 2);
      var wl = new T.Group(), wr = new T.Group(); wl.add(new T.Mesh(wgG, dm)); var mr = new T.Mesh(wgG, dm); mr.scale.x = -1; wr.add(mr); wl.position.set(0.3, 0.2, -0.4); wr.position.set(-0.3, 0.2, -0.4); dg.add(wl); dg.add(wr);
      dg.traverse(function (o) { o.raycast = function () { }; }); dg.scale.setScalar(1.2 + rnd() * 0.6); scene.add(dg);
      this.edShips.push({ o: dg, r: 24 + rnd() * 20, h: 12 + rnd() * 8, sp: (0.05 + rnd() * 0.03) * (d4 % 2 ? 1 : -1), ph: rnd() * 6, cz: -20 - rnd() * 10, wings: [wl, wr] });
    }
  }
  // Flügelschlag der Drachen (Flugbahn bewegt feld_editionen.js)
  var tick0 = Board3D.prototype.fieldTick;
  Board3D.prototype.fieldTick = function (now, dt) {
    var r = tick0.apply(this, arguments);
    if (this.edShips) this.edShips.forEach(function (s, i) { if (!s.wings) return; var f = Math.sin(now / 260 + i * 2) * 0.55; s.wings[0].rotation.z = f; s.wings[1].rotation.z = -f; });
    return r;
  };

  var GREEN = [[0xffffff, 0xe8f0e0], [0x5e8c3e, 0x6c9a44, 0x557f38, 0x7aa64e, 0x4a7a34], [0xd8e4d0, 0xc8d8c0]];
  Board3D.edMood('fantasy', 'f_huegel', 'Hügelland', {
    sky: 'sky_kloppenheim_06_puresky.webp', skyI: 1, exp: 1.0, sun: [0xffe0b0, 2.6, [-0.62, 0.32, -0.7]], hemi: [0xc0d4f0, 0x4a5030, 0.62], fog: [null, 0.009], fogS: [0.7, 0.78, 0.86], hfog: [0.2, 0.04, 0.5], glow: [0xffd8a0, 0.45, 6], tint: [1, 1.02, 0.97], snow: 30,
    trees: GREEN, flowers: [0xffe27a, 0xffffff, 0xd8a0e0, 0xff8a8a], part: { color: 0xfff4c0, size: 0.04, area: 22, speed: 0.15, opacity: 0.5 }, mist: { c: 0xf0f4f6, o: 0.32, n: 9, r: [24, 60], h: 1.5 },
    mounds: [[-4, -36, 12, 4.2], [21, -29, 6, 2.6], [-24, 26, 7, 2.8], [16, 31, 6, 1.8]], castle: [-4, -36, 0.75, 0], villages: [[16, -22, 6], [-18, -20, 5]], mills: [[22, -14, -0.6]], ring: [-20, -9, 0.7],
    fireAt: [[16, -22], [-18, -20], [12, -26], [-14, -24]], build: fantasyBuild
  });
  Board3D.edMood('fantasy', 'f_hort', 'Drachenhort', {
    sky: 'sky_overcast_soil_puresky.webp', skyI: 0.6, exp: 0.95, sun: [0xff9060, 1.4, [0.6, 0.5, -0.6]], hemi: [0x7a6070, 0x3a1810, 0.5], fog: [null, 0.012], fogS: [0.42, 0.28, 0.24], hfog: [0.3, 0.05, 0.3], glow: [0xff6a30, 0.7, 3], tint: [1.02, 0.9, 0.84], snow: 999, shape: 'pass',
    ground: ['rock_face_03', 'gravel_floor_02', 'rock_face_03'], gTint: [[0.5, 0.44, 0.4], [0.7, 0.6, 0.52]], grass: { n: 0.06, c: [0.6, 0.45, 0.3] }, trees: [[0x3a3430, 0x2a2420], [0x3a3028, 0x2a2420, 0x4a3a30], [0x3a3430, 0x2a2420]],
    part: { color: 0xff7a28, size: 0.07, area: 22, speed: 0.6, opacity: 0.9, rise: true }, mist: { c: 0x4c3436, o: 0.4, n: 9, r: [22, 50], h: 3 },
    hort: true, dragons: 3, castle: [8, -38, 0.65, 0.4], ring: [-17, -12, 0.6], runeC: '#ff8a3a', runeHex: 0xff6a20,
    fires: [[-9, -21], [11, -22], [-15, -28]], build: fantasyBuild
  });
  Board3D.edMood('fantasy', 'f_wald', 'Zauberwald', {
    sky: 'sky_qwantani_dusk_2_puresky.webp', skyI: 0.8, exp: 1.08, sun: [0xffb0d0, 1.6, [-0.5, 0.25, -0.8]], hemi: [0x8a8ad8, 0x2a3a30, 0.62], fog: [0x6a7890, 0.008], hfog: [0.12, 0.1, 0.3], glow: [0xc8a0ff, 0.2, 5], tint: [0.94, 0.98, 1.06], snow: 999,
    trees: [[0x6aa8a0, 0x5a9890, 0x7ab8b0], [0x4a8a7a, 0x5a6aa8, 0x6a5aa0, 0x3a7a6a, 0x8a6ab8], [0x5a8a80, 0x4a7a70]], grass: { c: [0.8, 0.95, 1.05] }, flowers: [0xa080ff, 0x60ffd0, 0xffffff],
    part: { color: 0xd8ff7a, size: 0.05, area: 20, speed: 0.12, opacity: 0.9 }, mist: { c: 0xb8c8e8, o: 0.14, n: 8, r: [14, 40], h: 1 },
    shrooms: true, bigTree: [15, -24], ring: [-14, -16, 0.7], runeC: '#b07aff', runeHex: 0x9a5aff, noFire: true, build: fantasyBuild
  });
})();
