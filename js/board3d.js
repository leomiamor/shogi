// 3D-Brett mit Three.js: schwebende Insel, Laternen, Kirschblüten, Figuren-Modelle, Partikel.
function Board3D(root, theme, settings) {
  var self = this;
  this.root = root; this.theme = theme; this.settings = settings; this.flip = false; this.hl = {}; this.alive = true;
  this.tweens = []; this.onSquare = null; this.pieces = {}; this.quality = settings.quality || 'high';
  root.innerHTML = ''; root.classList.add('b3');
  var T = THREE, hi = this.quality === 'high';
  var r = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 2 : 1.25));
  r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = hi; r.shadowMap.type = T.PCFSoftShadowMap;
  root.appendChild(r.domElement); this.renderer = r;
  var scene = new T.Scene(); this.scene = scene;
  scene.fog = new T.FogExp2(0x2a1f3d, 0.022);
  scene.background = skyTexture();
  var cam = new T.PerspectiveCamera(38, 1, 0.1, 400); this.camera = cam;
  this.orbit = { theta: 0, phi: 0.78, radius: 17, target: new T.Vector3(0, 0, 0.4), thetaGoal: 0 };

  // Licht
  var hemi = new T.HemisphereLight(0xffd9b0, 0x2a3d6b, 0.85); scene.add(hemi); this.hemi = hemi;
  var sun = new T.DirectionalLight(0xffe2b8, 1.6); this.sun = sun; sun.position.set(-8, 16, 6); sun.castShadow = hi;
  sun.shadow.mapSize.set(1024, 1024); var sc = sun.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 40; sun.shadow.bias = -0.0008;
  scene.add(sun);
  this.lanterns = [];

  // Brett
  var BT = 0.55; this.BT = BT;
  // Statuen-Look: helles Holzbrett (echte Textur) mit Tuschelinien; Kontrast kommt von den dunklen Steinsockeln
  var statue = settings.figSet === 'statue', look = statue ? (settings.scene || 'buehne') : 'insel'; this.look = look;
  var boardMat;
  if (statue) {
    var tone = Board3D.TONES[settings.boardTone] || Board3D.TONES.urushi;
    var cw = Board3D.tex('plywood', 1), cws = Board3D.tex('plywood', [1, 0.08]), sideM;
    if (tone.lacquer || tone.carbon) {
      sideM = new T.MeshStandardMaterial({ color: tone.carbon ? 0x1a1d22 : 0x120c0a, roughness: tone.carbon ? 0.4 : 0.28, metalness: tone.carbon ? 0.6 : 0.1 });
      var topT = lacquerTop();
      boardMat = [sideM, sideM, new T.MeshStandardMaterial(tone.carbon ? { map: topT, roughness: 0.35, metalness: 0.3, emissive: 0xffffff, emissiveMap: topT, emissiveIntensity: 0.45 } : { map: topT, roughness: 0.3, metalness: 0.05 }), sideM, sideM, sideM];
      // Kante oben ringsum: Gold (Lack) bzw. Leuchtleiste (Carbon)
      var gk = tone.edge ? new T.MeshBasicMaterial({ color: tone.edge }) : new T.MeshStandardMaterial({ color: 0xc9a14a, metalness: 1, roughness: 0.3 });
      [[0, 5.2, 9.84, 0.05], [0, -5.2, 9.84, 0.05], [4.9, 0, 0.05, 10.44], [-4.9, 0, 0.05, 10.44]].forEach(function (e) { var m = new T.Mesh(new T.BoxGeometry(e[2], 0.05, e[3]), gk); m.position.set(e[0], BT, e[1]); scene.add(m); });
    } else if (tone.marble) {
      // Marmor: prozedural (Adern aus Rauschen), poliert
      var mt = new T.CanvasTexture(Board3D.marbleCanvas(tone.marble[0], tone.marble[1], 512)); mt.colorSpace = T.SRGBColorSpace;
      sideM = new T.MeshStandardMaterial({ map: mt, roughness: 0.22 });
      boardMat = [sideM, sideM, new T.MeshStandardMaterial({ map: lacquerTop(), roughness: 0.22 }), sideM, sideM, sideM];
    } else {
      sideM = new T.MeshStandardMaterial({ map: cws.map, normalMap: cws.normalMap, roughnessMap: cws.roughnessMap, color: tone.side });
      boardMat = [sideM, sideM, new T.MeshStandardMaterial({ map: lacquerTop(), normalMap: cw.normalMap, roughnessMap: cw.roughnessMap }), sideM, sideM, sideM];
    }
  } else boardMat = [woodMat(0x9a6a3a), woodMat(0x9a6a3a), new T.MeshStandardMaterial({ map: boardTopTexture(settings.skin), roughness: 0.6 }), woodMat(0x5a3a1c), woodMat(0x8a5a2e), woodMat(0x8a5a2e)];
  var board = new T.Mesh(new T.BoxGeometry(9.8, BT, 10.4), boardMat); board.position.y = BT / 2; board.receiveShadow = true; board.castShadow = true; scene.add(board);
  [[-4.3, -4.6], [4.3, -4.6], [-4.3, 4.6], [4.3, 4.6]].forEach(function (p) { var leg = new T.Mesh(new T.CylinderGeometry(0.35, 0.25, 0.5, 8), statue ? boardMat[0] : woodMat(0x4a2c14)); leg.position.set(p[0], -0.25, p[1]); leg.castShadow = true; scene.add(leg); });
  this.lanternObjs = []; this.sakuras = [];
  if (look === 'halle') this.buildHall(hi);
  else if (look === 'buehne') this.buildStage(hi);
  else if (look === 'garten') this.buildGarden(hi);
  else if (look === 'see') this.buildLake(hi);
  else if (look === 'hangar') this.buildHangar(hi);
  else if (look === 'neon') this.buildNeon(hi);
  else if (look === 'orbit') this.buildOrbit(hi);
  else if (look === 'burghof') this.buildCourtyard(hi);
  else if (look === 'hort') this.buildHoard(hi);
  else if (look === 'wald') this.buildForest(hi);
  else if (look === 'park') this.buildPark(hi);
  else if (look === 'show') this.buildShow(hi);
  else if (look === 'strand') this.buildBeach(hi);
  else {

  // Insel
  var island = new T.Mesh(new T.CylinderGeometry(11, 3, 7, 11, 3), new T.MeshStandardMaterial({ color: 0x5b4a5e, flatShading: true, roughness: 1 }));
  jitter(island.geometry, 0.6); island.position.y = -4.05; island.receiveShadow = true; scene.add(island);
  var grass = new T.Mesh(new T.CylinderGeometry(11.2, 11, 0.6, 11), new T.MeshStandardMaterial({ color: 0x4f7a4a, flatShading: true, roughness: 1 }));
  grass.position.y = -0.8; grass.receiveShadow = true; scene.add(grass);
  // Steinplatten unter dem Brett
  var plaza = new T.Mesh(new T.CylinderGeometry(8.2, 8.2, 0.3, 24), new T.MeshStandardMaterial({ color: 0x8b8178, roughness: 0.9 }));
  plaza.position.y = -0.4; plaza.receiveShadow = true; scene.add(plaza);
  // Torii hinter Gote
  this.torii = torii(); this.torii.position.set(0, -0.5, -10); scene.add(this.torii);
  // Laternen
  [[-7, -6], [7, -6], [-7, 6], [7, 6]].forEach(function (p, i) { var l = lantern(); l.position.set(p[0], -0.5, p[1]); scene.add(l); self.lanternObjs.push(l); var pl = new T.PointLight(0xff9a3c, 1.8, 14, 2); pl.position.set(p[0], 1.6, p[1]); scene.add(pl); self.lanterns.push(pl); });
  // Kirschbäume
  if (hi) { [[-9.5, 0], [9.5, -2]].forEach(function (p) { var t = sakura(); t.position.set(p[0], -0.5, p[1]); scene.add(t); self.sakuras.push(t); }); }
  // echte Modelle (Poly Pizza, CC0/CC-BY, Credits im Kodex) ersetzen die Platzhalter, sobald geladen
  if (window.Models) Models.ready(function (M) { self.initEnvModels(M, hi); });
  // ferne Berge & Felsen
  for (var i = 0; i < 14; i++) { var a = i / 14 * Math.PI * 2, m = new T.Mesh(new T.ConeGeometry(6 + Math.random() * 6, 12 + Math.random() * 14, 5), new T.MeshStandardMaterial({ color: 0x3b2f55, flatShading: true })); m.position.set(Math.cos(a) * 70, -18, Math.sin(a) * 70); scene.add(m); }
  for (i = 0; i < 6; i++) { var rk = new T.Mesh(new T.DodecahedronGeometry(0.6 + Math.random() * 1.2), new T.MeshStandardMaterial({ color: 0x6a5a70, flatShading: true })); rk.position.set((Math.random() - .5) * 40, -3 + Math.random() * 5, (Math.random() - .5) * 40); if (rk.position.length() < 15) rk.position.multiplyScalar(2); rk.userData.bob = Math.random() * 6; scene.add(rk); this.tweens.push({ forever: true, f: (function (o, y0) { return function (t) { o.position.y = y0 + Math.sin(t / 1400 + o.userData.bob) * 0.4; o.rotation.y += 0.002; }; })(rk, rk.position.y) }); }
  }

  // Hervorhebungen
  this.hlGroup = new T.Group(); scene.add(this.hlGroup);
  this.tiles = []; this.dots = [];
  var tileGeo = new T.PlaneGeometry(0.97, 0.97), dotGeo = new T.CircleGeometry(0.16, 20), ringGeo = new T.RingGeometry(0.36, 0.46, 28);
  for (i = 0; i < 81; i++) {
    var tm = new T.Mesh(tileGeo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false }));
    tm.rotation.x = -Math.PI / 2; var pos = this.sqPos(i); tm.position.set(pos.x, BT + 0.005, pos.z); tm.visible = false; this.hlGroup.add(tm); this.tiles.push(tm);
    var dm = new T.Mesh(dotGeo, new T.MeshBasicMaterial({ color: 0x9fffb0, transparent: true, opacity: 0.85, depthWrite: false, blending: T.AdditiveBlending }));
    dm.rotation.x = -Math.PI / 2; dm.position.set(pos.x, BT + 0.012, pos.z); dm.visible = false; this.hlGroup.add(dm);
    var rm = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: 0xff5050, transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending }));
    rm.rotation.x = -Math.PI / 2; rm.position.set(pos.x, BT + 0.4, pos.z); rm.visible = false; this.hlGroup.add(rm);
    this.dots.push({ dot: dm, ring: rm });
  }
  this.checkRing = new T.Mesh(new T.RingGeometry(0.4, 0.62, 32), new T.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
  this.checkRing.rotation.x = -Math.PI / 2; this.checkRing.visible = false; scene.add(this.checkRing);

  // Figuren
  this.pieceGroup = new T.Group(); scene.add(this.pieceGroup);
  this.faceTex = {};
  this.komaGeo = komaGeometry();
  // Partikel
  this.initParticles();
  // Halle/Bühne: statt Kirschblüten feiner Goldstaub im Licht
  var PART = { garten: { color: 0xd8ff9a, size: 0.09, area: 18, speed: 0.1, opacity: 0.8 }, wald: { color: 0xb0ffb0, size: 0.1, area: 20, speed: 0.08, opacity: 0.85 },
    neon: { color: 0xa8c8ff, size: 0.05, area: 22, speed: 6, opacity: 0.5 }, hort: { color: 0xff8a30, size: 0.08, area: 18, speed: 0.6, opacity: 0.85, rise: true },
    orbit: { color: 0xcfe8ff, size: 0.04, area: 24, speed: 0.05, opacity: 0.5 },
    park: { color: 0xffffff, size: 0.08, area: 22, speed: 0.12, opacity: 0.7 }, show: { color: 0xffd860, size: 0.07, area: 14, speed: 0.5, opacity: 0.8 }, strand: { color: 0xfff0e0, size: 0.05, area: 22, speed: 0.08, opacity: 0.45 }, hangar: { color: 0xfff0d0, size: 0.04, area: 18, speed: 0.08, opacity: 0.35 } };
  PART.see = PART.garten;
  if (hi) this.initPetals(look === 'insel' ? null : PART[look] || { color: 0xffd9a0, size: 0.06, area: 16, speed: 0.15, opacity: 0.55 });

  // Eingabe
  this.initInput();
  this.resize();
  this._ro = new ResizeObserver(function () { self.resize(); }); this._ro.observe(root);
  var last = performance.now();
  function loop(now) {
    if (!self.alive) return;
    var dt = Math.min(50, now - last); last = now;
    self.update(now, dt);
    r.render(scene, cam);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ---------- Helfer (Szene) ----------
  function woodMat(c) { return new T.MeshStandardMaterial({ color: c, roughness: 0.75, map: grainTexture() }); }
  function jitter(g, amt) { var p = g.attributes.position; for (var k = 0; k < p.count; k++) { if (Math.abs(p.getY(k)) > 3.4) continue; p.setX(k, p.getX(k) + (Math.random() - .5) * amt); p.setZ(k, p.getZ(k) + (Math.random() - .5) * amt); } g.computeVertexNormals(); }
  function skyTexture() {
    var c = document.createElement('canvas'); c.width = 16; c.height = 256; var g = c.getContext('2d');
    var grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, '#0d0b24'); grd.addColorStop(0.45, '#3a2456'); grd.addColorStop(0.75, '#b9566a'); grd.addColorStop(1, '#f2a65a');
    g.fillStyle = grd; g.fillRect(0, 0, 16, 256); var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }
  function grainTexture() {
    if (Board3D._grain) return Board3D._grain;
    var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d');
    g.fillStyle = '#d8b07a'; g.fillRect(0, 0, 256, 256);
    for (var k = 0; k < 90; k++) { g.strokeStyle = 'rgba(110,70,30,' + (0.05 + Math.random() * 0.12) + ')'; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); var y = Math.random() * 256; g.moveTo(0, y); for (var x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x / 30 + k) * 4); g.stroke(); }
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; Board3D._grain = t; return t;
  }
  // Helles Holz + Tuschegitter (Bild lädt asynchron, dann neu zeichnen)
  function lacquerTop() {
    var c = document.createElement('canvas'); c.width = c.height = 1024; var g = c.getContext('2d'), t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    var sx = 1024 / 9.8, sz = 1024 / 10.4, ox = (9.8 - 9) / 2 * sx, oz = (10.4 - 9) / 2 * sz;
    function draw(img) {
      g.fillStyle = tone.mul; g.fillRect(0, 0, 1024, 1024);
      if (img && (tone.marble || tone.lacquer || tone.carbon)) g.drawImage(img, 0, 0, 1024, 1024);
      else if (img) { g.drawImage(img, 0, 0, 1024, 1024); g.globalCompositeOperation = 'multiply'; g.fillStyle = tone.mul; g.fillRect(0, 0, 1024, 1024); g.globalCompositeOperation = 'source-over'; }
      g.strokeStyle = tone.line; g.lineWidth = 3;
      for (var k = 0; k <= 9; k++) { g.beginPath(); g.moveTo(ox + k * sx, oz); g.lineTo(ox + k * sx, oz + 9 * sz); g.stroke(); g.beginPath(); g.moveTo(ox, oz + k * sz); g.lineTo(ox + 9 * sx, oz + k * sz); g.stroke(); }
      g.lineWidth = 6; g.strokeRect(ox - 6, oz - 6, 9 * sx + 12, 9 * sz + 12);
      g.fillStyle = tone.line; [[3, 3], [6, 3], [3, 6], [6, 6]].forEach(function (p) { g.beginPath(); g.arc(ox + p[0] * sx, oz + p[1] * sz, 8, 0, 7); g.fill(); });
      t.needsUpdate = true;
    }
    if (tone.marble) { draw(Board3D.marbleCanvas(tone.marble[0], tone.marble[1], 1024)); return t; }
    if (tone.carbon) { var cc = document.createElement('canvas'); cc.width = cc.height = 1024; var cg = cc.getContext('2d');
      cg.fillStyle = tone.carbon; cg.fillRect(0, 0, 1024, 1024);
      // Köperbindung: versetzte Kästchen hell/dunkel
      for (var cy = 0; cy < 1024; cy += 8) for (var cx = 0; cx < 1024; cx += 8) { var on = ((cx >> 3) + (cy >> 3) * 2) % 4 < 2; cg.fillStyle = on ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.18)'; cg.fillRect(cx, cy, 8, 8); }
      draw(cc); return t; }
    if (tone.lacquer) { var lc = document.createElement('canvas'); lc.width = lc.height = 1024; var lg = lc.getContext('2d');
      var gr = lg.createRadialGradient(512, 460, 80, 512, 512, 760); gr.addColorStop(0, '#2a1a14'); gr.addColorStop(1, tone.lacquer); lg.fillStyle = gr; lg.fillRect(0, 0, 1024, 1024);
      for (var k = 0; k < 2600; k++) { var x = Math.random() * 1024, y = Math.random() * 1024, e = Math.min(x, y, 1024 - x, 1024 - y); if (e > 55 && Math.random() > 0.08) continue; lg.fillStyle = 'rgba(214,170,80,' + (0.25 + Math.random() * 0.5) + ')'; lg.fillRect(x, y, 1.5, 1.5); }
      draw(lc); return t; }
    draw(null); var img = new Image(); img.onload = function () { draw(img); }; img.src = Board3D.TEX + 'plywood_diff.webp';
    return t;
  }
  function boardTopTexture(sk) {
    sk = sk || { a: '#e9c487', b: '#d9ad6c', line: '#2b1a0c' };
    var c = document.createElement('canvas'); c.width = c.height = 1024; var g = c.getContext('2d');
    var grd = g.createLinearGradient(0, 0, 1024, 1024); grd.addColorStop(0, sk.a); grd.addColorStop(1, sk.b); g.fillStyle = grd; g.fillRect(0, 0, 1024, 1024);
    for (var k = 0; k < 160; k++) { g.strokeStyle = 'rgba(140,90,40,' + (0.03 + Math.random() * 0.08) + ')'; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); var y = Math.random() * 1024; g.moveTo(0, y); for (var x = 0; x <= 1024; x += 32) g.lineTo(x, y + Math.sin(x / 90 + k) * 9); g.stroke(); }
    // Brett 9.8 x 10.4, Felder 1x1 → Gitter in Pixel
    var sx = 1024 / 9.8, sz = 1024 / 10.4, ox = (9.8 - 9) / 2 * sx, oz = (10.4 - 9) / 2 * sz;
    if (sk.check) for (var cy = 0; cy < 9; cy++) for (var cx = 0; cx < 9; cx++) { g.fillStyle = (cx + cy) % 2 ? sk.b : sk.a; g.fillRect(ox + cx * sx, oz + cy * sz, sx, sz); }
    g.strokeStyle = sk.line; g.lineWidth = 3;
    for (k = 0; k <= 9; k++) { g.beginPath(); g.moveTo(ox + k * sx, oz); g.lineTo(ox + k * sx, oz + 9 * sz); g.stroke(); g.beginPath(); g.moveTo(ox, oz + k * sz); g.lineTo(ox + 9 * sx, oz + k * sz); g.stroke(); }
    g.fillStyle = sk.line; [[3, 3], [6, 3], [3, 6], [6, 6]].forEach(function (p) { g.beginPath(); g.arc(ox + p[0] * sx, oz + p[1] * sz, 8, 0, 7); g.fill(); });
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  function torii() {
    var g = new T.Group(), red = new T.MeshStandardMaterial({ color: 0xc8322b, roughness: 0.6 }), blk = new T.MeshStandardMaterial({ color: 0x1a1a1a });
    [-3.2, 3.2].forEach(function (x) { var p = new T.Mesh(new T.CylinderGeometry(0.28, 0.32, 7, 10), red); p.position.set(x, 3.5, 0); p.castShadow = true; g.add(p); });
    var top = new T.Mesh(new T.BoxGeometry(9, 0.45, 0.6), blk); top.position.y = 7.2; g.add(top);
    var top2 = new T.Mesh(new T.BoxGeometry(8.4, 0.4, 0.5), red); top2.position.y = 6.8; g.add(top2);
    var mid = new T.Mesh(new T.BoxGeometry(7.6, 0.3, 0.35), red); mid.position.y = 5.6; g.add(mid);
    return g;
  }
  function lantern() {
    var g = new T.Group(), stone = new T.MeshStandardMaterial({ color: 0x9a948c, roughness: 0.95, flatShading: true });
    var b = new T.Mesh(new T.CylinderGeometry(0.5, 0.6, 0.3, 6), stone); b.position.y = 0.15; g.add(b);
    var c = new T.Mesh(new T.CylinderGeometry(0.15, 0.2, 1, 6), stone); c.position.y = 0.8; g.add(c);
    var light = new T.Mesh(new T.BoxGeometry(0.6, 0.5, 0.6), new T.MeshStandardMaterial({ color: 0xffb060, emissive: 0xff8a2a, emissiveIntensity: 2 })); light.position.y = 1.55; g.add(light);
    var roof = new T.Mesh(new T.ConeGeometry(0.75, 0.5, 6), stone); roof.position.y = 2.05; g.add(roof);
    g.traverse(function (o) { o.castShadow = true; });
    return g;
  }
  function sakura() {
    var g = new T.Group(), trunk = new T.Mesh(new T.CylinderGeometry(0.2, 0.4, 4, 7), new T.MeshStandardMaterial({ color: 0x4a2c22 }));
    trunk.position.y = 2; trunk.rotation.z = 0.15; g.add(trunk);
    var pink = new T.MeshStandardMaterial({ color: 0xf6a5c0, flatShading: true, roughness: 0.8, emissive: 0x3a0a1a });
    for (var k = 0; k < 6; k++) { var b = new T.Mesh(new T.IcosahedronGeometry(1 + Math.random() * 0.8, 0), pink); b.position.set((Math.random() - .5) * 2.6, 4 + Math.random() * 1.6, (Math.random() - .5) * 2.6); b.castShadow = true; g.add(b); }
    return g;
  }
  function komaGeometry() {
    var s = new T.Shape(), w = 0.42, h = 0.46;
    s.moveTo(0, h); s.lineTo(w * 0.82, h * 0.55); s.lineTo(w, -h); s.lineTo(-w, -h); s.lineTo(-w * 0.82, h * 0.55); s.closePath();
    var geo = new T.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 2 });
    geo.rotateX(-Math.PI / 2); // liegt flach, Spitze zeigt nach -z (vorwärts für Sente)
    geo.translate(0, 0.03, 0);
    return geo;
  }
}

