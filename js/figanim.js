// Figuren-Ansicht lebt (wie das Schach in „No Game No Life“): die Gold/Silber-Statuen bekommen das Skelett der Armee-Truppen.
// In Ruhe Bind-Pose (steht still, genau wie modelliert), bei Aktionen echte Clips (Quaternius UAL, gebacken in models/anim/*):
// Gehen/Laufen zum Zielfeld, Zweikampf mit Parade und Tod, Kampfhaltung bei Auswahl, Jubel bei Beförderung, Abwurf und Sieg.
// Die Gewichte stammen vom Low-Poly-Rig und werden beim Laden auf die Detail-Statue übertragen (nächste Rig-Ecken),
// damit die Figur exakt wie die starre Statue aussieht. Typen ohne Rig behalten den alten Kampf (lean/faceTo in board3d.js).
(function () {
  var cache = {}, done = {};
  Board3D._figTransfer = function (d, A, base) { return transfer(d, A, base); }; // für Messungen
  Board3D._figArm = function (A, base) { return armCaps(A, base); };

  // ---------- Gewichte vom Rig auf die Detail-Statue übertragen ----------
  // Ecken roh lesen (quantisiert, evtl. verschachtelt): liefert Array, Abstand, Versatz, Skala
  function raw(at) {
    var a = at.isInterleavedBufferAttribute ? at.data.array : at.array, st = at.isInterleavedBufferAttribute ? at.data.stride : at.itemSize, of = at.isInterleavedBufferAttribute ? at.offset : 0;
    var sc = !at.normalized ? 1 : a instanceof Int16Array ? 1 / 32767 : a instanceof Uint16Array ? 1 / 65535 : a instanceof Int8Array ? 1 / 127 : a instanceof Uint8Array ? 1 / 255 : 1;
    return { a: a, st: st, of: of, sc: sc };
  }
  // kurz abgeben, damit das Bild nicht hängt (MessageChannel: wird auch im Hintergrund nicht gedrosselt)
  function yieldNow() { return new Promise(function (res) { var ch = new MessageChannel(); ch.port1.onmessage = function () { res(); }; ch.port2.postMessage(0); }); }
  // Starre Teile wie beim Rig (tools/anim/fit_args.json „rigid“ aller Editionen, erste passende Regel gewinnt), umgerechnet in den Rig-Raum
  // (Blender x, y, z → x, z, −y): Speer starr am Waffen-Knochen, Schwert an der Hand, Hut/Helm am Kopf, Flügel/Umhang am Rücken.
  // Ohne das mischt der nächste-Nachbar-Abgleich Hand und Waffe, und Speer/Schwert knicken in den Clips.
  Board3D.FIG_RIGID = {"ashigaru":[["weapon","seg",[-0.192,-0.479,0.068],[-0.187,0.493,0.133],0.022],["hand_r","seg",[-0.19,0.055,0.09],[-0.19,0.055,0.09],0.04],["weapon","pole",[[-9,-9,-9],[-0.17,-0.25,9]],[[-9,0.46,-9],[9,9,9]],0.024],["weapon","seg",[-0.188,0.367,0.125],[-0.187,0.5,0.133],0.06],["Head","ymin",0.3]],"veteran":[["weapon","seg",[-0.185,-0.49,0.177],[-0.209,0.476,0.17],0.022],["hand_r","seg",[-0.2,0.045,0.16],[-0.2,0.045,0.16],0.04],["weapon","pole",[[-9,-9,0.1],[-0.15,-0.3,0.3]],[[-9,0.38,0.1],[-0.15,9,0.3]],0.03],["weapon","seg",[-0.209,0.34,0.17],[-0.209,0.5,0.17],0.05],["spine_03","seg",[-0.045,-0.14,-0.1],[0.1,0.5,-0.18],0.03],["spine_03","box",[0.11,0.26,-0.3],[0.26,0.47,-0.12]],["hand_l","seg",[0.175,-0.05,0.02],[0.185,-0.08,0.02],0.035],["pelvis","seg",[0.11,0.02,0.13],[0.22,-0.22,-0.19],0.022],["Head","ymin",0.3]],"yari":[["weapon","seg",[-0.195,-0.5,0.104],[-0.2,0.3,0.12],0.022],["hand_r","seg",[-0.19,0.04,0.11],[-0.19,0.04,0.11],0.04],["weapon","seg",[-0.195,-0.5,0.104],[-0.2,0.3,0.12],0.03],["weapon","seg",[-0.2,0.25,0.13],[-0.2,0.5,0.12],0.07],["Head","ymin",0.3]],"kenshi":[["hand_r","seg",[-0.23,0.22,0.17],[0.06,0.49,-0.19],0.03],["hand_r","seg",[-0.24,0.25,0.1],[-0.22,0.32,0.12],0.05],["pelvis","seg",[0.07,0.03,0.05],[0.21,-0.27,-0.19],0.025],["Head","box",[-0.15,0.29,-0.2],[0.15,0.6,0.2]]],"onmyoji":[["hand_r","seg",[-0.16,0.24,0.15],[-0.14,0.39,0.15],0.06],["Head","ymin",0.3]],"tengu":[["spine_03","box",[-0.6,0.24,-0.3],[-0.17,0.5,0.2]],["spine_03","box",[0.17,0.24,-0.3],[0.6,0.5,0.2]],["spine_03","box",[-0.6,-0.2,-0.3],[-0.22,0.5,-0.03]],["spine_03","box",[0.22,-0.2,-0.3],[0.6,0.5,-0.03]],["spine_03","box",[-0.22,0.0,-0.3],[0.22,0.45,-0.08]],["Head","ymin",0.3]],"samurai":[["hand_r","seg",[-0.2,-0.05,0.06],[-0.29,-0.23,0.3],0.03],["hand_r","box",[-0.3,-0.26,0.05],[-0.16,-0.02,0.33]],["Head","ymin",0.3]],"general":[["hand_r","seg",[-0.28,0.13,0.23],[-0.3,0.49,0.27],0.04],["hand_l","seg",[0.12,-0.02,0.15],[0.12,0.09,0.35],0.03],["spine_03","box",[-0.6,-0.35,-0.4],[0.6,0.3,-0.07]],["spine_03","box",[-0.6,-0.35,-0.4],[-0.25,-0.02,0.3]],["spine_03","box",[0.25,-0.35,-0.4],[0.6,-0.02,0.3]],["Head","ymin",0.3]],"naginata":[["hand_r","seg",[-0.34,0.3,0.34],[0.36,-0.245,-0.31],0.04],["hand_r","seg",[0.36,-0.245,-0.31],[0.22,-0.14,-0.18],0.06],["Head","ymin",0.3]],"kirin":[["Head","box",[-0.2,0.36,0.1],[0.2,0.6,0.5]]],"ryu":[["Head","box",[-0.25,0.36,-0.2],[0.25,0.6,0.2]]],"hauptmann":[["weapon","seg",[0.054,-0.46,-0.26],[-0.12,0.05,0.08],0.014],["weapon","seg",[-0.12,0.05,0.08],[-0.32,0.41,0.33],0.022],["hand_r","seg",[-0.12,0.05,0.08],[-0.12,0.05,0.08],0.04],["weapon","seg",[-0.12,0.05,0.08],[-0.32,0.41,0.33],0.035],["weapon","seg",[-0.24,0.25,0.24],[-0.32,0.41,0.33],0.09],["cape","box",[-0.6,-0.6,-0.6],[0.6,0.12,-0.1]],["cape","box",[-0.6,-0.6,-0.6],[-0.17,0.12,0.1]],["cape","box",[0.27,-0.6,-0.6],[0.6,0.12,0.1]],["Head","box",[-0.15,0.27,-0.2],[0.18,0.6,0.2]]],"fantasy_1":[["hand_r","seg",[-0.17,-0.05,0.0],[-0.33,-0.27,0.19],0.03],["hand_l","box",[0.19,-0.26,-0.24],[0.4,0.19,0.25]],["Head","ymin",0.28]],"fantasy_9":[["hand_r","seg",[-0.215,0.12,0.17],[-0.2,0.5,0.14],0.035],["hand_l","box",[0.1,-0.29,-0.13],[0.3,0.18,0.18]],["Head","ymin",0.27]],"fantasy_10":[["weapon","seg",[-0.1,-0.1,-0.15],[-0.15,0.05,0.0],0.014],["weapon","seg",[-0.15,0.05,0.0],[-0.29,0.42,0.33],0.022],["hand_r","seg",[-0.15,0.05,0.0],[-0.15,0.05,0.0],0.04],["weapon","seg",[-0.15,0.05,0.0],[-0.29,0.42,0.33],0.035],["weapon","seg",[-0.23,0.22,0.17],[-0.29,0.42,0.33],0.09],["cape","box",[-0.6,-0.1,-0.6],[0.6,0.12,-0.1]],["cape","box",[-0.6,-0.4,-0.6],[0.6,-0.1,-0.15]],["cape","box",[-0.6,-0.4,-0.6],[-0.17,0.0,0.1]],["cape","box",[0.3,-0.4,-0.6],[0.6,0.0,0.1]],["Head","box",[-0.15,0.27,-0.3],[0.18,0.6,0.2]]],"fantasy_12":[["hand_r","seg",[-0.28,0.09,0.34],[0.18,0.37,-0.2],0.035],["hand_r","box",[0.06,0.25,-0.34],[0.31,0.5,-0.07]],["Head","box",[-0.17,0.24,-0.15],[0.17,0.6,0.25]]],"fantasy_8":[["weapon","seg",[0,-0.23,0.19],[0,0.035,0.2],0.03],["weapon","seg",[-0.06,0.02,0.2],[0.06,0.02,0.2],0.02],["cape","box",[-0.6,-0.6,-0.6],[0.6,0.15,0.04]],["cape","box",[-0.6,-0.6,-0.6],[-0.19,0.12,0.6]],["cape","box",[0.19,-0.6,-0.6],[0.6,0.12,0.6]],["Head","box",[-0.12,0.28,-0.15],[0.12,0.6,0.2]]],"fantasy_11":[["Ear1.L","box",[0.15,-0.12,-0.6],[0.6,0.6,0.6]],["Ear1.R","box",[-0.6,-0.12,-0.6],[-0.15,0.6,0.6]],["Head","box",[-0.08,0.1,0.3],[0.08,0.4,0.6]]],"mecha_1":[["hand_r","seg",[0.06,0.04,0.2],[0.166,0.013,0.323],0.06],["hand_r","seg",[-0.14,0.186,-0.118],[0.166,0.013,0.323],0.05],["Head","ymin",0.33]],"mecha_4":[["hand_r","seg",[-0.211,0.224,0.146],[0.052,0.5,-0.015],0.035],["Head","box",[-0.1,0.22,-0.2],[0.12,0.6,0.2]]],"mecha_9":[["hand_r","seg",[0.1,0.08,0.2],[0.225,0.018,0.295],0.06],["hand_r","seg",[-0.171,0.262,-0.018],[0.225,0.018,0.295],0.045],["Head","box",[-0.11,0.33,-0.06],[0.1,0.6,0.25]],["spine_03","box",[-0.25,0.0,-0.6],[0.25,0.6,-0.07]]],"mecha_12":[["spine_03","seg",[-0.15,0.02,0.093],[0.241,0.437,0.057],0.035],["spine_03","seg",[0.16,0.02,0.094],[-0.163,0.33,0.066],0.035],["Head","box",[-0.12,0.27,-0.1],[0.12,0.6,0.25]],["pelvis","box",[-0.07,-0.36,0.05],[0.07,-0.02,0.3]],["cape","box",[-0.6,-0.42,-0.6],[0.6,0.0,-0.06]],["cape","box",[-0.6,-0.6,-0.6],[-0.19,-0.04,0.6]],["cape","box",[0.19,-0.6,-0.6],[0.6,-0.04,0.6]]],"mecha_5":[["hand_r","box",[-0.5,-0.3,-0.26],[-0.29,0.36,0.12]],["hand_l","seg",[0.3,0.02,0.08],[0.47,0.03,0.3],0.05],["Head","box",[-0.09,0.29,-0.2],[0.09,0.6,0.2]]],"mecha_8":[["weapon","seg",[-0.245,-0.47,0.18],[-0.245,0.49,0.18],0.03],["weapon","seg",[-0.245,0.12,0.2],[-0.245,0.49,0.18],0.08],["hand_l","seg",[0.219,-0.016,0.066],[0.279,-0.384,-0.195],0.03],["cape","box",[-0.6,-0.4,-0.6],[0.6,0.15,-0.08]],["cape","box",[-0.6,-0.4,-0.6],[-0.2,0.0,0.1]],["cape","box",[0.25,-0.4,-0.6],[0.6,-0.05,0.1]],["Head","box",[-0.1,0.27,-0.1],[0.1,0.6,0.2]]],"mecha_3":[["hand_r","seg",[-0.37,-0.05,0.12],[-0.46,-0.16,0.18],0.03],["Head","box",[-0.1,0.28,-0.1],[0.12,0.6,0.3]]],"mecha_10":[["weapon","seg",[-0.217,0.15,0.06],[-0.218,0.157,0.422],0.045],["spine_03","box",[-0.3,0.05,-0.6],[0.3,0.6,-0.12]],["Head","box",[-0.1,0.26,-0.12],[0.1,0.6,0.1]]],"mecha_11":[["hand_r","seg",[-0.327,-0.054,0.008],[-0.489,-0.272,0.071],0.035],["hand_l","seg",[0.328,-0.053,0.011],[0.488,-0.281,0.058],0.035]],"hunde_9":[["Head","box",[-0.1,0.3,0.0],[0.1,0.6,0.3]]],"hunde_11":[["Torso3","box",[-0.6,0.08,-0.3],[0.6,0.35,0.0]]],"hunde_1":[["Head","box",[-0.22,0.27,0.08],[0.22,0.6,0.45]]],"hunde_6":[["Head","box",[-0.15,0.36,0.0],[0.15,0.6,0.35]]],"hunde_8":[["Head","box",[-0.1,0.37,0.05],[0.1,0.6,0.25]]]};
  Board3D.FIG_RIGID_R = 1.0; // Radien wie beim Rig (1,25 änderte nichts sichtbar)
  Board3D.FIG_RIGID_RS = { hauptmann: 2.2 }; // je Rig: Faktor auf die Radien (Hauptmann: die Detail-Stange ist dicker als im Low-Poly-Rig, sonst bleibt ein Stück am Bein)
  function rigidRules(A, base) {
    var nm = String(base || '').split('/').pop(), src = Board3D.FIG_RIGID[nm] || [], rp = A.geo.getAttribute('position'), K = Board3D.FIG_RIGID_R * (Board3D.FIG_RIGID_RS[nm] || 1);
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
  // Arm-Kapseln gegen verzogenen Stoff: das Low-Poly-Rig hängt Brustpanzer, Rock und Umhang teils an Ober-/Unterarm,
  // die Detail-Statue erbt das und reißt Kleidung mit, die der Arm gar nicht berührt. Gelenke stehen nicht in der Rig-JSON,
  // also aus den Clips: ein Gelenk ist der Punkt, den Eltern- und Kindknochen in jedem Frame gleich bewegen (kleinste Quadrate).
  // Arm-Gewicht bleibt nur nah an der Knochenachse (weich auslaufend) und nur, wenn die Ecke näher am Arm als am Rumpf liegt.
  Board3D.FIG_ARM = { r0: 0.08, pad: 1.1, min: 0.05, max: 0.14, soft: 1.4, rel: [1.0, 0.75] }; // Radius = gemessene Armdicke × pad (Rig-Einheiten, Figur ≈ 1 hoch), weich bis × soft; Verhältnis Arm/Rumpf-Abstand
  Board3D.FIG_ARM_SCALE = {}; // je Rig-Datei (z. B. dicke Mech-Arme): Faktor auf die Radien
  // Hände nur bei diesen Rigs umhängen: ihre gehaltenen Waffen sitzen per FIG_RIGID fest (geprüft). Sonst sind ferne
  // Hand-Ecken Schild, Fächer oder Kanone und müssen mit der Hand gehen.
  Board3D.FIG_HELD = ['ashigaru', 'veteran', 'yari', 'kenshi', 'onmyoji', 'tengu', 'samurai', 'general', 'naginata', 'hauptmann'];
  function armCaps(A, base) {
    var bn = A.meta.bones, ix = function (n) { return bn.indexOf(n); };
    if (ix('upperarm_l') < 0 || ix('upperarm_r') < 0 || ix('spine_03') < 0 || ix('pelvis') < 0) return null; // nur Menschen-Rigs
    var H = THREE.DataUtils.fromHalfFloat, d = A.tex.image.data, nb = bn.length, rows = A.tex.image.height;
    function joint(a, b) {
      var ia = ix(a), ib = ix(b); if (ia < 0 || ib < 0) return null;
      var N = [0, 0, 0, 0, 0, 0, 0, 0, 0], R = [0, 0, 0], D = [0, 0, 0];
      for (var f = 0; f < rows; f += 2) {
        var oa = f * nb * 12 + ia * 12, ob = f * nb * 12 + ib * 12;
        for (var r = 0; r < 3; r++) {
          for (var k = 0; k < 3; k++) D[k] = H(d[oa + r * 4 + k]) - H(d[ob + r * 4 + k]);
          var t = H(d[ob + r * 4 + 3]) - H(d[oa + r * 4 + 3]);
          for (var i = 0; i < 3; i++) { for (var j = 0; j < 3; j++) N[i * 3 + j] += D[i] * D[j]; R[i] += D[i] * t; }
        }
      }
      var m = new THREE.Matrix3().set(N[0], N[1], N[2], N[3], N[4], N[5], N[6], N[7], N[8]);
      if (Math.abs(m.determinant()) < 1e-12) return null;
      var v = new THREE.Vector3(R[0], R[1], R[2]).applyMatrix3(m.invert());
      return isFinite(v.x + v.y + v.z) ? [v.x, v.y, v.z] : null;
    }
    var nm = String(base || '').split('/').pop(), K = Board3D.FIG_ARM, sc = Board3D.FIG_ARM_SCALE[nm] || 1, arm = [], torso = [];
    var held = Board3D.FIG_HELD.indexOf(nm) >= 0;
    function seg(b, p, q, arm1) { if (b >= 0 && p && q) (arm1 ? arm : torso).push({ b: b, p: p, d: [q[0] - p[0], q[1] - p[1], q[2] - p[2]] }); }
    for (var s = 0; s < 2; s++) {
      var e = s ? '_r' : '_l', sh = joint('clavicle' + e, 'upperarm' + e), el = joint('upperarm' + e, 'lowerarm' + e), wr = joint('lowerarm' + e, 'hand' + e);
      if (!sh || !el || !wr) return null;
      seg(ix('upperarm' + e), sh, el, 1); seg(ix('lowerarm' + e), el, wr, 1);
      if (held) seg(ix('hand' + e), wr, [wr[0] + (wr[0] - el[0]) * 0.45, wr[1] + (wr[1] - el[1]) * 0.45, wr[2] + (wr[2] - el[2]) * 0.45], 1);
    }
    var s1 = joint('pelvis', 'spine_01'), s2 = joint('spine_01', 'spine_02'), s3 = joint('spine_02', 'spine_03'), nk = joint('spine_03', 'neck_01'), hd = joint('neck_01', 'Head');
    var hl = joint('pelvis', 'thigh_l'), hr = joint('pelvis', 'thigh_r'); if (!s1 || !nk) return null;
    var hip = hl && hr ? [(hl[0] + hr[0]) / 2, (hl[1] + hr[1]) / 2 - 0.06, (hl[2] + hr[2]) / 2] : [s1[0], s1[1] - 0.1, s1[2]];
    seg(ix('pelvis'), hip, s1); seg(ix('spine_01'), s1, s2 || s3 || nk); seg(ix('spine_02'), s2 || s1, s3 || nk); seg(ix('spine_03'), s3 || s2 || s1, nk); if (hd) seg(ix('neck_01'), nk, hd);
    // Dicke je Armstück aus dem Rig messen: Rig-Ecken mit diesem Knochen als stärkstem, auf der Außenseite (vom Rumpf weg),
    // dort stört kein Rumpf; Rüstungsärmel und Schulterplatten sind je Modell sehr verschieden dick
    var rp = A.geo.getAttribute('position'), si = A.geo.getAttribute('aSkinI'), sw = A.geo.getAttribute('aSkinW'), dom = new Int32Array(rp.count);
    for (var i = 0; i < rp.count; i++) { var bw = 0; dom[i] = -1; for (var q = 0; q < 4; q++) if (sw.getComponent(i, q) > bw) { bw = sw.getComponent(i, q); dom[i] = si.getComponent(i, q); } }
    arm.forEach(function (S) {
      var dd = S.d[0] * S.d[0] + S.d[1] * S.d[1] + S.d[2] * S.d[2], mx = S.p[0] + S.d[0] / 2, mz = S.p[2] + S.d[2] / 2, ol = Math.hypot(mx - nk[0], mz - nk[2]) || 1, ox = (mx - nk[0]) / ol, oz = (mz - nk[2]) / ol, ds = [];
      for (var i = 0; i < rp.count; i++) {
        if (dom[i] !== S.b) continue;
        var ax = rp.getX(i) - S.p[0], ay = rp.getY(i) - S.p[1], az = rp.getZ(i) - S.p[2], t = (ax * S.d[0] + ay * S.d[1] + az * S.d[2]) / dd;
        if (t < 0.1 || t > 0.9) continue; ax -= S.d[0] * t; ay -= S.d[1] * t; az -= S.d[2] * t;
        var l = Math.hypot(ax, ay, az); if (l > 1e-6 && (ax * ox + az * oz) / l > 0.3) ds.push(l);
      }
      ds.sort(function (a, b) { return a - b; });
      var r = ds.length >= 4 ? ds[Math.floor(ds.length * 0.85)] : K.r0;
      S.r0 = Math.max(K.min, Math.min(K.max, r * K.pad)) * sc; S.r1 = S.r0 * K.soft;
    });
    var isArm = new Uint8Array(nb); bn.forEach(function (n, i) { if (/^(upperarm|lowerarm)_/.test(n) || held && /^hand_/.test(n)) isArm[i] = 1; });
    var isAll = new Uint8Array(nb); bn.forEach(function (n, i) { if (/^(upperarm|lowerarm|hand)_|^weapon$/.test(n)) isAll[i] = 1; }); // Arm samt Waffe (für Glätten und Schnitt)
    return { arm: arm, torso: torso, rel: K.rel, isArm: isArm, isAll: isAll, hand: held ? [-1, -1] : [ix('hand_l'), ix('hand_r')] };
  }
  function segD2(S, v) {
    var ax = v[0] - S.p[0], ay = v[1] - S.p[1], az = v[2] - S.p[2], d = S.d, dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], t = dd > 1e-9 ? Math.max(0, Math.min(1, (ax * d[0] + ay * d[1] + az * d[2]) / dd)) : 0;
    ax -= d[0] * t; ay -= d[1] * t; az -= d[2] * t; return ax * ax + ay * ay + az * az;
  }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  // acc (Gewicht je Knochen) für Ecke v korrigieren: Arm-Anteil außerhalb der Kapsel → vorhandene Rumpf-/Bein-Anteile, sonst nächster Rumpfknochen
  function armFix(C, acc, v) {
    var da = Infinity, f = 0, dt = Infinity, tb = -1, i, S, q, hb = acc[C.hand[0]] > acc[C.hand[1]] ? C.hand[0] : C.hand[1];
    if (hb >= 0) { var big = 0; for (i = 0; i < acc.length; i++) if (acc[i] > big) big = acc[i]; if (acc[hb] >= big) return; } // Hand vorn (Modell ohne FIG_RIGID): gehaltene Waffe, bleibt
    for (i = 0; i < C.arm.length; i++) { S = C.arm[i]; q = Math.sqrt(segD2(S, v)); var fi = smooth(S.r1, S.r0, q); if (fi > f) f = fi; if (q < da) da = q; }
    for (i = 0; i < C.torso.length; i++) { q = segD2(C.torso[i], v); if (q < dt) { dt = q; tb = C.torso[i].b; } }
    f *= smooth(C.rel[0], C.rel[1], da / (Math.sqrt(dt) + 1e-6));
    if (f >= 0.999) return;
    var rm = 0, rest = 0;
    for (i = 0; i < acc.length; i++) { if (!acc[i]) continue; if (C.isArm[i]) { rm += acc[i] * (1 - f); acc[i] *= f; } else rest += acc[i]; }
    if (rm > rest && tb >= 0) acc[tb] += rm - rest;
  }
  // Gewichte über das Mesh glätten: harte Sprünge zwischen Nachbar-Ecken (Rock halb Oberschenkel, halb Becken) reißen
  // bei Ausfallschritt und Ausholen Streifen. Ecken mit gleicher Lage (UV-Nähte) werden verschweißt, sonst klaffen Nähte.
  // Starre Teile (FIG_RIGID) bleiben, wirken aber auf die Nachbarn. iters Runden, je halb eigener Wert, halb Nachbarmittel.
  Board3D.FIG_SMOOTH = 3;
  function smoothW(ix, n, nb, I, W, posOf, rigid, isArm) {
    var key = new Map(), wid = new Int32Array(n), nw = 0, o = [0, 0, 0], q, i, j, b;
    for (q = 0; q < n; q++) { posOf(q, o); var kk = Math.round(o[0] * 1e4) + ',' + Math.round(o[1] * 1e4) + ',' + Math.round(o[2] * 1e4), id = key.get(kk); if (id == null) { id = nw++; key.set(kk, id); } wid[q] = id; }
    var fix = new Uint8Array(nw), deg = new Int32Array(nw + 1), cnt = new Float32Array(nw), D = new Float32Array(nw * nb), E = new Float32Array(nw * nb);
    for (q = 0; q < n; q++) { var w0 = wid[q]; cnt[w0]++; for (j = 0; j < 4; j++) D[w0 * nb + I[q * 4 + j]] += W[q * 4 + j] / 255; if (rigid && rigid(q)) fix[w0] = 1; }
    for (i = 0; i < nw; i++) if (cnt[i] > 1) for (b = 0; b < nb; b++) D[i * nb + b] /= cnt[i];
    // Arm-Grenze scharf lassen: Ecken mit Arm-Anteil bleiben, Arm-Gewicht wandert nicht in den Rumpf (sonst wird das Netz zwischen Arm und Flanke breiter)
    if (isArm) for (i = 0; i < nw; i++) for (b = 0; b < nb; b++) if (isArm[b] && D[i * nb + b] > 0.004) { fix[i] = 1; break; }
    // Nachbarn (CSR) aus den Dreiecken
    for (i = 0; i < ix.length; i += 3) for (j = 0; j < 3; j++) { var a0 = wid[ix[i + j]], b0 = wid[ix[i + (j + 1) % 3]]; if (a0 !== b0) { deg[a0 + 1]++; deg[b0 + 1]++; } }
    for (i = 0; i < nw; i++) deg[i + 1] += deg[i];
    var adj = new Int32Array(deg[nw]), fill = deg.slice(0, nw);
    for (i = 0; i < ix.length; i += 3) for (j = 0; j < 3; j++) { var a1 = wid[ix[i + j]], b1 = wid[ix[i + (j + 1) % 3]]; if (a1 !== b1) { adj[fill[a1]++] = b1; adj[fill[b1]++] = a1; } }
    var it = 0, R = D, S = E;
    function round() {
      for (var u = 0; u < nw; u++) {
        var s0 = deg[u], s1 = deg[u + 1], ub = u * nb, c;
        if (fix[u] || s1 === s0) { for (c = 0; c < nb; c++) S[ub + c] = R[ub + c]; continue; }
        var k = 0.5 / (s1 - s0);
        for (c = 0; c < nb; c++) S[ub + c] = R[ub + c] * 0.5;
        for (var e = s0; e < s1; e++) { var vb = adj[e] * nb; for (c = 0; c < nb; c++) if (R[vb + c] && !(isArm && isArm[c])) S[ub + c] += R[vb + c] * k; }
      }
      var t = R; R = S; S = t;
    }
    var chain = Promise.resolve();
    for (it = 0; it < Board3D.FIG_SMOOTH; it++) chain = chain.then(function () { round(); return yieldNow(); });
    return chain.then(function () {
      var top = [0, 0, 0, 0], tw = [0, 0, 0, 0];
      for (q = 0; q < n; q++) {
        var u = wid[q]; if (fix[u]) continue; var ub = u * nb;
        top[0] = top[1] = top[2] = top[3] = 0; tw[0] = tw[1] = tw[2] = tw[3] = 0;
        for (b = 0; b < nb; b++) { var a2 = R[ub + b]; if (a2 <= tw[3]) continue; var p = 3; while (p > 0 && a2 > tw[p - 1]) { tw[p] = tw[p - 1]; top[p] = top[p - 1]; p--; } tw[p] = a2; top[p] = b; }
        var sum = tw[0] + tw[1] + tw[2] + tw[3] || 1, rest = 255;
        for (j = 3; j >= 0; j--) { var q2 = j ? Math.round(tw[j] / sum * 255) : rest; I[q * 4 + j] = top[j]; W[q * 4 + j] = q2; rest -= q2; }
      }
    });
  }
  // Arm und Flanke sind in den Statuen verschmolzen (die Arme liegen am Körper an, Klingen am Bein). Hebt der Clip den Arm,
  // spannt sich die Verbindung als Netz vom Arm bis zur Hüfte. Dreiecke an der Arm-Grenze, die in den Kampf-Clips über FIG_CUT-fach gedehnt
  // würden, fallen in der Bewegungs-Geometrie weg (in Ruhe zeichnet die volle Statue): der Arm löst sich sauber vom Körper.
  Board3D.FIG_CUT = 3;
  function armCut(A, C, g, RN, I, W) {
    var H = THREE.DataUtils.fromHalfFloat, d = A.tex.image.data, nb = A.meta.bones.length, P = raw(g.getAttribute('position')), n = g.getAttribute('position').count;
    var ix = g.index.array, aw = new Float32Array(n), q, j, i;
    for (q = 0; q < n; q++) for (j = 0; j < 4; j++) if (C.isAll[I[q * 4 + j]]) aw[q] += W[q * 4 + j] / 255;
    // nur Dreiecke an der Arm-Grenze prüfen
    var cand = []; for (i = 0; i < ix.length; i += 3) { var a = aw[ix[i]], b = aw[ix[i + 1]], c = aw[ix[i + 2]]; if (Math.max(a, b, c) - Math.min(a, b, c) > 0.3) cand.push(i); }
    if (!cand.length) return null;
    var e = RN.elements, R = new Float32Array(n * 3), Q = new Float32Array(n * 3), used = new Uint8Array(n), dead = new Uint8Array(ix.length / 3);
    cand.forEach(function (t) { used[ix[t]] = used[ix[t + 1]] = used[ix[t + 2]] = 1; });
    for (q = 0; q < n; q++) if (used[q]) { var o = q * P.st + P.of, x = P.a[o] * P.sc, y = P.a[o + 1] * P.sc, z = P.a[o + 2] * P.sc; R[q * 3] = e[0] * x + e[4] * y + e[8] * z + e[12]; R[q * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; R[q * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]; }
    function L(X, a0, b0) { return Math.hypot(X[a0 * 3] - X[b0 * 3], X[a0 * 3 + 1] - X[b0 * 3 + 1], X[a0 * 3 + 2] - X[b0 * 3 + 2]); }
    var lim = Board3D.FIG_CUT, M = new Float32Array(nb * 12);
    ['atk1', 'atk2', 'atk3', 'atk4', 'fin_a', 'fin_d', 'punch', 'block', 'parry2', 'cheer1', 'hit2'].forEach(function (nm) {
      if (A.ids[nm] == null) return; var c = A.clips[A.ids[nm]];
      for (var s = 1; s <= 3; s++) {
        var f = c.x + Math.min(c.y - 1, Math.round(c.y * s / 4)), k;
        for (k = 0; k < nb * 12; k++) M[k] = H(d[f * nb * 12 + k]);
        for (q = 0; q < n; q++) if (used[q]) {
          var X = R[q * 3], Y = R[q * 3 + 1], Z = R[q * 3 + 2], ox = 0, oy = 0, oz = 0;
          for (j = 0; j < 4; j++) { var w = W[q * 4 + j] / 255; if (!w) continue; var m = I[q * 4 + j] * 12; ox += w * (M[m] * X + M[m + 1] * Y + M[m + 2] * Z + M[m + 3]); oy += w * (M[m + 4] * X + M[m + 5] * Y + M[m + 6] * Z + M[m + 7]); oz += w * (M[m + 8] * X + M[m + 9] * Y + M[m + 10] * Z + M[m + 11]); }
          Q[q * 3] = ox; Q[q * 3 + 1] = oy; Q[q * 3 + 2] = oz;
        }
        cand.forEach(function (t) {
          if (dead[t / 3]) return;
          for (var z = 0; z < 3; z++) { var a0 = ix[t + z], b0 = ix[t + (z + 1) % 3], l0 = L(R, a0, b0), l1 = L(Q, a0, b0); if (l1 > 0.008 && l1 > l0 * lim) { dead[t / 3] = 1; return; } }
        });
      }
    });
    var keep = [], nd = 0; for (i = 0; i < ix.length; i += 3) { if (dead[i / 3]) { nd++; continue; } keep.push(ix[i], ix[i + 1], ix[i + 2]); }
    if (!nd) return null;
    Board3D._figCutN = nd;
    return new THREE.BufferAttribute(n > 65535 ? new Uint32Array(keep) : new Uint16Array(keep), 1);
  }
  // Höhenausgleich je Clip: der Boden der Clips liegt etwas tiefer als die Sohle der Statue (Füße steckten im Sockel).
  // Je Clip: tiefster Punkt des Rigs über alle Frames gegen die Ruhepose, nur anheben (Rig-Einheiten)
  function clipLift(A) {
    if (A._figLift) return A._figLift;
    var H = THREE.DataUtils.fromHalfFloat, d = A.tex.image.data, nb = A.meta.bones.length, P = A.geo.getAttribute('position'), I = A.geo.getAttribute('aSkinI'), W = A.geo.getAttribute('aSkinW');
    // nur Fuß-Ecken (stärkster Knochen foot_*/ball_*, bei Tier-Rigs *LowerLeg*): Waffen schwingen in Angriffen unter den Boden, Körper liegen beim Sterben
    var L = new Float32Array(32), y0 = Infinity, ft = [], i;
    for (i = 0; i < P.count; i++) { var bw = 0, bn = -1; for (var q0 = 0; q0 < 4; q0++) if (W.getComponent(i, q0) > bw) { bw = W.getComponent(i, q0); bn = I.getComponent(i, q0); } if (/^(foot|ball)_|LowerLeg/.test(A.meta.bones[bn] || '')) ft.push(i); }
    if (!ft.length) return (A._figLift = L); // keine Füße gefunden: kein Ausgleich (sonst NaN, die Figur verschwindet)
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
    var RR = rigidRules(A, base), AC = Board3D.FIG_ARM && armCaps(A, base);
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
        if (AC) armFix(AC, acc, v);
        top[0] = top[1] = top[2] = top[3] = 0; tw[0] = tw[1] = tw[2] = tw[3] = 0;
        for (var b2 = 0; b2 < nb; b2++) { var a2 = acc[b2]; if (a2 <= tw[3]) continue; var p = 3; while (p > 0 && a2 > tw[p - 1]) { tw[p] = tw[p - 1]; top[p] = top[p - 1]; p--; } tw[p] = a2; top[p] = b2; }
        var sum = tw[0] + tw[1] + tw[2] + tw[3] || 1, rest = 255;
        for (var t2 = 3; t2 >= 0; t2--) { var q2 = t2 ? Math.round(tw[t2] / sum * 255) : rest; I[q * 4 + t2] = top[t2]; W[q * 4 + t2] = q2; rest -= q2; }
      }
    }
    var CH = Board3D.MOBILE ? 10000 : 30000, chain = Promise.resolve();
    for (k = 0; k < n; k += CH) (function (k0) { chain = chain.then(function () { part(k0, Math.min(n, k0 + CH)); return yieldNow(); }); })(k);
    if (AC && Board3D.FIG_SMOOTH && m.geometry.index) chain = chain.then(function () { return smoothW(m.geometry.index.array, n, nb, I, W, function (q, o) { pos(q, RN, o); }, RR.length ? function (q) { pos(q, RN, v); return rigidHit(RR, v) >= 0; } : null, AC.isAll); });
    chain = chain.then(function () { clipLift(A); return yieldNow(); }); // Höhenausgleich vorab (nicht erst beim Kompilieren)
    return chain.then(function () {
      var geo = new T.BufferGeometry(); geo.setIndex(m.geometry.index);
      for (var nm in m.geometry.attributes) geo.setAttribute(nm, m.geometry.attributes[nm]);
      geo.setAttribute('aSkinI', new T.BufferAttribute(I, 4)); geo.setAttribute('aSkinW', new T.BufferAttribute(W, 4, true));
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      var mesh = new T.Mesh(geo, m.material); mesh.matrixAutoUpdate = false; mesh.matrix.copy(RN); mesh.castShadow = mesh.receiveShadow = true;
      var src = new T.Group(); src.add(mesh); src.updateMatrixWorld(true);
      var cut = AC && Board3D.FIG_CUT && m.geometry.index ? armCut(A, AC, m.geometry, RN, I, W) : null;
      if (cut) { var gc = new T.BufferGeometry(); gc.setIndex(cut); for (var nm2 in geo.attributes) gc.setAttribute(nm2, geo.attributes[nm2]); gc.boundingBox = geo.boundingBox; gc.boundingSphere = geo.boundingSphere; geo.userData.cutGeo = gc; } // an der Geometrie (geteilt), nicht in userData des Mesh: das würde beim Klonen als JSON kopiert
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
  // Rig je Modellnummer (detail_N) in der Figuren-Ansicht: Feudal aus SKIN (nur FIG_SKIN), andere Editionen aus SKIN_ED[ed][N] (models/style/<ed>/detail_N.glb)
  Board3D.prototype.figSkinBase = function (url) {
    if (this.settings.figSet !== 'statue' || this.settings.skel === false || !window.SkinAnim || !url) return null;
    var ed = this.theme.id, mm = /detail_(\d+)\.glb$/.exec(url); if (!mm) return null;
    if (ed === 'feudal') return Board3D.FIG_SKIN.indexOf(+mm[1]) >= 0 && Board3D.SKIN[+mm[1]] || null;
    return (Board3D.SKIN_ED && Board3D.SKIN_ED[ed] || {})[+mm[1]] || null;
  };
  Board3D.FIG_SKIN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // Modelle, die in der Figuren-Ansicht das Skelett nutzen (alle mit Rig, auch Kitsune, Kirin, Ryu)

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
    g.userData.sk = { A: A, U: U, clip: [A.ids.bind, 0, -1, 0], cur: 'bind', until: 0, then: null, mats: [mat, dm], mesh: mesh, stat: mesh.material, off: 0, full: mesh.geometry };
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
    if (name === 'bind') k.off = now + SkinAnim.FADE + 0.05; else { k.off = 0; k.mesh.material = k.mats[0]; k.mesh.customDepthMaterial = k.mats[1]; k.mesh.frustumCulled = false; if (k.full && k.full.userData.cutGeo) k.mesh.geometry = k.full.userData.cutGeo; } // bewegt: Bounding-Box stimmt nicht mehr
    var left = A.dur[name] - off;
    k.until = loop || name === 'bind' || o.hold ? 0 : now + left * (o.cut || 0.9); k.then = o.then || null; k.frz = o.freeze != null ? o.freeze : null;
    return left;
  };
  Board3D.prototype.figRest = function (g) { var k = g && g.userData.sk; if (k && !k.busy) this.figPlay(g, k.sel ? Board3D.FIG_SEL : 'bind'); };
  Board3D.FIG_SEL = 'idle'; // Auswahl: lebendig stehen (die Hocke 'ready' verzerrt die Statuen, Füße tief, Schulterplatten reißen)
  // jedes Bild (aus update): Einzel-Clip zu Ende → Folge-Clip
  Board3D.prototype.figTick = function (g) {
    var k = g.userData.sk;
    if (k.off && SkinAnim.time.value >= k.off) { k.off = 0; k.mesh.material = k.stat; k.mesh.customDepthMaterial = undefined; k.mesh.frustumCulled = true; if (k.full) k.mesh.geometry = k.full; }
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
  // Heldenduell (Vorbild: Duelle in Total War: Three Kingdoms, Lords/Monster in Warhammer): Anlauf, Umkreisen, 3–5 Schläge
  // mit Paraden (einer streift), gepaarter Finisher (fin_a/fin_d, sonst atk4 + Sterbe-Clip), Staub. König, Turm und Läufer
  // schlagen mit mehr Wucht (Zeitlupe, Druckwelle, Kameraschwenk). Alles im Zeitbudget der Notbremse in app.js (8 s).
  // Kampfregie je Edition: blade = Farbe der Energieklinge (Funken), jet = Düsenstoß beim Anlauf (Abgasfarbe), shot = Laserfarbe,
  // boom = Explosion statt Zerfall, magic = Zauberfarbe, rune = Runenkreis beim Zaubern, brawl = Raufen statt Töten (Verlierer rollt weg / läuft davon)
  Board3D.FIG_ED = {
    feudal: {},
    mecha: { blade: 0x6fe6ff, jet: 0x7fc8ff, shot: 0x8ff0ff, boom: true, magic: 0x6fe6ff, guns: [1, 9, 10] }, // guns: Typen mit Kanone schießen statt zu hauen
    fantasy: { magic: 0xb98aff, rune: true },
    hunde: { brawl: true }
  };
  Board3D.prototype.figEd = function () { return Board3D.FIG_ED_TEST || this.theme.id; }; // FIG_ED_TEST: Regie einer Edition mit Feudal-Rigs ausprobieren
  Board3D.FIG_DUEL = { budget: 7200, swing: 480, circle: 800, heroes: [6, 7, 8] };
  Board3D.prototype.figFight = function (info, A, from, to, D, style) {
    var self = this, T = THREE, short = this.settings.fights === 'kurz', sp = short ? 0.75 : 1, BT = this.BT, FD = Board3D.FIG_DUEL;
    var ed = this.figEd(), E = Board3D.FIG_ED[ed] || {}, fe = this.theme.id === 'feudal';
    if (E.brawl && (style === 'magic' || style === 'shoot' || style === 'breath')) style = 'charge'; // Hunde raufen nur
    if (E.guns && E.guns.indexOf(typ(A)) >= 0 && A.userData.sk && style !== 'magic') style = 'shoot';
    var dx = to.x - from.x, dz = to.z - from.z, dist = Math.hypot(dx, dz) || 1, ux = dx / dist, uz = dz / dist;
    var cell = Math.hypot(this.sqPos(1).x - this.sqPos(0).x, this.sqPos(1).z - this.sqPos(0).z) || 1;
    var colA = new T.Color(this.theme.factions[info.col].color).getHex(), dust = this.dustColor(1 - info.col), big = Math.abs(info.cap) >= 6;
    var ka = A.userData.sk, kd = D.userData.sk, ta = typ(A), td = typ(D), hero = !short && FD.heroes.indexOf(ta) >= 0, pm = Board3D.MOBILE ? 0.5 : 1;
    var sa = fe ? ta : null, sd = fe ? td : null; // Stimmen je Typ gibt es nur in Feudal
    function tt(g) { return fe ? typ(g) : null; }
    ka.busy = true; if (kd) kd.busy = true;
    function has(g, n) { var k = g.userData.sk; return !!(k && k.A.ids[n] != null); }
    function wait(ms) { return self.tween(ms * sp, function () { }); }
    function ease(k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
    // Duell-Nahsicht wie beim Armee-Kampf: Ausschnitt passend zu beiden Feldern, Blick von der Seite (Profil), flach, ohne Bildverschiebung
    var o = this.orbit, cam0 = { x: o.target.x, y: o.target.y, z: o.target.z, r: o.radius, th: o.thetaGoal, ph: o.phi }, mx = (from.x + to.x) / 2, mz = (from.z + to.z) / 2;
    var ext = (style === 'magic' ? dist / 2 : Math.min(dist / 2, cell * 1.2)) + cell * 0.9, vfh = this.camera.fov * Math.PI / 360, hfh = Math.atan(Math.tan(vfh) * this.camera.aspect);
    if (style !== 'magic' && dist > cell * 2.4) { mx = to.x - ux * cell * 1.2; mz = to.z - uz * cell * 1.2; } // weiter Anlauf: Kamera beim Ziel
    var cr = Math.max(2.4, Math.min(9, ext / Math.tan(Math.min(vfh, hfh)) * 1.05)), cdx = Math.sin(o.theta), cdz = Math.cos(o.theta), px = -uz, pz = ux;
    if (px * cdx + pz * cdz < 0) { px = -px; pz = -pz; }
    var th1 = Math.atan2(px * 0.85 + cdx * 0.55 - ux * 0.25, pz * 0.85 + cdz * 0.55 - uz * 0.25), vs0 = this.viewShift == null ? 0.17 : this.viewShift;
    while (th1 - o.theta > Math.PI) th1 -= Math.PI * 2; while (th1 - o.theta < -Math.PI) th1 += Math.PI * 2;
    if (!short) this.tween(600, function (k) { var e = ease(k); o.target.x = cam0.x + (mx - cam0.x) * e; o.target.z = cam0.z + (mz - cam0.z) * e; o.target.y = cam0.y + (BT + 0.3 - cam0.y) * e; o.radius = cam0.r + (cr - cam0.r) * e; o.phi = cam0.ph + (1.2 - cam0.ph) * e; o.thetaGoal = o.theta = cam0.th + (th1 - cam0.th) * e; self.viewShift = vs0 * (1 - e); });
    function camBack() {
      if (short) return; var c1 = { x: o.target.x, y: o.target.y, z: o.target.z, r: o.radius, th: o.thetaGoal, ph: o.phi };
      while (c1.th - cam0.th > Math.PI) c1.th -= Math.PI * 2; while (c1.th - cam0.th < -Math.PI) c1.th += Math.PI * 2;
      self.tween(800, function (k) { var e = ease(k); o.target.x = c1.x + (cam0.x - c1.x) * e; o.target.y = c1.y + (cam0.y - c1.y) * e; o.target.z = c1.z + (cam0.z - c1.z) * e; o.radius = c1.r + (cam0.r - c1.r) * e; o.phi = c1.ph + (cam0.ph - c1.ph) * e; o.thetaGoal = o.theta = c1.th + (cam0.th - c1.th) * e; self.viewShift = vs0 * e; });
    }
    // Treffer-Effekt: Funken (Mecha: Energieklinge), Hunde: Raufwolke aus Staub
    function sparks(x, z, color, n, shake) {
      if (E.brawl) { self.emit(x, BT + 0.25, z, 0xd8c8a0, n * 0.8 * pm, 1.8, 0.6); self.emit(x, BT + 0.5, z, 0xffffff, n / 5 * pm, 1.2, 0.8); }
      else { self.emit(x, BT + 0.7, z, E.blade && color === 0xffffff ? E.blade : color, n * pm, 4, 1.1); self.emit(x, BT + 0.7, z, 0xffffff, n / 3 * pm, 2.5, 1.3); }
      self.shakeAmt = Math.max(self.shakeAmt || 0, E.brawl ? shake * 0.6 : shake);
    }
    function mid() { return { x: (A.position.x + D.position.x) / 2, z: (A.position.z + D.position.z) / 2 }; }
    function dir() { var x = D.position.x - A.position.x, z = D.position.z - A.position.z, l = Math.hypot(x, z) || 1; return [x / l, z / l]; }
    // Blick sofort auf einen Punkt (wie faceTo, ohne Tween)
    function look(g, x, z) {
      var m = g.userData.glb; if (!m) return;
      var r = g.rotation.y, wx = x - g.position.x, wz = z - g.position.z, lx = wx * Math.cos(r) - wz * Math.sin(r), lz = wx * Math.sin(r) + wz * Math.cos(r), goal = Math.atan2(-lx, -lz), a0 = m.userData.face || 0;
      while (goal - a0 > Math.PI) goal -= Math.PI * 2; while (goal - a0 < -Math.PI) goal += Math.PI * 2; m.userData.face = goal;
    }
    // Verteidiger ohne Rig reagiert mit dem ganzen Körper (wie bisher)
    function leanD(ang, ms) { if (kd) return Promise.resolve(); var a0 = D.userData.ang || 0, u = dir(); return self.tween(ms * sp, function (k) { D.userData.ang = a0 + (ang - a0) * ease(k); self.lean(D, u[0], u[1], D.userData.ang); }); }
    // Wucht der Helden beim tödlichen Treffer: Zeitlupe, Druckwelle aus Staub und Funken, Kamera ruckt heran und schwenkt
    function wucht(x, z) {
      if (!hero) return;
      self.slowmo(380, 0.3); self.shakeAmt = Math.max(self.shakeAmt || 0, 0.65); snd('roar', 0.6, sa);
      for (var i = 0; i < 18; i++) { var a = i / 18 * Math.PI * 2; self.emitDir(x, BT + 0.06, z, dust, 3 * pm, Math.cos(a) * 3.2, 0.25, Math.sin(a) * 3.2, 0.5); }
      self.emit(x, BT + 0.5, z, E.brawl ? 0xd8c8a0 : E.blade || 0xffd76a, 50 * pm, 5, 1.4);
      var r0 = o.radius, t0 = o.thetaGoal, sw = (Math.random() < 0.5 ? -1 : 1) * 0.22;
      self.tween(260, function (k) { var e = 1 - Math.pow(1 - k, 3); o.radius = r0 * (1 - 0.12 * e); o.thetaGoal = o.theta = t0 + sw * e; });
    }
    // ein Schlag: beim Treffer-Frame pariert der Gegner; graze = Treffer streift (Taumeln, kein Tod), brk = Abwehr bricht (vor dem Finisher)
    function strike(att, def, graze, brk) {
      var hitAt = 0.32 * sp, ka2 = att.userData.sk, kd2 = def.userData.sk;
      if (ka2) self.figPlay(att, ['atk1', 'atk2'], { hitAt: hitAt, then: 'ready' });
      else leanD(-0.3, hitAt * 700);
      if (kd2 && !graze) self.figPlay(def, brk && has(def, 'parry2') ? 'parry2' : 'block', { hitAt: hitAt, then: 'ready' });
      snd('whoosh', 0.7, tt(att));
      return self.tween(hitAt * 1000, function () { }).then(function () {
        var p = mid();
        if (graze) { if (kd2) self.figPlay(def, has(def, 'hit3') ? ['hit1', 'hit3'] : 'hit1', { then: 'ready' }); snd('hit', 0.5, tt(att)); sparks(def.position.x, def.position.z, att === A ? colA : 0xffffff, 18, 0.2); return; }
        snd(E.brawl ? 'hit' : 'clash', E.brawl ? 0.4 : 0.8); if (E.blade) snd('zap', 0.4); sparks(p.x, p.z, 0xffffff, 22, 0.14); if (!kd2 && def === D) return leanD(-0.25, 140).then(function () { return leanD(0, 160); });
      });
    }
    // Todesstoß: gepaarter Finisher, wenn beide Clips da sind; sonst atk4 und danach der Sterbe-Clip
    function finisher() {
      var hitAt = 0.45 * sp, pair = !short && !E.brawl && has(A, 'fin_a') && has(D, 'fin_d'), left = 0;
      self.figPlay(A, pair ? 'fin_a' : 'atk4', { hitAt: hitAt, then: 'ready' });
      // fin_d trifft früher (0,33 s) als hitAt: später starten, damit beide Treffer-Frames aufeinanderliegen
      if (pair) { var dA = D.userData.sk.A, hd = dA.hit.fin_d || 0; left = dA.dur.fin_d - hd + hitAt; if (hd >= hitAt) self.figPlay(D, 'fin_d', { hitAt: hitAt, hold: true }); else wait((hitAt - hd) * 1000 / sp).then(function () { self.figPlay(D, 'fin_d', { hold: true }); }); }
      snd('whoosh', 0.9, sa);
      return self.tween(hitAt * 1000, function () { }).then(function () {
        if (info.onHit) info.onHit();
        snd('hit', 0.9, sa); sparks(D.position.x, D.position.z, colA, big ? 90 : 60, big ? 0.5 : 0.35); wucht(D.position.x, D.position.z);
        if (E.brawl) { if (kd) self.figPlay(D, has(D, 'hit2') ? 'hit2' : 'hit1'); return wait(260).then(function () { return self.figFlee(D, A.position.x, A.position.z, sp); }); } // Hunde: umgerannt, dann weg
        return pair ? crumble(wait(Math.min(E.boom ? 700 : 1150, Math.max(0, left - hitAt) * 1000 * 0.9))) : die();
      });
    }
    // Verteidiger stirbt: Sterbe-Animation (oder Umkippen ohne Rig), dann zerfällt er zu Staub
    function die() {
      var p0 = D.position.clone(), u = dir(), fall;
      if (kd) { var left = self.figPlay(D, Math.random() < 0.5 ? 'die1' : 'die2', { hold: true }); snd('fall', 0.8, sd); fall = wait(Math.min(E.boom ? 700 : 1150, left * 1000 * 0.8)); }
      else fall = self.tween(420 * sp, function (k) { var e = k * k; self.lean(D, u[0], u[1], e * 1.45); D.position.x = p0.x + u[0] * e * 0.35; D.position.z = p0.z + u[1] * e * 0.35; });
      return crumble(fall);
    }
    function crumble(fall) {
      var u = dir(), p0 = null;
      if (E.boom) return fall.then(function () { return self.figBoom(D, dust, sp); }); // Mecha: Explosion
      return fall.then(function () {
        p0 = D.position.clone(); snd('crumble'); self.shakeAmt = Math.max(self.shakeAmt || 0, 0.15);
        for (var i = 0; i < 4; i++) self.emit(D.position.x + u[0] * (i - 1) * 0.18, BT + 0.15 + i * 0.08, D.position.z + u[1] * (i - 1) * 0.18, dust, 28 * pm, 1.6, 0.9);
        return self.tween(320 * sp, function (k) { D.scale.setScalar(1 - k); D.position.y = p0.y - k * 0.3; });
      }).then(function () { self.pieceGroup.remove(D); self.figFree(D); });
    }
    // Sieger geht (kurz: läuft) aufs Feld und steht wieder still
    function stepIn() {
      var x0 = A.position.x, z0 = A.position.z, d2 = Math.hypot(to.x - x0, to.z - z0), g2 = d2 <= 0.5 ? 'walk' : d2 <= 3.2 ? 'run' : 'sprint';
      var ms = Math.max(250, Math.min(1700, d2 / Board3D.FIG_GAIT[g2] * 1000)); // nach dem Zauber ggf. weiter Weg: laufen statt schleichen
      self.figPlay(A, g2);
      return self.faceTo(A, to.x, to.z, 160).then(function () { return self.tween(ms, function (k) { A.position.x = x0 + (to.x - x0) * k; A.position.z = z0 + (to.z - z0) * k; A.position.y = BT; }); })
        .then(function () { ka.busy = false; self.figRest(A); camBack(); self.emit(to.x, BT + 0.05, to.z, 0xd8c8a0, 10, 1.2, 0.3); var m = A.userData.glb, a0 = m.userData.face || 0; return self.tween(260, function (k) { m.userData.face = a0 * (1 - k); }); });
    }
    // Umkreisen: beide drehen sich um ihre Mitte (seitlich gehend, Blick auf den Gegner), danach Kampfhaltung
    function circle() {
      var m0 = mid(), a0 = [A.position.x - m0.x, A.position.z - m0.z], d0 = [D.position.x - m0.x, D.position.z - m0.z], ph = (Math.random() < 0.5 ? -1 : 1) * 0.6;
      function rot(v, a) { return [v[0] * Math.cos(a) + v[1] * Math.sin(a), -v[0] * Math.sin(a) + v[1] * Math.cos(a)]; }
      var strafe = has(A, 'strafe_l') && has(A, 'strafe_r') && has(D, 'strafe_l') && has(D, 'strafe_r');
      [[A, a0], [D, d0]].forEach(function (e) {
        var g = e[0], v1 = rot(e[1], ph), mvx = v1[0] - e[1][0], mvz = v1[1] - e[1][1], fx = -e[1][0], fz = -e[1][1];
        self.figPlay(g, !strafe ? 'walk' : mvx * -fz + mvz * fx > 0 ? 'strafe_r' : 'strafe_l');
      });
      snd('march', FD.circle, sa);
      // ohne Seitwärts-Clip: in Gehrichtung schauen (Tangente), am Ende zum Gegner drehen
      var cpr = 0; // Kamera dreht mit, damit das Profil bleibt
      return self.tween(FD.circle, function (k) {
        var e = ease(k); o.thetaGoal += ph * e - cpr; o.theta += ph * e - cpr; cpr = ph * e;
        var va = rot(a0, ph * e), vd = rot(d0, ph * e), vb = rot(a0, ph * e + ph * 0.05), wb = rot(d0, ph * e + ph * 0.05);
        A.position.x = m0.x + va[0]; A.position.z = m0.z + va[1]; D.position.x = m0.x + vd[0]; D.position.z = m0.z + vd[1];
        if (strafe) { look(A, D.position.x, D.position.z); look(D, A.position.x, A.position.z); }
        else { look(A, m0.x + vb[0] + (vb[0] - va[0]) * 20, m0.z + vb[1] + (vb[1] - va[1]) * 20); look(D, m0.x + wb[0] + (wb[0] - vd[0]) * 20, m0.z + wb[1] + (wb[1] - vd[1]) * 20); }
      }).then(function () {
        self.figPlay(A, 'ready'); self.figPlay(D, 'ready');
        return Promise.all([self.faceTo(A, D.position.x, D.position.z, 180), self.faceTo(D, A.position.x, A.position.z, 180)]);
      });
    }
    // beide drehen sich zueinander, nehmen Kampfhaltung ein
    var face = Promise.all([this.faceTo(A, to.x, to.z, 180), this.faceTo(D, from.x, from.z, 180)]).then(function () { if (kd) self.figPlay(D, 'ready'); });

    if (style === 'magic' || style === 'shoot' || style === 'breath') {
      // Fernkampf: Zauber (Onmyōji, Fantasy-Magier mit Runenkreis), Salven (Mecha-Laser), Feueratem (Drache); Gegner fällt, Läufer als Held mit Druckwelle
      var head = BT + 0.95, mc = E.magic || colA;
      function hitAnim(g) { if (g.userData.sk) self.figPlay(g, has(g, 'hit3') ? ['hit1', 'hit3'] : 'hit1', { then: 'ready' }); }
      function magic() {
        var ring = null, bolt;
        if (E.rune) { ring = new T.Mesh(new T.RingGeometry(0.32, 0.46, 40), new T.MeshBasicMaterial({ color: mc, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(from.x, BT + 0.04, from.z); self.scene.add(ring); }
        self.figPlay(A, has(A, 'cast') ? 'cast' : ['atk1', 'atk2'], { hitAt: 0.25 });
        return self.tween(250 * sp, function (k) { if (ring) { ring.material.opacity = k * 0.9; ring.rotation.z = k * 2; ring.scale.setScalar(0.6 + k * 0.6); } }).then(function () {
          snd('zap', 0.8, sa);
          bolt = new T.Mesh(new T.SphereGeometry(hero ? 0.22 : 0.16, 12, 8), new T.MeshBasicMaterial({ color: mc, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false }));
          self.scene.add(bolt);
          return self.tween((300 + dist * 40) * sp, function (k) { var x = from.x + dx * k, z = from.z + dz * k, y = head + Math.sin(k * Math.PI) * 0.8; bolt.position.set(x, y, z); bolt.scale.setScalar(1 + Math.sin(k * 30) * 0.2); self.emitDir(x, y, z, mc, 3 * pm, 0, 0, 0, 0.6); if (ring) { ring.material.opacity = 0.9 * (1 - k); ring.rotation.z = 2 + k * 3; } });
        }).then(function () { self.scene.remove(bolt); bolt.geometry.dispose(); bolt.material.dispose(); if (ring) { self.scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); } });
      }
      // Salve: Mündungsblitz, Leuchtspur, Einschlag; der letzte Schuss trifft tödlich
      function volley() {
        var shots = short ? 2 : 3, chain = Promise.resolve(), sc = E.shot || 0xfff0a0;
        for (var s = 0; s < shots; s++) (function (s) {
          chain = chain.then(function () {
            self.figPlay(A, has(A, 'shoot') ? 'shoot' : 'atk1', { hitAt: 0.12 }); return wait(120);
          }).then(function () {
            var ax = A.position.x + ux * 0.35, az = A.position.z + uz * 0.35, tx = D.position.x - ux * 0.15, tz = D.position.z - uz * 0.15;
            snd('zap', 0.7, sa); self.emit(ax, BT + 0.75, az, 0xffffff, 8 * pm, 1.5, 1);
            for (var j = 0; j < 10; j++) { var q = j / 10; self.emitDir(ax + (tx - ax) * q, BT + 0.75 - q * 0.1, az + (tz - az) * q, sc, 2 * pm, ux * 2, 0, uz * 2, 0.15); }
            if (s < shots - 1) { sparks(tx, tz, sc, 14, 0.1); hitAnim(D); return wait(260); }
          });
        })(s);
        return chain;
      }
      function breath() {
        self.figPlay(A, 'atk2'); snd('fire', 0.9); hitAnim(D);
        return self.tween(700 * sp, function (k) { self.emitDir(from.x + ux * 0.4, head, from.z + uz * 0.4, k < .5 ? 0xffb030 : 0xff5a20, 6 * pm, ux * 6.5, -0.8, uz * 6.5, 1.4); });
      }
      return face.then(function () { self.figPlay(A, 'ready'); return wait(220); }).then(function () { return style === 'shoot' ? volley() : style === 'breath' ? breath() : magic(); })
        .then(function () { if (info.onHit) info.onHit(); sparks(to.x, to.z, style === 'shoot' ? E.shot || colA : mc, big ? 90 : 60, big ? 0.5 : 0.35); wucht(to.x, to.z); if (kd) self.figPlay(D, 'hit1'); return die(); }).then(stepIn);
    }
    // Nahkampf: Anlauf (Laufen bzw. Sprint beim Ansturm), Umkreisen, Schlagabtausch, Finisher
    var stand = cell * (style === 'thrust' ? 0.95 : 0.85), stx = to.x - ux * stand, stz = to.z - uz * stand, run = Math.hypot(stx - from.x, stz - from.z);
    var gait = style === 'charge' || run > 2.5 ? 'sprint' : run > 0.9 ? 'run' : 'walk', ms = Math.max(260, Math.min(1200, run / Board3D.FIG_GAIT[gait] * 1000));
    var jet = !!E.jet && gait !== 'walk', leap = style === 'leap' && run > 0.5; // Mecha gleitet mit Düsen heran, Springer/Tiere springen den Gegner an
    if (jet) ms = Math.max(260, ms * 0.7);
    // Zeitbudget (Voll, Notbremse in app.js bei 8 s): fester Teil ohne Schläge (Drehen, Anlauf, Finisher, Fall, Zerfall, Schritt aufs Feld,
    // Bild-Takt der Tweens; an Messungen geeicht), daraus 3–5 Schläge (zufällig, so viele das Budget erlaubt); reicht es nicht, entfällt das Umkreisen
    var circ = !short && !!kd, fixed = ms + 3955 + (hero ? 300 : 0) + (E.brawl ? 150 : 0);
    function fit(c) { return Math.max(2, Math.min(5, Math.floor((FD.budget - fixed - (c ? FD.circle + 180 : 0)) / FD.swing))); }
    var want = 3 + Math.floor(Math.random() * 3); // gewünschte Wechsel; für 5 entfällt notfalls das Umkreisen
    if (circ && (fit(true) < 3 || fit(true) < want && fit(false) >= want)) circ = false;
    var nMax = fit(circ), n = short ? 1 : Math.min(nMax, want), graze = n >= 3 ? 1 + Math.floor(Math.random() * (n - 1)) : -1;
    var seq = face.then(function () {
      self.figPlay(A, jet ? (has(A, 'jet') ? 'jet' : 'ready') : leap ? 'run' : gait); snd('march', ms, sa); if (gait === 'sprint' && !jet) snd('roar', 0.5, sa);
      if (jet) snd('fire', 0.5); if (leap) snd('whoosh', 0.8, sa);
      return self.tween(ms, function (k) {
        var e = k < 0.85 ? k / 0.85 * 0.92 : 0.92 + (k - 0.85) / 0.15 * 0.08; A.position.x = from.x + (stx - from.x) * e; A.position.z = from.z + (stz - from.z) * e;
        A.position.y = BT + (leap ? Math.sin(k * Math.PI) * (0.5 + run * 0.12) : jet ? Math.sin(Math.min(1, k * 1.3) * Math.PI) * 0.22 : 0);
        if (jet) self.emitDir(A.position.x - ux * 0.25, BT + 0.55, A.position.z - uz * 0.25, E.jet, 2 * pm, -ux * 2.5, 0.2, -uz * 2.5, 0.35);
      });
    }).then(function () {
      if (leap || jet) { self.emit(A.position.x, BT + 0.05, A.position.z, 0xd8c8a0, (leap ? 26 : 14) * pm, 2, 0.4); if (leap) { snd('clash', 0.5); self.shakeAmt = Math.max(self.shakeAmt || 0, 0.15); } }
      self.figPlay(A, 'ready'); return wait(120);
    });
    if (circ) seq = seq.then(circle);
    var brk = (n - 1) % 2 ? n - 2 : n - 1; // letzter Angriff vor dem Finisher: Abwehr des Verteidigers bricht
    for (var i = 0; i < n; i++) (function (i) { seq = seq.then(function () { return i % 2 ? strike(D, A, i === graze) : strike(A, D, i === graze, i === brk); }).then(function () { return wait(i === n - 1 ? 200 : 160); }); })(i);
    this._duel = { n: n, nMax: nMax, circ: circ, hero: hero }; // für Tests
    return seq.then(finisher).then(stepIn);
  };

  // Verteidiger mit Rig, Angreifer ohne (Fuchs-Sprung, Hirsch-Ansturm, Feueratem): nur der Tod mit Sterbe-Animation
  Board3D.prototype.figDie = function (D, dust, sp, ux, uz) {
    var self = this, k = D.userData.sk, p0 = D.position.clone(), E = Board3D.FIG_ED[this.figEd()] || {}; k.busy = true;
    if (D.userData.q0) D.quaternion.copy(D.userData.q0);
    if (E.brawl) { this.figPlay(D, 'hit2' in k.A.ids ? 'hit2' : 'hit1'); return this.tween(260 * sp, function () { }).then(function () { return self.figFlee(D, p0.x - ux, p0.z - uz, sp); }); }
    var left = this.figPlay(D, Math.random() < 0.5 ? 'die1' : 'die2', { hold: true }); snd('fall', 0.8, this.theme.id === 'feudal' ? typ(D) : null);
    if (E.boom) return this.tween(Math.min(700, left * 850) * sp, function () { }).then(function () { return self.figBoom(D, dust, sp); });
    return this.tween(Math.min(1500, left * 850) * sp, function () { }).then(function () {
      snd('crumble'); self.shakeAmt = Math.max(self.shakeAmt || 0, 0.15);
      for (var i = 0; i < 4; i++) self.emit(D.position.x + ux * (i - 1) * 0.18, self.BT + 0.15 + i * 0.08, D.position.z + uz * (i - 1) * 0.18, dust, 28, 1.6, 0.9);
      return self.tween(320 * sp, function (q) { D.scale.setScalar(1 - q); D.position.y = p0.y - q * 0.3; });
    }).then(function () { self.pieceGroup.remove(D); self.figFree(D); });
  };

  // Mecha: Explosion statt Zerfall (Lichtblitz, Feuerball, Funken, Trümmer in Statuenfarbe), die Figur verglüht
  Board3D.prototype.figBoom = function (D, dust, sp) {
    var self = this, T = THREE, BT = this.BT, x = D.position.x, z = D.position.z, p0 = D.position.clone(), pm = Board3D.MOBILE ? 0.5 : 1;
    snd('fire', 0.8); snd('clash', 0.7); this.shakeAmt = Math.max(this.shakeAmt || 0, 0.45);
    this.emit(x, BT + 0.5, z, 0xffffff, 20 * pm, 3, 1.2); this.emit(x, BT + 0.5, z, 0xffb040, 60 * pm, 4.5, 1.3); this.emit(x, BT + 0.35, z, 0xff5a20, 40 * pm, 2.2, 1.8); this.emit(x, BT + 0.6, z, dust, 24 * pm, 5, 1.8);
    var ball = new T.Mesh(new T.SphereGeometry(0.3, 16, 10), new T.MeshBasicMaterial({ color: 0xffb860, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
    ball.position.set(x, BT + 0.55, z); this.scene.add(ball);
    return this.tween(300 * sp, function (k) { D.scale.setScalar(Math.max(0.001, 1 - k * 1.4)); D.position.y = p0.y + k * 0.08; ball.scale.setScalar(0.6 + k * 1.6); ball.material.opacity = 0.9 * (1 - k) * (1 - k); })
      .then(function () { self.scene.remove(ball); ball.geometry.dispose(); ball.material.dispose(); self.pieceGroup.remove(D); self.figFree(D); });
  };
  // Hunde: wer verliert, rollt sich weg (Clip roll, falls da) und läuft davon (flee, sonst run), wird dabei klein und verschwindet in einer Staubwolke
  Board3D.prototype.figFlee = function (D, ax, az, sp) {
    var self = this, BT = this.BT, k = D.userData.sk, pm = Board3D.MOBILE ? 0.5 : 1, a = Math.atan2(D.position.x - ax, D.position.z - az) + (Math.random() - 0.5) * 1.2;
    var ux = Math.sin(a), uz = Math.cos(a), roll = k && k.A.ids.roll != null && Math.random() < 0.5;
    if (k) k.busy = true; snd('whoosh', 0.5);
    var first = Promise.resolve();
    if (roll) { var x0 = D.position.x, z0 = D.position.z, rd = this.figPlay(D, 'roll'); first = this.tween(Math.min(550, rd * 800) * sp, function (q) { D.position.x = x0 + ux * 0.5 * q; D.position.z = z0 + uz * 0.5 * q; }); }
    return first.then(function () {
      var xs = D.position.x, zs = D.position.z;
      if (k) self.figPlay(D, k.A.ids.flee != null ? 'flee' : 'run');
      self.faceTo(D, xs + ux * 5, zs + uz * 5, 150);
      return self.tween(800 * sp, function (q) { D.position.x = xs + ux * 1.8 * q; D.position.z = zs + uz * 1.8 * q; D.scale.setScalar(q < 0.55 ? 1 : Math.max(0.001, 1 - (q - 0.55) / 0.45)); if (Math.random() < 0.35) self.emit(D.position.x, BT + 0.05, D.position.z, 0xd8c8a0, 2 * pm, 0.6, 0.3); });
    }).then(function () { self.emit(D.position.x, BT + 0.15, D.position.z, 0xd8c8a0, 16 * pm, 1.2, 0.5); self.pieceGroup.remove(D); self.figFree(D); });
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
