// Armee-Modus: 3D-Schlachtfeld für die Schlacht-Wiedergabe. Nutzt Board3D aus der Haupt-App (Regimenter, Gelände, Animationen).
// Nur Anzeige: Regeln und Online-Abgleich bleiben unberührt. Lädt erst bei Bedarf, zeichnet nur, solange es sichtbar ist.
(function (root) {
  'use strict';
  var CODE = { fu: 1, ky: 2, ke: 3, gi: 4, ki: 5, ka: 6, hi: 7, ou: 8, to: 9, ny: 10, nk: 11, ng: 12, um: 13, ry: 14 };
  var me = document.currentScript && document.currentScript.src, VER = me && (me.match(/[?&]v=(\w+)/) || [])[1];
  function q(u) { return VER && u.indexOf('//') < 0 ? u + '?v=' + VER : u; }
  var SCRIPTS = ['https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js', 'js/theme.js', 'js/figures3d.js', 'js/skinanim.js', 'js/board3d.js', 'js/fieldfx.js', 'js/spielfeld.js', 'js/feld_editionen.js', 'js/feld_fantasy.js', 'js/feld_hunde.js', 'js/figanim.js'];
  var SETTINGS = { render: '3d', quality: 'high', pieceStyle: 'both', fights: 'voll', army: true, armyLook: 'farbe', armySashi: true, models: true, theme: 'feudal', figSet: 'statue', statueMats: ['gold', 'silber'], komaStyle: 'stein', boardTone: 'urushi', scene: 'buehne', skin: { a: '#c9a36b', b: '#b58c55', line: '#3a2a18' } };
  var V = { state: 'off', B: null, box: null, ov: null, groups: {}, flip: false, speed: 1, fps: [], onSlow: null };

  function webgl() { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
  V.supported = function () { return webgl(); };
  // Skripte der Reihe nach laden (klassisch, Reihenfolge zählt), dazu models.js als Modul
  V.load = function () {
    if (V.state !== 'off') return V.ready; V.state = 'loading';
    V.ready = new Promise(function (ok, no) {
      var i = 0;
      function next() {
        if (i === 1) { var m = document.createElement('script'); m.type = 'module'; m.src = q('js/models.js'); document.head.appendChild(m); }
        if (i >= SCRIPTS.length) return Models.ready(function () { V.state = 'ready'; ok(); });
        var s = document.createElement('script'); s.src = q(SCRIPTS[i++]); s.async = false; s.onload = next; s.onerror = function () { V.state = 'fail'; no(new Error('3D lädt nicht')); }; document.head.appendChild(s);
      }
      next();
    });
    return V.ready;
  };

  function sq(x, y) { return y * 9 + x; }
  function code(u) { return (u.p === 0 ? 1 : -1) * CODE[u.t]; }
  function full(u) { var a = Board3D.ARMY[Board3D.ARMY_TYPE[CODE[u.t]]]; return a.cols ? a.cols * a.rows : 1; }
  function want(u) { return u.hp <= 0 ? 0 : Math.max(1, Math.round(full(u) * u.hp / u.mhp)); }
  function live(g) { return (g.userData.troops || []).filter(function (s) { return !s.userData.dying && !s.userData.dead; }); }
  function baseRot(g) { return g.userData.p > 0 ? 0 : Math.PI; }
  function wpos(x, y) { var p = V.B.sqPos(sq(x, y)); return { x: p.x, z: p.z }; }

  function build(box) {
    V.box = box; box.innerHTML = '<div class="v3-gl"></div><div class="v3-ov"></div>';
    var gl = box.firstChild; V.ov = box.lastChild;
    var B = V.B = new Board3D(gl, THEMES.feudal, SETTINGS);
    B.onSquare = function (s) { if (V.onCell) V.onCell(s % 9, (s / 9) | 0); }; // Tippen aufs Feld (Planung)
    B.viewShift = 0; B.orbit.user = true;
    B.armyIntro = function () { }; // kein Kameraflug
    B.resetCamera = camera; // Doppeltippen: zurück zur Grundsicht
    // Planung: nur zeichnen, solange sich etwas tut (Tippen, Drehen, Anmarsch); sonst steht das Bild (Akku)
    ['pointerdown', 'pointermove', 'wheel'].forEach(function (n) { box.addEventListener(n, function (e) { if (V.planning && (n !== 'pointermove' || e.buttons)) kick(); }, { passive: true }); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && V.planning && V.isOn()) kick(); });
    // Laub (Gebirgspass) leuchtete additiv als orange Kleckse am Boden: normal mischen, kleiner, Ahornrot
    if (B.petals) { var pm = B.petals.material; pm.blending = THREE.NormalBlending; pm.color.setHex(0xc4541e); pm.size = 0.035; pm.opacity = 0.85; pm.needsUpdate = true; }
    css();
    camera(true);
  }
  // eigenes CSS (armee.html bleibt unberührt): größere Balken/Zahlen, Schadenszahl in Spielerfarbe
  function css() {
    if (document.getElementById('v3css')) return; var st = document.createElement('style'); st.id = 'v3css';
    st.textContent = '#v3d .v3-hp{width:30px;height:5px;box-shadow:0 0 0 1px rgba(0,0,0,.6)}#v3d .v3-hp.king{width:46px;height:6px}' +
      '#v3d .v3-dmg{font:900 19px sans-serif;-webkit-text-stroke:.6px #000}#v3d .v3-dmg.d0{color:#ffb060}#v3d .v3-dmg.d1{color:#8fd0ff}#v3d .v3-dmg.big{font-size:24px}' +
      '#v3d .v3-tick{position:absolute;left:8px;top:8px;font:700 12px sans-serif;color:#f4e2b8;background:rgba(10,8,6,.55);padding:3px 7px;border-radius:3px;letter-spacing:.04em}';
    document.head.appendChild(st);
  }
  // Grundsicht: schräg wie ein Feldherr auf dem Hügel, eigenes Lager unten, oben Himmel und Kulisse (Burg, Wald);
  // Abstand so, dass alle 9 Spalten ins Bild passen. snap = sofort, sonst gleitet die Kamera hin (nach der Schlacht)
  V.CAM = { phi: 0.86, edge: 4.0 };
  function camera(snap) {
    var B = V.B, o = B.orbit; B.resize();
    B.camera.clearViewOffset(); B.camera.updateProjectionMatrix();
    var f = fit(V.CAM.phi), tz = V.flip ? -f.tz : f.tz;
    V.home = { x: 0, z: tz, r: f.r, phi: V.CAM.phi, vs: f.vs };
    o.theta = o.thetaGoal = V.flip ? Math.PI : 0;
    if (snap || !V.cg) { V.cg = null; o.phi = V.CAM.phi; o.radius = f.r; o.target.set(0, 0, tz); shift(f.vs); } else camTo(V.home);
  }
  // Bildverschiebung (Objektiv-Shift): Perspektive bleibt, das Feld rutscht nach unten, oben Himmel und Kulisse
  function shift(vs) { var B = V.B; B.viewShift = vs; if (B._vw) { B._vsApplied = vs; B.camera.setViewOffset(B._vw[0], B._vw[1], 0, -B._vw[1] * vs, B._vw[0], B._vw[1]); B.camera.updateProjectionMatrix(); } }
  // kleinster Abstand, bei dem alle 9 Spalten in die Breite passen; danach so verschieben, dass die eigene Feldkante unten sitzt
  function fit(phi) {
    var B = V.B, c = B.camera.clone(), v = new THREE.Vector3(), best = null, E = V.CAM.edge;
    c.clearViewOffset(); c.updateProjectionMatrix();
    function at(r, tz) { c.position.set(0, r * Math.cos(phi), tz + r * Math.sin(phi)); c.lookAt(0, 0, tz); c.updateMatrixWorld(); }
    function ok(r, tz) { at(r, tz); var a = v.set(E, B.BT, 4.65).project(c); return Math.abs(a.x) <= 0.97 && a.z < 1; }
    for (var tz = -2; tz <= 3; tz += 0.25) {
      var lo = 2, hi = 40; if (!ok(hi, tz)) continue;
      for (var i = 0; i < 22; i++) { var m = (lo + hi) / 2; if (ok(m, tz)) hi = m; else lo = m; }
      at(hi, tz); var yn = v.set(E, B.BT, 4.65).project(c).y, yf = v.set(0, B.BT, -4.7).project(c).y, vs = Math.max(0, (yn + 0.93) / 2);
      var cd = c.position.length(); if (!best || cd < best.cd) best = { r: hi, tz: tz, vs: Math.min(0.45, vs), cd: cd };
    }
    return best || { r: 13, tz: 0.4, vs: 0 };
  }
  // Kamera weich zu einem Ziel {x, z, r, phi} führen (Schlacht: aufs Gefecht, danach zurück)
  function camTo(goal) {
    var B = V.B; V.cg = goal; if (V._camT) return;
    var last = performance.now();
    V._camT = { forever: true, f: function (now) {
      var g = V.cg, o = B.orbit, dt = Math.min(60, now - last); last = now; if (!g) return;
      var k = 1 - Math.exp(-dt / 420);
      o.target.x += (g.x - o.target.x) * k; o.target.z += (g.z - o.target.z) * k; o.radius += (g.r - o.radius) * k; o.phi += (g.phi - o.phi) * k; B.viewShift += ((g.vs || 0) - B.viewShift) * k;
      V.camBusy = Math.abs(g.r - o.radius) > 0.02 || Math.abs(g.x - o.target.x) + Math.abs(g.z - o.target.z) > 0.02;
      if (!V.camBusy && Math.abs(g.phi - o.phi) < 0.005) V.cg = null; // angekommen: Ziel loslassen, damit Zoomen/Drehen von Hand nicht zurückgezogen wird
    } };
    B.tweens.push(V._camT);
  }
  // Takt-Kamera: Ausschnitt aus allen Gefechten und Märschen des Takts, nie weiter weg als die Grundsicht
  function camFight(pts) {
    if (!pts.length || !V.home) return; var B = V.B, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    pts.forEach(function (p) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); });
    var vf = B.camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * B.camera.aspect);
    var hw = (x1 - x0) / 2 + 1.1, hd = (z1 - z0) / 2 + 1.1, r = Math.max(hw / Math.tan(hf / 2), hd * 1.6 / Math.tan(vf / 2));
    r = Math.max(4.6, Math.min(V.home.r, r)); var t = (r - 4.6) / Math.max(0.01, V.home.r - 4.6); // nah = etwas flacher (mehr Kino)
    camTo({ x: (x0 + x1) / 2 * (1 - t * 0.6), z: (z0 + z1) / 2 + (V.flip ? -1 : 1) * 0.2, r: r, phi: V.home.phi - 0.08 * (1 - t), vs: V.home.vs * t * 0.5 });
  }
  function makeG(u, n) {
    var B = V.B, g = B.makePiece(code(u), n || want(u)); g.userData.uid = u.id; B.pieceGroup.add(g); B.placePiece(g, sq(u.x, u.y)); g.rotation.y = baseRot(g); V.groups[u.id] = g; mark(g, u); return g;
  }
  // Spielerfarbe am Boden: leuchtendes Koma-Fünfeck unter jedem Regiment (Spitze zum Gegner), Orange/Blau wie die Balken
  function markTex() {
    if (V._mt) return V._mt; var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d');
    function penta(s) { x.beginPath(); x.moveTo(64, 64 - 58 * s); x.lineTo(64 + 46 * s, 64 - 30 * s); x.lineTo(64 + 54 * s, 64 + 56 * s); x.lineTo(64 - 54 * s, 64 + 56 * s); x.lineTo(64 - 46 * s, 64 - 30 * s); x.closePath(); }
    x.filter = 'blur(3px)'; penta(1); x.fillStyle = 'rgba(255,255,255,.28)'; x.fill(); x.lineWidth = 7; x.strokeStyle = '#fff'; x.stroke();
    x.filter = 'none'; penta(1); x.lineWidth = 2.5; x.strokeStyle = 'rgba(255,255,255,.95)'; x.stroke();
    return (V._mt = new THREE.CanvasTexture(c));
  }
  var MCOL = [0xff7a10, 0x2a8cff];
  var SPELL = { hagel: 0xf2e2b8, feuer: 0xff5a1a, heil: 0x6cff8a, ruf: 0xff3030, schild: 0xffd36a };
  function mark(g, u) {
    var T = THREE, key = 'm' + u.p, mat = V[key] || (V[key] = new T.MeshBasicMaterial({ map: markTex(), color: MCOL[u.p], transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    var geo = V._mg || (V._mg = new T.PlaneGeometry(0.98, 0.98).rotateX(-Math.PI / 2));
    var m = new T.Mesh(geo, mat); m.position.y = 0.012; m.scale.setScalar(u.t === 'ou' ? 1 : 0.96); m.raycast = function () { }; m.renderOrder = 1; m.userData.mark = true;
    // Feldherr: zusätzlich goldener Doppelring, damit man ihn am Handy sofort findet
    if (u.t === 'ou') { var rg = V._rg || (V._rg = new T.RingGeometry(0.6, 0.68, 40).rotateX(-Math.PI / 2)), rm = V._rm || (V._rm = new T.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: 0.95, depthWrite: false }));
      var r1 = new T.Mesh(rg, rm), r2 = new T.Mesh(rg, rm); r1.position.y = 0.016; r2.position.y = 0.016; r2.scale.setScalar(1.22); [r1, r2].forEach(function (r) { r.raycast = function () { }; r.renderOrder = 1; m.add(r); r.position.y = 0.004; }); }
    g.add(m); g.userData.mark = m;
  }
  function drop(g) { if (g.parent) g.parent.remove(g); }
  // Anzeige an einen Stand angleichen; neu = Truppe kommt aus dem Lager (nur mit Animation)
  function reconcile(w, anim, refill) {
    var seen = {}, B = V.B, wait = 0;
    // andere Partie (Nummern fangen dort wieder bei 0 an): alles abräumen; erste 3D-Schlacht der Partie: alle stehen schon
    if (V.game !== w.seed) { Object.keys(V.groups).forEach(function (id) { drop(V.groups[id]); }); V.groups = {}; V.game = w.seed; anim = false; }
    if (!Object.keys(V.groups).length) anim = false;
    w.units.forEach(function (u) {
      if (u.hp <= 0) return; seen[u.id] = 1; var g = V.groups[u.id];
      if (g && g.userData.p !== code(u)) { var n = live(g).length; drop(g); g = null; V.groups[u.id] = makeG(u, Math.max(1, Math.min(n || want(u), want(u)))); return; }
      if (!g) {
        g = makeG(u); if (!anim) return;
        // Nachschub marschiert vom eigenen Feldrand auf sein Feld
        var to = B.sqPos(sq(u.x, u.y)), from = { x: to.x, z: (u.p === 0 ? 1 : -1) * 5.6 }; g.position.set(from.x, B.BT, from.z);
        var dist = Math.abs(to.z - from.z); wait = Math.max(wait, 520 + Math.min(dist, 3) * 430 + Math.max(0, dist - 3) * 190);
        B.armyRun(g, from, to); return;
      }
      if (refill && !g.userData.marching && live(g).length < want(u)) { drop(g); makeG(u); return; } // Planung nach Probelauf: wieder volle Stärke
      g.rotation.y = baseRot(g); if (!g.userData.marching) B.placePiece(g, sq(u.x, u.y));
      thin(g, want(u), null);
    });
    Object.keys(V.groups).forEach(function (id) { if (!seen[id]) { drop(V.groups[id]); delete V.groups[id]; } });
    return wait;
  }
  // Soldaten fallen lassen, bis die Zahl zu den Lebenspunkten passt (zuerst die, die dem Angreifer am nächsten stehen)
  function thin(g, n, from) {
    var L = live(g); if (L.length <= n) return; var v = new THREE.Vector3();
    if (from) L.sort(function (a, b) { a.getWorldPosition(v); var da = Math.hypot(v.x - from.x, v.z - from.z); b.getWorldPosition(v); return da - Math.hypot(v.x - from.x, v.z - from.z); });
    L.slice(0, L.length - n).forEach(function (s, k) { setTimeout(function () { kill(s); }, k * 60 + Math.random() * 80); });
  }
  function kill(s) {
    if (s.userData.dying || s.userData.dead) return; s.userData.dying = true; var B = V.B, v = new THREE.Vector3(); s.getWorldPosition(v);
    B.emit(v.x, B.BT + 0.12, v.z, 0x8a6a48, 6, 1, 0.5);
    setTimeout(function () { var y0 = s.position.y; B.tween(900, function (k) { s.position.y = y0 - k * 0.25; }).then(function () { s.visible = false; s.userData.dead = true; }); }, 2600);
  }
  function face(g, tx, tz) { var dx = tx - g.position.x, dz = tz - g.position.z, r0 = g.rotation.y, r1 = Math.atan2(-dx, -dz); while (r1 - r0 > Math.PI) r1 -= Math.PI * 2; while (r1 - r0 < -Math.PI) r1 += Math.PI * 2; V.B.tween(220, function (k) { g.rotation.y = r0 + (r1 - r0) * k; }); }
  // Pfeile/Geschosse im Bogen
  // Fernkampf: Pfeilhagel (Turm) bzw. leuchtende Ofuda-Geschosse (Läufer) im Bogen, gut sichtbar auch am Handy; schlagen zum Treffer-Zeitpunkt ein
  function volley(a, b, col, n, ms, magic) {
    var T = THREE, B = V.B, geo = magic ? (V._orb || (V._orb = new T.SphereGeometry(0.045, 8, 6))) : (V._arr || (V._arr = new T.CylinderGeometry(0.014, 0.014, 0.34, 4).rotateX(Math.PI / 2)));
    var mat = new T.MeshBasicMaterial({ color: col, transparent: !!magic, blending: magic ? T.AdditiveBlending : T.NormalBlending, depthWrite: !magic }), list = [], mob = Board3D.MOBILE;
    if (magic) n = 4;
    for (var i = 0; i < n; i++) { var m = new T.Mesh(geo, mat); m.userData.o = { dx: (Math.random() - .5) * 0.55, dz: (Math.random() - .5) * 0.55, d: Math.random() * 0.25, e: 0.88 + Math.random() * 0.12, land: false }; m.visible = false; B.scene.add(m); list.push(m); }
    var h = (magic ? 0.35 : 0.7) + Math.hypot(b.x - a.x, b.z - a.z) * (magic ? 0.08 : 0.2), prev = new T.Vector3(), tick = 0;
    return B.tween(ms, function (k) {
      tick++;
      list.forEach(function (m) {
        var o = m.userData.o, kk = Math.max(0, Math.min(1, (k - o.d) / (o.e - o.d))); prev.copy(m.position);
        m.position.set(a.x + (b.x + o.dx - a.x) * kk, B.BT + 0.25 + Math.sin(kk * Math.PI) * h, a.z + (b.z + o.dz - a.z) * kk);
        if (kk > 0 && !magic) m.lookAt(prev.lerp(m.position, -1));
        m.visible = kk > 0 && kk < 1;
        if (magic && m.visible && (!mob || tick % 2)) B.emit(m.position.x, m.position.y, m.position.z, col, 1, 0.25, 0.3, 0);
        if (kk >= 1 && !o.land) { o.land = true; B.emit(m.position.x, B.BT + 0.05, m.position.z, magic ? col : 0x9a8060, magic ? 8 : 3, magic ? 1.4 : 0.7, 0.5); }
      });
    }).then(function () { list.forEach(function (m) { B.scene.remove(m); }); mat.dispose(); });
  }
  function hitFx(g, dmg, big, from) {
    var B = V.B, p = g.position, L = near(g, from), at = from ? { x: p.x + (from.x - p.x) * 0.3, z: p.z + (from.z - p.z) * 0.3 } : p;
    B.emit(at.x, B.BT + 0.25, at.z, 0xffc870, big ? 18 : 10, 2.2, 0.8); B.shakeAmt = Math.max(B.shakeAmt || 0, big ? 0.05 : 0.025);
    L.slice(0, 7).forEach(function (s, k) { s.userData.flash = 1; if (k < 5) shot(s, ['hit1', 'hit2']); });
    float(g, '−' + dmg, 'd' + (g.userData.p > 0 ? 1 : 0) + (big ? ' big' : ''));
  }
  // lebende Soldaten, die dem Punkt am nächsten stehen, zuerst
  function near(g, from) {
    var L = live(g); if (!from) return L; var v = new THREE.Vector3();
    return L.map(function (s) { s.getWorldPosition(v); return { s: s, d: Math.hypot(v.x - from.x, v.z - from.z) }; }).sort(function (a, b) { return a.d - b.d; }).map(function (o) { return o.s; });
  }
  // Nahkampf wie Total War: die vorderen Reihen stürmen in die Lücke zwischen den Feldern, hauen zu und weichen in die Formation zurück.
  // Die Verteidiger treten einen halben Schritt vor und parieren. Dauer ~1,05 s (Takt 1,25 s), läuft auf der Armee-Uhr (Tempo, Zeitlupe).
  function charge(A, D, a, b, hitAt) {
    var B = V.B, T = THREE, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, v = new T.Vector3(), q = new T.Quaternion();
    function crew(g, sx, sz, tx, tz, frac, max, reach) {
      var L = live(g); if (!L.length) return [];
      var arr = L.map(function (s) { s.getWorldPosition(v); return { s: s, f: (v.x - tx) * sx + (v.z - tz) * sz }; }).sort(function (p, r) { return r.f - p.f; });
      return arr.slice(0, Math.max(1, Math.min(max, Math.ceil(arr.length * frac)))).map(function (o) {
        var s = o.s, us = s.userData, m = us.glb; s.parent.getWorldQuaternion(q).invert();
        var push = Math.max(0.04, Math.min(0.8, reach - o.f)) * (0.85 + Math.random() * 0.3), dl = new T.Vector3(sx * push, 0, sz * push).applyQuaternion(q);
        var rr = g.rotation.y + s.rotation.y, lx = sx * Math.cos(rr) - sz * Math.sin(rr), lz = sx * Math.sin(rr) + sz * Math.cos(rr);
        return { s: s, u: us, m: m, x0: s.position.x, z0: s.position.z, dx: dl.x, dz: dl.z, face: Math.atan2(-lx, -lz) - ((m && m.userData.ry0 || 0) - Math.PI), lag: Math.random() * 0.06, hit: false };
      });
    }
    // Angreifer laufen bis kurz vor die Mitte, Verteidiger einen kleinen Schritt entgegen
    var atk = crew(A, ux, uz, a.x, a.z, 0.5, 10, d / 2 - 0.1), def = D ? crew(D, -ux, -uz, b.x, b.z, 0.35, 7, 0.22) : [];
    [[A, atk, 1], [D, def, 0]].forEach(function (G) {
      var g = G[0], cr = G[1], isA = G[2]; if (!g || !cr.length) return;
      g.userData.fighting = (g.userData.fighting | 0) + 1;
      var dur = isA ? 1050 : 900;
      B.tween(dur, function (k) {
        cr.forEach(function (o) {
          if (o.u.dead) return; var kk = Math.max(0, Math.min(1, (k - o.lag) / (1 - o.lag)));
          // hin (0–0,3), kämpfen (0,3–0,72) mit kleinem Gedränge, zurück (0,72–1)
          var e = kk < 0.3 ? sm(kk / 0.3) : kk < 0.72 ? 1 + Math.sin(kk * 40 + o.lag * 99) * 0.04 : 1 - sm((kk - 0.72) / 0.28);
          if (o.u.dying) e = Math.max(e, 0.9); // wer fällt, bleibt vorn liegen
          o.s.position.x = o.x0 + o.dx * e; o.s.position.z = o.z0 + o.dz * e;
          if (o.m && !o.u.dying) o.m.userData.face = kk < 0.85 ? o.face * Math.min(1, kk * 8) : o.face * (1 - sm((kk - 0.85) / 0.15));
          if (o.u.u) o.u.u.uWalk.value = o.u.dying ? 0 : kk < 0.26 ? (isA ? 1 : 0.6) : kk > 0.74 && kk < 0.97 ? 0.5 : 0;
          if (!o.hit && kk >= (isA ? 0.3 : 0.22)) { o.hit = true; shot(o.s, isA ? ['atk1', 'atk2', 'atk4'] : ['block', 'block', 'atk1'], Math.max(0.05, (hitAt - dur * (isA ? 0.3 : 0.22)) / 1000)); }
        });
      }).then(function () {
        cr.forEach(function (o) { if (o.m && !o.u.dying && !o.u.dead) o.m.userData.face = 0; if (o.u.u) o.u.u.uWalk.value = 0; if (!o.u.dying && !o.u.dead) { o.s.position.x = o.x0; o.s.position.z = o.z0; } });
        g.userData.fighting = Math.max(0, (g.userData.fighting | 0) - 1);
      });
    });
  }
  function sm(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  // Clip nur abspielen, wenn das Skelett ihn hat (Kreaturen haben z. B. kein block)
  function shot(s, names, hitAt) {
    var A = s.userData.skin; if (!A) return; var ok = names.filter(function (n) { return A.dur && A.dur[n]; });
    if (!ok.length) ok = Board3D.ATK.filter(function (n) { return A.dur && A.dur[n]; }); if (ok.length) V.B.skinShot(s, ok, hitAt);
  }
  // Schadenszahl über dem Regiment (HTML, steigt auf)
  function float(g, txt, cls) {
    var s = scr(g.position.x, g.position.z, 0.5); if (!s) return; var el = document.createElement('div'); el.className = 'v3-dmg' + (cls ? ' ' + cls : ''); el.textContent = txt; el.style.left = s.x + 'px'; el.style.top = s.y + 'px'; V.ov.appendChild(el); setTimeout(function () { el.remove(); }, 1100);
  }
  function scr(x, z, y) { var c = V.B.renderer.domElement, v = new THREE.Vector3(x, V.B.BT + (y || 0), z).project(V.B.camera); if (v.z > 1) return null; return { x: (v.x + 1) / 2 * c.clientWidth, y: (1 - v.y) / 2 * c.clientHeight }; }

  // Felder einfärben (Planung): ok = hier aufstellen, reach = Angriffsrichtungen, hit = Ziel in Reichweite, danger = Gegner trifft hier
  var MK = { ok: [0x5fe08f, 0.45], reach: [0x46b4ff, 0.32], hit: [0xff8a2a, 0.55], danger: [0xff3030, 0.2], sel: [0xffe070, 0.55] };
  function tiles(marks, selSq) {
    var B = V.B; B.hlGroup.visible = true;
    for (var q = 0; q < 81; q++) {
      var t = B.tiles[q], m = q === selSq ? 'sel' : marks && marks[q], c = m && MK[m]; t.visible = !!c;
      if (c) { t.material.color.setHex(c[0]); t.material.opacity = c[1]; }
      if (B.dots[q]) { B.dots[q].dot.visible = false; B.dots[q].ring.visible = false; }
    }
  }
  function kick() {
    if (!V.B) return; V._kick = performance.now(); if (V.B.paused) { V.B.setPaused(false); var im = V.box.querySelector('.v3-still'); if (im) im.remove(); } follow();
    if (!V._idle) V._idle = setInterval(function () {
      var B = V.B; if (!V.planning || !V.isOn()) { clearInterval(V._idle); V._idle = null; return; }
      if (B.paused) return;
      var busy = B.tweens.some(function (t) { return !t.forever; }) || performance.now() - Math.max(V._kick, B.lastInput || 0) < 2500 || Math.abs(B.orbit.theta - B.orbit.thetaGoal) > 1e-3 || V.camBusy;
      if (!busy) { still(); B.setPaused(true); place(); }
    }, 700);
  }

  // laufende Animationen sofort zu Ende bringen (sonst bleiben sie beim Pausieren stecken, z. B. ein halber Anmarsch)
  function flush() {
    var B = V.B; if (!B) return;
    for (var i = 0; i < 6 && B.tweens.some(function (t) { return !t.forever; }); i++) {
      var list = B.tweens; B.tweens = list.filter(function (t) { return t.forever; });
      list.forEach(function (t) { if (t.forever) return; try { t.f(1); } catch (e) { } if (t.done) t.done(); });
    }
    B.pieceGroup.children.forEach(function (g) { g.userData.marching = false; g.userData.fighting = false; });
    B.shakeAmt = 0;
  }

  // ---------- öffentlich ----------
  V.isOn = function () { return V.state === 'ready' && V.box && !V.box.classList.contains('hidden'); };
  // Schlacht beginnt: 3D einblenden und an den Stand angleichen
  V.show = function (box, w, flip, speed) {
    if (V.state !== 'ready') return false;
    if (!V.B || V.box !== box) build(box);
    if (flip !== V.flip) { V.flip = flip; camera(true); }
    clearTimeout(V._frz); V._frz = null; var still = box.querySelector('.v3-still'); if (still) still.remove(); flush(); box.classList.remove('hidden'); V.B.setPaused(false); V.B.resize(); camera();
    V.planning = false; box.classList.remove('plan'); tiles(null, -1);
    V.units = w; V.speed = speed || 1; V.B.timeScale = V.speed; V.introMs = reconcile(w, true) / V.speed; bars(); follow(); V.watch();
    return true;
  };
  // Planung in 3D: Stand mit eigenen Plänen zeigen, Felder markieren; neu gekaufte Truppen marschieren vom Feldrand ein
  V.plan = function (box, w, flip, marks, selSq) {
    if (V.state !== 'ready') return false;
    if (!V.B || V.box !== box) build(box);
    var fresh = !V.isOn() || !V.planning;
    if (fresh) { clearTimeout(V._frz); V._frz = null; var still = box.querySelector('.v3-still'); if (still) still.remove(); flush(); box.classList.remove('hidden'); V.B.setPaused(false); V.B.resize(); }
    if (fresh || flip !== V.flip) { V.flip = flip; camera(); }
    V.planning = true; box.classList.add('plan'); V.B.timeScale = 1; V.units = w;
    // nur bei echter Änderung neu zeichnen (Netz-Meldungen und Rundenuhr rufen render() oft auf)
    var sig = JSON.stringify([V.flip, selSq, marks, w.units.map(function (u) { return [u.id, u.t, u.x, u.y, u.hp, u.mhp, u.lv, u.ord]; })]);
    if (!fresh && sig === V._sig) return true; V._sig = sig;
    reconcile(w, !fresh, true); tiles(marks, selSq); bars(); kick(); V.watch();
    return true;
  };
  V.hide = function () { if (!V.B) return; V.planning = false; clearTimeout(V._frz); V._frz = null; var still = V.box.querySelector('.v3-still'); if (still) still.remove(); flush(); V.box.classList.add('hidden'); V.B.setPaused(true); V.ov.querySelectorAll('.v3-dmg').forEach(function (n) { n.remove(); }); };
  // sichtbar lassen, aber nach ms nicht mehr zeichnen (stehendes Bild, kein Akku)
  V.freeze = function (ms) { if (!V.B || V._frz) return; V._frz = setTimeout(function () {
    V._frz = null; if (!V.isOn()) return; still(); V.B.setPaused(true);
  }, ms); };
  // Standbild: letztes Bild als JPEG drüberlegen (ohne preserveDrawingBuffer kann eine pausierte Leinwand leer werden, auch in der Planung)
  function still() {
    var B = V.B, url;
    try { B.update(performance.now(), 0); B.renderer.render(B.scene, B.camera); url = B.renderer.domElement.toDataURL('image/jpeg', 0.85); } catch (e) { }
    if (url) { var im = V.box.querySelector('.v3-still') || V.box.insertBefore(document.createElement('img'), V.ov); im.className = 'v3-still'; im.src = url; }
  }
  V.sync = function (w) { if (!V.isOn()) return; flush(); V.units = w; reconcile(w, false); bars(); };
  V.setSpeed = function (s) { V.speed = s; if (V.B) V.B.timeScale = s; };
  // ein Takt der Schlacht: d = Stand nach dem Takt
  V.tick = function (ev, d) {
    if (!V.isOn()) return; var B = V.B; V.units = d; B.timeScale = V.speed;
    var pts = [];
    ev.forEach(function (e) {
      var g = V.groups[e.id];
      if (e.e === 'move' && g) { g.rotation.y = baseRot(g); B.armyRun(g, wpos(e.x, e.y), wpos(e.tx, e.ty)); }
    });
    ev.forEach(function (e) {
      if (e.e !== 'atk') return; var A = V.groups[e.id], D = V.groups[e.to]; if (!A || !D) return;
      var a = wpos(e.x, e.y), b = wpos(e.tx, e.ty), dist = Math.max(Math.abs(e.tx - e.x), Math.abs(e.ty - e.y)), t = Math.abs(A.userData.p), ranged = dist >= 2 && [6, 7, 13, 14].indexOf(t) >= 0;
      var hitAt = ranged ? 680 : 560, du = AK.unit(d, e.to); pts.push(a, b);
      if (ranged) { face(A, b.x, b.z); live(A).slice(0, 8).forEach(function (s, k) { setTimeout(function () { shot(s, Board3D.ATK); }, k * 50 / V.speed); }); volley(a, b, t === 6 || t === 13 ? 0x4aa8ff : 0xf2e2b8, Board3D.MOBILE ? 10 : 14, hitAt, t === 6 || t === 13); }
      else charge(A, D, a, b, hitAt);
      setTimeout(function () { if (!D.parent) return; hitFx(D, e.dmg, e.dmg >= 3, a); if (du) thin(D, want(du), a); }, hitAt / V.speed);
    });
    // Regel-Varianten: Zauber des Feldherrn (Ziel-Zauber fliegen vom Feldherrn aufs Feld), Schaden ohne Angreifer
    ev.forEach(function (e) {
      if (e.e === 'spell') {
        var kh = (d.units || []).filter(function (u) { return u.t === 'ou' && u.p === e.p; })[0], kgp = kh && V.groups[kh.id], col = SPELL[e.s] || 0xffd36a;
        var from = kgp ? { x: kgp.position.x, z: kgp.position.z } : { x: 0, z: (e.p === 0 ? 1 : -1) * 4.6 };
        if (e.x != null && e.y != null) { var to = wpos(e.x, e.y); pts.push(to); volley(from, to, e.s === 'hagel' ? 0xf2e2b8 : col, e.s === 'hagel' ? (Board3D.MOBILE ? 16 : 22) : 10, 680, e.s !== 'hagel');
          setTimeout(function () { B.emit(to.x, B.BT + 0.1, to.z, col, e.s === 'hagel' ? 12 : 40, 2.4, 1.6); }, 680 / V.speed); }
        else Object.keys(V.groups).forEach(function (id) { var g = V.groups[id], u = AK.unit(d, +id); if (!g.parent || !u || u.p !== e.p) return; var q = g.position; B.emit(q.x, B.BT + 0.15, q.z, col, 10, 0.9, 1.4); });
      }
      if (e.e === 'hurt') { var hg = V.groups[e.id], du = AK.unit(d, e.id); if (hg) setTimeout(function () { if (!hg.parent) return; hitFx(hg, e.dmg, e.dmg >= 3); if (du) thin(hg, want(du)); }, 700 / V.speed); }
      if (e.e === 'rdmg' && e.p != null && e.dmg > 0) { var kr = (d.units || []).filter(function (u) { return u.t === 'ou' && u.p === e.p; })[0], krg = kr && V.groups[kr.id]; if (krg) setTimeout(function () { hitFx(krg, e.dmg, true); }, 300 / V.speed); }
    });
    // nur Gefechte heranholen; erst nach zwei ruhigen Takten zurück in die Grundsicht (sonst pumpt die Kamera jeden Takt)
    if (pts.length) { V._calm = 0; camFight(pts); } else if (V.home && ++V._calm >= 2) camTo(V.home);
    ev.forEach(function (e) {
      var g = V.groups[e.id];
      if (e.e === 'die' && g) {
        setTimeout(function () {
          live(g).forEach(function (s, k) { setTimeout(function () { kill(s); }, k * 40); });
          var ban = g.userData.banner; if (ban) B.tween(600, function (k) { B.lean(ban, 0.6, 0.8, k * k * 1.4); });
          var mk = g.userData.mark; if (mk) B.tween(900, function (k) { mk.scale.setScalar(Math.max(0.001, 1 - k)); });
          setTimeout(function () { if (V.groups[e.id] === g) { drop(g); delete V.groups[e.id]; } }, 3800);
        }, 620 / V.speed);
      }
      if (e.e === 'promo' && g) {
        setTimeout(function () {
          var u = AK.unit(d, e.id); if (!u || V.groups[e.id] !== g) return; var n = live(g).length, p = g.position;
          B.emit(p.x, B.BT + 0.2, p.z, 0xffd36a, 40, 1.6, 2.2); drop(g); makeG(u, Math.max(1, Math.min(want(u), n + 2))); float(V.groups[e.id], T(u) + '!', 'promo');
        }, 700 / V.speed);
      }
      if (e.e === 'storm') {
        var k = (d.units || []).filter(function (u) { return u.t === 'ou' && u.p !== e.p; })[0], kg = k && V.groups[k.id]; if (kg) setTimeout(function () { hitFx(kg, e.dmg, true); }, 300);
      }
    });
    setTimeout(bars, 650 / V.speed);
  };
  function T(u) { return AK.TYPES[u.t].n; }
  // Lebensbalken über jedem Regiment (HTML), folgen den Truppen bei jedem Bild
  function bars() {
    if (!V.B || !V.units) return; var keep = {}, box = V.ov.querySelector('.v3-bars');
    if (!box) { box = document.createElement('div'); box.className = 'v3-bars'; V.ov.insertBefore(box, V.ov.firstChild); V.bar = {}; }
    V.units.units.forEach(function (u) {
      if (u.hp <= 0 || !V.groups[u.id]) return; keep[u.id] = 1; var el = V.bar[u.id];
      if (!el) { el = V.bar[u.id] = document.createElement('div'); el.innerHTML = '<i></i><b></b>'; box.appendChild(el); }
      el.className = 'v3-hp p' + u.p + (u.t === 'ou' ? ' king' : ''); el.firstChild.style.width = Math.max(0, 100 * u.hp / u.mhp).toFixed(0) + '%'; el._h = u.t === 'ou' ? 0.75 : 0.6;
      var bd = V.badge ? V.badge(u) : ''; if (el.lastChild._b !== bd) { el.lastChild._b = bd; el.lastChild.innerHTML = bd; }
    });
    Object.keys(V.bar).forEach(function (id) { if (!keep[id]) { V.bar[id].remove(); delete V.bar[id]; } });
    place();
  }
  function place() { Object.keys(V.bar || {}).forEach(function (id) { var g = V.groups[id], el = V.bar[id], s = g && g.parent && scr(g.position.x, g.position.z, el._h); if (!s) { el.style.display = 'none'; return; } el.style.display = ''; el.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) translate(-50%,-50%)'; }); }
  function follow() { if (V._fol) return; V._fol = true; (function f() { if (!V.isOn() || V.B.paused) { V._fol = false; return; } place(); requestAnimationFrame(f); })(); }
  // erst nach 2 s messen (Shader übersetzen, Modelle), nur bei sichtbarer Seite; kaum Bilder = Fenster versteckt/gedrosselt, dann keine Aussage
  V.watch = function () {
    if (V._watched || V.slowChecked) return; V._watched = true; var t0 = null, n = 0, start = performance.now();
    function stop() { V._watched = false; }
    requestAnimationFrame(function f(t) {
      if (!V.isOn() || document.hidden) return stop();
      if (t - start < 2000) return requestAnimationFrame(f);
      if (t0 == null) t0 = t; n++;
      if (t - t0 < 4000) return requestAnimationFrame(f);
      var fps = n * 1000 / (t - t0); V.fps.push(Math.round(fps)); stop();
      if (n < 6) return; // gedrosselt (Fenster nicht sichtbar): nicht werten
      if (fps >= 12) { V.slowChecked = true; return; }
      // zu langsam: erst Auflösung senken und in der nächsten Schlacht neu messen, erst dann auf 2D
      if (!V.lowRes) { V.lowRes = true; V.B.renderer.setPixelRatio(1); V.B.resize(); camera(); return; }
      V.slowChecked = true; if (V.onSlow) V.onSlow(fps);
    });
  };
  root.AK3D = V;
})(this);