// ---------- Statuen-Welt: echte Texturen (Poly Haven, CC0) ----------
Board3D.TEX = 'tex/';
Board3D._tex = {};
// {map, normalMap, roughnessMap} einer Poly-Haven-Textur, rep = Wiederholung (Zahl oder [x, y])
Board3D.tex = function (name, rep) {
  var r = Array.isArray(rep) ? rep : [rep || 1, rep || 1], key = name + ':' + r.join('x');
  if (Board3D._tex[key]) return Board3D._tex[key];
  var T = THREE, L = Board3D._loader || (Board3D._loader = new T.TextureLoader()), out = {};
  [['map', '_diff'], ['normalMap', '_nor'], ['roughnessMap', '_rough']].forEach(function (k) {
    var t = L.load(Board3D.TEX + name + k[1] + '.webp'); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(r[0], r[1]); t.anisotropy = 8;
    if (k[0] === 'map') t.colorSpace = T.SRGBColorSpace; out[k[0]] = t;
  });
  return (Board3D._tex[key] = out);
};
// Sockel im Statuen-Modus: [Ober-/Unterseite, Rand]. Befördert: Rand in rotem Lack.
Board3D.prototype.komaMats = function (ks, col, promo) {
  var key = ks + ':' + col + ':' + (promo ? 1 : 0); this._koma = this._koma || {};
  if (this._koma[key]) return this._koma[key];
  var T = THREE, cap;
  if (ks === 'stein') { var st = Board3D.tex('slate_floor', 0.5); cap = new T.MeshStandardMaterial({ map: st.map, normalMap: st.normalMap, roughnessMap: st.roughnessMap, color: 0x6a6a6a }); }
  else if (ks === 'metall') cap = this.statueMat(col, null);
  else { var w = Board3D.tex('ash_veneer', 1); cap = new T.MeshStandardMaterial({ map: w.map, normalMap: w.normalMap, roughnessMap: w.roughnessMap, color: 0xf0d6a0 }); }
  // Stein: Seiten glatt poliert (die Schiefertextur wird an den Fasen gestreckt und blitzt weiß)
  var side = promo ? new T.MeshStandardMaterial({ color: 0x9e1b14, roughness: 0.22, metalness: 0.1 }) : ks === 'stein' ? new T.MeshStandardMaterial({ color: 0x141416, roughness: 0.6 }) : cap;
  return (this._koma[key] = [cap, side]);
};
// weiches Licht aus Kamerarichtung, damit Sockelfronten und Figuren auch in Nahsicht nicht absaufen
Board3D.prototype.addCamLight = function (k) {
  var l = new THREE.DirectionalLight(0xfff2e0, k); this.scene.add(l); this.scene.add(l.target); this.camLight = l;
};
// dünner Goldrand oben auf dem Sockel (Fünfeck-Ring), geteilt von allen Steinen
Board3D.prototype.komaRim = function () {
  var T = THREE;
  if (!this._rim) {
    var w = 0.42, h = 0.46, k = 0.88;
    function pent(sc) { return [[0, h], [w * 0.82, h * 0.55], [w, -h], [-w, -h], [-w * 0.82, h * 0.55]].map(function (p) { return new T.Vector2(p[0] * sc, p[1] * sc); }); }
    var sh = new T.Shape(pent(1)), hole = new T.Path(pent(k).reverse()); sh.holes.push(hole);
    var geo = new T.ShapeGeometry(sh); geo.rotateX(-Math.PI / 2);
    this._rim = { geo: geo, mat: new T.MeshStandardMaterial({ color: 0xd4aa50, metalness: 1, roughness: 0.28, polygonOffset: true, polygonOffsetFactor: -2 }) };
  }
  var m = new T.Mesh(this._rim.geo, this._rim.mat); m.position.y = 0.222; return m;
};
Board3D.prototype.useHdr = function (file) {
  var self = this, scene = this.scene;
  if (!window.Models) return;
  scene.environment = Models.envMap(this.renderer);
  Models.hdr(this.renderer, Board3D.TEX + file).then(function (e) { if (self.alive) scene.environment = e; }).catch(function () {});
};
// Shoji-Wand: Papier mit Holzgitter, Papier leuchtet warm von hinten
Board3D.prototype.shojiTexture = function () {
  var T = THREE, c = document.createElement('canvas'); c.width = 256; c.height = 512; var g = c.getContext('2d');
  g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, 256, 512);
  for (var k = 0; k < 400; k++) { g.fillStyle = 'rgba(160,130,90,' + Math.random() * 0.05 + ')'; g.fillRect(Math.random() * 256, Math.random() * 512, 2 + Math.random() * 6, 1); }
  g.fillStyle = '#3a2416';
  for (var x = 0; x <= 4; x++) g.fillRect(Math.min(250, Math.max(0, x * 64 - 3)), 0, x % 4 ? 5 : 8, 512);
  for (var y = 0; y <= 8; y++) g.fillRect(0, Math.min(500, Math.max(0, y * 64 - 3)), 256, y % 8 ? 5 : 12);
  var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; t.anisotropy = 4; return t;
};
// Rollbild im Tokonoma: 王将 in Tusche, rotes Siegel
Board3D.prototype.scrollTexture = function () {
  var T = THREE, c = document.createElement('canvas'); c.width = 256; c.height = 640; var g = c.getContext('2d'), t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  function draw() {
    g.fillStyle = '#4a3a2a'; g.fillRect(0, 0, 256, 640); g.fillStyle = '#efe4cc'; g.fillRect(22, 60, 212, 520);
    g.fillStyle = '#1a120c'; g.font = 'bold 150px "Noto Serif JP", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('王', 128, 200); g.fillText('将', 128, 380);
    g.fillStyle = '#b0201a'; g.fillRect(150, 480, 40, 40); t.needsUpdate = true;
  }
  draw(); if (document.fonts) document.fonts.ready.then(draw);
  return t;
};
// Tempelhalle: Tatami, Shoji-Wände, Zedernholz-Pfosten, Tokonoma, Andon-Lampen, warmes Licht
Board3D.prototype.buildHall = function (hi) {
  var T = THREE, scene = this.scene, self = this, Y = -0.5, R = 12, H = 8;
  scene.background = new T.Color(0x0a0604); scene.fog = new T.FogExp2(0x0a0604, 0.02);
  // neutrales Studio-HDRI für die Spiegelungen: ein oranges Raum-HDRI färbt Silber golden (Besitz unklar)
  this.hemi.color.set(0xffe8cc); this.hemi.groundColor.set(0x1a0f08); this.hemi.intensity = 0.3;
  this.sun.color.set(0xfff0dc); this.sun.intensity = 1.3; this.sun.position.set(-3, 18, 6);
  this.useHdr('studio_kontrast_01.hdr'); this.addCamLight(0.9);
  var tt = Board3D.tex('tatami_mat', [R * 2 / 6, R * 2 / 12]);
  var floor = new T.Mesh(new T.PlaneGeometry(R * 2, R * 2), new T.MeshStandardMaterial({ map: tt.map, normalMap: tt.normalMap, roughnessMap: tt.roughnessMap, color: 0xc8b890 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = Y; floor.receiveShadow = true; scene.add(floor);
  var cd = Board3D.tex('japanese_cedar_planks', [0.3, 2]), cedar = new T.MeshStandardMaterial({ map: cd.map, normalMap: cd.normalMap, roughnessMap: cd.roughnessMap, color: 0x8a6040 });
  var sh = this.shojiTexture(); sh.repeat.set(R * 2 / 4, 1);
  var paper = new T.MeshStandardMaterial({ map: sh, emissive: 0xffc888, emissiveMap: sh, emissiveIntensity: 0.32, roughness: 0.9 });
  // je Wandseite eine Gruppe; steht die Kamera dahinter, wird die Seite ausgeblendet (update)
  var side = {}; this.hallSides = [];
  [['x', 1], ['x', -1], ['z', 1], ['z', -1]].forEach(function (a) { var g = new T.Group(); scene.add(g); side[a[0] + a[1]] = g; self.hallSides.push({ axis: a[0], sign: a[1], g: g, R: R }); });
  [[R, 0, -Math.PI / 2, 'x1'], [-R, 0, Math.PI / 2, 'x-1'], [0, R, Math.PI, 'z1']].forEach(function (w) {
    var m = new T.Mesh(new T.PlaneGeometry(R * 2, H), paper); m.position.set(w[0], Y + H / 2, w[1]); m.rotation.y = w[2]; side[w[3]].add(m);
  });
  // Rückwand: dunkle Holzwand mit Rollbild (Tokonoma)
  var bw = Board3D.tex('japanese_cedar_planks', [6, 1.5]);
  var back = new T.Mesh(new T.PlaneGeometry(R * 2, H), new T.MeshStandardMaterial({ map: bw.map, normalMap: bw.normalMap, roughnessMap: bw.roughnessMap, color: 0x5a3c28 }));
  back.position.set(0, Y + H / 2, -R); side['z-1'].add(back);
  var scroll = new T.Mesh(new T.PlaneGeometry(1.9, 4.75), new T.MeshStandardMaterial({ map: this.scrollTexture(), roughness: 0.85 })); scroll.position.set(0, Y + 4.1, -R + 0.08); scene.add(scroll);
  var nicheLight = new T.SpotLight(0xffd8a8, 60, 14, 0.45, 0.7, 2); nicheLight.position.set(0, Y + 7.5, -R + 4); nicheLight.target = scroll; scene.add(nicheLight);
  // Pfosten und Balken aus Zedernholz
  var post = new T.BoxGeometry(0.45, H, 0.45);
  [-R, -R / 2, 0, R / 2, R].forEach(function (a) {
    [[a, -R + 0.1, 'z-1'], [a, R - 0.1, 'z1'], [-R + 0.1, a, 'x-1'], [R - 0.1, a, 'x1']].forEach(function (p) { var m = new T.Mesh(post, cedar); m.position.set(p[0], Y + H / 2, p[1]); side[p[2]].add(m); });
  });
  [[0, -R + 0.15, 0, 'z-1'], [0, R - 0.15, 0, 'z1'], [-R + 0.15, 0, 1, 'x-1'], [R - 0.15, 0, 1, 'x1']].forEach(function (b) {
    [Y + 0.12, Y + 6.2, Y + H - 0.2].forEach(function (y) { var m = new T.Mesh(new T.BoxGeometry(R * 2, 0.3, 0.35), cedar); m.position.set(b[0], y, b[1]); m.rotation.y = b[2] ? Math.PI / 2 : 0; side[b[3]].add(m); });
  });
  // Andon-Lampen (Papier im Holzrahmen)
  [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(function (p) {
    var g = new T.Group(), shade = new T.Mesh(new T.BoxGeometry(0.8, 1.3, 0.8), new T.MeshStandardMaterial({ color: 0xf2dcb0, emissive: 0xffb060, emissiveIntensity: 1.4, roughness: 1 }));
    shade.position.y = 1.35; g.add(shade);
    [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]].forEach(function (q) { var l = new T.Mesh(new T.BoxGeometry(0.08, 2.1, 0.08), cedar); l.position.set(q[0], 1.05, q[1]); g.add(l); });
    var cap = new T.Mesh(new T.BoxGeometry(0.98, 0.08, 0.98), cedar); cap.position.y = 2.06; g.add(cap);
    g.position.set(p[0], Y, p[1]); g.traverse(function (o) { o.castShadow = true; }); scene.add(g); self.lanternObjs.push(g);
    var pl = new T.PointLight(0xffa850, 6, 16, 2); pl.position.set(p[0], Y + 1.4, p[1]); pl.userData.base = 6; scene.add(pl); self.lanterns.push(pl);
  });
};
// Dunkle Bühne: schwarzer Schieferboden, ein Spotlicht von oben, leichter Lichtkegel
Board3D.prototype.buildStage = function (hi) {
  var T = THREE, scene = this.scene, Y = -0.5;
  scene.background = new T.Color(0x000000); scene.fog = new T.FogExp2(0x000000, 0.016);
  this.hemi.intensity = 0.3; this.sun.intensity = 1.3; this.sun.position.set(-2, 18, 4);
  this.useHdr('ferndale_studio_09.hdr'); this.addCamLight(0.6);
  var floor = new T.Mesh(new T.CircleGeometry(40, 64), new T.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.32, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = Y - 0.35; floor.receiveShadow = true; scene.add(floor);
  // runde Bühne aus schwarzem Stein mit Goldkante, damit das Brett nicht im Nichts steht
  var st = Board3D.tex('slate_floor', 3);
  var dais = new T.Mesh(new T.CylinderGeometry(9, 9.3, 0.35, 72), [new T.MeshStandardMaterial({ color: 0x141416, roughness: 0.5 }), new T.MeshStandardMaterial({ map: st.map, color: 0x2a2a2e, roughness: 0.4 }), new T.MeshStandardMaterial({ color: 0x141416 })]);
  dais.position.y = Y - 0.175; dais.receiveShadow = true; scene.add(dais);
  var gold = new T.MeshStandardMaterial({ color: 0xd4a440, metalness: 1, roughness: 0.3 });
  [[9.02, 0.035, Y], [9.32, 0.05, Y - 0.35]].forEach(function (r) { var ring = new T.Mesh(new T.TorusGeometry(r[0], r[1], 8, 120), gold); ring.rotation.x = Math.PI / 2; ring.position.y = r[2]; scene.add(ring); });
  var spot = new T.SpotLight(0xfff0d8, 3400, 40, 0.55, 0.5, 2); spot.position.set(0, 20, 3); spot.target.position.set(0, 0, 0.5); spot.castShadow = hi; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0006;
  scene.add(spot); scene.add(spot.target);
  var rim = new T.DirectionalLight(0x9fb8ff, 0.6); rim.position.set(0, 6, -14); scene.add(rim);
  var cone = new T.Mesh(new T.ConeGeometry(8.6, 20, 48, 1, true), new T.MeshBasicMaterial({ color: 0xfff0d8, transparent: true, opacity: 0.018, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
  cone.position.set(0, 10, 1.8); cone.rotation.x = 0.15; scene.add(cone);
};

// ================= Editionen: Mecha / Sci-Fi =================
// Material aus Poly-Haven-Textur (CC0) mit Färbung
Board3D.prototype.texMat = function (name, rep, color, extra) {
  var t = Board3D.tex(name, rep);
  return new THREE.MeshStandardMaterial(Object.assign({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, color: color || 0xffffff }, extra || {}));
};
// Warnstreifen (gelb/schwarz) als Canvas-Textur
Board3D.hazardTex = function () {
  if (Board3D._haz) return Board3D._haz;
  var c = document.createElement('canvas'); c.width = 256; c.height = 32; var g = c.getContext('2d');
  g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, 256, 32); g.fillStyle = '#e8b21c';
  for (var x = -32; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 32); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.fill(); }
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return (Board3D._haz = t);
};
// Hangar: Betonboden mit Markierungen, Wände aus Stahlplatten, Lichtbänder, Kran, Kisten
Board3D.prototype.buildHangar = function (hi) {
  var T = THREE, scene = this.scene, Y = -0.5;
  scene.background = new T.Color(0x0c0f13); scene.fog = new T.FogExp2(0x0c0f13, 0.018);
  this.hemi.color.set(0xcfe0ff); this.hemi.groundColor.set(0x202428); this.hemi.intensity = 0.5;
  this.sun.color.set(0xeaf2ff); this.sun.intensity = 1.6; this.sun.position.set(-3, 18, 5);
  this.useHdr('studio_kontrast_01.hdr'); this.addCamLight(0.7);
  var floor = new T.Mesh(new T.PlaneGeometry(60, 60), this.texMat('concrete_floor_painted', 10, 0x6a7280, { roughness: 0.5 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = Y; floor.receiveShadow = true; scene.add(floor);
  // Landefeld-Markierung: Warnstreifen-Rahmen + Kreis
  var hz = Board3D.hazardTex(), hm = new T.MeshStandardMaterial({ map: hz, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1 });
  [[0, -8.2, 17, 0], [0, 8.2, 17, 0], [-8.2, 0, 17, Math.PI / 2], [8.2, 0, 17, Math.PI / 2]].forEach(function (e) {
    var tx = hz.clone(); tx.needsUpdate = true; tx.repeat.set(e[2] / 2, 1); var m = new T.Mesh(new T.PlaneGeometry(e[2], 0.5), new T.MeshStandardMaterial({ map: tx, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = e[3]; m.position.set(e[0], Y + 0.01, e[1]); m.receiveShadow = true; scene.add(m);
  });
  var ring = new T.Mesh(new T.RingGeometry(10.6, 10.9, 96), new T.MeshBasicMaterial({ color: 0x46d7ff, transparent: true, opacity: 0.55 })); ring.rotation.x = -Math.PI / 2; ring.position.y = Y + 0.012; scene.add(ring);
  // Wände aus Stahlplatten, mit Stützen
  var wallM = this.texMat('metal_plate', [8, 2], 0x6a7078, { metalness: 0.6 }), beamM = new T.MeshStandardMaterial({ color: 0x2a2e34, metalness: 0.7, roughness: 0.4 });
  [[0, -22, 0, 46], [-22, 0, Math.PI / 2, 46], [22, 0, Math.PI / 2, 46]].forEach(function (w) {
    var g = new T.Group(), wall = new T.Mesh(new T.BoxGeometry(w[3], 14, 0.4), wallM); wall.position.y = 7; wall.receiveShadow = true; g.add(wall);
    for (var x = -w[3] / 2 + 3; x < w[3] / 2; x += 6) { var b = new T.Mesh(new T.BoxGeometry(0.7, 14, 0.9), beamM); b.position.set(x, 7, 0.5); g.add(b); }
    var strip = new T.Mesh(new T.BoxGeometry(w[3], 0.6, 0.5), new T.MeshStandardMaterial({ map: hz, color: 0xffffff })); strip.material.map = hz.clone(); strip.material.map.needsUpdate = true; strip.material.map.repeat.set(w[3] / 2, 1); strip.position.set(0, 0.3, 0.3); g.add(strip);
    g.position.set(w[0], Y, w[1]); g.rotation.y = w[2]; scene.add(g);
  });
  // Lichtbänder an der Decke
  var lm = new T.MeshBasicMaterial({ color: 0xdff4ff });
  for (var z = -18; z <= 14; z += 8) { var l = new T.Mesh(new T.BoxGeometry(30, 0.15, 0.5), lm); l.position.set(0, 13, z); scene.add(l); }
  var key = new T.SpotLight(0xe8f4ff, 2600, 40, 0.6, 0.6, 2); key.position.set(0, 18, 2); key.target.position.set(0, 0, 0); key.castShadow = hi; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0006; scene.add(key); scene.add(key.target);
  // Brückenkran über dem Feld
  var crane = new T.Group(), ym = new T.MeshStandardMaterial({ color: 0xd8a21a, metalness: 0.4, roughness: 0.45 });
  var girder = new T.Mesh(new T.BoxGeometry(44, 0.9, 1.2), ym); girder.position.set(0, 11, 0); crane.add(girder);
  var trolley = new T.Mesh(new T.BoxGeometry(2, 1, 2), beamM); trolley.position.set(-6, 10.3, 0); crane.add(trolley);
  var cable = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 6), beamM); cable.position.set(-6, 7, 0); crane.add(cable);
  var hook = new T.Mesh(new T.TorusGeometry(0.35, 0.09, 8, 16, Math.PI * 1.4), ym); hook.position.set(-6, 3.8, 0); crane.add(hook);
  crane.position.z = -12; scene.add(crane);
  // Frachtkisten
  var crateM = this.texMat('metal_plate', 1, 0x4a5a6a, { metalness: 0.5 });
  [[-15, -14, 2.2, 0.2], [-12.6, -15, 1.6, 0.5], [-15, -14, 1.4, 0.1, 2.2], [14, -15, 2.4, -0.3], [16, -11, 1.8, 0.4], [-16, 10, 2, 0.6], [15, 12, 1.6, -0.2]].forEach(function (c) {
    var m = new T.Mesh(new T.BoxGeometry(c[2], c[2], c[2]), crateM); m.position.set(c[0], Y + c[2] / 2 + (c[4] || 0), c[1]); m.rotation.y = c[3]; m.castShadow = m.receiveShadow = true; scene.add(m);
  });
};

// Hochhaus-Skyline als Instanzen mit leuchtenden Fenstern
Board3D.windowTex = function () {
  if (Board3D._win) return Board3D._win;
  var c = document.createElement('canvas'); c.width = 128; c.height = 256; var g = c.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, 128, 256);
  for (var y = 4; y < 256; y += 10) for (var x = 4; x < 128; x += 10) if (Math.random() < 0.35) { g.fillStyle = ['#ffd890', '#9fe8ff', '#ff9ad8', '#fff2c8'][(Math.random() * 4) | 0]; g.globalAlpha = 0.4 + Math.random() * 0.6; g.fillRect(x, y, 6, 6); }
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return (Board3D._win = t);
};
Board3D.neonSign = function (text, color) {
  var c = document.createElement('canvas'); c.width = 512; c.height = 160; var g = c.getContext('2d');
  g.font = 'bold 110px "Noto Sans JP", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 30; g.fillStyle = color; g.fillText(text, 256, 84); g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.globalAlpha = 0.7; g.fillText(text, 256, 84);
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
// Neon-Dach: nasses Hochhausdach bei Nacht, Skyline, Neonschilder, Regen
Board3D.prototype.buildNeon = function (hi) {
  var T = THREE, scene = this.scene, Y = -0.5;
  scene.background = new T.Color(0x070512); scene.fog = new T.FogExp2(0x120a24, 0.012);
  this.hemi.color.set(0x8a7cff); this.hemi.groundColor.set(0x100818); this.hemi.intensity = 0.45;
  this.sun.color.set(0xd8d0ff); this.sun.intensity = 1.2; this.sun.position.set(-4, 16, 6);
  this.useHdr('studio_kontrast_01.hdr'); this.addCamLight(0.75); this.skyBackground('sky_modern_buildings_night.webp', 0.45);
  // nasser Asphalt (glänzt), Dachrand
  var floor = new T.Mesh(new T.PlaneGeometry(30, 30), this.texMat('asphalt_02', 6, 0x3a3c44, { roughness: 0.18, metalness: 0.4 }));
  floor.material.roughnessMap = null; floor.rotation.x = -Math.PI / 2; floor.position.y = Y; floor.receiveShadow = true; scene.add(floor);
  var edgeM = this.texMat('concrete_floor_painted', [6, 0.3], 0x55585e);
  [[0, -15, 30, 0], [0, 15, 30, 0], [-15, 0, 30, Math.PI / 2], [15, 0, 30, Math.PI / 2]].forEach(function (e) { var m = new T.Mesh(new T.BoxGeometry(e[2], 0.9, 0.5), edgeM); m.position.set(e[0], Y + 0.45, e[1]); m.rotation.y = e[3]; scene.add(m); });
  // Lüftungskästen, Antenne, Wassertank
  var boxM = new T.MeshStandardMaterial({ color: 0x3a3e46, metalness: 0.6, roughness: 0.4 });
  [[-11, -10, 2.4, 1.6, 1.8], [11, -11, 1.8, 2.2, 1.8], [-12, 9, 2.6, 1.2, 1.6]].forEach(function (b) { var m = new T.Mesh(new T.BoxGeometry(b[2], b[3], b[4]), boxM); m.position.set(b[0], Y + b[3] / 2, b[1]); m.castShadow = true; scene.add(m); });
  var tank = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 3, 20), boxM); tank.position.set(12, Y + 3.2, 9); scene.add(tank);
  [[-0.0, 0]].forEach(function () { for (var k = 0; k < 4; k++) { var leg = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 1.8), boxM); leg.position.set(12 + (k % 2 ? 1 : -1), Y + 0.9, 9 + (k < 2 ? 1 : -1)); scene.add(leg); } });
  var ant = new T.Mesh(new T.CylinderGeometry(0.05, 0.1, 9), boxM); ant.position.set(-11, Y + 6.1, -10); scene.add(ant);
  var blink = new T.Mesh(new T.SphereGeometry(0.18, 10, 8), new T.MeshBasicMaterial({ color: 0xff2030 })); blink.position.set(-11, Y + 10.7, -10); scene.add(blink);
  this.tweens.push({ forever: true, f: function (t) { blink.visible = (t / 700 | 0) % 2 === 0; } });
  // Neonschilder (leuchten, färben das Dach)
  var self = this;
  [['電脳', '#ff3fb4', -9, -14.8, 0], ['将棋', '#3fe6ff', 9, -14.8, 0], ['OPEN', '#ffd23f', -14.8, 2, Math.PI / 2]].forEach(function (n) {
    var m = new T.Mesh(new T.PlaneGeometry(5.2, 1.6), new T.MeshBasicMaterial({ map: Board3D.neonSign(n[0], n[1]), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    m.position.set(n[2], Y + 2.6, n[3]); m.rotation.y = n[4]; scene.add(m);
    var pl = new T.PointLight(new T.Color(n[1]), 60, 18, 2); pl.position.set(n[2] * 0.85, Y + 2.6, n[3] * 0.85 || n[3]); scene.add(pl);
    var pole = new T.Mesh(new T.BoxGeometry(0.15, 2.6, 0.15), boxM); pole.position.set(n[2], Y + 1.3, n[3]); pole.rotation.y = n[4]; scene.add(pole);
  });
  // Skyline ringsum
  var N = 140, bm = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ color: 0x0c0e16, emissive: 0xffffff, emissiveMap: Board3D.windowTex(), emissiveIntensity: 0.9, roughness: 0.6 }), N);
  var m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3();
  for (var i = 0; i < N; i++) { var a = Math.random() * Math.PI * 2, r = 32 + Math.random() * 50, w = 3 + Math.random() * 6, h = 10 + Math.random() * 45; q.setFromAxisAngle(new T.Vector3(0, 1, 0), Math.random() * 3); m4.compose(v.set(Math.cos(a) * r, Y - 20 + h / 2, Math.sin(a) * r), q, s.set(w, h, w)); bm.setMatrixAt(i, m4); }
  scene.add(bm);
};

// Sternenhimmel prozedural (Canvas als Equirect)
Board3D.starSky = function () {
  if (Board3D._stars) return Board3D._stars;
  var c = document.createElement('canvas'); c.width = 4096; c.height = 2048; var g = c.getContext('2d');
  g.fillStyle = '#020309'; g.fillRect(0, 0, 4096, 2048);
  // Nebelband
  for (var k = 0; k < 90; k++) { var x = Math.random() * 4096, y = 900 + Math.sin(x / 650) * 260 + (Math.random() - 0.5) * 300, r = 120 + Math.random() * 260, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, ['rgba(90,60,160,.10)', 'rgba(40,110,170,.09)', 'rgba(160,60,120,.07)'][k % 3]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  for (k = 0; k < 9000; k++) { var b = Math.random(); g.fillStyle = 'rgba(255,255,255,' + (b * b * 0.9 + 0.1) + ')'; var sz = b > 0.985 ? 3 : b > 0.9 ? 2 : 1; g.fillRect(Math.random() * 4096, Math.random() * 2048, sz, sz); }
  var t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; return (Board3D._stars = t);
};
Board3D.planetTex = function () {
  var c = document.createElement('canvas'); c.width = 1024; c.height = 512; var g = c.getContext('2d');
  for (var y = 0; y < 512; y++) { var t = y / 512, b = Math.sin(t * 40 + Math.sin(t * 9) * 3) * 0.5 + 0.5; g.fillStyle = 'rgb(' + (180 + b * 50 | 0) + ',' + (120 + b * 40 | 0) + ',' + (80 + b * 20 | 0) + ')'; g.fillRect(0, y, 1024, 1); }
  for (var k = 0; k < 40; k++) { g.fillStyle = 'rgba(255,240,220,.08)'; g.beginPath(); g.ellipse(Math.random() * 1024, Math.random() * 512, 40 + Math.random() * 120, 6 + Math.random() * 10, 0, 0, 7); g.fill(); }
  var tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
};
// Orbitalstation: Sechseck-Deck im All, Geländer mit Lichtleisten, großer Ringplanet, Sterne
Board3D.prototype.buildOrbit = function (hi) {
  var T = THREE, scene = this.scene, Y = -0.5;
  scene.background = Board3D.starSky(); scene.backgroundIntensity = 1; scene.fog = null;
  this.hemi.color.set(0xb8c8ff); this.hemi.groundColor.set(0x101420); this.hemi.intensity = 0.4;
  this.sun.color.set(0xfff4e0); this.sun.intensity = 2.2; this.sun.position.set(10, 14, -6);
  this.useHdr('studio_kontrast_01.hdr'); this.addCamLight(0.7);
  var deckM = this.texMat('metal_plate', 5, 0x8a9098, { metalness: 0.7 });
  var deck = new T.Mesh(new T.CylinderGeometry(11, 11.5, 0.8, 6), [new T.MeshStandardMaterial({ color: 0x2a2e36, metalness: 0.8, roughness: 0.35 }), deckM, deckM]);
  deckM.color.set(0xb0b6c0); deckM.metalness = 0.5;
  deck.rotation.y = Math.PI / 6; deck.position.y = Y - 0.4; deck.receiveShadow = true; scene.add(deck);
  var under = new T.Mesh(new T.CylinderGeometry(8, 2.5, 6, 6), new T.MeshStandardMaterial({ color: 0x23272e, metalness: 0.8, roughness: 0.4 })); under.rotation.y = Math.PI / 6; under.position.y = Y - 3.8; scene.add(under);
  // Lichtleiste am Deckrand + Geländerpfosten
  var glow = new T.MeshBasicMaterial({ color: 0x46d7ff }), postM = new T.MeshStandardMaterial({ color: 0x3a3f48, metalness: 0.8, roughness: 0.3 });
  [[10.9, 0.06, Y + 0.02, glow], [10.75, 0.06, Y + 1.1, postM]].forEach(function (r) { var t = new T.Mesh(new T.TorusGeometry(r[0], r[1], 6, 6), r[3]); t.rotation.set(Math.PI / 2, 0, Math.PI / 6 + Math.PI / 6); t.position.y = r[2]; scene.add(t); });
  for (var i = 0; i < 6; i++) { var a0 = i * Math.PI / 3 + Math.PI / 3, post = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 1.1), postM); post.position.set(Math.cos(a0) * 10.75, Y + 0.55, Math.sin(a0) * 10.75); scene.add(post); }
  // Ringplanet + Mond
  var planet = new T.Mesh(new T.SphereGeometry(40, 64, 32), new T.MeshStandardMaterial({ map: Board3D.planetTex(), roughness: 1 }));
  planet.position.set(-70, -10, -120); planet.rotation.z = 0.35; scene.add(planet);
  var rc = document.createElement('canvas'); rc.width = 512; rc.height = 4; var rg = rc.getContext('2d'); for (var x = 0; x < 512; x++) { rg.fillStyle = 'rgba(230,210,180,' + (0.15 + 0.6 * Math.abs(Math.sin(x * 0.07) * Math.sin(x * 0.013))) + ')'; rg.fillRect(x, 0, 1, 4); }
  var rt = new T.CanvasTexture(rc); rt.colorSpace = T.SRGBColorSpace;
  var rgeo = new T.RingGeometry(52, 82, 96, 1), uv = rgeo.attributes.uv, pp = rgeo.attributes.position; for (var k = 0; k < uv.count; k++) { var d = Math.hypot(pp.getX(k), pp.getY(k)); uv.setXY(k, (d - 52) / 30, 0.5); }
  var rings = new T.Mesh(rgeo, new T.MeshBasicMaterial({ map: rt, transparent: true, side: T.DoubleSide, depthWrite: false })); rings.position.copy(planet.position); rings.rotation.set(-Math.PI / 2 + 0.35, 0.2, 0); scene.add(rings);
  var moon = new T.Mesh(new T.SphereGeometry(6, 32, 16), new T.MeshStandardMaterial({ color: 0x9aa0aa, roughness: 1 })); moon.position.set(60, 25, -110); scene.add(moon);
  // Station: Ausleger und Solarpaneele
  var panelM = new T.MeshStandardMaterial({ color: 0x1a2a5a, metalness: 0.6, roughness: 0.25, emissive: 0x0a1430 });
  [[-1, 0], [1, 0]].forEach(function (s) {
    var arm = new T.Mesh(new T.BoxGeometry(16, 0.4, 0.4), postM); arm.position.set(s[0] * 19, Y - 1, -4); scene.add(arm);
    for (var j = 0; j < 3; j++) { var p = new T.Mesh(new T.BoxGeometry(4, 0.1, 7), panelM); p.position.set(s[0] * (14 + j * 4.6), Y - 1, -4); p.rotation.x = 0.3; scene.add(p); }
  });
  this.tweens.push({ forever: true, f: function (t) { planet.rotation.y = t * 0.00001; } });
};

// ================= Editionen: Klassisch Fantasy =================
// Banner mit Wappen (Löwe / Rabe als einfache Form)
Board3D.bannerTex = function (bg, fg) {
  var c = document.createElement('canvas'); c.width = 128; c.height = 256; var g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 0); g.lineTo(128, 220); g.lineTo(64, 256); g.lineTo(0, 220); g.fill();
  g.strokeStyle = '#d8b25a'; g.lineWidth = 6; g.stroke();
  g.fillStyle = fg; g.beginPath(); g.moveTo(64, 50); g.lineTo(100, 90); g.lineTo(90, 160); g.lineTo(64, 185); g.lineTo(38, 160); g.lineTo(28, 90); g.fill();
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
// Fackel mit flackerndem Licht
Board3D.prototype.torch = function (x, y, z) {
  var T = THREE, g = new T.Group();
  var st = new T.Mesh(new T.CylinderGeometry(0.07, 0.05, 0.8, 6), new T.MeshStandardMaterial({ color: 0x3a2414 })); g.add(st);
  var fl = new T.Mesh(new T.ConeGeometry(0.16, 0.45, 8), new T.MeshBasicMaterial({ color: 0xffa040 })); fl.position.y = 0.6; g.add(fl);
  var pl = new T.PointLight(0xff8a30, 18, 9, 2); pl.position.y = 0.8; g.add(pl);
  g.position.set(x, y, z); this.scene.add(g);
  this.tweens.push({ forever: true, f: function (t) { var k = 0.8 + Math.sin(t / 70 + x) * 0.1 + Math.sin(t / 37 + z) * 0.1; pl.intensity = 18 * k; fl.scale.y = k; } });
};
// Burgturm (rund, Zinnen, Kegeldach)
Board3D.prototype.tower = function (x, z, Y, wallM, roofM) {
  var T = THREE, g = new T.Group();
  var body = new T.Mesh(new T.CylinderGeometry(2.4, 2.6, 13, 20), wallM); body.position.y = 6.5; body.castShadow = body.receiveShadow = true; g.add(body);
  for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2, m = new T.Mesh(new T.BoxGeometry(0.8, 0.9, 0.5), wallM); m.position.set(Math.cos(a) * 2.45, 13.4, Math.sin(a) * 2.45); m.rotation.y = -a; g.add(m); }
  var roof = new T.Mesh(new T.ConeGeometry(2.9, 4.5, 20), roofM); roof.position.y = 15.4; g.add(roof);
  g.position.set(x, Y, z); this.scene.add(g); return g;
};
// Burghof: Kopfsteinpflaster, Mauern mit Zinnen, Ecktürme, Banner, Fackeln, Abendhimmel
Board3D.prototype.buildCourtyard = function (hi) {
  var T = THREE, scene = this.scene, self = this, Y = -0.5;
  scene.background = new T.Color(0x2a1c24); scene.fog = new T.FogExp2(0x3a2830, 0.01);
  this.hemi.color.set(0xffc8a0); this.hemi.groundColor.set(0x2a2028); this.hemi.intensity = 0.55;
  this.sun.color.set(0xffb070); this.sun.intensity = 1.9; this.sun.position.set(-12, 10, -8);
  this.useHdr('studio_kontrast_01.hdr'); this.addCamLight(0.7); this.skyBackground('sky_qwantani_dusk_2_puresky.webp', 0.7);
  var floor = new T.Mesh(new T.PlaneGeometry(40, 40), this.texMat('cobblestone_floor_001', 8, 0x9a9088));
  floor.rotation.x = -Math.PI / 2; floor.position.y = Y; floor.receiveShadow = true; scene.add(floor);
  var wallM = this.texMat('castle_brick_07', [10, 2], 0xb0a698), roofM = new T.MeshStandardMaterial({ color: 0x3a3e5a, roughness: 0.7 });
  [[0, -18, 0], [-18, 0, Math.PI / 2], [18, 0, Math.PI / 2]].forEach(function (w) {
    var g = new T.Group(), wall = new T.Mesh(new T.BoxGeometry(36, 8, 1.6), wallM); wall.position.y = 4; wall.receiveShadow = true; wall.castShadow = true; g.add(wall);
    for (var x = -17.4; x < 18; x += 1.6) { var m = new T.Mesh(new T.BoxGeometry(0.9, 0.9, 1.6), wallM); m.position.set(x, 8.45, 0); g.add(m); }
    g.position.set(w[0], Y, w[1]); g.rotation.y = w[2]; scene.add(g);
  });
  [[-18, -18], [18, -18]].forEach(function (p) { self.tower(p[0], p[1], Y, wallM, roofM); });
  // Tor mit Fallgitter hinten
  var gate = new T.Mesh(new T.BoxGeometry(5, 6, 0.3), new T.MeshStandardMaterial({ color: 0x1a1410 })); gate.position.set(0, Y + 3, -17.1); scene.add(gate);
  var bars = new T.MeshStandardMaterial({ color: 0x2a2a2e, metalness: 0.8, roughness: 0.5 });
  for (var x = -2.2; x <= 2.2; x += 0.55) { var b = new T.Mesh(new T.BoxGeometry(0.12, 5.6, 0.12), bars); b.position.set(x, Y + 2.9, -16.9); scene.add(b); }
  // Banner an der Mauer (blau Löwenherz, rot Rabenstein)
  [[-8, '#1c3a8a', '#d8b25a'], [8, '#8a1c1c', '#1a1a1a'], [-13, '#1c3a8a', '#d8b25a'], [13, '#8a1c1c', '#1a1a1a']].forEach(function (b) {
    var m = new T.Mesh(new T.PlaneGeometry(2, 4), new T.MeshStandardMaterial({ map: Board3D.bannerTex(b[1], b[2]), transparent: true, side: T.DoubleSide, roughness: 0.8 }));
    m.position.set(b[0], Y + 5, -17.15); scene.add(m);
  });
  [[-6, -17], [6, -17], [-17, -6], [-17, 6], [17, -6], [17, 6]].forEach(function (p) { self.torch(p[0] * 0.98, Y + 3.2, p[1] * 0.98); });
  // Brunnen und Fässer
  var well = new T.Mesh(new T.CylinderGeometry(1.4, 1.5, 1, 16, 1, true), wallM); well.position.set(12, Y + 0.5, 10); scene.add(well);
  var barrelM = new T.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.8 });
  [[-13, 11], [-12, 12.2], [-14.2, 12]].forEach(function (p) { var m = new T.Mesh(new T.CylinderGeometry(0.55, 0.5, 1.3, 12), barrelM); m.position.set(p[0], Y + 0.65, p[1]); m.castShadow = true; scene.add(m); });
};

// Goldhaufen: viele Münzen als Instanzen
Board3D.prototype.coinPile = function (x, z, Y, r, h, n) {
  var T = THREE, M = this._coinM || (this._coinM = new T.MeshStandardMaterial({ color: 0xe0b040, metalness: 1, roughness: 0.25 }));
  var mesh = new T.InstancedMesh(new T.CylinderGeometry(0.18, 0.18, 0.04, 10), M, n), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3(1, 1, 1);
  for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r, y = Y + h * 0.85 * Math.sqrt(Math.max(0, 1 - (d / r) * (d / r) / 0.85)) + 0.02; e.set(Math.random() * 1.2, Math.random() * 6, Math.random() * 1.2); q.setFromEuler(e); m4.compose(v.set(x + Math.cos(a) * d, y, z + Math.sin(a) * d), q, s); mesh.setMatrixAt(i, m4); }
  var moundM = this._moundM || (this._moundM = new T.MeshStandardMaterial({ color: 0xb08420, metalness: 0.9, roughness: 0.55 }));
  var mound = new T.Mesh(new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), moundM); mound.scale.set(r * 0.92, h * 0.85, r * 0.92); mound.position.set(x, Y, z);
  this.scene.add(mound); this.scene.add(mesh);
};
// Drachenhort: Felshöhle, Goldberge, Lavaspalten, leuchtende Kristalle, aufsteigende Funken
Board3D.prototype.buildHoard = function (hi) {
  var T = THREE, scene = this.scene, self = this, Y = -0.5;
  scene.background = new T.Color(0x0a0605); scene.fog = new T.FogExp2(0x140806, 0.03);
  this.hemi.color.set(0xff9a60); this.hemi.groundColor.set(0x1a0806); this.hemi.intensity = 0.35;
  this.sun.color.set(0xffd0a0); this.sun.intensity = 1.2; this.sun.position.set(-2, 16, 4);
  this.useHdr('studio_kontrast_01.hdr'); this.addCamLight(0.7);
  var rockM = this.texMat('rock_face_03', 6, 0x6a5a52);
  var floor = new T.Mesh(new T.CircleGeometry(30, 48), rockM); floor.rotation.x = -Math.PI / 2; floor.position.y = Y; floor.receiveShadow = true; scene.add(floor);
  // Höhlenwand: innen sichtbarer, verbeulter Zylinder
  var wg = new T.CylinderGeometry(24, 26, 26, 40, 8, true), wp = wg.attributes.position;
  for (var i = 0; i < wp.count; i++) { var x = wp.getX(i), y = wp.getY(i), z = wp.getZ(i), n = 1 + 0.12 * Math.sin(x * 0.5 + y * 0.3) + 0.08 * Math.sin(z * 0.7 - y * 0.5); wp.setXYZ(i, x * n, y, z * n); }
  wg.computeVertexNormals();
  var cave = new T.Mesh(wg, this.texMat('rock_face_03', [8, 4], 0x4a3e3a, { side: T.BackSide })); cave.position.y = Y + 12; scene.add(cave);
  // Lavaspalten (leuchten), Licht von unten
  var lava = new T.MeshBasicMaterial({ color: 0xff5a10 });
  [[-14, 6, 0.4, 9, 0.5], [13, -4, 0.35, 11, -0.4], [6, 15, 0.3, 7, 1.2], [-9, -15, 0.3, 8, 2.2]].forEach(function (c) {
    var m = new T.Mesh(new T.PlaneGeometry(c[2], c[3]), lava); m.rotation.x = -Math.PI / 2; m.rotation.z = c[4]; m.position.set(c[0], Y + 0.02, c[1]); scene.add(m);
    var pl = new T.PointLight(0xff5a10, 40, 14, 2); pl.position.set(c[0], Y + 0.8, c[1]); scene.add(pl);
  });
  // Goldberge
  [[-12, -9, 4, 2.4, 500], [11, -11, 5, 3, 650], [-14, 7, 3, 1.6, 300], [13, 9, 3.5, 2, 380], [0, -15, 4, 2.2, 450]].forEach(function (p) { self.coinPile(p[0], p[1], Y, p[2], p[3], (hi ? 3 : 1) * p[4]); });
  var goldLight = new T.PointLight(0xffc860, 30, 20, 2); goldLight.position.set(0, Y + 5, -10); scene.add(goldLight);
  // Truhe
  var chest = new T.Mesh(new T.BoxGeometry(1.6, 1, 1), new T.MeshStandardMaterial({ color: 0x5a3418, roughness: 0.7 })); chest.position.set(-9, Y + 0.5, -12); chest.rotation.y = 0.5; scene.add(chest);
  // Kristalle (leuchtend violett)
  var crM = new T.MeshStandardMaterial({ color: 0x9a6aff, emissive: 0x6a30ff, emissiveIntensity: 1.4, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.9 });
  [[-18, -4], [17, 2], [-6, 18], [9, -18], [18, 14], [-17, 14]].forEach(function (p, k) {
    for (var j = 0; j < 4; j++) { var c = new T.Mesh(new T.OctahedronGeometry(0.6 + Math.random() * 0.6, 0), crM); c.scale.y = 2.4; c.position.set(p[0] + (Math.random() - 0.5) * 1.6, Y + 0.8, p[1] + (Math.random() - 0.5) * 1.6); c.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * 3, (Math.random() - 0.5) * 0.6); scene.add(c); }
    var pl = new T.PointLight(0x8a50ff, 12, 9, 2); pl.position.set(p[0], Y + 1.5, p[1]); scene.add(pl);
  });
  // Stalaktiten
  var stM = this.texMat('rock_face_03', [1, 2], 0x4a3e3a);
  for (i = 0; i < 26; i++) { var a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 10, st = new T.Mesh(new T.ConeGeometry(0.5 + Math.random() * 0.8, 3 + Math.random() * 5, 7), stM); st.rotation.x = Math.PI; st.position.set(Math.cos(a) * r, Y + 22 - Math.random() * 3, Math.sin(a) * r); scene.add(st); }
};

