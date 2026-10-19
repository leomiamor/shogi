// Schlachtfeld-Effekte im Armee-Modus nach der Total-War-Reihe (nur Optik, Regeln unverändert):
// Wetter, das sich während der Partie ändert (Pharaoh), Brände, die sich mit jeder geschlagenen Figur ausbreiten (Attila),
// Heldenduell-Moment, wenn König oder Drache kämpft (Three Kingdoms).
(function () {
  if (typeof Board3D === 'undefined') return;
  var T = THREE;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function sm(a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }

  // Wetter-Ablauf je Partie (Einstellung fieldWeather): wechsel = zufälliger Verlauf über die Züge, sonst fest
  Board3D.WEATHER = {
    klar: { cloud: 0, rain: 0, fog: 0, storm: 0 },
    regen: { cloud: 0.75, rain: 0.8, fog: 0.2, storm: 0 },
    gewitter: { cloud: 1, rain: 1, fog: 0.15, storm: 1 },
    nebel: { cloud: 0.45, rain: 0, fog: 1, storm: 0 }
  };
  // zufälliger Verlauf: ab Zug a zieht etwas auf, ab Zug b ist es voll da, ab Zug c klart es wieder auf
  Board3D.weatherPlan = function () {
    var kinds = ['regen', 'gewitter', 'nebel', 'regen'], k = kinds[Math.floor(Math.random() * kinds.length)], a = 10 + Math.floor(Math.random() * 25);
    return { kind: k, a: a, b: a + 8 + Math.floor(Math.random() * 8), c: a + 40 + Math.floor(Math.random() * 30), max: 0 };
  };

  Board3D.prototype.initWeather = function (hi) {
    var self = this, mode = this.settings.fieldWeather || 'wechsel', scene = this.scene;
    this.wx = { cloud: 0, rain: 0, fog: 0, storm: 0, wet: 0, mode: mode, plan: mode === 'wechsel' ? (Board3D._wplan = Board3D._wplan || Board3D.weatherPlan()) : null, flash: 0, nextBolt: 0, base: null };
    // Regen: Streifen als Liniensegmente, Bewegung komplett im Vertex-Shader (eine Zeichnung, keine CPU-Arbeit pro Bild)
    var N = this.mobile ? 1200 : 4000, P = new Float32Array(N * 6), E = new Float32Array(N * 2), i;
    for (i = 0; i < N; i++) { var x = Math.random(), y = Math.random(), z = Math.random(); P.set([x, y, z, x, y, z], i * 6); E[i * 2] = 0; E[i * 2 + 1] = 1; }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('aEnd', new T.BufferAttribute(E, 1));
    var U = this.rainU = { uTime: { value: 0 }, uC: { value: new T.Vector3() }, uA: { value: 0 }, uCol: { value: new T.Color(0xc8d0d8) } };
    var m = new T.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
      vertexShader: 'attribute float aEnd; uniform float uTime; uniform vec3 uC; varying float vA;\n' +
        'void main() { vec3 p = position; float sp = 13.0 + fract(p.x * 91.7) * 5.0; float y = fract(p.y - uTime * sp / 16.0) * 16.0;\n' +
        ' vec3 w = vec3((p.x - 0.5) * 36.0 + uC.x, y - 1.0 + uC.y, (p.z - 0.5) * 36.0 + uC.z); w.x += y * 0.12; w += aEnd * vec3(0.06, -0.55, 0.0);\n' +
        ' vA = (1.0 - aEnd * 0.8) * smoothstep(0.0, 2.0, y); gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }',
      fragmentShader: 'uniform float uA; uniform vec3 uCol; varying float vA; void main() { gl_FragColor = vec4(uCol, uA * vA); }' });
    var rain = this.rainMesh = new T.LineSegments(g, m); rain.frustumCulled = false; rain.visible = false; rain.renderOrder = 5; scene.add(rain);
    this.fireSpots = this.fireCandidates();
  };

  // Stellen, an denen sich Brände ausbreiten: um die Burg (Belagerung) bzw. im Dorf mit dem brennenden Hof
  Board3D.prototype.fireCandidates = function () {
    var MD = this.mood || {}, out = [], r = Board3D.rnd(4242), H = Board3D.fieldH, i, old = MD.fires || [[-6, -21]];
    // Flächen [x0, x1, z0, z1]: Belagerung = Vorstadt zwischen Burg und Feld plus Flanken, sonst ums Dorf
    var box = MD.shape === 'belagerung' ? [[-22, 22, -27, -14], [13, 22, -12, 4], [-22, -13, -12, 4]] : [[-16, 4, -27, -15]];
    for (i = 0; i < 200 && out.length < 12; i++) {
      var bx = box[i % box.length], x = bx[0] + r() * (bx[1] - bx[0]), z = bx[2] + r() * (bx[3] - bx[2]);
      if (Math.abs(x) < 10 && z > -17) continue; // Feld und Lager frei lassen
      if (old.concat(out).some(function (p) { return Math.hypot(p[0] - x, p[1] - z) < 3; })) continue;
      if (Math.abs(H(x + 1, z) - H(x, z)) + Math.abs(H(x, z + 1) - H(x, z)) > 1.2) continue;
      out.push([x, z]);
    }
    // Feuer springt weiter: zuerst die Stellen nahe den schon brennenden Häusern
    function near(p) { return Math.min.apply(null, old.map(function (q) { return Math.hypot(p[0] - q[0], p[1] - q[1]); })); }
    return out.sort(function (a, b) { return near(a) - near(b); });
  };
  // ein neuer Brand wächst aus dem Nichts (Flammen, Rauchsäule, verkohltes Haus)
  Board3D.prototype.addFire = function (p) {
    var self = this, scene = this.scene, Y = this.BT, fx = p[0], fz = p[1], fy = Y + Board3D.fieldH(fx, fz) + 0.3;
    var flames = [], n = this.mobile ? 3 : 5;
    for (var k = 0; k < n; k++) { var fl = new T.Sprite(this.fireMat()); fl.position.set(fx + (k - n / 2) * 0.32, fy + 0.2 + (k % 2) * 0.25, fz + (Math.random() - .5) * 0.5); fl.userData.s = [0.01, 0.01]; fl.center.set(0.5, 0.15); scene.add(fl); flames.push(fl); }
    var ruin = this.burntHouse(); ruin.position.set(fx, fy - 0.35, fz); ruin.rotation.y = Math.random() * 3; scene.add(ruin);
    var np = this.mobile ? 5 : 10, puffs = []; for (var j = 0; j < np; j++) { var sp = new T.Sprite(this.smokeMat()); sp.material.color.set(0x2a2622); sp.userData.t = j / np; scene.add(sp); puffs.push(sp); }
    var f = { x: fx, y: fy + 0.4, z: fz, fl: flames[0], flames: flames, puffs: puffs, big: 0.3, rise: 11 };
    this.campFires.push(f);
    var goal = flames.map(function () { return [0.9 + Math.random() * 0.5, 1.4 + Math.random() * 0.9]; });
    this.tween(4000, function (k) { var e = sm(0, 1, k); flames.forEach(function (fl, i) { fl.userData.s = [goal[i][0] * e, goal[i][1] * e]; }); f.big = 0.3 + e * 3.9; });
  };

  Board3D.prototype.weatherTick = function (now, dt) {
    var W = this.wx; if (!W) return;
    var st = this.state, ply = st ? (st.moves ? st.moves.length : st.ply || 0) : 0, goal;
    // neue Partie (wieder bei Zug 0, nachdem schon gezogen wurde): neuer Wetter-Verlauf
    if (W.plan && ply === 0 && W.plan.max > 0) W.plan = Board3D._wplan = Board3D.weatherPlan();
    if (W.plan) {
      W.plan.max = Math.max(W.plan.max, ply);
      var p = W.plan, a = sm(p.a, p.b, ply) * (1 - sm(p.c, p.c + 10, ply)), G = Board3D.WEATHER[p.kind];
      goal = { cloud: G.cloud * a, rain: G.rain * a, fog: G.fog * a, storm: G.storm * sm(p.b, p.b + 6, ply) * (1 - sm(p.c - 8, p.c, ply)) };
    } else goal = Board3D.WEATHER[W.mode] || Board3D.WEATHER.klar;
    if (this.wxForce) goal = this.wxForce;
    // weiche Übergänge (~6 s), nasser Boden trocknet langsam
    var k = 1 - Math.exp(-dt / 6000), MD = this.mood || {};
    ['cloud', 'rain', 'fog', 'storm'].forEach(function (q) { W[q] += (goal[q] - W[q]) * (W.snap ? 1 : k); });
    W.wet += (W.rain - W.wet) * (W.snap ? 1 : 1 - Math.exp(-dt / (W.rain > W.wet ? 8000 : 40000)));
    W.snap = false;
    var sc = this.scene, fog = sc.fog;
    // Grundwerte: was andere (Stimmung, Himmel lädt asynchron) gesetzt haben; eigene Werte von letztem Bild nicht übernehmen
    var B = W.base || (W.base = {}), S = W.set || (W.set = {}), c = W.cloud, R = this.renderer;
    function take(k, cur) { if (S[k] !== cur) B[k] = cur; }
    take('sun', this.sun.intensity); take('hemi', this.hemi.intensity); take('bg', sc.backgroundIntensity == null ? 1 : sc.backgroundIntensity); take('exp', R.toneMappingExposure);
    S.sun = this.sun.intensity = B.sun * (1 - 0.85 * c);
    S.hemi = this.hemi.intensity = B.hemi * (1 - 0.45 * c) + W.flash * 5;
    S.bg = sc.backgroundIntensity = B.bg * (1 - 0.65 * c) + W.flash * 2;
    S.exp = R.toneMappingExposure = B.exp * (1 - 0.35 * c + W.flash * 0.7) * (1 - (this.duelDim || 0));
    if (fog) {
      if (S.fogC !== fog.color.getHex()) B.fogC = fog.color.clone(); take('fogD', fog.density);
      var grey = this._wxGrey || (this._wxGrey = new T.Color()); grey.setRGB(0.3, 0.33, 0.37).lerp(B.fogC, 0.08);
      var mist = this._wxMist || (this._wxMist = new T.Color()); mist.setRGB(0.7, 0.72, 0.74).lerp(B.fogC, 0.12);
      fog.color.copy(B.fogC).lerp(mist, W.fog * 0.8).lerp(grey, c * (1 - W.fog * 0.5)); S.fogC = fog.color.getHex();
      S.fogD = fog.density = B.fogD * (1 + W.fog * 1.8 + c * 0.4);
      fog.near = 1 - 0.9 * Math.max(c, W.fog); // Wolken schlucken den Sonnenschein im Dunst
    }
    (this.mists || []).forEach(function (m) { if (m.o0 == null) m.o0 = m.s.material.opacity; m.s.material.opacity = Math.min(0.85, m.o0 * (1 + W.fog * 1.4)); });
    if (this.fieldU.uWet) this.fieldU.uWet.value = W.wet;
    // Regen folgt der Kamera
    var R = this.rainMesh; R.visible = W.rain > 0.02; if (R.visible) { this.rainU.uTime.value = now / 1000; this.rainU.uA.value = 0.5 * W.rain; this.rainU.uC.value.set(this.orbit.target.x, this.BT, this.orbit.target.z); }
    // Gewitter: Blitz = Himmel und Licht hell, doppelt flackernd
    if (W.storm > 0.5 && now > W.nextBolt) {
      W.nextBolt = now + 5000 + Math.random() * 9000; W.boltAt = now;
      if (typeof Sfx !== 'undefined' && Sfx.play) setTimeout(function () { Sfx.play('thunder', W.storm); }, 400 + Math.random() * 1200);
    }
    var bt = now - (W.boltAt || -1e9); W.flash = bt < 600 ? Math.max(0, (bt < 90 ? 1 : bt < 160 ? 0.15 : bt < 260 ? 0.8 : 0) * (1 - bt / 600)) * W.storm : 0;
    // Brände breiten sich aus: je zwei geschlagene Figuren ein neuer Brand (Handy höchstens zwei)
    if (st && st.hands && this.fireSpots) {
      var caps = 0; for (var s = 0; s < 2; s++) for (var t = 1; t < st.hands[s].length; t++) caps += st.hands[s][t] || 0;
      var want = Math.min(Math.floor(caps / 2), this.mobile ? 2 : (MD.shape === 'belagerung' ? 8 : 5), this.fireSpots.length);
      this.firesLit = this.firesLit || 0;
      while (this.firesLit < want) this.addFire(this.fireSpots[this.firesLit++]);
    }
  };

  // Heldenduell (Three Kingdoms): kämpft ein Held (König, Kirin, Drache), wird es Kino: Breitbild-Balken und etwas dunkler
  var fight0 = Board3D.prototype.armyFight;
  Board3D.prototype.armyFight = function (info, A, from, to, D, style) {
    // Verteidiger über info.cap (Stellungscode), das Regiment trägt während des Zugs evtl. noch den alten Typ
    var self = this, hero = Board3D.armyHero(Math.abs(A && A.userData.p || 0)) || Board3D.armyHero(Math.abs(info.cap || 0));
    if (!hero || this.settings.fights === 'kurz') return fight0.apply(this, arguments);
    this.duelBars(true);
    this.tween(900, function (k) { self.duelDim = 0.12 * k; }); // weatherTick rechnet es in die Belichtung ein
    return fight0.apply(this, arguments).then(function (r) {
      self.duelBars(false);
      self.tween(900, function (k) { self.duelDim = 0.12 * (1 - k); });
      return r;
    });
  };
  Board3D.prototype.duelBars = function (on) {
    var root = this.root, bars = this._bars;
    if (!bars) {
      bars = this._bars = [0, 1].map(function (i) { var d = document.createElement('div'); d.style.cssText = 'position:absolute;left:0;right:0;height:0;background:#000;z-index:5;pointer-events:none;transition:height .7s ease;' + (i ? 'bottom:0' : 'top:0'); root.appendChild(d); return d; });
    }
    bars.forEach(function (d) { d.style.height = on ? '10%' : '0'; });
  };
})();
