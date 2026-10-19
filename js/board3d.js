// Handy/Tablet (grober Zeiger oder Touch-Gerät): Akku-Sparmaßnahmen
Board3D.MOBILE = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
// 3D-Brett mit Three.js: schwebende Insel, Laternen, Kirschblüten, Figuren-Modelle, Partikel.
function Board3D(root, theme, settings) {
  var self = this;
  this.root = root; this.theme = theme; Board3D.edLists(theme && theme.id); this.settings = settings; this.flip = false; this.hl = {}; this.alive = true;
  this.tweens = []; this.onSquare = null; this.pieces = {}; this.quality = settings.quality || 'high';
  root.innerHTML = ''; root.classList.add('b3');
  var T = THREE, hi = this.quality === 'high';
  Board3D.setHeightFog(null); // Höhennebel gehört nur dem Schlachtfeld
  // Handy: Akku schonen (Strom-Modus, Auflösung, Bildrate gedeckelt, Armee-Schatten und Gras reduziert)
  var mob = this.mobile = Board3D.MOBILE, army = settings.army && hi;
  var r = new T.WebGLRenderer({ antialias: !(mob && army), powerPreference: mob ? 'default' : 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, mob ? (army ? 1.5 : 1.75) : hi ? 2 : 1.25));
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
  var statue = settings.figSet === 'statue', look = statue ? (settings.army && settings.quality !== 'low' && settings.models !== false ? 'feld' : settings.scene || 'buehne') : 'insel'; this.look = look;
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
  var board = new T.Mesh(new T.BoxGeometry(9.8, BT, 10.4), boardMat); board.position.y = BT / 2; board.receiveShadow = true; board.castShadow = true; scene.add(board); this.boardMesh = board; var legs = this.boardLegs = [];
  [[-4.3, -4.6], [4.3, -4.6], [-4.3, 4.6], [4.3, 4.6]].forEach(function (p) { var leg = new T.Mesh(new T.CylinderGeometry(0.35, 0.25, 0.5, 8), statue ? boardMat[0] : woodMat(0x4a2c14)); leg.position.set(p[0], -0.25, p[1]); leg.castShadow = true; scene.add(leg); legs.push(leg); });
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
  else if (look === 'feld') this.buildField(hi);
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
  if (hi) this.initPetals(look === 'insel' ? null : (this.mood && this.mood.part) || PART[look] || { color: 0xffd9a0, size: 0.06, area: 16, speed: 0.15, opacity: 0.55 });

  // Eingabe
  this.initInput();
  this.resize();
  this._ro = new ResizeObserver(function () { self.resize(); }); this._ro.observe(root);
  var last = performance.now(), calm = 0;
  function loop(now) {
    if (!self.alive) return;
    requestAnimationFrame(loop);
    // Handy: 30 fps bei Bewegung (Züge, Kampf, Kamera), 20 fps in Ruhe; PC ungedeckelt
    if (mob) { if (self.tweens.length || now - (self.lastInput || 0) < 400 || Math.abs(self.orbit.theta - self.orbit.thetaGoal) > 1e-3) calm = now; if (now - last < (now - calm > 1500 ? 50 : 33.3) - 2) return; }
    var dt = Math.min(50, now - last); last = now;
    self.update(now, dt);
    r.render(scene, cam);
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
  if (ed !== 'feudal') { var me = t >= 9 && t <= 12 && (Board3D.STATUE_READY_ED[ed] || []).indexOf(t) < 0 ? t - 8 : t; return set === 'statue' && (Board3D.STATUE_READY_ED[ed] || []).indexOf(me) >= 0 ? 'models/style/' + ed + '/detail_' + me + '.glb' : null; } // Stilprobe: 'holz' / 'lowpoly' / 'statue' (nur Ashigaru, Fuchs, Tengu, Daimyō)
  // Statue: befördert 9–12 nutzt ein eigenes Modell, sobald es geprüft ist, sonst das Grundmodell (dann 10 % größer)
  if (set === 'statue') { var m = t >= 9 && t <= 12 && Board3D.STATUE_READY.indexOf(t) < 0 ? t - 8 : t; return Board3D.STATUE_READY.indexOf(m) >= 0 ? 'models/style/detail_' + m + '.glb' : null; }
  if (set) return col === 0 && [1, 3, 7, 8].indexOf(t) >= 0 ? 'models/style/' + set + '_' + t + '.glb' : null;
  return 'models/fig/' + t + '_' + col + '.glb';
};
// Statuen-Look: alle Figuren eines Spielers in einem Material, Normal-Map des Modells bleibt für die Details
Board3D.STATUE_READY = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // Typen, deren Statuen-Modell die Prüfung bestanden hat
Board3D.promoOnBase = function (ed, t) { return t >= 9 && t <= 12 && ((ed === 'feudal' ? Board3D.STATUE_READY : Board3D.STATUE_READY_ED[ed]) || []).indexOf(t) < 0; };
Board3D.STATUE_READY_ED = { mecha: [1, 3, 4, 5, 8, 9, 10, 11, 12], fantasy: [1, 8, 9, 10, 11, 12], hunde: [9, 10, 11, 12] }; // dito für die anderen Editionen
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
Board3D.FIG_KANJI = { fz: -0.08, lim: 0.0, shift: 0.18, maxD: 0.6 };
// Tiefe des Körpers einer Figur (ohne dünne Ausreißer wie Speere): 5. und 95. Perzentil der z-Werte, im Raum des Elternteils
Board3D.coreZ = function (m) {
  var v = new THREE.Vector3(), zs = []; m.updateMatrixWorld(true);
  var inv = m.parent ? m.parent.matrixWorld.clone().invert() : null;
  m.traverse(function (o) {
    if (!o.isMesh) return; var pa = o.geometry.attributes.position, st = Math.max(1, Math.floor(pa.count / 3000));
    for (var i = 0; i < pa.count; i += st) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); if (inv) v.applyMatrix4(inv); zs.push(v.z); }
  });
  zs.sort(function (a, b) { return a - b; });
  return zs.length ? [zs[Math.floor(zs.length * 0.05)], zs[Math.floor(zs.length * 0.95)]] : [0, 0];
}; // Figuren-Ansicht: Figur leicht nach vorn, Rückseite endet vor dem Kanji (das an der eigenen Kante sitzt)
Board3D.prototype.attachGlb = function (g, src, col) {
  if (!src.userData.env) { var env = Models.envMap(this.renderer); src.traverse(function (o) { if (o.isMesh) { o.material.envMap = env; o.material.envMapIntensity = 0.8; o.material.needsUpdate = true; } }); src.userData.env = true; }
  var m = Models.fit(src, 1.15, this.settings.figSet === 'statue' ? 2.2 : 0.95), self = this; // Statuen: alle gleich hoch (Grundfläche nur gegen Ausreißer) m.position.set(0, 0.2, this.settings.figSet === 'statue' ? Board3D.FIG_KANJI.fz : 0);
  var rim = this.settings.figSet === 'statue' && Math.abs(g.userData.p || 0) >= 9 && this.settings.promoStyle === 'glanz';
  if (this.settings.figSet === 'statue') m.traverse(function (o) { if (o.isMesh) o.material = self.statueMat(col, o.material.normalMap, rim); });
  if (this.settings.figSet === 'statue' && Board3D.promoOnBase(this.theme.id, Math.abs(g.userData.p || 0))) m.scale.multiplyScalar(1.1);
  // TRELLIS-Modelle schauen nach +z (zur eigenen Seite), also umdrehen, damit sie zum Gegner blicken
  m.userData.ry0 = this.settings.figSet === 'statue' ? Math.PI : 0; m.rotation.y = m.userData.ry0;
  // Schwänze/Umhänge, die nach hinten ragen, nicht übers Kanji: Figur so weit nach vorn, bis die Rückseite vor dem Zeichen endet
  if (this.settings.figSet === 'statue') {
    // alle gleich hoch; gemessen wird der Körper (5.–95. Perzentil der Tiefe), dünne Stäbe/Speere zählen nicht.
    // Nur was als Körper tiefer als ein Feld ist (Kitsune mit Schwänzen), wird kleiner; verschoben wird höchstens so weit, dass die Füße auf dem Sockel bleiben
    var K = Board3D.FIG_KANJI, cz = Board3D.coreZ(m), d = cz[1] - cz[0];
    if (d > K.maxD) { m.scale.multiplyScalar(K.maxD / d); cz = Board3D.coreZ(m); }
    m.position.z += Math.max(-K.shift, Math.min(0, K.lim - cz[1]));
  }
  g.add(m); g.userData.glb = m;
};

// ---------- Armee-Modus (Test): Regimenter wie in Total War statt Einzelfigur, Regeln bleiben Shogi ----------
// Soldaten sind unsichtbare Platzhalter im Szenengraph (für Animation und Kampf), gezeichnet wird per Instancing:
// ein InstancedMesh je Modell und Farbe, Leerlauf und Kampfhaltung im Vertex-Shader (Werte je Soldat in iAnim)
Board3D.ARMY_TIME = { value: 0 };
// Regimenter: Spalten x Reihen, Abstand, Höhe und Grundfläche je Soldat (vorne = -z)
Board3D.ARMY = {
  // h = sichtbare Größe (Menschen gleich groß wie bei Total War, nur Kreaturen und Helden größer), pw = Kampfkraft-Größe
  inf: { cols: 8, rows: 6, sx: 0.112, sz: 0.135, h: 0.22, pw: 0.22, foot: 0.11 },  // Bauer: 48, dichter Haufen
  col: { cols: 4, rows: 7, sx: 0.15, sz: 0.112, h: 0.22, pw: 0.24, foot: 0.12 },   // Lanze: 28 in langer Kolonne
  line: { cols: 5, rows: 4, sx: 0.16, sz: 0.19, h: 0.225, pw: 0.26, foot: 0.14 },  // Silber: 20
  gold: { cols: 4, rows: 4, sx: 0.19, sz: 0.19, h: 0.23, pw: 0.28, foot: 0.16 },   // Gold: 16
  cav: { cols: 4, rows: 3, sx: 0.21, sz: 0.25, h: 0.27, pw: 0.33, foot: 0.21 },    // Springer: 12 Reiter/Kreaturen
  vet: { cols: 4, rows: 3, sx: 0.2, sz: 0.24, h: 0.235, pw: 0.31, foot: 0.18 },    // befördert 9–12: 12 Veteranen
  elite: { cols: 3, rows: 3, sx: 0.26, sz: 0.26, h: 0.24, pw: 0.4, foot: 0.24 },   // Läufer: 9
  heavy: { cols: 3, rows: 2, sx: 0.3, sz: 0.32, h: 0.34, pw: 0.48, foot: 0.3 },    // Turm: 6 schwere Krieger/Kreaturen
  hero: { cols: 1, rows: 1, sx: 0, sz: 0, h: 0.5, pw: 0.72, foot: 0.8 }
};
// je stärker die Figur, desto weniger, aber größere Soldaten; König und Drachen als Held allein
Board3D.ARMY_TYPE = { 1: 'inf', 2: 'col', 3: 'cav', 4: 'line', 5: 'gold', 6: 'elite', 7: 'heavy', 8: 'hero', 9: 'vet', 10: 'vet', 11: 'vet', 12: 'vet', 13: 'hero', 14: 'hero' };
Board3D.armyHero = function (t) { return Board3D.ARMY_TYPE[t] === 'hero'; };
Board3D.rnd = function (seed) { var s = seed * 9301 + 49297; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
// Leerlauf + Kampfhaltung (kein Skelett nötig): Atmen, Oberkörper schaut sich um, Gewicht verlagern, Gehen, Ausholen/Zuschlagen
Board3D.ARMY_VS = [
  '#include <begin_vertex>',
  '{',
  '  float h = aIdle.x, H = abs(aIdle.y), ws = sign(aIdle.y), ph = iAnim.x, uAct = iAnim.y, uWalk = iAnim.z, tt = uTime; vec2 c = aIdle.zw, d = transformed.xz - c;',
  '  d *= 1.0 + sin(tt * 2.2 + ph) * 0.024 * smoothstep(0.35, 0.6, h) * (1.0 - smoothstep(0.78, 0.95, h));',
  '  float lk = (sin(tt * 0.43 + ph * 1.7) * 0.6 + sin(tt * 0.17 + ph) * 0.4) * 0.32 * smoothstep(0.55, 0.9, h) * (1.0 - abs(uAct));',
  '  float cs = cos(lk), sn = sin(lk); d = vec2(d.x * cs - d.y * sn, d.x * sn + d.y * cs);',
  '  transformed.xz = c + d;',
  '  float w = h * h;',
  '  transformed.x += (sin(tt * 0.9 + ph) * 0.03 + sin(tt * 10.0 + ph) * 0.06 * uWalk) * H * w;',
  '  transformed.z += sin(tt * 0.61 + ph * 1.3) * 0.02 * H * w;',
  '  transformed.y += (sin(tt * 2.2 + ph) * 0.009 * smoothstep(0.4, 0.8, h) + abs(sin(tt * 10.0 + ph)) * 0.03 * uWalk * h) * H;',
  '  float ls = sign(position.x - c.x), leg = 1.0 - smoothstep(0.12, 0.32, h), stp = sin(tt * 10.0 + ph) * ls;',
  '  transformed.z += stp * 0.08 * H * leg * uWalk; transformed.y += max(0.0, stp) * 0.035 * H * leg * uWalk;',
  '  float arm = smoothstep(0.05, 0.13, (position.x - c.x) * ws / H) * smoothstep(0.28, 0.5, h);',
  '  float sw = clamp(uAct * 1.7, -2.3, 1.6) * arm, py = position.y - h * H + 0.74 * H;',
  '  vec2 q = vec2(transformed.y - py, transformed.z - c.y); float ca = cos(sw), sa = sin(sw);',
  '  q = vec2(q.x * ca - q.y * sa, q.x * sa + q.y * ca); transformed.y = py + q.x; transformed.z = c.y + q.y;',
  '  float up = max(h - 0.38, 0.0) / 0.62; up *= up;',
  '  transformed.z += uAct * 0.34 * H * up;',
  '  transformed.y -= abs(uAct) * 0.09 * H * up;',
  '}'
].join('\n');
// Höhe 0..1, Modellhöhe und Mitte je Ecke (für den Shader), einmal pro Geometrie
Board3D.prototype.idleAttr = function (geo) {
  if (geo.getAttribute('aIdle')) return;
  geo.computeBoundingBox(); var b = geo.boundingBox, H = b.max.y - b.min.y || 1, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
  var p = geo.getAttribute('position'), a = new Float32Array(p.count * 4);
  // Waffenseite: die Waffe ragt meist am höchsten seitlich heraus (Speerspitze, Schwert über der Schulter)
  var sum = 0, n = 0, i;
  for (i = 0; i < p.count; i++) { var hy = (p.getY(i) - b.min.y) / H, sx = (p.getX(i) - cx) / H; if (hy > 0.72 && Math.abs(sx) > 0.08) { sum += sx * hy * hy; n++; } }
  var ws = n && sum < 0 ? -1 : 1;
  for (i = 0; i < p.count; i++) { a[i * 4] = (p.getY(i) - b.min.y) / H; a[i * 4 + 1] = H * ws; a[i * 4 + 2] = cx; a[i * 4 + 3] = cz; }
  geo.setAttribute('aIdle', new THREE.BufferAttribute(a, 4));
};
// bemalt: Farbtextur, die vom hochaufgelösten KI-Modell auf das Low-Poly-Modell gebacken wurde (tools/texbake); sonst Gold/Silber-Statue
Board3D.prototype.armyBase = function (col, map) {
  if (!map) return this.statueMat(col, null, false).clone();
  var m = new THREE.MeshStandardMaterial({ map: map, normalMap: map.userData.nmap || null, roughness: 0.7, metalness: 0, envMapIntensity: 0.45 });
  if (map.userData.nscale) m.normalScale.copy(map.userData.nscale);
  return m;
};
// Bemalte Soldaten: Originalfarben des KI-Designs (gebackene Farb- und Normal-Map). Spieler erkennt man am Randschein der Silhouette
// (Sente Gold, Gote Silber, wie die Statuen), an Formation und Fahnen, optional am Sashimono (Sente gold mit schwarzem Mon, Gote silberweiß mit rotem Mon)
Board3D.RIM = [[1.0, 0.62, 0.16], [0.75, 0.85, 1.0]];
Board3D.NO_SASHI = [1, 3, 13, 14]; // Bauern (Fähnchen sah wie eine zweite Waffe aus, Speer soll lesbar sein) und Kreaturen (Fuchs, Hirsch, Drache) ohne Rückenfähnchen
Board3D.SASHI = [[[0.85, 0.55, 0.12], [0.02, 0.018, 0.015]], [[0.8, 0.82, 0.85], [0.6, 0.04, 0.03]]]; // Tuch, Mon: Sente Gold/schwarz, Gote Silberweiß/rot
Board3D.WHITE_FUR = [3]; // Kitsune (Springer): weißes Fell wie die Inari-Füchse statt Orange
// je Edition: Kitsune-Fell nur bei Feudal (sonst würde der Sprung-Mech/Greif/Jack Russell umgefärbt); Rückenfähnchen nur bei Menschen/Mechs, nie bei Kreaturen, Fliegern und Hunden
Board3D.WHITE_FUR_ED = { feudal: [3] };
Board3D.NO_SASHI_ED = { feudal: [1, 3, 13, 14], mecha: [1, 3, 7, 13, 14], fantasy: [1, 3, 7, 13, 14], hunde: [1, 2, 3, 4, 5, 6, 7, 8, 13, 14] };
Board3D.edLists = function (ed) { Board3D.WHITE_FUR = Board3D.WHITE_FUR_ED[ed] || []; Board3D.NO_SASHI = Board3D.NO_SASHI_ED[ed] || Board3D.NO_SASHI_ED.feudal; };
Board3D.KUMADORI = [[0.85, 0.52, 0.1], [0.62, 0.05, 0.03]]; // Zeichnung im Fell (dunkle Partien des Originals): Sente Gold, Gote Zinnober
Board3D.paintPatch = function (sh, col, t) {
  var fur = Board3D.WHITE_FUR.indexOf(t >= 9 && t <= 12 ? t - 8 : t) >= 0;
  var r = Board3D.RIM[col] || Board3D.RIM[0], f = Board3D.SASHI[col] || Board3D.SASHI[0], v3 = function (x) { return 'vec3(' + x.join(', ') + ')'; };
  sh.uniforms.uFlagT = Board3D.ARMY_TIME;
  sh.vertexShader = 'uniform float uFlagT; attribute float aFlag; attribute vec2 aFlagUV; varying float vFlag; varying vec2 vFlagUV;\n' + sh.vertexShader
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n vFlag = aFlag; vFlagUV = aFlagUV;')
    // Fähnchen weht (nach Skelett/Biegung, vor der Projektion), Phase nach Weltposition des Soldaten
    .replace('#include <project_vertex>', 'if (aFlag > 0.75) { float fp = instanceMatrix[3].x * 3.1 + instanceMatrix[3].z * 1.7; transformed.z += (sin(uFlagT * 4.2 + fp + aFlagUV.x * 2.5) * 0.6 + sin(uFlagT * 7.3 + fp * 1.3) * 0.25) * aFlagUV.x * 0.035; }\n#include <project_vertex>');
  sh.fragmentShader = 'varying float vFlag; varying vec2 vFlagUV;\n' + sh.fragmentShader
    .replace('#include <map_fragment>', ['#include <map_fragment>',
      // etwas kräftiger und heller (die gebackene Albedo ist dunkel, auf dem Feld wirkte die Armee matschig)
      '{ vec3 c0 = diffuseColor.rgb; float l0 = dot(c0, vec3(0.2126, 0.7152, 0.0722)); diffuseColor.rgb = max(mix(vec3(l0), c0, 1.18), 0.0) * 1.06;',
      fur ? '  { float mx = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)), mn = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b)), sat = (mx - mn) / (mx + 1e-4), hue = mx == diffuseColor.r ? mod((diffuseColor.g - diffuseColor.b) / max(mx - mn, 1e-5), 6.0) / 6.0 : 0.5;' +
        ' float w = smoothstep(0.22, 0.42, sat) * (1.0 - smoothstep(0.13, 0.17, hue));' +
        ' float mk = 1.0 - smoothstep(0.1, 0.17, l0); vec3 fw = vec3(0.93, 0.91, 0.88) * clamp(0.62 + l0 * 1.6, 0.0, 1.0);' +
        ' diffuseColor.rgb = mix(diffuseColor.rgb, mix(fw, ' + v3(Board3D.KUMADORI[col] || Board3D.KUMADORI[0]) + ', mk), w); }' : '',
      '  if (vFlag > 0.75) { float rr = length((vFlagUV - vec2(0.5, 0.6)) * vec2(0.45, 1.0)) / 0.15; diffuseColor.rgb = mix(' + v3(f[1]) + ', ' + v3(f[0]) + ', smoothstep(0.9, 1.0, rr)); }',
      '  else if (vFlag > 0.25) diffuseColor.rgb = vec3(0.05, 0.04, 0.035); }'].join('\n'))
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>' + (fur ? '\n roughnessFactor = 0.95;' : ''))
    // Randschein in Spielerfarbe: liest sich auch aus der Ferne, kostet nur eine Rechnung pro Pixel
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  if (vFlag < 0.25) totalEmissiveRadiance += ' + v3(r) + ' * pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 3.0) * 0.32;');
};
// Sashimono an die Soldaten-Geometrie hängen: Stange am Rücken + Tuch (doppelseitig), folgt Rumpf (Skelett: spine_03) bzw. Körper-Biegung
Board3D.prototype.sashiGeo = function (geo, sk) {
  if (geo.userData.sashi) return geo.userData.sashi;
  var T = THREE, GC = ['getX', 'getY', 'getZ', 'getW']; function comp(at, i, k) { return at[GC[k]](i); } geo.computeBoundingBox(); var bb = geo.boundingBox, H = bb.max.y - bb.min.y, y0 = bb.min.y, zb = bb.min.z * 0.85, n0 = geo.getAttribute('position').count;
  var P = [], N = [], F = [], FU = [];
  function quad(a, b, c, d, nz, fl, uv) { var i0 = P.length / 3; [a, b, c, d].forEach(function (q, k) { P.push(q[0], q[1], q[2]); N.push(0, 0, nz); F.push(fl); FU.push(uv[k][0], uv[k][1]); }); return nz > 0 ? [i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3] : [i0, i0 + 2, i0 + 1, i0, i0 + 3, i0 + 2]; }
  var I = [], pw = H * 0.008, yb = y0 + H * 0.5, yt = y0 + H * 1.04, cx0 = 0.0, z0 = zb - H * 0.012, U0 = [[0, 0], [1, 0], [1, 1], [0, 1]];
  // Stange: zwei gekreuzte schmale Flächen
  I = I.concat(quad([cx0 - pw, yb, z0], [cx0 + pw, yb, z0], [cx0 + pw, yt, z0], [cx0 - pw, yt, z0], -1, 0.5, U0), quad([cx0 - pw, yb, z0], [cx0 + pw, yb, z0], [cx0 + pw, yt, z0], [cx0 - pw, yt, z0], 1, 0.5, U0));
  // Tuch: hängt seitlich an der Stange, oben
  var fx0 = cx0 + pw, fx1 = cx0 + pw + H * 0.075, fy0 = y0 + H * 0.86, fy1 = yt - H * 0.01, zf = z0 - H * 0.002;
  I = I.concat(quad([fx0, fy0, zf], [fx1, fy0, zf], [fx1, fy1, zf], [fx0, fy1, zf], -1, 1, U0), quad([fx0, fy0, zf + H * 0.001], [fx1, fy0, zf + H * 0.001], [fx1, fy1, zf + H * 0.001], [fx0, fy1, zf + H * 0.001], 1, 1, U0));
  var m = P.length / 3, out = new T.BufferGeometry(), src = geo.index ? geo : null;
  ['position', 'normal', 'uv', 'aIdle', 'aSkinI', 'aSkinW'].forEach(function (nm) {
    var at = geo.getAttribute(nm); if (!at) return; var isz = at.itemSize, arr = new Float32Array((n0 + m) * isz);
    for (var i = 0; i < n0; i++) for (var k = 0; k < isz; k++) arr[i * isz + k] = comp(at, i, k);
    for (i = 0; i < m; i++) {
      var o = (n0 + i) * isz, y = P[i * 3 + 1];
      if (nm === 'position') { arr[o] = P[i * 3]; arr[o + 1] = y; arr[o + 2] = P[i * 3 + 2]; }
      else if (nm === 'normal') { arr[o] = 0; arr[o + 1] = 0; arr[o + 2] = N[i * 3 + 2]; }
      else if (nm === 'aIdle') { arr[o] = Math.min(0.92, (y - y0) / H * 0.8); arr[o + 1] = comp(at, 0, 1); arr[o + 2] = comp(at, 0, 2); arr[o + 3] = comp(at, 0, 3); }
      else if (nm === 'aSkinI') { arr[o] = sk ? Math.max(0, sk.meta.bones.indexOf('spine_03')) : 0; }
      else if (nm === 'aSkinW') { arr[o] = 1; }
    }
    out.setAttribute(nm, new T.BufferAttribute(arr, isz));
  });
  var fl = new Float32Array(n0 + m), fu = new Float32Array((n0 + m) * 2);
  for (var i = 0; i < m; i++) { fl[n0 + i] = F[i]; fu[(n0 + i) * 2] = FU[i * 2]; fu[(n0 + i) * 2 + 1] = FU[i * 2 + 1]; }
  out.setAttribute('aFlag', new T.BufferAttribute(fl, 1)); out.setAttribute('aFlagUV', new T.BufferAttribute(fu, 2));
  var idx = []; if (geo.index) for (i = 0; i < geo.index.count; i++) idx.push(geo.index.getX(i)); else for (i = 0; i < n0; i++) idx.push(i);
  I.forEach(function (x) { idx.push(n0 + x); }); out.setIndex(idx);
  out.boundingBox = null; out.computeBoundingSphere();
  return (geo.userData.sashi = out);
};
Board3D.prototype.armyMatI = function (col, rim, map, t) {
  var key = 'armyI' + col + (rim ? 'r' : '') + (map ? map.uuid : ''); this.statueCache = this.statueCache || {};
  if (this.statueCache[key]) return this.statueCache[key];
  var mat = this.armyBase(col, map);
  if (map && Board3D.WHITE_FUR.indexOf(t >= 9 && t <= 12 ? t - 8 : t) >= 0) mat.normalScale.multiplyScalar(0.3); // Fell: weich statt facettiert
  mat.onBeforeCompile = function (sh) {
    sh.uniforms.uTime = Board3D.ARMY_TIME;
    sh.vertexShader = 'uniform float uTime;\nattribute vec4 aIdle;\nattribute vec3 iAnim;\n' + sh.vertexShader.replace('#include <begin_vertex>', Board3D.ARMY_VS);
    if (map) Board3D.paintPatch(sh, col, t);
    if (rim) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vec3(1.0, 0.12, 0.05) * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2) * 1.6;');
  };
  mat.customProgramCacheKey = function () { return (rim ? 'armyI-rim' : 'armyI') + (map ? 'p' + col + (Board3D.WHITE_FUR.indexOf(t >= 9 && t <= 12 ? t - 8 : t) >= 0 ? 'f' : '') : ''); };
  return (this.statueCache[key] = mat);
};
// Material für Soldaten mit Skelett: Clips aus der gebackenen Textur statt Vertex-Biegung
Board3D.prototype.armyMatS = function (col, rim, sk, map, t) {
  var key = 'armyS' + col + (rim ? 'r' : '') + (map ? map.uuid : ''); this.statueCache = this.statueCache || {};
  if (this.statueCache[key]) return this.statueCache[key];
  var mat = this.armyBase(col, map);
  if (map && Board3D.WHITE_FUR.indexOf(t >= 9 && t <= 12 ? t - 8 : t) >= 0) mat.normalScale.multiplyScalar(0.3); // Fell: weich statt facettiert
  mat.onBeforeCompile = function (sh) {
    SkinAnim.patch(sh, sk);
    if (map) Board3D.paintPatch(sh, col, t);
    if (rim) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vec3(1.0, 0.12, 0.05) * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2) * 1.6;');
  };
  mat.customProgramCacheKey = function () { return (rim ? 'armyS-rim' : 'armyS') + (map ? 'p' + col + (Board3D.WHITE_FUR.indexOf(t >= 9 && t <= 12 ? t - 8 : t) >= 0 ? 'f' : '') : ''); };
  return (this.statueCache[key] = mat);
};
// Clip je Soldat: Tod > Einzelaktion (Hieb, Block, Treffer, Jubel) > Laufen/Gehen > Kampfhaltung/Ruhe
Board3D.prototype.skinState = function (tr, g) {
  var u = tr.userData, A = u.skin, now = SkinAnim.time.value;
  if (u.dying || u.dead) { if (!u.dieC) { u.dieC = u.heavyDeath || Math.random() < 0.5 ? 'die2' : 'die1'; SkinAnim.play(A, u, u.dieC, 1e-4); } return u.clip; }
  if (u.shotEnd > now) return u.clip;
  var w = u.u.uWalk.value, want = w > 0.95 ? 'run' : w > 0.12 ? 'walk' : g.userData.fighting ? 'ready' : 'idle';
  if (u.cur !== want) { u.cur = want; SkinAnim.play(A, u, want, want === 'run' || want === 'walk' ? 1e-4 : Math.random() * A.dur[want]); }
  return u.clip;
};
// Einzelaktion abspielen; hitAt = Sekunden bis zum Treffer in der Simulation (Clip wird so verschoben, dass sein Treffer-Frame passt)
Board3D.prototype.skinShot = function (s, name, hitAt) {
  var u = s.userData, A = u.skin; if (!A || u.dying || u.dead) return;
  if (Array.isArray(name)) name = name[Math.floor(Math.random() * name.length)];
  var off = hitAt != null ? Math.max(0, (A.hit[name] || 0) - hitAt) : 0;
  SkinAnim.play(A, u, name, off + 1e-4); u.shotEnd = SkinAnim.time.value - off + A.dur[name] * 0.9; u.cur = name;
};
Board3D.SKIN = { 1: 'models/anim/ashigaru', 2: 'models/anim/naginata', 3: 'models/anim/kitsune', 4: 'models/anim/kenshi', 5: 'models/anim/yari', 6: 'models/anim/onmyoji', 7: 'models/anim/tengu', 8: 'models/anim/samurai', 9: 'models/anim/veteran', 12: 'models/anim/general', 13: 'models/anim/kirin', 14: 'models/anim/ryu' }; // Typen mit Skelett (nur Feudal-Statuen)
Board3D.ATK = ['atk1', 'atk2', 'atk3', 'atk4'];
// Instanzen-Topf je Modell + Farbe (wächst bei Bedarf)
Board3D.prototype.armyPool = function (key, geo, col, rim, sk, map, t) {
  var pools = this.armyPools = this.armyPools || {}, P = pools[key], T = THREE;
  if (P && !P.grow) return P;
  var cap = P ? P.cap * 2 : 64; sk = sk || (P && P.skin); map = map || (P && P.map); t = t || (P && P.t);
  if (P) { this.scene.remove(P.im); P.im.dispose(); }
  var g2 = geo.clone(), anim = new T.InstancedBufferAttribute(new Float32Array(cap * 3), 3); anim.setUsage(T.DynamicDrawUsage); g2.setAttribute('iAnim', anim);
  var clip = null; if (sk) { clip = new T.InstancedBufferAttribute(new Float32Array(cap * 4), 4); clip.setUsage(T.DynamicDrawUsage); g2.setAttribute('iClip', clip); }
  var im = new T.InstancedMesh(g2, sk ? this.armyMatS(col, rim, sk, map, t) : this.armyMatI(col, rim, map, t), cap); im.instanceMatrix.setUsage(T.DynamicDrawUsage);
  if (sk) { var dm = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }); dm.onBeforeCompile = function (sh) { SkinAnim.patch(sh, sk, true); }; dm.customProgramCacheKey = function () { return 'armySd'; }; im.customDepthMaterial = dm; }
  im.setColorAt(0, new T.Color(1, 1, 1)); im.count = 0; im.frustumCulled = false; im.castShadow = this.quality === 'high' && !this.mobile; im.raycast = function () { };
  this.scene.add(im);
  return (pools[key] = { im: im, anim: anim, clip: clip, skin: sk || null, cap: cap, n: 0, grow: false, geo: geo, col: col, rim: rim, map: map || null, t: t });
};
// jedes Bild: Platzhalter-Matrizen und Animationswerte in die Instanzen kopieren
Board3D.prototype.armyDraw = function () {
  var pools = this.armyPools, k, self = this; if (!pools) return;
  for (k in pools) pools[k].n = 0;
  this.pieceGroup.updateMatrixWorld(true);
  this.pieceGroup.children.forEach(function (g) {
    if (!g.visible || !g.userData.troops) return;
    g.userData.troops.forEach(function (tr) {
      if (!tr.visible) return;
      var u = tr.userData, P = pools[u.pk] || self.armyPool(u.pk, u.geo, u.col, u.rim, u.skin, u.map, u.t);
      if (P.n >= P.cap) { P.grow = true; return; }
      var i = P.n++;
      var mw = u.mesh.matrixWorld; if (self.gH) { mw = (self._ghM || (self._ghM = new THREE.Matrix4())).copy(mw); mw.elements[13] += self.gH(mw.elements[12], mw.elements[14]); } // Gelände mit Hügeln (feldzug.js)
      P.im.setMatrixAt(i, mw);
      if (u.flash > 0) { var fl = self._flc || (self._flc = new THREE.Color()); fl.copy(u.tint).multiplyScalar(1 + u.flash * 3); fl.r += u.flash * 0.6; P.im.setColorAt(i, fl); } else P.im.setColorAt(i, u.tint);
      P.anim.setXYZ(i, u.u.uPhase.value, u.u.uAct.value, u.u.uWalk.value);
      if (P.clip) { var c = self.skinState(tr, g); P.clip.setXYZW(i, c[0], c[1], c[2], c[3]); }
    });
  });
  for (k in pools) {
    var P = pools[k];
    if (P.grow) { this.armyPool(k, P.geo, P.col, P.rim); continue; }
    P.im.count = P.n; P.im.instanceMatrix.needsUpdate = true; P.anim.needsUpdate = true; if (P.clip) P.clip.needsUpdate = true; if (P.im.instanceColor) P.im.instanceColor.needsUpdate = true;
  }
};
// Feldzeichen mit Kanji: Sente schwarzes Tuch, Gote weißes (wie die 2D-Steine), befördert rotes Kanji
Board3D.prototype.armyBanner = function (t, col) {
  var key = 'ban' + t + ':' + col, tex = this.faceTex[key], T = THREE;
  if (!tex) {
    var c = document.createElement('canvas'); c.width = 128; c.height = 224; var x = c.getContext('2d');
    tex = this.faceTex[key] = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    var u = this.theme.units[t], kan = t === 8 && col === 1 ? (u.kanji2 || u.kanji) : u.kanji;
    var draw = function () {
      x.fillStyle = col === 0 ? '#16130f' : '#f1ede4'; x.fillRect(0, 0, 128, 224);
      x.strokeStyle = col === 0 ? '#c9a24a' : '#8a8f96'; x.lineWidth = 7; x.strokeRect(6, 6, 116, 212);
      x.fillStyle = t >= 9 ? (col === 0 ? '#ff5a40' : '#c41e1e') : col === 0 ? '#ecd08a' : '#1b1b1b';
      x.font = 'bold ' + (kan.length > 1 ? 70 : 92) + 'px "Noto Serif JP", serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      if (kan.length > 1) { x.fillText(kan[0], 64, 72); x.fillText(kan[1], 64, 152); } else x.fillText(kan, 64, 114);
      tex.needsUpdate = true;
    };
    draw(); if (document.fonts) document.fonts.ready.then(draw);
  }
  var g = new T.Group(), dark = this._poleMat || (this._poleMat = new T.MeshStandardMaterial({ color: 0x1a1010, roughness: 0.4 }));
  var pole = new T.Mesh(this._poleGeo || (this._poleGeo = new T.CylinderGeometry(0.012, 0.012, 1.12, 6)), dark); pole.position.y = 0.56; g.add(pole);
  var top = new T.Mesh(this._tipGeo || (this._tipGeo = new T.ConeGeometry(0.022, 0.06, 6)), this.statueMat(col, null, false)); top.position.y = 1.15; g.add(top);
  var piv = new T.Group(); piv.position.y = 0.84; g.add(piv);
  // Vorder- und Rückseite einzeln, damit das Kanji von beiden Seiten richtig herum steht
  var fm = new T.MeshStandardMaterial({ map: tex, roughness: 0.75 }), fg = this._flagGeo || (this._flagGeo = new T.PlaneGeometry(0.3, 0.52));
  var flag = new T.Mesh(fg, fm); flag.position.x = 0.155; piv.add(flag);
  var back = new T.Mesh(fg, fm); back.position.x = 0.155; back.rotation.y = Math.PI; piv.add(back);
  g.userData.piv = piv;
  return g;
};
// Formation in Spielstein-Form (Fünfeck, Spitze nach vorn = -z): gleiche Mannzahl und Fläche wie das Rechteck cols x rows,
// Reihen von der Spitze nach hinten, Breite wächst bis zur Schulter (~1/3) und dann leicht bis zur Basis
Board3D.komaSlots = function (F) {
  var N = F.cols * F.rows; if (N <= 1) return [{ x: 0, z: 0 }];
  function hw(t) { return t < 0.45 ? 0.88 * t / 0.45 : 0.88 + 0.12 * (t - 0.45) / 0.55; } // halbe Breite relativ zur Basis
  var area = 0; for (var q = 0; q < 50; q++) area += hw((q + 0.5) / 50) / 50; // Fläche relativ zum Rechteck
  var W = F.cols * F.sx / Math.sqrt(area), D = F.rows * F.sz / Math.sqrt(area);
  var nr = Math.max(N >= 6 ? 3 : 2, Math.round(D / F.sz * 0.95), Math.round(Math.sqrt(N * 1.4))) /* genug Reihen, damit die Spitze erkennbar ist */, w = [], sum = 0, i;
  for (i = 0; i < nr; i++) { w.push(hw((i + 0.5) / nr)); sum += w[i]; }
  var cnt = w.map(function (v, j) { return j === 0 ? 1 : Math.max(1, Math.floor(N * v / sum)); }), have = cnt.reduce(function (a, b) { return a + b; }, 0);
  // Rest auf die breitesten Reihen verteilen (hinten zuerst), Überschuss vorne abziehen
  for (i = nr - 1; have < N; i = i > 1 ? i - 1 : nr - 1) { cnt[i]++; have++; }
  for (i = 1; have > N; i = i % (nr - 1) + 1) if (cnt[i] > 1) { cnt[i]--; have--; } // Spitze bleibt ein Mann (Offizier)
  var out = [];
  for (i = 0; i < nr; i++) {
    var t = (i + 0.5) / nr, z = -D / 2 + t * D, half = hw(t) * W / 2 * 0.92, n = cnt[i];
    for (var c = 0; c < n; c++) out.push({ x: n === 1 ? 0 : -half + 2 * half * c / (n - 1), z: z });
  }
  return out;
};
Board3D.prototype.buildSquad = function (g, src, t, col, sk) {
  var T = THREE, self = this, bt = t >= 9 && t <= 12 ? t - 8 : t, F = Board3D.ARMY[Board3D.ARMY_TYPE[t] || 'line'];
  if (!sk && !src.userData.idle) { src.traverse(function (o) { if (o.isMesh) self.idleAttr(o.geometry); }); src.userData.idle = true; }
  var mesh0 = null; src.traverse(function (o) { if (o.isMesh && !mesh0) mesh0 = o; }); if (!mesh0) return;
  var geo0 = sk ? sk.geo : mesh0.geometry, rim = t >= 9 && this.settings.promoStyle === 'glanz';
  var srcM = sk ? sk.mat : mesh0.material, map = this.settings.armyLook !== 'statue' && srcM && srcM.map || null;
  if (map && !map.userData.nscale) { map.userData.nmap = srcM.normalMap || null; map.userData.nscale = srcM.normalScale ? srcM.normalScale.clone() : null; }
  var pk = geo0.uuid + ':' + col + (rim ? 'r' : '') + (map ? 'c' : '') + (map && this.settings.armySashi !== false && Board3D.NO_SASHI.indexOf(bt) < 0 ? 's' : ''), troops = [], rnd = Board3D.rnd(bt * 31 + col * 101 + (this._squadN = (this._squadN || 0) + 1) * 7919), fa = (rnd() - .5) * 0.12, fox = (rnd() - .5) * 0.07, foz = (rnd() - .5) * 0.06;
  if (pk.slice(-1) === 's') geo0 = this.sashiGeo(geo0, sk);
  this.armyPool(pk, geo0, col, rim, sk, map, t);
  function noop() { }
  var slots = [];
  Board3D.komaSlots(F).forEach(function (p, i) {
    var x0 = p.x + (rnd() - .5) * 0.03, z0 = p.z + (rnd() - .5) * 0.03;
    slots.push({ x: x0 * Math.cos(fa * 0.4) - z0 * Math.sin(fa * 0.4) + fox * 0.5, z: x0 * Math.sin(fa * 0.4) + z0 * Math.cos(fa * 0.4) + foz * 0.5, d: Math.hypot(x0, z0), officer: i === 0 && F.cols > 1, s: 0.92 + 0.14 * rnd() });
  });
  // Beförderung nach Verlusten: nur die Überlebenden werden Veteranen (nie mehr als vorher), eng um die Mitte geschart
  var cap = g.userData.cap; if (cap && cap < slots.length) { slots.sort(function (a, b) { return a.d - b.d; }); slots.length = cap; }
  slots.forEach(function (sl) {
    var x = sl.x, z = sl.z, officer = sl.officer, s = (officer ? 1.14 : 1) * sl.s * (t >= 9 ? 1.06 : 1);
    var m = Models.fit(src, F.h * s, F.foot * s * 3), tr = new T.Group(), mesh = null;
    m.traverse(function (o) { if (o.isMesh) { o.visible = false; o.raycast = noop; if (!mesh) mesh = o; } });
    m.userData.ry0 = Math.PI + (rnd() - 0.5) * 0.3; m.rotation.y = m.userData.ry0;
    tr.add(m); tr.position.set(x, 0, z);
    var br = 0.88 + rnd() * 0.2, hue = (rnd() - 0.5) * 0.1;
    tr.userData = { glb: m, mesh: mesh, pk: pk, geo: geo0, map: map, t: t, skin: sk || null, col: col, rim: rim, tint: new T.Color(br * (1 + hue), br, br * (1 - hue)), u: { uPhase: { value: Math.random() * 6.283 }, uAct: { value: 0 }, uWalk: { value: 0 } }, home: { x: x, z: z }, hh: F.h * s * 0.8, pw0: (F.pw || F.h) * s, ox: 0, oz: 0, tx: 0, tz: 0, lk: 0, look: 0, next: 1 + Math.random() * 5 };
    if (sk) { tr.userData.cur = 'idle'; tr.userData.clip = [sk.ids.idle, -Math.random() * sk.dur.idle, -1, 0]; }
    g.add(tr); troops.push(tr);
  });
  g.userData.troops = troops;
};
// Leerlauf: kleine Schritte in der Formation, umschauen, Fahne weht
Board3D.prototype.armyIdle = function (g, t, dt) {
  var k = 1 - Math.exp(-dt / 450), fighting = g.userData.fighting || g.userData.marching;
  g.userData.troops.forEach(function (tr) {
    var u = tr.userData, m = u.glb; if (u.flash > 0) u.flash = Math.max(0, u.flash - dt / 220); if (u.dead) return;
    if (!fighting) {
      if (t > u.next) { u.next = t + 3 + Math.random() * 7; u.tx = u.skin ? 0 : (Math.random() - .5) * 0.035; u.tz = u.skin ? 0 : (Math.random() - .5) * 0.03; /* Skelett-Soldaten trippeln nicht (sähe nach Rutschen aus) */ u.look = Math.random() < .5 ? 0 : (Math.random() - .5) * 1.1; }
      var ox = u.ox, oz = u.oz; u.ox += (u.tx - u.ox) * k; u.oz += (u.tz - u.oz) * k;
      tr.position.x = u.home.x + u.ox; tr.position.z = u.home.z + u.oz;
      u.u.uWalk.value = u.skin ? 0 : Math.min(0.6, Math.hypot(u.ox - ox, u.oz - oz) / Math.max(dt, 1) * 2500);
    } else u.look = 0;
    u.lk += (u.look - u.lk) * k;
    m.rotation.y = m.userData.ry0 + (m.userData.face || 0) + u.lk;
  });
  var b = g.userData.banner; if (b) b.userData.piv.rotation.y = Math.sin(t * 1.7 + g.position.x * 2.1 + g.position.z) * 0.3 + Math.sin(t * 4.1 + g.position.z) * 0.06;
};