// Leuchtpilz
Board3D.prototype.mushroom = function (x, z, Y, s, col) {
  var T = THREE, g = new T.Group();
  var stem = new T.Mesh(new T.CylinderGeometry(0.08, 0.12, 0.6, 8), new T.MeshStandardMaterial({ color: 0xe8e0d0 })); stem.position.y = 0.3; g.add(stem);
  var cap = new T.Mesh(new T.SphereGeometry(0.35, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.55, roughness: 0.4 })); cap.position.y = 0.58; cap.scale.y = 0.7; g.add(cap);
  g.scale.setScalar(s); g.position.set(x, Y, z); this.scene.add(g);
};
// Riesenbaum mit Wurzeln und Blätterkrone
Board3D.prototype.bigTree = function (x, z, Y, s, barkM, leafM) {
  var T = THREE, g = new T.Group();
  var trunk = new T.Mesh(new T.CylinderGeometry(1.1, 1.8, 24, 14), barkM); trunk.position.y = 12; trunk.castShadow = true; g.add(trunk);
  for (var i = 0; i < 5; i++) { var a = i / 5 * Math.PI * 2 + 0.3, root = new T.Mesh(new T.CylinderGeometry(0.25, 0.6, 3.4, 8), barkM); root.position.set(Math.cos(a) * 1.7, 0.7, Math.sin(a) * 1.7); root.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(root); }
  for (i = 0; i < 6; i++) { var l = new T.Mesh(new T.IcosahedronGeometry(4 + Math.random() * 2.5, 1), leafM); l.position.set((Math.random() - 0.5) * 7, 22 + Math.random() * 5, (Math.random() - 0.5) * 7); l.scale.y = 0.6; g.add(l); }
  g.scale.setScalar(s); g.position.set(x, Y, z); this.scene.add(g);
};
// Elfenwald: Waldboden, Riesenbäume, Leuchtpilze, Lichtsäulen, Steinkreis, Glühwürmchen
Board3D.prototype.buildForest = function (hi) {
  var T = THREE, scene = this.scene, self = this, Y = -0.5;
  scene.background = new T.Color(0x0a1612); scene.fog = new T.FogExp2(0x10241c, 0.028);
  this.hemi.color.set(0xb8ffd8); this.hemi.groundColor.set(0x0a140e); this.hemi.intensity = 0.5;
  this.sun.color.set(0xe8ffd0); this.sun.intensity = 1.7; this.sun.position.set(-4, 18, 2);
  this.useHdr('studio_kontrast_01.hdr'); this.addCamLight(0.75);
  var floor = new T.Mesh(new T.CircleGeometry(40, 48), this.texMat('forest_ground_04', 10, 0x8a9a7a)); floor.rotation.x = -Math.PI / 2; floor.position.y = Y; floor.receiveShadow = true; scene.add(floor);
  // Steinkreis-Plattform unter dem Brett
  var plat = new T.Mesh(new T.CylinderGeometry(8.6, 8.9, 0.3, 40), this.texMat('cobblestone_floor_001', 3, 0x8a8a80)); plat.position.y = Y + 0.05; plat.receiveShadow = true; scene.add(plat);
  var stoneM = this.texMat('cobblestone_floor_001', [0.5, 1.2], 0x9a9a98);
  for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2 + 0.31, m = new T.Mesh(new T.BoxGeometry(0.9, 2.6 + (i % 3) * 0.5, 0.6), stoneM); m.position.set(Math.cos(a) * 10.2, Y + 1.3, Math.sin(a) * 10.2); m.rotation.y = -a; m.castShadow = true; scene.add(m); }
  var runeM = new T.MeshBasicMaterial({ color: 0x7affc8 });
  var rune = new T.Mesh(new T.RingGeometry(8.95, 9.1, 96), runeM); rune.rotation.x = -Math.PI / 2; rune.position.y = Y + 0.21; scene.add(rune);
  // Riesenbäume ringsum
  var barkM = this.texMat('bark_brown_02', [3, 6], 0x8a7a6a), leafM = new T.MeshStandardMaterial({ color: 0x2a5a32, roughness: 0.9, flatShading: true });
  [[-15, -12, 1], [14, -14, 1.2], [-19, 4, 0.9], [18, 6, 1.1], [-6, -21, 1.3], [7, -22, 1], [-14, 17, 1], [15, 18, 0.9], [26, -6, 1.2], [-26, -8, 1.1]].forEach(function (t) { self.bigTree(t[0], t[1], Y, t[2], barkM, leafM); });
  // Leuchtpilze
  var cols = [0x40e0ff, 0x9a6aff, 0x60ffb0];
  for (i = 0; i < 40; i++) { var a2 = Math.random() * Math.PI * 2, r = 11 + Math.random() * 12; self.mushroom(Math.cos(a2) * r, Math.sin(a2) * r, Y, 0.6 + Math.random() * 1.2, cols[i % 3]); }
  [[-12, 8], [12, -8], [-9, -12], [11, 11]].forEach(function (p, k) { var pl = new T.PointLight(cols[k % 3], 14, 10, 2); pl.position.set(p[0], Y + 1, p[1]); scene.add(pl); });
  // Lichtsäulen durchs Blätterdach
  var shaft = new T.MeshBasicMaterial({ color: 0xeaffd0, transparent: true, opacity: 0.05, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  [[-4, -6, 0.2], [6, 3, -0.15], [-8, 8, 0.1]].forEach(function (s) { var m = new T.Mesh(new T.CylinderGeometry(1.6, 3.2, 30, 20, 1, true), shaft); m.position.set(s[0], 14, s[1]); m.rotation.z = s[2]; scene.add(m); });
};

// ================= Edition: Hunde =================
// Laubbaum (kleiner als der Elfenbaum, sonnig grün)
Board3D.prototype.parkTree = function (x, z, Y, s) {
  var T = THREE, g = new T.Group(), bark = this._parkBark || (this._parkBark = this.texMat('bark_brown_02', [1, 2], 0x9a8a7a)), leaf = this._parkLeaf || (this._parkLeaf = new T.MeshStandardMaterial({ color: 0x4f8a3a, roughness: 0.9, flatShading: true }));
  var tr = new T.Mesh(new T.CylinderGeometry(0.35, 0.5, 5, 10), bark); tr.position.y = 2.5; tr.castShadow = true; g.add(tr);
  [[0, 6.2, 0, 2.6], [-1.4, 5.4, 0.6, 1.9], [1.3, 5.6, -0.5, 2], [0.4, 5, 1.4, 1.7], [-0.6, 5.2, -1.3, 1.8]].forEach(function (l) { var m = new T.Mesh(new T.IcosahedronGeometry(l[3], 1), leaf); m.position.set(l[0], l[1], l[2]); m.castShadow = true; g.add(m); });
  g.scale.setScalar(s); g.position.set(x, Y, z); this.scene.add(g);
};
// Hundepark: Wiese, Lattenzaun, Bäume, Hydrant, Bank, Agility-Hürden, Ball, Napf, Sommerhimmel
Board3D.prototype.buildPark = function (hi) {
  var T = THREE, scene = this.scene, self = this, Y = -0.5;
  scene.background = new T.Color(0x9cc4e8); scene.fog = new T.FogExp2(0xb8d4ea, 0.008);
  this.hemi.color.set(0xdfefff); this.hemi.groundColor.set(0x3a4a2a); this.hemi.intensity = 0.7;
  this.sun.color.set(0xfff0d0); this.sun.intensity = 2.2; this.sun.position.set(-10, 18, 8);
  this.useHdr('studio_kontrast_01.hdr'); this.addCamLight(0.5); this.skyBackground('sky_kloofendal_38d_partly_cloudy_puresky.webp', 0.9);
  var grass = new T.Mesh(new T.CircleGeometry(60, 48), this.texMat('leafy_grass', 18, 0xb0c890)); grass.rotation.x = -Math.PI / 2; grass.position.y = Y; grass.receiveShadow = true; scene.add(grass);
  // Kiesweg-Kreis unter dem Brett
  var path = new T.Mesh(new T.CircleGeometry(8.4, 48), this.texMat('coast_sand_01', 3, 0xc8b89a)); path.rotation.x = -Math.PI / 2; path.position.y = Y + 0.01; path.receiveShadow = true; scene.add(path);
  // weißer Lattenzaun im Quadrat (Instanzen)
  var N = 0, pts = [], k, x;
  for (x = -17; x <= 17; x += 0.7) { pts.push([x, -17, 0], [x, 17, 0], [-17, x, 1], [17, x, 1]); }
  var picket = new T.InstancedMesh(new T.BoxGeometry(0.22, 1.3, 0.08), new T.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.7 }), pts.length), m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), sc = new T.Vector3(1, 1, 1), up = new T.Vector3(0, 1, 0);
  pts.forEach(function (p, i) { q.setFromAxisAngle(up, p[2] ? Math.PI / 2 : 0); m4.compose(v.set(p[0], Y + 0.65, p[1]), q, sc); picket.setMatrixAt(i, m4); });
  picket.castShadow = true; scene.add(picket);
  var railM = new T.MeshStandardMaterial({ color: 0xe8e6e0 });
  [[0, -17, 0], [0, 17, 0], [-17, 0, Math.PI / 2], [17, 0, Math.PI / 2]].forEach(function (r) { [0.35, 0.95].forEach(function (h) { var m = new T.Mesh(new T.BoxGeometry(34, 0.1, 0.06), railM); m.position.set(r[0], Y + h, r[1] + (r[2] ? 0 : -0.06)); m.rotation.y = r[2]; scene.add(m); }); });
  // Bäume
  [[-13, -12, 1.1], [12, -13, 1.25], [-14, 8, 0.95], [14, 10, 1.1], [-5, -14.5, 0.85], [22, -4, 1.3], [-22, -2, 1.2], [6, 22, 1]].forEach(function (t) { self.parkTree(t[0], t[1], Y, t[2]); });
  // Hydrant
  var red = new T.MeshStandardMaterial({ color: 0xc8261e, roughness: 0.4, metalness: 0.2 }), hy = new T.Group();
  hy.add(new T.Mesh(new T.CylinderGeometry(0.32, 0.36, 1.1, 14), red)); hy.children[0].position.y = 0.55;
  var cap = new T.Mesh(new T.SphereGeometry(0.34, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), red); cap.position.y = 1.1; hy.add(cap);
  var nub = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.9, 10), red); nub.rotation.z = Math.PI / 2; nub.position.y = 0.75; hy.add(nub);
  hy.position.set(10.5, Y, 7); hy.traverse(function (o) { o.castShadow = true; }); scene.add(hy);
  // Parkbank
  var wood = this.texMat('brown_planks_03', [1, 0.3], 0xc89a6a), iron = new T.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.4 }), bench = new T.Group();
  for (k = 0; k < 3; k++) { var pl = new T.Mesh(new T.BoxGeometry(3.4, 0.08, 0.28), wood); pl.position.set(0, 0.9, -0.35 + k * 0.32); bench.add(pl); }
  for (k = 0; k < 2; k++) { var bk = new T.Mesh(new T.BoxGeometry(3.4, 0.28, 0.08), wood); bk.position.set(0, 1.25 + k * 0.36, -0.55); bench.add(bk); }
  [-1.4, 1.4].forEach(function (lx) { var leg = new T.Mesh(new T.BoxGeometry(0.08, 0.9, 0.8), iron); leg.position.set(lx, 0.45, -0.1); bench.add(leg); });
  bench.position.set(-11, Y, -9); bench.rotation.y = 0.6; bench.traverse(function (o) { o.castShadow = true; }); scene.add(bench);
  // Agility-Hürden (rot-weiß gestreift)
  var c = document.createElement('canvas'); c.width = 64; c.height = 8; var g = c.getContext('2d'); for (k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#d42a20'; g.fillRect(k * 8, 0, 8, 8); }
  var stripe = new T.CanvasTexture(c); stripe.colorSpace = T.SRGBColorSpace;
  [[11, -6, 0.3], [12.5, -1, -0.2], [-12, 2, 0.1]].forEach(function (hd) {
    var h = new T.Group(), postM = new T.MeshStandardMaterial({ color: 0x2a5ad4 });
    [-1, 1].forEach(function (s) { var p = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.2), postM); p.position.set(s * 1, 0.6, 0); h.add(p); });
    var bar = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.1, 8), new T.MeshStandardMaterial({ map: stripe })); bar.rotation.z = Math.PI / 2; bar.position.y = 0.75; h.add(bar);
    h.position.set(hd[0], Y, hd[1]); h.rotation.y = hd[2]; h.traverse(function (o) { o.castShadow = true; }); scene.add(h);
  });
  // Tennisball, Frisbee, Napf, Knochen
  var ball = new T.Mesh(new T.SphereGeometry(0.22, 16, 12), new T.MeshStandardMaterial({ color: 0xd8f040, roughness: 0.9 })); ball.position.set(7.4, Y + 0.22, 8.8); ball.castShadow = true; scene.add(ball);
  var fr = new T.Mesh(new T.CylinderGeometry(0.5, 0.45, 0.06, 24), new T.MeshStandardMaterial({ color: 0xff6a20, roughness: 0.4 })); fr.position.set(-8.5, Y + 0.03, 9.5); scene.add(fr);
  var bowl = new T.Mesh(new T.CylinderGeometry(0.55, 0.4, 0.3, 20, 1, true), new T.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 1, roughness: 0.25, side: T.DoubleSide })); bowl.position.set(9.6, Y + 0.15, 8.6); scene.add(bowl);
  var water = new T.Mesh(new T.CircleGeometry(0.47, 20), new T.MeshStandardMaterial({ color: 0x4a8ac8, roughness: 0.1 })); water.rotation.x = -Math.PI / 2; water.position.set(9.6, Y + 0.24, 8.6); scene.add(water);
  var boneM = new T.MeshStandardMaterial({ color: 0xf2e8d0, roughness: 0.6 }), bone = new T.Group();
  var sh = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.8, 10), boneM); sh.rotation.z = Math.PI / 2; bone.add(sh);
  [[-0.42, 0.08], [-0.42, -0.08], [0.42, 0.08], [0.42, -0.08]].forEach(function (b) { var s = new T.Mesh(new T.SphereGeometry(0.12, 10, 8), boneM); s.position.set(b[0], 0, b[1]); bone.add(s); });
  bone.position.set(-9.2, Y + 0.12, -4.5); bone.rotation.y = 0.8; scene.add(bone);
};

