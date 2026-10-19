// Figuren-Ansicht lebt (wie das Schach in „No Game No Life“): die Gold/Silber-Statuen bekommen das Skelett der Armee-Truppen.
// In Ruhe Bind-Pose (steht still, genau wie modelliert), bei Aktionen echte Clips (Quaternius UAL, gebacken in models/anim/*):
// Gehen/Laufen zum Zielfeld, Zweikampf mit Parade und Tod, Kampfhaltung bei Auswahl, Jubel bei Beförderung, Abwurf und Sieg.
// Die Gewichte stammen vom Low-Poly-Rig und werden beim Laden auf die Detail-Statue übertragen (nächste Rig-Ecken),
// damit die Figur exakt wie die starre Statue aussieht. Typen ohne Rig behalten den alten Kampf (lean/faceTo in board3d.js).
(function () {
  var cache = {}, done = {};
  Board3D._figTransfer = function (d, A) { return transfer(d, A); }; // für Messungen

  // ---------- Gewichte vom Rig auf die Detail-Statue übertragen ----------
  // Ecken roh lesen (quantisiert, evtl. verschachtelt): liefert Array, Abstand, Versatz, Skala
  function raw(at) {
    var a = at.isInterleavedBufferAttribute ? at.data.array : at.array, st = at.isInterleavedBufferAttribute ? at.data.stride : at.itemSize, of = at.isInterleavedBufferAttribute ? at.offset : 0;
    var sc = !at.normalized ? 1 : a instanceof Int16Array ? 1 / 32767 : a instanceof Uint16Array ? 1 / 65535 : a instanceof Int8Array ? 1 / 127 : a instanceof Uint8Array ? 1 / 255 : 1;
    return { a: a, st: st, of: of, sc: sc };
  }
  // kurz abgeben, damit das Bild nicht hängt (MessageChannel: wird auch im Hintergrund nicht gedrosselt)
  function yieldNow() { return new Promise(function (res) { var ch = new MessageChannel(); ch.port1.onmessage = function () { res(); }; ch.port2.postMessage(0); }); }
  // Starre Teile wie beim Rig (tools/anim/fit_args.json „rigid“, erste passende Regel gewinnt), umgerechnet in den Rig-Raum
  // (Blender x, y, z → x, z, −y): Speer starr am Waffen-Knochen, Schwert an der Hand, Hut/Helm am Kopf, Flügel/Umhang am Rücken.
  // Ohne das mischt der nächste-Nachbar-Abgleich Hand und Waffe, und Speer/Schwert knicken in den Clips.
  Board3D.FIG_RIGID = {"ashigaru":[["weapon","seg",[-0.192,-0.479,0.068],[-0.187,0.493,0.133],0.022],["hand_r","seg",[-0.19,0.055,0.09],[-0.19,0.055,0.09],0.04],["weapon","pole",[[-9,-9,-9],[-0.17,-0.25,9]],[[-9,0.46,-9],[9,9,9]],0.024],["weapon","seg",[-0.188,0.367,0.125],[-0.187,0.5,0.133],0.06],["Head","ymin",0.3]],"veteran":[["weapon","seg",[-0.185,-0.49,0.177],[-0.209,0.476,0.17],0.022],["hand_r","seg",[-0.2,0.045,0.16],[-0.2,0.045,0.16],0.04],["weapon","pole",[[-9,-9,0.1],[-0.15,-0.3,0.3]],[[-9,0.38,0.1],[-0.15,9,0.3]],0.03],["weapon","seg",[-0.209,0.34,0.17],[-0.209,0.5,0.17],0.05],["spine_03","seg",[-0.045,-0.14,-0.1],[0.1,0.5,-0.18],0.03],["spine_03","box",[0.11,0.26,-0.3],[0.26,0.47,-0.12]],["hand_l","seg",[0.175,-0.05,0.02],[0.185,-0.08,0.02],0.035],["pelvis","seg",[0.11,0.02,0.13],[0.22,-0.22,-0.19],0.022],["Head","ymin",0.3]],"yari":[["weapon","seg",[-0.195,-0.5,0.104],[-0.2,0.3,0.12],0.022],["hand_r","seg",[-0.19,0.04,0.11],[-0.19,0.04,0.11],0.04],["weapon","seg",[-0.195,-0.5,0.104],[-0.2,0.3,0.12],0.03],["weapon","seg",[-0.2,0.25,0.13],[-0.2,0.5,0.12],0.07],["Head","ymin",0.3]],"kenshi":[["hand_r","seg",[-0.23,0.22,0.17],[0.06,0.49,-0.19],0.03],["hand_r","seg",[-0.24,0.25,0.1],[-0.22,0.32,0.12],0.05],["pelvis","seg",[0.07,0.03,0.05],[0.21,-0.27,-0.19],0.025],["Head","box",[-0.15,0.29,-0.2],[0.15,0.6,0.2]]],"onmyoji":[["hand_r","seg",[-0.16,0.24,0.15],[-0.14,0.39,0.15],0.06],["Head","ymin",0.3]],"tengu":[["spine_03","box",[-0.6,0.24,-0.3],[-0.17,0.5,0.2]],["spine_03","box",[0.17,0.24,-0.3],[0.6,0.5,0.2]],["spine_03","box",[-0.6,-0.2,-0.3],[-0.22,0.5,-0.03]],["spine_03","box",[0.22,-0.2,-0.3],[0.6,0.5,-0.03]],["spine_03","box",[-0.22,0.0,-0.3],[0.22,0.45,-0.08]],["Head","ymin",0.3]],"samurai":[["hand_r","seg",[-0.2,-0.05,0.06],[-0.29,-0.23,0.3],0.03],["Head","ymin",0.3]],"general":[["hand_r","seg",[-0.28,0.13,0.23],[-0.3,0.49,0.27],0.04],["hand_l","seg",[0.12,-0.02,0.15],[0.12,0.09,0.35],0.03],["spine_03","box",[-0.6,-0.35,-0.4],[0.6,0.3,-0.07]],["spine_03","box",[-0.6,-0.35,-0.4],[-0.25,-0.02,0.3]],["spine_03","box",[0.25,-0.35,-0.4],[0.6,-0.02,0.3]],["Head","ymin",0.3]],"naginata":[["hand_r","seg",[-0.34,0.3,0.34],[0.36,-0.245,-0.31],0.04],["hand_r","seg",[0.36,-0.245,-0.31],[0.22,-0.14,-0.18],0.06],["Head","ymin",0.3]]};
  Board3D.FIG_RIGID_R = 1.0; // Radien wie beim Rig (1,25 änderte nichts sichtbar)
  function rigidRules(A, base) {
    var src = Board3D.FIG_RIGID[String(base || '').split('/').pop()] || [], rp = A.geo.getAttribute('position'), K = Board3D.FIG_RIGID_R;
    function inb(x, y, z, bx) { return x >= bx[0][0] && x <= bx[1][0] && y >= bx[0][1] && y <= bx[1][1] && z >= bx[0][2] && z <= bx[1][2]; }
    return src.map(function (r) {
      var bi = A.meta.bones.indexOf(r[0]); if (bi < 0) return null;
      if (r[1] === 'seg') return { b: bi, k: 'seg', p: r[2], d: [r[3][0] - r[2][0], r[3][1] - r[2][1], r[3][2] - r[2][2]], r: r[4] * K };
      if (r[1] === 'box') return { b: bi, k: 'box', bx: [r[2], r[3]] };
      if (r[1] === 'ymin') return { b: bi, k: 'ymin', y: r[2] };
      // Stange durch die Schwerpunkte der Rig-Ecken in zwei Kästen (wie weights.py)
      var c0 = [0, 0, 0, 0], c1 = [0, 0, 0, 0];
      for (var i = 0; i < rp.count; i++) { var x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i), c = inb(x, y, z, r[2]) ? c0 : inb(x, y, z, r[3]) ? c1 : null; if (c) { c[0] += x; c[1] += y; c[2] += z; c[3]++; } }
      if (!c0[3] || !c1[3]) return null;
      var p = [c0[0] / c0[3], c0[1] / c0[3], c0[2] / c0[3]], d = [c1[0] / c1[3] - p[0], c1[1] / c1[3] - p[1], c1[2] / c1[3] - p[2]], l = Math.hypot(d[0], d[1], d[2]);
      return { b: bi, k: 'line', p: p, d: [d[0] / l, d[1] / l, d[2] / l], r: r[4] * K };
    }).filter(Boolean);
  }
  function rigidHit(R, v) {
    for (var i = 0; i < R.length; i++) {
      var r = R[i], hit;
      if (r.k === 'ymin') hit = v[1] > r.y;
      else if (r.k === 'box') hit = v[0] >= r.bx[0][0] && v[0] <= r.bx[1][0] && v[1] >= r.bx[0][1] && v[1] <= r.bx[1][1] && v[2] >= r.bx[0][2] && v[2] <= r.bx[1][2];
      else {
        var ax = v[0] - r.p[0], ay = v[1] - r.p[1], az = v[2] - r.p[2], d = r.d, t = ax * d[0] + ay * d[1] + az * d[2];
        if (r.k === 'seg') { var dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2]; t = dd > 1e-9 ? Math.max(0, Math.min(1, t / dd)) : 0; }
        ax -= d[0] * t; ay -= d[1] * t; az -= d[2] * t; hit = ax * ax + ay * ay + az * az < r.r * r.r;
      }
      if (hit) return r.b;
    }
    return -1;
  }
  // Höhenausgleich je Clip: der Boden der Clips liegt etwas tiefer als die Sohle der Statue (Füße steckten im Sockel).
  // Je Clip: tiefster Punkt des Rigs über alle Frames gegen die Ruhepose, nur anheben (Rig-Einheiten)
  function clipLift(A) {
    if (A._figLift) return A._figLift;
    var H = THREE.DataUtils.fromHalfFloat, d = A.tex.image.data, nb = A.meta.bones.length, P = A.geo.getAttribute('position'), I = A.geo.getAttribute('aSkinI'), W = A.geo.getAttribute('aSkinW');
    // nur Fuß-Ecken (stärkster Knochen foot_*/ball_*): Waffen schwingen in Angriffen unter den Boden, Körper liegen beim Sterben
    var L = new Float32Array(32), y0 = Infinity, ft = [], i;
    for (i = 0; i < P.count; i++) { var bw = 0, bn = -1; for (var q0 = 0; q0 < 4; q0++) if (W.getComponent(i, q0) > bw) { bw = W.getComponent(i, q0); bn = I.getComponent(i, q0); } if (/^(foot|ball)_/.test(A.meta.bones[bn] || '')) ft.push(i); }
    ft.forEach(function (j) { y0 = Math.min(y0, P.getY(j)); });
    Object.keys(A.ids).forEach(function (nm) {
      var c = A.clips[A.ids[nm]], mn = Infinity;
      for (var f = 0; f < c.y; f += 2) for (var fi = 0; fi < ft.length; fi++) { i = ft[fi];
        var x = P.getX(i), y = P.getY(i), z = P.getZ(i), yy = 0;
        for (var q = 0; q < 4; q++) { var w = W.getComponent(i, q); if (!w) continue; var o = (c.x + f) * nb * 12 + I.getComponent(i, q) * 12 + 4; yy += w * (H(d[o]) * x + H(d[o + 1]) * y + H(d[o + 2]) * z + H(d[o + 3])); }
        if (yy < mn) mn = yy;
      }
      L[A.ids[nm]] = Math.max(0, Math.min(0.1, y0 - mn));
    });
    return (A._figLift = L);
  }

  function transfer(d, A, base) {
    var T = THREE, m = null; d.updateMatrixWorld(true); d.traverse(function (o) { if (o.isMesh && !m) m = o; });
    var RR = rigidRules(A, base);
    var pa = m.geometry.getAttribute('position'), n = pa.count, P = raw(pa), rp = A.geo.getAttribute('position'), rn = rp.count, i, c, k;
    var si = A.geo.getAttribute('aSkinI'), sw = A.geo.getAttribute('aSkinW'), SI = new Int32Array(rn * 4), SW = new Float32Array(rn * 4);
    for (i = 0; i < rn; i++) { SI[i * 4] = si.getX(i); SI[i * 4 + 1] = si.getY(i); SI[i * 4 + 2] = si.getZ(i); SI[i * 4 + 3] = si.getW(i); SW[i * 4] = sw.getX(i); SW[i * 4 + 1] = sw.getY(i); SW[i * 4 + 2] = sw.getZ(i); SW[i * 4 + 3] = sw.getW(i); }
    // Raster über die Rig-Ecken (CSR: Zellstart + Ecken je Zelle)
    var bb = new T.Box3().setFromBufferAttribute(rp), h = 0.03, ox = bb.min.x - h, oy = bb.min.y - h, oz = bb.min.z - h;
    var nx = Math.ceil((bb.max.x - ox) / h) + 2, ny = Math.ceil((bb.max.y - oy) / h) + 2, nz = Math.ceil((bb.max.z - oz) / h) + 2;
    var R = new Float32Array(rn * 3), cellOf = new Int32Array(rn), start = new Int32Array(nx * ny * nz + 1), items = new Int32Array(rn);
    function cx(v, o, nn) { var q = Math.floor((v - o) / h); return q < 0 ? 0 : q >= nn ? nn - 1 : q; }
    for (i = 0; i < rn; i++) { R[i * 3] = rp.getX(i); R[i * 3 + 1] = rp.getY(i); R[i * 3 + 2] = rp.getZ(i); c = (cx(R[i * 3], ox, nx) * ny + cx(R[i * 3 + 1], oy, ny)) * nz + cx(R[i * 3 + 2], oz, nz); cellOf[i] = c; start[c + 1]++; }
    for (c = 0; c < nx * ny * nz; c++) start[c + 1] += start[c];
    var fill = start.slice(0, nx * ny * nz); for (i = 0; i < rn; i++) items[fill[cellOf[i]]++] = i;
    // Kandidaten um (x,y,z): wächst ringweise, bis die nächste Rig-Ecke sicher gefunden ist (cj = Index, cd = Abstand², nc = Anzahl)
    var cj = new Int32Array(rn), cd = new Float32Array(rn), nc = 0;
    function search(x, y, z) {
      var X = cx(x, ox, nx), Y = cx(y, oy, ny), Z = cx(z, oz, nz), best = Infinity;
      for (var r = 1; r < 12; r++) {
        nc = 0; best = Infinity;
        for (var a = Math.max(0, X - r); a <= Math.min(nx - 1, X + r); a++) for (var b = Math.max(0, Y - r); b <= Math.min(ny - 1, Y + r); b++) {
          var q0 = (a * ny + b) * nz, s0 = start[q0 + Math.max(0, Z - r)], s1 = start[q0 + Math.min(nz - 1, Z + r) + 1];
          for (var s = s0; s < s1; s++) { var j = items[s], dx = R[j * 3] - x, dy = R[j * 3 + 1] - y, dz = R[j * 3 + 2] - z, d2 = dx * dx + dy * dy + dz * dz; cj[nc] = j; cd[nc++] = d2; if (d2 < best) best = d2; }
        }
        if (best <= (r * h) * (r * h)) return best;
      }
      return best;
    }
    function pos(q, M, out) { var e = M.elements, o = q * P.st + P.of, px = P.a[o] * P.sc, py = P.a[o + 1] * P.sc, pz = P.a[o + 2] * P.sc; out[0] = e[0] * px + e[4] * py + e[8] * pz + e[12]; out[1] = e[1] * px + e[5] * py + e[9] * pz + e[13]; out[2] = e[2] * px + e[6] * py + e[10] * pz + e[14]; }
    // Drehung um y finden (Typ 2 wurde fürs Rig um 90° gedreht): Stichprobe, kleinster mittlerer Abstand gewinnt
    var N = m.matrixWorld, RN = null, bestErr = Infinity, step = Math.max(1, Math.floor(n / 1500)), v = [0, 0, 0];
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(function (th) {
      var M = new T.Matrix4().makeRotationY(th).multiply(N), err = 0;
      for (var q = 0; q < n; q += step) { pos(q, M, v); err += Math.sqrt(search(v[0], v[1], v[2])); }
      if (err < bestErr) { bestErr = err; RN = M; }
    });
    // je Detail-Ecke: Gewichte der nahen Rig-Ecken mischen (bis 1,4× des kleinsten Abstands), die 4 stärksten Knochen behalten
    var nb = A.meta.bones.length, acc = new Float32Array(nb), I = new Uint8Array(n * 4), W = new Uint8Array(n * 4), top = [0, 0, 0, 0], tw = [0, 0, 0, 0];
    function part(i0, i1) {
      for (var q = i0; q < i1; q++) {
        pos(q, RN, v);
        var rb = RR.length ? rigidHit(RR, v) : -1;
        if (rb >= 0) { I[q * 4] = rb; W[q * 4] = 255; I[q * 4 + 1] = I[q * 4 + 2] = I[q * 4 + 3] = W[q * 4 + 1] = W[q * 4 + 2] = W[q * 4 + 3] = 0; continue; }
        var lim = search(v[0], v[1], v[2]) * 1.96 + 1e-5;
        acc.fill(0);
        for (var t = 0; t < nc; t++) {
          if (cd[t] > lim) continue;
          var j = cj[t] * 4, w = 1 / (Math.sqrt(cd[t]) + 0.003); w *= w;
          acc[SI[j]] += w * SW[j]; acc[SI[j + 1]] += w * SW[j + 1]; acc[SI[j + 2]] += w * SW[j + 2]; acc[SI[j + 3]] += w * SW[j + 3];
        }
        top[0] = top[1] = top[2] = top[3] = 0; tw[0] = tw[1] = tw[2] = tw[3] = 0;
        for (var b2 = 0; b2 < nb; b2++) { var a2 = acc[b2]; if (a2 <= tw[3]) continue; var p = 3; while (p > 0 && a2 > tw[p - 1]) { tw[p] = tw[p - 1]; top[p] = top[p - 1]; p--; } tw[p] = a2; top[p] = b2; }
        var sum = tw[0] + tw[1] + tw[2] + tw[3] || 1, rest = 255;
        for (var t2 = 3; t2 >= 0; t2--) { var q2 = t2 ? Math.round(tw[t2] / sum * 255) : rest; I[q * 4 + t2] = top[t2]; W[q * 4 + t2] = q2; rest -= q2; }
      }
    }
    var CH = Board3D.MOBILE ? 10000 : 30000, chain = Promise.resolve();
    for (k = 0; k < n; k += CH) (function (k0) { chain = chain.then(function () { part(k0, Math.min(n, k0 + CH)); return yieldNow(); }); })(k);
    chain = chain.then(function () { clipLift(A); return yieldNow(); }); // Höhenausgleich vorab (nicht erst beim Kompilieren)
    return chain.then(function () {
      var geo = new T.BufferGeometry(); geo.setIndex(m.geometry.index);
      for (var nm in m.geometry.attributes) geo.setAttribute(nm, m.geometry.attributes[nm]);
      geo.setAttribute('aSkinI', new T.BufferAttribute(I, 4)); geo.setAttribute('aSkinW', new T.BufferAttribute(W, 4, true));
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      var mesh = new T.Mesh(geo, m.material); mesh.matrixAutoUpdate = false; mesh.matrix.copy(RN); mesh.castShadow = mesh.receiveShadow = true;
      var src = new T.Group(); src.add(mesh); src.updateMatrixWorld(true);
      return { src: src, A: A, node: RN.clone(), nodeI: RN.clone().invert() };
    });
  }

  // Statue mit Skelett laden (Detail-GLB + Rig); Promise, gecacht je Modell. Übertragungen laufen nacheinander (weniger Ruckeln)
  var queue = Promise.resolve();
  Board3D.figSkin = function (url, base) {
    if (!cache[url]) cache[url] = Promise.all([Models.load(url), SkinAnim.load(base)]).then(function (r) {
      var job = queue.then(function () { return transfer(r[0], r[1], base); }); queue = job.catch(function () { }); return job;
    }).then(function (S) { return (done[url] = S); }, function (e) { done[url] = false; throw e; });
    return cache[url];
  };
  Board3D.figSkinCached = function (url) { return url in done ? done[url] : null; };
  // Rig je Modellnummer (detail_N): nur Feudal-Statuen in der Figuren-Ansicht
  Board3D.prototype.figSkinBase = function (url) {
    if (this.theme.id !== 'feudal' || this.settings.figSet !== 'statue' || this.settings.skel === false || !window.SkinAnim || !url) return null;
    var mm = /detail_(\d+)\.glb$/.exec(url); return mm && Board3D.FIG_SKIN.indexOf(+mm[1]) >= 0 && Board3D.SKIN[+mm[1]] || null;
  };
  Board3D.FIG_SKIN = [1, 2, 4, 5, 6, 7, 8, 9, 12]; // Modelle, die in der Figuren-Ansicht das Skelett nutzen (alle Menschen mit Rig)

  // makePiece-Haken: true = Figur mit Skelett angehängt; sonst normaler Weg (starre Statue), Skelett-Figur ersetzt sie nach dem Laden
  Board3D.prototype.figSkinTry = function (g, url, col) {
    var base = this.figSkinBase(url); if (!base) return false;
    var S = Board3D.figSkinCached(url); if (S) { this.attachSkin(g, S, col); return true; }
    if (S === false) return false;
    var self = this;
    Board3D.figSkin(url, base).then(function (S2) {
      if (!self.alive || g.parent !== self.pieceGroup || g.userData.sk) return;
      var old = g.userData.glb || g.userData.fig; if (old) g.remove(old); g.userData.glb = g.userData.fig = null;
      self.attachSkin(g, S2, col);
    }).catch(function () { });
    return false;
  };

  // Material je Figur (eigene Uniform iClip = Clip A/Start A/Clip B/Start B), Statuen-Look wie statueMat
  var BLEND = null;
  function patch(sh, A, U, depth, rim) {
    SkinAnim.patch(sh, A, depth);
    BLEND = BLEND || SkinAnim.VS_NORMAL.split('\n').filter(function (l) { return l.indexOf('skBl < 1.0') >= 0; })[0];
    // Skin-Matrizen gelten im Rig-Raum, die Ecken liegen quantisiert im Mesh-Raum: L = Node⁻¹ · Skin · Node
    var vs = sh.vertexShader.replace('attribute vec4 iClip;', 'uniform vec4 iClip; uniform mat4 uNode; uniform mat4 uNodeI; uniform float uLift[32];')
      .replace(BLEND, BLEND + '\nfloat skL = uLift[int(iClip.x)]; if (skBl < 1.0 && iClip.z >= 0.0) skL = skL * skBl + uLift[int(iClip.z)] * (1.0 - skBl);\nskM[3][1] += skL;\nskM = uNodeI * skM * uNode;');
    sh.uniforms.uLift = { value: clipLift(A) };
    if (!depth) vs = vs.replace('objectNormal = normalize(mat3(skM) * objectNormal);', 'objectNormal = normalize(mat3(skM) * objectNormal);\n#ifdef USE_TANGENT\nobjectTangent = mat3(skM) * objectTangent;\n#endif');
    sh.vertexShader = vs; sh.uniforms.iClip = U.iClip; sh.uniforms.uNode = U.uNode; sh.uniforms.uNodeI = U.uNodeI;
    if (rim) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vec3(1.0, 0.12, 0.05) * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2) * 1.6;');
  }
  Board3D.prototype.attachSkin = function (g, S, col) {
    var T = THREE, A = S.A, rim = Math.abs(g.userData.p || 0) >= 9 && this.settings.promoStyle === 'glanz';
    this.attachGlb(g, S.src, col);
    var m = g.userData.glb, mesh = null; m.traverse(function (o) { if (o.isMesh) mesh = o; });
    var U = { iClip: { value: new T.Vector4(A.ids.bind, 0, -1, 0) }, uNode: { value: S.node }, uNodeI: { value: S.nodeI } };
    var mat = mesh.material.clone(); mat.onBeforeCompile = function (sh) { patch(sh, A, U, false, rim); }; mat.customProgramCacheKey = function () { return rim ? 'figS-rim' : 'figS'; };
    var dm = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }); dm.onBeforeCompile = function (sh) { patch(sh, A, U, true); }; dm.customProgramCacheKey = function () { return 'figSd'; };
    // in Ruhe zeichnet die Figur mit dem normalen Statuen-Material (Bind-Pose = Ruhepose), Skinning kostet nur während Aktionen
    g.userData.sk = { A: A, U: U, clip: [A.ids.bind, 0, -1, 0], cur: 'bind', until: 0, then: null, mats: [mat, dm], mesh: mesh, stat: mesh.material, off: 0 };
  };
  // Figur entfernt: eigene Materialien freigeben (Programm bleibt im Cache)
  Board3D.prototype.figFree = function (g) { var k = g && g.userData.sk; if (k) { k.mats.forEach(function (x) { x.dispose(); }); k.mats = []; } };

  // ---------- Clips ----------
  // Clip abspielen. o: hitAt = Sekunden bis zum Treffer (Clip wird so verschoben, dass sein Treffer-Frame passt),
  // then = Folge-Clip nach dem Ende (Standard: Kampfhaltung, wenn ausgewählt, sonst still stehen), hold = letztes Bild halten, freeze = bei dieser Sekunde anhalten
  Board3D.prototype.figPlay = function (g, name, o) {
    var k = g && g.userData.sk; if (!k) return 0; o = o || {};
    if (Array.isArray(name)) name = name[Math.floor(Math.random() * name.length)];
    var A = k.A; if (A.ids[name] == null) return 0;
    var loop = A.meta.clips[name][2], now = SkinAnim.time.value;
    if (loop && k.cur === name) { k.until = 0; return 0; }
    var off = o.hitAt != null ? Math.max(0, (A.hit[name] || 0) - o.hitAt) : 0;
    SkinAnim.play(A, k, name, off + 1e-4); k.U.iClip.value.fromArray(k.clip); k.cur = name;
    if (name === 'bind') k.off = now + SkinAnim.FADE + 0.05; else { k.off = 0; k.mesh.material = k.mats[0]; k.mesh.customDepthMaterial = k.mats[1]; k.mesh.frustumCulled = false; } // bewegt: Bounding-Box stimmt nicht mehr
    var left = A.dur[name] - off;
    k.until = loop || name === 'bind' || o.hold ? 0 : now + left * (o.cut || 0.9); k.then = o.then || null; k.frz = o.freeze != null ? o.freeze : null;
    return left;
  };
  Board3D.prototype.figRest = function (g) { var k = g && g.userData.sk; if (k && !k.busy) this.figPlay(g, k.sel ? Board3D.FIG_SEL : 'bind'); };
  Board3D.FIG_SEL = 'idle'; // Auswahl: lebendig stehen (die Hocke 'ready' verzerrt die Statuen, Füße tief, Schulterplatten reißen)
  // jedes Bild (aus update): Einzel-Clip zu Ende → Folge-Clip
  Board3D.prototype.figTick = function (g) {
    var k = g.userData.sk;
    if (k.off && SkinAnim.time.value >= k.off) { k.off = 0; k.mesh.material = k.stat; k.mesh.customDepthMaterial = undefined; k.mesh.frustumCulled = true; }
    // freeze: Clip bei dieser Sekunde anhalten (Startzeit wandert mit der Uhr mit)
    if (k.frz != null) { var s0 = SkinAnim.time.value - k.frz; if (s0 > k.clip[1]) { k.clip[1] = s0; k.U.iClip.value.y = s0; } }
    if (!k.until || SkinAnim.time.value < k.until) return;
    k.until = 0; var nx = k.then; k.then = null;
    if (nx) this.figPlay(g, nx); else if (!k.busy) this.figRest(g);
  };
  // Auswahl: Kampfhaltung einnehmen, abgewählt wieder still
  Board3D.prototype.figSelect = function (sq) {
    var g = sq != null && sq >= 0 && this.look !== 'feld' ? this.pieces[sq] : null; if (g === this._selG) return;
    var old = this._selG; this._selG = g;
    if (old && old.userData.sk) { old.userData.sk.sel = false; this.figRest(old); }
    if (g && g.userData.sk) { g.userData.sk.sel = true; if (!g.userData.sk.busy) this.figPlay(g, Board3D.FIG_SEL); }
  };
  function snd(n, a, t) { if (typeof Sfx !== 'undefined') Sfx.play(n, a, t); }
  function typ(g) { return Math.abs(g.userData.p || 0); }

  // ---------- Zug: zur Zielfläche gehen/laufen (Stein trägt die Figur, Füße passen zum Tempo) ----------
  Board3D.FIG_GAIT = { walk: 1.0, run: 2.1, sprint: 3.6 }; // Felder pro Sekunde, passend zur Schrittlänge der Clips
  // onNear: kurz vor der Ankunft (geschlagene Figur ohne Kampf wegräumen), Promise
  Board3D.prototype.figWalk = function (g, from, to, onNear) {
    var self = this, k = g.userData.sk, dx = to.x - from.x, dz = to.z - from.z, dist = Math.hypot(dx, dz) || 1e-4;
    var gait = dist <= 1.5 ? 'walk' : dist <= 3.2 ? 'run' : 'sprint', ms = Math.min(1600, dist / Board3D.FIG_GAIT[gait] * 1000); // mit Beförderung unter der 2,5-s-Notbremse in app.js
    k.busy = true; this.figPlay(g, gait); snd('march', ms + 150, typ(g));
    var turn = this.faceTo(g, to.x, to.z, 200), near = null;
    function ease(x) { return x < 0.12 ? x * x / 0.24 : x > 0.88 ? 1 - (1 - x) * (1 - x) / 0.24 : x - 0.06; } // weich an- und auslaufen
    return turn.then(function () { return self.tween(ms, function (q) { var e = ease(q) / 0.88; g.position.x = from.x + dx * e; g.position.z = from.z + dz * e; g.position.y = self.BT; if (onNear && !near && q > 0.45) near = onNear(); }); })
      .then(function () { return near; })
      .then(function () { k.busy = false; self.figRest(g); var m = g.userData.glb, a0 = m.userData.face || 0; self.tween(260, function (q) { m.userData.face = a0 * (1 - q * q * (3 - 2 * q)); }); }); // Zurückdrehen läuft nebenher
  };

  // ---------- Kampf mit Skelett (Angreifer hat ein Rig) ----------
  // Zweikampf: Anlauf, Hieb gegen Parade, Gegenschlag, Todesstoß, Sterbe-Animation, dann zerfällt der Verlierer zu Staub
  Board3D.prototype.figFight = function (info, A, from, to, D, style) {
    var self = this, T = THREE, short = this.settings.fights === 'kurz', sp = short ? 0.75 : 1, BT = this.BT;
    var dx = to.x - from.x, dz = to.z - from.z, dist = Math.hypot(dx, dz) || 1, ux = dx / dist, uz = dz / dist;
    var cell = Math.hypot(this.sqPos(1).x - this.sqPos(0).x, this.sqPos(1).z - this.sqPos(0).z) || 1;
    var colA = new T.Color(this.theme.factions[info.col].color).getHex(), dust = this.dustColor(1 - info.col), big = Math.abs(info.cap) >= 6;
    var ka = A.userData.sk, kd = D.userData.sk, ta = typ(A), td = typ(D); ka.busy = true; if (kd) kd.busy = true;
    function wait(ms) { return self.tween(ms * sp, function () { }); }
    function ease(k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
    var o = this.orbit, cam0 = { x: o.target.x, z: o.target.z, r: o.radius }, mx = (from.x + to.x) / 2, mz = (from.z + to.z) / 2;
    if (!short) this.tween(420, function (k) { var e = ease(k); o.target.x = cam0.x + (mx - cam0.x) * e * 0.85; o.target.z = cam0.z + (mz - cam0.z) * e * 0.85; o.radius = cam0.r * (1 - 0.3 * e); });
    function camBack() { if (short) return; var c1 = { x: o.target.x, z: o.target.z, r: o.radius }; self.tween(600, function (k) { var e = ease(k); o.target.x = c1.x + (cam0.x - c1.x) * e; o.target.z = c1.z + (cam0.z - c1.z) * e; o.radius = c1.r + (cam0.r - c1.r) * e; }); }
    function sparks(x, z, color, n, shake) { self.emit(x, BT + 0.7, z, color, n, 4, 1.1); self.emit(x, BT + 0.7, z, 0xffffff, n / 3, 2.5, 1.3); self.shakeAmt = Math.max(self.shakeAmt || 0, shake); }
    function mid() { return { x: (A.position.x + D.position.x) / 2, z: (A.position.z + D.position.z) / 2 }; }
    // Verteidiger ohne Rig reagiert mit dem ganzen Körper (wie bisher)
    function leanD(ang, ms) { if (kd) return Promise.resolve(); var a0 = D.userData.ang || 0; return self.tween(ms * sp, function (k) { D.userData.ang = a0 + (ang - a0) * ease(k); self.lean(D, ux, uz, D.userData.ang); }); }
    // ein Schlag: Angreifer holt aus, beim Treffer-Frame pariert der Gegner (oder wird getroffen)
    function strike(att, def, kill) {
      var hitAt = 0.32 * sp, ka2 = att.userData.sk, kd2 = def.userData.sk;
      if (ka2) self.figPlay(att, kill ? 'atk4' : ['atk1', 'atk2'], { hitAt: hitAt, then: 'ready' });
      else leanD(-0.3, hitAt * 700);
      if (kd2 && !kill) self.figPlay(def, 'block', { hitAt: hitAt, then: 'ready' });
      snd('whoosh', 0.7, typ(att));
      return self.tween(hitAt * 1000, function () { }).then(function () {
        var p = mid();
        if (!kill) { snd('clash', 0.8); sparks(p.x, p.z, 0xffffff, 22, 0.14); if (!kd2 && def === D) return leanD(-0.25, 140).then(function () { return leanD(0, 160); }); return; }
        if (info.onHit) info.onHit();
        snd('hit', 0.9, typ(att)); sparks(def.position.x, def.position.z, colA, big ? 90 : 60, big ? 0.5 : 0.35);
      });
    }
    // Verteidiger stirbt: Sterbe-Animation (oder Umkippen ohne Rig), dann zerfällt er zu Staub
    function die() {
      var p0 = D.position.clone(), fall;
      if (kd) { var left = self.figPlay(D, Math.random() < 0.5 ? 'die1' : 'die2', { hold: true }); snd('fall', 0.8, td); fall = wait(Math.min(1500, left * 1000 * 0.85)); }
      else fall = self.tween(420 * sp, function (k) { var e = k * k; self.lean(D, ux, uz, e * 1.45); D.position.x = p0.x + ux * e * 0.35; D.position.z = p0.z + uz * e * 0.35; });
      return fall.then(function () {
        snd('crumble'); self.shakeAmt = Math.max(self.shakeAmt || 0, 0.15);
        for (var i = 0; i < 4; i++) self.emit(D.position.x + ux * (i - 1) * 0.18, BT + 0.15 + i * 0.08, D.position.z + uz * (i - 1) * 0.18, dust, 28, 1.6, 0.9);
        return self.tween(320 * sp, function (k) { D.scale.setScalar(1 - k); D.position.y = p0.y - k * 0.3; });
      }).then(function () { self.pieceGroup.remove(D); self.figFree(D); });
    }
    // Sieger geht aufs Feld und steht wieder still
    function stepIn() {
      var x0 = A.position.x, z0 = A.position.z, d2 = Math.hypot(to.x - x0, to.z - z0), g2 = d2 <= 1.5 ? 'walk' : d2 <= 3.2 ? 'run' : 'sprint';
      var ms = Math.max(250, Math.min(1700, d2 / Board3D.FIG_GAIT[g2] * 1000)); // nach dem Zauber ggf. weiter Weg: laufen statt schleichen
      self.figPlay(A, g2);
      return self.faceTo(A, to.x, to.z, 160).then(function () { return self.tween(ms, function (k) { A.position.x = x0 + (to.x - x0) * k; A.position.z = z0 + (to.z - z0) * k; A.position.y = BT; }); })
        .then(function () { ka.busy = false; self.figRest(A); camBack(); self.emit(to.x, BT + 0.05, to.z, 0xd8c8a0, 10, 1.2, 0.3); var m = A.userData.glb, a0 = m.userData.face || 0; return self.tween(260, function (k) { m.userData.face = a0 * (1 - k); }); });
    }
    // beide drehen sich zueinander, nehmen Kampfhaltung ein
    var face = Promise.all([this.faceTo(A, to.x, to.z, 180), this.faceTo(D, from.x, from.z, 180)]).then(function () { if (kd) self.figPlay(D, 'ready'); });

    if (style === 'magic') {
      // Onmyōji: Ofuda-Zauber aus der Distanz (Zauber-Clip), Kugel fliegt, Gegner fällt
      var bolt = null;
      return face.then(function () { self.figPlay(A, 'ready'); return wait(220); }).then(function () {
        self.figPlay(A, ['atk1', 'atk2'], { hitAt: 0.25 }); return wait(250);
      }).then(function () {
        snd('zap', 0.8, ta);
        bolt = new T.Mesh(new T.SphereGeometry(0.16, 12, 8), new T.MeshBasicMaterial({ color: colA, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false }));
        self.scene.add(bolt); var head = BT + 0.95;
        return self.tween((300 + dist * 40) * sp, function (k) { var x = from.x + dx * k, z = from.z + dz * k, y = head + Math.sin(k * Math.PI) * 0.8; bolt.position.set(x, y, z); bolt.scale.setScalar(1 + Math.sin(k * 30) * 0.2); self.emitDir(x, y, z, colA, 3, 0, 0, 0, 0.6); });
      }).then(function () { self.scene.remove(bolt); if (info.onHit) info.onHit(); sparks(to.x, to.z, colA, big ? 90 : 60, big ? 0.5 : 0.35); if (kd) self.figPlay(D, 'hit1'); return die(); }).then(stepIn);
    }
    // Nahkampf: Anlauf (Laufen bzw. Sprint beim Ansturm), Schlagabtausch, Todesstoß
    var stand = cell * (style === 'thrust' ? 0.95 : 0.85), stx = to.x - ux * stand, stz = to.z - uz * stand, run = Math.hypot(stx - from.x, stz - from.z);
    var gait = style === 'charge' || run > 2.5 ? 'sprint' : run > 0.9 ? 'run' : 'walk', ms = Math.max(260, Math.min(1200, run / Board3D.FIG_GAIT[gait] * 1000));
    var seq = face.then(function () {
      self.figPlay(A, gait); snd('march', ms, ta); if (gait === 'sprint') snd('roar', 0.5, ta);
      return self.tween(ms, function (k) { var e = k < 0.85 ? k / 0.85 * 0.92 : 0.92 + (k - 0.85) / 0.15 * 0.08; A.position.x = from.x + (stx - from.x) * e; A.position.z = from.z + (stz - from.z) * e; A.position.y = BT; });
    }).then(function () { self.figPlay(A, 'ready'); return wait(120); })
      .then(function () { return strike(A, D, false); }).then(function () { return wait(380); });
    if (!short) seq = seq.then(function () { return strike(D, A, false); }).then(function () { return wait(380); });
    return seq.then(function () { return strike(A, D, true); }).then(die).then(stepIn);
  };

  // Verteidiger mit Rig, Angreifer ohne (Fuchs-Sprung, Hirsch-Ansturm, Feueratem): nur der Tod mit Sterbe-Animation
  Board3D.prototype.figDie = function (D, dust, sp, ux, uz) {
    var self = this, k = D.userData.sk, p0 = D.position.clone(); k.busy = true;
    if (D.userData.q0) D.quaternion.copy(D.userData.q0);
    var left = this.figPlay(D, Math.random() < 0.5 ? 'die1' : 'die2', { hold: true }); snd('fall', 0.8, typ(D));
    return this.tween(Math.min(1500, left * 850) * sp, function () { }).then(function () {
      snd('crumble'); self.shakeAmt = Math.max(self.shakeAmt || 0, 0.15);
      for (var i = 0; i < 4; i++) self.emit(D.position.x + ux * (i - 1) * 0.18, self.BT + 0.15 + i * 0.08, D.position.z + uz * (i - 1) * 0.18, dust, 28, 1.6, 0.9);
      return self.tween(320 * sp, function (q) { D.scale.setScalar(1 - q); D.position.y = p0.y - q * 0.3; });
    }).then(function () { self.pieceGroup.remove(D); self.figFree(D); });
  };

  // ---------- Auftritte ----------
  // Beförderung: kurzer Jubel, Lichtblitz, neue Figur (eigenes Modell) jubelt weiter
  Board3D.prototype.figPromo = function (mover, np0, to) {
    var self = this, k = mover.userData.sk; if (k) { k.busy = true; this.figPlay(mover, 'cheer1'); }
    return this.tween(k ? 420 : 200, function () { }).then(function () {
      var np = self.makePiece(np0); np.position.copy(mover.position); self.pieceGroup.remove(mover); self.figFree(mover); self.pieceGroup.add(np);
      if (self._lastMove && self._lastMove.g === mover) self._lastMove.g = np;
      self.emit(to.x, self.BT + 0.9, to.z, 0xffd76a, 80, 4, 1.4); self.emit(to.x, self.BT + 0.2, to.z, 0xff5a3a, 40, 2.5, 0.8);
      if (np.userData.sk) self.figPlay(np, 'cheer3');
      return np;
    });
  };
  // Abwurf: landet, fängt sich, kurzer Ruf
  Board3D.prototype.figLand = function (g) { if (g.userData.sk) this.figPlay(g, 'cheer1'); };
  // Matt: Sieger jubeln (versetzt), Verlierer sinken nieder
  Board3D.prototype.figMate = function () {
    var self = this, st = this.state; if (!st || this.look === 'feld') return;
    var loser = st.turn; // am Zug ist, wer matt ist
    Object.keys(this.pieces).forEach(function (q) {
      var g = self.pieces[q]; if (!g || !g.userData.sk) return;
      var win = (g.userData.p > 0 ? 0 : 1) !== loser, delay = Math.random() * 450;
      g.userData.sk.busy = true;
      self.tween(delay, function () { }).then(function () {
        if (win) self.figPlay(g, ['cheer1', 'cheer3'], { then: 'cheer2' });
        else if (Board3D.SKIN_KNEEL in g.userData.sk.A.ids) self.figPlay(g, Board3D.SKIN_KNEEL, { hold: true });
        else self.figPlay(g, 'die2', { hold: true, freeze: Math.abs(g.userData.p) === 8 ? 0.45 : 0.3 }); // Sterben anhalten, wenn sie auf den Knien sind
      });
    });
  };
  Board3D.SKIN_KNEEL = 'kneel'; // Clip zum Niederknien (falls gebacken), sonst wird die2 auf den Knien angehalten
})();
