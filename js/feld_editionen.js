// Eigene Schlachtfelder je Edition im Armee-Modus (Auftrag 19.10.: „Schlachtfelder je Edition“, Vorbild Total-War-Reihe, Fantasy wie Warhammer).
// Feudal behält seine Stimmungen (board3d.js, feldzug.js, kontinent.js). Hier: Grundgerüst (Auswahl je Edition, Boden-Texturen, Bäume/Gras aus,
// eigenes Lager statt Jinmaku) und die Mecha-Edition. Fantasy und Hunde in feld_fantasy.js / feld_hunde.js.
// Spielfeld bleibt flach und lesbar; Handy (Board3D.MOBILE / this.mobile): weniger Gebäude, keine Punktlichter, keine Schatten der Kulisse.
(function () {
  if (typeof Board3D === 'undefined') return;
  var T = THREE;
  function sm(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  // ---------- Grundgerüst ----------
  // Stimmung einer Edition anmelden: Schlüssel, Name im Menü, Definition (wie FIELD_MOODS, dazu ground/gTint/grass/trees/camp/build/noFire)
  Board3D.ED_MOODS = Board3D.ED_MOODS || {};
  Board3D.edMood = function (ed, key, label, def) {
    def.ed = ed; Board3D.FIELD_MOODS[key] = def;
    (Board3D.ED_MOODS[ed] = Board3D.ED_MOODS[ed] || []).push([key, label]);
  };
  Board3D.EDITION_CAMP = Board3D.EDITION_CAMP || {};
  // gewählte Stimmung je Edition: Einstellung fieldMood_<edition>, sonst die erste
  Board3D.edMoodOf = function (ed, settings) {
    var L = Board3D.ED_MOODS[ed]; if (!L) return null;
    var ok = function (k) { return L.some(function (o) { return o[0] === k; }); }, f = Board3D.FIELD_MOOD, s = settings && settings['fieldMood_' + ed];
    return f && ok(f) ? f : ok(s) ? s : L[0][0];
  };
  var bf0 = Board3D.prototype.buildField;
  Board3D.prototype.buildField = function () {
    this.edShips = []; this.edBeams = []; this.edWet = null; // keine Reste vom letzten Aufbau
    var ed = this.theme && this.theme.id, m = ed !== 'feudal' && Board3D.edMoodOf(ed, this.settings);
    if (!m) return bf0.apply(this, arguments);
    var keep = Board3D.FIELD_MOOD; Board3D.FIELD_MOOD = m;
    try { return bf0.apply(this, arguments); } finally { Board3D.FIELD_MOOD = keep; }
  };
  // Lager der Edition statt Jinmaku und Zelten
  var camp0 = Board3D.prototype.buildCamp;
  Board3D.prototype.buildCamp = function (col, hi) {
    var MD = this.mood, f = MD && MD.ed && Board3D.EDITION_CAMP[MD.ed];
    return f ? f.call(this, col, hi, MD) : camp0.apply(this, arguments);
  };
  // Brände breiten sich nur dort aus, wo die Stimmung es erlaubt (Hunde: nie)
  var fc0 = Board3D.prototype.fireCandidates;
  Board3D.prototype.fireCandidates = function () { var MD = this.mood || {}; return MD.noFire ? [] : MD.fireAt ? MD.fireAt.slice() : fc0.apply(this, arguments); };
  // Gelände-Form „flach“ (Stadt, Park): Feld und Umgebung eben, ab 25 m leichte Wellen
  var H0 = Board3D.fieldH;
  // Form „oed“ (Ödland, Eis): flache Dünen, in der Ferne Tafelberge mit steilen Wänden
  var N = Board3D.noise;
  Board3D.fieldH = function (x, z) {
    var sh = Board3D.FIELD_SHAPE; if (sh !== 'flach' && sh !== 'oed') return H0(x, z);
    var e = Board3D.fieldE(x, z);
    if (sh === 'flach') return (N(x * 0.04, z * 0.04, 3) - 0.45) * 2 * sm(25, 60, e) + sm(50, 110, e) * 8;
    var dunes = (N(x * 0.06, z * 0.06, 3) - 0.42) * 1.8 * sm(2.5, 22, e) + (N(x * 0.6, z * 0.6, 2) - 0.5) * 0.05 * sm(0.6, 3, e);
    var mesa = sm(0.54, 0.58, N(x * 0.013 + 4, z * 0.013 - 2, 3)) * sm(55, 80, e) * (9 + N(x * 0.05, z * 0.05, 2) * 5);
    return Math.max(dunes, -0.2) + mesa + sm(110, 170, e) * 16;
  };

  var mood0 = Board3D.prototype.buildMood;
  Board3D.prototype.buildMood = function (hi) {
    var MD = this.mood || {};
    if (MD.ed) this.edGround(MD);
    mood0.apply(this, arguments);
    if (MD.ed && MD.build) MD.build.call(this, hi, MD);
  };
  // Boden: andere Texturen für Gras/Erde/Fels, eigene Tönung; Gras und Bäume nach Stimmung
  Board3D.prototype.edGround = function (MD) {
    var self = this, geo = this.fieldGeo, ground = this.scene.children.find(function (o) { return o.isMesh && o.geometry === geo; });
    if (ground) {
      var gm = ground.material, ob = gm.onBeforeCompile, key = 'edField:' + (Board3D.FIELD_MOOD || '');
      gm.onBeforeCompile = function (sh, r) {
        ob.call(this, sh, r);
        if (MD.ground) ['tG', 'tD', 'tR'].forEach(function (u, i) { if (MD.ground[i]) sh.uniforms[u].value = Board3D.tex(MD.ground[i], 1).map; });
        if (MD.gTint) sh.fragmentShader = sh.fragmentShader.replace('g *= mix(vec3(0.56, 0.74, 0.4), vec3(0.98, 0.92, 0.6), smoothstep(0.35, 0.85, nz.r));',
          'g *= mix(vec3(' + MD.gTint[0].join(', ') + '), vec3(' + MD.gTint[1].join(', ') + '), smoothstep(0.35, 0.85, nz.r));');
      };
      gm.customProgramCacheKey = function () { return key; };
    }
    var cc = new T.Color();
    this.scene.children.forEach(function (o) {
      if (!o.isInstancedMesh) return;
      if (o.material.alphaTest > 0 && MD.trees === false) o.count = 0; // Karten-Bäume
      if (o.geometry.attributes.position.count === 27 && MD.grass != null) { // Grasbüschel
        if (!MD.grass) { o.count = 0; return; }
        var n = Math.round(o.count * (MD.grass.n || 1)); o.count = n;
        if (MD.grass.c && o.instanceColor) { for (var i = 0; i < n; i++) { o.getColorAt(i, cc); cc.multiply(new T.Color().fromArray(MD.grass.c)); o.setColorAt(i, cc); } o.instanceColor.needsUpdate = true; }
      }
    });
  };

  // ---------- Bausteine ----------
  Board3D.edKit = function (self, hi) {
    var scene = self.scene, Y = self.BT, H = Board3D.fieldH;
    var K = {
      at: function (o, x, z, ry, sink) { o.position.set(x, Y + H(x, z) - (sink || 0), z); o.rotation.y = ry || 0; o.traverse(function (m) { if (m.isMesh) { m.castShadow = hi && Math.abs(x) < 15 && Math.abs(z) < 15; m.receiveShadow = true; } }); scene.add(o); return o; },
      box: function (g, w, h, d, mat, x, y, z) { var o = new T.Mesh(new T.BoxGeometry(w, h, d), mat); o.position.set(x || 0, y == null ? h / 2 : y, z || 0); g.add(o); return o; },
      cyl: function (g, r0, r1, h, mat, x, y, z, seg) { var o = new T.Mesh(new T.CylinderGeometry(r0, r1, h, seg || 8), mat); o.position.set(x || 0, y == null ? h / 2 : y, z || 0); g.add(o); return o; },
      std: function (c, o) { return new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, o || {})); },
      // Fahne auf Stange, weht wie die Nobori (gleiche Animation in fieldTick)
      flag: function (g, mat, x, z, h, w, fh) {
        var pole = new T.Mesh(new T.CylinderGeometry(0.01, 0.012, h, 5), K.dark); pole.position.set(x, h / 2, z); g.add(pole);
        var cl = new T.Mesh(new T.PlaneGeometry(w, fh, 1, 6), mat); cl.position.set(x + w / 2 + 0.01, h - fh / 2 - 0.04, z); g.add(cl);
        (self.nobori = self.nobori || []).push({ m: cl, ph: Math.random() * 6 }); return cl;
      },
      // weicher Rauch aufsteigend (z. B. aus Wracks, Schornsteinen)
      smoke: function (x, y, z, n, col, big, rise) {
        var puffs = []; for (var k = 0; k < n; k++) { var sp = new T.Sprite(self.smokeMat()); if (col) sp.material.color.set(col); sp.userData.t = k / n; scene.add(sp); puffs.push(sp); }
        self.campFires.push({ x: x, y: y, z: z, fl: new T.Object3D(), puffs: puffs, big: big || 1, rise: rise || 4 });
      },
      // Leuchtpunkt, der blinkt (ein Material für alle: Blinken für alle zugleich)
      blinkM: function (c) { var m = new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 1 }); self.tweens.push({ forever: true, f: function (t) { m.opacity = (t / 800 | 0) % 2 ? 1 : 0.15; } }); return m; },
      dark: new T.MeshStandardMaterial({ color: 0x22252a, roughness: 0.5, metalness: 0.5 })
    };
    return K;
  };

  // ======================= MECHA: Iron Protocol =======================
  function mechaColors(self, col) { var c = new T.Color(self.theme.factions[col].color); return { acc: c, hex: c.getHex() }; }
  // Wappen-Fahne (Stoff in Fraktionsfarbe mit Emblem: Dreieck/Chevron)
  function techFlagMat(self, col) {
    var c = document.createElement('canvas'); c.width = 64; c.height = 192; var g = c.getContext('2d'), fc = '#' + new T.Color(self.theme.factions[col].color).getHexString();
    g.fillStyle = '#1c2026'; g.fillRect(0, 0, 64, 192); g.fillStyle = fc; g.fillRect(0, 0, 64, 18); g.fillRect(0, 174, 64, 18);
    g.strokeStyle = fc; g.lineWidth = 7; g.beginPath(); g.moveTo(12, 70); g.lineTo(32, 92); g.lineTo(52, 70); g.stroke(); g.beginPath(); g.moveTo(12, 96); g.lineTo(32, 118); g.lineTo(52, 96); g.stroke();
    g.fillStyle = '#e8eaee'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillText(col ? 'B-02' : 'A-01', 32, 152);
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return new T.MeshStandardMaterial({ map: t, side: T.DoubleSide, roughness: 0.7 });
  }
  // Landungsschiff (flach, kantig): Rumpf, Cockpit, Flügel, Triebwerke mit Glühen
  function dropship(K, hull, glowM) {
    var g = new T.Group();
    K.box(g, 0.9, 0.32, 2.6, hull, 0, 0.36, 0); K.box(g, 0.6, 0.22, 0.7, hull, 0, 0.62, -0.7);
    var nose = new T.Mesh(new T.ConeGeometry(0.42, 0.9, 4), hull); nose.rotation.x = -Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.scale.set(1, 1, 0.55); nose.position.set(0, 0.36, -1.72); g.add(nose);
    K.box(g, 3.2, 0.07, 0.9, hull, 0, 0.4, 0.45); [-1, 1].forEach(function (s) { K.box(g, 0.12, 0.55, 0.7, hull, s * 1.55, 0.62, 0.7); K.cyl(g, 0.17, 0.2, 0.7, hull, s * 0.75, 0.32, 0.9).rotation.x = Math.PI / 2;
      var gl = new T.Mesh(new T.CircleGeometry(0.15, 10), glowM); gl.position.set(s * 0.75, 0.32, 1.26); g.add(gl); });
    [-0.3, 0.3].forEach(function (x) { K.box(g, 0.05, 0.3, 0.05, K.dark, x, 0.15, -0.6); K.box(g, 0.05, 0.3, 0.05, K.dark, x, 0.15, 0.7); });
    return g;
  }
  Board3D.EDITION_CAMP.mecha = function (col, hi, MD) {
    var self = this, K = Board3D.edKit(this, hi), zs = col === 0 ? 1 : -1, C = mechaColors(this, col);
    var steel = this.texMat('metal_plate', [2, 1], 0x8a9098, { metalness: 0.55, roughness: 0.5 }), olive = this.texMat('metal_plate', [2, 1], col ? 0x5a6470 : 0x6a6450, { metalness: 0.4, roughness: 0.6 });
    var acc = K.std(C.hex, { metalness: 0.3, roughness: 0.5 }), conc = this.texMat('concrete_floor_painted', [1, 1], 0x9a9a96), hz = Board3D.hazardTex();
    // Landeplatz mit Warnring und abgestelltem Landungsschiff
    var pad = new T.Group(), disc = new T.Mesh(new T.CylinderGeometry(1.7, 1.8, 0.06, 8), conc); disc.position.y = 0.03; pad.add(disc);
    var ring = new T.Mesh(new T.RingGeometry(1.45, 1.6, 8, 1), new T.MeshStandardMaterial({ color: 0xe8b21c, roughness: 0.6 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.065; pad.add(ring);
    var hm = new T.MeshStandardMaterial({ color: 0xe8eaee, roughness: 0.6 }); K.box(pad, 0.12, 0.01, 0.9, hm, -0.35, 0.066, 0); K.box(pad, 0.12, 0.01, 0.9, hm, 0.35, 0.066, 0); K.box(pad, 0.6, 0.01, 0.12, hm, 0, 0.066, 0);
    var ds = dropship(K, olive, new T.MeshBasicMaterial({ color: 0x66d8ff })); ds.scale.setScalar(0.85); ds.position.y = 0.06; ds.rotation.y = 0.4 * zs; pad.add(ds);
    K.at(pad, 0, 12.6 * zs);
    // Unterkünfte (Wellblech-Halbtonnen) in Reihen links und rechts
    var hutG = new T.CylinderGeometry(0.42, 0.42, 1.3, 10, 1, false, 0, Math.PI); hutG.rotateZ(Math.PI / 2); hutG.rotateY(Math.PI / 2);
    for (var side = -1; side <= 1; side += 2) for (var r = 0; r < 2; r++) for (var k = 0; k < 3; k++) {
      var hut = new T.Group(), body = new T.Mesh(hutG, olive); hut.add(body); body.rotation.x = 0; body.position.y = 0;
      K.box(hut, 0.84, 0.42, 0.04, steel, 0, 0.21, 0.65 * zs); K.box(hut, 0.22, 0.3, 0.02, acc, 0, 0.15, 0.68 * zs);
      K.at(hut, side * (7.4 + k * 1.15 + r * 0.45), (8.2 + r * 1.6) * zs, (Math.random() - 0.5) * 0.15);
    }
    // Containerstapel (manche in Fraktionsfarbe)
    var cont = [this.texMat('metal_plate', [3, 1], 0x7a3a24, { metalness: 0.4, roughness: 0.6 }), this.texMat('metal_plate', [3, 1], 0x2a4a6a, { metalness: 0.4, roughness: 0.6 }), olive, acc];
    [[-11.8, 6.6], [11.8, 6.8], [-12.4, 10.6], [12.6, 10.2]].forEach(function (p, i) {
      var st = new T.Group(); for (var a = 0; a < 3; a++) for (var b = 0; b < 2 - (a > 1 ? 1 : 0); b++) K.box(st, 0.9, 0.36, 0.38, cont[(i + a + b) % 4], 0, 0.18 + b * 0.37, a * 0.4 - 0.4);
      K.at(st, p[0], p[1] * zs, (Math.random() - 0.5) * 0.3 + Math.PI / 2);
    });
    // Funkmast (Gittermast) mit Blinklicht
    var blink = this._edBlink || (this._edBlink = K.blinkM(0xff2a2a));
    [-1, 1].forEach(function (s) {
      var m = new T.Group(), hgt = 3.2;
      [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]].forEach(function (q) { var leg = K.cyl(m, 0.012, 0.02, hgt, K.dark, q[0] * 0.6, hgt / 2, q[1] * 0.6, 4); leg.rotation.z = -q[0] * 0.05; leg.rotation.x = q[1] * 0.05; });
      for (var y = 0.3; y < hgt; y += 0.35) K.box(m, 0.16, 0.012, 0.16, K.dark, 0, y, 0);
      K.box(m, 0.4, 0.03, 0.03, K.dark, 0, hgt - 0.3, 0); var bl = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), blink); bl.position.y = hgt + 0.05; m.add(bl);
      K.at(m, s * 10.4, 12.4 * zs);
    });
    // Suchscheinwerfer: Kopf auf Gestell, Lichtkegel schwenkt
    this.edBeams = this.edBeams || [];
    var beamM = new T.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: MD.beam || 0.06, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
    [-1, 1].forEach(function (s) {
      var g = new T.Group(); K.cyl(g, 0.06, 0.09, 0.5, K.dark); var head = new T.Group(); head.position.y = 0.55; g.add(head);
      var lamp = new T.Mesh(new T.CylinderGeometry(0.09, 0.07, 0.16, 10), new T.MeshStandardMaterial({ color: 0x30343a, transparent: true, opacity: 1 })); lamp.rotation.x = Math.PI / 2; head.add(lamp);
      var cone = new T.Mesh(new T.ConeGeometry(1.4, 9, 16, 1, true), beamM); cone.geometry.translate(0, -4.5, 0); cone.rotation.x = -Math.PI / 2 + 0.55; cone.raycast = function () { }; head.add(cone);
      K.at(g, s * 5.6, 10.6 * zs); self.edBeams.push({ h: head, ph: s + col * 2, base: col === 0 ? Math.PI : 0 });
    });
    // Sperren aus Beton und Sandsäcken vor dem Lager (Mitte frei für den Anmarsch)
    var barG = new T.BoxGeometry(0.5, 0.16, 0.12); barG.translate(0, 0.08, 0);
    [-1, 1].forEach(function (s) { for (var k = 0; k < 4; k++) { var b = new T.Mesh(barG, conc); var g = new T.Group(); g.add(b); K.at(g, s * (8.6 + k * 0.55), 6.3 * zs, (Math.random() - 0.5) * 0.2); } });
    // Feldzeichen: hohe Stoffbanner in Fraktionsfarbe mit Emblem
    var fm = techFlagMat(this, col);
    for (var n = 0; n < 8; n++) { var fg = new T.Group(); K.flag(fg, fm, 0, 0, 1.1, 0.17, 0.5); K.at(fg, (n < 4 ? -1 : 1) * (5.9 + (n % 4) * 0.8), (6.7 + (n % 2) * 0.2) * zs, col === 1 ? Math.PI : 0); }
  };

  // Fassade einer Ruine: Beton, Fensterreihen dunkel, einzelne ausgebrannt (schwarz verrußt)
  function facadeTex(ice) {
    var c = document.createElement('canvas'); c.width = 64; c.height = 256; var g = c.getContext('2d'), r = Board3D.rnd(9);
    g.fillStyle = ice ? '#b8c0c8' : '#8a847a'; g.fillRect(0, 0, 64, 256);
    for (var y = 6; y < 256; y += 12) for (var x = 4; x < 64; x += 10) { g.fillStyle = r() < 0.15 ? '#0a0806' : ice ? '#4a5664' : '#2a2a2e'; g.fillRect(x, y, 6, 7); }
    for (var k = 0; k < 6; k++) { var gr = g.createRadialGradient(r() * 64, r() * 256, 0, r() * 64, r() * 256, 30); gr.addColorStop(0, ice ? 'rgba(255,255,255,0.5)' : 'rgba(20,16,12,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); }
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }
  // Kulisse Mecha: Stadtruinen (Skyline), Industrie, Wracks, gefallener Titan, Krater; Landungsschiffe kreisen am Himmel
  function mechaBuild(hi, MD) {
    var self = this, scene = this.scene, Y = this.BT, H = Board3D.fieldH, K = Board3D.edKit(this, hi), mob = this.mobile, rnd = Board3D.rnd(515);
    var steel = this.texMat('metal_plate', [2, 2], 0x6c7178, { metalness: 0.5, roughness: 0.55 }), rust = this.texMat('metal_plate', [2, 2], 0x6a4a36, { metalness: 0.3, roughness: 0.8 });
    var conc = this.texMat('concrete_floor_painted', [2, 4], MD.night ? 0x4a4c54 : 0x8a8680), burnt = K.std(0x1e1c1a, { roughness: 1 });
    // ---- Skyline: Hochhäuser als Instanzen (Fenster leuchten nachts), oben teils abgebrochen ----
    var win = Board3D.windowTex(), towers = MD.city || [], tw = [];
    var nT = Math.round((MD.towers || 50) * (mob ? 0.55 : 1));
    for (var i = 0, tries = 0; tw.length < nT && tries++ < 3000; i++) {
      var a = MD.ring ? rnd() * 6.283 : -Math.PI / 2 + (rnd() - 0.5) * 2.4, d = (MD.ring ? 20 : 42) + rnd() * (MD.ring ? 45 : 50), x = Math.cos(a) * d * 1.2, z = Math.sin(a) * d;
      if (Math.abs(x) < 15 && Math.abs(z) < 18) continue;
      var th0 = H(x, z); if (th0 > 2.5 || Math.abs(H(x + 2, z) - th0) + Math.abs(H(x, z + 2) - th0) > 0.8) continue; // nicht auf Tafelbergen
      tw.push([x, z, 2 + rnd() * 3.5, 4 + Math.pow(rnd(), 1.6) * (MD.ring ? 26 : 18), rnd() < 0.45]);
    }
    var tGeo = new T.BoxGeometry(1, 1, 1); tGeo.translate(0, 0.5, 0);
    var tMat = MD.night ? new T.MeshStandardMaterial({ color: 0x1a1c24, roughness: 0.85, metalness: 0.2, emissive: 0xffffff, emissiveMap: win, emissiveIntensity: 1.4 })
      : new T.MeshStandardMaterial({ map: facadeTex(MD.ice), roughness: 0.9 });
    var ti = new T.InstancedMesh(tGeo, tMat, tw.length), m4 = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), p3 = new T.Vector3(), sc = new T.Vector3(), cc = new T.Color();
    tw.forEach(function (t, n) { q.setFromAxisAngle(up, (rnd() - 0.5) * 0.3); m4.compose(p3.set(t[0], Y + H(t[0], t[1]) - 0.3, t[1]), q, sc.set(t[2], t[3], t[2] * (0.7 + rnd() * 0.5))); ti.setMatrixAt(n, m4); ti.setColorAt(n, cc.setScalar(0.7 + rnd() * 0.5)); });
    ti.raycast = function () { }; ti.receiveShadow = true; scene.add(ti);
    // abgebrochene Spitzen: schräge Trümmerkeile auf jedem zweiten Turm, Stahlträger ragen heraus
    tw.forEach(function (t) {
      if (!t[4]) return; var g = new T.Group(), w = t[2];
      var wedge = new T.Mesh(new T.CylinderGeometry(0, w * 0.75, w * 0.8, 4, 1), conc); wedge.rotation.y = Math.PI / 4; wedge.rotation.z = 0.5; wedge.position.y = w * 0.25; g.add(wedge);
      for (var k = 0; k < 3; k++) { var b = K.box(g, 0.08, 1 + rnd() * 1.5, 0.08, rust, (rnd() - 0.5) * w * 0.8, 0.5, (rnd() - 0.5) * w * 0.6); b.rotation.z = (rnd() - 0.5) * 0.6; }
      g.position.set(t[0], Y + H(t[0], t[1]) - 0.3 + t[3], t[1]); scene.add(g);
      if (MD.burn && rnd() < 0.3) K.smoke(t[0], Y + t[3], t[1], mob ? 5 : 8, 0x2a2624, 4.5, 16);
    });
    // ---- Industrie: Kühltürme, Schornsteine mit Rauch, Tanks (nur bei Ödland/Eis) ----
    if (MD.industry) MD.industry.forEach(function (p, k) {
      var g = new T.Group();
      if (k % 2 === 0) { var pts = []; for (var y = 0; y <= 10; y++) { var u = y / 10; pts.push(new T.Vector2(3.2 - Math.sin(u * Math.PI * 0.85) * 1.4 + u * 0.4, u * 9)); } var ct = new T.Mesh(new T.LatheGeometry(pts, 20), conc); g.add(ct); if (!mob || k === 0) K.smoke(p[0], Y + H(p[0], p[1]) + 9, p[1], mob ? 5 : 9, 0xd8d4cc, 7, 18); }
      else { K.cyl(g, 0.35, 0.55, 12, rust, 0, 6, 0, 10); K.cyl(g, 1.6, 1.6, 2.6, steel, 2.4, 1.3, 1, 16); K.cyl(g, 1.2, 1.2, 2, steel, -2, 1, 1.4, 16); K.box(g, 4, 3, 2.5, steel, 0.5, 1.5, -2.2); K.smoke(p[0], Y + H(p[0], p[1]) + 12, p[1], mob ? 4 : 7, 0x3a3634, 3.5, 20); }
      g.position.set(p[0], Y + H(p[0], p[1]) - 0.2, p[1]); scene.add(g);
    });
    // ---- Wracks: ausgebrannte Kampfläufer und Panzer im Vorfeld, einige rauchen ----
    var wr = MD.wrecks || [];
    wr.forEach(function (p, k) {
      var g = new T.Group(), mat = MD.ice ? K.std(0xbcc8d4, { roughness: 0.6 }) : burnt;
      if (k % 3 === 0) { // umgestürzter Läufer: Rumpf, Beine
        K.box(g, 0.9, 0.5, 0.7, mat, 0, 0.25, 0).rotation.z = 0.5; K.box(g, 0.2, 1.1, 0.2, mat, 0.6, 0.12, 0.3).rotation.z = 1.4; K.box(g, 0.2, 0.9, 0.2, mat, -0.5, 0.3, -0.3).rotation.x = 0.9;
        K.box(g, 0.35, 0.3, 0.3, mat, -0.55, 0.45, 0.2);
      } else { // Panzerwrack mit Turm
        K.box(g, 1.1, 0.35, 0.65, mat, 0, 0.17, 0); var tu = K.box(g, 0.5, 0.22, 0.45, mat, -0.05, 0.45, 0.05); tu.rotation.y = 0.7; var gun = K.box(g, 0.75, 0.06, 0.06, mat, 0.35, 0.47, 0.3); gun.rotation.y = 0.7; gun.rotation.z = -0.2;
      }
      g.rotation.y = rnd() * 6; g.scale.setScalar(p[2] || 1); K.at(g, p[0], p[1], g.rotation.y, 0.08);
      if (!MD.ice && k % 2 === 0) K.smoke(p[0], Y + H(p[0], p[1]) + 0.4, p[1], mob ? 4 : 6, 0x2c2826, 1.6, 6);
    });
    // ---- Gefallener Titan: riesiger Kampfläufer liegt halb im Boden (Wahrzeichen) ----
    if (MD.titan) {
      var tp = MD.titan, g = new T.Group(), tm = MD.ice ? K.std(0x9aa6b4, { roughness: 0.5, metalness: 0.3 }) : steel;
      K.box(g, 5, 3.2, 3.6, tm, 0, 1.4, 0).rotation.z = 0.25;                                 // Rumpf
      var head = K.box(g, 1.6, 1.3, 1.6, tm, 3.2, 2.2, 0.4); head.rotation.z = 0.5;          // Kopf
      var eye = new T.Mesh(new T.BoxGeometry(0.1, 0.18, 0.9), new T.MeshBasicMaterial({ color: MD.night ? 0xff3030 : 0x5a1010 })); eye.position.set(4.05, 2.55, 0.4); eye.rotation.z = 0.5; g.add(eye);
      K.box(g, 1.2, 6, 1.2, tm, -1.6, 0.6, 2.8).rotation.set(1.2, 0, 0.3);                    // Arm
      K.box(g, 1.6, 7, 1.6, tm, -4, 0.4, -1.2).rotation.set(0, 0.4, 1.35);                   // Bein
      K.box(g, 2, 1, 2.4, rust, -6.8, 0.2, -1.6);                                             // Fuß
      K.cyl(g, 0.5, 0.5, 4, rust, 1.2, 3.1, -2).rotation.z = 1.2;                             // Kanone
      g.rotation.y = tp[2]; K.at(g, tp[0], tp[1], tp[2], 0.6);
      if (!MD.ice) K.smoke(tp[0] + 1, Y + H(tp[0], tp[1]) + 3, tp[1], mob ? 5 : 9, 0x2a2624, 4, 14);
    }
    // ---- Krater rund ums Feld (dunkle Ringe auf dem Boden) ----
    var crc = document.createElement('canvas'); crc.width = crc.height = 128; var cg = crc.getContext('2d'), gr = cg.createRadialGradient(64, 64, 10, 64, 64, 62);
    gr.addColorStop(0, MD.ice ? 'rgba(90,100,110,0.75)' : 'rgba(30,24,20,0.85)'); gr.addColorStop(0.55, MD.ice ? 'rgba(120,130,140,0.4)' : 'rgba(50,40,30,0.55)'); gr.addColorStop(0.75, MD.ice ? 'rgba(200,210,220,0.3)' : 'rgba(120,100,80,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    cg.fillStyle = gr; cg.fillRect(0, 0, 128, 128); var crm = new T.MeshBasicMaterial({ map: new T.CanvasTexture(crc), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    for (var c2 = 0; c2 < (MD.craters || 0); c2++) {
      var cx = (rnd() - 0.5) * 50, cz = (rnd() - 0.5) * 44; if (Math.abs(cx) < 6 && Math.abs(cz) < 15) continue; if (Board3D.fieldE(cx, cz) < 1.5) continue;
      var cr = new T.Mesh(new T.CircleGeometry(0.6 + rnd() * 1.2, 16), crm); cr.rotation.x = -Math.PI / 2; cr.position.set(cx, Y + H(cx, cz) + 0.02, cz); cr.raycast = function () { }; scene.add(cr);
    }
    // ---- Neon (Nacht-Stadt): leuchtende Schilder an den Türmen, Straßenlaternen ----
    if (MD.night) {
      var signs = ['電脳', 'IRON', '将棋', 'NEO', 'MECH', '危険', '24H'], cols = ['#ff3fb4', '#3fe6ff', '#ffd23f', '#9a6bff', '#ff6a3f'];
      tw.slice(0, mob ? 10 : 22).forEach(function (t, k) {
        var d = Math.hypot(t[0], t[1]), nx = -t[0] / d, nz = -t[1] / d, w = Math.min(t[2] * 0.9, 3.4), sg = new T.Mesh(new T.PlaneGeometry(w, w * 0.32), new T.MeshBasicMaterial({ map: Board3D.neonSign(signs[k % signs.length], cols[k % cols.length]), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
        sg.position.set(t[0] + nx * (t[2] * 0.55 + 0.05), Y + H(t[0], t[1]) + Math.min(t[3] * 0.6, 3 + rnd() * 6), t[1] + nz * (t[2] * 0.55 + 0.05)); sg.lookAt(sg.position.x + nx, sg.position.y, sg.position.z + nz); scene.add(sg);
      });
      var lampM = new T.MeshBasicMaterial({ color: 0xffe2b0 }), poolC = document.createElement('canvas'); poolC.width = poolC.height = 64; var pg = poolC.getContext('2d'), pgr = pg.createRadialGradient(32, 32, 0, 32, 32, 32);
      pgr.addColorStop(0, 'rgba(255,220,160,0.55)'); pgr.addColorStop(1, 'rgba(255,220,160,0)'); pg.fillStyle = pgr; pg.fillRect(0, 0, 64, 64); var poolM = new T.MeshBasicMaterial({ map: new T.CanvasTexture(poolC), transparent: true, depthWrite: false, blending: T.AdditiveBlending });
      [[-6.2, -6], [6.2, -6], [-6.2, 0], [6.2, 0], [-6.2, 6], [6.2, 6], [-3, -7.5], [3, -7.5], [-3, 7.5], [3, 7.5]].forEach(function (p) {
        var g = new T.Group(); K.cyl(g, 0.02, 0.03, 1.4, K.dark); var arm = K.box(g, 0.3, 0.02, 0.02, K.dark, p[0] > 0 ? -0.14 : 0.14, 1.4, 0); var bulb = K.box(g, 0.1, 0.03, 0.06, lampM, p[0] > 0 ? -0.26 : 0.26, 1.38, 0);
        K.at(g, p[0], p[1]); var pool = new T.Mesh(new T.CircleGeometry(1.1, 16), poolM); pool.rotation.x = -Math.PI / 2; pool.position.set(p[0] + (p[0] > 0 ? -0.26 : 0.26), Y + H(p[0], p[1]) + 0.015, p[1]); pool.raycast = function () { }; scene.add(pool);
      });
      this.fieldU.uWet.value = 0.6; this.edWet = 0.6; // nasser Asphalt
    }
    // ---- Eis: Eisschollen und Kristalle, Radarstation mit drehender Schüssel ----
    if (MD.ice) {
      var iceM = new T.MeshStandardMaterial({ color: 0xbfe0f2, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.88, flatShading: true }), ig = new T.IcosahedronGeometry(1, 0);
      for (var k3 = 0; k3 < (mob ? 18 : 40); k3++) {
        var a3 = rnd() * 6.283, d3 = 9 + rnd() * 35, x3 = Math.cos(a3) * d3 * 1.2, z3 = Math.sin(a3) * d3; if (Math.abs(x3) < 14 && Math.abs(z3) < 15) continue;
        var cr3 = new T.Mesh(ig, iceM), s3 = 0.4 + rnd() * 1.6; cr3.scale.set(s3 * 0.5, s3 * (1.2 + rnd() * 1.5), s3 * 0.5); cr3.rotation.set((rnd() - 0.5) * 0.6, rnd() * 6, (rnd() - 0.5) * 0.6); cr3.position.set(x3, Y + H(x3, z3) + s3 * 0.4, z3); cr3.raycast = function () { }; scene.add(cr3);
      }
      var rs = new T.Group(); K.box(rs, 2.2, 1.2, 1.6, steel, 0, 0.6, 0); K.cyl(rs, 0.1, 0.14, 1.6, K.dark, 0, 2, 0);
      var dish = new T.Group(); dish.position.y = 2.8; rs.add(dish); var dm = new T.Mesh(new T.SphereGeometry(1.1, 16, 8, 0, Math.PI * 2, 0, 0.9), new T.MeshStandardMaterial({ color: 0xdadfe4, side: T.DoubleSide, metalness: 0.3, roughness: 0.4, transparent: true, opacity: 1 }));
      dm.rotation.x = -Math.PI / 2 - 0.5; dish.add(dm); K.at(rs, 17, -20, 0.6); this.tweens.push({ forever: true, f: function (t) { dish.rotation.y = t / 3000; } });
    }
    // ---- Landungsschiffe kreisen am Himmel, blinkende Positionslichter ----
    var hull = new T.MeshStandardMaterial({ color: 0x4a525c, metalness: 0.5, roughness: 0.5, transparent: true, opacity: 1 }), glowM = new T.MeshBasicMaterial({ color: 0x8ae8ff, transparent: true, opacity: 1 });
    this.edShips = this.edShips || [];
    for (var s4 = 0; s4 < (mob ? 2 : 4); s4++) {
      var sh = dropship(K, hull, glowM); sh.scale.setScalar(0.9 + rnd() * 0.6); var bl2 = new T.Mesh(new T.SphereGeometry(0.08, 6, 4), K.blinkM(s4 % 2 ? 0xff3030 : 0x40ff70)); bl2.position.set(0, 0.55, 1.1); sh.add(bl2);
      sh.traverse(function (o) { o.raycast = function () { }; }); scene.add(sh);
      this.edShips.push({ o: sh, r: 22 + rnd() * 30, h: 9 + rnd() * 10, sp: (0.018 + rnd() * 0.02) * (s4 % 2 ? 1 : -1), ph: rnd() * 6, cz: -15 - rnd() * 20 });
    }
  }
  // Scheinwerfer schwenken, Landungsschiffe fliegen Kreise (Nase in Flugrichtung)
  var tick0 = Board3D.prototype.fieldTick;
  Board3D.prototype.fieldTick = function (now, dt) {
    var r = tick0.apply(this, arguments), t = now / 1000;
    if (this.edBeams) this.edBeams.forEach(function (b) { b.h.rotation.y = b.base + Math.sin(t * 0.35 + b.ph) * 0.9; });
    if (this.edShips) this.edShips.forEach(function (s) {
      var a = s.ph + t * s.sp, x = Math.cos(a) * s.r * 1.3, z = s.cz + Math.sin(a) * s.r;
      s.o.position.set(x, s.h + Math.sin(t * 0.7 + s.ph) * 0.4, z); s.o.rotation.set(0, Math.atan2(-Math.sin(a) * s.sp, -Math.cos(a) * s.sp * 1.3) + Math.PI, Math.sign(s.sp) * 0.15);
    });
    if (this.edWet != null && this.fieldU.uWet.value < this.edWet) this.fieldU.uWet.value = this.edWet;
    return r;
  };

  var IND = [[-30, -48], [-40, -30], [34, -46], [44, -26]];
  Board3D.edMood('mecha', 'm_oedland', 'Ödland', {
    sky: 'sky_qwantani_sunset_puresky.webp', skyI: 1, exp: 1.05, sun: [0xffa060, 3.0, [0.72, 0.24, -0.62]], hemi: [0xb0a0c0, 0x7a5c44, 0.85], shape: 'oed', fog: [null, 0.0115], hfog: [0.3, 0.03, 0.3], glow: [0xffa060, 0.65, 6], tint: [1.04, 0.97, 0.88], snow: 999,
    ground: ['coast_sand_01', 'gravel_floor_02', 'rock_face_03'], gTint: [[0.98, 0.8, 0.6], [1.25, 1.04, 0.78]], grass: { n: 0.08, c: [0.85, 0.6, 0.38] }, trees: false, mounds: [],
    part: { color: 0xe0c090, size: 0.05, area: 24, speed: 0.25, opacity: 0.5 }, mist: { c: 0xd8a878, o: 0.3, n: 8, r: [26, 60], h: 3 },
    towers: 46, burn: true, industry: IND, craters: 26, titan: [-15, -17, 0.9],
    wrecks: [[-8.5, -3, 1], [9.5, 2.5, 1.1], [-11, 4.5, 0.9], [12, -6, 1], [-6.5, -16, 1.2], [8, -17, 1], [16, -11, 1.3], [-17, -7, 1.1]],
    fireAt: [[-20, -24], [14, -26], [-8, -30], [24, -18], [-26, -14], [6, -34]], build: mechaBuild
  });
  Board3D.edMood('mecha', 'm_neon', 'Neon-Stadt', {
    sky: 'sky_modern_buildings_night.webp', skyI: 0.5, exp: 1.15, sun: [0x9aa8ff, 1.0, [-0.45, 0.6, -0.5]], hemi: [0x5a50a0, 0x161020, 0.55], fog: [0x1a1430, 0.016], hfog: [0.2, 0.05, 0.45], glow: [0xff60c0, 0.25, 4], tint: [0.92, 0.94, 1.08], snow: 999, shape: 'flach',
    ground: ['asphalt_02', 'concrete_floor_painted', 'asphalt_02'], gTint: [[0.45, 0.46, 0.5], [0.62, 0.62, 0.66]], grass: false, trees: false, mounds: [], beam: 0.09,
    part: { color: 0xa8c8ff, size: 0.04, area: 22, speed: 0.6, opacity: 0.5 }, night: true, ring: true, towers: 70, craters: 10,
    wrecks: [[-8.5, -3, 1], [9.5, 2.5, 1.1], [-11, 4.5, 0.9], [12, -6, 1], [-7, -13, 1.2]], fireAt: [[-16, -20], [15, -22], [-22, -10]], build: mechaBuild
  });
  Board3D.edMood('mecha', 'm_eis', 'Eiswüste', {
    sky: 'sky_kloppenheim_02_puresky.webp', skyI: 1, exp: 1.0, sun: [0xe8f0ff, 2.4, [-0.6, 0.35, -0.7]], hemi: [0xc8d8f0, 0x6a7280, 0.7], fog: [null, 0.012], fogS: [0.78, 0.84, 0.92], hfog: [0.3, 0.04, 0.3], glow: [0xe0f0ff, 0.35, 6], tint: [0.96, 1, 1.06], snow: -1.2,
    ground: ['coast_sand_01', 'gravel_floor_02', 'rock_face_03'], gTint: [[1.05, 1.08, 1.14], [1.2, 1.22, 1.26]], grass: false, trees: false,
    part: { color: 0xffffff, size: 0.05, area: 24, speed: 0.4, opacity: 0.8 }, mist: { c: 0xeef4fa, o: 0.4, n: 10, r: [22, 60], h: 2 },
    ice: true, shape: 'oed', mounds: [], towers: 22, industry: [[-34, -44], [38, -40]], craters: 14, titan: [15, -18, -0.7],
    wrecks: [[-8.5, -3, 1], [10, 3, 1.1], [-12, -8, 1.2], [9, -15, 1]], fireAt: [[-20, -24], [16, -26]], build: mechaBuild
  });
})();