// Rosette (Siegerschleife) als Canvas
Board3D.rosetteTex = function (col, text) {
  var c = document.createElement('canvas'); c.width = 256; c.height = 384; var g = c.getContext('2d');
  g.fillStyle = col; g.beginPath(); g.moveTo(80, 180); g.lineTo(60, 380); g.lineTo(100, 340); g.lineTo(128, 380); g.lineTo(128, 180); g.fill();
  g.beginPath(); g.moveTo(176, 180); g.lineTo(196, 380); g.lineTo(156, 340); g.lineTo(128, 380); g.lineTo(128, 180); g.fill();
  for (var k = 0; k < 24; k++) { var a = k / 24 * Math.PI * 2; g.beginPath(); g.ellipse(128 + Math.cos(a) * 80, 128 + Math.sin(a) * 80, 34, 20, a, 0, 7); g.fill(); }
  g.fillStyle = '#f4ead2'; g.beginPath(); g.arc(128, 128, 66, 0, 7); g.fill();
  g.fillStyle = '#2a1a10'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 132);
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
// Hundeschau: grüner Siegerring mit weißer Kordel, roter Teppich, Podest 1-2-3, Tribünen, Scheinwerfer, Rosetten
Board3D.prototype.buildShow = function (hi) {
  var T = THREE, scene = this.scene, self = this, Y = -0.5;
  scene.background = new T.Color(0x0a0810); scene.fog = new T.FogExp2(0x0e0a14, 0.014);
  this.hemi.color.set(0xfff0e0); this.hemi.groundColor.set(0x1a1018); this.hemi.intensity = 0.4;
  this.sun.color.set(0xfff4e8); this.sun.intensity = 1.2; this.sun.position.set(0, 18, 6);
  this.useHdr('ferndale_studio_09.hdr'); this.addCamLight(0.65);
  var floor = new T.Mesh(new T.CircleGeometry(50, 48), this.texMat('wood_floor', 14, 0x8a6a50, { roughness: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.position.y = Y; floor.receiveShadow = true; scene.add(floor);
  // grüner Ring (Kunstrasen-Teppich) mit weißer Kordel
  var ring = new T.Mesh(new T.CircleGeometry(10.5, 64), new T.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.95 })); ring.rotation.x = -Math.PI / 2; ring.position.y = Y + 0.02; ring.receiveShadow = true; scene.add(ring);
  var postM = new T.MeshStandardMaterial({ color: 0xd8b25a, metalness: 1, roughness: 0.3 }), rope = new T.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.8 });
  for (var k = 0; k < 16; k++) { var a = k / 16 * Math.PI * 2; if (Math.abs(Math.sin(a) - 1) < 0.05) continue; var p = new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 1.1, 10), postM); p.position.set(Math.cos(a) * 10.8, Y + 0.55, Math.sin(a) * 10.8); p.castShadow = true; scene.add(p);
    var top = new T.Mesh(new T.SphereGeometry(0.12, 10, 8), postM); top.position.set(p.position.x, Y + 1.15, p.position.z); scene.add(top); }
  var rp = new T.Mesh(new T.TorusGeometry(10.8, 0.035, 6, 120, Math.PI * 2 - 0.55), rope); rp.rotation.x = -Math.PI / 2; rp.rotation.z = Math.PI / 2 + 0.275; rp.position.y = Y + 0.95; scene.add(rp);
  // roter Teppich vom Eingang (Spielerseite) zum Ring
  var carpet = new T.Mesh(new T.PlaneGeometry(2.6, 22), new T.MeshStandardMaterial({ color: 0x9a1418, roughness: 0.9 })); carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, Y + 0.015, 21); scene.add(carpet);
  // Siegerpodest hinten (1 in der Mitte)
  var podM = new T.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.5 }), numCol = ['#d4a440', '#b8bcc4', '#b0703a'];
  [[0, 1.6, '1'], [-2.6, 1.1, '2'], [2.6, 0.7, '3']].forEach(function (d, i) {
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'); g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, 128, 128); g.fillStyle = numCol[i]; g.font = 'bold 96px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(d[2], 64, 70);
    var ft = new T.CanvasTexture(c); ft.colorSpace = T.SRGBColorSpace;
    var m = new T.Mesh(new T.BoxGeometry(2.5, d[1], 2), [podM, podM, podM, podM, new T.MeshStandardMaterial({ map: ft }), podM]); m.position.set(d[0], Y + d[1] / 2, -15); m.castShadow = m.receiveShadow = true; scene.add(m);
  });
  // Rosetten an Ständern hinter dem Podest
  [['#1c4ac8', 'BEST'], ['#c81c3a', '1st'], ['#d4a440', 'WIN']].forEach(function (r, i) {
    var m = new T.Mesh(new T.PlaneGeometry(2, 3), new T.MeshBasicMaterial({ map: Board3D.rosetteTex(r[0], r[1]), transparent: true, side: T.DoubleSide })); m.position.set(-5 + i * 5, Y + 5.5, -17); scene.add(m);
  });
  // Tribünen ringsum (Stufen) mit Publikum als bunte Punkte
  var stepM = new T.MeshStandardMaterial({ color: 0x2a2630, roughness: 0.8 }), crowd = [];
  for (var s = 0; s < 4; s++) { var st = new T.Mesh(new T.CylinderGeometry(20 + s * 1.6, 20 + s * 1.6, 0.8 + s * 0.8, 48, 1, true, -Math.PI * 0.85, Math.PI * 1.7), stepM); st.material.side = T.DoubleSide; st.position.y = Y + (0.8 + s * 0.8) / 2; st.rotation.y = Math.PI; scene.add(st);
    for (k = 0; k < 60; k++) { var a2 = Math.PI + (-0.85 + 1.7 * k / 60) * Math.PI; crowd.push([Math.sin(a2) * (20.6 + s * 1.6), Y + 0.8 + s * 0.8 + 0.4, Math.cos(a2) * (20.6 + s * 1.6)]); } }
  var cm = new T.InstancedMesh(new T.CapsuleGeometry(0.28, 0.5, 4, 8), new T.MeshStandardMaterial({ roughness: 0.8 }), crowd.length), m4 = new T.Matrix4(), col = new T.Color();
  crowd.forEach(function (p, i) { m4.makeTranslation(p[0], p[1], p[2]); cm.setMatrixAt(i, m4); cm.setColorAt(i, col.setHSL(Math.random(), 0.5, 0.45)); }); scene.add(cm);
  // Scheinwerfer
  var spot = new T.SpotLight(0xfff4e0, 3000, 40, 0.5, 0.5, 2); spot.position.set(0, 20, 4); spot.target.position.set(0, 0, 0.3); spot.castShadow = hi; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0006; scene.add(spot); scene.add(spot.target);
  [[-14, 0x9ad0ff], [14, 0xffb0d0]].forEach(function (s) { var l = new T.SpotLight(s[1], 900, 40, 0.4, 0.6, 2); l.position.set(s[0], 14, -8); l.target.position.set(0, 0, 0); scene.add(l); scene.add(l.target); });
  var cone = new T.Mesh(new T.ConeGeometry(8.5, 20, 48, 1, true), new T.MeshBasicMaterial({ color: 0xfff0d8, transparent: true, opacity: 0.02, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); cone.position.set(0, 10, 1.8); cone.rotation.x = 0.2; scene.add(cone);
};

// Leuchtturm (rot-weiß, drehendes Licht)
Board3D.prototype.lighthouse = function (x, z, Y) {
  var T = THREE, g = new T.Group(), c = document.createElement('canvas'); c.width = 8; c.height = 64; var gg = c.getContext('2d');
  for (var k = 0; k < 4; k++) { gg.fillStyle = k % 2 ? '#f4f0e8' : '#c8261e'; gg.fillRect(0, k * 16, 8, 16); }
  var tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
  var body = new T.Mesh(new T.CylinderGeometry(1.4, 2.2, 16, 20), new T.MeshStandardMaterial({ map: tx, roughness: 0.6 })); body.position.y = 8; g.add(body);
  var gal = new T.Mesh(new T.CylinderGeometry(2, 2, 0.3, 20), new T.MeshStandardMaterial({ color: 0x2a2a2a })); gal.position.y = 16.2; g.add(gal);
  var lamp = new T.Mesh(new T.CylinderGeometry(1, 1, 1.6, 16), new T.MeshBasicMaterial({ color: 0xfff2c0 })); lamp.position.y = 17.1; g.add(lamp);
  var roof = new T.Mesh(new T.ConeGeometry(1.4, 1.4, 16), new T.MeshStandardMaterial({ color: 0xc8261e })); roof.position.y = 18.6; g.add(roof);
  var beam = new T.Mesh(new T.ConeGeometry(2.5, 30, 20, 1, true), new T.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.08, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
  beam.rotation.z = Math.PI / 2; beam.position.x = 15; var pivot = new T.Group(); pivot.position.y = 17.1; pivot.add(beam); g.add(pivot);
  g.position.set(x, Y, z); this.scene.add(g);
  this.tweens.push({ forever: true, f: function (t) { pivot.rotation.y = t * 0.0006; } });
};
// Strand: Holzsteg-Plattform auf Sand, Meer mit Wellen, Leuchtturm, Sonnenschirme, Treibholz, Sonnenuntergang
Board3D.prototype.buildBeach = function (hi) {
  var T = THREE, scene = this.scene, self = this, Y = -0.5, WY = -1.25;
  scene.background = new T.Color(0x3a2a40); scene.fog = new T.FogExp2(0x8a6070, 0.007);
  this.hemi.color.set(0xffd0b0); this.hemi.groundColor.set(0x3a2a30); this.hemi.intensity = 0.6;
  this.sun.color.set(0xffb070); this.sun.intensity = 2; this.sun.position.set(6, 8, -16);
  this.useHdr('studio_kontrast_01.hdr'); this.addCamLight(0.6);
  // Sand als leicht gewellte Fläche, fällt zum Wasser hin ab
  var sg = new T.PlaneGeometry(90, 60, 60, 40), sp = sg.attributes.position;
  for (var i = 0; i < sp.count; i++) { var x = sp.getX(i), y = sp.getY(i); var wz = 8 - y, dd = Math.hypot(x, wz), damp = Math.min(1, Math.max(0, (dd - 8) / 4)); sp.setZ(i, (Math.sin(x * 0.3) * 0.15 + Math.cos(y * 0.4 + x * 0.1) * 0.12) * damp - Math.max(0, y - 9) * 0.09); }
  sg.computeVertexNormals();
  var sand = new T.Mesh(sg, this.texMat('coast_sand_01', 16, 0xe8d0b0)); sand.rotation.x = -Math.PI / 2; sand.position.set(0, Y - 0.32, 8); sand.receiveShadow = true; scene.add(sand);
  // Meer hinten (Richtung Gote), spiegelt den Abendhimmel
  var wn = Board3D.waveNormal(); wn.repeat.set(30, 30);
  var sea = new T.Mesh(new T.PlaneGeometry(260, 140), new T.MeshStandardMaterial({ color: 0x1a3a50, roughness: 0.12, metalness: 1, normalMap: wn, normalScale: new T.Vector2(0.4, 0.4), envMapIntensity: 0.8 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, WY, -60); scene.add(sea);
  this.skyBackground('sky_qwantani_sunset_puresky.webp', 0.85, function (t) { var pm = new T.PMREMGenerator(self.renderer); sea.material.envMap = pm.fromEquirectangular(t).texture; pm.dispose(); sea.material.needsUpdate = true; });
  // Schaumlinie an der Brandung, wandert leicht
  var foam = new T.Mesh(new T.PlaneGeometry(120, 1.2), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false })); foam.rotation.x = -Math.PI / 2; foam.position.set(0, WY + 0.03, -6.2); scene.add(foam);
  this.tweens.push({ forever: true, f: function (t) { wn.offset.set(t * 0.00001, t * 0.00002); foam.position.z = -6.2 + Math.sin(t / 1800) * 0.5; foam.material.opacity = 0.3 + Math.sin(t / 1800) * 0.15; } });
  // Holzsteg-Plattform unter dem Brett
  var deckM = this.texMat('brown_planks_03', [3, 3], 0xc8a07a);
  var deck = new T.Mesh(new T.BoxGeometry(14, 0.3, 14), deckM); deck.position.y = Y - 0.15; deck.receiveShadow = true; scene.add(deck);
  [[-6.6, -6.6], [6.6, -6.6], [-6.6, 6.6], [6.6, 6.6]].forEach(function (p) { var post = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 1.6, 10), deckM); post.position.set(p[0], Y - 0.1, p[1]); scene.add(post); });
  // Leuchtturm auf Felsen links hinten
  var rock = new T.Mesh(new T.DodecahedronGeometry(5, 1), this.texMat('rock_face_03', 2, 0x6a625a)); rock.scale.set(1.4, 0.6, 1.2); rock.position.set(-26, WY + 0.5, -24); scene.add(rock);
  this.lighthouse(-26, -24, WY + 2.6);
  // Sonnenschirme
  [[11, 4, '#e84a3a'], [-11, 7, '#3a8ae8'], [13, -4, '#f2c03a']].forEach(function (u) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 8; var g = c.getContext('2d'); for (var k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#ffffff' : u[2]; g.fillRect(k * 32, 0, 32, 8); }
    var tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
    var top = new T.Mesh(new T.ConeGeometry(2.2, 0.9, 16, 1, true), new T.MeshStandardMaterial({ map: tx, side: T.DoubleSide })); top.position.set(u[0], Y + 2.8, u[1]); top.castShadow = true; scene.add(top);
    var pole = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.9), new T.MeshStandardMaterial({ color: 0xe8e0d0 })); pole.position.set(u[0], Y + 1.4, u[1]); scene.add(pole);
  });
  // Handtuch, Strandball, Treibholz, Muscheln
  var towel = new T.Mesh(new T.PlaneGeometry(1.6, 3), new T.MeshStandardMaterial({ color: 0x3ab8b0, roughness: 0.95 })); towel.rotation.set(-Math.PI / 2, 0, 0.3); towel.position.set(10.4, Y + 0.02, 6.4); scene.add(towel);
  var bc = document.createElement('canvas'); bc.width = 128; bc.height = 64; var bg = bc.getContext('2d'); ['#e83a3a', '#ffffff', '#3a7ae8', '#ffffff', '#f2c03a', '#ffffff'].forEach(function (c, k) { bg.fillStyle = c; bg.fillRect(k * 128 / 6, 0, 128 / 6 + 1, 64); });
  var btx = new T.CanvasTexture(bc); btx.colorSpace = T.SRGBColorSpace;
  var ball = new T.Mesh(new T.SphereGeometry(0.45, 20, 14), new T.MeshStandardMaterial({ map: btx, roughness: 0.4 })); ball.position.set(-8.6, Y + 0.45, 9); ball.castShadow = true; scene.add(ball);
  var drift = new T.Mesh(new T.CylinderGeometry(0.2, 0.3, 4.5, 8), this.texMat('bark_brown_02', [1, 2], 0xb8a898)); drift.rotation.set(0, 0.7, Math.PI / 2); drift.position.set(-10, Y + 0.15, -3); scene.add(drift);
};