// Schlachtfeld im Total-War-Stil: Hügelland bis zu fernen Bergen, Gras/Erde/Fels gemischt (ohne sichtbare Kacheln), Wolkenschatten,
// wogende Grasbüschel, Wälder auf den Hügeln, Feldlager mit Vorhängen (Jinmaku), Lagerfeuer, Dunst
Board3D.noise = (function () {
  var P = new Uint8Array(512), r = Board3D.rnd(1234), i;
  for (i = 0; i < 256; i++) P[i] = i;
  for (i = 255; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = P[i]; P[i] = P[j]; P[j] = t; }
  for (i = 0; i < 256; i++) P[i + 256] = P[i];
  function h(x, z) { return P[P[x & 255] + (z & 255)] / 255; }
  function n2(x, z) { var xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    var a = h(xi, zi), b = h(xi + 1, zi), c = h(xi, zi + 1), d = h(xi + 1, zi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  return function (x, z, oct) { var s = 0, amp = 0.5, f = 1, n = oct || 4; for (var k = 0; k < n; k++) { s += amp * n2(x * f + k * 17.3, z * f - k * 9.1); f *= 2.03; amp *= 0.5; } return s / (1 - Math.pow(0.5, n)); };
})();
function fsmooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
// Abstand vom Spielfeld-Rechteck (0 im Feld)
Board3D.fieldE = function (x, z) { return Math.hypot(Math.max(Math.abs(x) - 4.7, 0), Math.max(Math.abs(z) - 5.0, 0)); };
// Geländehöhe über der Spielebene: Feld flach, sanfte Hügel, am Horizont Bergketten
Board3D.fieldH = function (x, z) {
  var N = Board3D.noise, e = Board3D.fieldE(x, z), f = fsmooth(2.2, 20, e);
  var hills = (N(x * 0.05, z * 0.05) - 0.42) * 7 * f * f + f * 1.4;
  var sh = Board3D.FIELD_SHAPE, far = sh === 'tal' || sh === 'belagerung', m = far ? fsmooth(55, 120, e) : fsmooth(34, 85, e), ridge = 1 - Math.abs(N(x * 0.022 + 5, z * 0.022 - 3, 5) * 2 - 1);
  var bump = (N(x * 0.6, z * 0.6, 2) - 0.5) * 0.06 * fsmooth(0.6, 3, e);
  var mo = 0; (Board3D.MOUNDS || []).forEach(function (q) { var d = Math.hypot(x - q[0], z - q[1]); mo = Math.max(mo, q[3] * fsmooth(q[2], q[2] * 0.5, d)); });
  var base = Math.max(hills, -0.2, mo) + m * (far ? 7 + ridge * ridge * 26 : 6 + ridge * ridge * 30) + bump;
  if (sh === 'pass') {
    // Gebirgspass: steile Talflanken links und rechts, Tal läuft in z-Richtung weiter
    var wx = Math.abs(x) - 13 - (N(z * 0.035 + 3, x > 0 ? 1 : 7) - 0.5) * 9, wall = fsmooth(0, 22, wx);
    base = Math.max(hills * 0.6, -0.2, mo) + wall * wall * (18 + ridge * 26) + fsmooth(-4, 6, wx) * 2 + m * ridge * 22 + bump;
  } else if (sh === 'tal') {
    // Flusstal: Fluss schneidet sich rechts durchs Tal, links Reisterrassen am Hang
    var rd = Math.abs(x - Board3D.riverX(z)), carve = (1 - fsmooth(1.3, 4.2, rd)) * (1 - fsmooth(40, 52, -z));
    base = base * (1 - carve) - carve * 1.1;
    var tq = fsmooth(10, 13, -x) * (1 - fsmooth(14, 22, Math.abs(z + 2))) * (1 - fsmooth(26, 34, -x));
    if (tq > 0) { var st = 0.7, hq = Math.floor(base / st) * st + fsmooth(0.86, 1, (base / st) % 1) * st; base = base + (hq - base) * tq; }
  }
  return base;
};
// Reisfelder (nur Tal): flache Stellen der Terrassen als Raster [x, Wasserhöhe, z], Zellen 1,7 m, Wasser 1,5 m (Rest = Damm)
Board3D.paddyCells = function () {
  var H = Board3D.fieldH, cells = [], cx, cz;
  for (cx = -31; cx <= -11; cx += 1.7) for (cz = -19; cz <= 15; cz += 1.7) {
    var h0 = H(cx - 0.7, cz - 0.7), h1 = H(cx + 0.7, cz - 0.7), h2 = H(cx - 0.7, cz + 0.7), h3 = H(cx + 0.7, cz + 0.7), lo = Math.min(h0, h1, h2, h3), hi = Math.max(h0, h1, h2, h3);
    if (hi - lo < 0.05 && Board3D.fieldE(cx, cz) > 6) cells.push([cx, hi + 0.025, cz]);
  }
  return cells;
};
// Flusslauf (x in Abhängigkeit von z), rechts vom Feld
Board3D.riverX = function (z) { return 13.4 + Math.sin(z * 0.07 + 1) * 3 + Math.sin(z * 0.19) * 0.8; };
// Stimmungen des Schlachtfelds (Himmel von Poly Haven, CC0, Sonne im Bild auf die Lichtrichtung gedreht)
// sun: Farbe, Stärke, Richtung; hemi: Himmel, Boden, Stärke; fog: Dichte, Höhennebel [Basis, Dichte, Abfall], Sonnenschein im Dunst [Farbe, Stärke, Bündelung]
Board3D.FIELD_MOODS = {
  mittag: { sky: 'sky_kloofendal_38d_partly_cloudy_puresky.webp', skyI: 0.95, exp: 1.05, sun: [0xffdcaa, 2.4, [-13, 11, 5]], hemi: [0xd6e4f2, 0x4a4430, 0.62], fog: [0xb4bec4, 0.0105], tint: [1, 1, 1] },
  tal: { sky: 'sky_kloppenheim_06_puresky.webp', skyI: 1, exp: 0.96, sun: [0xffd09a, 2.7, [-0.73, 0.24, -0.63]], hemi: [0xb8cce6, 0x4a4632, 0.55], fog: [null, 0.0095], fogS: [0.68, 0.74, 0.82], snow: 999, hfog: [0.2, 0.05, 0.55], glow: [0xffc488, 0.55, 6], tint: [1.0, 1.02, 0.96], shape: 'tal',
    trees: [[0xffffff, 0xe6f0dc, 0xd0dcc4], [0xffb3c6, 0xffc6d4, 0xf2a0b8, 0x6a9a48, 0x5a8a3c, 0x7aa850]], part: { color: 0xffc0d0, size: 0.07, area: 26, speed: 0.35, opacity: 0.8 },
    mist: { c: 0xf2f4f6, o: 0.38, n: 10, r: [20, 55], h: 1.2, river: true }, flowers: [0xffd8ea, 0xffffff, 0xffe27a, 0xf4a8c8] },
  pass: { sky: 'sky_belfast_sunset_puresky.webp', skyI: 1, exp: 1.08, sun: [0xff9450, 3.2, [0.24, 0.13, -0.96]], hemi: [0x8c94c0, 0x3a2a22, 0.5], fog: [null, 0.0105], snow: 24, hfog: [0.4, 0.016, 0.3], glow: [0xffa060, 0.7, 6], tint: [1.04, 0.97, 0.88], shape: 'pass',
    trees: [[0xd8dcc8, 0xc4ccb4, 0xb8c0a8], [0xd2441c, 0xe8701e, 0xe0a02a, 0xb03018, 0x9a8a2c, 0xc85a1a]], part: { color: 0xffc890, size: 0.05, area: 24, speed: 0.12, opacity: 0.6 },
    mist: { c: 0xffd8b4, o: 0.38, n: 9, r: [28, 70], h: 3 }, flowers: [0xe0a838, 0xc8642c] },
  belagerung: { sky: 'sky_overcast_soil_puresky.webp', skyI: 0.62, exp: 0.92, sun: [0xffa878, 0.85, [0.66, 0.57, -0.49]], hemi: [0x6c7484, 0x2c2420, 0.42], fog: [null, 0.0125], fogS: [0.42, 0.34, 0.31], snow: 999, hfog: [0.3, 0.04, 0.3], glow: [0xff7040, 0.6, 3], tint: [0.86, 0.84, 0.8], shape: 'belagerung',
    trees: [[0xa8b0a0, 0x98a090], [0x5a6a3a, 0x6a6a38, 0x4a5a30, 0x7a6030]], part: { color: 0xff7a28, size: 0.07, area: 22, speed: 0.6, opacity: 0.9, rise: true }, mist: { c: 0x4c4446, o: 0.42, n: 9, r: [22, 50], h: 4 },
    mounds: [[2, -33, 12, 3.6], [24, -29, 6, 2.6], [-24, 26, 7, 2.8], [16, 31, 6, 1.8]], castleS: 1.7, fires: [[-9, -21], [11, -22], [-15, -28], [17, -33], [-4, -19.5], [6, -40]] }
};
// three.js ACES (wie im Shader) auf der CPU: daraus die lineare Nebelfarbe suchen, die nach Tonemapping genau wie der Himmel am Horizont aussieht
Board3D.acesInv = function (srgb, exposure) {
  function lin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  var tgt = srgb.map(lin), I = [0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777], O = [1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602];
  function mul(M, v) { return [M[0] * v[0] + M[3] * v[1] + M[6] * v[2], M[1] * v[0] + M[4] * v[1] + M[7] * v[2], M[2] * v[0] + M[5] * v[1] + M[8] * v[2]]; }
  function fit(v) { return (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.4329510) + 0.238081); }
  function aces(c) { var v = mul(I, c.map(function (x) { return x * exposure / 0.6; })); v = mul(O, v.map(fit)); return v.map(function (x) { return Math.max(0, Math.min(1, x)); }); }
  var f = tgt.slice();
  for (var it = 0; it < 60; it++) { var o = aces(f); for (var k = 0; k < 3; k++) f[k] = Math.max(0, f[k] + (tgt[k] - o[k]) * 1.2 * Math.max(0.3, f[k] + 0.05)); }
  return new THREE.Color(f[0], f[1], f[2]);
};
// Höhennebel mit Sonnenschein im Dunst: ersetzt den FogExp2-Teil der Shader-Bausteine. Werte als Konstanten,
// Shader-Programme hängen am Renderer (jedes Brett hat einen eigenen), deshalb vor dem ersten Bild setzen und beim nächsten Brett zurück.
// FogExp2, das zusätzlich near (= Stärke Sonnenschein, 0–1) und far (= Dichte) an die Shader gibt: three lädt near/far nur bei isFog hoch
Board3D.glowFog = function (fg) { fg.isFog = true; fg.near = 1; Object.defineProperty(fg, 'far', { get: function () { return this.density; } }); return fg; };
Board3D.setHeightFog = function (o) {
  var C = THREE.ShaderChunk, F = Board3D._fog0 || (Board3D._fog0 = { pv: C.fog_pars_vertex, v: C.fog_vertex, pf: C.fog_pars_fragment, f: C.fog_fragment });
  if (!o) { C.fog_pars_vertex = F.pv; C.fog_vertex = F.v; C.fog_pars_fragment = F.pf; C.fog_fragment = F.f; return; }
  function n(x) { return (+x).toFixed(5); }
  var sc = new THREE.Color(o.glow[0]), sd = new THREE.Vector3().fromArray(o.dir).normalize();
  C.fog_pars_vertex = F.pv + '\n#ifdef USE_FOG\nvarying vec3 vFogWP;\n#endif\n';
  C.fog_vertex = F.v + '\n#ifdef USE_FOG\nvFogWP = (mvPosition.xyz - viewMatrix[3].xyz) * mat3(viewMatrix);\n#endif\n';
  // Dichte kommt über fogFar, Stärke des Sonnenscheins über fogNear (beide setzt three für jedes Material, siehe glowFog)
  C.fog_pars_fragment = F.pf + '\n#ifdef USE_FOG\nvarying vec3 vFogWP;\n#ifdef FOG_EXP2\nuniform float fogNear; uniform float fogFar;\n#endif\n#endif\n';
  C.fog_fragment = ['#ifdef USE_FOG',
    ' vec3 fRay = vFogWP - cameraPosition; float fLen = length(fRay); vec3 fDir = fRay / max(fLen, 1e-4);',
    ' #ifdef FOG_EXP2',
    '  float fogFactor = 1.0 - exp(-fogFar * fogFar * fLen * fLen);',
    ' #else',
    '  float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);',
    ' #endif',
    ' float fHy = fDir.y * ' + n(o.h[2]) + ' * fLen;',
    ' float fInt = ' + n(o.h[1]) + ' * exp(-(cameraPosition.y - ' + n(o.h[0]) + ') * ' + n(o.h[2]) + ') * fLen * (abs(fHy) > 1e-3 ? (1.0 - exp(-fHy)) / fHy : 1.0);',
    ' fogFactor = min(1.0 - (1.0 - fogFactor) * exp(-max(fInt, 0.0)), 0.985);',
    ' float fSun = pow(max(dot(fDir, vec3(' + n(sd.x) + ',' + n(sd.y) + ',' + n(sd.z) + ')), 0.0), ' + n(o.glow[2]) + ');',
    ' gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor + vec3(' + n(sc.r) + ',' + n(sc.g) + ',' + n(sc.b) + ') * fSun * ' + n(o.glow[1]) + ' * fogNear, fogFactor);',
    '#endif'].join('\n');
};
// ---- Bäume aus Blatt-Karten (wie in Strategiespielen): Krone aus vielen Alpha-Karten mit Kugel-Normalen (weich beleuchtet),
// Stamm im selben Mesh (Rinde unten in der Textur), Wind im Shader, Blätter leuchten im Gegenlicht. Eine Instanz-Liste je Baumart.
Board3D.foliageTex = function (kind) {
  Board3D._fol = Board3D._fol || {};
  if (Board3D._fol[kind]) return Board3D._fol[kind];
  var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d'), r = Board3D.rnd(kind.length * 7 + 3), k;
  // Rinde: unterste 28 px, deckend
  var bark = kind === 'leafy' ? [92, 70, 54] : kind === 'pine' ? [84, 62, 48] : [104, 72, 52];
  g.fillStyle = 'rgb(' + bark.join(',') + ')'; g.fillRect(0, 228, 256, 28);
  for (k = 0; k < 60; k++) { var sh = (r() - 0.5) * 50; g.fillStyle = 'rgba(' + (bark[0] + sh | 0) + ',' + (bark[1] + sh | 0) + ',' + (bark[2] + sh | 0) + ',0.8)'; g.fillRect(r() * 256, 228, 1 + r() * 3, 28); }
  // Laub: Büschel in der Mitte, Ränder ausgefranst
  for (k = 0; k < (kind === 'leafy' ? 520 : 380); k++) {
    var a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * 100, x = 128 + Math.cos(a) * d, y = 112 + Math.sin(a) * d * 0.92, L = 140 + r() * 115 - d * 0.5;
    g.save(); g.translate(x, y);
    if (kind === 'leafy') { g.rotate(r() * 6.3); g.fillStyle = 'rgb(' + (L | 0) + ',' + (L | 0) + ',' + (L * 0.94 | 0) + ')'; g.beginPath(); g.ellipse(0, 0, 3 + r() * 3, 6 + r() * 4, 0, 0, 7); g.fill(); }
    else {
      // Nadelzweige: kurze Striche fächerförmig, direkt grün (Palette nur leicht)
      g.rotate(a + Math.PI / 2 + (r() - 0.5) * 0.6); var gr = kind === 'pine' ? [38, 70, 34] : [34, 62, 36], s = 0.55 + L / 400;
      g.strokeStyle = 'rgb(' + (gr[0] * s * 1.6 | 0) + ',' + (gr[1] * s * 1.6 | 0) + ',' + (gr[2] * s * 1.5 | 0) + ')'; g.lineWidth = 2;
      for (var j = 0; j < 5; j++) { g.beginPath(); g.moveTo(0, 0); g.lineTo((j - 2) * 3, -9 - r() * 6); g.stroke(); }
    }
    g.restore();
  }
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (Board3D._fol[kind] = t);
};
// Geometrie einer Baumart: Stamm (UV unten = Rinde) + Laubkarten (UV oben = Büschel) mit Normalen von der Kronenmitte weg
Board3D.cardTree = function (kind) {
  var T = THREE, P = [], Nn = [], UV = [], C = [], I = [], r = Board3D.rnd(kind.length * 13 + 1), V = function (x, y, z) { return new T.Vector3(x, y, z); };
  function quad(c, ru, up, ctr, ao) {
    var b = P.length / 3;
    [[-1, -1, 0, 0.14], [1, -1, 1, 0.14], [1, 1, 1, 1], [-1, 1, 0, 1]].forEach(function (q) {
      var p = c.clone().addScaledVector(ru, q[0]).addScaledVector(up, q[1]), n = p.clone().sub(ctr).normalize().add(V(0, 0.35, 0)).normalize();
      P.push(p.x, p.y, p.z); Nn.push(n.x, n.y, n.z); UV.push(q[2], q[3]); var s = ao * (0.85 + 0.15 * (q[1] + 1) / 2); C.push(s, s, s);
    });
    I.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  function trunk(pts, rad) { // Stamm als Röhre durch Punkte
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b2 = pts[i + 1], ra = rad * (1 - i / pts.length), rb = rad * (1 - (i + 1) / pts.length), seg = 6, base = P.length / 3;
      for (var s = 0; s <= seg; s++) {
        var an = s / seg * Math.PI * 2, cx = Math.cos(an), cz = Math.sin(an);
        [[a, ra, 0], [b2, rb, 0.11]].forEach(function (e) { P.push(e[0].x + cx * e[1], e[0].y, e[0].z + cz * e[1]); Nn.push(cx, 0, cz); UV.push(s / seg, e[2]); C.push(0.8, 0.8, 0.8); });
      }
      for (s = 0; s < seg; s++) { var o = base + s * 2; I.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
    }
  }
  function rndDir() { var u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u); return V(Math.cos(a) * s, u, Math.sin(a) * s); }
  function card(c, size, ctr, ao) { // zufällig gedrehte Karte, grob zur Kamera-Seite egal (doppelseitig)
    var n = rndDir(), ru = V(0, 1, 0).cross(n); if (ru.lengthSq() < 0.01) ru.set(1, 0, 0); ru.normalize(); var up = n.clone().cross(ru).normalize();
    quad(c, ru.multiplyScalar(size), up.multiplyScalar(size), ctr, ao);
  }
  var k, ctr;
  if (kind === 'leafy') {
    trunk([V(0, 0, 0), V(0.05, 1.0, 0), V(-0.05, 1.9, 0.04), V(0, 2.5, 0)], 0.13);
    ctr = V(0, 2.5, 0);
    for (k = 0; k < 38; k++) { var d = rndDir(), rr = 0.45 + r() * 0.55, p = V(d.x * 1.25 * rr, d.y * 0.95 * rr, d.z * 1.25 * rr).add(ctr); card(p, 0.55 + r() * 0.3, ctr, 0.55 + 0.45 * (d.y * 0.5 + 0.5)); }
  } else if (kind === 'cedar') {
    trunk([V(0, 0, 0), V(0, 1.4, 0), V(0, 2.8, 0), V(0, 4.4, 0)], 0.12);
    for (var tier = 0; tier < 8; tier++) {
      var y = 1.0 + tier * 0.45, R = 1.05 * (1 - tier / 8.5) + 0.12; ctr = V(0, y + 0.2, 0);
      for (k = 0; k < 5; k++) {
        var an = k / 5 * Math.PI * 2 + tier * 0.7 + r() * 0.4, out = V(Math.cos(an), 0, Math.sin(an)), c = out.clone().multiplyScalar(R * 0.55).add(V(0, y, 0));
        var ru = V(-out.z, 0, out.x).multiplyScalar(R * 0.62), up = out.clone().multiplyScalar(R * 0.5).add(V(0, -0.18, 0));
        quad(c, ru, up, V(0, y + 0.6, 0), 0.6 + tier * 0.05);
      }
    }
  } else { // pine: Matsu, krummer Stamm, flache Nadelpolster an den Astenden
    var tp = [V(0, 0, 0), V(0.25, 0.9, 0.05), V(0.05, 1.8, -0.1), V(0.4, 2.6, 0.05), V(0.2, 3.2, 0)]; trunk(tp, 0.14);
    var pads = [[V(0.2, 3.3, 0), 0.95], [V(-0.9, 2.5, 0.3), 0.75], [V(1.2, 2.3, -0.3), 0.8], [V(-0.4, 1.8, -0.8), 0.6], [V(0.7, 2.9, 0.7), 0.6]];
    pads.forEach(function (pd, i) {
      if (i) trunk([tp[2 + (i % 2)], pd[0]], 0.06);
      for (var j = 0; j < 5; j++) { var a2 = j / 5 * Math.PI * 2 + r(), cc = pd[0].clone().add(V(Math.cos(a2) * pd[1] * 0.35, (r() - 0.3) * 0.1, Math.sin(a2) * pd[1] * 0.35));
        var t1 = V(Math.cos(a2), 0.15 + r() * 0.2, Math.sin(a2)).normalize().multiplyScalar(pd[1] * 0.55), t2 = V(-Math.sin(a2), (r() - 0.5) * 0.2, Math.cos(a2)).normalize().multiplyScalar(pd[1] * 0.5);
        quad(cc, t1, t2, pd[0].clone().add(V(0, -0.5, 0)), 0.75 + r() * 0.25); }
    });
  }
  var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(Nn, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(UV, 2)); g.setAttribute('color', new T.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeBoundingSphere(); return g;
};
// Laubmaterial: Alpha-Test, keine Normalen-Umkehr auf der Rückseite (Krone bleibt rund beleuchtet), Wind, Durchscheinen gegen die Sonne
Board3D.prototype.foliageMat = function (kind) {
  var T = THREE, U = this.fieldU, sun = this.sun, m = new T.MeshStandardMaterial({ map: Board3D.foliageTex(kind), alphaTest: 0.5, side: T.DoubleSide, vertexColors: true, roughness: 0.9 });
  U.uSunV = U.uSunV || { value: new T.Vector3(0, 1, 0) }; U.uSunC = U.uSunC || { value: new T.Color(sun.color).multiplyScalar(sun.intensity * 0.22) };
  m.onBeforeCompile = function (sh) {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uSunV = U.uSunV; sh.uniforms.uSunC = U.uSunC;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vec3 ip = instanceMatrix[3].xyz; float sw = max(position.y - 0.8, 0.0) * 0.022;\n transformed.x += sin(uTime * 1.1 + ip.x * 0.31 + ip.z * 0.17) * sw * (1.0 + 0.4 * sin(uTime * 2.7 + position.y * 3.0));\n transformed.z += cos(uTime * 0.9 + ip.z * 0.27) * sw * 0.6;');
    sh.fragmentShader = 'uniform vec3 uSunV; uniform vec3 uSunC;\n' + sh.fragmentShader
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n float cDist = length(vViewPosition); if (cDist < 9.0 && fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.55) > (cDist - 4.0) / 5.0) discard;') // Bäume direkt vor der Kamera ausblenden (Handy hochkant: Kamera steht am Waldrand)
      .replace('#include <normal_fragment_begin>', T.ShaderChunk.normal_fragment_begin.split('normal *= faceDirection;').join(''))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float bl = pow(max(dot(normalize(-vViewPosition), uSunV), 0.0), 5.0);\n totalEmissiveRadiance += diffuseColor.rgb * uSunC * bl * (vMapUv.y > 0.13 ? 1.0 : 0.0);');
  };
  return m;
};
Board3D.prototype.buildField = function (hi) {
  var T = THREE, scene = this.scene, self = this, Y = this.BT, N = Board3D.noise, H = Board3D.fieldH, E = Board3D.fieldE;
  var MD = this.mood = Board3D.FIELD_MOODS[Board3D.FIELD_MOOD || this.settings.fieldMood || 'pass'] || Board3D.FIELD_MOODS.pass; Board3D.FIELD_SHAPE = MD.shape || null; Board3D.MOUNDS = (MD.mounds || Board3D.MOUNDS0).map(function (q) { return q.slice(); });
  var fogC = new T.Color(MD.fog[0] == null ? 0xb4bec4 : MD.fog[0]); scene.background = fogC.clone(); scene.fog = new T.FogExp2(fogC, MD.fog[1]);
  this.hemi.color.set(MD.hemi[0]); this.hemi.groundColor.set(MD.hemi[1]); this.hemi.intensity = MD.hemi[2];
  var sd = new T.Vector3().fromArray(MD.sun[2]); if (sd.length() < 2) sd.normalize().multiplyScalar(22);
  this.sun.color.set(MD.sun[0]); this.sun.intensity = MD.sun[1]; this.sun.position.copy(sd); this.renderer.toneMappingExposure = MD.exp;
  if (MD.hfog) { Board3D.setHeightFog({ h: [Y + MD.hfog[0], MD.hfog[1], MD.hfog[2]], glow: MD.glow, dir: MD.sun[2] }); Board3D.glowFog(scene.fog); }
  var sc = this.sun.shadow.camera; sc.left = -11; sc.right = 11; sc.top = 11; sc.bottom = -11; sc.far = 60; sc.updateProjectionMatrix(); this.sun.shadow.mapSize.set(2048, 2048);
  this.useHdr('studio_kontrast_01.hdr'); this.addCamLight(0.35);
  this.skyBackground(MD.sky, MD.skyI, function (t) {
    (self._skyCbs || []).forEach(function (f) { f(t); }); // Wasser spiegelt denselben Himmel (eine Textur statt zwei)
    // Nebelfarbe = Himmel knapp über dem Horizont in Blickrichtung (nach Tonemapping gleich hell), damit Berge im Dunst verschwimmen
    if (MD.fogS) { scene.fog.color.copy(Board3D.acesInv(MD.fogS, MD.exp)); return; }
    if (MD.fog[0] != null || !t.image) return;
    var c = document.createElement('canvas'); c.width = 256; c.height = 128; var g = c.getContext('2d'); g.drawImage(t.image, 0, 0, 256, 128);
    var d = g.getImageData(0, 60, 256, 3).data, s = [0, 0, 0], k = 0;
    for (var x = 20; x < 110; x++) for (var y = 0; y < 3; y++) { var p = (y * 256 + x) * 4; s[0] += d[p]; s[1] += d[p + 1]; s[2] += d[p + 2]; k++; }
    scene.fog.color.copy(Board3D.acesInv(s.map(function (v) { return v / k / 255 * MD.skyI; }), MD.exp));
  });
  if (this.boardMesh) this.boardMesh.visible = false; (this.boardLegs || []).forEach(function (l) { l.visible = false; });
  this.orbit.phi0 = 1.25; this.orbit.phi = 1.25; this.orbit.target.z = -1.2;
  // weiter Bildwinkel wie in Total War: Tal, Berge und Himmel im Bild, Feld bleibt gleich groß (Abstand passt sich an)
  this.camera.fov = 50; this.viewShift = 0.2;
  this.root.classList.add('b3-feld');

  // ---- Rauschtextur (Wolkenschatten, Farbflecken, Kachelbrecher) ----
  var nc = document.createElement('canvas'); nc.width = nc.height = 256; var ng = nc.getContext('2d'), id = ng.createImageData(256, 256), x, z, i, k;
  for (z = 0; z < 256; z++) for (x = 0; x < 256; x++) {
    // kachelbar: auf einem Torus abtasten
    var a1 = x / 256 * Math.PI * 2, a2 = z / 256 * Math.PI * 2, v = N(3 + Math.cos(a1) * 1.6 + Math.sin(a2) * 0.3, 3 + Math.sin(a1) * 1.6 + Math.cos(a2) * 1.6, 5);
    var w = N(9 + Math.cos(a1) * 4, 9 + Math.sin(a2) * 4 + Math.sin(a1) * 2, 3);
    i = (z * 256 + x) * 4; id.data[i] = v * 255; id.data[i + 1] = w * 255; id.data[i + 2] = 0; id.data[i + 3] = 255;
  }
  ng.putImageData(id, 0, 0); var noiseT = new T.CanvasTexture(nc); noiseT.wrapS = noiseT.wrapT = T.RepeatWrapping;
  var tG = Board3D.tex('leafy_grass', 1).map, tD = Board3D.tex('forest_ground_04', 1).map, tR = Board3D.tex('rock_face_03', 1).map;
  var U = this.fieldU = { uTime: { value: 0 }, uWet: { value: 0 }, tLand: { value: null }, uLand: { value: 0 }, uGrid: { value: 0 }, tOwn: { value: null }, uLandS: { value: 96 } }; // tLand: Landnutzung (Äcker, Wege) über 96 m, feldzug.js

  // ---- Gelände: Raster wird zur Mitte hin dichter ----
  var FW = Board3D.fieldWarp && Board3D.fieldWarp(Board3D.FIELD_SHAPE, this.mobile); // Gelände mit Hügeln im Feld braucht dort ein gleichmäßig feines Raster (feldzug.js)
  var S = FW ? FW.S : hi ? 200 : 120, geo = new T.PlaneGeometry(2, 2, S, S); geo.rotateX(-Math.PI / 2);
  var pos = geo.attributes.position, mix = new Float32Array(pos.count * 3);
  function warp(u) { return FW ? FW.f(u) : Math.sign(u) * Math.pow(Math.abs(u), 1.9) * 150; }
  for (i = 0; i < pos.count; i++) {
    x = warp(pos.getX(i)); z = warp(pos.getZ(i)); pos.setXYZ(i, x, H(x, z), z);
  }
  geo.computeVertexNormals();
  var nrm = geo.attributes.normal;
  for (i = 0; i < pos.count; i++) {
    x = pos.getX(i); z = pos.getZ(i); var e = E(x, z), slope = 1 - nrm.getY(i);
    // Erde: Spielfeld zertrampelt (mit Grasinseln), Trampelpfade zu den Lagern; Fels an steilen Hängen
    var dirt = (1 - fsmooth(0.2, 2.6, e)) * (0.55 + 0.45 * fsmooth(0.35, 0.6, N(x * 0.35, z * 0.35, 3)));
    var path = Math.max(0, 1 - Math.abs(x - Math.sin(z * 0.25) * 1.5) / 0.8) * fsmooth(4.5, 6, Math.abs(z)) * (1 - fsmooth(10, 16, Math.abs(z)));
    dirt = Math.max(dirt, path * 0.8);
    var rock = fsmooth(0.16, 0.32, slope) + fsmooth(40, 70, e) * 0.35;
    rock = Math.min(1, rock); dirt *= 1 - rock;
    mix[i * 3] = Math.max(0, 1 - dirt - rock); mix[i * 3 + 1] = dirt; mix[i * 3 + 2] = rock;
  }
  geo.setAttribute('aMix', new T.BufferAttribute(mix, 3));
  this.fieldGeo = geo;
  var gm = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  gm.onBeforeCompile = function (sh) {
    sh.uniforms.tG = { value: tG }; sh.uniforms.tD = { value: tD }; sh.uniforms.tR = { value: tR }; sh.uniforms.tN = { value: noiseT }; sh.uniforms.uTime = U.uTime; sh.uniforms.uTint = { value: new T.Vector3().fromArray(MD.tint || [1, 1, 1]) }; sh.uniforms.uSnow = { value: MD.snow || 999 }; sh.uniforms.uWet = U.uWet; sh.uniforms.tLand = U.tLand; sh.uniforms.uLand = U.uLand; sh.uniforms.uGrid = U.uGrid; sh.uniforms.tOwn = U.tOwn; sh.uniforms.uLandS = U.uLandS;
    sh.vertexShader = 'attribute vec3 aMix; varying vec3 vMix; varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMix = aMix; vWp = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = 'uniform sampler2D tG, tD, tR, tN; uniform float uTime; uniform vec3 uTint; uniform float uSnow; uniform float uWet; uniform sampler2D tLand; uniform float uLand; uniform float uGrid; uniform sampler2D tOwn; uniform float uLandS; varying vec3 vMix; varying vec3 vWp;\n' + sh.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, mix(0.45, 0.12, wd), uWet * (1.0 - wr));').replace('#include <map_fragment>', [
      'vec2 wp = vWp.xz; vec4 nz = texture2D(tN, wp * 0.013); float n2 = texture2D(tN, wp * 0.09 + 0.31).r;',
      'vec3 g = mix(texture2D(tG, wp * 0.31).rgb, texture2D(tG, wp * 0.067 + 0.4).rgb, 0.5);',
      'g *= mix(vec3(0.56, 0.74, 0.4), vec3(0.98, 0.92, 0.6), smoothstep(0.35, 0.85, nz.r));', // frisch / trocken
      'vec3 d = mix(texture2D(tD, wp * 0.42).rgb, texture2D(tD, wp * 0.11 + 0.2).rgb, 0.4) * vec3(1.05, 0.98, 0.88);',
      'vec3 r = texture2D(tR, wp * 0.09).rgb * mix(0.6, 1.25, texture2D(tR, wp * 0.017 + 0.5).g) * mix(0.65, 1.1, smoothstep(0.3, 0.7, nz.g)) * vec3(0.95, 0.95, 1.0);',
      'float wd = smoothstep(0.0, 1.0, clamp(vMix.y + (n2 - 0.5) * 0.7, 0.0, 1.0)), wr = smoothstep(0.2, 0.8, vMix.z + (nz.g - 0.5) * 0.4);',
      'vec3 col = mix(mix(g, d, wd), r, wr);',
      'float sn = smoothstep(uSnow, uSnow + 5.0, vWp.y + (nz.r - 0.5) * 8.0) * (1.0 - smoothstep(0.55, 0.95, vMix.z + (n2 - 0.5) * 0.3)); col = mix(col, vec3(0.92, 0.94, 1.0), sn);',
      'if (uLand > 0.0) { vec4 ld = texture2D(tLand, wp / uLandS + 0.5); col = mix(col, ld.rgb * mix(0.85, 1.12, n2), ld.a * uLand); }',
      'if (uGrid > 0.0) { vec2 gf = abs(fract(wp + 0.5) - 0.5), ga = abs(wp); float gin = 1.0 - smoothstep(4.5, 4.56, max(ga.x, ga.y)), gd = 0.5 - max(gf.x, gf.y);', // Raster als ausgetretener Pfad im Gras
      '  gd = max(ga.x, ga.y) > 4.46 ? abs(max(ga.x, ga.y) - 4.5) : gd; float gl = (1.0 - smoothstep(0.02, 0.07, gd + (n2 - 0.5) * 0.03)) * gin * uGrid;',
      '  col = mix(col, d * vec3(0.78, 0.72, 0.62), gl * 0.75);',
      '  vec4 ow = texture2D(tOwn, (floor(wp + 4.5) + 0.5) / 9.0); col = mix(col, ow.rgb, ow.a * gin * (0.07 + 0.5 * (1.0 - smoothstep(0.03, 0.15, gd)))); }',  // Gebiet: Rand in Besitzerfarbe (feldherr.js)
      'float cl = smoothstep(0.42, 0.66, texture2D(tN, wp * 0.0065 + uTime * vec2(0.0045, 0.0022)).r);', // Wolkenschatten ziehen übers Land
      'col *= mix(1.0, 0.7, cl);',
      'diffuseColor.rgb *= col * uTint * (1.0 - uWet * 0.3);'].join('\n')); // nass = dunkler, Erde glänzt wie Pfützen (fieldfx.js)
  };
  var ground = new T.Mesh(geo, gm); ground.position.y = Y - 0.004; ground.receiveShadow = true; scene.add(ground);

  this.paddies = MD.shape === 'tal' ? Board3D.paddyCells() : null;
  // ---- Raster: leise, beim Auswählen deutlicher ----
  var gc = document.createElement('canvas'); gc.width = gc.height = 1024; var gg = gc.getContext('2d'), q = 1024 / 9;
  gg.strokeStyle = 'rgba(40,30,16,1)'; gg.lineWidth = 3; gg.setLineDash([14, 12]);
  for (k = 1; k < 9; k++) { gg.beginPath(); gg.moveTo(k * q, 0); gg.lineTo(k * q, 1024); gg.stroke(); gg.beginPath(); gg.moveTo(0, k * q); gg.lineTo(1024, k * q); gg.stroke(); }
  gg.lineWidth = 4; gg.strokeRect(2, 2, 1020, 1020);
  var gt = new T.CanvasTexture(gc); gt.anisotropy = 8;
  var grid = new T.Mesh(new T.PlaneGeometry(9, 9), new T.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0.3, depthWrite: false })); grid.rotation.x = -Math.PI / 2; grid.position.y = Y + 0.003; scene.add(grid);
  this.fieldGrid = grid;

  // ---- Grasbüschel (Instanzen, wiegen im Wind) ----
  if (hi) {
    var bl = [], cols = [], nb = 9;
    for (k = 0; k < nb; k++) {
      var an = k / nb * Math.PI * 2 + Math.random(), rr = 0.02 + Math.random() * 0.05, bx = Math.cos(an) * rr, bz = Math.sin(an) * rr, ww = 0.02 + Math.random() * 0.016, hh = 0.5 + Math.random() * 0.6, lean = 0.15 + Math.random() * 0.25, ox = Math.cos(an + 1.6) * ww, oz = Math.sin(an + 1.6) * ww;
      bl.push(bx - ox, 0, bz - oz, bx + ox, 0, bz + oz, bx + Math.cos(an) * lean * hh, hh, bz + Math.sin(an) * lean * hh);
      cols.push(0.16, 0.22, 0.07, 0.16, 0.22, 0.07, 0.62, 0.66, 0.3);
    }
    var bg = new T.BufferGeometry(); bg.setAttribute('position', new T.Float32BufferAttribute(bl, 3)); bg.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    var nn = []; for (k = 0; k < bl.length / 3; k++) nn.push(0, 1, 0); bg.setAttribute('normal', new T.Float32BufferAttribute(nn, 3));
    var bm = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: T.DoubleSide });
    bm.onBeforeCompile = function (sh) {
      sh.uniforms.uTime = U.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vec3 ip = instanceMatrix[3].xyz; float hw = position.y * position.y;\n float wv = sin(uTime * 1.6 + ip.x * 0.45 + ip.z * 0.3) * 0.6 + sin(uTime * 3.1 + ip.x * 1.7) * 0.25;\n transformed.x += wv * 0.18 * hw; transformed.z += wv * 0.08 * hw;');
    };
    var pc = this.paddies || [], cnt = this.mobile ? 22000 : 60000, im = new T.InstancedMesh(bg, bm, cnt + pc.length * 16), m4 = new T.Matrix4(), qq = new T.Quaternion(), up = new T.Vector3(0, 1, 0), vv = new T.Vector3(), ss = new T.Vector3(), cc = new T.Color(), n = 0, tries = 0;
    while (n < cnt && tries++ < cnt * 4) {
      // dichter nahe dem Feld, wo die Kamera ist
      var rad = 2 + Math.pow(Math.random(), 1.7) * 40, ang = Math.random() * Math.PI * 2; x = Math.cos(ang) * rad * 1.1; z = Math.sin(ang) * rad;
      var e2 = E(x, z), gw = 1 - (1 - fsmooth(0.2, 2.6, e2)) * (0.55 + 0.45 * fsmooth(0.35, 0.6, N(x * 0.35, z * 0.35, 3)));
      if (Math.random() > gw * gw) continue;
      if (pc.length && x < -10 && x > -32 && pc.some(function (c) { return Math.abs(x - c[0]) < 0.8 && Math.abs(z - c[2]) < 0.8; })) continue; // Reisfeld
      var sz = (0.09 + Math.random() * 0.1) * (1 + fsmooth(4, 25, e2) * 2) * (0.6 + N(x * 0.2, z * 0.2, 2) * 0.9);
      qq.setFromAxisAngle(up, Math.random() * 6.28); m4.compose(vv.set(x, Y + H(x, z) - 0.01, z), qq, ss.set(sz * 1.4, sz, sz * 1.4)); im.setMatrixAt(n, m4);
      var dry = N(x * 0.06, z * 0.06, 3); cc.setRGB(0.6 + dry * 0.45, 0.8 + dry * 0.15, 0.5 + Math.random() * 0.15);
      if (MD.flowers && e2 > 3 && Math.random() < 0.05 * fsmooth(0.4, 0.7, N(x * 0.15 + 7, z * 0.15, 2)) * 4) cc.set(MD.flowers[Math.floor(Math.random() * MD.flowers.length)]); // Blumenwiesen in Flecken
      im.setColorAt(n, cc); n++;
    }
    pc.forEach(function (c) { for (var a = 0; a < 4; a++) for (var b2 = 0; b2 < 4; b2++) { var sx = c[0] - 0.55 + a * 0.37, sz2 = c[2] - 0.55 + b2 * 0.37, s2 = 0.07 + Math.random() * 0.03; // Reissetzlinge in Reihen
      qq.setFromAxisAngle(up, Math.random() * 6.28); m4.compose(vv.set(sx, Y + c[1] - 0.02, sz2), qq, ss.set(s2 * 1.2, s2 * 1.3, s2 * 1.2)); im.setMatrixAt(n, m4); im.setColorAt(n, cc.setRGB(0.75, 1.15, 0.45)); n++; } });
    im.count = n; im.receiveShadow = true; im.raycast = function () { }; scene.add(im);
  }

  // ---- Wälder auf den Hügeln: Karten-Bäume als Instanzen, je Art eine (nahe mit Schatten, ferne ohne) ----
  function jit(g, a) { var p = g.attributes.position; for (var j = 0; j < p.count; j++) p.setXYZ(j, p.getX(j) + (Math.random() - .5) * a, p.getY(j) + (Math.random() - .5) * a, p.getZ(j) + (Math.random() - .5) * a); return g; }
  // Zedern (Sugi), Laubbäume (je Stimmung Kirsche/Ahorn/Eiche) und Kiefern (Matsu); Farbe je Baum aus der Palette der Stimmung
  var defPal = [[0xffffff, 0xe8f0e0], [0x5e8c3e, 0x6c9a44, 0x557f38, 0x7aa64e], [0xffffff, 0xeef2e4]], mf = this.mobile ? 0.6 : 1;
  [['cedar', (hi ? 1150 : 600) * mf], ['leafy', (hi ? 620 : 300) * mf], ['pine', (hi ? 260 : 140) * mf]].forEach(function (tt, ti) {
    var cnt = Math.round(tt[1]), geo = Board3D.cardTree(tt[0]), mat = self.foliageMat(tt[0]), ti2 = new T.InstancedMesh(geo, mat, cnt), near = new T.InstancedMesh(geo, mat, cnt), nn = 0, m4 = new T.Matrix4(), qq = new T.Quaternion(), up = new T.Vector3(0, 1, 0), n = 0, tries = 0;
    var pal = (MD.trees || [])[ti] || defPal[ti], col = new T.Color();
    while (n < cnt && tries++ < cnt * 30) {
      var x = (Math.random() - .5) * 150, z = (Math.random() - .5) * 150, e = E(x, z);
      if (e < 7.5 || (Math.abs(x) < 9 && Math.abs(z) < 16)) continue;                 // Feld, Lager und Kamerablick frei
      if (Board3D.MOUNDS.some(function (q) { return Math.hypot(x - q[0], z - q[1]) < q[2] * 0.75; }) || (x > 12.5 && x < 25 && z > -22 && z < -9.5) || (x > -17 && x < 9 && z > -30 && z < -12)) continue; // Bauwerke und Dorf frei
      var dens = ti === 2 ? fsmooth(0.56, 0.66, N(x * 0.05 + 11, z * 0.05 - 4, 3)) * (1 - fsmooth(30, 50, e)) : fsmooth(0.5, 0.62, N(x * 0.04 + ti * 3, z * 0.04, 3)) * (1 - fsmooth(45, 70, e)); // Waldstücke, Kiefern eher einzeln auf Kuppen
      if (Math.random() > dens) continue;
      if (MD.shape === 'tal' && (Math.abs(x - Board3D.riverX(z)) < 4.5 || (x < -10 && x > -32 && Math.abs(z + 2) < 18))) continue; // Fluss und Reisterrassen frei
      var y = H(x, z), s = (0.8 + Math.random() * 0.6) * (ti === 2 ? 1.1 : 1);
      if (Math.abs(H(x + 1, z) - y) + Math.abs(H(x, z + 1) - y) > 1.6) continue;  // keine Bäume an Steilwänden (Pass)
      qq.setFromAxisAngle(up, Math.random() * 6.28); m4.compose(new T.Vector3(x, Y + y - 0.1, z), qq, new T.Vector3(s, s * (0.9 + Math.random() * 0.3), s));
      col.set(pal[Math.floor(Math.random() * pal.length)]).multiplyScalar(0.9 + Math.random() * 0.2);
      // nur Bäume im Schattenbereich der Sonne (±13 um das Feld) werfen Schatten, sonst zeichnet der Schattenpass den ganzen Wald
      if (Math.abs(x) < 15 && Math.abs(z) < 15) { near.setMatrixAt(nn, m4); near.setColorAt(nn++, col); } else { ti2.setMatrixAt(n, m4); ti2.setColorAt(n++, col); }
    }
    [[ti2, n, false], [near, nn, hi]].forEach(function (q) { var o = q[0]; o.count = q[1]; o.castShadow = q[2]; o.receiveShadow = true; o.raycast = function () { }; if (q[1]) { o.computeBoundingSphere(); scene.add(o); } });
  });
  // einzelne Bäume und Felsen am Feldrand
  var c0 = scene.children.length, rockM = this.texMat('mossy_rock', 1, 0x8a8a7a), rnd = Board3D.rnd(11), geoR = jit(new T.IcosahedronGeometry(1, 2), 0.18); geoR.computeVertexNormals();
  for (i = 0; i < 26; i++) {
    var a = rnd() * Math.PI * 2, d = 7.5 + rnd() * 14, rx = Math.cos(a) * d * 1.1, rz = Math.sin(a) * d;
    if (Math.abs(rx) < 9 && Math.abs(rz) < 14) continue;
    var s = 0.12 + rnd() * 0.45, rk = new T.Mesh(geoR, rockM); rk.scale.set(s * (1 + rnd()), s * (0.45 + rnd() * 0.4), s * (1 + rnd())); rk.rotation.y = rnd() * 6; rk.position.set(rx, Y + H(rx, rz) - s * 0.15, rz); rk.castShadow = hi; rk.receiveShadow = true; scene.add(rk);
  }

  // ---- Feldlager beider Armeen: Vorhangwände mit Wappen, Zelte, Feuer, Speerständer, Nobori ----
  this.campFires = [];
  [0, 1].forEach(function (col) { self.buildCamp(col, hi); });
  if (this.theme.id === 'feudal') this.buildLandmarks(hi);
  this.buildMood(hi);
  var skip = new Set(); this.campFires.forEach(function (f) { skip.add(f.fl); }); (this.nobori || []).forEach(function (n) { skip.add(n.m); });
  this.mergeStatic(scene.children.slice(c0), skip);
  if (this.initWeather) this.initWeather(hi); // Wetter, Brände (fieldfx.js)
};
// Starre Einzelteile von Lager, Felsen und Bauwerken (~650 Meshes) je Material und Schattenart zu einem Mesh zusammenfassen: spart Draw Calls.
// Ausgenommen: Animiertes (skip), Durchsichtiges, Instanzen, Sprites; später geladene GLB-Modelle bleiben einzeln.
Board3D.prototype.mergeStatic = function (roots, skip) {
  var T = THREE, groups = {}, scene = this.scene;
  scene.updateMatrixWorld(true);
  roots.forEach(function (r) { r.traverse(function (o) {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o) || Array.isArray(o.material) || o.material.transparent || o.material.vertexColors || o.geometry.morphAttributes.position) return;
    var k = o.material.uuid + (o.castShadow ? 's' : '') + (o.receiveShadow ? 'r' : '');
    (groups[k] = groups[k] || { m: o.material, cs: o.castShadow, rs: o.receiveShadow, list: [] }).list.push(o);
  }); });
  Object.keys(groups).forEach(function (k) {
    var g = groups[k]; if (g.list.length < 2) return;
    var geos = g.list.map(function (o) { var gg = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); gg.applyMatrix4(o.matrixWorld); return gg; }), n = 0;
    geos.forEach(function (gg) { n += gg.attributes.position.count; });
    var P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), U = new Float32Array(n * 2), off = 0;
    geos.forEach(function (gg) { var a = gg.attributes; P.set(a.position.array, off * 3); if (a.normal) Nn.set(a.normal.array, off * 3); if (a.uv) U.set(a.uv.array, off * 2); off += a.position.count; gg.dispose(); });
    var mg = new T.BufferGeometry(); mg.setAttribute('position', new T.BufferAttribute(P, 3)); mg.setAttribute('normal', new T.BufferAttribute(Nn, 3)); mg.setAttribute('uv', new T.BufferAttribute(U, 2)); mg.computeBoundingSphere();
    var mesh = new T.Mesh(mg, g.m); mesh.castShadow = g.cs; mesh.receiveShadow = g.rs; mesh.matrixAutoUpdate = false; mesh.raycast = function () { }; scene.add(mesh);
    g.list.forEach(function (o) { o.parent.remove(o); });
  });
};
// Hügel mit flacher Kuppe für Bauwerke im Hintergrund: [x, z, Radius, Höhe]
Board3D.MOUNDS0 = [[-5, -37, 10, 3.4], [21, -29, 6, 2.6], [-24, 26, 7, 2.8], [16, 31, 6, 1.8]]; Board3D.MOUNDS = Board3D.MOUNDS0;
// Bauwerke im Hintergrund: Burg auf dem Hügel hinter Gote, Pagode, Dorf mit brennendem Hof, Tempeltor und Torii hinter Sente, Wachtürme an den Lagern
Board3D.prototype.buildLandmarks = function (hi) {
  var T = THREE, scene = this.scene, self = this, Y = this.BT, H = Board3D.fieldH;
  var plaster = new T.MeshStandardMaterial({ color: 0xeeeae0, roughness: 0.85 }), tile = new T.MeshStandardMaterial({ color: 0x3b414a, roughness: 0.55, metalness: 0.2 });
  var darkWood = new T.MeshStandardMaterial({ color: 0x2e2620, roughness: 0.8 }), wood = new T.MeshStandardMaterial({ color: 0x6a5038, roughness: 0.85 }), gold = this.statueMat(0, null, false);
  var st = Board3D.tex('japanese_stone_wall', [2, 1]), stone = new T.MeshStandardMaterial({ map: st.map, normalMap: st.normalMap, color: 0xb0aca4, roughness: 0.95 });
  var thatch = new T.MeshStandardMaterial({ color: 0x8a7048, roughness: 1, flatShading: true });
  // Fensterreihe (schwarze Schlitze, dunkle Holzbänder) als Textur für die Burgwände
  var wc = document.createElement('canvas'); wc.width = 256; wc.height = 64; var wg = wc.getContext('2d');
  wg.fillStyle = '#eeeae0'; wg.fillRect(0, 0, 256, 64); wg.fillStyle = '#2e2620'; wg.fillRect(0, 54, 256, 10); wg.fillRect(0, 0, 256, 4);
  for (var x = 14; x < 256; x += 40) { wg.fillRect(x, 20, 16, 20); wg.fillStyle = '#4a3a2a'; wg.fillRect(x + 7, 20, 2, 20); wg.fillStyle = '#2e2620'; }
  var winT = new T.CanvasTexture(wc); winT.colorSpace = T.SRGBColorSpace; winT.wrapS = T.RepeatWrapping;
  function wallMat(rep) { var t = winT.clone(); t.needsUpdate = true; t.repeat.set(rep, 1); return new T.MeshStandardMaterial({ map: t, roughness: 0.85 }); }
  function mesh(geo, mat, x, y, z, ry) { var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (ry) m.rotation.y = ry; m.castShadow = hi; m.receiveShadow = true; return m; }
  // geschwungenes Walmdach: Pyramidenstumpf + breite Traufe
  function roof(g, w, d, y, h) {
    var r = new T.CylinderGeometry(0.2, 0.72, 1, 4, 1); r.rotateY(Math.PI / 4); r.scale(w, h, d);
    g.add(mesh(r, tile, 0, y + h / 2, 0));
    var eave = new T.CylinderGeometry(0.72, 0.8, 1, 4, 1, true); eave.rotateY(Math.PI / 4); eave.scale(w, 0.06, d); g.add(mesh(eave, tile, 0, y + 0.02, 0));
  }
  function place(g, x, z, ry, s) { g.position.set(x, Y + H(x, z) - 0.05, z); g.rotation.y = ry || 0; if (s) g.scale.setScalar(s); scene.add(g); return g; }

  // ---- Burg (Tenshu) mit Mauerring und Ecktürmen ----
  function keep(tiers, w0) {
    var g = new T.Group(), y = 0;
    var base = new T.CylinderGeometry(0.62, 0.78, 1, 4); base.rotateY(Math.PI / 4); base.scale(w0 * 1.15, 1.3, w0 * 1.0); g.add(mesh(base, stone, 0, 0.65, 0)); y = 1.3;
    for (var i = 0; i < tiers; i++) {
      var w = w0 * (1 - i * 0.2), d = w * 0.82, h = i === tiers - 1 ? 0.75 : 0.62;
      g.add(mesh(new T.BoxGeometry(w * 0.86, h, d * 0.86), wallMat(Math.max(1, Math.round(w))), 0, y + h / 2, 0)); y += h;
      roof(g, w * 1.12, d * 1.12, y - 0.05, i === tiers - 1 ? 0.75 : 0.32); y += i === tiers - 1 ? 0 : 0.22;
      // Ziergiebel (Chidori-hafu) an der Front
      if (i < tiers - 1) { var gb = new T.ConeGeometry(0.35, 0.3, 3); gb.rotateY(Math.PI / 2); g.add(mesh(gb, tile, 0, y + 0.04, d * 0.5)); }
    }
    // goldene Shachihoko auf dem First
    [-1, 1].forEach(function (sx) { var sh = mesh(new T.ConeGeometry(0.06, 0.22, 6), gold, sx * w0 * 0.18, y + 0.72, 0); sh.rotation.z = sx * 0.4; g.add(sh); });
    return g;
  }
  var cx = Board3D.MOUNDS[0][0], cz = Board3D.MOUNDS[0][1], castle = new T.Group();
  castle.add(keep(4, 3.2));
  // Mauerring (weiß mit Ziegelkappe) und zwei Ecktürme (Yagura)
  var ringW = 9, ringD = 7;
  [[0, ringD / 2, ringW, 0], [0, -ringD / 2, ringW, 0], [ringW / 2, 0, ringD, Math.PI / 2], [-ringW / 2, 0, ringD, Math.PI / 2]].forEach(function (wl, j) {
    var len = wl[2] - (j === 0 ? 1.4 : 0);
    var wall = mesh(new T.BoxGeometry(len, 0.55, 0.22), plaster, wl[0] + (j === 0 ? 0.7 : 0), 0.28, wl[1], wl[3]); castle.add(wall);
    var cap = new T.CylinderGeometry(0.05, 0.3, 0.16, 4, 1); cap.rotateY(Math.PI / 4); cap.scale(len * 1.4, 1, 1.1); var c = mesh(cap, tile, wl[0] + (j === 0 ? 0.7 : 0), 0.62, wl[1], wl[3]); castle.add(c);
  });
  [[ringW / 2, ringD / 2], [-ringW / 2, ringD / 2], [ringW / 2, -ringD / 2]].forEach(function (p) { var yg = keep(2, 1.3); yg.position.set(p[0], -0.2, p[1]); castle.add(yg); });
  // Tor
  var gate = new T.Group(); gate.add(mesh(new T.BoxGeometry(1.2, 0.7, 0.4), darkWood, 0, 0.35, 0)); roof(gate, 1.7, 0.8, 0.7, 0.28); gate.position.set(-ringW / 2 + 0.7, 0, ringD / 2); castle.add(gate);
  place(castle, cx, cz, 0.25, (this.mood && this.mood.castleS) || 1.35);
  // Banner auf der Burgmauer (Gote-Farben)
  for (var b = 0; b < 6; b++) { var nb = new T.Group(); nb.add(mesh(new T.CylinderGeometry(0.02, 0.02, 1.4, 5), darkWood, 0, 0.7, 0)); nb.add(mesh(new T.PlaneGeometry(0.25, 0.8), new T.MeshStandardMaterial({ color: 0xf1ede4, side: T.DoubleSide }), 0.13, 0.95, 0)); nb.position.set(-ringW / 2 + 1 + b * 1.5, 0.6, ringD / 2 + 0.05); castle.add(nb); }

  // ---- Dorf am Feldrand: Bauernhäuser mit Strohdach, eins brennt ----
  function minka(burn) {
    var g = new T.Group(), w = 1.1 + Math.random() * 0.5, d = 0.8 + Math.random() * 0.3;
    g.add(mesh(new T.BoxGeometry(w, 0.5, d), darkWood, 0, 0.25, 0));
    g.add(mesh(new T.BoxGeometry(w * 0.9, 0.3, d * 1.01), plaster, 0, 0.3, 0));
    var r = new T.CylinderGeometry(0.12, 0.72, 1, 4, 1); r.rotateY(Math.PI / 4); r.scale(w * 1.25, 0.75, d * 1.35); var rm = mesh(r, burn ? new T.MeshStandardMaterial({ color: 0x2a2018, roughness: 1, flatShading: true }) : thatch, 0, 0.5 + 0.37, 0); g.add(rm);
    return g;
  }
  var vill = [[17, -14], [19, -16.2], [16.4, -17.4], [20.6, -13.2], [18.6, -19], [22.2, -17]];
  vill.forEach(function (p, i) {
    var burn = i === 1, g = place(minka(burn), p[0], p[1], Math.random() * 0.6 - 0.3 + (i % 2) * 1.57);
    if (burn) {
      var fx = p[0], fz = p[1], fy = Y + H(fx, fz) + 0.8, pl = new T.PointLight(0xff7020, 4, 8, 2); pl.position.set(fx, fy + 0.4, fz); scene.add(pl); pl.userData.base = 4; self.lanterns.push(pl);
      var flames = []; for (var k = 0; k < 5; k++) { var fl = new T.Mesh(new T.ConeGeometry(0.16, 0.6, 6), new T.MeshBasicMaterial({ color: k % 2 ? 0xffa030 : 0xff6a10, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false })); fl.position.set(fx + (k - 2) * 0.2, fy + 0.15, fz + (Math.random() - .5) * 0.3); scene.add(fl); flames.push(fl); }
      var puffs = []; for (var j = 0; j < 12; j++) { var sp = new T.Sprite(self.smokeMat()); sp.material.color.set(0x3a3632); sp.userData.t = j / 12; scene.add(sp); puffs.push(sp); }
      self.campFires.push({ x: fx, y: fy + 0.3, z: fz, fl: flames[2], flames: flames, puffs: puffs, big: 3.2, rise: 9 });
    }
  });
  // Felder (Reis/Gemüse) beim Dorf als Streifen
  for (var f = 0; f < 4; f++) { var pa = new T.Mesh(new T.PlaneGeometry(2.6, 0.9), new T.MeshStandardMaterial({ color: f % 2 ? 0x6f7a3a : 0x5a5030, roughness: 1 })); pa.rotation.x = -Math.PI / 2; var px = 14.5, pz = -11 - f * 0.95; pa.position.set(px, Y + H(px, pz) + 0.01, pz); pa.receiveShadow = true; scene.add(pa); }

  // ---- hinter Sente: Tempel mit Pagode, Torii am Hügel ----
  var tx = Board3D.MOUNDS[3][0], tz = Board3D.MOUNDS[3][1], temple = new T.Group();
  temple.add(mesh(new T.BoxGeometry(2.4, 0.2, 1.8), stone, 0, 0.1, 0)); temple.add(mesh(new T.BoxGeometry(2, 0.7, 1.4), new T.MeshStandardMaterial({ color: 0x8a2a1e, roughness: 0.7 }), 0, 0.55, 0));
  roof(temple, 3, 2.2, 0.9, 0.7); place(temple, tx, tz, Math.PI + 0.3);
  // eigener Fallback, wenn die Modelle (Pagode, Torii) nicht laden
  if (window.Models) Models.ready(function (M) {
    function put(name, size, x, z, ry) { return M.get('models/env/' + name + '.glb', size, { by: 'height' }).then(function (g) { if (!self.alive) return; g.position.set(x, Y + H(x, z) - 0.05, z); g.rotation.y = ry || 0; g.traverse(function (o) { if (o.isMesh) { o.castShadow = hi; o.receiveShadow = true; } }); scene.add(g); }).catch(function () { }); }
    put('pagoda', 7.5, Board3D.MOUNDS[1][0], Board3D.MOUNDS[1][1], 0.6);
    put('pagoda', 6, tx + 3.2, tz + 1.5, 2.1);
    var m2 = Board3D.MOUNDS[2]; put('torii', 2.4, m2[0] + 2, m2[1] - 3, 0.9);
  });

  // ---- Wachtürme (Yagura aus Holz) an den Lagern ----
  [[-11, 9.5], [11.5, 9], [-11.5, -9.5], [11, -9]].forEach(function (p) {
    var g = new T.Group(), hgt = 1.5;
    [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].forEach(function (q) { var l = mesh(new T.CylinderGeometry(0.025, 0.03, hgt, 5), wood, q[0], hgt / 2, q[1]); g.add(l); });
    [0.45, 0.95].forEach(function (yy) { [[0, -0.22, 0], [0, 0.22, 0], [-0.22, 0, 1], [0.22, 0, 1]].forEach(function (q) { var br = mesh(new T.BoxGeometry(0.5, 0.025, 0.025), wood, q[0], yy, q[1], q[2] ? Math.PI / 2 : 0); g.add(br); }); });
    g.add(mesh(new T.BoxGeometry(0.6, 0.05, 0.6), wood, 0, hgt, 0)); g.add(mesh(new T.BoxGeometry(0.6, 0.18, 0.6), darkWood, 0, hgt + 0.11, 0));
    roof(g, 0.8, 0.8, hgt + 0.42, 0.25);
    [[0, 0.32], [0, -0.32], [0.32, 0], [-0.32, 0]].forEach(function (q) { g.add(mesh(new T.CylinderGeometry(0.012, 0.012, 0.25, 4), wood, q[0], hgt + 0.32, q[1])); });
    place(g, p[0], p[1], Math.random());
  });
};

