// Figuren-Ansicht lebt (wie das Schach in „No Game No Life“): die Gold/Silber-Statuen bekommen das Skelett der Armee-Truppen.
// In Ruhe Bind-Pose (steht still, genau wie modelliert), bei Aktionen echte Clips (Quaternius UAL, gebacken in models/anim/*):
// Zweikampf vom Sockel aus mit Parade und Tod, Jubel beim Sieg. Beim Zug, bei Auswahl, Abwurf und Beförderung steht die Figur still, der Stein gleitet (Wunsch 19.10.).
// Die Gewichte stammen vom Low-Poly-Rig und werden beim Laden auf die Detail-Statue übertragen (nächste Rig-Ecken),
// damit die Figur exakt wie die starre Statue aussieht. Statuen ohne Rig gleiten und kämpfen ebenso vom Stein aus (Stein stößt vor).
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
  Board3D.FIG_RIGID = {"ashigaru":[["weapon","seg",[-0.192,-0.479,0.068],[-0.187,0.493,0.133],0.022],["hand_r","seg",[-0.19,0.055,0.09],[-0.19,0.055,0.09],0.04],["weapon","pole",[[-9,-9,-9],[-0.17,-0.25,9]],[[-9,0.46,-9],[9,9,9]],0.024],["weapon","seg",[-0.188,0.367,0.125],[-0.187,0.5,0.133],0.06],["Head","ymin",0.3]],"veteran":[["weapon","seg",[-0.185,-0.49,0.177],[-0.209,0.476,0.17],0.022],["hand_r","seg",[-0.2,0.045,0.16],[-0.2,0.045,0.16],0.04],["weapon","pole",[[-9,-9,0.1],[-0.15,-0.3,0.3]],[[-9,0.38,0.1],[-0.15,9,0.3]],0.03],["weapon","seg",[-0.209,0.34,0.17],[-0.209,0.5,0.17],0.05],["spine_03","seg",[-0.045,-0.14,-0.1],[0.1,0.5,-0.18],0.03],["spine_03","box",[0.11,0.26,-0.3],[0.26,0.47,-0.12]],["hand_l","seg",[0.175,-0.05,0.02],[0.185,-0.08,0.02],0.035],["pelvis","seg",[0.11,0.02,0.13],[0.22,-0.22,-0.19],0.022],["Head","ymin",0.3]],"yari":[["weapon","seg",[-0.195,-0.5,0.104],[-0.2,0.3,0.12],0.022],["hand_r","seg",[-0.19,0.04,0.11],[-0.19,0.04,0.11],0.04],["weapon","seg",[-0.195,-0.5,0.104],[-0.2,0.3,0.12],0.03],["weapon","seg",[-0.2,0.25,0.13],[-0.2,0.5,0.12],0.07],["Head","ymin",0.3]],"kenshi":[["hand_r","seg",[-0.23,0.22,0.17],[0.06,0.49,-0.19],0.03],["hand_r","seg",[-0.24,0.25,0.1],[-0.22,0.32,0.12],0.05],["pelvis","seg",[0.07,0.03,0.05],[0.21,-0.27,-0.19],0.025],["Head","box",[-0.15,0.29,-0.2],[0.15,0.6,0.2]]],"onmyoji":[["hand_r","seg",[-0.16,0.24,0.15],[-0.14,0.39,0.15],0.06],["Head","ymin",0.3]],"tengu":[["spine_03","box",[-0.6,0.24,-0.3],[-0.17,0.5,0.2]],["spine_03","box",[0.17,0.24,-0.3],[0.6,0.5,0.2]],["spine_03","box",[-0.6,-0.2,-0.3],[-0.22,0.5,-0.03]],["spine_03","box",[0.22,-0.2,-0.3],[0.6,0.5,-0.03]],["spine_03","box",[-0.22,0.0,-0.3],[0.22,0.45,-0.08]],["Head","ymin",0.3]],"samurai":[["hand_r","seg",[-0.2,-0.05,0.06],[-0.29,-0.23,0.3],0.03],["hand_r","box",[-0.3,-0.26,0.05],[-0.16,-0.02,0.33]],["Head","ymin",0.3]],"general":[["hand_r","seg",[-0.28,0.13,0.23],[-0.3,0.49,0.27],0.04],["hand_l","seg",[0.12,-0.02,0.15],[0.12,0.09,0.35],0.03],["spine_03","box",[-0.6,-0.35,-0.4],[0.6,0.3,-0.07]],["spine_03","box",[-0.6,-0.35,-0.4],[-0.25,-0.02,0.3]],["spine_03","box",[0.25,-0.35,-0.4],[0.6,-0.02,0.3]],["Head","ymin",0.3]],"naginata":[["hand_r","seg",[-0.34,0.3,0.34],[0.36,-0.245,-0.31],0.04],["hand_r","seg",[0.36,-0.245,-0.31],[0.22,-0.14,-0.18],0.06],["Head","ymin",0.3]],"kirin":[["Head","box",[-0.2,0.36,0.1],[0.2,0.6,0.5]]],"ryu":[["Head","box",[-0.25,0.36,-0.2],[0.25,0.6,0.2]]],"hauptmann":[["weapon","seg",[0.054,-0.46,-0.26],[-0.12,0.05,0.08],0.014],["weapon","seg",[-0.12,0.05,0.08],[-0.32,0.41,0.33],0.022],["hand_r","seg",[-0.12,0.05,0.08],[-0.12,0.05,0.08],0.04],["weapon","seg",[-0.12,0.05,0.08],[-0.32,0.41,0.33],0.035],["weapon","seg",[-0.24,0.25,0.24],[-0.32,0.41,0.33],0.09],["cape","box",[-0.6,-0.6,-0.6],[0.6,0.12,-0.1]],["cape","box",[-0.6,-0.6,-0.6],[-0.17,0.12,0.1]],["cape","box",[0.27,-0.6,-0.6],[0.6,0.12,0.1]],["Head","box",[-0.15,0.27,-0.2],[0.18,0.6,0.2]]],"fantasy_1":[["hand_r","seg",[-0.17,-0.05,0.0],[-0.33,-0.27,0.19],0.03],["hand_l","box",[0.19,-0.26,-0.24],[0.4,0.19,0.25]],["Head","ymin",0.28]],"fantasy_9":[["hand_r","seg",[-0.215,0.12,0.17],[-0.2,0.5,0.14],0.035],["hand_l","box",[0.1,-0.29,-0.13],[0.3,0.18,0.18]],["Head","ymin",0.27]],"fantasy_10":[["weapon","seg",[-0.1,-0.1,-0.15],[-0.15,0.05,0.0],0.014],["weapon","seg",[-0.15,0.05,0.0],[-0.29,0.42,0.33],0.022],["hand_r","seg",[-0.15,0.05,0.0],[-0.15,0.05,0.0],0.04],["weapon","seg",[-0.15,0.05,0.0],[-0.29,0.42,0.33],0.035],["weapon","seg",[-0.23,0.22,0.17],[-0.29,0.42,0.33],0.09],["cape","box",[-0.6,-0.1,-0.6],[0.6,0.12,-0.1]],["cape","box",[-0.6,-0.4,-0.6],[0.6,-0.1,-0.15]],["cape","box",[-0.6,-0.4,-0.6],[-0.17,0.0,0.1]],["cape","box",[0.3,-0.4,-0.6],[0.6,0.0,0.1]],["Head","box",[-0.15,0.27,-0.3],[0.18,0.6,0.2]]],"fantasy_12":[["hand_r","seg",[-0.28,0.09,0.34],[0.18,0.37,-0.2],0.035],["hand_r","box",[0.06,0.25,-0.34],[0.31,0.5,-0.07]],["Head","box",[-0.17,0.24,-0.15],[0.17,0.6,0.25]]],"fantasy_8":[["weapon","seg",[0,-0.23,0.19],[0,0.035,0.2],0.03],["weapon","seg",[-0.06,0.02,0.2],[0.06,0.02,0.2],0.02],["cape","box",[-0.6,-0.6,-0.6],[0.6,0.15,0.04]],["cape","box",[-0.6,-0.6,-0.6],[-0.19,0.12,0.6]],["cape","box",[0.19,-0.6,-0.6],[0.6,0.12,0.6]],["Head","box",[-0.12,0.28,-0.15],[0.12,0.6,0.2]]],"fantasy_11":[["Ear1.L","box",[0.15,-0.12,-0.6],[0.6,0.6,0.6]],["Ear1.R","box",[-0.6,-0.12,-0.6],[-0.15,0.6,0.6]],["Head","box",[-0.08,0.1,0.3],[0.08,0.4,0.6]]],"mecha_1":[["hand_r","seg",[0.06,0.04,0.2],[0.166,0.013,0.323],0.06],["hand_r","seg",[-0.14,0.186,-0.118],[0.166,0.013,0.323],0.05],["Head","ymin",0.33]],"mecha_4":[["hand_r","seg",[-0.211,0.224,0.146],[0.052,0.5,-0.015],0.035],["Head","box",[-0.1,0.22,-0.2],[0.12,0.6,0.2]]],"mecha_9":[["hand_r","seg",[0.1,0.08,0.2],[0.225,0.018,0.295],0.06],["hand_r","seg",[-0.171,0.262,-0.018],[0.225,0.018,0.295],0.045],["Head","box",[-0.11,0.33,-0.06],[0.1,0.6,0.25]],["spine_03","box",[-0.25,0.0,-0.6],[0.25,0.6,-0.07]]],"mecha_12":[["spine_03","seg",[-0.15,0.02,0.093],[0.241,0.437,0.057],0.035],["spine_03","seg",[0.16,0.02,0.094],[-0.163,0.33,0.066],0.035],["Head","box",[-0.12,0.27,-0.1],[0.12,0.6,0.25]],["pelvis","box",[-0.07,-0.36,0.05],[0.07,-0.02,0.3]],["cape","box",[-0.6,-0.42,-0.6],[0.6,0.0,-0.06]],["cape","box",[-0.6,-0.28,-0.6],[-0.19,-0.04,0.0]],["cape","box",[0.19,-0.28,-0.6],[0.6,-0.04,0.0]]],"mecha_5":[["hand_r","box",[-0.5,-0.3,-0.26],[-0.29,0.36,0.12]],["hand_l","seg",[0.3,0.02,0.08],[0.47,0.03,0.3],0.05],["Head","box",[-0.09,0.29,-0.2],[0.09,0.6,0.2]]],"mecha_8":[["weapon","seg",[-0.245,-0.47,0.18],[-0.245,0.49,0.18],0.03],["weapon","seg",[-0.245,0.12,0.2],[-0.245,0.49,0.18],0.08],["hand_l","seg",[0.219,-0.016,0.066],[0.279,-0.384,-0.195],0.03],["cape","box",[-0.6,-0.4,-0.6],[0.6,0.15,-0.08]],["cape","box",[-0.6,-0.4,-0.6],[-0.2,0.0,0.1]],["cape","box",[0.25,-0.4,-0.6],[0.6,-0.05,0.1]],["Head","box",[-0.1,0.27,-0.1],[0.1,0.6,0.2]]],"mecha_3":[["hand_r","seg",[-0.37,-0.05,0.12],[-0.46,-0.16,0.18],0.03],["Head","box",[-0.1,0.28,-0.1],[0.12,0.6,0.3]]],"mecha_10":[["weapon","seg",[-0.217,0.15,0.06],[-0.218,0.157,0.422],0.045],["spine_03","box",[-0.3,0.05,-0.6],[0.3,0.6,-0.12]],["Head","box",[-0.1,0.26,-0.12],[0.1,0.6,0.1]]],"mecha_11":[["hand_r","seg",[-0.327,-0.054,0.008],[-0.489,-0.272,0.071],0.035],["hand_l","seg",[0.328,-0.053,0.011],[0.488,-0.281,0.058],0.035]],"hunde_9":[["Head","box",[-0.1,0.3,0.0],[0.1,0.6,0.3]]],"hunde_11":[["Torso3","box",[-0.6,0.08,-0.3],[0.6,0.35,0.0]]],"hunde_1":[["Head","box",[-0.22,0.27,0.08],[0.22,0.6,0.45]]],"hunde_6":[["Head","box",[-0.15,0.36,0.0],[0.15,0.6,0.35]]],"hunde_8":[["Head","box",[-0.1,0.37,0.05],[0.1,0.6,0.25]]],"fantasy_2":[["weapon","seg",[-0.345,-0.051,-0.286],[-0.13,0.07,-0.09],0.05],["weapon","seg",[0.14,0.22,0.2],[0.336,0.335,0.386],0.05],["weapon","seg",[-0.345,-0.051,-0.286],[0.336,0.335,0.386],0.032],["Head","ymin",0.3]],"fantasy_4":[["hand_r","seg",[0.19,0.29,0.13],[0.36,0.48,0.134],0.1],["hand_r","seg",[-0.34,-0.237,0.108],[0.289,0.403,0.134],0.025],["Head","ymin",0.25]],"fantasy_5":[["hand_r","box",[-0.34,-0.3,-0.13],[-0.1,0.2,0.2]],["hand_l","box",[0.215,-0.47,-0.16],[0.34,-0.32,0.06]],["hand_l","seg",[0.242,-0.027,0.004],[0.264,-0.388,-0.058],0.04],["Head","ymin",0.3]],"fantasy_6":[["weapon","box",[-0.34,0.3,0.05],[-0.2,0.5,0.18]],["weapon","seg",[-0.232,-0.5,0.093],[-0.27,0.45,0.114],0.03],["Head","box",[-0.2,0.26,-0.3],[0.22,0.6,0.3]]],"mecha_2":[["weapon","seg",[0.1,0.101,-0.462],[-0.412,0.054,0.464],0.035],["Head","box",[0.0,0.32,-0.08],[0.17,0.5,0.15]]],"mecha_6":[["weapon","box",[-0.3,0.35,0.08],[-0.18,0.52,0.2]],["weapon","seg",[-0.234,-0.5,0.126],[-0.245,0.497,0.142],0.03],["Head","box",[-0.11,0.35,-0.06],[0.08,0.6,0.15]],["cape","box",[-0.6,-0.42,-0.6],[0.6,0.3,-0.08]],["cape","box",[-0.6,-0.42,-0.6],[-0.17,0.05,0.05]],["cape","box",[0.17,-0.42,-0.6],[0.6,0.05,0.05]]]};
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
    sh.vertexShader = vs; sh.uniforms.iClip = U.iClip; sh.uniforms.uNode = U.uNode; sh.uniforms.uNodeI = U.uNodeI; if (U.uTex) sh.uniforms.uSkinTex = U.uTex; // eigene Clip-Textur (Füße auf dem Stein)
    if (rim) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vec3(1.0, 0.12, 0.05) * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2) * 1.6;');
  }
  var fixQ = Promise.resolve();
  Board3D.prototype.attachSkin = function (g, S, col) {
    var T = THREE, A = S.A, rim = Math.abs(g.userData.p || 0) >= 9 && this.settings.promoStyle === 'glanz';
    this.attachGlb(g, S.src, col);
    var m = g.userData.glb, mesh = null; m.traverse(function (o) { if (o.isMesh) mesh = o; });
    var U = { iClip: { value: new T.Vector4(A.ids.bind, 0, -1, 0) }, uNode: { value: S.node }, uNodeI: { value: S.nodeI }, uTex: { value: A.tex } };
    var mat = mesh.material.clone(); mat.onBeforeCompile = function (sh) { patch(sh, A, U, false, rim); }; mat.customProgramCacheKey = function () { return rim ? 'figS-rim' : 'figS'; };
    var dm = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }); dm.onBeforeCompile = function (sh) { patch(sh, A, U, true); }; dm.customProgramCacheKey = function () { return 'figSd'; };
    // in Ruhe zeichnet die Figur mit dem normalen Statuen-Material (Bind-Pose = Ruhepose), Skinning kostet nur während Aktionen
    g.userData.sk = { A: A, U: U, clip: [A.ids.bind, 0, -1, 0], cur: 'bind', until: 0, then: null, mats: [mat, dm], mesh: mesh, stat: mesh.material, off: 0, full: mesh.geometry };
    var self = this; fixQ = fixQ.then(yieldNow).then(function () { if (g.parent && g.userData.sk) self.figFix(g); }).catch(function () { }); // Fußkorrektur vorab, eine Figur nach der anderen
  };
  // Figur entfernt: eigene Materialien freigeben (Programm bleibt im Cache)
  Board3D.prototype.figFree = function (g) { var k = g && g.userData.sk; if (k) { k.mats.forEach(function (x) { x.dispose(); }); k.mats = []; } };

  // ---------- Füße auf dem Stein, Maße für den Kampf ----------
  // Figuren stecken auf ihrem Stein (Wunsch 19.10.): in allen Clips außer Sterben bleiben die Füße (alles, was in der Ruhepose bis low über dem
  // tiefsten Punkt liegt: Füße, Pfoten, Saum) in der Draufsicht innerhalb der Innenkante des Goldrands (RIM_IN, margin Abstand). Abheben ist erlaubt.
  // Je Frame die kleinste waagrechte Verschiebung, die alle Fußpunkte hineinholt, auf alle Knochen des Frames gerechnet (eigene Kopie der
  // Clip-Textur je Modell und Platz auf dem Stein; die Armee nutzt das Original). Dazu je Clip die Reichweite nach vorn (zur Steinspitze):
  // core = Rumpf, Beine, Kopf (ohne Arme, Waffe, Umhang, Schwanz), reach = alles, hit = alles rund um den Treffer-Frame.
  Board3D.FIG_FEET = { low: 0.1, margin: 0.015, free: ['die1', 'die2', 'fin_d', 'kneel'], loco: ['walk', 'run', 'sprint', 'strafe_l', 'strafe_r', 'flee', 'roll'], n: 500, nAll: 1600, win: [0.15, 0.1],
    fwd: ['ready', 'atk1', 'atk2', 'atk3', 'atk4', 'block', 'parry2', 'hit1', 'hit2', 'hit3', 'fin_a', 'cast', 'shoot', 'jet', 'punch'], fwdMax: 0.3 }; // fwd: Kampf-Clips, in denen die Figur bis fwdMax nach vorn an die Steinspitze tritt
  Board3D.FIG_MEASURE = ['ready', 'idle', 'atk1', 'atk2', 'atk3', 'atk4', 'block', 'parry2', 'hit1', 'hit2', 'hit3', 'fin_a', 'cast', 'shoot', 'jet', 'punch', 'cheer1'];
  var FIG_LIMB = /arm|hand|weapon|cape|Tail|Ear|Front/;
  function rimEdges(mg) { // Halbebenen der Innenkante, Normale nach innen: n·p + c ≥ mg heißt drinnen
    var P = Board3D.RIM_IN;
    return P.map(function (a, i) { var b = P[(i + 1) % P.length], nx = a[1] - b[1], nz = b[0] - a[0], l = Math.hypot(nx, nz); nx /= l; nz /= l; if (nx * -a[0] + nz * (0.1 - a[1]) < 0) { nx = -nx; nz = -nz; } return [nx, nz, -(nx * a[0] + nz * a[1]) - mg]; });
  }
  // kleinste Verschiebung d mit n_i·d ≥ b_i für alle Kanten (2D, wenige Bedingungen: Ecken der Lösungsmenge durchprobieren); passt nichts, kleinste Überschreitung
  function minShift(E, b) {
    function ok(x, z) { for (var i = 0; i < E.length; i++) if (E[i][0] * x + E[i][1] * z < b[i] - 1e-6) return false; return true; }
    if (ok(0, 0)) return [0, 0];
    var best = null, bl = 1e9, i, j;
    function tryP(x, z) { var l = Math.hypot(x, z); if (l < bl && ok(x, z)) { bl = l; best = [x, z]; } }
    for (i = 0; i < E.length; i++) if (b[i] > 0) tryP(E[i][0] * b[i], E[i][1] * b[i]);
    for (i = 0; i < E.length; i++) for (j = i + 1; j < E.length; j++) { var det = E[i][0] * E[j][1] - E[i][1] * E[j][0]; if (Math.abs(det) > 1e-9) tryP((b[i] * E[j][1] - E[i][1] * b[j]) / det, (E[i][0] * b[j] - b[i] * E[j][0]) / det); }
    if (best) return best;
    var x = 0, z = 0;
    for (var it = 0; it < 300; it++) { var w = -1, wv = 0; for (i = 0; i < E.length; i++) { var vv = b[i] - E[i][0] * x - E[i][1] * z; if (vv > wv) { wv = vv; w = i; } } if (w < 0) break; x += E[w][0] * wv * 0.3; z += E[w][1] * wv * 0.3; }
    return [x, z];
  }
  function thin(a, n) { if (a.length <= n) return a; var s = a.length / n, o = []; for (var i = 0; i < n; i++) o.push(a[Math.floor(i * s)]); return o; }
  Board3D.prototype.figFix = function (g) {
    var k = g && g.userData.sk; if (!k) return null; if (k.fix) return k.fix;
    var T = THREE, A = k.A, F = Board3D.FIG_FEET, mesh = k.mesh, m = g.userData.glb; if (!mesh || !mesh.parent || !m) return null;
    var f0 = m.userData.face || 0; m.rotation.y = m.userData.ry0 || 0; g.updateMatrixWorld(true);
    var Q = new T.Matrix4().copy(g.matrixWorld).invert().multiply(mesh.parent.matrixWorld); m.rotation.y = (m.userData.ry0 || 0) + f0;
    var key = Q.elements.map(function (v) { return v.toFixed(3); }).join(','), C = A._figFix || (A._figFix = {});
    if (C[key]) { k.fix = C[key]; k.U.uTex.value = k.fix.tex; return k.fix; }
    var geo = k.full, P = geo.getAttribute('position'), SI = geo.getAttribute('aSkinI'), SW = geo.getAttribute('aSkinW'), N = k.U.uNode.value, n = P.count, v = new T.Vector3();
    var QN = new T.Matrix4().multiplyMatrices(Q, N), ys = new Float32Array(n), ymin = Infinity, i, q;
    for (i = 0; i < n; i++) { v.fromBufferAttribute(P, i).applyMatrix4(QN); ys[i] = v.y; if (v.y < ymin) ymin = v.y; }
    var feetI = [], allI = [], bn = A.meta.bones, st = Math.max(1, Math.floor(n / F.nAll));
    for (i = 0; i < n; i++) { if (ys[i] < ymin + F.low) feetI.push(i); if (i % st === 0) allI.push(i); }
    function samp(ix) { return ix.map(function (i) { v.fromBufferAttribute(P, i).applyMatrix4(N); var I = [], W = [], bw = 0, db = 0; for (var q = 0; q < 4; q++) { I.push(SI.getComponent(i, q)); W.push(SW.getComponent(i, q)); if (W[q] > bw) { bw = W[q]; db = I[q]; } } return { x: v.x, y: v.y, z: v.z, I: I, W: W, core: !FIG_LIMB.test(bn[db] || '') }; }); }
    var feet = samp(thin(feetI, F.n)), all = samp(allI);
    var H = T.DataUtils.fromHalfFloat, Hh = T.DataUtils.toHalfFloat, d = A.tex.image.data, nb = bn.length, fl = new Float32Array(d.length), d2 = new Uint16Array(d);
    for (i = 0; i < d.length; i++) fl[i] = H(d[i]);
    var e = Q.elements, q00 = e[0], q01 = e[4], q02 = e[8], q03 = e[12], q20 = e[2], q21 = e[6], q22 = e[10], q23 = e[14];
    var Qi = new T.Matrix3().setFromMatrix4(Q).invert().elements; // Stein → Rig (nur Richtung)
    function skXZ(s, row, out) { // Ecke im Frame row skinnen, Stein-Raum x/z
      var x = 0, y = 0, z = 0;
      for (var q = 0; q < 4; q++) { var w = s.W[q]; if (!w) continue; var o = row * nb * 12 + s.I[q] * 12; x += w * (fl[o] * s.x + fl[o + 1] * s.y + fl[o + 2] * s.z + fl[o + 3]); y += w * (fl[o + 4] * s.x + fl[o + 5] * s.y + fl[o + 6] * s.z + fl[o + 7]); z += w * (fl[o + 8] * s.x + fl[o + 9] * s.y + fl[o + 10] * s.z + fl[o + 11]); }
      out[0] = q00 * x + q01 * y + q02 * z + q03; out[1] = q20 * x + q21 * y + q22 * z + q23;
    }
    var E = rimEdges(F.margin), nE = E.length, p = [0, 0], out0 = {}, out = {}, fwd = {}, mix = {}, M = { core: {}, reach: {}, hit: {} };
    var pb = new Float32Array(feet.length * 2); // Fußpunkte in Ruhe (bind = Einheitsmatrizen)
    for (i = 0; i < feet.length; i++) { pb[i * 2] = q00 * feet[i].x + q01 * feet[i].y + q02 * feet[i].z + q03; pb[i * 2 + 1] = q20 * feet[i].x + q21 * feet[i].y + q22 * feet[i].z + q23; }
    function bOf(P, a, s, bo) { // Überschreitung je Kante für die Fußpunkte (1 − a) · Pose + a · Ruhe + s
      for (var j = 0; j < nE; j++) bo[j] = -1e9;
      for (var fi = 0; fi < feet.length; fi++) { var x = P[fi * 2] * (1 - a) + pb[fi * 2] * a + s[0], z = P[fi * 2 + 1] * (1 - a) + pb[fi * 2 + 1] * a + s[1]; for (j = 0; j < nE; j++) { var vv = -(E[j][0] * x + E[j][1] * z + E[j][2]); if (vv > bo[j]) bo[j] = vv; } }
      return bo;
    }
    function resid(bo, e) { var r = 0; for (var j = 0; j < nE; j++) r = Math.max(r, bo[j] - E[j][0] * e[0] - E[j][1] * e[1]); return r; }
    Object.keys(A.meta.clips).forEach(function (nm) {
      if (nm === 'bind' || F.free.indexOf(nm) >= 0 || F.loco.indexOf(nm) >= 0) return;
      var c = A.meta.clips[nm], nf = c[1], Ps = [], bo = new Float32Array(nE), Bx = new Float32Array(nE).fill(-1e9), w0 = 0, w1 = 0, f, j, df, g2, z0 = [0, 0];
      for (f = 0; f < nf; f++) { var P = new Float32Array(feet.length * 2); for (var fi = 0; fi < feet.length; fi++) { skXZ(feet[fi], c[0] + f, p); P[fi * 2] = p[0]; P[fi * 2 + 1] = p[1]; } Ps.push(P); bOf(P, 0, z0, bo); for (j = 0; j < nE; j++) { Bx[j] = Math.max(Bx[j], bo[j]); w0 = Math.max(w0, bo[j]); } }
      // Kampf-Clips: die Figur tritt nach vorn an die Steinspitze (für den ganzen Clip gleich weit, sonst rutschen die Füße), so weit die Füße in allen Frames drinbleiben
      var s = [0, 0];
      if (F.fwd.indexOf(nm) >= 0) for (var zz = 0; zz <= F.fwdMax + 1e-6; zz += 0.01) {
        var lo = -1e9, hi = 1e9, okz = true;
        for (j = 0; j < nE; j++) { var need = Bx[j] + E[j][1] * zz; if (Math.abs(E[j][0]) < 1e-6) { if (need > 1e-6) { okz = false; break; } } else if (E[j][0] > 0) lo = Math.max(lo, need / E[j][0]); else hi = Math.min(hi, need / E[j][0]); }
        if (okz && lo <= hi) s = [Math.max(lo, Math.min(hi, 0)), -zz];
      }
      // Beine weiter gespreizt als der Stein: Pose so wenig wie nötig Richtung Ruhepose mischen (wie eine Überblendung), dann glätten
      var al = new Float32Array(nf), am2 = new Float32Array(nf), as = new Float32Array(nf);
      for (f = 0; f < nf; f++) {
        if (resid(bOf(Ps[f], 0, s, bo), minShift(E, bo)) <= 1e-4) continue;
        var a0 = 0, a1 = 1;
        for (var it = 0; it < 8; it++) { var ah = (a0 + a1) / 2; if (resid(bOf(Ps[f], ah, s, bo), minShift(E, bo)) <= 1e-4) a1 = ah; else a0 = ah; }
        al[f] = a1;
      }
      for (f = 0; f < nf; f++) { var mxa = 0; for (df = -2; df <= 2; df++) { g2 = f + df; if (g2 >= 0 && g2 < nf) mxa = Math.max(mxa, al[g2]); } am2[f] = mxa; }
      for (f = 0; f < nf; f++) { var sm = 0, cn = 0; for (df = -1; df <= 1; df++) { g2 = f + df; if (g2 >= 0 && g2 < nf) { sm += am2[g2]; cn++; } } as[f] = sm / cn; }
      var amx = 0;
      for (f = 0; f < nf; f++) {
        var a = as[f], e = minShift(E, bOf(Ps[f], a, s, bo)); w1 = Math.max(w1, resid(bo, e)); amx = Math.max(amx, a);
        var tx = s[0] + e[0], tz = s[1] + e[1]; if (!a && !tx && !tz) continue;
        var rx = Qi[0] * tx + Qi[6] * tz, ry = Qi[1] * tx + Qi[7] * tz, rz = Qi[2] * tx + Qi[8] * tz, row = c[0] + f; // Qi spaltenweise: Spalte 0 = x, Spalte 2 = z
        for (var bb = 0; bb < nb; bb++) {
          var o = row * nb * 12 + bb * 12;
          if (a) for (var r2 = 0; r2 < 3; r2++) for (var cc = 0; cc < 4; cc++) fl[o + r2 * 4 + cc] = fl[o + r2 * 4 + cc] * (1 - a) + (cc === r2 ? a : 0);
          fl[o + 3] += rx; fl[o + 7] += ry; fl[o + 11] += rz;
          for (var u = 0; u < 12; u++) d2[o + u] = Hh(fl[o + u]);
        }
      }
      out0[nm] = w0; out[nm] = w1; fwd[nm] = -s[1]; mix[nm] = amx;
    });
    // Reichweiten nach vorn (−z im Stein-Raum) je Clip, nach der Korrektur
    function reach(nm) {
      var c = A.meta.clips[nm], fps = A.meta.fps, h = A.hit[nm], a = h != null ? Math.max(0, Math.floor((h - F.win[0]) * fps)) : 0, z = h != null ? Math.min(c[1] - 1, Math.ceil((h + F.win[1]) * fps)) : c[1] - 1, rc = -9, ra = -9, rh = -9;
      for (var f = 0; f < c[1]; f++) for (var si = 0; si < all.length; si++) { skXZ(all[si], c[0] + f, p); var fw = -p[1]; if (fw > ra) ra = fw; if (all[si].core && fw > rc) rc = fw; if (f >= a && f <= z && fw > rh) rh = fw; }
      M.core[nm] = rc; M.reach[nm] = ra; M.hit[nm] = rh;
    }
    reach('bind'); Board3D.FIG_MEASURE.forEach(function (nm) { if (A.ids[nm] != null) reach(nm); });
    var tex = new T.DataTexture(d2, A.tex.image.width, A.tex.image.height, T.RGBAFormat, T.HalfFloatType); tex.minFilter = tex.magFilter = T.NearestFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
    k.fix = C[key] = { tex: tex, M: M, out0: out0, out: out, fwd: fwd, mix: mix, feet: feet.length }; k.U.uTex.value = tex;
    return k.fix;
  };
  // Maße einer Figur ohne Rig (starre Statue): Vorderkante in Ruhe
  Board3D.prototype.figFit = function (g) {
    var f = this.figFix(g); if (f) return f.M;
    var m = g.userData.glb, T = THREE; if (!m) return { core: { bind: 0.3 }, reach: { bind: 0.3 }, hit: { bind: 0.3 } };
    if (m.userData.figM) return m.userData.figM;
    var f0 = m.userData.face || 0; m.rotation.y = m.userData.ry0 || 0; g.updateMatrixWorld(true);
    var inv = new T.Matrix4().copy(g.matrixWorld).invert(), L = new T.Matrix4(), v = new T.Vector3(), fw = -9;
    m.traverse(function (o) { if (!o.isMesh) return; L.multiplyMatrices(inv, o.matrixWorld); var pa = o.geometry.attributes.position, st = Math.max(1, Math.floor(pa.count / 3000)); for (var i = 0; i < pa.count; i += st) { v.fromBufferAttribute(pa, i).applyMatrix4(L); if (-v.z > fw) fw = -v.z; } });
    m.rotation.y = (m.userData.ry0 || 0) + f0;
    return (m.userData.figM = { core: { bind: fw }, reach: { bind: fw }, hit: { bind: fw } });
  };
  // Steinspitze: wie weit der Stein (ohne Figur) nach vorn reicht
  Board3D.prototype.figTip = function (g) {
    if (this._figTip) return this._figTip;
    var T = THREE, m = g.userData.glb, bb = new T.Box3(), b1 = new T.Box3(); g.updateMatrixWorld(true);
    var inv = new T.Matrix4().copy(g.matrixWorld).invert(), L = new T.Matrix4();
    g.children.forEach(function (c) { if (c === m) return; c.traverse(function (o) { if (!o.isMesh || !o.geometry) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); b1.copy(o.geometry.boundingBox).applyMatrix4(L.multiplyMatrices(inv, o.matrixWorld)); bb.union(b1); }); });
    return (this._figTip = bb.isEmpty() ? 0.46 : -bb.min.z);
  };

  // ---------- Clips ----------
  // Clip abspielen. o: hitAt = Sekunden bis zum Treffer (Clip wird so verschoben, dass sein Treffer-Frame passt),
  // then = Folge-Clip nach dem Ende (Standard: Kampfhaltung, wenn ausgewählt, sonst still stehen), hold = letztes Bild halten, freeze = bei dieser Sekunde anhalten
  Board3D.prototype.figPlay = function (g, name, o) {
    var k = g && g.userData.sk; if (!k) return 0; o = o || {};
    if (Array.isArray(name)) name = name[Math.floor(Math.random() * name.length)];
    var A = k.A; if (A.ids[name] == null) return 0;
    if (name !== 'bind' && !k.fix) this.figFix(g);
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
  Board3D.FIG_SEL = 'bind'; // Auswahl: steinstill wie eine Statue (Wunsch 19.10.; vorher 'idle')
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
  // Auswahl: Figur bleibt still (FIG_SEL), abgewählt ebenso
  Board3D.prototype.figSelect = function (sq) {
    var g = sq != null && sq >= 0 && this.look !== 'feld' ? this.pieces[sq] : null; if (g === this._selG) return;
    var old = this._selG; this._selG = g;
    if (old && old.userData.sk) { old.userData.sk.sel = false; this.figRest(old); }
    if (g && g.userData.sk) { g.userData.sk.sel = true; if (!g.userData.sk.busy) this.figPlay(g, Board3D.FIG_SEL); }
  };
  function snd(n, a, t) { if (typeof Sfx !== 'undefined') Sfx.play(n, a, t); }
  function typ(g) { return Math.abs(g.userData.p || 0); }

  // ---------- Zug: der Stein gleitet, die Figur steht still wie eine Statue (Wunsch 19.10.: kein Gehen, kein Drehen) ----------
  // Schwerer Stein (Wunsch 19.10.: „Spielsteine mit Gewicht“): zieht träge an, kippt beim Anfahren leicht zurück und beim Bremsen nach vorn
  // (Drehpunkt an der Unterkante), schießt minimal über, wippt nach und setzt mit Staub und kleinem Ruck auf. yaw: Drehung nebenher (Ziel), w: Stärke 0–1
  Board3D.FIG_HEAVY = { tilt: 0.075, over: 0.035, edge: 0.45, settle: 0.22, dust: 8, thud: 0.06 };
  Board3D.prototype.figGlide = function (g, tx, tz, ms, yaw, w) {
    var self = this, T = THREE, H = Board3D.FIG_HEAVY, x0 = g.position.x, z0 = g.position.z, dx = tx - x0, dz = tz - z0, L = Math.hypot(dx, dz); w = w == null ? 1 : w;
    var r0 = g.rotation.y, r1 = yaw == null ? r0 : yaw; while (r1 - r0 > Math.PI) r1 -= Math.PI * 2; while (r1 - r0 < -Math.PI) r1 += Math.PI * 2;
    if (L < 0.004 && Math.abs(r1 - r0) < 1e-3) return Promise.resolve();
    var y0 = this.BT, ax = new T.Vector3(L ? dz / L : 0, 0, L ? -dx / L : 0), qy = new T.Quaternion(), qt = new T.Quaternion(), up = new T.Vector3(0, 1, 0), amp = H.tilt * w * Math.min(1, L / 0.8), ov = Math.min(H.over * w, L * 0.04), mainK = 1 - H.settle;
    function smooth(x) { return x * x * x * (x * (x * 6 - 15) + 10); } // weich an- und auslaufen (träge)
    return this.tween(ms, function (q) {
      var k = Math.min(1, q / mainK), tilt = -amp * Math.sin(k * Math.PI * 2), bump = k > 0.75 ? Math.pow(Math.sin((k - 0.75) / 0.25 * Math.PI / 2), 2) : 0;
      if (q > mainK) { var s2 = (q - mainK) / H.settle; bump = Math.cos(s2 * Math.PI * 1.5) * (1 - s2); tilt = amp * 0.35 * Math.sin(s2 * Math.PI * 2) * (1 - s2); } // Überschießen und Nachwippen
      var p = smooth(k) + (L > 1e-4 ? ov / L * bump : 0);
      g.position.x = x0 + dx * p; g.position.z = z0 + dz * p; g.position.y = y0 + Math.abs(Math.sin(tilt)) * H.edge; // Kante bleibt auf dem Brett
      qy.setFromAxisAngle(up, r0 + (r1 - r0) * smooth(Math.min(1, q / mainK))); qt.setFromAxisAngle(ax, tilt); g.quaternion.copy(qt).multiply(qy);
    }).then(function () {
      g.position.set(tx, y0, tz); g.rotation.set(0, r1, 0); delete g.userData.q0;
      if (L > 0.15 && w > 0.5) { self.emit(tx, y0 + 0.04, tz, 0xd8c8a0, H.dust * (Board3D.MOBILE ? 0.5 : 1), 1.0, 0.25); self.shakeAmt = Math.max(self.shakeAmt || 0, H.thud * w); }
    });
  };
  // onNear: kurz vor der Ankunft (geschlagene Figur ohne Kampf wegräumen), Promise. Auch für Statuen ohne Rig.
  Board3D.prototype.figWalk = function (g, from, to, onNear) {
    var self = this, k = g.userData.sk, dx = to.x - from.x, dz = to.z - from.z, dist = Math.hypot(dx, dz), ms = Math.min(1250, 380 + dist * 130), near = null;
    if (k) { k.busy = true; this.figPlay(g, 'bind'); }
    var m = g.userData.glb; if (m) m.userData.face = 0;
    if (onNear) this.tween(ms * 0.45, function () { }).then(function () { near = onNear(); });
    g.position.set(from.x, this.BT, from.z);
    return this.figGlide(g, to.x, to.z, ms, null, 1)
      .then(function () { return near; })
      .then(function () { if (k) { k.busy = false; self.figRest(g); } });
  };
  // Statue auf dem Stein (Figuren-Ansicht), auch ohne Rig: gleitet und kämpft vom Sockel aus
  Board3D.prototype.figStatue = function (g) { return !!(g && this.settings.figSet === 'statue' && this.look !== 'feld' && (g.userData.sk || g.userData.glb) && !g.userData.troops); };

  // ---------- Kampf vom Sockel aus (Wunsch 19.10.: Figuren stecken auf ihren Steinen, leben aber) ----------
  // Beide Steine drehen sich samt Figur, bis die Spitzen zueinander zeigen, der Angreifer-Stein gleitet bis knapp vor den Gegner
  // (Steine berühren sich nicht, Körper schneiden sich nicht), dann 3–5 Schläge mit Paraden (einer streift) und Finisher von den Sockeln aus.
  // Vor jedem Schlag rückt der Stein des Schlagenden auf den Abstand, bei dem seine Waffe im Treffer-Frame den Rumpf des Gegners gerade berührt
  // (Maße je Figur und Clip aus figFix). Der Verlierer stirbt auf seinem Sockel, der Sieger-Stein gleitet aufs Feld und dreht zurück.
  // Kampfregie je Edition: blade = Farbe der Energieklinge (Funken), jet = Düsenstoß beim Heranrücken (Abgasfarbe), shot = Laserfarbe,
  // boom = Explosion statt Zerfall, magic = Zauberfarbe, rune = Runenkreis beim Zaubern, brawl = Raufen statt Töten (Verlierer-Stein rutscht weg)
  Board3D.FIG_ED = {
    feudal: {},
    mecha: { blade: 0x6fe6ff, jet: 0x7fc8ff, shot: 0x8ff0ff, boom: true, magic: 0x6fe6ff, guns: [1, 9, 10] }, // guns: Typen mit Kanone schießen statt zu hauen
    fantasy: { magic: 0xb98aff, rune: true },
    hunde: { brawl: true }
  };
  Board3D.prototype.figEd = function () { return Board3D.FIG_ED_TEST || this.theme.id; }; // FIG_ED_TEST: Regie einer Edition mit Feudal-Rigs ausprobieren
  // body: Luft zwischen den Rümpfen, stone: Luft zwischen den Steinspitzen, turn: Drehen der Steine (ms)
  Board3D.FIG_DUEL = { budget: 7200, swing: 480, heroes: [6, 7, 8], body: 0.03, stone: 0.04, turn: 300 };
  Board3D.prototype.figFight = function (info, A, from, to, D, style) {
    var self = this, T = THREE, short = this.settings.fights === 'kurz', sp = short ? 0.75 : 1, BT = this.BT, FD = Board3D.FIG_DUEL;
    var ed = this.figEd(), E = Board3D.FIG_ED[ed] || {}, fe = this.theme.id === 'feudal';
    if (E.brawl && (style === 'magic' || style === 'shoot' || style === 'breath')) style = 'charge'; // Hunde raufen nur
    if (E.guns && E.guns.indexOf(typ(A)) >= 0 && A.userData.sk && style !== 'magic') style = 'shoot';
    var dx = to.x - from.x, dz = to.z - from.z, dist = Math.hypot(dx, dz) || 1, ux = dx / dist, uz = dz / dist;
    var cell = Math.hypot(this.sqPos(1).x - this.sqPos(0).x, this.sqPos(1).z - this.sqPos(0).z) || 1;
    var colA = new T.Color(this.theme.factions[info.col].color).getHex(), dust = this.dustColor(1 - info.col), big = Math.abs(info.cap) >= 6;
    var ka = A.userData.sk, kd = D.userData.sk, ta = typ(A), hero = !short && FD.heroes.indexOf(ta) >= 0, pm = Board3D.MOBILE ? 0.5 : 1;
    var sa = fe ? ta : null, sd = fe ? typ(D) : null; // Stimmen je Typ gibt es nur in Feudal
    function tt(g) { return fe ? typ(g) : null; }
    if (ka) ka.busy = true; if (kd) kd.busy = true;
    [A, D].forEach(function (g) { var m = g.userData.glb; if (m) m.userData.face = 0; delete g.userData.q0; }); // Figur dreht nie allein
    var MA = this.figFit(A), MD = this.figFit(D), tip = this.figTip(A), rA0 = A.rotation.y;
    function has(g, n) { var k = g.userData.sk; return !!(k && k.A.ids[n] != null); }
    function wait(ms) { return self.tween(ms * sp, function () { }); }
    function ease(k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
    // Abstand der Steinmitten: Steine berühren sich nicht, Rümpfe schneiden sich nicht, Waffe des Schlagenden (rund um den Treffer) berührt den Rumpf
    // des Gegners gerade, Arme/Waffe des Abwehrenden stecken nicht im Rumpf des Schlagenden
    function mz(g) { return g === A ? MA : MD; }
    function core(g, c) { var M = mz(g); return M.core[c] != null ? M.core[c] : M.core.bind; }
    function reach(g, c, h) { var M = mz(g), t = h ? M.hit : M.reach; return t[c] != null ? t[c] : M.reach.bind; }
    function gap(att, def, ca, cd) { return Math.max(2 * tip + FD.stone, core(att, ca) + core(def, cd) + FD.body, reach(att, ca, true) + core(def, cd), reach(def, cd) + core(att, ca)); }
    // Stein samt Figur drehen (Spitze zum Punkt), Stein zum Gegner auf Abstand gleiten lassen
    function yawTo(g, x, z) { return Math.atan2(-(x - g.position.x), -(z - g.position.z)); }
    function turn(g, goal, ms) {
      var a0 = g.rotation.y; while (goal - a0 > Math.PI) goal -= Math.PI * 2; while (goal - a0 < -Math.PI) goal += Math.PI * 2;
      if (Math.abs(goal - a0) < 1e-3) return Promise.resolve();
      return self.tween(ms, function (k) { g.rotation.y = a0 + (goal - a0) * ease(k); });
    }
    function slideTo(g, other, d, ms) {
      var x0 = g.position.x, z0 = g.position.z, vx = x0 - other.position.x, vz = z0 - other.position.z, l = Math.hypot(vx, vz) || 1, tx = other.position.x + vx / l * d, tz = other.position.z + vz / l * d;
      if (Math.hypot(tx - x0, tz - z0) < 0.004) return Promise.resolve();
      return self.figGlide(g, tx, tz, Math.max(90, ms), null, 0.45); // kurzes Nachrücken: wenig Kippen, kein Staub
    }
    // Duell-Nahsicht: Ausschnitt passend zu beiden Feldern, Blick von der Seite (Profil), flach, ohne Bildverschiebung
    var o = this.orbit, cam0 = { x: o.target.x, y: o.target.y, z: o.target.z, r: o.radius, th: o.thetaGoal, ph: o.phi }, mx = (from.x + to.x) / 2, mzz = (from.z + to.z) / 2;
    var ext = (style === 'magic' ? dist / 2 : Math.min(dist / 2, cell * 1.2)) + cell * 0.9, vfh = this.camera.fov * Math.PI / 360, hfh = Math.atan(Math.tan(vfh) * this.camera.aspect);
    if (style !== 'magic' && dist > cell * 2.4) { mx = to.x - ux * cell * 1.2; mzz = to.z - uz * cell * 1.2; } // weiter Weg: Kamera beim Ziel
    var cr = Math.max(2.4, Math.min(9, ext / Math.tan(Math.min(vfh, hfh)) * 1.05)), cdx = Math.sin(o.theta), cdz = Math.cos(o.theta), px = -uz, pz = ux;
    if (px * cdx + pz * cdz < 0) { px = -px; pz = -pz; }
    var th1 = Math.atan2(px * 0.85 + cdx * 0.55 - ux * 0.25, pz * 0.85 + cdz * 0.55 - uz * 0.25), vs0 = this.viewShift == null ? 0.17 : this.viewShift;
    while (th1 - o.theta > Math.PI) th1 -= Math.PI * 2; while (th1 - o.theta < -Math.PI) th1 += Math.PI * 2;
    if (!short) this.tween(600, function (k) { var e = ease(k); o.target.x = cam0.x + (mx - cam0.x) * e; o.target.z = cam0.z + (mzz - cam0.z) * e; o.target.y = cam0.y + (BT + 0.3 - cam0.y) * e; o.radius = cam0.r + (cr - cam0.r) * e; o.phi = cam0.ph + (1.2 - cam0.ph) * e; o.thetaGoal = o.theta = cam0.th + (th1 - cam0.th) * e; self.viewShift = vs0 * (1 - e); });
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
    // Wucht der Helden beim tödlichen Treffer: Zeitlupe, Druckwelle aus Staub und Funken, Kamera ruckt heran und schwenkt
    function wucht(x, z) {
      if (!hero) return;
      self.slowmo(380, 0.3); self.shakeAmt = Math.max(self.shakeAmt || 0, 0.65); snd('roar', 0.6, sa);
      for (var i = 0; i < 18; i++) { var a = i / 18 * Math.PI * 2; self.emitDir(x, BT + 0.06, z, dust, 3 * pm, Math.cos(a) * 3.2, 0.25, Math.sin(a) * 3.2, 0.5); }
      self.emit(x, BT + 0.5, z, E.brawl ? 0xd8c8a0 : E.blade || 0xffd76a, 50 * pm, 5, 1.4);
      var r0 = o.radius, t0 = o.thetaGoal, sw = (Math.random() < 0.5 ? -1 : 1) * 0.22;
      self.tween(260, function (k) { var e = 1 - Math.pow(1 - k, 3); o.radius = r0 * (1 - 0.12 * e); o.thetaGoal = o.theta = t0 + sw * e; });
    }
    function pick(g, l) { l = l.filter(function (n) { return has(g, n); }); return l.length ? l[Math.floor(Math.random() * l.length)] : 'bind'; }
    // ein Schlag: der Stein des Schlagenden rückt auf Abstand, beim Treffer-Frame pariert der Gegner; graze = Treffer streift (Taumeln, kein Tod),
    // brk = Abwehr bricht (vor dem Finisher). Ohne Rig: der ganze Stein stößt vor und zurück.
    function strike(att, def, graze, brk) {
      var hitAt = 0.32 * sp, ka2 = att.userData.sk, kd2 = def.userData.sk;
      var ca = ka2 ? pick(att, ['atk1', 'atk2']) : 'bind', cd = !kd2 || graze ? 'ready' : brk && has(def, 'parry2') ? 'parry2' : 'block', dS = gap(att, def, ca, cd);
      if (ka2) { slideTo(att, def, dS, hitAt * 750); self.figPlay(att, ca, { hitAt: hitAt, then: 'ready' }); }
      else slideTo(att, def, dS + 0.14, hitAt * 450).then(function () { return slideTo(att, def, dS, hitAt * 450); });
      if (kd2 && !graze) self.figPlay(def, cd, { hitAt: hitAt, then: 'ready' });
      snd('whoosh', 0.7, tt(att));
      return self.tween(hitAt * 1000, function () { }).then(function () {
        var p = mid(), back = ka2 ? null : slideTo(att, def, dS + 0.1, 180);
        if (!kd2) { var v = dir(), s = def === D ? 1 : -1, x0 = def.position.x, z0 = def.position.z; self.tween(220, function (k) { var e = Math.sin(k * Math.PI) * 0.06 * s; def.position.x = x0 + v[0] * e; def.position.z = z0 + v[1] * e; }); } // Statue ohne Rig: Stein ruckt zurück
        if (graze) { if (kd2) self.figPlay(def, has(def, 'hit3') ? ['hit1', 'hit3'] : 'hit1', { then: 'ready' }); snd('hit', 0.5, tt(att)); sparks(def.position.x, def.position.z, att === A ? colA : 0xffffff, 18, 0.2); return back; }
        snd(E.brawl ? 'hit' : 'clash', E.brawl ? 0.4 : 0.8); if (E.blade) snd('zap', 0.4); sparks(p.x, p.z, 0xffffff, 22, 0.14); return back;
      });
    }
    // Todesstoß: gepaarter Finisher, wenn beide Clips da sind; sonst atk4 und danach der Sterbe-Clip
    function finisher() {
      var hitAt = 0.45 * sp, pair = !short && !E.brawl && has(A, 'fin_a') && has(D, 'fin_d'), left = 0, ca = pair ? 'fin_a' : has(A, 'atk4') ? 'atk4' : ka ? pick(A, ['atk1', 'atk2']) : 'bind';
      var dF = gap(A, D, ca, 'ready');
      if (ka) { slideTo(A, D, dF, hitAt * 700); self.figPlay(A, ca, { hitAt: hitAt, then: 'ready' }); }
      else slideTo(A, D, dF + 0.18, hitAt * 450).then(function () { return slideTo(A, D, dF, hitAt * 500); });
      // fin_d trifft früher (0,33 s) als hitAt: später starten, damit beide Treffer-Frames aufeinanderliegen
      if (pair) { var dA = D.userData.sk.A, hd = dA.hit.fin_d || 0; left = dA.dur.fin_d - hd + hitAt; if (hd >= hitAt) self.figPlay(D, 'fin_d', { hitAt: hitAt, hold: true }); else wait((hitAt - hd) * 1000 / sp).then(function () { self.figPlay(D, 'fin_d', { hold: true }); }); }
      snd('whoosh', 0.9, sa);
      return self.tween(hitAt * 1000, function () { }).then(function () {
        if (info.onHit) info.onHit();
        snd('hit', 0.9, sa); sparks(D.position.x, D.position.z, colA, big ? 90 : 60, big ? 0.5 : 0.35); wucht(D.position.x, D.position.z);
        if (E.brawl) { if (kd) self.figPlay(D, has(D, 'hit2') ? 'hit2' : 'hit1', { hold: true }); var u = dir(); return wait(200).then(function () { return self.figSlide(D, u[0], u[1], sp); }); } // Hunde: umgerannt, Stein rutscht weg
        return pair ? crumble(wait(Math.min(E.boom ? 700 : 1150, Math.max(0, left - hitAt) * 1000 * 0.9))) : die();
      });
    }
    // Verteidiger stirbt auf seinem Sockel: Sterbe-Animation (oder Umkippen samt Stein ohne Rig), dann zerfällt er zu Staub
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
    // Sieger-Stein gleitet aufs Feld und dreht zurück in die Blickrichtung seiner Seite, die Figur steht wieder still
    function stepIn() {
      var x0 = A.position.x, z0 = A.position.z, d2 = Math.hypot(to.x - x0, to.z - z0), ms = Math.max(300, Math.min(900, 250 + d2 * 160));
      if (ka) { ka.busy = false; self.figRest(A); }
      camBack();
      return self.figGlide(A, to.x, to.z, ms + 150, rA0, 1);
    }
    // beide Steine drehen sich zueinander (Spitze an Spitze), Kampfhaltung
    var face = Promise.all([turn(A, yawTo(A, to.x, to.z), FD.turn), turn(D, yawTo(D, from.x, from.z), FD.turn)]).then(function () { delete D.userData.q0; self.figPlay(A, 'ready'); self.figPlay(D, 'ready'); });

    if (style === 'magic' || style === 'shoot' || style === 'breath') {
      // Fernkampf vom eigenen Feld aus: Zauber (Onmyōji, Fantasy-Magier mit Runenkreis), Salven (Mecha-Laser), Feueratem (Drache); Gegner fällt, Läufer als Held mit Druckwelle
      var head = BT + 0.95, mc = E.magic || colA;
      var hitAnim = function (g) { if (g.userData.sk) self.figPlay(g, has(g, 'hit3') ? ['hit1', 'hit3'] : 'hit1', { then: 'ready' }); };
      var magic = function () {
        var ring = null, bolt;
        if (E.rune) { ring = new T.Mesh(new T.RingGeometry(0.32, 0.46, 40), new T.MeshBasicMaterial({ color: mc, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(from.x, BT + 0.04, from.z); self.scene.add(ring); }
        self.figPlay(A, has(A, 'cast') ? 'cast' : ['atk1', 'atk2'], { hitAt: 0.25 });
        return self.tween(250 * sp, function (k) { if (ring) { ring.material.opacity = k * 0.9; ring.rotation.z = k * 2; ring.scale.setScalar(0.6 + k * 0.6); } }).then(function () {
          snd('zap', 0.8, sa);
          bolt = new T.Mesh(new T.SphereGeometry(hero ? 0.22 : 0.16, 12, 8), new T.MeshBasicMaterial({ color: mc, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false }));
          self.scene.add(bolt);
          return self.tween((300 + dist * 40) * sp, function (k) { var x = from.x + dx * k, z = from.z + dz * k, y = head + Math.sin(k * Math.PI) * 0.8; bolt.position.set(x, y, z); bolt.scale.setScalar(1 + Math.sin(k * 30) * 0.2); self.emitDir(x, y, z, mc, 3 * pm, 0, 0, 0, 0.6); if (ring) { ring.material.opacity = 0.9 * (1 - k); ring.rotation.z = 2 + k * 3; } });
        }).then(function () { self.scene.remove(bolt); bolt.geometry.dispose(); bolt.material.dispose(); if (ring) { self.scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); } });
      };
      // Salve: Mündungsblitz, Leuchtspur, Einschlag; der letzte Schuss trifft tödlich
      var volley = function () {
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
      };
      var breath = function () {
        self.figPlay(A, 'atk2'); snd('fire', 0.9); hitAnim(D);
        return self.tween(700 * sp, function (k) { self.emitDir(from.x + ux * 0.4, head, from.z + uz * 0.4, k < .5 ? 0xffb030 : 0xff5a20, 6 * pm, ux * 6.5, -0.8, uz * 6.5, 1.4); });
      };
      return face.then(function () { return wait(220); }).then(function () { return style === 'shoot' ? volley() : style === 'breath' ? breath() : magic(); })
        .then(function () { if (info.onHit) info.onHit(); sparks(to.x, to.z, style === 'shoot' ? E.shot || colA : mc, big ? 90 : 60, big ? 0.5 : 0.35); wucht(to.x, to.z); if (kd) self.figPlay(D, 'hit1'); return die(); }).then(stepIn);
    }
    // Nahkampf: Angreifer-Stein gleitet heran (Mecha mit Düsenstoß), Schlagabtausch, Finisher. Steht der Gegner schon zu nah (große Figuren
    // auf Nachbarfeldern), weicht dessen Stein zurück.
    var d0 = gap(A, D, 'ready', 'ready'), run = dist - d0, ms = Math.max(260, Math.min(900, Math.abs(run) / 2.6 * 1000)), jet = !!E.jet && run > 0.4;
    // Zeitbudget (Voll, Notbremse in app.js bei 8 s): fester Teil ohne Schläge (Drehen, Heranrücken, Finisher, Fall, Zerfall, Gleiten aufs Feld,
    // Bild-Takt der Tweens), daraus 3–5 Schläge (zufällig, so viele das Budget erlaubt)
    var fixed = ms + FD.turn + 4000 + (hero ? 300 : 0) + (E.brawl ? 150 : 0);
    var nMax = Math.max(2, Math.min(5, Math.floor((FD.budget - fixed) / FD.swing))), want = 3 + Math.floor(Math.random() * 3);
    var n = short ? 1 : Math.min(nMax, want), graze = n >= 3 ? 1 + Math.floor(Math.random() * (n - 1)) : -1;
    var seq = face.then(function () {
      if (jet) snd('fire', 0.5);
      var g = run >= 0 ? A : D, other = run >= 0 ? D : A, x0 = g.position.x, z0 = g.position.z, v = [other.position.x - x0, other.position.z - z0], l = Math.hypot(v[0], v[1]) || 1, tx = other.position.x - v[0] / l * d0, tz = other.position.z - v[1] / l * d0;
      if (jet) self.tween(ms * 0.8, function () { self.emitDir(A.position.x - ux * 0.3, BT + 0.4, A.position.z - uz * 0.3, E.jet, 2 * pm, -ux * 2.5, 0.2, -uz * 2.5, 0.35); });
      return self.figGlide(g, tx, tz, ms + 120, null, 1);
    }).then(function () { return wait(100); });
    var brk = (n - 1) % 2 ? n - 2 : n - 1; // letzter Angriff vor dem Finisher: Abwehr des Verteidigers bricht
    for (var i = 0; i < n; i++) (function (i) { seq = seq.then(function () { return i % 2 ? strike(D, A, i === graze) : strike(A, D, i === graze, i === brk); }).then(function () { return wait(i === n - 1 ? 200 : 160); }); })(i);
    this._duel = { n: n, nMax: nMax, hero: hero, d0: d0 }; // für Tests
    return seq.then(finisher).then(stepIn);
  };

  // Verteidiger mit Rig, Angreifer ohne (Fuchs-Sprung, Hirsch-Ansturm, Feueratem): nur der Tod mit Sterbe-Animation
  Board3D.prototype.figDie = function (D, dust, sp, ux, uz) {
    var self = this, k = D.userData.sk, p0 = D.position.clone(), E = Board3D.FIG_ED[this.figEd()] || {}; k.busy = true;
    if (D.userData.q0) D.quaternion.copy(D.userData.q0);
    if (E.brawl) { this.figPlay(D, 'hit2' in k.A.ids ? 'hit2' : 'hit1'); return this.tween(260 * sp, function () { }).then(function () { return self.figSlide(D, ux, uz, sp); }); }
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
  // Hunde: wer verliert, dessen Stein rutscht samt Figur weg (dreht sich dabei), wird klein und verschwindet in einer Staubwolke
  Board3D.prototype.figSlide = function (D, ux, uz, sp) {
    var self = this, BT = this.BT, k = D.userData.sk, pm = Board3D.MOBILE ? 0.5 : 1, a = Math.atan2(ux, uz) + (Math.random() - 0.5) * 0.8, vx = Math.sin(a), vz = Math.cos(a);
    var x0 = D.position.x, z0 = D.position.z, r0 = D.rotation.y, spin = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random());
    if (k) k.busy = true; snd('whoosh', 0.5);
    return this.tween(900 * sp, function (q) {
      var e = 1 - (1 - q) * (1 - q); D.position.x = x0 + vx * 1.8 * e; D.position.z = z0 + vz * 1.8 * e; D.rotation.y = r0 + spin * e;
      D.scale.setScalar(q < 0.55 ? 1 : Math.max(0.001, 1 - (q - 0.55) / 0.45)); if (Math.random() < 0.35) self.emit(D.position.x, BT + 0.05, D.position.z, 0xd8c8a0, 2 * pm, 0.6, 0.3);
    }).then(function () { self.emit(D.position.x, BT + 0.15, D.position.z, 0xd8c8a0, 16 * pm, 1.2, 0.5); self.pieceGroup.remove(D); self.figFree(D); });
  };

  // ---------- Auftritte ----------
  // Beförderung: die Figur bleibt still, Lichtblitz, neue Figur (eigenes Modell) steht in Ruhepose (kein Jubel, Wunsch 19.10.)
  Board3D.prototype.figPromo = function (mover, np0, to) {
    var self = this, k = mover.userData.sk; if (k) k.busy = true;
    return this.tween(200, function () { }).then(function () {
      var np = self.makePiece(np0); np.position.copy(mover.position); self.pieceGroup.remove(mover); self.figFree(mover); self.pieceGroup.add(np);
      if (self._lastMove && self._lastMove.g === mover) self._lastMove.g = np;
      self.emit(to.x, self.BT + 0.9, to.z, 0xffd76a, 80, 4, 1.4); self.emit(to.x, self.BT + 0.2, to.z, 0xff5a3a, 40, 2.5, 0.8);
      return np;
    });
  };
  // Abwurf: die Figur landet still auf dem Stein (kein Jubel), der schwere Stein setzt mit Ruck und Staub auf
  Board3D.prototype.figLand = function (g) { if (!this.figStatue(g)) return; this.emit(g.position.x, this.BT + 0.04, g.position.z, 0xd8c8a0, 14 * (Board3D.MOBILE ? 0.5 : 1), 1.4, 0.3); this.shakeAmt = Math.max(this.shakeAmt || 0, 0.1); };
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