// Brett-Farbtöne im Statuen-Look: mul = Färbung über der Holztextur, line = Gitter
Board3D.TONES = {
  honig: { mul: '#c08850', line: '#1a120a', side: 0xb07848 },
  walnuss: { mul: '#8a6040', line: '#d8b468', side: 0x8a5a38 },
  rauch: { mul: '#7a6e64', line: '#e0cfa0', side: 0x6e625a },
  // Marmor (passt zu den Steinsockeln): [Grundfarbe, Aderfarbe]
  m_weiss: { marble: ['#e9e6df', '#7c7c84'], line: '#9a7428', mul: '#e9e6df' },
  m_grau: { marble: ['#5c5e64', '#d8d8dc'], line: '#e8c470', mul: '#5c5e64' },
  m_gruen: { marble: ['#2c4c3e', '#c8dccb'], line: '#e8c470', mul: '#2c4c3e' },
  m_nero: { marble: ['#2a2a2e', '#c9a868'], line: '#e8c470', mul: '#2a2a2e' },
  // Urushi: schwarzer Lack mit Gold (Maki-e), passt zu Gold/Silber und den Schiefersockeln
  urushi: { lacquer: '#140e0c', line: '#c9a14a', mul: '#140e0c' },
  // Carbon (Mecha): dunkles Kohlefasergewebe, leuchtendes Cyan-Gitter
  carbon: { carbon: '#15181d', line: '#46d7ff', mul: '#15181d', edge: 0x46d7ff }
};
// Marmor-Bild: Wolken + feine Adern aus Wertrauschen (fbm), gecacht pro Farbe/Größe
Board3D.marbleCanvas = function (base, vein, N) {
  var key = base + vein + N; Board3D._marble = Board3D._marble || {}; if (Board3D._marble[key]) return Board3D._marble[key];
  var c = document.createElement('canvas'); c.width = c.height = N; var g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  var B = hex(base), V = hex(vein), G = 64, R = []; for (var k = 0; k < G * G; k++) R.push(Math.random());
  function vn(x, y) { var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    function r(a, b) { return R[((a % G + G) % G) * G + ((b % G + G) % G)]; }
    return r(xi, yi) * (1 - u) * (1 - w) + r(xi + 1, yi) * u * (1 - w) + r(xi, yi + 1) * (1 - u) * w + r(xi + 1, yi + 1) * u * w; }
  function fbm(x, y) { var v = 0, a = 0.5; for (var o = 0; o < 5; o++) { v += a * vn(x, y); x *= 2; y *= 2; a *= 0.5; } return v; }
  for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
    var x = i / N * 8, y = j / N * 8, t = fbm(x, y), cl = fbm(x * 0.5 + 9, y * 0.5 + 3);
    var v1 = Math.pow(1 - Math.abs(Math.sin((x * 0.7 + y * 0.35) * 1.6 + t * 5)), 7) * 0.55, v2 = Math.pow(1 - Math.abs(Math.sin((x * 0.2 - y * 0.6) * 2.4 + t * 6 + 2)), 16) * 0.35;
    var vv = Math.min(1, v1 + v2), sh = 0.9 + cl * 0.2, p = (j * N + i) * 4;
    for (var ch = 0; ch < 3; ch++) d[p + ch] = Math.max(0, Math.min(255, (B[ch] * sh) * (1 - vv) + V[ch] * vv));
    d[p + 3] = 255;
  }
  g.putImageData(img, 0, 0); return (Board3D._marble[key] = c);
};
// Nachthimmel (Poly-Haven-Panorama als WebP) als Hintergrund; cb bekommt die Textur
Board3D.prototype.skyBackground = function (file, intensity, cb) {
  var T = THREE, self = this;
  new T.TextureLoader().load(Board3D.TEX + file, function (t) {
    if (!self.alive) return; t.mapping = T.EquirectangularReflectionMapping; t.colorSpace = T.SRGBColorSpace;
    self.scene.background = t; self.scene.backgroundIntensity = intensity; if (cb) cb(t);
  });
};
// Steinlaterne (Tōrō) mit warmem Licht
Board3D.prototype.toro = function (x, z, Y, s) {
  var T = THREE, st = Board3D.tex('japanese_stone_wall', 0.35), m = new T.MeshStandardMaterial({ map: st.map, normalMap: st.normalMap, roughnessMap: st.roughnessMap, color: 0x9a968e }), g = new T.Group();
  function add(geo, y) { var o = new T.Mesh(geo, m); o.position.y = y; o.castShadow = true; g.add(o); return o; }
  add(new T.CylinderGeometry(0.55, 0.65, 0.25, 6), 0.12); add(new T.CylinderGeometry(0.18, 0.22, 1.1, 12), 0.8); add(new T.CylinderGeometry(0.5, 0.35, 0.22, 6), 1.45);
  var box = new T.Mesh(new T.BoxGeometry(0.62, 0.55, 0.62), new T.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa040, emissiveIntensity: 1.6, roughness: 1 })); box.position.y = 1.83; g.add(box);
  [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].forEach(function (q) { var p = add(new T.BoxGeometry(0.1, 0.55, 0.1), 1.83); p.position.x = q[0]; p.position.z = q[1]; });
  var roof = add(new T.ConeGeometry(0.8, 0.45, 4), 2.32); roof.rotation.y = Math.PI / 4; add(new T.SphereGeometry(0.12, 10, 8), 2.6);
  g.scale.setScalar(s || 1); g.position.set(x, Y, z); this.scene.add(g); this.lanternObjs.push(g);
  var pl = new T.PointLight(0xffa850, 5, 12, 2); pl.position.set(x, Y + 1.85 * (s || 1), z); pl.userData.base = 5; this.scene.add(pl); this.lanterns.push(pl);
};
// Rechenmuster im Kies: Linien laufen um das Brett herum (Normal-Map aus Höhenwellen)
Board3D.rakeNormal = function (size, N) {
  var c = document.createElement('canvas'); c.width = c.height = N; var g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data, k = size / N, hx = 5.6, hz = 5.9, r0 = 1.2, f = Math.PI * 2 / 0.42;
  function h(x, z) { var qx = Math.max(Math.abs(x) - hx, 0), qz = Math.max(Math.abs(z) - hz, 0), dd = Math.sqrt(qx * qx + qz * qz) - r0; return dd < 0 ? 0 : Math.sin(dd * f); }
  for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
    var x = (i + 0.5) * k - size / 2, z = (j + 0.5) * k - size / 2, e = k;
    var dx = (h(x + e, z) - h(x - e, z)) * 0.5, dz = (h(x, z + e) - h(x, z - e)) * 0.5, p = (j * N + i) * 4;
    d[p] = 128 - dx * 110; d[p + 1] = 128 + dz * 110; d[p + 2] = 255; d[p + 3] = 255;
  }
  g.putImageData(img, 0, 0); var t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
};
// Bewegte Wellen fürs Wasser
Board3D.waveNormal = function () {
  var N = 256, c = document.createElement('canvas'); c.width = c.height = N; var g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data, W = [];
  for (var w = 0; w < 28; w++) { var fx = Math.floor(Math.random() * 13) - 6, fz = Math.floor(Math.random() * 13) - 6; if (!fx && !fz) fz = 3; W.push([fx, fz, Math.random() * 6, 0.35 / Math.sqrt(fx * fx + fz * fz)]); }
  for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
    var dx = 0, dz = 0; W.forEach(function (q) { var a = (q[0] * i + q[1] * j) / N * Math.PI * 2 + q[2], cc = Math.cos(a) * q[3]; dx += cc * q[0]; dz += cc * q[1]; });
    var p = (j * N + i) * 4; d[p] = 128 - dx * 9; d[p + 1] = 128 + dz * 9; d[p + 2] = 255; d[p + 3] = 255;
  }
  g.putImageData(img, 0, 0); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
