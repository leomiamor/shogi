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
    B.onSquare = function () { };
    B.viewShift = 0; B.orbit.user = true;
    B.armyIntro = function () { }; // kein Kameraflug
    camera();
  }
  // feste Schrägsicht, eigenes Lager unten; Abstand so, dass das Feld ins (fast quadratische) Bild passt
  function camera() {
    var B = V.B, o = B.orbit; B.resize();
    B.camera.clearViewOffset(); B.camera.updateProjectionMatrix();
    var vf = B.camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * B.camera.aspect);
    o.phi = 0.92; o.radius = Math.max(5.0 / Math.tan(hf / 2), 5.6 / Math.tan(vf / 2));
    o.target.set(0, 0, V.flip ? -0.35 : 0.35); o.theta = o.thetaGoal = V.flip ? Math.PI : 0;
  }
  function makeG(u, n) {
    var B = V.B, g = B.makePiece(code(u), n || want(u)); g.userData.uid = u.id; B.pieceGroup.add(g); B.placePiece(g, sq(u.x, u.y)); g.rotation.y = baseRot(g); V.groups[u.id] = g; return g;
  }
  function drop(g) { if (g.parent) g.parent.remove(g); }
  // Anzeige an einen Stand angleichen; neu = Truppe kommt aus dem Lager (nur mit Animation)
  function reconcile(w, anim) {
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
  function volley(a, b, col, n, ms) {
    var T = THREE, B = V.B, geo = V._arr || (V._arr = new T.CylinderGeometry(0.008, 0.008, 0.22, 4).rotateX(Math.PI / 2));
    var mat = new T.MeshBasicMaterial({ color: col }), list = [];
    for (var i = 0; i < n; i++) { var m = new T.Mesh(geo, mat); m.userData.o = { dx: (Math.random() - .5) * 0.5, dz: (Math.random() - .5) * 0.5, d: Math.random() * 0.25 }; B.scene.add(m); list.push(m); }
    var h = 0.6 + Math.hypot(b.x - a.x, b.z - a.z) * 0.18, prev = new T.Vector3();
    return B.tween(ms, function (k) {
      list.forEach(function (m) { var o = m.userData.o, kk = Math.max(0, Math.min(1, (k - o.d) / (1 - o.d))); prev.copy(m.position); m.position.set(a.x + (b.x + o.dx - a.x) * kk, B.BT + 0.25 + Math.sin(kk * Math.PI) * h, a.z + (b.z + o.dz - a.z) * kk); if (kk > 0) m.lookAt(prev.lerp(m.position, -1)); m.visible = kk > 0 && kk < 1; });
    }).then(function () { list.forEach(function (m) { B.scene.remove(m); }); mat.dispose(); });
  }
  function hitFx(g, dmg, big) {
    var B = V.B, p = g.position; B.emit(p.x, B.BT + 0.3, p.z, 0xffc870, big ? 22 : 12, 2.6, 0.9); B.shakeAmt = Math.max(B.shakeAmt || 0, big ? 0.06 : 0.03);
    live(g).slice(0, 6).forEach(function (s) { B.skinShot(s, Math.random() < 0.5 ? 'hit1' : 'hit2'); });
    float(g, '−' + dmg);
  }
  // Schadenszahl über dem Regiment (HTML, steigt auf)
  function float(g, txt, cls) {
    var s = scr(g.position.x, g.position.z, 0.5); if (!s) return; var el = document.createElement('div'); el.className = 'v3-dmg' + (cls ? ' ' + cls : ''); el.textContent = txt; el.style.left = s.x + 'px'; el.style.top = s.y + 'px'; V.ov.appendChild(el); setTimeout(function () { el.remove(); }, 1100);
  }
  function scr(x, z, y) { var c = V.B.renderer.domElement, v = new THREE.Vector3(x, V.B.BT + (y || 0), z).project(V.B.camera); if (v.z > 1) return null; return { x: (v.x + 1) / 2 * c.clientWidth, y: (1 - v.y) / 2 * c.clientHeight }; }

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
    if (flip !== V.flip) { V.flip = flip; camera(); }
    clearTimeout(V._frz); V._frz = null; var still = box.querySelector('.v3-still'); if (still) still.remove(); flush(); box.classList.remove('hidden'); V.B.setPaused(false); V.B.resize(); camera();
    V.units = w; V.speed = speed || 1; V.B.timeScale = V.speed; V.introMs = reconcile(w, true) / V.speed; bars(); follow(); V.watch();
    return true;
  };
  V.hide = function () { if (!V.B) return; clearTimeout(V._frz); V._frz = null; var still = V.box.querySelector('.v3-still'); if (still) still.remove(); flush(); V.box.classList.add('hidden'); V.B.setPaused(true); V.ov.querySelectorAll('.v3-dmg').forEach(function (n) { n.remove(); }); };
  // sichtbar lassen, aber nach ms nicht mehr zeichnen (stehendes Bild, kein Akku)
  V.freeze = function (ms) { if (!V.B || V._frz) return; V._frz = setTimeout(function () {
    V._frz = null; if (!V.isOn()) return; var B = V.B, url;
    // Standbild: letztes Bild als JPEG drüberlegen (ohne preserveDrawingBuffer kann eine pausierte Leinwand sonst leer werden)
    try { B.update(performance.now(), 0); B.renderer.render(B.scene, B.camera); url = B.renderer.domElement.toDataURL('image/jpeg', 0.85); } catch (e) { }
    if (url) { var im = V.box.querySelector('.v3-still') || V.box.insertBefore(document.createElement('img'), V.ov); im.className = 'v3-still'; im.src = url; }
    B.setPaused(true);
  }, ms); };
  V.sync = function (w) { if (!V.isOn()) return; flush(); V.units = w; reconcile(w, false); bars(); };
  V.setSpeed = function (s) { V.speed = s; if (V.B) V.B.timeScale = s; };
  // ein Takt der Schlacht: d = Stand nach dem Takt
  V.tick = function (ev, d) {
    if (!V.isOn()) return; var B = V.B; V.units = d; B.timeScale = V.speed;
    ev.forEach(function (e) {
      var g = V.groups[e.id];
      if (e.e === 'move' && g) { g.rotation.y = baseRot(g); B.armyRun(g, wpos(e.x, e.y), wpos(e.tx, e.ty)); }
    });
    ev.forEach(function (e) {
      if (e.e !== 'atk') return; var A = V.groups[e.id], D = V.groups[e.to]; if (!A || !D) return;
      var a = wpos(e.x, e.y), b = wpos(e.tx, e.ty), dist = Math.max(Math.abs(e.tx - e.x), Math.abs(e.ty - e.y)), t = Math.abs(A.userData.p), ranged = dist >= 2 && [6, 7, 13, 14].indexOf(t) >= 0;
      var hitAt = ranged ? 520 : 300, du = AK.unit(d, e.to);
      face(A, b.x, b.z); live(A).slice(0, ranged ? 8 : 5).forEach(function (s, k) { setTimeout(function () { B.skinShot(s, Board3D.ATK); }, k * 50 / V.speed); });
      if (ranged) volley(a, b, t === 6 || t === 13 ? 0x9fd8ff : 0xe8d8b0, 7, hitAt + 150);
      else { var p0 = A.position.clone(), lx = (b.x - a.x) / dist * 0.22, lz = (b.z - a.z) / dist * 0.22; B.tween(520, function (k) { var s = Math.sin(k * Math.PI); A.position.x = p0.x + lx * s; A.position.z = p0.z + lz * s; }); }
      setTimeout(function () { if (!D.parent) return; hitFx(D, e.dmg, e.dmg >= 3); if (du) thin(D, want(du), a); }, hitAt / V.speed);
    });
    ev.forEach(function (e) {
      var g = V.groups[e.id];
      if (e.e === 'die' && g) {
        setTimeout(function () {
          live(g).forEach(function (s, k) { setTimeout(function () { kill(s); }, k * 40); });
          var ban = g.userData.banner; if (ban) B.tween(600, function (k) { B.lean(ban, 0.6, 0.8, k * k * 1.4); });
          setTimeout(function () { if (V.groups[e.id] === g) { drop(g); delete V.groups[e.id]; } }, 3800);
        }, 420 / V.speed);
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
      if (!el) { el = V.bar[u.id] = document.createElement('div'); el.innerHTML = '<i></i>'; box.appendChild(el); }
      el.className = 'v3-hp p' + u.p + (u.t === 'ou' ? ' king' : ''); el.firstChild.style.width = Math.max(0, 100 * u.hp / u.mhp).toFixed(0) + '%'; el._h = u.t === 'ou' ? 0.75 : 0.6;
    });
    Object.keys(V.bar).forEach(function (id) { if (!keep[id]) { V.bar[id].remove(); delete V.bar[id]; } });
    place();
  }
  function place() { Object.keys(V.bar || {}).forEach(function (id) { var g = V.groups[id], el = V.bar[id], s = g && g.parent && scr(g.position.x, g.position.z, el._h); if (!s) { el.style.display = 'none'; return; } el.style.display = ''; el.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) translate(-50%,-50%)'; }); }
  function follow() { if (V._fol) return; V._fol = true; (function f() { if (!V.isOn()) { V._fol = false; return; } place(); requestAnimationFrame(f); })(); }
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