// Feldlager: Jinmaku (Vorhang-Umfriedung mit Mon), Zelte in Reihen, Lagerfeuer mit Rauch, Speerständer, Nobori-Reihe
Board3D.prototype.buildCamp = function (col, hi) {
  var T = THREE, scene = this.scene, self = this, Y = this.BT, H = Board3D.fieldH, zs = col === 0 ? 1 : -1;
  var dark = col === 0, cloth = dark ? '#16120e' : '#efe9dc', ink = dark ? '#d9b45a' : '#1a1410';
  // Vorhangstoff mit Streifen und Wappen (Mon) als Textur
  var c = document.createElement('canvas'); c.width = 512; c.height = 128; var g = c.getContext('2d');
  g.fillStyle = cloth; g.fillRect(0, 0, 512, 128); g.fillStyle = dark ? '#2a221a' : '#d8d0c0'; for (var s = 0; s < 512; s += 64) g.fillRect(s, 0, 3, 128);
  g.strokeStyle = ink; g.lineWidth = 6; [[128, 64], [384, 64]].forEach(function (m) { g.beginPath(); g.arc(m[0], m[1], 36, 0, 7); g.stroke(); g.beginPath(); g.arc(m[0], m[1], 14, 0, 7); g.fillStyle = ink; g.fill(); for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3; g.beginPath(); g.arc(m[0] + Math.cos(a) * 24, m[1] + Math.sin(a) * 24, 7, 0, 7); g.fill(); } });
  var tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.wrapS = T.RepeatWrapping; tx.anisotropy = 4;
  var curM = new T.MeshStandardMaterial({ map: tx, side: T.DoubleSide, roughness: 0.85 }), poleM = this._poleMat || (this._poleMat = new T.MeshStandardMaterial({ color: 0x1a1010, roughness: 0.5 }));
  var tentM = new T.MeshStandardMaterial({ color: dark ? 0x2a241e : 0xe6dfd0, roughness: 0.9, side: T.DoubleSide }), woodM = new T.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 });
  function at(o, x, z, ry) { o.position.set(x, Y + H(x, z), z); o.rotation.y = ry || 0; o.traverse(function (m) { if (m.isMesh) { m.castShadow = hi; m.receiveShadow = true; } }); scene.add(o); return o; }
  // Umfriedung (U-Form, offen zum Feld) hinter den eigenen Linien
  function maku(cx, cz, w, d) {
    var grp = new T.Group(), hgt = 0.34;
    [[0, -d / 2 * zs, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]].forEach(function (sg, j) {
      var pl = new T.Mesh(new T.PlaneGeometry(sg[2], hgt, 8, 1), curM.clone()); pl.material.map = tx.clone(); pl.material.map.needsUpdate = true; pl.material.map.repeat.set(sg[2] / 1.4, 1);
      var pp = pl.geometry.attributes.position; for (var k = 0; k < pp.count; k++) pp.setZ(k, Math.sin(pp.getX(k) * 9) * 0.025); pl.geometry.computeVertexNormals();
      pl.position.set(sg[0], hgt / 2 + 0.06, sg[1]); pl.rotation.y = sg[3]; grp.add(pl);
      for (var q = -sg[2] / 2; q <= sg[2] / 2 + 0.01; q += sg[2] / Math.round(sg[2] / 0.45)) { var po = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.48, 5), poleM); var ca = Math.cos(sg[3]), sa = Math.sin(sg[3]); po.position.set(sg[0] + q * ca, 0.24, sg[1] - q * sa); grp.add(po); }
    });
    // Feldherrnstuhl und Kommando-Fahne in der Mitte
    var st = new T.Mesh(new T.BoxGeometry(0.12, 0.08, 0.1), woodM); st.position.set(0, 0.04, -d * 0.2 * zs); grp.add(st);
    return at(grp, cx, cz);
  }
  maku(0, 12.2 * zs, 3.6, 1.6);
  // Zelte (Satteldach) in Reihen links und rechts
  var tsh = new T.Shape(); tsh.moveTo(-0.3, 0); tsh.lineTo(0, 0.34); tsh.lineTo(0.3, 0); tsh.lineTo(-0.3, 0);
  var tg = new T.ExtrudeGeometry(tsh, { depth: 0.62, bevelEnabled: false }); tg.translate(0, 0, -0.31);
  for (var side = -1; side <= 1; side += 2) for (var r = 0; r < 2; r++) for (var k = 0; k < 4; k++) {
    var x = side * (7.2 + k * 1.0 + r * 0.4), z = (7.4 + r * 1.3 + (k % 2) * 0.2) * zs, t = new T.Group(), body = new T.Mesh(tg, tentM); t.add(body);
    var ridge = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.72, 4), poleM); ridge.rotation.x = Math.PI / 2; ridge.position.y = 0.345; t.add(ridge);
    var door = new T.Mesh(new T.PlaneGeometry(0.14, 0.2), new T.MeshBasicMaterial({ color: 0x0c0906 })); door.position.set(0, 0.1, 0.312 * zs); if (zs < 0) door.rotation.y = Math.PI; t.add(door);
    at(t, x, z, (Math.random() - .5) * 0.25);
  }
  // Lagerfeuer mit Glut, Licht und Rauch
  [[-8.2, 9.8], [8.4, 9.6], [0, 13.6]].forEach(function (p) {
    var x = p[0], z = p[1] * zs, f = new T.Group();
    for (var j = 0; j < 5; j++) { var lg = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 0.22, 5), woodM); lg.rotation.set(Math.PI / 2 - 0.5, j * 1.26, 0); lg.position.y = 0.04; f.add(lg); }
    var fl = new T.Mesh(new T.ConeGeometry(0.06, 0.18, 6), new T.MeshBasicMaterial({ color: 0xffa040 })); fl.position.y = 0.1; f.add(fl);
    at(f, x, z); fl.castShadow = false;
    // Punktlichter kosten in jedem Pixel: nur das mittlere Lagerfeuer bekommt eins (Handy keins)
    if (p[0] === 0 && !self.mobile) { var pl = new T.PointLight(0xff9040, 1.6, 4, 2); pl.position.set(x, Y + H(x, z) + 0.3, z); scene.add(pl); self.lanterns.push(pl); pl.userData.base = 1.6; }
    var puffs = [];
    for (var j2 = 0; j2 < 7; j2++) { var sp2 = new T.Sprite(self.smokeMat()); sp2.userData.t = j2 / 7; scene.add(sp2); puffs.push(sp2); }
    self.campFires.push({ x: x, y: Y + H(x, z) + 0.15, z: z, fl: fl, puffs: puffs });
  });
  // Speerständer
  for (var j = 0; j < 4; j++) {
    var rx = (j < 2 ? -1 : 1) * (6.6 + (j % 2) * 3.4), rz = 8.8 * zs, rack = new T.Group();
    for (var sp = 0; sp < 7; sp++) { var spr = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.75, 4), poleM); spr.position.set((sp - 3) * 0.06, 0.36, 0); spr.rotation.z = (sp - 3) * 0.04; rack.add(spr); }
    var bar = new T.Mesh(new T.BoxGeometry(0.5, 0.02, 0.02), woodM); bar.position.y = 0.3; rack.add(bar);
    at(rack, rx, rz, (Math.random() - .5) * 0.4);
  }
  // Nobori-Reihen am Lagerrand (wehen)
  var nm = new T.MeshStandardMaterial({ color: dark ? 0x16130f : 0xf1ede4, side: T.DoubleSide, roughness: 0.8 });
  this.nobori = this.nobori || [];
  for (var n = 0; n < 10; n++) {
    var nx = (n < 5 ? -1 : 1) * (5.9 + (n % 5) * 0.75), nz = (6.6 + (n % 2) * 0.25) * zs, nb = new T.Group(), pole = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 1.0, 5), poleM); pole.position.y = 0.5; nb.add(pole);
    var clg = new T.PlaneGeometry(0.17, 0.6, 1, 6), cl = new T.Mesh(clg, nm); cl.position.set(0.09, 0.66, 0); nb.add(cl);
    at(nb, nx, nz, col === 1 ? Math.PI : 0); this.nobori.push({ m: cl, ph: Math.random() * 6 });
  }
};
// Zusätze je Stimmung: Sonnenglühen, Fluss mit Brücke (Tal), Brände und Rauchsäulen um die Burg (Belagerung)
Board3D.prototype.buildMood = function (hi) {
  var T = THREE, scene = this.scene, self = this, Y = this.BT, H = Board3D.fieldH, MD = this.mood;
  if (MD.glow) {
    // weiches Glühen um die Sonne (ohne Nebel, ganz hinten)
    var gc = document.createElement('canvas'); gc.width = gc.height = 128; var g = gc.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    var sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(gc), color: MD.glow[0], transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    var d = new T.Vector3().fromArray(MD.sun[2]).normalize(); sp.position.copy(d.multiplyScalar(320)); sp.scale.set(160, 160, 1); sp.renderOrder = -1; scene.add(sp);
  }
  if (MD.shape === 'tal') {
    // Fluss: Band entlang riverX, Wasser spiegelt den Himmel, Wellen fließen talabwärts
    var R = Board3D.riverX, P = [], I = [], UVr = [], NR = [], zz, k = 0;
    for (zz = -48; zz <= 45; zz += 1.5) { var rx = R(zz), w = 2.6; P.push(rx - w, 0, zz, rx + w, 0, zz); UVr.push(0, zz * 0.12, 1.3, zz * 0.12); NR.push(0, 1, 0, 0, 1, 0); if (k) I.push(k * 2 - 2, k * 2, k * 2 - 1, k * 2 - 1, k * 2, k * 2 + 1); k++; }
    var wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(P, 3)); wg.setAttribute('normal', new T.Float32BufferAttribute(NR, 3)); wg.setAttribute('uv', new T.Float32BufferAttribute(UVr, 2)); wg.setIndex(I);
    var wn = Board3D.waveNormal(), wm = this.waterMat = new T.MeshStandardMaterial({ color: 0x2c4450, roughness: 0.08, metalness: 0.0, envMapIntensity: 1.2, normalMap: wn, normalScale: new T.Vector2(0.35, 0.35), side: T.DoubleSide });
    var water = new T.Mesh(wg, wm); water.position.y = Y - 0.62; water.receiveShadow = true; scene.add(water);
    this.tweens.push({ forever: true, f: function (t) { wn.offset.set(Math.sin(t / 4000) * 0.02, -t * 0.00012); } });
    // Reisfelder auf den Terrassen: flache Stellen bekommen eine spiegelnde Wasserparzelle, dazwischen bleiben Dämme stehen
    var pm = new T.MeshStandardMaterial({ color: 0x46605a, roughness: 0.1, envMapIntensity: 1.1 }), cells = this.paddies || [];
    if (cells.length) {
      var pg = new T.PlaneGeometry(1.5, 1.5); pg.rotateX(-Math.PI / 2);
      var paddy = new T.InstancedMesh(pg, pm, cells.length), m4 = new T.Matrix4();
      cells.forEach(function (c, i) { m4.makeTranslation(c[0], Y + c[1], c[2]); paddy.setMatrixAt(i, m4); }); paddy.receiveShadow = true; paddy.raycast = function () { }; scene.add(paddy);
    }
    (this._skyCbs = this._skyCbs || []).push(function (t) { wm.envMap = t; pm.envMap = t; wm.needsUpdate = pm.needsUpdate = true; });
    // Bogenbrücke in Zinnoberrot über den Fluss
    var bz = 2, bx = R(bz), red = new T.MeshStandardMaterial({ color: 0xa8321e, roughness: 0.55 }), plank = new T.MeshStandardMaterial({ color: 0x5a4434, roughness: 0.9 }), br = new T.Group(), L = 7.2, seg = 14;
    for (var i = 0; i < seg; i++) {
      var u0 = i / seg - 0.5, u1 = (i + 1) / seg - 0.5, y0 = Math.cos(u0 * Math.PI) * 0.75, y1 = Math.cos(u1 * Math.PI) * 0.75, x0 = u0 * L, x1 = u1 * L, len = Math.hypot(x1 - x0, y1 - y0);
      var dk = new T.Mesh(new T.BoxGeometry(len + 0.02, 0.08, 1.1), plank); dk.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); dk.rotation.z = Math.atan2(y1 - y0, x1 - x0); br.add(dk);
      [-0.55, 0.55].forEach(function (zr) { var rl = new T.Mesh(new T.BoxGeometry(len + 0.02, 0.05, 0.05), red); rl.position.set(dk.position.x, dk.position.y + 0.42, zr); rl.rotation.z = dk.rotation.z; br.add(rl);
        if (i % 2 === 0) { var po = new T.Mesh(new T.BoxGeometry(0.07, 0.48, 0.07), red); po.position.set(x0, y0 + 0.22, zr); br.add(po); } });
    }
    [-1, 1].forEach(function (sx) { [-0.55, 0.55].forEach(function (zr) { var pl = new T.Mesh(new T.CylinderGeometry(0.07, 0.08, 1.6, 8), red); pl.position.set(sx * L * 0.28, -0.4, zr); br.add(pl); }); });
    br.traverse(function (o) { if (o.isMesh) { o.castShadow = hi; o.receiveShadow = true; } });
    br.position.set(bx, Y - 0.3, bz); scene.add(br);
  }
  if (MD.mist) {
    // Nebelschwaden / Dunstbänke: wenige große, weiche Sprites in der Ferne, treiben langsam (Handy: halb so viele)
    var mc = document.createElement('canvas'); mc.width = 256; mc.height = 128; var mg = mc.getContext('2d'), rr = Board3D.rnd(77);
    for (var b = 0; b < 40; b++) { var bx = 30 + rr() * 196, by = 50 + rr() * 40, br2 = 18 + rr() * 30, gg = mg.createRadialGradient(bx, by, 0, bx, by, br2); gg.addColorStop(0, 'rgba(255,255,255,0.22)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); mg.fillStyle = gg; mg.fillRect(0, 0, 256, 128); }
    var fade = mg.createLinearGradient(0, 0, 0, 128); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.75, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)'); mg.globalCompositeOperation = 'destination-in'; mg.fillStyle = fade; mg.fillRect(0, 0, 256, 128);
    var mt = new T.CanvasTexture(mc), MI = MD.mist; this.mists = [];
    for (var q = 0; q < (this.mobile ? Math.ceil(MI.n / 2) : MI.n); q++) {
      var ang = -Math.PI / 2 + (rr() - 0.5) * 2.6, dist = MI.r[0] + rr() * (MI.r[1] - MI.r[0]), mx = Math.cos(ang) * dist * 1.2, mz = Math.sin(ang) * dist;
      if (MI.river && q % 2) { mz = -10 - rr() * 40; mx = Board3D.riverX(mz) + (rr() - 0.5) * 4; }
      var ms = new T.Sprite(new T.SpriteMaterial({ map: mt, color: MI.c, transparent: true, opacity: MI.o * (0.6 + rr() * 0.4), depthWrite: false }));
      var sw = 14 + rr() * 16; ms.scale.set(sw, sw * 0.28, 1); ms.center.set(0.5, 0.1); ms.position.set(mx, Y + H(mx, mz) + MI.h * rr(), mz); scene.add(ms); this.mists.push({ s: ms, x: mx, ph: rr() * 6 });
    }
  }
  if (MD.fires) MD.fires.forEach(function (p, i) {
    // brennende Gebäude um die Burg: Flammen, Licht, schwarze Rauchsäulen
    var fx = p[0], fz = p[1], fy = Y + H(fx, fz) + 0.3;
    if (i < (self.mobile ? 1 : 2)) { var pl = new T.PointLight(0xff6a20, 6, 12, 2); pl.position.set(fx, fy + 0.6, fz); pl.userData.base = 6; scene.add(pl); self.lanterns.push(pl); } // nur die vordersten Brände mit Licht
    var flames = []; for (var k2 = 0; k2 < 6; k2++) { var fl = new T.Sprite(self.fireMat()); fl.position.set(fx + (k2 - 2.5) * 0.3, fy + 0.2 + (k2 % 2) * 0.25, fz + (Math.random() - .5) * 0.5); fl.userData.s = [0.9 + Math.random() * 0.5, 1.4 + Math.random() * 0.9]; fl.center.set(0.5, 0.15); scene.add(fl); flames.push(fl); }
    var ruin = self.burntHouse(); ruin.position.set(fx, fy - 0.35, fz); ruin.rotation.y = Math.random() * 3; scene.add(ruin);
    var np = self.mobile ? 7 : 12, puffs = []; for (var j = 0; j < np; j++) { var sp2 = new T.Sprite(self.smokeMat()); sp2.material.color.set(0x2a2622); sp2.userData.t = j / np; scene.add(sp2); puffs.push(sp2); }
    self.campFires.push({ x: fx, y: fy + 0.4, z: fz, fl: flames[2], flames: flames, puffs: puffs, big: 4 + (i % 2), rise: 13 });
  });
};
// Flammen als weiche, additive Sprites (ein Material für alle)
Board3D.prototype.fireMat = function () {
  if (!Board3D._fireT) { var c = document.createElement('canvas'); c.width = 64; c.height = 128; var g = c.getContext('2d'), gr = g.createRadialGradient(32, 96, 2, 32, 80, 60);
    gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(0.25, 'rgba(255,170,60,0.9)'); gr.addColorStop(0.6, 'rgba(230,70,10,0.45)'); gr.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(32, 72, 26, 56, 0, 0, 7); g.fill(); Board3D._fireT = new THREE.CanvasTexture(c); }
  return this._fireM || (this._fireM = new THREE.SpriteMaterial({ map: Board3D._fireT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
};
// ausgebranntes Haus: verkohlte Pfosten und eingestürzter Dachstuhl
Board3D.prototype.burntHouse = function () {
  var T = THREE, g = new T.Group(), m = this._charM || (this._charM = new T.MeshStandardMaterial({ color: 0x1a1410, roughness: 1, flatShading: true }));
  [[-0.7, -0.45], [0.7, -0.45], [-0.7, 0.45], [0.7, 0.45], [0, -0.45]].forEach(function (p, i) { var po = new T.Mesh(new T.BoxGeometry(0.09, 0.7 - i * 0.08, 0.09), m); po.position.set(p[0], 0.35, p[1]); po.rotation.z = (Math.random() - .5) * 0.3; g.add(po); });
  var r = new T.Mesh(new T.CylinderGeometry(0.1, 0.9, 0.5, 4, 1), m); r.rotation.set(0.35, Math.PI / 4, 0.2); r.position.set(0.15, 0.45, 0.1); r.scale.set(1.3, 1, 0.9); g.add(r);
  for (var k = 0; k < 4; k++) { var b = new T.Mesh(new T.BoxGeometry(1.2, 0.06, 0.08), m); b.position.set((Math.random() - .5) * 0.6, 0.06, (Math.random() - .5) * 0.8); b.rotation.y = Math.random() * 3; g.add(b); }
  g.traverse(function (o) { if (o.isMesh) o.castShadow = true; }); return g;
};
Board3D.prototype.smokeMat = function () {
  if (!Board3D._smokeT) { var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); Board3D._smokeT = new THREE.CanvasTexture(c); }
  return new THREE.SpriteMaterial({ map: Board3D._smokeT, color: 0x9a948c, transparent: true, depthWrite: false, opacity: 0.3 });
};
// pro Bild: Gras/Wolken-Zeit, Rauch der Lagerfeuer, Nobori wehen, Raster je nach Auswahl
Board3D.prototype.fieldTick = function (now, dt) {
  this.fieldU.uTime.value = now / 1000;
  if (this.fieldU.uSunV) this.fieldU.uSunV.value.copy(this.sun.position).normalize().transformDirection(this.camera.matrixWorldInverse);
  var self = this;
  (this.campFires || []).forEach(function (f, i) {
    f.fl.scale.y = 0.8 + Math.sin(now / 70 + i * 2) * 0.2 + Math.random() * 0.15;
    // Rauchsäule: Puffs steigen, wachsen, treiben mit dem Wind ab und verblassen
    var B = f.big || 1, R = f.rise || 2.4;
    if (f.flames) f.flames.forEach(function (fl, j) { var b = fl.userData.s || [1, 1]; fl.scale.set(b[0] * (0.9 + Math.sin(now / 90 + j) * 0.1), b[1] * (0.7 + Math.sin(now / 60 + j * 1.7) * 0.3 + Math.random() * 0.25), 1); });
    f.puffs.forEach(function (p) { var u = p.userData; u.t = (u.t + dt / (7000 + B * 1500)) % 1; var t = u.t; p.position.set(f.x + t * t * 1.6 * B + Math.sin(now / 900 + t * 5) * 0.05 * B, f.y + t * R, f.z - t * t * 0.5 * B);
      var sz = (B > 3 ? 0.35 + t * 1.5 : 0.15 + t * 1.1) * B; p.scale.set(sz, sz, 1); p.material.opacity = Math.sin(Math.PI * Math.min(1, t * 1.4)) * (B > 3 ? 0.75 : B > 1 ? 0.55 : 0.35);
      if (B > 3) { var gl = Math.max(0, 1 - t * 5); p.material.color.setRGB(0.3 + 0.35 * gl, 0.28 + 0.12 * gl, 0.27); } }); // große Brände: unten vom Feuer angeleuchtet, oben schwarz
  });
  (this.mists || []).forEach(function (m) { m.s.position.x = m.x + Math.sin(now / 9000 + m.ph) * 2; });
  (this.nobori || []).forEach(function (n) { var p = n.m.geometry.attributes.position; for (var j = 0; j < p.count; j++) { var xx = p.getX(j) + 0.085; p.setZ(j, Math.sin(now / 380 + n.ph + p.getY(j) * 6) * 0.035 * (xx / 0.17)); } p.needsUpdate = true; });
  if (this.weatherTick) this.weatherTick(now, dt);
  if (this.fieldGrid) { var want = this.hl && (this.hl.selected != null || this.hoverSq != null) ? 0.75 : 0.28, mt = this.fieldGrid.material; mt.opacity += (want - mt.opacity) * Math.min(1, dt / 160); }
};

// Trupp-Schlacht: Soldaten im Zweikampf mit dem nächsten Gegner, vordere Reihen zuerst, Verteidiger fallen einzeln, Angreifer formieren sich neu
Board3D.prototype.armyFight = function (info, A, from, to, D, style) {
  var self = this, T = THREE, short = this.settings.fights === 'kurz', sp = short ? 0.65 : 1;
  var dx = to.x - from.x, dz = to.z - from.z, dist = Math.hypot(dx, dz) || 1, ux = dx / dist, uz = dz / dist;
  var BT = this.BT, colA = new T.Color(this.theme.factions[info.col].color).getHex(), colD = new T.Color(this.theme.factions[1 - info.col].color).getHex(), dust = this.dustColor(1 - info.col), big = Math.abs(info.cap) >= 6;
  var at = A.userData.troops || [A], dt = D.userData.troops || [D], many = at.length + dt.length > 10, pf = Math.max(0.12, Math.min(1, 10 / Math.max(at.length, dt.length)));
  var st = Math.min(110, 900 / at.length);
  A.userData.fighting = D.userData.fighting = true;
  function snd(n, a, side) { if (typeof Sfx !== 'undefined') Sfx.play(n, a, side == null || self.theme.id !== 'feudal' ? null : Math.abs((side ? D : A).userData.p || 0)); }
  function wait(ms) { return self.tween(ms * sp, function () { }); }
  function ease(k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  // Kino-Kamera: tief auf Augenhöhe, seitlich zur Front, dreht langsam um das Gemenge
  var o = this.orbit, cam0 = { x: o.target.x, y: o.target.y, z: o.target.z, r: o.radius, ph: o.phi, th: o.thetaGoal }, ranged = style === 'magic' || style === 'shoot' || style === 'breath' || style === 'leap', mx, mz;
  // Ausschnitt: das ganze Gemenge füllt das Bild (Nahkampf: Verteidiger + Anlauf der Angreifer, Fernkampf: beide Trupps)
  var pts = (ranged ? at.concat(dt) : dt).map(function (s) { var v = new T.Vector3(); s.getWorldPosition(v); return v; });
  if (!ranged) { var cdn = new T.Vector3(); pts.forEach(function (p) { cdn.add(p); }); cdn.multiplyScalar(1 / pts.length); pts.push(new T.Vector3(cdn.x - ux * 0.8, 0, cdn.z - uz * 0.8), new T.Vector3(cdn.x + ux * 0.35, 0, cdn.z + uz * 0.35)); }
  var bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity; pts.forEach(function (p) { bx0 = Math.min(bx0, p.x); bx1 = Math.max(bx1, p.x); bz0 = Math.min(bz0, p.z); bz1 = Math.max(bz1, p.z); });
  mx = (bx0 + bx1) / 2; mz = (bz0 + bz1) / 2; var ext = 0; pts.forEach(function (p) { ext = Math.max(ext, Math.hypot(p.x - mx, p.z - mz)); }); ext += 0.3;
  var vfh = this.camera.fov * Math.PI / 360, hfh = Math.atan(Math.tan(vfh) * this.camera.aspect), fitR = ext / Math.tan(Math.min(vfh, hfh)) * 1.05;
  var cdx = Math.sin(o.theta), cdz = Math.cos(o.theta), px = -uz, pz = ux; if (px * cdx + pz * cdz < 0) { px = -px; pz = -pz; }
  var vx = px * 0.85 + cdx * 0.55 - ux * 0.25, vz = pz * 0.85 + cdz * 0.55 - uz * 0.25, th1 = Math.atan2(vx, vz);
  while (th1 - o.theta > Math.PI) th1 -= Math.PI * 2; while (th1 - o.theta < -Math.PI) th1 += Math.PI * 2;
  var c1r = Math.max(2.4, Math.min(9, fitR)), vs0 = this.viewShift == null ? 0.17 : this.viewShift;
  this.hlGroup.visible = false; if (this.look === 'feld') this.showTag(null);
  self._camBack = false;
  if (!short) { self.cineDrift = 0; this.tween(700, function (k) { var e = ease(k); o.target.x = cam0.x + (mx - cam0.x) * e; o.target.z = cam0.z + (mz - cam0.z) * e; o.target.y = cam0.y + (BT + 0.15 - cam0.y) * e; o.radius = cam0.r + (c1r - cam0.r) * e; o.phi = cam0.ph + (1.2 - cam0.ph) * e; o.thetaGoal = o.theta = cam0.th + (th1 - cam0.th) * e; self.viewShift = vs0 * (1 - e); }).then(function () { if (!self._camBack) self.cineDrift = 0.00007 * (Math.random() < .5 ? 1 : -1); }); }
  function camBack(ms) { if (short || self._camBack) return; self._camBack = true; self.cineDrift = 0; var c1 = { x: o.target.x, y: o.target.y, z: o.target.z, r: o.radius, ph: o.phi, th: o.thetaGoal };
    while (c1.th - cam0.th > Math.PI) c1.th -= Math.PI * 2; while (c1.th - cam0.th < -Math.PI) c1.th += Math.PI * 2; /* kürzester Schwenk, kein Rundflug */ self.tween(ms || 900, function (k) { var e = ease(k); o.target.x = c1.x + (cam0.x - c1.x) * e; o.target.y = c1.y + (cam0.y - c1.y) * e; o.target.z = c1.z + (cam0.z - c1.z) * e; o.radius = c1.r + (cam0.r - c1.r) * e; o.phi = c1.ph + (cam0.ph - c1.ph) * e; o.thetaGoal = o.theta = c1.th + (cam0.th - c1.th) * e; self.viewShift = vs0 * e; }).then(function () { self._camBack = false; }); }
  function wp(s) { var v = new T.Vector3(); s.getWorldPosition(v); return v; }
  function toLocal(s, x, z) { var v = new T.Vector3(x, BT, z); if (s.parent) { s.parent.updateWorldMatrix(true, false); s.parent.worldToLocal(v); } return v; }
  function rotY(s) { return s.rotation.y + (s.parent && s.parent.userData.troops ? s.parent.rotation.y : 0); }
  function ldir(s, wx, wz) { var r = rotY(s); return { x: wx * Math.cos(r) - wz * Math.sin(r), z: wx * Math.sin(r) + wz * Math.cos(r) }; }
  function tFace(s, x, z, dur) {
    var m = s.userData.glb; if (!m) return Promise.resolve();
    var p = wp(s), r = rotY(s), wx = x - p.x, wz = z - p.z, lx = wx * Math.cos(r) - wz * Math.sin(r), lz = wx * Math.sin(r) + wz * Math.cos(r);
    var goal = Math.atan2(-lx, -lz) - ((m.userData.ry0 || 0) - Math.PI), a0 = m.userData.face || 0;
    while (goal - a0 > Math.PI) goal -= Math.PI * 2; while (goal - a0 < -Math.PI) goal += Math.PI * 2;
    return self.tween((dur || 160) * sp, function (k) { m.userData.face = a0 + (goal - a0) * (1 - Math.pow(1 - k, 3)); });
  }
  function U(s) { return s.userData.u || null; }
  function walk(s, v) { var u = U(s); if (u) u.uWalk.value = v; }
  // Haltung: Oberkörper (Shader) + ganzer Körper kippt in Richtung ld
  function act(s, v, dur, ld, ang) {
    var u = U(s), a0 = u ? u.uAct.value : 0, g0 = s.userData.ang || 0;
    return self.tween(dur * sp, function (k) { var e = ease(k); if (u) u.uAct.value = a0 + (v - a0) * e; if (ld) { s.userData.ang = g0 + ((ang || 0) - g0) * e; self.lean(s, ld.x, ld.z, s.userData.ang); } });
  }
  function head(s) { var p = wp(s); p.y += s.userData.hh || 0.8; return p; }
  function sparks(x, y, z, c, n, sh) { n = Math.max(2, Math.round(n * pf)); self.emit(x, y, z, 0xffc870, n, 3.2, 0.9); if (pf > 0.4) self.emit(x, y, z, 0xffffff, n / 3, 2, 1.1); self.shakeAmt = Math.max(self.shakeAmt || 0, sh); }
  var killed = 0, total = dt.length, ptA = Math.abs(A.userData.p || 0), heavyA = style === 'charge' || [3, 6, 7, 8, 13, 14, 11].indexOf(ptA) >= 0, corpses = [];
  function flash(s, v) { if (s.userData.u) s.userData.flash = (v || 1) * (0.35 + 0.65 * pf); }
  // Schwert-/Speerspur: heller Bogen vor dem Soldaten, verblasst schnell
  function trail(s, nx, nz, col) {
    return; // Bögen sahen aus wie Ladesymbole
    if (many && Math.random() < 0.5) return;
    var w = wp(s), h = s.userData.hh || 0.25, ring = new T.Mesh(self._trailGeo || (self._trailGeo = new T.RingGeometry(0.7, 1, 18, 1, -0.8, 2.5)), new T.MeshBasicMaterial({ color: col || 0xfff2d0, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    ring.rotation.set(0, Math.atan2(-nz, nx), 0); ring.position.set(w.x + nx * h * 0.25, w.y + h * 0.62, w.z + nz * h * 0.25); ring.scale.setScalar(h * 0.55); self.scene.add(ring);
    self.tween(140, function (k) { ring.material.opacity = 0.45 * (1 - k); ring.scale.setScalar(h * (0.55 + k * 0.2)); }).then(function () { self.scene.remove(ring); ring.material.dispose(); });
  }
  function dieT(d, nx, nz, att, heavy) {
    if (d.userData.dying) return Promise.resolve(); d.userData.dying = true;
    if (!att && info.onHit) info.onHit();
    if (heavy == null) heavy = heavyA && Math.random() < (big ? 0.7 : 0.45);
    d.userData.heavyDeath = heavy;
    var ld = ldir(d, nx, nz), p0 = d.position.clone(), fall = 1.45 + Math.random() * 0.3, hp = head(d), u = U(d), kb = heavy ? 0.35 + Math.random() * 0.45 : 0.14 + Math.random() * 0.12;
    sparks(hp.x, hp.y - 0.06, hp.z, att ? colD : colA, big ? 30 : 20, heavy ? 0.3 : big ? 0.25 : 0.14); flash(d, 1.2);
    // Rückstoß: nach hinten geschleudert (schwere Treffer: durch die Luft mit Überschlag), kippt um und bleibt liegen
    var spin = (Math.random() - 0.5) * (heavy ? 3 : 1.2), m = d.userData.glb, f0 = m ? m.userData.face || 0 : 0, air = heavy ? 0.28 + Math.random() * 0.3 : 0.05, flip = heavy ? 2.2 + Math.random() * 1.6 : fall;
    return self.tween((heavy ? 620 : 380 + Math.random() * 140) * sp, function (k) {
      var e = 1 - Math.pow(1 - k, 2), tp = heavy ? Math.min(1, k * 1.15) : k * k;
      if (d.userData.skin) self.lean(d, ld.x, ld.z, heavy ? Math.sin(k * Math.PI) * 0.5 : 0); else self.lean(d, ld.x, ld.z, heavy ? tp * flip - (k > .87 ? (k - .87) / .13 * (flip - fall) : 0) : tp * fall); d.position.x = p0.x + ld.x * e * kb; d.position.z = p0.z + ld.z * e * kb; d.position.y = p0.y + Math.sin(k * Math.PI) * air;
      if (m) m.userData.face = f0 + spin * e; if (u) u.uAct.value = -0.9 * (1 - k) + 0.4 * k;
    }).then(function () {
      var w = wp(d); self.emit(w.x + nx * 0.08, BT + 0.06, w.z + nz * 0.08, dust, heavy ? 18 : many ? 6 : 14, heavy ? 1.6 : 1.1, 0.6); snd('fall', heavy ? 0.8 : 0.5, att ? 0 : 1);
      if (heavy) { var y1 = d.position.y; self.tween(160 * sp, function (k) { d.position.y = y1 + Math.sin(k * Math.PI) * 0.04; }); }
      if (!att && ++killed === total) {
        snd('fall', 0.9); if (!short) snd('cheer'); else snd('bedStop'); self.shakeAmt = Math.max(self.shakeAmt || 0, 0.16); if (!short) self.slowmo(420, 0.3);
        // Feldzeichen fällt mit dem letzten Mann
        var ban = D.userData.banner; if (ban) { var bl = ldir(D, nx, nz); self.tween(520 * sp, function (k) { self.lean(ban, bl.x, bl.z, k * k * 1.5); }); }
      }
      d.userData.dead = true; corpses.push(d);
    });
  }
  // Gefallene sinken nach der Schlacht langsam ein
  function bury(list, then) {
    // erst einsinken, wenn jeder Tod-Clip zu Ende ist (sonst sinkt ein Spätgefallener stehend ein), dann noch kurz liegen lassen
    var ys = list.map(function (d) { return d.position.y; }), wt = 0, now = window.SkinAnim ? SkinAnim.time.value : 0;
    list.forEach(function (d) { var u = d.userData; if (u.skin) wt = Math.max(wt, 1.6 + (u.dieC && u.clip ? u.clip[1] + u.skin.dur[u.dieC] - now : u.skin.dur.die1)); });
    return self.tween(1100, function (k) { list.forEach(function (d, i) { d.position.y = ys[i] - k * k * 0.12; }); }, 700 + wt * 1000).then(function () { list.forEach(function (d) { d.visible = false; }); if (then) then(); }); }
  // Ziele verteilen: Angreifer von vorne nach hinten nehmen den nächsten freien Gegner, übrige Gegner gehen an den nächsten Angreifer
  var groups = at.map(function () { return []; }), ap = at.map(wp), dp = dt.map(wp), dc = new T.Vector3(), ac = new T.Vector3();
  dp.forEach(function (p) { dc.add(p); }); dc.multiplyScalar(1 / dp.length); ap.forEach(function (p) { ac.add(p); }); ac.multiplyScalar(1 / ap.length);
  var order = at.map(function (a, j) { return j; }).sort(function (i, j) { return ap[i].distanceTo(dc) - ap[j].distanceTo(dc); }), free = dt.map(function (d, i) { return i; });
  order.forEach(function (j, rank) {
    at[j].userData.ord = rank; if (!free.length) return;
    var best = 0; free.forEach(function (i, q) { if (dp[i].distanceTo(ap[j]) < dp[free[best]].distanceTo(ap[j])) best = q; });
    groups[j].push(dt[free[best]]); free.splice(best, 1);
  });
  free.forEach(function (i) { var bj = 0; at.forEach(function (a, j) { if (ap[j].distanceTo(dp[i]) < ap[bj].distanceTo(dp[i])) bj = j; }); groups[bj].push(dt[i]); });
  function centroid(list) { var c = new T.Vector3(); list.forEach(function (d) { c.add(wp(d)); }); return c.multiplyScalar(1 / list.length); }
  function cheer(a) { var ld = ldir(a, ux, uz), r = a.userData.ord || 0; return wait(r * st).then(function () { self.skinShot(a, 'cheer3'); return act(a, -0.7, 220, ld, -0.1); }).then(function () { return act(a, 0.3, 160, ld, 0.05); }).then(function () { return act(a, 0, 200, ld, 0); }); }
  function killAll(defs, nx, nz) { return Promise.all(defs.map(function (d, k) { return wait(k * 70).then(function () { return dieT(d, nx, nz); }); })); }
  // Zweikampf: anrennen, Schlagabtausch (Waffenarm holt aus und schlägt), Paraden, Todesstoß; manche Angreifer fallen auch
  function swing(s, dur, ld, back, nx, nz) { if (back) self.skinShot(s, Board3D.ATK, (dur + 75) / 1000); if (!back && nx != null) trail(s, nx, nz); return act(s, back ? -1.25 : 1.15, dur, ld, s.userData.skin ? 0 : back ? -0.16 : 0.24); }
  function block(s, ld) { self.skinShot(s, 'block'); return act(s, -0.55, 110, ld, s.userData.skin ? 0 : -0.1); }
  function push(s, nx, nz, d, dur) { var p0 = s.position.clone(), l = ldir(s, nx, nz); return self.tween(dur * sp, function (k) { var e = 1 - Math.pow(1 - k, 3); s.position.x = p0.x + l.x * d * e; s.position.z = p0.z + l.z * d * e; }); }
  function duel(a, defs) {
    if (!defs.length) return cheer(a);
    var pa, c, nx, nz, ld, dl2, r = a.userData.ord || 0, loud = !many || r % 3 === 0, dd = defs[0], falls = !short && at.length > 4 && r % 5 === 2;
    function clash(x, y, z, col, n) { if (loud) snd('clash', 0.55, col === colD ? 1 : 0); sparks(x, y, z, col, n, 0.12); }
    function mid() { var h = head(a), q = head(dd); return [(h.x + q.x) / 2, Math.min(h.y, q.y) - 0.05, (h.z + q.z) / 2]; }
    return wait(r * st).then(function () {
      pa = wp(a); c = centroid(defs); var ddx = c.x - pa.x, ddz = c.z - pa.z, dl = Math.hypot(ddx, ddz) || 1; nx = ddx / dl; nz = ddz / dl; ld = ldir(a, nx, nz); dl2 = ldir(dd, -nx, -nz);
      var stop = Math.max(0, dl - 0.19), l0 = a.position.clone(), l1 = toLocal(a, pa.x + nx * stop, pa.z + nz * stop), y0 = a.position.y;
      return Promise.all([tFace(a, c.x, c.z, 100)].concat(defs.map(function (d) { return tFace(d, pa.x, pa.z, 140); }))).then(function () {
        walk(a, 1); var u = U(a); if (u) u.uAct.value = -0.5;
        return self.tween((110 + stop * 280) * sp, function (k) { var e = k * k * (3 - 2 * k); a.position.x = l0.x + (l1.x - l0.x) * e; a.position.z = l0.z + (l1.z - l0.z) * e; a.position.y = y0 + Math.abs(Math.sin(k * Math.PI * 2)) * 0.025; });
      });
    })
      // 1. Hieb: Verteidiger pariert, wird zurückgedrängt
      .then(function () { walk(a, 0); if (loud) snd('whoosh', 0.45, 0); return Promise.all([swing(a, 170, ld, true), block(dd, dl2)]); })
      .then(function () { return Promise.all([swing(a, 75, ld, false, nx, nz), push(a, nx, nz, 0.03, 75)]); })
      .then(function () { var p = mid(); clash(p[0], p[1], p[2], 0xffffff, 12); flash(dd, 0.5); return Promise.all([push(dd, nx, nz, 0.05, 140), act(dd, -0.3, 140, dl2, -0.14)]); })
      .then(function () {
        if (short) return;
        // 2. Gegenschlag: Verteidiger holt aus, Angreifer blockt und weicht einen Schritt
        return Promise.all([act(a, -0.2, 120, ld, 0), swing(dd, 170, dl2, true)])
          .then(function () { return Promise.all([swing(dd, 75, dl2, false, -nx, -nz), block(a, ld)]); })
          .then(function () {
            var p = mid(); clash(p[0], p[1], p[2], colD, 12); flash(a, 0.5);
            if (falls) return dieT(a, -nx, -nz, true); // dieser Angreifer fällt
            return Promise.all([push(a, -nx, -nz, 0.05, 140), act(dd, 0, 140, dl2, 0)]);
          });
      })
      .then(function () {
        // gefallener Angreifer: sein Gegner fällt kurz danach durch den Nachbarn
        if (falls) return wait(160).then(function () { return killAll(defs, nx, nz); });
        // 3. Todesstoß: weit ausholen, wuchtig durchziehen
        if (loud) snd('whoosh', 0.55, 0);
        return swing(a, 190, ld, true).then(function () { return Promise.all([swing(a, 70, ld, false, nx, nz), push(a, nx, nz, 0.08, 70)]); })
          .then(function () { var p = mid(); clash(p[0], p[1], p[2], colA, 18); return killAll(defs, nx, nz); })
          .then(function () { return act(a, 0, 260, ld, 0); });
      });
  }
  // Total-War-Gemenge: alle kämpfen gleichzeitig. Jeder sucht den nächsten Gegner, rückt nach, holt aus, trifft oder wird pariert.
  // Größere Soldaten halten mehr aus und schlagen härter (Helden und schwere Krieger treffen mehrere). Bricht der Verteidiger ein, flieht der Rest und wird verfolgt.
  function brawl() {
    var all = [], sA = [], sD = [], T0 = self.vt, maxT = (short ? 3 : 6) * 1000, liveA = at.filter(function (a) { return !a.userData.dead && !a.userData.dying; }).length, capA = Math.max(0, Math.min(Math.ceil(liveA * 0.3), liveA - 1)), lostA = 0 /* Sieger verliert pro Kampf bis zu 30 % der Lebenden, der letzte Mann stirbt nie */, lastSnd = 0, el = 0, routed = false;
    function mk(s, side) {
      var h = (s.userData.hh || 0.2) / 0.8, pw = Math.pow((s.userData.pw0 || h) / 0.22, 1.6), o = { s: s, side: side, w: wp(s), h: h, pw: pw, hp: pw, st: 'idle', t: 0, cd: Math.random() * 0.5, tg: null, re: 0, act: (U(s) || { uAct: { value: 0 } }).uAct.value, ang: 0, nx: 0, nz: 1, rout: false, run: 0 };
      s.parent.updateWorldMatrix(true, false); o.inv = new T.Matrix4().copy(s.parent.matrixWorld).invert(); all.push(o); (side ? sD : sA).push(o);
    }
    at.forEach(function (a) { if (!a.userData.dead && !a.userData.dying && a.visible) mk(a, 0); });
    dt.forEach(function (d) { if (!d.userData.dead && !d.userData.dying && d.visible) mk(d, 1); });
    function alive(o) { return !o.dying && !o.s.userData.dying && !o.s.userData.dead; }
    function nearest(o, list) { var b = null, bd = 1e9; list.forEach(function (q) { if (!alive(q)) return; var d = (q.w.x - o.w.x) * (q.w.x - o.w.x) + (q.w.z - o.w.z) * (q.w.z - o.w.z); if (d < bd) { bd = d; b = q; } }); return b; }
    function turnTo(o, nx, nz, dts) {
      var m = o.s.userData.glb; if (!m) return;
      var r = rotY(o.s), lx = nx * Math.cos(r) - nz * Math.sin(r), lz = nx * Math.sin(r) + nz * Math.cos(r), goal = Math.atan2(-lx, -lz) - ((m.userData.ry0 || 0) - Math.PI), a0 = m.userData.face || 0;
      while (goal - a0 > Math.PI) goal -= Math.PI * 2; while (goal - a0 < -Math.PI) goal += Math.PI * 2;
      m.userData.face = a0 + (goal - a0) * Math.min(1, dts * 9);
    }
    function sound(n, v) { if (self.vt - lastSnd > 70) { lastSnd = self.vt; snd(n, v); } }
    function kill(tg, nx, nz, heavy) { if (tg.side === 0) lostA++; write(tg); var u = U(tg.s); if (u) u.uWalk.value = 0; dieT(tg.s, nx, nz, tg.side === 0, heavy); }
    // fliehender Soldat verschwindet hinter den eigenen Linien
    function gone(o) {
      o.dying = true; var s0 = o.s.scale.x;
      self.tween(350, function (k) { o.s.scale.setScalar(s0 * (1 - k)); }).then(function () { o.s.visible = false; o.s.userData.dead = true; });
      if (++killed === total) { var ban = D.userData.banner; if (ban) self.tween(520 * sp, function (k) { self.lean(ban, ux, uz, k * k * 1.5); }); }
    }
    function strike(o, tg, nx, nz, reach) {
      var d = Math.hypot(tg.w.x - o.w.x, tg.w.z - o.w.z);
      if (!alive(tg) || d > reach * 1.5) return;
      var p = tg.rout ? 0.95 : o.side ? 0.34 : 0.7 + 0.25 * el / maxT;
      if (o.side === 1 && lostA >= capA) p = 0;
      var hp = head(tg.s);
      if (Math.random() > p) { // pariert: Funken, Gegner weicht zurück
        if (Math.random() < pf * 2) sparks(hp.x - nx * 0.04, hp.y - 0.05, hp.z - nz * 0.04, 0, 6, 0); snd('clash', 0.4, o.side);
        tg.w.x += nx * 0.025; tg.w.z += nz * 0.025; if (tg.st === 'idle') self.skinShot(tg.s, 'block'); return;
      }
      tg.hp -= o.pw * (0.7 + Math.random() * 0.6); flash(tg.s, 0.7); tg.w.x += nx * 0.04; tg.w.z += nz * 0.04; snd(Math.random() < 0.6 ? 'hit' : 'clash', 0.55, o.side);
      if (tg.hp <= 0) kill(tg, nx, nz, o.pw > tg.pw * 2.2 ? Math.random() < 0.7 : heavyA && o.side === 0 && Math.random() < 0.2);
      else { self.skinShot(tg.s, Math.random() < 0.5 ? 'hit1' : 'hit2'); tg.st = 'idle'; tg.cd = Math.max(tg.cd, 0.35); }
      // Helden und schwere Krieger mähen mehrere nieder
      if (o.pw >= 2.4) {
        var n = Math.min(4, Math.floor(o.pw) - 1);
        (o.side ? sA : sD).forEach(function (q) {
          if (n <= 0 || q === tg || !alive(q)) return; var qx = q.w.x - o.w.x, qz = q.w.z - o.w.z, qd = Math.hypot(qx, qz);
          if (qd < reach * 1.3 && (qx * nx + qz * nz) / (qd || 1) > 0.2) { n--; q.hp -= o.pw * 0.8; flash(q.s, 0.7); if (q.hp <= 0) kill(q, qx / (qd || 1), qz / (qd || 1), Math.random() < 0.8); }
        });
      }
    }
    function think(o, dts) {
      var u = U(o.s), foes = o.side ? sA : sD;
      if (o.rout) { // Flucht: weg vom Feind, Waffen gesenkt
        var c = new T.Vector3(), n = 0; sA.forEach(function (q) { if (alive(q)) { c.add(q.w); n++; } }); if (n) c.multiplyScalar(1 / n); else c.set(o.w.x - ux, 0, o.w.z - uz);
        var fx = o.w.x - c.x + ux * 0.6, fz = o.w.z - c.z + uz * 0.6, fl = Math.hypot(fx, fz) || 1, spd = 0.4 * dts;
        o.w.x += fx / fl * spd; o.w.z += fz / fl * spd; o.run += spd; turnTo(o, fx / fl, fz / fl, dts); o.act += (0.3 - o.act) * Math.min(1, dts * 6); o.ang = 0.12;
        if (u) { u.uWalk.value = 1; u.uAct.value = o.act; } if (o.run > 1.6) gone(o); return;
      }
      o.re -= dts; if (!o.tg || !alive(o.tg) || o.re <= 0) { o.tg = nearest(o, foes); o.re = 0.25 + Math.random() * 0.35; }
      var tg = o.tg; if (!tg) { if (u) { u.uWalk.value = 0; o.act += (-0.7 - o.act) * Math.min(1, dts * 4); u.uAct.value = o.act; } o.ang *= 0.9; return; }
      var dx = tg.w.x - o.w.x, dz = tg.w.z - o.w.z, d = Math.hypot(dx, dz) || 1e-4, nx = dx / d, nz = dz / d, reach = 0.05 + (o.h + tg.h) * 0.3;
      o.nx = nx; o.nz = nz; turnTo(o, nx, nz, dts);
      if (o.st === 'idle') {
        if (d > reach) {
          var spd2 = (tg.rout ? 0.75 : 0.5) * (0.85 + 0.15 * o.h / 0.22) * dts, st2 = Math.min(spd2, d - reach * 0.9), moved = Math.hypot(o.w.x - (o.px || o.w.x), o.w.z - (o.pz || o.w.z));
          o.stuck = moved < spd2 * 0.25 ? (o.stuck || 0) + dts : 0; o.px = o.w.x; o.pz = o.w.z; if (o.lat == null) o.lat = Math.random() < 0.5 ? -1 : 1;
          var side2 = o.stuck > 0.25 ? 0.9 : 0.25; o.w.x += (nx - nz * o.lat * side2) * st2; o.w.z += (nz + nx * o.lat * side2) * st2; if (o.stuck > 1.2) { o.lat = -o.lat; o.stuck = 0; } if (u) u.uWalk.value = 1; o.act += (-0.45 - o.act) * Math.min(1, dts * 6); o.ang += (0.08 - o.ang) * Math.min(1, dts * 6); }
        else { if (u) u.uWalk.value = 0; o.cd -= dts; o.act += (-0.25 + Math.sin(self.vt / 160 + o.h * 50) * 0.15 - o.act) * Math.min(1, dts * 5); o.ang *= 0.9; if (o.cd <= 0) { o.st = 'wind'; o.t = 0; o.a0 = o.act; self.skinShot(o.s, Board3D.ATK, 0.29); } }
      } else if (o.st === 'wind') { // ausholen
        o.t += dts; var k = Math.min(1, o.t / 0.2); o.act = o.a0 + (-1.25 - o.a0) * ease(k); o.ang = -0.16 * k;
        if (k >= 1) { o.st = 'hit'; o.t = 0; if (Math.random() < pf) trail(o.s, nx, nz); }
      } else if (o.st === 'hit') { // zuschlagen mit Ausfallschritt
        o.t += dts; var k2 = Math.min(1, o.t / 0.09); o.act = -1.25 + 2.4 * k2; o.ang = -0.16 + 0.42 * k2; o.w.x += nx * 0.3 * dts; o.w.z += nz * 0.3 * dts;
        if (k2 >= 1) { strike(o, tg, nx, nz, reach); o.st = 'rec'; o.t = 0; }
      } else { // zurück in Deckung
        o.t += dts; var k3 = Math.min(1, o.t / 0.26); o.act = 1.15 * (1 - k3) - 0.25 * k3; o.ang = 0.26 * (1 - k3);
        if (k3 >= 1) { o.st = 'idle'; o.cd = 0.1 + Math.random() * (o.side ? 0.75 : 0.4) / Math.min(2, o.pw); }
      }
      if (u) u.uAct.value = o.act;
    }
    function write(o) {
      var l = o.w.clone().applyMatrix4(o.inv); o.s.position.x = l.x; o.s.position.z = l.z;
      if (!o.dying) { var ld = ldir(o.s, o.nx, o.nz); self.lean(o.s, ld.x, ld.z, o.s.userData.skin ? o.ang * 0.25 : o.ang); }
    }
    return new Promise(function (done) {
      var last = null, tw = { dur: 1e9, start: null, done: done, f: function () {
        var now = self.vt, dts = last == null ? 0.016 : Math.min(0.05, (now - last) / 1000); last = now; el = now - T0;
        var liveD = sD.filter(alive);
        if (!liveD.length) return finish();
        if (!routed && (el > maxT * 0.7 || liveD.length <= Math.ceil(sD.length * 0.3))) { routed = true; liveD.forEach(function (o) { o.rout = true; o.st = 'idle'; }); }
        if (el > maxT + 1500) { liveD.forEach(gone); return finish(); }
        all.forEach(function (o) { if (alive(o)) think(o, dts); });
        // Abstand halten: Kameraden nicht ineinander, Gegner nicht durcheinander
        for (var i = 0; i < all.length; i++) { var a = all[i]; if (!alive(a)) continue;
          for (var j = i + 1; j < all.length; j++) { var b = all[j]; if (!alive(b)) continue;
            var x = b.w.x - a.w.x, z = b.w.z - a.w.z, d = Math.hypot(x, z), m = (a.h + b.h) * (a.side === b.side ? 0.24 : 0.22);
            if (d < m && d > 1e-5) { var pu = (m - d) * 0.5 / d; a.w.x -= x * pu; a.w.z -= z * pu; b.w.x += x * pu; b.w.z += z * pu; } } }
        all.forEach(function (o) { if (alive(o)) write(o); });
      } };
      function finish() { tw.dur = 1e-6; all.forEach(function (o) { var u = U(o.s); if (u && alive(o)) { u.uWalk.value = 0; } }); }
      self.tweens.push(tw);
    });
  }
  // Fernkampf (Schuss, Magie, Feueratem): jeder Soldat feuert auf seine Ziele
  function volley(a, defs) {
    if (!defs.length) return cheer(a);
    var pa, nx, nz, ld, r = a.userData.ord || 0, loud = !many || r % 3 === 0;
    return wait(r * st).then(function () {
      pa = head(a); var c = centroid(defs), ddx = c.x - pa.x, ddz = c.z - pa.z, dl = Math.hypot(ddx, ddz) || 1; nx = ddx / dl; nz = ddz / dl; ld = ldir(a, nx, nz);
      return tFace(a, c.x, c.z, 140);
    }).then(function () { return act(a, -0.5, 200, ld, -0.1); }).then(function () {
      var tgt = centroid(defs); tgt.y = BT + 0.2;
      if (style === 'breath') {
        snd('fire', null, 0);
        return Promise.all([act(a, 0.7, 120, ld, 0.15), self.tween(650 * sp, function (k) { self.emitDir(pa.x + nx * 0.2, pa.y, pa.z + nz * 0.2, k < .5 ? 0xffb030 : 0xff5a20, 5, nx * 5, -1.2, nz * 5, 1.2); })]);
      }
      if (style === 'shoot') {
        var chain = Promise.resolve();
        for (var s = 0; s < (short ? 1 : 2); s++) chain = chain.then(function () {
          if (loud) snd('zap', 0.5, 0);
          for (var q = 0; q < 5; q++) { var f = q / 5; self.emitDir(pa.x + (tgt.x - pa.x) * f, pa.y + (tgt.y - pa.y) * f, pa.z + (tgt.z - pa.z) * f, 0xfff0a0, 1, nx * 2, -1, nz * 2, 0.2); }
          sparks(tgt.x, tgt.y, tgt.z, 0xffe08a, 10, 0.06);
          return act(a, -0.3, 70, ld, -0.12).then(function () { return act(a, 0.2, 90, ld, 0); });
        });
        return chain;
      }
      if (loud) snd('zap', 0.6, 0);
      var bolt = new T.Mesh(self._boltGeo || (self._boltGeo = new T.SphereGeometry(0.06, 10, 6)), new T.MeshBasicMaterial({ color: colA, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false }));
      self.scene.add(bolt);
      return Promise.all([act(a, 0.8, 140, ld, 0.12), self.tween(380 * sp, function (k) {
        var x = pa.x + (tgt.x - pa.x) * k, y = pa.y + (tgt.y - pa.y) * k + Math.sin(k * Math.PI) * 0.3, z = pa.z + (tgt.z - pa.z) * k;
        bolt.position.set(x, y, z); self.emitDir(x, y, z, colA, 1, 0, 0, 0, 0.3);
      })]).then(function () { self.scene.remove(bolt); bolt.material.dispose(); });
    }).then(function () { return killAll(defs, nx, nz); })
      .then(function () { return act(a, 0, 240, ld, 0); });
  }
  // Sprung auf die Gegner
  function leapAt(a, defs) {
    if (!defs.length) return cheer(a);
    var nx, nz, ld, r = a.userData.ord || 0, loud = !many || r % 3 === 0;
    return wait(r * st).then(function () {
      var pa = wp(a), c = centroid(defs), ddx = c.x - pa.x, ddz = c.z - pa.z, dl = Math.hypot(ddx, ddz) || 1; nx = ddx / dl; nz = ddz / dl; ld = ldir(a, nx, nz);
      var l0 = a.position.clone(), l1 = toLocal(a, c.x - nx * 0.14, c.z - nz * 0.14), y0 = a.position.y;
      return tFace(a, c.x, c.z, 120).then(function () { return act(a, -0.6, 160, ld, -0.2); }).then(function () {
        if (loud) snd('whoosh', 0.5, 0);
        return self.tween((280 + dl * 120) * sp, function (k) { a.position.x = l0.x + (l1.x - l0.x) * k; a.position.z = l0.z + (l1.z - l0.z) * k; a.position.y = y0 + Math.sin(k * Math.PI) * (0.45 + dl * 0.2); a.userData.ang = -0.2 + k * 0.55; self.lean(a, ld.x, ld.z, a.userData.ang); var u = U(a); if (u) u.uAct.value = -0.6 + k * 1.6; });
      });
    }).then(function () {
      if (loud) snd('clash', 0.6, 0); var w = wp(a); self.emit(w.x, BT + 0.05, w.z, 0xd8c8a0, many ? 8 : 20, 2.2, 0.35);
      var ring = new T.Mesh(new T.RingGeometry(0.1, 0.16, 24), new T.MeshBasicMaterial({ color: colA, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(w.x, BT + 0.05, w.z); self.scene.add(ring);
      self.tween(450, function (k) { ring.scale.setScalar(1 + k * 3); ring.material.opacity = 0.8 * (1 - k); }).then(function () { self.scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); });
      return killAll(defs, nx, nz);
    }).then(function () { return act(a, 0, 240, ld, 0); });
  }
  // ganzer Trupp marschiert, Soldaten im Gleichschritt
  function march(x0, z0, x1, z1, dur, run) {
    snd('march', dur * sp, 0);
    at.forEach(function (a) { walk(a, run ? 1 : 0.8); });
    return self.tween(dur * sp, function (k) { var e = run ? k * k : ease(k); A.position.x = x0 + (x1 - x0) * e; A.position.z = z0 + (z1 - z0) * e; }).then(function () { at.forEach(function (a) { walk(a, 0); }); });
  }
  // neu formieren und aufs Feld ziehen
  function reform() {
    var x0 = A.position.x, z0 = A.position.z;
    if (!A.userData.troops) { camBack(1400); return march(x0, z0, to.x, to.z, 260 + Math.hypot(to.x - x0, to.z - z0) * 200).then(function () { A.userData.fighting = false; }); }
    var live = at.filter(function (a) { return a !== A && a.userData.home && !a.userData.dead && !a.userData.dying; });
    // Siegesmoment: Überlebende recken die Waffen, Kamera bleibt noch am Geschehen
    var beat = short ? Promise.resolve() : Promise.all(live.map(function (a, j) { walk(a, 0); return wait(j % 5 * 40).then(function () { self.skinShot(a, 'cheer3'); return act(a, -1.25, 200, null); }).then(function () { return act(a, -0.9, 260, null); }).then(function () { return act(a, -1.2, 200, null); }); }));
    return beat.then(function () {
      // Regiment steht ab jetzt schon auf dem Zielfeld; Soldaten, Gefallene und Fahne behalten ihre Weltposition und gehen von dort zu Fuß
      var kids = A.children.slice(), wpos = kids.map(function (c) { return c.getWorldPosition(new T.Vector3()); });
      A.position.x = to.x; A.position.z = to.z; A.updateMatrixWorld(true);
      kids.forEach(function (c, i) { var l = A.worldToLocal(wpos[i]); c.position.x = l.x; c.position.z = l.z; });
      var maxd = 0, tw = live.map(function (a) {
        var p0 = a.position.clone(), h = a.userData.home, m = a.userData.glb, f0 = m ? m.userData.face || 0 : 0, q0 = a.userData.q0 ? a.quaternion.clone() : null, u = U(a), a0 = u ? u.uAct.value : 0;
        var dd = Math.hypot(h.x - p0.x, h.z - p0.z), dur = (380 + dd * 1150 + Math.random() * 160) * sp; maxd = Math.max(maxd, dur);
        // Blick in Laufrichtung (wie tFace), am Ende wieder nach vorn
        var lf = dd > 0.04 ? Math.atan2(p0.x - h.x, p0.z - h.z) - ((m && m.userData.ry0 || 0) - Math.PI) : 0;
        while (lf - f0 > Math.PI) lf -= Math.PI * 2; while (lf - f0 < -Math.PI) lf += Math.PI * 2;
        a.userData.ox = a.userData.oz = 0;
        return self.tween(dur, function (k) {
          var e = k < 0.15 ? 0 : (k - 0.15) / 0.85; e = e * e * (3 - 2 * e);           // erst umdrehen, dann gleichmäßig gehen
          a.position.x = p0.x + (h.x - p0.x) * e; a.position.z = p0.z + (h.z - p0.z) * e; a.position.y = p0.y * (1 - Math.min(1, k * 3));
          if (m) m.userData.face = k < 0.15 ? f0 + (lf - f0) * k / 0.15 : k < 0.85 ? lf : lf * (1 - (k - 0.85) / 0.15);
          if (q0) a.quaternion.copy(q0).slerp(a.userData.q0, Math.min(1, k * 5)); if (u) { u.uAct.value = a0 * Math.max(0, 1 - k * 4); u.uWalk.value = dd > 0.04 && k > 0.1 && k < 0.92 ? Math.min(0.9, 0.35 + dd) : 0; }
        }).then(function () { if (u) u.uWalk.value = 0; if (m) m.userData.face = 0; a.userData.ang = 0; });
      });
      var bn = A.userData.banner; if (bn && bn.userData.home0) { var b0 = bn.position.clone(), bh = bn.userData.home0; tw.push(self.tween(Math.max(600, maxd * 0.9), function (k) { var e = ease(k); bn.position.x = b0.x + (bh.x - b0.x) * e; bn.position.z = b0.z + (bh.z - b0.z) * e; })); }
      wait(maxd * 0.3 / sp).then(function () { camBack(1500); });
      return Promise.all(tw).then(function () { A.userData.fighting = false; });
    });
  }
  // Truppen drehen sich zueinander, dann je nach Kampfstil
  if (!short) snd('horn', 0.7, 0);
  var face = Promise.all(at.map(function (a) { return tFace(a, dc.x, dc.z, 200); }).concat(dt.map(function (d) { return tFace(d, ac.x, ac.z, 240); })));
  var x0 = A.position.x, z0 = A.position.z, stopD = dist > 1.6 ? dist - 1.15 : Math.max(0, dist - 0.85), battle;
  function each(f) { return Promise.all(at.map(function (a, j) { return f(a, groups[j]); })); }
  if (style === 'magic' || style === 'shoot' || style === 'breath') battle = face.then(function () { if (!short && style === 'magic' && self.theme.id === 'feudal') snd('roar', 0.8, 0); return each(volley); });
  else if (style === 'leap') battle = face.then(function () { if (!short && self.theme.id === 'feudal') snd('roar', 0.8, 0); return each(leapAt); });
  else if (style === 'charge') battle = face.then(function () {
    snd('roar', 1, 0);
    return march(x0, z0, x0 - ux * 0.15, z0 - uz * 0.15, 200).then(function () { return march(x0 - ux * 0.15, z0 - uz * 0.15, x0 + ux * stopD, z0 + uz * stopD, 160 + stopD * 120, true); });
  }).then(impact).then(brawl);
  else battle = face.then(function () { if (!short) snd('roar', many ? 1 : 0.7, 0); return Promise.all(at.map(function (a, j) { return wait(j * 12).then(function () { return act(a, -1.1, 200, null); }); }).concat(dt.map(function (d, j) { return wait(60 + j * 15).then(function () { return act(d, -0.8, 200, null); }); }))); })
    .then(function () { return Promise.all([march(x0, z0, x0 + ux * stopD, z0 + uz * stopD, 160 + stopD * 200, true), meet(160 + stopD * 200)]); })
    .then(impact)
    .then(brawl);
  // Verteidiger stürmen ein Stück entgegen
  function meet(dur) {
    if (short) return Promise.resolve();
    var p0 = D.position.clone(); dt.forEach(function (d) { walk(d, 1); }); if (self.theme.id === 'feudal') snd('roar', 0.55, 1);
    return self.tween(dur * 0.7 * sp, function (k) { var e = k * k; D.position.x = p0.x - ux * 0.16 * e; D.position.z = p0.z - uz * 0.16 * e; }, dur * 0.3 * sp).then(function () { dt.forEach(function (d) { walk(d, 0); }); });
  }
  // Aufprall der Linien: Staubwall, Wackeln, kurze Zeitlupe, vordere Reihe wird gestaucht
  function impact() {
    snd('taiko', big ? 1 : 0.8); snd('clash', 0.9); if (!short) { self.slowmo(300, 0.25); snd('melee', many ? 4 : 2.5); } self.shakeAmt = Math.max(self.shakeAmt || 0, big ? 0.3 : 0.2);
    var c = centroid(dt), pxx = -uz, pzz = ux;
    for (var q = -3; q <= 3; q++) self.emit(c.x - ux * 0.25 + pxx * q * 0.13, BT + 0.05, c.z - uz * 0.25 + pzz * q * 0.13, dust, many ? 5 : 9, 1.4, 0.5);
    var front = 0; dt.forEach(function (d) { var w = wp(d), dd2 = (w.x - c.x) * ux + (w.z - c.z) * uz; if (dd2 < 0.05) { flash(d, 0.4); if (heavyA && style === 'charge' && front++ < Math.ceil(dt.length * 0.25) && dt.length > 1) dieT(d, ux, uz, false, true); else push(d, ux, uz, 0.05, 160); } });
    return wait(120);
  }
  return battle.then(function () {
    snd('bedStop');
    self.cineDrift = 0; self.hlGroup.visible = true; var mine = corpses.filter(function (c) { return at.indexOf(c) >= 0; }), theirs = corpses.filter(function (c) { return at.indexOf(c) < 0; });
    if (mine.length) bury(mine);
    if (theirs.length) { D.userData.corpseHold = true; D.traverse(function (c) { if (c.isMesh) c.raycast = function () { }; }); bury(theirs, function () { if (D.parent) self.pieceGroup.remove(D); }); }
    else if (D.parent) self.pieceGroup.remove(D);
    return reform();
  });
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
      g.fillStyle = KC[t >= 9 ? 1 : 0]; g.font = 'bold 112px "Noto Serif JP", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(kan, 128, 190);
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

Board3D.prototype.makePiece = function (p, cap) {
  var T = THREE, t = Math.abs(p), col = p > 0 ? 0 : 1, f = this.theme.factions[col], kanjiStyle = this.settings.pieceStyle === 'kanji';
  var g = new T.Group(); g.userData.p = p; if (cap) g.userData.cap = cap;
  // Statuen-Modus: Beförderung = Rot wie die roten Kanji echter Steine (Sockel in Zinnoberlack), Spielerfarbe bleibt Gold/Silber
  var statue = this.settings.figSet === 'statue', promoStatue = statue && t >= 9, ps = this.settings.promoStyle || 'lack';
  var ks = this.settings.komaStyle || 'stein';
  var army = statue && this.settings.army && this.settings.models !== false && this.quality === 'high' && !!this.figUrl(t, col);
  var bodyMat = statue ? this.komaMats(ks, col, promoStatue) : new T.MeshStandardMaterial({ color: kanjiStyle ? 0xe8c48a : (col === 0 ? 0x1d5e7a : 0x7a1d24), roughness: kanjiStyle ? 0.7 : 0.35, metalness: kanjiStyle ? 0 : 0.2, map: kanjiStyle ? Board3D._grain : null });
  var body = new T.Mesh(this.komaGeo, bodyMat); body.castShadow = true; body.receiveShadow = true; g.add(body);
  if (army) {
    // kein Stein: Regiment steht im Gelände, Kanji auf dem Feldzeichen (Standartenträger hinten), unsichtbarer Klickbereich
    g.remove(body);
    var hero = Board3D.armyHero(t), ban = this.armyBanner(t, col); ban.position.set(hero ? 0.3 : 0.06, 0, hero ? 0.22 : 0.42); ban.userData.home0 = ban.position.clone(); if (col === 1) ban.rotation.y = Math.PI; g.add(ban); g.userData.banner = ban;
    var hb = new T.Mesh(this._hitGeo || (this._hitGeo = new T.BoxGeometry(0.9, 0.5, 0.9)), this._hitMat || (this._hitMat = new T.MeshBasicMaterial())); hb.visible = false; hb.position.y = 0.25; g.add(hb);
  }
  var face = new T.Mesh(new T.PlaneGeometry(0.66, 0.66), new T.MeshStandardMaterial({ map: this.faceTexture(t, col), transparent: true, roughness: statue ? 0.35 : 0.5, metalness: statue && ks === 'stein' ? 0.8 : 0, emissive: 0xffffff, emissiveMap: this.faceTexture(t, col), emissiveIntensity: kanjiStyle ? 0 : statue ? (ks === 'stein' ? 0.18 : 0) : 0.35, depthWrite: false }));
  face.rotation.x = -Math.PI / 2; face.position.set(0, 0.225, 0.04); if (!army) g.add(face);
  if (statue && ks === 'stein' && !army) g.add(this.komaRim());
  if (!kanjiStyle && !statue) {
    var glow = new T.Mesh(new T.RingGeometry(0.4, 0.5, 5, 1, Math.PI / 2), new T.MeshBasicMaterial({ color: new T.Color(f.color), transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.01; g.add(glow);
  }
  if (promoStatue && ps === 'fahne' && !army) { var fl = this.promoFlag(); fl.position.set(0.3, 0.2, -0.28); if (col === 1) fl.rotation.y = Math.PI; g.add(fl); }
  if (this.settings.models !== false && this.quality === 'high') {
    var url = this.figUrl(t, col); if (army) url = url.replace(/\.glb$/, Board3D.armyHero(t) ? '_lo.glb' : '_lo2.glb');
    var skb = army && this.theme.id === 'feudal' && this.settings.skel !== false && window.SkinAnim && Board3D.SKIN[t], ska = skb ? SkinAnim.cached(skb) : null;
    if (ska === false) skb = null;
    var src = url && window.Models && Models.cached ? Models.cached(url) : null, put = army ? this.buildSquad.bind(this) : function (g, s, tt, c) { this.attachGlb(g, s, c); }.bind(this);
    if (!army && this.figSkinTry && this.figSkinTry(g, url, col)) { /* Statue mit Skelett (figanim.js) */ }
    else if (ska) this.buildSquad(g, ska.src, t, col, ska);
    else if (skb) {
      // Skelett-Modell nachladen, solange Platzhalter; schlägt es fehl, normales Statuen-Regiment
      var fig2 = Figures3D.build(T, t, col, f.color); fig2.position.set(0, 0.2, -0.02); fig2.scale.multiplyScalar(1.6); g.add(fig2); g.userData.fig = fig2;
      SkinAnim.load(skb).then(function (A2) { if (g.userData.fig === fig2) { g.remove(fig2); g.userData.fig = null; this.buildSquad(g, A2.src, t, col, A2); } }.bind(this))
        .catch(function () { if (g.userData.fig === fig2 && url) Models.load(url).then(function (sc) { if (g.userData.fig === fig2) { g.remove(fig2); g.userData.fig = null; this.buildSquad(g, sc, t, col); } }.bind(this)); }.bind(this));
    }
    else if (src) put(g, src, t, col);
    else if (!url && this.theme.id !== 'feudal') { /* Modell fehlt noch: nur Sockel mit Kanji */ }
    else {
      var fig = Figures3D.build(T, t, col, f.color); fig.position.set(0, 0.2, -0.02); fig.scale.multiplyScalar(1.6); g.add(fig); g.userData.fig = fig;
      // KI-Figur (TRELLIS.2) nachladen und den Platzhalter ersetzen
      if (url && src === null && window.Models && Models.load) Models.load(url).then(function (sc) { if (g.userData.fig === fig) { g.remove(fig); g.userData.fig = null; if (army) this.buildSquad(g, sc, t, col); else this.attachGlb(g, sc, col); } }.bind(this)).catch(function () {});
    }
  }
  // Gote zeigt zum Spieler (Sente)
  if (col === 1) g.rotation.y = Math.PI;
  return g;

};

Board3D.prototype.placePiece = function (g, sq) { var p = this.sqPos(sq); g.position.set(p.x, this.BT, p.z); };
Board3D.prototype.sync = function (state) {
  this.state = state;
  var grp = this.pieceGroup, mv = this._lastMove; this._lastMove = null;
  if (this.look !== 'feld') {
    // Figur mit Skelett, die gerade gezogen hat, bleibt stehen (ihr Clip läuft weiter), alle anderen werden neu aufgestellt
    var km = mv && mv.g && mv.g.userData.sk && mv.g.parent === grp && state.board[mv.to] === mv.g.userData.p ? mv.g : null;
    while (grp.children.length) { var c0 = grp.children[0]; grp.remove(c0); if (c0 !== km && this.figFree) this.figFree(c0); }
    this.pieces = {}; this._selG = null;
    for (var q = 0; q < 81; q++) { var p = state.board[q]; if (!p) continue; var g = km && q === mv.to ? km : this.makePiece(p); this.placePiece(g, q); grp.add(g); this.pieces[q] = g; }
    return;
  }
  // Armee-Modus: bestehende Regimenter bleiben (Formation, Verluste), nur Neues wird aufgestellt
  var cand = {}, k; for (k in this.pieces) cand[k] = this.pieces[k]; if (mv && mv.g) cand[mv.to] = mv.g;
  var keep = [], np = {};
  for (var q2 = 0; q2 < 81; q2++) {
    var p2 = state.board[q2]; if (!p2) continue; var g2 = cand[q2];
    if (!(g2 && g2.userData.p === p2 && g2.parent === grp && keep.indexOf(g2) < 0 && !g2.userData.fleeing)) {
      // befördertes Regiment: so viele Veteranen wie Überlebende, höchstens volle Stärke (kein Nachschub)
      var live = g2 && g2.parent === grp && g2.userData.troops && (g2.userData.p > 0) === (p2 > 0) ? g2.userData.troops.filter(function (tr) { return !tr.userData.dead && !tr.userData.dying; }).length : 0;
      g2 = this.makePiece(p2, live ? Math.max(1, live) : 0); grp.add(g2);
    }
    this.placePiece(g2, q2); keep.push(g2); np[q2] = g2;
  }
  grp.children.slice().forEach(function (c) { if (keep.indexOf(c) < 0 && !c.userData.corpseHold) grp.remove(c); }); // Besiegte liegen noch, bis sie eingesunken sind
  this.pieces = np;
  // Kameraflug nur zu Spielbeginn (noch kein Zug), höchstens alle 30 s (Neuaufbau beim Umstellen der Einstellungen)
  if (!this._introDone) { this._introDone = true; if (state.moves && !state.moves.length && (!Board3D._introT || performance.now() - Board3D._introT > 30000)) { Board3D._introT = performance.now(); this.armyIntro(); } }
};
Board3D.prototype.setHighlights = function (h) {
  this.hl = h || {}; h = this.hl;
  if (this.figSelect) this.figSelect(h.selected);
  if (this.look === 'feld') this.showTag(this.hoverSq != null ? this.hoverSq : h.selected);
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
  this.camera.aspect = w / h;
  // Schlachtfeld: Bild nach oben verschoben (mehr Himmel und Burg im Hintergrund, Armeen weiter unten), Perspektive bleibt gleich
  this._vw = [w, h]; if (this.viewShift == null) this.viewShift = 0.17;
  if (this.look === 'feld') this.camera.setViewOffset(w, h, 0, -h * this.viewShift, w, h); else this.camera.clearViewOffset();
  this.camera.updateProjectionMatrix();
  // Abstand so, dass das Brett (≈11 breit) ins Bild passt
  var vf = this.camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * this.camera.aspect);
  var need = Math.max(6.2 / Math.tan(hf / 2), 6.4 / Math.tan(vf / 2));
  this.orbit.fit = need; if (!this.orbit.user) this.orbit.radius = need;
};
Board3D.prototype.setFlip = function (f) { this.flip = !!f; this.orbit.thetaGoal = f ? Math.PI : 0; if (this.look === 'feld' && !this.orbit.user) this.orbit.target.z = f ? 1.2 : -1.2; };
Board3D.prototype.resetCamera = function () { this.orbit.user = false; this.orbit.radius = this.orbit.fit; this.orbit.phi = this.orbit.phi0 || 0.78; if (this.look === 'feld') this.orbit.target.set(0, 0, this.flip ? 1.2 : -1.2); this.orbit.thetaGoal = this.flip ? Math.PI : 0; };
Board3D.prototype.initInput = function () {
  var self = this, el = this.renderer.domElement, ptrs = {}, start = null, moved = false, pinch0 = 0, rad0 = 0;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', function (e) { el.setPointerCapture(e.pointerId); ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; var ids = Object.keys(ptrs); if (ids.length === 1) { start = { x: e.clientX, y: e.clientY, th: self.orbit.thetaGoal, ph: self.orbit.phi }; moved = false; } else if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); rad0 = self.orbit.radius; moved = true; } });
  el.addEventListener('pointermove', function (e) {
    self.lastInput = performance.now();
    if (!ptrs[e.pointerId]) { if (e.pointerType === 'mouse' && self.look === 'feld') self.hoverAt(e.clientX, e.clientY); return; } ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; var ids = Object.keys(ptrs);
    if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) { self.orbit.radius = Math.max(8, Math.min(self.maxR || 40, rad0 * pinch0 / d)); self.orbit.user = true; } return; }
    if (!start) return; var dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) > 10) moved = true;
    if (moved) { self.orbit.thetaGoal = start.th - dx * 0.008; self.orbit.theta = self.orbit.thetaGoal; self.orbit.phi = Math.max(0.12, Math.min(1.25, start.ph - dy * 0.006)); self.orbit.user = true; }
  });
  function up(e) { var was = ptrs[e.pointerId]; delete ptrs[e.pointerId]; if (!Object.keys(ptrs).length) { if (was && !moved && start) self.pick(e.clientX, e.clientY); start = null; pinch0 = 0; } }
  el.addEventListener('pointerup', up); el.addEventListener('pointerleave', function () { if (self.look === 'feld') self.hoverAt(null); }); el.addEventListener('pointercancel', function (e) { delete ptrs[e.pointerId]; start = null; });
  el.addEventListener('wheel', function (e) { e.preventDefault(); self.lastInput = performance.now(); self.orbit.radius = Math.max(8, Math.min(self.maxR || 40, self.orbit.radius * (1 + e.deltaY * 0.001))); self.orbit.user = true; }, { passive: false });
  el.addEventListener('dblclick', function () { self.resetCamera(); });
};
Board3D.prototype.pick = function (cx, cy) { var sq = this.pickSq(cx, cy); if (sq != null && this.onSquare) this.onSquare(sq); };
Board3D.prototype.pickSq = function (cx, cy) {
  var rect = this.renderer.domElement.getBoundingClientRect(), T = THREE;
  var ndc = new T.Vector2((cx - rect.left) / rect.width * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
  var ray = new T.Raycaster(); ray.setFromCamera(ndc, this.camera);
  // Erst Figuren (die Modelle ragen hoch), dann Brettebene
  var hits = ray.intersectObjects(this.pieceGroup.children, true);
  var x, z;
  if (hits.length) { var o = hits[0].object; while (o.parent && o.parent !== this.pieceGroup) o = o.parent; x = o.position.x; z = o.position.z; }
  else { var pl = new T.Plane(new T.Vector3(0, 1, 0), -this.BT), pt = new T.Vector3(); if (!ray.ray.intersectPlane(pl, pt)) return; x = pt.x; z = pt.z; }
  var c = Math.round(x + 4), r = Math.round(z + 4);
  if (c < 0 || c > 8 || r < 0 || r > 8) return null;
  return r * 9 + c;
};
// Armee-Modus: großes Kanji auf dem Feld des Regiments (Maus darüber oder ausgewählt), liegt flach am Boden und wird über die Soldaten gezeichnet
Board3D.prototype.showTag = function (sq) {
  if (this.hlGroup && !this.hlGroup.visible) sq = null; // während der Schlacht kein Schild
  var T = THREE, p = sq != null && sq >= 0 && this.state ? this.state.board[sq] : 0;
  if (!this.tag) {
    this.tag = new T.Mesh(new T.PlaneGeometry(0.98, 0.98), new T.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false }));
    this.tag.rotation.order = 'YXZ'; this.tag.renderOrder = 999; this.tag.visible = false; this.scene.add(this.tag); this.tagTex = {};
  }
  if (!p) { this.tag.visible = false; return; }
  var t = Math.abs(p), col = p > 0 ? 0 : 1, key = t + ':' + col, tex = this.tagTex[key];
  if (!tex) {
    var c = document.createElement('canvas'); c.width = c.height = 256; var x = c.getContext('2d');
    tex = this.tagTex[key] = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    var u = this.theme.units[t] || {}, kan = (t === 8 && col === 1 ? (u.kanji2 || u.kanji) : u.kanji) || '?';
    var ink = t >= 9 ? (col === 0 ? '#ff5a40' : '#e0241e') : col === 0 ? '#ffd76a' : '#ffffff', edge = col === 0 ? '#1a1206' : '#1b1b1b';
    var draw = function () {
      x.clearRect(0, 0, 256, 256); x.textAlign = 'center'; x.textBaseline = 'middle';
      var two = kan.length > 1; x.font = 'bold ' + (two ? 118 : 210) + 'px "Noto Serif JP", serif';
      x.lineJoin = 'round'; x.lineWidth = two ? 14 : 20; x.strokeStyle = edge; x.fillStyle = ink;
      (two ? [[kan[0], 72], [kan[1], 186]] : [[kan, 136]]).forEach(function (k) { x.strokeText(k[0], 128, k[1]); x.fillText(k[0], 128, k[1]); });
      tex.needsUpdate = true;
    };
    draw(); if (document.fonts) document.fonts.ready.then(draw);
  }
  if (this.tag.material.map !== tex) { this.tag.material.map = tex; this.tag.material.needsUpdate = true; }
  // flach auf dem Feld, Oberkante zeigt von der Kamera weg (lesbar aus Spielersicht)
  var q = this.sqPos(sq); this.tag.position.set(q.x, this.BT + 0.02, q.z); this.tag.rotation.set(-Math.PI / 2, this.orbit.thetaGoal || 0, 0); this.tag.material.opacity = 0.92; this.tag.visible = true;
};
Board3D.prototype.hoverAt = function (cx, cy) {
  var sq = cx == null ? null : this.pickSq(cx, cy);
  if (sq != null && !(this.state && this.state.board[sq])) sq = null;
  if (sq === this.hoverSq) return; this.hoverSq = sq;
  this.showTag(sq != null ? sq : this.hl && this.hl.selected);
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
  if (this.fieldU) { this.fieldTick(now, dt); if (this._vw && this.viewShift !== this._vsApplied) { this._vsApplied = this.viewShift; c.setViewOffset(this._vw[0], this._vw[1], 0, -this._vw[1] * this.viewShift, this._vw[0], this._vw[1]); c.updateProjectionMatrix(); } }
  if (this.hallSides) this.hallSides.forEach(function (h) { h.g.visible = c.position[h.axis] * h.sign < h.R - 0.6; });
  this.lanterns.forEach(function (l, i) { l.intensity = (l.userData.base || 1.6) + Math.sin(now / 90 + i * 3) * 0.15 + Math.random() * 0.2; });
  if (this.checkRing.visible) { var k = 1 + Math.sin(now / 120) * 0.15; this.checkRing.scale.set(k, k, k); this.checkRing.material.opacity = 0.6 + Math.sin(now / 120) * 0.3; }
  // Figuren-Details
  var t = now / 1000, me = this; Board3D.ARMY_TIME.value = t;
  this.pieceGroup.children.forEach(function (g) { if (g.userData.troops) me.armyIdle(g, t, dt); var fig = g.userData.fig, m = g.userData.glb, sd = g.position.x * 1.7 + g.position.z; if (fig) Figures3D.animate(fig, t, sd); if (m) m.rotation.y = (m.userData.ry0 || 0) + (m.userData.face || 0); if (g.userData.sk) me.figTick(g); });
  // Tweens (laufen auf einer eigenen Uhr, damit Zeitlupe geht)
  var self = this;
  if (this.slowUntil && now > this.slowUntil) { this.timeScale = 1; this.slowUntil = 0; }
  var ts = this.timeScale || 1, vt = this.vt = (this.vt == null ? now : this.vt + dt * ts);
  if (window.SkinAnim) SkinAnim.time.value = vt / 1000;
  if (this.cineDrift) o.thetaGoal += dt * this.cineDrift;
  // Tweens, die während des Durchlaufs entstehen (z. B. Tod im Gemenge), landen im neuen Array und gehen nicht verloren
  var list = this.tweens; this.tweens = [];
  var keep = list.filter(function (tw) {
    if (tw.forever) { tw.f(now); return true; }
    if (tw.start == null) tw.start = vt;
    var k = Math.min(1, (vt - tw.start) / tw.dur);
    if (k >= 0) tw.f(k);
    if (k >= 1) { tw.done && tw.done(); return false; }
    return true;
  });
  this.tweens = keep.concat(this.tweens);
  this.updateParticles(dt * ts);
  if (this.armyPools) this.armyDraw();
  if (this.petals) this.updatePetals(dt, now);
};
Board3D.prototype.tween = function (dur, f, delay) { var self = this; return new Promise(function (res) { self.tweens.push({ dur: dur, f: f, done: res, start: delay ? (self.vt || performance.now()) + delay : null }); }); };
Board3D.prototype.slowmo = function (ms, scale) { this.timeScale = scale; this.slowUntil = performance.now() + ms; };

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
    if (this.look === 'feld') { this._lastMove = { g: mover, to: info.to }; return this.armyDrop(mover, info.col, to).then(function () { self.sync(after); }); } // Armee: aus dem Lager anmarschieren
    from = { x: to.x, z: to.z, y: this.BT + 7 };
    // Lichtsäule (Beschwörung)
    var beam = new T.Mesh(new T.CylinderGeometry(0.45, 0.45, 14, 16, 1, true), new T.MeshBasicMaterial({ color: new T.Color(f.color), transparent: true, opacity: 0.0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    beam.position.set(to.x, this.BT + 7, to.z); this.scene.add(beam);
    this.tween(700, function (k) { beam.material.opacity = Math.sin(k * Math.PI) * 0.45; beam.scale.x = beam.scale.z = 1 - k * 0.6; }).then(function () { self.scene.remove(beam); });
  } else { mover = this.pieces[info.from]; var fp = this.sqPos(info.from); from = { x: fp.x, z: fp.z, y: this.BT }; }
  delete this.pieces[info.from]; this._lastMove = { g: mover, to: info.to };
  function promoFx() {
    if (!info.promo) return;
    // Beförderung: Stein hebt ab, dreht sich um (wie echter Koma), Lichtsäule
    var pillar = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 10, 16, 1, true), new T.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    pillar.position.set(to.x, self.BT + 5, to.z); self.scene.add(pillar);
    self.tween(900, function (k) { pillar.material.opacity = Math.sin(k * Math.PI) * 0.55; }).then(function () { self.scene.remove(pillar); });
    if (mover.userData.troops || self.look === 'feld') return self.tween(450, function () { }).then(function () { self.emit(to.x, self.BT + 0.3, to.z, 0xffd76a, 50, 2.5, 1.2); });
    if (mover.userData.sk) return self.figPromo(mover, after.board[info.to], to).then(function (np) { mover = np; }); // Statue mit Skelett: Jubel statt Umdrehen
    return self.tween(220, function (k) { mover.position.y = self.BT + k * 0.9; mover.rotation.z = k * Math.PI / 2; }).then(function () {
      var np = self.makePiece(after.board[info.to]); np.position.copy(mover.position); np.rotation.z = -Math.PI / 2; self.pieceGroup.remove(mover); self.pieceGroup.add(np); mover = np;
      self.emit(to.x, self.BT + 0.9, to.z, 0xffd76a, 80, 4, 1.4);
      return self.tween(300, function (k) { np.position.y = self.BT + 0.9 * (1 - k); np.rotation.z = -Math.PI / 2 * (1 - k); });
    });
  }
  // Schlagen = Kampf (Battle-Chess-Stil), außer abgeschaltet
  if (capG && !info.drop && (this.settings.fights || 'voll') !== 'aus') {
    info.usesHit = true;
    var army = mover.userData.troops || capG.userData.troops;
    var fst = this.fightStyle(Shogi && info.promo ? (Shogi.BASE[Math.abs(after.board[info.to])] || 0) : after.board[info.to]);
    return (army ? this.armyFight(info, mover, from, to, capG, fst) : mover.userData.sk ? this.figFight(info, mover, from, to, capG, fst) : this.fight(info, mover, from, to, capG)).then(promoFx).then(function () { self.sync(after); });
  }
  var dist = Math.hypot(to.x - from.x, to.z - from.z), dur = info.drop ? 380 : 230 + dist * 45, height = info.drop ? 0 : 0.5 + dist * 0.12;
  // Armee: Regiment läuft über den Boden (umdrehen, laufen, wieder nach vorn) statt wie ein Spielstein zu hüpfen
  if (!info.drop && mover.userData.troops && !capG) return this.armyRun(mover, from, to).then(promoFx).then(function () { self.sync(after); });
  // Statue mit Skelett geht/läuft hinüber; ohne Kampf fliegt die geschlagene Figur kurz vor der Ankunft weg
  if (!info.drop && mover.userData.sk) return this.figWalk(mover, from, to, capG && function () {
    self.shakeAmt = 0.3; self.emit(to.x, self.BT + 0.3, to.z, f.color, 60, 5, 1.2); var side = info.col === 0 ? 1 : -1, cs = capG.position.clone();
    return self.tween(450, function (k) { capG.position.set(cs.x + (6.5 * side - cs.x) * k, cs.y + Math.sin(k * Math.PI) * 3, cs.z + (4 * side - cs.z) * k); capG.rotation.x = k * 8; capG.scale.setScalar(1 - k * 0.7); }).then(function () { self.pieceGroup.remove(capG); });
  }).then(promoFx).then(function () { self.sync(after); });
  return this.tween(dur, function (k) {
    var e = info.drop ? k * k : (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    mover.position.x = from.x + (to.x - from.x) * e; mover.position.z = from.z + (to.z - from.z) * e;
    mover.position.y = info.drop ? from.y + (self.BT - from.y) * e : self.BT + Math.sin(k * Math.PI) * height;
    if (info.drop) mover.rotation.y = (info.col === 1 ? Math.PI : 0) + (1 - k) * 6;
  }).then(function () {
    if (info.drop) { mover.rotation.y = info.col === 1 ? Math.PI : 0; if (self.figLand) self.figLand(mover); }
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
  }).then(promoFx).then(function () { self.sync(after); });
};

// ---------- Kampf beim Schlagen ----------
// Die Modelle sind starre Statuen (keine Knochen), darum wird der Kampf über den ganzen Körper inszeniert:
// zueinander drehen, ausholen, zustoßen, Gegenschlag parieren, Todesstoß, Umkippen und zu Staub zerfallen.
Board3D.FIGHT = { 1: 'melee', 2: 'thrust', 3: 'leap', 4: 'melee', 5: 'melee', 6: 'magic', 7: 'charge', 8: 'melee', 9: 'melee', 10: 'thrust', 11: 'leap', 12: 'melee', 13: 'charge', 14: 'breath' };
Board3D.FIGHT_ED = { mecha: { 1: 'shoot', 7: 'shoot', 14: 'shoot' }, fantasy: { 3: 'leap' }, hunde: { 6: 'leap' } };
Board3D.DUST = { gold: 0xffd76a, silber: 0xdfe6ee, bronze: 0xc8803a, jade: 0x7fd6a8, lack: 0xd23a2a };
Board3D.prototype.fightStyle = function (p) {
  var t = Math.abs(p), ed = Board3D.FIGHT_ED[this.theme.id] || {};
  return ed[t] || Board3D.FIGHT[t] || 'melee';
};
Board3D.prototype.dustColor = function (col) {
  var m = this.settings.figSet === 'statue' && (this.settings.statueMats || [])[col];
  return Board3D.DUST[m] || new THREE.Color(this.theme.factions[col].color).getHex();
};
// Modell (nicht den Sockel) zum Punkt drehen; die Leerlauf-Animation addiert userData.face
Board3D.prototype.faceTo = function (g, x, z, dur) {
  var m = g.userData.glb; if (!m) return Promise.resolve();
  var r = g.rotation.y, wx = x - g.position.x, wz = z - g.position.z;
  var lx = wx * Math.cos(r) - wz * Math.sin(r), lz = wx * Math.sin(r) + wz * Math.cos(r);
  var goal = Math.atan2(-lx, -lz), a0 = m.userData.face || 0;
  while (goal - a0 > Math.PI) goal -= Math.PI * 2; while (goal - a0 < -Math.PI) goal += Math.PI * 2;
  return this.tween(dur || 160, function (k) { m.userData.face = a0 + (goal - a0) * (1 - Math.pow(1 - k, 3)); });
};
// Ganzen Körper zur Richtung (dx,dz) neigen (Drehpunkt = Standfläche)
// Zug ohne Kampf im Armee-Modus: alle drehen sich in Zugrichtung, das Regiment läuft hinüber, am Ziel wieder Front nach vorn
Board3D.prototype.armyRun = function (g, from, to) {
  var self = this, dx = to.x - from.x, dz = to.z - from.z, dist = Math.hypot(dx, dz) || 1e-4;
  var dur = 520 + Math.min(dist, 3) * 430 + Math.max(0, dist - 3) * 190, r = g.rotation.y;
  var sol = (g.userData.troops || []).filter(function (s) { return !s.userData.dead && !s.userData.dying; }).map(function (s) {
    var m = s.userData.glb, rr = r + s.rotation.y, lx = dx * Math.cos(rr) - dz * Math.sin(rr), lz = dx * Math.sin(rr) + dz * Math.cos(rr);
    var f0 = m ? m.userData.face || 0 : 0, goal = Math.atan2(-lx, -lz) - ((m && m.userData.ry0 || 0) - Math.PI);
    while (goal - f0 > Math.PI) goal -= Math.PI * 2; while (goal - f0 < -Math.PI) goal += Math.PI * 2;
    return { s: s, m: m, f0: f0, goal: goal, u: s.userData.u, lag: Math.random() * 0.05 };
  });
  g.userData.marching = true;
  if (typeof Sfx !== 'undefined') Sfx.play('march', dur, this.theme.id === 'feudal' ? Math.abs(g.userData.p || 0) : null);
  function sm(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  return this.tween(dur, function (k) {
    var e = sm((k - 0.14) / 0.72);
    g.position.x = from.x + dx * e; g.position.z = from.z + dz * e; g.position.y = self.BT;
    sol.forEach(function (o) {
      var kk = Math.max(0, Math.min(1, k - o.lag)), turn = kk < 0.16 ? sm(kk / 0.16) : kk > 0.84 ? 1 - sm((kk - 0.84) / 0.16) : 1;
      if (o.m) o.m.userData.face = kk > 0.84 ? o.goal * turn : o.f0 + (o.goal - o.f0) * turn;
      if (o.u) o.u.uWalk.value = kk < 0.12 || kk > 0.88 ? 0.5 : 1;
    });
  }).then(function () {
    sol.forEach(function (o) { if (o.m) o.m.userData.face = 0; if (o.u) o.u.uWalk.value = 0; });
    g.userData.marching = false;
  });
};
// ---------- Shogi-Momente im Armee-Modus (nur Optik, Regeln unverändert) ----------
// Abwurf: das Regiment marschiert aus dem eigenen Feldlager auf sein Feld (Staub, kurzes Horn)
Board3D.prototype.armyDrop = function (g, col, to) {
  var self = this, side = col === 0 ? 1 : -1, from = { x: (to.x < 0 ? -1 : 1) * 6.8, z: side * 7.9 }; // aus der näheren Zeltreihe, damit der Anmarsch im Bild ist
  g.position.set(from.x, this.BT, from.z);
  var t = Math.abs(g.userData.p || 0), dust = this.dustColor(col), last = 0;
  if (typeof Sfx !== 'undefined') Sfx.play('horn', 0.35, this.theme.id === 'feudal' ? t : null);
  var run = this.armyRun(g, from, to);
  this.tween(2600, function (k) { var now = performance.now(); if (now - last < (self.mobile ? 220 : 110) || g.userData.marching === false && k > 0.2) return; last = now; self.emit(g.position.x, self.BT + 0.05, g.position.z, dust, self.mobile ? 4 : 8, 0.9, 0.35); });
  return run;
};
// Schach: Horn, Banner des Königs blinkt rot, eigene Regimenter neben dem König rücken an ihn heran (und nach kurzer Zeit zurück)
Board3D.prototype.armyCheck = function (sq) {
  var self = this, K = this.pieces[sq]; if (!K || !K.userData.banner) return;
  var kp = K.userData.p, cell = Math.hypot(this.sqPos(1).x - this.sqPos(0).x, this.sqPos(1).z - this.sqPos(0).z) || 1;
  if (typeof Sfx !== 'undefined') Sfx.play('horn', 0.6, this.theme.id === 'feudal' ? 8 : null);
  var fm = K.userData.banner.userData.piv.children[0].material;
  this.tween(1600, function (k) { var v = Math.max(0, Math.sin(k * Math.PI * 4)) * (1 - k * 0.5); fm.emissive.setRGB(v * 0.9, v * 0.05, 0); }).then(function () { fm.emissive.setRGB(0, 0, 0); });
  var kw = K.position;
  Object.keys(this.pieces).forEach(function (q) {
    var g = self.pieces[q]; if (g === K || !g.userData.troops || (g.userData.p > 0) !== (kp > 0) || g.userData.marching || g.userData.fighting) return;
    if (Math.abs(g.position.x - kw.x) > cell * 1.5 || Math.abs(g.position.z - kw.z) > cell * 1.5) return;
    var kl = g.worldToLocal(kw.clone()), d = Math.hypot(kl.x, kl.z) || 1, sx = kl.x / d * cell * 0.22, sz = kl.z / d * cell * 0.22;
    self.armyShift(g, sx, sz, 600).then(function () { return self.tween(2200, function () { }); }).then(function () { if (g.parent) self.armyShift(g, -sx, -sz, 900); });
  });
};
// ganzes Regiment um (sx, sz) lokal verschieben, Soldaten gehen dabei und blicken in Gehrichtung
Board3D.prototype.armyShift = function (g, sx, sz, ms) {
  var r = g.rotation.y, sol = g.userData.troops.filter(function (s) { return !s.userData.dead && !s.userData.dying; }).map(function (s) {
    var u = s.userData, m = u.glb, rr = s.rotation.y, lx = sx * Math.cos(rr) - sz * Math.sin(rr), lz = sx * Math.sin(rr) + sz * Math.cos(rr);
    return { s: s, u: u, m: m, x0: s.position.x, z0: s.position.z, hx: u.home.x, hz: u.home.z, goal: Math.atan2(-lx, -lz) - ((m && m.userData.ry0 || 0) - Math.PI) };
  });
  var bn = g.userData.banner, bx = bn ? bn.position.x : 0, bz = bn ? bn.position.z : 0;
  g.userData.marching = true;
  return this.tween(ms, function (k) {
    var e = k * k * (3 - 2 * k), turn = Math.sin(k * Math.PI);
    if (bn) bn.position.set(bx + sx * e, bn.position.y, bz + sz * e);
    sol.forEach(function (o) { o.s.position.x = o.x0 + sx * e; o.s.position.z = o.z0 + sz * e; o.u.u.uWalk.value = k < 0.9 ? 0.5 : 0; if (o.m) o.m.userData.face = o.goal * turn; });
  }).then(function () {
    sol.forEach(function (o) { o.u.home.x = o.hx + sx; o.u.home.z = o.hz + sz; o.u.ox = o.u.oz = 0; o.u.u.uWalk.value = 0; if (o.m) o.m.userData.face = 0; });
    g.userData.marching = false;
  });
};
// Matt oder Aufgabe: Verlierer drehen um und fliehen zum eigenen Lager, Sieger jubeln
Board3D.prototype.armyEnd = function (winner) {
  if (this.look !== 'feld') return;
  var self = this, T = THREE, wp = new T.Vector3();
  if (typeof Sfx !== 'undefined') setTimeout(function () { Sfx.play('cheer', 0.9); }, 900);
  this.pieceGroup.children.forEach(function (g, gi) {
    if (!g.userData.troops) return;
    var col = g.userData.p > 0 ? 0 : 1, live = g.userData.troops.filter(function (s) { return !s.userData.dead && !s.userData.dying; });
    if (col === winner) {
      // Jubel: Skelett-Soldaten spielen Cheer-Clips in Wellen, Statuen hüpfen
      live.forEach(function (s) {
        var u = s.userData, n = 0;
        (function again() { if (n++ > 2 || !s.parent) return; self.tween(250 + Math.random() * 900, function () { }).then(function () {
          if (u.skin) { self.skinShot(s, ['cheer1', 'cheer2', 'cheer3']); return self.tween(u.skin.dur.cheer1 * 900 || 1500, function () { }); }
          var y0 = s.position.y; return self.tween(380, function (k) { s.position.y = y0 + Math.sin(k * Math.PI) * 0.08; });
        }).then(again); })();
      });
      return;
    }
    // Flucht: jeder dreht sich weg vom Feld und rennt zum eigenen Lagerrand, verteilt sich, verschwindet in der Ferne
    var side = col === 0 ? 1 : -1, r = g.rotation.y; g.userData.marching = true; g.userData.fleeing = true;
    var sol = live.map(function (s) {
      s.getWorldPosition(wp); var tx = wp.x * 1.3 + (Math.random() - .5) * 5, tz = side * (11 + Math.random() * 6);
      var tl = g.worldToLocal(new T.Vector3(tx, wp.y, tz)), dx = tl.x - s.position.x, dz = tl.z - s.position.z, rr = s.rotation.y;
      var lx = dx * Math.cos(rr) - dz * Math.sin(rr), lz = dx * Math.sin(rr) + dz * Math.cos(rr), m = s.userData.glb;
      return { s: s, u: s.userData, m: m, x0: s.position.x, z0: s.position.z, dx: dx, dz: dz, goal: Math.atan2(-lx, -lz) - ((m && m.userData.ry0 || 0) - Math.PI), lag: Math.random() * 0.25 + gi % 3 * 0.05, sp: 0.8 + Math.random() * 0.35 };
    });
    var ban = g.userData.banner, bdx = Math.random() - .5, bdz = side;
    self.tween(4200, function (k) {
      sol.forEach(function (o) {
        var kk = Math.max(0, (k - o.lag) / (1 - o.lag)), turn = Math.min(1, kk * 6), mv = Math.max(0, kk - 0.08) * o.sp;
        if (o.m) o.m.userData.face = o.goal * turn;
        o.u.u.uWalk.value = kk > 0.05 ? 1 : 0.4; o.s.position.x = o.x0 + o.dx * mv; o.s.position.z = o.z0 + o.dz * mv;
        if (mv > 0.85) o.s.visible = false;
      });
      if (ban) self.lean(ban, bdx, bdz, Math.min(1, k * 4) * Math.min(1, k * 4) * 1.5); // Fahne wird fallen gelassen
    });
  });
};
// Kameraflug zum Spielstart: hoch über Gote, tief und seitlich über beide Armeen, Landung in der Spielansicht; Antippen überspringt
Board3D.prototype.armyIntro = function () {
  var self = this, o = this.orbit, end = null, vs = this.viewShift;
  var el = this.renderer.domElement, fn, stop = function () { self.tweens.forEach(function (tw) { if (tw.f === fn) tw.start = -1e12; }); };
  el.addEventListener('pointerdown', stop, { once: true });
  function sm(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  this.introOn = true;
  return this.tween(this.mobile ? 6000 : 7000, fn = function (k) {
    if (!end) end = { x: o.target.x, y: o.target.y, z: o.target.z, r: o.user ? o.radius : o.fit || o.radius, ph: o.phi0 || o.phi, th: o.thetaGoal }; // Zielansicht erst im ersten Bild (Kamera ist dann eingepasst)
    // drei Stationen: hoch hinter dem Gegner, tief seitlich über der Mitte, Spielansicht
    var a = sm(k / 0.5), b = sm((k - 0.5) / 0.5), gs = end.th ? 1 : -1; // gs: Seite des Gegners (Start hinter seiner Armee)
    o.target.x = end.x; o.target.y = end.y; o.target.z = lerp(lerp(gs * 2.5, 0, a), end.z, b);
    o.radius = lerp(lerp(Math.min(end.r * 1.8, 26), Math.min(end.r * 0.85, 11), a), end.r, b); // feste Obergrenzen: hochkant ist end.r größer, sonst ginge der Flug durch den Wald o.phi = lerp(lerp(0.8, 1.3, a), end.ph, b);
    o.theta = o.thetaGoal = lerp(lerp(end.th + Math.PI - 0.35, end.th + 1.35, a), end.th, b); self.viewShift = vs * b;
  }).then(function () { el.removeEventListener('pointerdown', stop); self.introOn = false; o.target.set(end.x, end.y, end.z); o.radius = end.r; o.phi = end.ph; o.theta = o.thetaGoal = end.th; self.viewShift = vs; });
};
Board3D.prototype.lean = function (g, dx, dz, ang) {
  var q0 = g.userData.q0 || (g.userData.q0 = g.quaternion.clone()), L = Math.hypot(dx, dz) || 1;
  var ax = new THREE.Vector3(dz / L, 0, -dx / L);
  g.quaternion.setFromAxisAngle(ax, ang).multiply(q0);
};
// Partikel mit Richtung (für Feueratem, Schüsse, Magiespur)
Board3D.prototype.emitDir = function (x, y, z, color, n, vx, vy, vz, spread) {
  var col = new THREE.Color(color);
  for (var k = 0; k < n; k++) {
    var i = this.pi = (this.pi + 1) % this.pN;
    this.pPos[i * 3] = x; this.pPos[i * 3 + 1] = y; this.pPos[i * 3 + 2] = z;
    this.pVel[i * 3] = vx + (Math.random() - .5) * spread; this.pVel[i * 3 + 1] = vy + (Math.random() - .5) * spread + 1.2; this.pVel[i * 3 + 2] = vz + (Math.random() - .5) * spread;
    this.pLife[i] = 1; this.pBase[i * 3] = col.r; this.pBase[i * 3 + 1] = col.g; this.pBase[i * 3 + 2] = col.b;
  }
};
Board3D.prototype.fight = function (info, A, from, to, D) {
  var self = this, T = THREE, short = this.settings.fights === 'kurz', sp = short ? 0.65 : 1;
  // Kampfstil nach Angreifer-Typ (vor einer Beförderung)
  var pt = Math.abs(info.state.board[info.to]); if (info.promo && typeof Shogi !== 'undefined') pt = Shogi.BASE[pt] || pt;
  var style = this.fightStyle(pt);
  var dx = to.x - from.x, dz = to.z - from.z, dist = Math.hypot(dx, dz) || 1, ux = dx / dist, uz = dz / dist;
  var cell = Math.hypot(this.sqPos(1).x - this.sqPos(0).x, this.sqPos(1).z - this.sqPos(0).z) || 1;
  var BT = this.BT, head = BT + 0.95, colA = new T.Color(this.theme.factions[info.col].color).getHex(), dust = this.dustColor(1 - info.col);
  var big = Math.abs(info.cap) >= 6;
  function snd(n, a) { if (typeof Sfx !== 'undefined') Sfx.play(n, a); }
  function wait(ms) { return self.tween(ms * sp, function () { }); }
  function ease(k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  // Kamera rückt näher an den Kampf
  var o = this.orbit, cam0 = { x: o.target.x, z: o.target.z, r: o.radius }, mx = (from.x + to.x) / 2, mz = (from.z + to.z) / 2;
  if (!short) this.tween(420, function (k) { var e = ease(k); o.target.x = cam0.x + (mx - cam0.x) * e * 0.85; o.target.z = cam0.z + (mz - cam0.z) * e * 0.85; o.radius = cam0.r * (1 - 0.3 * e); });
  function camBack() { if (short) return; var c1 = { x: o.target.x, z: o.target.z, r: o.radius }; self.tween(600, function (k) { var e = ease(k); o.target.x = c1.x + (cam0.x - c1.x) * e; o.target.z = c1.z + (cam0.z - c1.z) * e; o.radius = c1.r + (cam0.r - c1.r) * e; }); }
  // Treffer: Funken, Ruck, Kamerawackler
  function hit(x, z, color, n, shake) { self.emit(x, BT + 0.7, z, color, n, 4, 1.1); self.emit(x, BT + 0.7, z, 0xffffff, n / 3, 2.5, 1.3); self.shakeAmt = Math.max(self.shakeAmt || 0, shake); }
  // Verteidiger stirbt: kippt vom Angreifer weg um, zerfällt zu Staub
  function die() {
    if (info.onHit) info.onHit();
    hit(to.x, to.z, colA, big ? 90 : 60, big ? 0.5 : 0.35);
    if (D.userData.sk) return self.figDie(D, dust, sp, ux, uz); // Verteidiger mit Skelett: Sterbe-Animation
    var p0 = D.position.clone();
    return self.tween(420 * sp, function (k) { var e = k * k; self.lean(D, ux, uz, e * 1.45); D.position.x = p0.x + ux * e * 0.35; D.position.z = p0.z + uz * e * 0.35; }).then(function () {
      snd('crumble'); self.shakeAmt = Math.max(self.shakeAmt || 0, 0.15);
      for (var i = 0; i < 4; i++) self.emit(D.position.x + ux * i * 0.18, BT + 0.15 + i * 0.08, D.position.z + uz * i * 0.18, dust, 28, 1.6, 0.9);
      return self.tween(320 * sp, function (k) { D.scale.setScalar(1 - k); D.position.y = p0.y - k * 0.3; });
    }).then(function () { self.pieceGroup.remove(D); });
  }
  // Angreifer zieht aufs Feld und richtet sich wieder auf
  function stepIn(x0, z0, dur) {
    var y0 = A.position.y;
    return self.tween((dur || 260) * sp, function (k) { var e = ease(k); A.position.x = x0 + (to.x - x0) * e; A.position.z = z0 + (to.z - z0) * e; A.position.y = BT + (y0 - BT) * (1 - e) + Math.sin(k * Math.PI) * 0.15; self.lean(A, ux, uz, (A.userData.ang || 0) * (1 - e)); })
      .then(function () { A.userData.ang = 0; A.quaternion.copy(A.userData.q0 || A.quaternion); var m = A.userData.glb; if (m) { var a0 = m.userData.face || 0; return self.tween(200, function (k) { m.userData.face = a0 * (1 - k); }); } })
      .then(function () { camBack(); self.emit(to.x, BT + 0.05, to.z, 0xd8c8a0, 10, 1.2, 0.3); });
  }
  // Anlauf zu einem Punkt vor dem Gegner
  function approach(px, pz, dur, hop) {
    return self.tween(dur * sp, function (k) { var e = ease(k); A.position.x = from.x + (px - from.x) * e; A.position.z = from.z + (pz - from.z) * e; A.position.y = BT + Math.sin(k * Math.PI) * (hop || 0.2); });
  }
  function leanA(ang, dur, push) {
    var a0 = A.userData.ang || 0, x0 = A.position.x, z0 = A.position.z;
    return self.tween(dur * sp, function (k) { var e = ease(k); A.userData.ang = a0 + (ang - a0) * e; self.lean(A, ux, uz, A.userData.ang); if (push) { A.position.x = x0 + ux * push * e; A.position.z = z0 + uz * push * e; } });
  }
  function leanD(ang, dur, push) {
    var a0 = D.userData.ang || 0, x0 = D.position.x, z0 = D.position.z;
    return self.tween(dur * sp, function (k) { var e = ease(k); D.userData.ang = a0 + (ang - a0) * e; self.lean(D, ux, uz, D.userData.ang); if (push) { D.position.x = x0 + ux * push * e; D.position.z = z0 + uz * push * e; } });
  }
  var face = Promise.all([this.faceTo(A, to.x, to.z), this.faceTo(D, from.x, from.z)]);

  if (style === 'magic' || style === 'shoot' || style === 'breath') {
    // Fernkampf: aus der Distanz, dann aufs Feld
    var bolt = null;
    return face.then(function () { snd('whoosh'); return leanA(-0.22, 260); }).then(function () {
      if (style === 'magic') {
        snd('zap');
        bolt = new T.Mesh(new T.SphereGeometry(0.16, 12, 8), new T.MeshBasicMaterial({ color: colA, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false }));
        self.scene.add(bolt);
        return Promise.all([leanA(0.18, 160), self.tween((300 + dist * 40) * sp, function (k) {
          var x = from.x + dx * k, z = from.z + dz * k, y = head + Math.sin(k * Math.PI) * 0.8;
          bolt.position.set(x, y, z); bolt.scale.setScalar(1 + Math.sin(k * 30) * 0.2);
          self.emitDir(x, y, z, colA, 3, 0, 0, 0, 0.6);
        })]).then(function () { self.scene.remove(bolt); });
      }
      if (style === 'shoot') {
        var shots = short ? 2 : 3, chain = Promise.resolve();
        for (var s = 0; s < shots; s++) chain = chain.then(function () {
          snd('zap'); hit(to.x - ux * 0.2, to.z - uz * 0.2, 0xffe08a, 18, 0.12);
          for (var j = 0; j < 8; j++) { var q = j / 8; self.emitDir(from.x + dx * q, head - 0.1, from.z + dz * q, 0xfff0a0, 2, ux * 2, -1, uz * 2, 0.3); }
          return Promise.all([leanA(-0.12, 60), leanD(-0.14, 90)]).then(function () { return Promise.all([leanA(0, 90), leanD(0, 90)]); });
        });
        return chain;
      }
      // Feueratem
      snd('fire');
      return self.tween(700 * sp, function (k) {
        var v = 6.5;
        self.emitDir(from.x + ux * 0.4, head, from.z + uz * 0.4, k < .5 ? 0xffb030 : 0xff5a20, 6, ux * v, -0.8, uz * v, 1.4);
        self.lean(D, ux, uz, -0.12 + Math.sin(k * 40) * 0.05);
      });
    }).then(die).then(function () { return stepIn(A.position.x, A.position.z, 200 + dist * 40); });
  }

  if (style === 'leap') {
    // Sprung: hoch in die Luft, landet auf dem Gegner
    var x0 = A.position.x, z0 = A.position.z;
    return face.then(function () { return leanA(-0.2, 180); }).then(function () {
      snd('whoosh');
      return self.tween((380 + dist * 30) * sp, function (k) {
        var stopK = 1 - 0.45 * cell / dist, e = k * stopK;
        A.position.x = x0 + dx * e; A.position.z = z0 + dz * e; A.position.y = BT + Math.sin(k * Math.PI) * (1.6 + dist * 0.15) + k * 0.5;
        self.lean(A, ux, uz, -0.2 + k * 0.6); A.userData.ang = -0.2 + k * 0.6;
        if (k > .55) { D.userData.ang = -(k - .55) * 0.5; self.lean(D, ux, uz, D.userData.ang); }
      });
    }).then(function () {
      snd('clash'); self.emit(to.x, BT + 0.05, to.z, 0xd8c8a0, 40, 3, 0.4);
      var ring = new T.Mesh(new T.RingGeometry(0.2, 0.32, 32), new T.MeshBasicMaterial({ color: colA, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(to.x, BT + 0.05, to.z); self.scene.add(ring);
      self.tween(500, function (k) { ring.scale.setScalar(1 + k * 6); ring.material.opacity = 0.8 * (1 - k); }).then(function () { self.scene.remove(ring); });
      return wait(60);
    }).then(die).then(function () { return stepIn(A.position.x, A.position.z, 220); });
  }

  if (style === 'charge') {
    // Ansturm: kurz zurücksetzen, dann volle Wucht
    var sx = to.x - ux * cell * 0.55, sz = to.z - uz * cell * 0.55, bx = from.x - ux * 0.25, bz = from.z - uz * 0.25;
    return face.then(function () {
      return self.tween(220 * sp, function (k) { var e = ease(k); A.position.x = from.x + (bx - from.x) * e; A.position.z = from.z + (bz - from.z) * e; A.userData.ang = -0.18 * e; self.lean(A, ux, uz, A.userData.ang); });
    }).then(function () {
      snd('whoosh');
      return self.tween((160 + dist * 32) * sp, function (k) { var e = k * k; A.position.x = bx + (sx - bx) * e; A.position.z = bz + (sz - bz) * e; A.position.y = BT + Math.abs(Math.sin(k * Math.PI * 4)) * 0.08; A.userData.ang = -0.18 + 0.5 * k; self.lean(A, ux, uz, A.userData.ang); if (k > .3) self.emit(A.position.x, BT + 0.05, A.position.z, 0xd8c8a0, 1, 0.6, 0.3); });
    }).then(function () { snd('clash'); return wait(70); }).then(die).then(function () { return stepIn(A.position.x, A.position.z, 200); });
  }

  // Nahkampf (melee / thrust): Schlagabtausch mit Gegenschlag
  var stx = to.x - ux * cell * 0.62, stz = to.z - uz * cell * 0.62, reach = style === 'thrust' ? 0.38 : 0.22;
  var seq = face.then(function () { return Promise.all([approach(stx, stz, 220 + dist * 40, 0.25), self.faceTo(A, to.x, to.z, 1)]); })
    .then(function () { snd('whoosh'); return leanA(-0.28, 210); })
    .then(function () { return leanA(style === 'thrust' ? 0.2 : 0.38, 110, reach); })
    .then(function () { snd('clash'); hit((A.position.x + to.x) / 2, (A.position.z + to.z) / 2, colA, 26, 0.18); return Promise.all([wait(70), leanD(-0.3, 170, 0.1)]); });
  if (!short) seq = seq
    // Gegenschlag des Verteidigers, Angreifer pariert
    .then(function () { return Promise.all([leanA(-0.05, 160, -reach * 0.6), leanD(-0.35, 160)]); })
    .then(function () { snd('whoosh'); return leanD(0.32, 120, -0.18); })
    .then(function () { snd('clash'); hit((A.position.x + D.position.x) / 2, (A.position.z + D.position.z) / 2, 0xffffff, 22, 0.14); return Promise.all([leanA(-0.25, 140), leanD(-0.05, 200, 0.1)]); });
  return seq
    // Todesstoß: hochspringen und zuschlagen
    .then(function () { return self.tween(240 * sp, function (k) { A.position.y = BT + Math.sin(k * Math.PI / 2) * 0.35; A.userData.ang = -0.25 - 0.15 * k; self.lean(A, ux, uz, A.userData.ang); }); })
    .then(function () { snd('whoosh'); var y0 = A.position.y, x0 = A.position.x, z0 = A.position.z; return self.tween(120 * sp, function (k) { A.position.y = y0 + (BT - y0) * k; A.position.x = x0 + ux * reach * k; A.position.z = z0 + uz * reach * k; A.userData.ang = -0.4 + 0.9 * k; self.lean(A, ux, uz, A.userData.ang); }); })
    .then(function () { return wait(60); })
    .then(die)
    .then(function () { return stepIn(A.position.x, A.position.z, 260); });
};
Board3D.prototype.fx = function (name, sq) {
  var p = this.sqPos(sq);
  if (name === 'check' && this.look === 'feld') this.armyCheck(sq);
  if (name === 'check') { this.shakeAmt = 0.25; this.emit(p.x, this.BT + 0.2, p.z, 0xff3030, 40, 2.5, 0.6); }
  if (name === 'mate' && this.figMate) this.figMate(sq);
  if (name === 'mate') { this.shakeAmt = 0.6; var self = this; [0xffd76a, 0xff5a4e, 0x46d7ff, 0xffffff].forEach(function (c, i) { setTimeout(function () { self.emit(p.x, self.BT + 0.5, p.z, c, 120, 6, 1.6); }, i * 150); }); }
  if (name === 'sparkle') this.emit(p.x, this.BT + 0.4, p.z, 0xffd76a, 30, 2, 1.2);
};
Board3D.prototype.destroy = function () {
  this.alive = false; this._ro && this._ro.disconnect();
  this.renderer.dispose(); this.renderer.forceContextLoss && this.renderer.forceContextLoss();
  this.root.classList.remove('b3'); this.root.innerHTML = '';
};