Board3D.prototype.mossRock = function (x, z, Y, s, ry) {
  var T = THREE, mr = Board3D.tex('mossy_rock', 1), geo = new T.IcosahedronGeometry(1, 3), p = geo.attributes.position, sd = Math.random() * 10;
  for (var k = 0; k < p.count; k++) { var vx = p.getX(k), vy = p.getY(k), vz = p.getZ(k), n = 1 + 0.18 * Math.sin(vx * 3 + sd) * Math.cos(vz * 2.6 + sd) + 0.08 * Math.sin(vy * 7 + sd); p.setXYZ(k, vx * n * 1.3, Math.max(vy * n, -0.3) * 0.75, vz * n); }
  geo.computeVertexNormals();
  var m = new T.Mesh(geo, new T.MeshStandardMaterial({ map: mr.map, normalMap: mr.normalMap, roughnessMap: mr.roughnessMap, color: 0xb0b0a8 }));
  m.scale.setScalar(s); m.rotation.y = ry || 0; m.position.set(x, Y + 0.1 * s, z); m.castShadow = true; m.receiveShadow = true; this.scene.add(m);
};
// Büschel schmaler Bambusblätter (transparent), hängen nach unten
Board3D.bambooLeafTex = function () {
  if (Board3D._leaf) return Board3D._leaf;
  var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d');
  for (var k = 0; k < 46; k++) {
    var a = Math.PI / 2 + (Math.random() - 0.5) * 2.6, L = 50 + Math.random() * 60, x = 128 + (Math.random() - 0.5) * 60, y = 40 + Math.random() * 90;
    g.save(); g.translate(x, y); g.rotate(a - Math.PI / 2); var sh = 30 + Math.random() * 40; g.fillStyle = 'rgb(' + (sh + 10) + ',' + (sh + 60) + ',' + (sh) + ')';
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(7, L * 0.4, 0, L); g.quadraticCurveTo(-7, L * 0.4, 0, 0); g.fill(); g.restore();
  }
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (Board3D._leaf = t);
};
// Bambushain hinter den Mauern (Instancing, ein Draw-Call für Halme, einer für Blätter)
Board3D.prototype.bambooGrove = function (Y) {
  var T = THREE, c = document.createElement('canvas'); c.width = 32; c.height = 256; var g = c.getContext('2d');
  var gr = g.createLinearGradient(0, 0, 32, 0); gr.addColorStop(0, '#2e4a1e'); gr.addColorStop(0.5, '#6f8f3a'); gr.addColorStop(1, '#2e4a1e'); g.fillStyle = gr; g.fillRect(0, 0, 32, 256);
  for (var y = 0; y < 256; y += 32) { g.fillStyle = 'rgba(20,30,10,.7)'; g.fillRect(0, y, 32, 3); g.fillStyle = 'rgba(200,220,150,.35)'; g.fillRect(0, y + 3, 32, 2); }
  var tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.wrapT = T.RepeatWrapping; tx.repeat.set(1, 3);
  var spots = [], k, x, z;
  for (k = 0; k < 170; k++) { x = -30 + Math.random() * 60; z = -26 + Math.random() * 6.5; spots.push([x, z]); }
  for (k = 0; k < 110; k++) { var sd = Math.random() < 0.5 ? -1 : 1; x = sd * (19 + Math.random() * 7); z = -26 + Math.random() * 30; spots.push([x, z]); }
  var stalks = new T.InstancedMesh(new T.CylinderGeometry(0.1, 0.13, 1, 7), new T.MeshStandardMaterial({ map: tx, roughness: 0.6 }), spots.length);
  var leaves = new T.InstancedMesh(new T.PlaneGeometry(1, 1), new T.MeshStandardMaterial({ map: Board3D.bambooLeafTex(), alphaTest: 0.45, side: T.DoubleSide, roughness: 0.8 }), spots.length * 6);
  var m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), sc = new T.Vector3(), li = 0;
  spots.forEach(function (p, i) {
    var hgt = 8 + Math.random() * 6, lean = (Math.random() - 0.5) * 0.12;
    e.set(lean, 0, (Math.random() - 0.5) * 0.12); q.setFromEuler(e); m.compose(v.set(p[0], Y + hgt / 2, p[1]), q, sc.set(1, hgt, 1)); stalks.setMatrixAt(i, m);
    for (var j = 0; j < 6; j++) { var lk = 2.2 + Math.random() * 1.6; e.set((Math.random() - 0.5) * 0.5, Math.random() * 6, (Math.random() - 0.5) * 0.3); q.setFromEuler(e); m.compose(v.set(p[0] + (Math.random() - 0.5) * 1.2, Y + hgt * (0.5 + Math.random() * 0.5), p[1] + (Math.random() - 0.5) * 1.2), q, sc.set(lk, lk, lk)); leaves.setMatrixAt(li++, m); }
  });
  this.scene.add(stalks); this.scene.add(leaves);
};
// Japanischer Ahorn mit roten Blättern
Board3D.prototype.maple = function (x, z, Y) {
  var T = THREE, g = new T.Group(), bark = new T.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.9 }), leaf = new T.MeshStandardMaterial({ color: 0xa8281a, roughness: 0.8, flatShading: true });
  var t1 = new T.Mesh(new T.CylinderGeometry(0.22, 0.32, 3, 8), bark); t1.position.y = 1.5; t1.rotation.z = 0.15; g.add(t1);
  var t2 = new T.Mesh(new T.CylinderGeometry(0.14, 0.2, 2.4, 8), bark); t2.position.set(-0.6, 3.6, 0); t2.rotation.z = 0.5; g.add(t2);
  var t3 = new T.Mesh(new T.CylinderGeometry(0.12, 0.18, 2.2, 8), bark); t3.position.set(0.5, 3.4, 0.3); t3.rotation.z = -0.55; g.add(t3);
  [[-1.6, 4.6, 0, 1.4], [0.2, 5.2, 0.2, 1.6], [1.6, 4.4, 0.5, 1.3], [-0.4, 4.2, -1.1, 1.2], [0.8, 4.0, 1.2, 1.1], [-1.2, 3.8, 1.0, 1.0], [1.1, 5.0, -0.9, 1.1]].forEach(function (l) {
    var m = new T.Mesh(new T.IcosahedronGeometry(l[3], 1), leaf); m.position.set(l[0], l[1], l[2]); m.scale.y = 0.6; m.castShadow = true; g.add(m);
  });
  g.traverse(function (o) { o.castShadow = true; }); g.position.set(x, Y, z); this.scene.add(g);
};
// Zen-Garten bei Nacht: gerechter Kies, bemooste Felsen, Steinlaternen, Mauer, Milchstraße
Board3D.prototype.buildGarden = function (hi) {
  var T = THREE, scene = this.scene, self = this, Y = -0.5;
  scene.background = new T.Color(0x05070d); scene.fog = new T.FogExp2(0x070a12, 0.012);
  this.hemi.color.set(0x9db4e0); this.hemi.groundColor.set(0x1a1a20); this.hemi.intensity = 0.45;
  this.sun.color.set(0xc8d8ff); this.sun.intensity = 1.5; this.sun.position.set(-6, 16, -4);
  this.useHdr('studio_kontrast_01.hdr'); this.addCamLight(0.75); this.skyBackground('sky_rogland_clear_night.webp', 0.8);
  var S = 44, gr = Board3D.tex('gravel_floor_02', S / 3);
  var floor = new T.Mesh(new T.PlaneGeometry(S, S), new T.MeshStandardMaterial({ map: gr.map, roughnessMap: gr.roughnessMap, normalMap: Board3D.rakeNormal(S, 1024), normalScale: new T.Vector2(1.4, 1.4), color: 0x8a92a4 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = Y; floor.receiveShadow = true; scene.add(floor);
  // Mauer mit Ziegeldach hinten und seitlich
  var sw = Board3D.tex('japanese_stone_wall', [6, 0.6]), wallM = new T.MeshStandardMaterial({ map: sw.map, normalMap: sw.normalMap, roughnessMap: sw.roughnessMap, color: 0x8a867e }), roofM = new T.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.5, metalness: 0.2 });
  [[0, -18, 0, 36], [-18, -6, Math.PI / 2, 24], [18, -6, Math.PI / 2, 24]].forEach(function (w) {
    var g = new T.Group(), wall = new T.Mesh(new T.BoxGeometry(w[3], 2.2, 0.6), wallM); wall.position.y = 1.1; wall.receiveShadow = true; g.add(wall);
    var roof = new T.Mesh(new T.BoxGeometry(w[3] + 0.6, 0.18, 1.3), roofM); roof.position.y = 2.3; g.add(roof);
    g.position.set(w[0], Y, w[1]); g.rotation.y = w[2]; scene.add(g);
  });
  var mossM = new T.MeshStandardMaterial({ color: 0x2f4424, roughness: 1 });
  [[-11, -10, 2.2, 0.3], [-13.5, -7.5, 1.3, 1.2], [12, -11, 2.6, 2], [10, -13, 1.2, 0.7], [-12, 9, 1.6, 2.5], [13, 8, 1.9, 1.1]].forEach(function (r) {
    self.mossRock(r[0], r[1], Y, r[2], r[3]);
    var mg = new T.CircleGeometry(r[2] * 1.35, 28), mp = mg.attributes.position; for (var q = 1; q < mp.count; q++) { var an = Math.atan2(mp.getY(q), mp.getX(q)), f = 0.85 + 0.15 * Math.sin(3 * an + r[0]) + 0.07 * Math.sin(5 * an + r[1]); mp.setXY(q, mp.getX(q) * f, mp.getY(q) * f); }
    var moss = new T.Mesh(mg, mossM); moss.rotation.x = -Math.PI / 2; moss.scale.set(1.2, 0.9, 1); moss.position.set(r[0], Y + 0.02, r[1]); moss.receiveShadow = true; scene.add(moss);
  });
  this.bambooGrove(Y); this.maple(14, -3, Y);
  [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(function (p) { self.toro(p[0], p[1], Y, 1.05); });
};
// Mondsee: Steinplattform im dunklen Wasser, Torii in der Ferne, Mondhimmel
Board3D.prototype.buildLake = function (hi) {
  var T = THREE, scene = this.scene, self = this, Y = -0.5, WY = -1.4;
  scene.background = new T.Color(0x0a1220); scene.fog = new T.FogExp2(0x0d1626, 0.014);
  this.hemi.color.set(0xa8bce0); this.hemi.groundColor.set(0x0a0e16); this.hemi.intensity = 0.45;
  this.sun.color.set(0xd8e4ff); this.sun.intensity = 1.5; this.sun.position.set(2, 12, -14);
  this.useHdr('studio_kontrast_01.hdr'); this.addCamLight(0.75);
  var wn = Board3D.waveNormal(); wn.repeat.set(40, 40);
  var water = new T.Mesh(new T.CircleGeometry(120, 64), new T.MeshStandardMaterial({ color: 0x0a1018, roughness: 0.14, metalness: 1, normalMap: wn, normalScale: new T.Vector2(0.35, 0.35), envMapIntensity: 0.65 }));
  water.rotation.x = -Math.PI / 2; water.position.y = WY; scene.add(water);
  this.skyBackground('sky_kloppenheim_02_puresky.webp', 0.55, function (t) {
    var pm = new T.PMREMGenerator(self.renderer); water.material.envMap = pm.fromEquirectangular(t).texture; pm.dispose(); water.material.needsUpdate = true;
  });
  this.tweens.push({ forever: true, f: function (t) { wn.offset.set(t * 0.000012, t * 0.000007); } });
  // Achteckige Plattform
  var ms = Board3D.tex('monastery_stone_floor', 3), sw = Board3D.tex('japanese_stone_wall', [8, 0.4]);
  var sideM = new T.MeshStandardMaterial({ map: sw.map, normalMap: sw.normalMap, roughnessMap: sw.roughnessMap, color: 0x7e7a72 });
  var topM = new T.MeshStandardMaterial({ map: ms.map, normalMap: ms.normalMap, roughnessMap: ms.roughnessMap, color: 0xa09a90 });
  var plat = new T.Mesh(new T.CylinderGeometry(11.5, 12, Y - WY + 0.6, 8), [sideM, topM, sideM]); plat.rotation.y = Math.PI / 8; plat.position.y = (Y + WY - 0.6) / 2; plat.receiveShadow = true; scene.add(plat);
  // Torii im Wasser
  var red = new T.MeshStandardMaterial({ color: 0xb4281c, roughness: 0.5 }), blk = new T.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 }), tg = new T.Group();
  [-3.2, 3.2].forEach(function (x) { var p = new T.Mesh(new T.CylinderGeometry(0.32, 0.38, 9, 16), red); p.position.set(x, 4.5, 0); tg.add(p); });
  var nuki = new T.Mesh(new T.BoxGeometry(8.4, 0.45, 0.4), red); nuki.position.y = 6.8; tg.add(nuki);
  var kasa = new T.Mesh(new T.BoxGeometry(10, 0.5, 0.7), blk); kasa.position.y = 8.9; tg.add(kasa);
  var kasa2 = new T.Mesh(new T.BoxGeometry(9.4, 0.4, 0.6), red); kasa2.position.y = 8.45; tg.add(kasa2);
  tg.position.set(0, WY, -40); tg.scale.setScalar(1.25);
  // Trittsteine von der Plattform Richtung Torii
  var stoneM = new T.MeshStandardMaterial({ map: ms.map, normalMap: ms.normalMap, roughnessMap: ms.roughnessMap, color: 0x8a847a });
  for (var z = -12.6, k = 0; z > -36; z -= 2.1, k++) { var tr = new T.Mesh(new T.CylinderGeometry(0.75, 0.9, 0.5, 7), stoneM); tr.position.set(Math.sin(k * 1.3) * 0.7, WY + 0.08, z); tr.rotation.y = k; tr.receiveShadow = true; scene.add(tr); }
  // Seerosenblätter
  var padM = new T.MeshStandardMaterial({ color: 0x2c4a2a, roughness: 0.55, side: T.DoubleSide });
  for (k = 0; k < 26; k++) { var a = Math.random() * Math.PI * 2, rr = 13 + Math.random() * 9, pad = new T.Mesh(new T.CircleGeometry(0.4 + Math.random() * 0.5, 20, 0.3, Math.PI * 2 - 0.6), padM); pad.rotation.x = -Math.PI / 2; pad.rotation.z = Math.random() * 6; pad.position.set(Math.cos(a) * rr, WY + 0.03, Math.sin(a) * rr); if (Math.abs(pad.position.x) < 2.5 && pad.position.z < -10) continue; scene.add(pad); }
  // schwimmende Papierlaternen (Tōrō nagashi), wippen leicht
  var lampM = new T.MeshStandardMaterial({ color: 0xffb060, emissive: 0xff7a20, emissiveIntensity: 1.4, roughness: 1 }), baseM = new T.MeshStandardMaterial({ color: 0x2a1a10 });
  for (k = 0; k < 16; k++) {
    var fl = new T.Group(), a2 = Math.random() * Math.PI * 2, r2 = 15 + Math.random() * 22;
    var bx = new T.Mesh(new T.BoxGeometry(0.42, 0.42, 0.42), lampM); bx.position.y = 0.3; fl.add(bx);
    var bs = new T.Mesh(new T.BoxGeometry(0.56, 0.1, 0.56), baseM); bs.position.y = 0.05; fl.add(bs);
    fl.position.set(Math.cos(a2) * r2, WY, Math.sin(a2) * r2); fl.rotation.y = Math.random() * 3; scene.add(fl);
    this.tweens.push({ forever: true, f: (function (o, ph) { return function (t) { o.position.y = WY + Math.sin(t / 900 + ph) * 0.05; o.rotation.z = Math.sin(t / 1300 + ph) * 0.05; }; })(fl, k * 1.7) });
  }
  // ferne Bergsilhouetten im Dunst
  var mtM = new T.MeshBasicMaterial({ color: 0x101a2a });
  for (k = 0; k < 22; k++) { var a3 = k / 22 * Math.PI * 2 + Math.random() * 0.2, mt = new T.Mesh(new T.ConeGeometry(14 + Math.random() * 12, 16 + Math.random() * 22, 6), mtM); mt.position.set(Math.cos(a3) * 100, WY - 1, Math.sin(a3) * 100); mt.rotation.y = Math.random() * 3; scene.add(mt); } scene.add(tg);
  [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach(function (p) { self.toro(p[0], p[1], Y, 0.95); });
};

Board3D.prototype.initEnvModels = function (M, hi) {
  var self = this, scene = this.scene, E = 'models/env/';
  function put(name, size, x, y, z, ry, by) {
    return M.get(E + name + '.glb', size, { by: by || 'height' }).then(function (g) { if (!self.alive) return; g.position.set(x, y, z); g.rotation.y = ry || 0; scene.add(g); return g; }).catch(function () {});
  }
  put('torii', 8.2, 0, -0.5, -10.2, Math.PI / 2).then(function (g) { if (g) scene.remove(self.torii); });
  var spots = [[-7, -6], [7, -6], [-7, 6], [7, 6]];
  Promise.all(spots.map(function (p, i) { return put(i < 2 ? 'toro' : 'stonelamp', 2.4, p[0], -0.5, p[1], i * 1.3); })).then(function (gs) { if (gs.every(Boolean)) self.lanternObjs.forEach(function (l) { scene.remove(l); }); });
  if (!hi) return;
  Promise.all([put('maple', 5.2, -9.6, -0.55, 0.5, 0.4), put('maple', 4.6, 9.6, -0.55, -2.5, 2.1)]).then(function (gs) { if (gs.every(Boolean)) self.sakuras.forEach(function (t) { scene.remove(t); }); });
  put('pine', 7, -8.2, -0.55, -8.4, 0.3); put('pine2', 6.2, 8.6, -0.55, -8, 1.2); put('pine', 5.4, 10.2, -0.55, 3.6, 2);
  put('bamboo', 4.2, -10.3, -0.55, 4.8, 0); put('bamboo', 3.6, -9.6, -0.55, 6.4, 1.4); put('bamboo', 3.9, 9.8, -0.55, 6, 0.7);
  put('rock2', 1.6, 5.4, -0.6, -9.6, 0.5, 'max'); put('rocks', 1.2, -5.2, -0.6, 9.6, 0, 'max'); put('rock', 1.3, -10, -0.6, -4, 1, 'max'); put('bonsai', 1.1, 9.3, -0.6, 1.2, 0.3);
  for (var k = 0; k < 10; k++) { var a = k / 10 * Math.PI * 2 + 0.3, rr = 9 + (k % 3) * 0.6; put('sedge', 0.45, Math.cos(a) * rr, -0.55, Math.sin(a) * rr, a); }
  put('pagoda', 20, -26, -16, -34, 0.6); put('pagoda', 14, 30, -14, -28, 2.2);
};

// KI-Figuren: models/fig/<typ>_<clan>.glb (nur Feudal-Theme), Höhe ~1,15, Grundfläche max. 0,95 Felder.
Board3D.prototype.figUrl = function (t, col) {
  if (this.settings.aiFigures === false) return null;
  var set = this.settings.figSet, ed = this.theme.id;
  // andere Editionen: nur Statuen, Modelle unter models/style/<edition>/
  if (ed !== 'feudal') { var me = t >= 9 && t <= 12 ? t - 8 : t; return set === 'statue' && (Board3D.STATUE_READY_ED[ed] || []).indexOf(me) >= 0 ? 'models/style/' + ed + '/detail_' + me + '.glb' : null; } // Stilprobe: 'holz' / 'lowpoly' / 'statue' (nur Ashigaru, Fuchs, Tengu, Daimyō)
  // Statue: befördert 9–12 nutzt das Grundmodell (fällt beim Schlagen eh zurück), Kirin 13 und Drache 14 eigene Modelle
  if (set === 'statue') { var m = t >= 9 && t <= 12 ? t - 8 : t; return Board3D.STATUE_READY.indexOf(m) >= 0 ? 'models/style/detail_' + m + '.glb' : null; }
  if (set) return col === 0 && [1, 3, 7, 8].indexOf(t) >= 0 ? 'models/style/' + set + '_' + t + '.glb' : null;
  return 'models/fig/' + t + '_' + col + '.glb';
};
// Statuen-Look: alle Figuren eines Spielers in einem Material, Normal-Map des Modells bleibt für die Details
Board3D.STATUE_READY = [1, 2, 3, 4, 5, 6, 7, 8, 13, 14]; // Typen, deren Statuen-Modell die Prüfung bestanden hat
Board3D.STATUE_READY_ED = { mecha: [1, 3, 4, 5, 8], fantasy: [1, 8], hunde: [] }; // dito für die anderen Editionen
Board3D.STATUE = { gold: [0xd9a93a, 0.28, 1], silber: [0xc9ced6, 0.25, 1], bronze: [0x7a4a26, 0.35, 0.85] };
Board3D.prototype.statueMat = function (col, normalMap, rim) {
  var name = (this.settings.statueMats || ['gold', 'silber'])[col], M = Board3D.STATUE[name] || Board3D.STATUE.gold;
  var key = name + ':' + (normalMap ? normalMap.uuid : '-') + (rim ? ':rim' : ''); this.statueCache = this.statueCache || {};
  if (this.statueCache[key]) return this.statueCache[key];
  var mat = new THREE.MeshStandardMaterial({ color: M[0], roughness: M[1], metalness: M[2], normalMap: normalMap || null, envMap: this.look === 'insel' ? Models.envMap(this.renderer) : null, envMapIntensity: 1.1 });
  // befördert ('glanz'): roter Randschein (Fresnel), die Figur selbst bleibt Gold/Silber
  if (rim) { mat.onBeforeCompile = function (sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vec3(1.0, 0.12, 0.05) * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2) * 1.6;'); }; mat.customProgramCacheKey = function () { return 'rim'; }; }
  return (this.statueCache[key] = mat);
};
// Sashimono-Fahne mit 成 („befördert“) hinter der Figur
Board3D.prototype.promoFlag = function () {
  if (!this._flagTex) {
    var c = document.createElement('canvas'); c.width = 128; c.height = 288; var x = c.getContext('2d');
    x.fillStyle = '#a8140e'; x.fillRect(0, 0, 128, 288); x.strokeStyle = '#e8c060'; x.lineWidth = 8; x.strokeRect(8, 8, 112, 272);
    x.fillStyle = '#f3d27a'; x.font = 'bold 96px "Noto Serif JP", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('成', 64, 150);
    this._flagTex = new THREE.CanvasTexture(c); this._flagTex.colorSpace = THREE.SRGBColorSpace;
  }
  var T = THREE, g = new T.Group();
  var pole = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.95, 8), new T.MeshStandardMaterial({ color: 0x1a1010, roughness: 0.4 })); pole.position.y = 0.48; g.add(pole);
  var flag = new T.Mesh(new T.PlaneGeometry(0.2, 0.45), new T.MeshStandardMaterial({ map: this._flagTex, roughness: 0.7, side: T.DoubleSide, emissive: 0x330000 })); flag.position.set(0.105, 0.7, 0); g.add(flag);
  return g;
};
Board3D.prototype.attachGlb = function (g, src, col) {
  if (!src.userData.env) { var env = Models.envMap(this.renderer); src.traverse(function (o) { if (o.isMesh) { o.material.envMap = env; o.material.envMapIntensity = 0.8; o.material.needsUpdate = true; } }); src.userData.env = true; }
  var m = Models.fit(src, 1.15, 0.95), self = this; m.position.set(0, 0.2, 0);
  var rim = this.settings.figSet === 'statue' && Math.abs(g.userData.p || 0) >= 9 && this.settings.promoStyle === 'glanz';
  if (this.settings.figSet === 'statue') m.traverse(function (o) { if (o.isMesh) o.material = self.statueMat(col, o.material.normalMap, rim); });
  if (this.settings.figSet === 'statue' && Math.abs(g.userData.p || 0) >= 9) m.scale.multiplyScalar(1.1);
  // TRELLIS-Modelle schauen nach +z (zur eigenen Seite), also umdrehen, damit sie zum Gegner blicken
  m.userData.ry0 = this.settings.figSet === 'statue' ? Math.PI : 0; m.rotation.y = m.userData.ry0;
  g.add(m); g.userData.glb = m;
};

Board3D.prototype.sqPos = function (sq) { var r = (sq / 9) | 0, c = sq % 9; return { x: c - 4, z: r - 4 }; };

Board3D.prototype.faceTexture = function (t, col) {
  var style = this.settings.figSet === 'statue' ? 'statue-' + (this.settings.komaStyle || 'stein') : this.settings.pieceStyle || 'both', key = t + ':' + col + ':' + style;
  if (this.faceTex[key]) return this.faceTex[key];
  var T = THREE, c = document.createElement('canvas'); c.width = c.height = 256;
  var tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4; this.faceTex[key] = tex;
  var u = this.theme.units[t], g = c.getContext('2d'), kan = t === 8 && col === 1 ? (u.kanji2 || u.kanji) : u.kanji;
  var draw = function (img) {
    g.clearRect(0, 0, 256, 256);
    if (style.indexOf('statue') === 0) {
      // eingraviert: Holz schwarzer Lack, Stein Goldeinlage, Metall dunkel; befördert immer rot
      var KC = { 'statue-holz': ['#1a0e08', '#b0140c'], 'statue-stein': ['#e3b65a', '#ff4a30'], 'statue-metall': ['#2a1c10', '#a01008'] }[style] || ['#1a0e08', '#b0140c'];
      g.fillStyle = KC[t >= 9 ? 1 : 0]; g.font = 'bold 84px "Noto Serif JP", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(kan, 128, 196);
    } else if (style === 'kanji') {
      g.fillStyle = t >= 9 ? '#c41e1e' : '#1a1008'; g.font = 'bold 150px "Noto Serif JP", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(kan, 128, 140);
    } else {
      if (img) g.drawImage(img, style === 'icon' ? 38 : 50, style === 'icon' ? 50 : 34, style === 'icon' ? 180 : 156, style === 'icon' ? 180 : 156);
      if (style === 'both') { g.font = 'bold 54px "Noto Serif JP", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = t >= 9 ? '#ff6a5a' : 'rgba(255,240,210,.9)'; g.fillText(kan, 128, 214); }
    }
    tex.needsUpdate = true;
  };
  if (style === 'kanji' || style.indexOf('statue') === 0) { draw(null); if (document.fonts) document.fonts.ready.then(function () { draw(null); }); }
  else {
    var img = new Image(); img.onload = function () { draw(img); if (document.fonts) document.fonts.ready.then(function () { draw(img); }); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(unitSVG(this.theme, t, col, { size: 200 }));
  }
  return tex;
};

Board3D.prototype.makePiece = function (p) {
  var T = THREE, t = Math.abs(p), col = p > 0 ? 0 : 1, f = this.theme.factions[col], kanjiStyle = this.settings.pieceStyle === 'kanji';
  var g = new T.Group(); g.userData.p = p;
  // Statuen-Modus: Beförderung = Rot wie die roten Kanji echter Steine (Sockel in Zinnoberlack), Spielerfarbe bleibt Gold/Silber
  var statue = this.settings.figSet === 'statue', promoStatue = statue && t >= 9, ps = this.settings.promoStyle || 'lack';
  var ks = this.settings.komaStyle || 'stein';
  var bodyMat = statue ? this.komaMats(ks, col, promoStatue) : new T.MeshStandardMaterial({ color: kanjiStyle ? 0xe8c48a : (col === 0 ? 0x1d5e7a : 0x7a1d24), roughness: kanjiStyle ? 0.7 : 0.35, metalness: kanjiStyle ? 0 : 0.2, map: kanjiStyle ? Board3D._grain : null });
  var body = new T.Mesh(this.komaGeo, bodyMat); body.castShadow = true; body.receiveShadow = true; g.add(body);
  var face = new T.Mesh(new T.PlaneGeometry(0.66, 0.66), new T.MeshStandardMaterial({ map: this.faceTexture(t, col), transparent: true, roughness: statue ? 0.35 : 0.5, metalness: statue && ks === 'stein' ? 0.8 : 0, emissive: 0xffffff, emissiveMap: this.faceTexture(t, col), emissiveIntensity: kanjiStyle ? 0 : statue ? (ks === 'stein' ? 0.18 : 0) : 0.35, depthWrite: false }));
  face.rotation.x = -Math.PI / 2; face.position.set(0, 0.225, 0.04); g.add(face);
  if (statue && ks === 'stein') g.add(this.komaRim());
  if (!kanjiStyle && !statue) {
    var glow = new T.Mesh(new T.RingGeometry(0.4, 0.5, 5, 1, Math.PI / 2), new T.MeshBasicMaterial({ color: new T.Color(f.color), transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.01; g.add(glow);
  }
  if (promoStatue && ps === 'fahne') { var fl = this.promoFlag(); fl.position.set(0.3, 0.2, -0.28); if (col === 1) fl.rotation.y = Math.PI; g.add(fl); }
  if (this.settings.models !== false && this.quality === 'high') {
    var url = this.figUrl(t, col), src = url && window.Models && Models.cached ? Models.cached(url) : null;
    if (src) this.attachGlb(g, src, col);
    else if (!url && this.theme.id !== 'feudal') { /* Modell fehlt noch: nur Sockel mit Kanji */ }
    else {
      var fig = Figures3D.build(T, t, col, f.color); fig.position.set(0, 0.2, -0.02); fig.scale.multiplyScalar(1.6); g.add(fig); g.userData.fig = fig;
      // KI-Figur (TRELLIS.2) nachladen und den Platzhalter ersetzen
      if (url && src === null && window.Models && Models.load) Models.load(url).then(function (sc) { if (g.userData.fig === fig) { g.remove(fig); g.userData.fig = null; this.attachGlb(g, sc, col); } }.bind(this)).catch(function () {});
    }
  }
  // Gote zeigt zum Spieler (Sente)
  if (col === 1) g.rotation.y = Math.PI;
  return g;

};

Board3D.prototype.placePiece = function (g, sq) { var p = this.sqPos(sq); g.position.set(p.x, this.BT, p.z); };
Board3D.prototype.sync = function (state) {
  this.state = state;
  var grp = this.pieceGroup; while (grp.children.length) grp.remove(grp.children[0]);
  this.pieces = {};
  for (var q = 0; q < 81; q++) { var p = state.board[q]; if (!p) continue; var g = this.makePiece(p); this.placePiece(g, q); grp.add(g); this.pieces[q] = g; }
};
Board3D.prototype.setHighlights = function (h) {
  this.hl = h || {}; h = this.hl;
  var col = new Array(81).fill(null), dots = new Array(81).fill(0);
  function set(sq, c) { if (sq >= 0 && sq < 81) col[sq] = c; }
  (h.threats || []).forEach(function (s) { set(s, 0xff2a2a); });
  (h.dropDanger || []).forEach(function (s) { set(s, 0xb040ff); });
  if (h.last) { set(h.last.from, 0xffd24a); set(h.last.to, 0xffd24a); }
  if (h.hint) { set(h.hint.from, 0x40ff90); set(h.hint.to, 0x40ff90); }
  (h.marks || []).forEach(function (s) { set(s, 0x40c8ff); });
  set(h.selected, 0x46d7ff);
  (h.targets || []).forEach(function (s) { dots[s] = 1; });
  (h.captures || []).forEach(function (s) { dots[s] = 2; });
  for (var q = 0; q < 81; q++) {
    var t = this.tiles[q]; t.visible = col[q] !== null; if (t.visible) { t.material.color.setHex(col[q]); t.material.opacity = col[q] === 0xff2a2a ? 0.35 : 0.42; }
    this.dots[q].dot.visible = dots[q] === 1; this.dots[q].ring.visible = dots[q] === 2;
  }
  if (h.checkSq >= 0 && h.checkSq != null) { var p = this.sqPos(h.checkSq); this.checkRing.position.set(p.x, this.BT + 0.02, p.z); this.checkRing.visible = true; } else this.checkRing.visible = false;
};

// ---------- Kamera & Eingabe ----------
Board3D.prototype.resize = function () {
  var w = this.root.clientWidth, h = this.root.clientHeight; if (!w || !h) return;
  this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
  this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  // Abstand so, dass das Brett (≈11 breit) ins Bild passt
  var vf = this.camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * this.camera.aspect);
  var need = Math.max(6.2 / Math.tan(hf / 2), 6.4 / Math.tan(vf / 2));
  this.orbit.fit = need; if (!this.orbit.user) this.orbit.radius = need;
};
Board3D.prototype.setFlip = function (f) { this.flip = !!f; this.orbit.thetaGoal = f ? Math.PI : 0; };
Board3D.prototype.resetCamera = function () { this.orbit.user = false; this.orbit.radius = this.orbit.fit; this.orbit.phi = 0.78; this.orbit.thetaGoal = this.flip ? Math.PI : 0; };
Board3D.prototype.initInput = function () {
  var self = this, el = this.renderer.domElement, ptrs = {}, start = null, moved = false, pinch0 = 0, rad0 = 0;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', function (e) { el.setPointerCapture(e.pointerId); ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; var ids = Object.keys(ptrs); if (ids.length === 1) { start = { x: e.clientX, y: e.clientY, th: self.orbit.thetaGoal, ph: self.orbit.phi }; moved = false; } else if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); rad0 = self.orbit.radius; moved = true; } });
  el.addEventListener('pointermove', function (e) {
    if (!ptrs[e.pointerId]) return; ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; var ids = Object.keys(ptrs);
    if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) { self.orbit.radius = Math.max(8, Math.min(40, rad0 * pinch0 / d)); self.orbit.user = true; } return; }
    if (!start) return; var dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) > 10) moved = true;
    if (moved) { self.orbit.thetaGoal = start.th - dx * 0.008; self.orbit.theta = self.orbit.thetaGoal; self.orbit.phi = Math.max(0.12, Math.min(1.25, start.ph - dy * 0.006)); self.orbit.user = true; }
  });
  function up(e) { var was = ptrs[e.pointerId]; delete ptrs[e.pointerId]; if (!Object.keys(ptrs).length) { if (was && !moved && start) self.pick(e.clientX, e.clientY); start = null; pinch0 = 0; } }
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', function (e) { delete ptrs[e.pointerId]; start = null; });
  el.addEventListener('wheel', function (e) { e.preventDefault(); self.orbit.radius = Math.max(8, Math.min(40, self.orbit.radius * (1 + e.deltaY * 0.001))); self.orbit.user = true; }, { passive: false });
  el.addEventListener('dblclick', function () { self.resetCamera(); });
};
Board3D.prototype.pick = function (cx, cy) {
  var rect = this.renderer.domElement.getBoundingClientRect(), T = THREE;
  var ndc = new T.Vector2((cx - rect.left) / rect.width * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
  var ray = new T.Raycaster(); ray.setFromCamera(ndc, this.camera);
  // Erst Figuren (die Modelle ragen hoch), dann Brettebene
  var hits = ray.intersectObjects(this.pieceGroup.children, true);
  var x, z;
  if (hits.length) { var o = hits[0].object; while (o.parent && o.parent !== this.pieceGroup) o = o.parent; x = o.position.x; z = o.position.z; }
  else { var pl = new T.Plane(new T.Vector3(0, 1, 0), -this.BT), pt = new T.Vector3(); if (!ray.ray.intersectPlane(pl, pt)) return; x = pt.x; z = pt.z; }
  var c = Math.round(x + 4), r = Math.round(z + 4);
  if (c < 0 || c > 8 || r < 0 || r > 8) return;
  if (this.onSquare) this.onSquare(r * 9 + c);
};
Board3D.prototype.screenPos = function (sq) {
  var p = this.sqPos(sq), v = new THREE.Vector3(p.x, this.BT + 0.3, p.z).project(this.camera), rect = this.renderer.domElement;
  return { x: (v.x + 1) / 2 * rect.clientWidth, y: (1 - v.y) / 2 * rect.clientHeight };
};

// ---------- Update-Schleife ----------
Board3D.prototype.update = function (now, dt) {
  var o = this.orbit;
  // sanft zum Ziel drehen
  var d = o.thetaGoal - o.theta; o.theta += d * Math.min(1, dt * 0.006);
  var shake = this.shakeAmt || 0; this.shakeAmt = Math.max(0, shake - dt * 0.002);
  var c = this.camera, s = Math.sin(o.phi);
  c.position.set(o.target.x + o.radius * s * Math.sin(o.theta) + (Math.random() - .5) * shake, o.target.y + o.radius * Math.cos(o.phi) + (Math.random() - .5) * shake, o.target.z + o.radius * s * Math.cos(o.theta));
  c.lookAt(o.target);
  if (this.camLight) { this.camLight.position.copy(c.position).add(new THREE.Vector3(0, 3, 0)); this.camLight.target.position.copy(o.target); }
  if (this.hallSides) this.hallSides.forEach(function (h) { h.g.visible = c.position[h.axis] * h.sign < h.R - 0.6; });
  this.lanterns.forEach(function (l, i) { l.intensity = (l.userData.base || 1.6) + Math.sin(now / 90 + i * 3) * 0.15 + Math.random() * 0.2; });
  if (this.checkRing.visible) { var k = 1 + Math.sin(now / 120) * 0.15; this.checkRing.scale.set(k, k, k); this.checkRing.material.opacity = 0.6 + Math.sin(now / 120) * 0.3; }
  // Figuren-Details
  var t = now / 1000;
  this.pieceGroup.children.forEach(function (g) { var fig = g.userData.fig, m = g.userData.glb, sd = g.position.x * 1.7 + g.position.z; if (fig) Figures3D.animate(fig, t, sd); if (m) { m.position.y = 0.2 + Math.max(0, Math.sin(t * 1.6 + sd)) * 0.025; m.rotation.y = (m.userData.ry0 || 0) + Math.sin(t * 0.7 + sd) * 0.08; } });
  // Tweens
  var self = this;
  this.tweens = this.tweens.filter(function (tw) {
    if (tw.forever) { tw.f(now); return true; }
    if (tw.start == null) tw.start = now;
    var k = Math.min(1, (now - tw.start) / tw.dur);
    if (k >= 0) tw.f(k);
    if (k >= 1) { tw.done && tw.done(); return false; }
    return true;
  });
  this.updateParticles(dt);
  if (this.petals) this.updatePetals(dt, now);
};
Board3D.prototype.tween = function (dur, f, delay) { var self = this; return new Promise(function (res) { self.tweens.push({ dur: dur, f: f, done: res, start: delay ? performance.now() + delay : null }); }); };

// ---------- Partikel ----------
Board3D.prototype.initParticles = function () {
  var T = THREE, N = 1500; this.pN = N; this.pi = 0;
  var geo = new T.BufferGeometry(); this.pPos = new Float32Array(N * 3); this.pCol = new Float32Array(N * 3); this.pVel = new Float32Array(N * 3); this.pLife = new Float32Array(N); this.pBase = new Float32Array(N * 3);
  for (var i = 0; i < N; i++) this.pPos[i * 3 + 1] = -999;
  geo.setAttribute('position', new T.BufferAttribute(this.pPos, 3)); geo.setAttribute('color', new T.BufferAttribute(this.pCol, 3));
  var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  this.softTex = new T.CanvasTexture(c);
  var mat = new T.PointsMaterial({ size: 0.22, map: this.softTex, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
  this.points = new T.Points(geo, mat); this.points.frustumCulled = false; this.scene.add(this.points);
};
Board3D.prototype.emit = function (x, y, z, color, n, speed, up, grav) {
  var col = new THREE.Color(color);
  for (var k = 0; k < n; k++) {
    var i = this.pi = (this.pi + 1) % this.pN, a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI / 2, v = (0.3 + Math.random()) * speed;
    this.pPos[i * 3] = x; this.pPos[i * 3 + 1] = y; this.pPos[i * 3 + 2] = z;
    this.pVel[i * 3] = Math.cos(a) * Math.cos(e) * v; this.pVel[i * 3 + 1] = Math.sin(e) * v * (up || 1); this.pVel[i * 3 + 2] = Math.sin(a) * Math.cos(e) * v;
    this.pLife[i] = 1; this.pBase[i * 3] = col.r; this.pBase[i * 3 + 1] = col.g; this.pBase[i * 3 + 2] = col.b;
    this.pGrav = grav == null ? 9 : grav;
  }
};
Board3D.prototype.updateParticles = function (dt) {
  var s = dt / 1000, any = false;
  for (var i = 0; i < this.pN; i++) {
    if (this.pLife[i] <= 0) continue; any = true;
    this.pLife[i] -= s * 1.3;
    var L = Math.max(0, this.pLife[i]);
    this.pVel[i * 3 + 1] -= 6 * s;
    this.pPos[i * 3] += this.pVel[i * 3] * s; this.pPos[i * 3 + 1] += this.pVel[i * 3 + 1] * s; this.pPos[i * 3 + 2] += this.pVel[i * 3 + 2] * s;
    if (this.pPos[i * 3 + 1] < this.BT) { this.pPos[i * 3 + 1] = this.BT; this.pVel[i * 3 + 1] *= -0.3; }
    this.pCol[i * 3] = this.pBase[i * 3] * L; this.pCol[i * 3 + 1] = this.pBase[i * 3 + 1] * L; this.pCol[i * 3 + 2] = this.pBase[i * 3 + 2] * L;
    if (L <= 0) this.pPos[i * 3 + 1] = -999;
  }
  if (any || this._pAny) { this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.attributes.color.needsUpdate = true; }
  this._pAny = any;
};
Board3D.prototype.initPetals = function (o) {
  o = o || { color: 0xffb6cf, size: 0.13, area: 30, speed: 1, opacity: 0.9 }; this.petalOpt = o;
  var T = THREE, N = 220, geo = new T.BufferGeometry(), pos = new Float32Array(N * 3);
  for (var i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * o.area; pos[i * 3 + 1] = Math.random() * 12; pos[i * 3 + 2] = (Math.random() - .5) * o.area; }
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  this.petals = new T.Points(geo, new T.PointsMaterial({ color: o.color, size: o.size, map: this.softTex, transparent: true, depthWrite: false, opacity: o.opacity, blending: o.area < 30 ? T.AdditiveBlending : T.NormalBlending }));
  this.scene.add(this.petals);
};
Board3D.prototype.updatePetals = function (dt, now) {
  var p = this.petals.geometry.attributes.position, a = p.array, o = this.petalOpt, s = dt / 1000 * o.speed;
  for (var i = 0; i < p.count; i++) {
    a[i * 3 + 1] -= (o.rise ? -1 : 1) * s * (0.5 + (i % 7) * 0.08); a[i * 3] += Math.sin(now / 900 + i) * s * 0.6 + s * 0.3; a[i * 3 + 2] += Math.cos(now / 1100 + i) * s * 0.4;
    if (a[i * 3 + 1] < -1 || a[i * 3 + 1] > 12.5) { a[i * 3 + 1] = o.rise ? -0.8 : 12; a[i * 3] = (Math.random() - .5) * o.area; a[i * 3 + 2] = (Math.random() - .5) * o.area; }
  }
  p.needsUpdate = true;
};

// ---------- Zug-Animation ----------
Board3D.prototype.animate = function (info) {
  var self = this, T = THREE, after = info.state, to = this.sqPos(info.to), f = this.theme.factions[info.col];
  var mover, from;
  var capG = this.pieces[info.to];
  if (info.drop) {
    var p0 = info.col === 0 ? info.drop : -info.drop; mover = this.makePiece(p0); this.pieceGroup.add(mover);
    from = { x: to.x, z: to.z, y: this.BT + 7 };
    // Lichtsäule (Beschwörung)
    var beam = new T.Mesh(new T.CylinderGeometry(0.45, 0.45, 14, 16, 1, true), new T.MeshBasicMaterial({ color: new T.Color(f.color), transparent: true, opacity: 0.0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    beam.position.set(to.x, this.BT + 7, to.z); this.scene.add(beam);
    this.tween(700, function (k) { beam.material.opacity = Math.sin(k * Math.PI) * 0.45; beam.scale.x = beam.scale.z = 1 - k * 0.6; }).then(function () { self.scene.remove(beam); });
  } else { mover = this.pieces[info.from]; var fp = this.sqPos(info.from); from = { x: fp.x, z: fp.z, y: this.BT }; }
  delete this.pieces[info.from];
  var dist = Math.hypot(to.x - from.x, to.z - from.z), dur = info.drop ? 380 : 230 + dist * 45, height = info.drop ? 0 : 0.5 + dist * 0.12;
  return this.tween(dur, function (k) {
    var e = info.drop ? k * k : (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    mover.position.x = from.x + (to.x - from.x) * e; mover.position.z = from.z + (to.z - from.z) * e;
    mover.position.y = info.drop ? from.y + (self.BT - from.y) * e : self.BT + Math.sin(k * Math.PI) * height;
    if (info.drop) mover.rotation.y = (info.col === 1 ? Math.PI : 0) + (1 - k) * 6;
  }).then(function () {
    if (info.drop) mover.rotation.y = info.col === 1 ? Math.PI : 0;
    self.emit(to.x, self.BT + 0.05, to.z, 0xd8c8a0, 10, 1.2, 0.3);
    if (capG) {
      // Hit-Stop + Explosion + gefangene Figur fliegt zur Hand
      self.shakeAmt = 0.35;
      self.emit(to.x, self.BT + 0.3, to.z, f.color, 70, 5, 1.2); self.emit(to.x, self.BT + 0.3, to.z, 0xfff0c0, 30, 3, 1.5);
      var side = info.col === 0 ? 1 : -1, cs = capG.position.clone();
      return self.tween(80, function () { }).then(function () {
        return self.tween(450, function (k) { capG.position.set(cs.x + (6.5 * side - cs.x) * k, cs.y + Math.sin(k * Math.PI) * 3, cs.z + (4 * side - cs.z) * k); capG.rotation.x = k * 8; capG.scale.setScalar(1 - k * 0.7); });
      }).then(function () { self.pieceGroup.remove(capG); });
    }
  }).then(function () {
    if (!info.promo) return;
    // Beförderung: Stein hebt ab, dreht sich um (wie echter Koma), Lichtsäule
    var pillar = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 10, 16, 1, true), new T.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    pillar.position.set(to.x, self.BT + 5, to.z); self.scene.add(pillar);
    self.tween(900, function (k) { pillar.material.opacity = Math.sin(k * Math.PI) * 0.55; }).then(function () { self.scene.remove(pillar); });
    var baseRot = mover.rotation.y;
    return self.tween(220, function (k) { mover.position.y = self.BT + k * 0.9; mover.rotation.z = k * Math.PI / 2; }).then(function () {
      var np = self.makePiece(after.board[info.to]); np.position.copy(mover.position); np.rotation.z = -Math.PI / 2; self.pieceGroup.remove(mover); self.pieceGroup.add(np); mover = np;
      self.emit(to.x, self.BT + 0.9, to.z, 0xffd76a, 80, 4, 1.4);
      return self.tween(300, function (k) { np.position.y = self.BT + 0.9 * (1 - k); np.rotation.z = -Math.PI / 2 * (1 - k); });
    });
  }).then(function () { self.sync(after); });
};
Board3D.prototype.fx = function (name, sq) {
  var p = this.sqPos(sq);
  if (name === 'check') { this.shakeAmt = 0.25; this.emit(p.x, this.BT + 0.2, p.z, 0xff3030, 40, 2.5, 0.6); }
  if (name === 'mate') { this.shakeAmt = 0.6; var self = this; [0xffd76a, 0xff5a4e, 0x46d7ff, 0xffffff].forEach(function (c, i) { setTimeout(function () { self.emit(p.x, self.BT + 0.5, p.z, c, 120, 6, 1.6); }, i * 150); }); }
  if (name === 'sparkle') this.emit(p.x, this.BT + 0.4, p.z, 0xffd76a, 30, 2, 1.2);
};
Board3D.prototype.destroy = function () {
  this.alive = false; this._ro && this._ro.disconnect();
  this.renderer.dispose(); this.renderer.forceContextLoss && this.renderer.forceContextLoss();
  this.root.classList.remove('b3'); this.root.innerHTML = '';
};
