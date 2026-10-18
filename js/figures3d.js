// Detaillierte Low-Poly-Figuren für das 3D-Brett. Jede Einheit soll man auf einen Blick erkennen.
// Aufbau als Szenengraph, danach pro Material zu einer Geometrie verschmolzen (wenige Draw-Calls am Handy).
// Blickrichtung der Figur: -z (für Sente nach vorne). Füße bei y = 0, Kopf ca. y = 0.35.
var Figures3D = (function () {
  var cache = {}, matCache = {};

  function materials(T, col, fhex) {
    var key = col + fhex; if (matCache[key]) return matCache[key];
    var fc = new T.Color(fhex), D = T.DoubleSide;
    function std(o) { return new T.MeshStandardMaterial(o); }
    var m = {
      cloth: std({ color: fc.clone().multiplyScalar(0.62), roughness: 0.85, side: D }),
      clothD: std({ color: fc.clone().multiplyScalar(0.3), roughness: 0.9, side: D }),
      clothHi: std({ color: fc, roughness: 0.6, emissive: fc, emissiveIntensity: 0.25, side: D }),
      lacquer: std({ color: col === 0 ? 0x22384a : 0x3e1518, roughness: 0.35, metalness: 0.3, flatShading: true }),
      gold: std({ color: 0xffcf4a, roughness: 0.35, metalness: 0.45, emissive: 0x4a2c00, flatShading: true }),
      silver: std({ color: 0xe8edf2, roughness: 0.3, metalness: 0.4, emissive: 0x1c1e24, flatShading: true }),
      skin: std({ color: 0xf0cfa8, roughness: 0.75 }),
      wood: std({ color: 0x6b4423, roughness: 0.8 }),
      white: std({ color: 0xf4efe6, roughness: 0.8, side: D }),
      black: std({ color: 0x141418, roughness: 0.6, flatShading: true }),
      ivory: std({ color: 0xfff3d6, roughness: 0.5 }),
      red: std({ color: 0xd8322b, roughness: 0.55 }),
      feather: std({ color: 0x1d1c26, roughness: 0.7, flatShading: true, side: D }),
      leaf: std({ color: 0x4f9a48, roughness: 0.7, side: D }),
      fur: std({ color: 0xff8c3a, roughness: 0.85, flatShading: true }),
      furW: std({ color: 0xfff4e6, roughness: 0.9, flatShading: true }),
      jade: std({ color: 0x2fb36a, roughness: 0.35, metalness: 0.35, emissive: 0x06301a, flatShading: true }),
      flame: std({ color: 0xffa040, emissive: 0xff6a10, emissiveIntensity: 1.6, roughness: 0.5 }),
      glow: std({ color: fc, emissive: fc, emissiveIntensity: 2.2 }),
      aura: new T.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false })
    };
    matCache[key] = m; return m;
  }

  function build(T, t, col, fhex) {
    var key = t + ':' + col + fhex;
    if (!cache[key]) cache[key] = make(T, t, col, fhex);
    return instance(T, cache[key]);
  }

  function make(T, t, col, fhex) {
    var mt = materials(T, col, fhex), root = new T.Group(), anims = [];
    var base = t >= 9 ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 6, 7][t] : t, promo = t >= 9;
    var V = function (x, y, z) { return new T.Vector3(x, y, z); };
    function mesh(parent, geo, m, x, y, z, rx, ry, rz, sx, sy, sz) {
      var o = new T.Mesh(geo, typeof m === 'string' ? mt[m] : m); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0);
      if (sx != null) o.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz); parent.add(o); return o;
    }
    function grp(parent, x, y, z, rx, ry, rz) { var g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); g.rotation.set(rx || 0, ry || 0, rz || 0); parent.add(g); return g; }
    // Animierte Teile hängen direkt an der Wurzel, damit die Animation einfache Transformationen hat
    function anim(geo, m, kind, x, y, z, rx, ry, rz) { anims.push({ geo: geo, mat: mt[m], kind: kind, pos: V(x || 0, y || 0, z || 0), rot: new T.Euler(rx || 0, ry || 0, rz || 0) }); }
    function worldPos(o) { root.updateMatrixWorld(true); var v = new T.Vector3(); o.getWorldPosition(v); return v; }
    var C = function (rt, rb, h, s) { return new T.CylinderGeometry(rt, rb, h, s || 10); };
    var S = function (r, w, hh) { return new T.SphereGeometry(r, w || 12, hh || 10); };
    var B = function (x, y, z) { return new T.BoxGeometry(x, y, z); };
    var K = function (r, h, s) { return new T.ConeGeometry(r, h, s || 8); };
    var HALF = function (r) { return new T.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); };

    // ---------- Mensch ----------
    // o: armor ('lacquer'|'gold'|'silver'), robe (Onmyōji), armL/armR: [rx, rz]
    function human(o) {
      var armor = o.armor || 'lacquer', H = {};
      if (o.robe) {
        mesh(root, C(0.06, 0.135, 0.3, 14), 'white', 0, 0.15, 0);
        mesh(root, C(0.066, 0.11, 0.2, 14), 'cloth', 0, 0.2, 0);
        mesh(root, C(0.068, 0.068, 0.025, 14), 'clothHi', 0, 0.2, 0);
      } else {
        mesh(root, B(0.04, 0.02, 0.07), 'black', -0.035, 0.01, -0.015); mesh(root, B(0.04, 0.02, 0.07), 'black', 0.035, 0.01, -0.015);
        mesh(root, C(0.055, 0.1, 0.15, 12), 'clothD', 0, 0.085, 0);              // Hakama
        mesh(root, C(0.078, 0.094, 0.06, 12), armor, 0, 0.165, 0);              // Kusazuri (Rüstungsschurz)
        mesh(root, C(0.066, 0.066, 0.022, 12), 'clothHi', 0, 0.19, 0);          // Obi
        mesh(root, C(0.074, 0.064, 0.13, 12), armor, 0, 0.25, 0);               // Dō (Brustpanzer)
        mesh(root, new T.TorusGeometry(0.071, 0.006, 4, 18), 'gold', 0, 0.27, 0, Math.PI / 2);
        mesh(root, C(0.022, 0.022, 0.006, 12), 'clothHi', 0, 0.255, -0.071, Math.PI / 2);  // Wappen
        mesh(root, B(0.078, 0.085, 0.022), o.sode || armor, -0.095, 0.275, 0, 0, 0, 0.38);   // Sode (Schulterplatten)
        mesh(root, B(0.078, 0.085, 0.022), o.sode || armor, 0.095, 0.275, 0, 0, 0, -0.38);
      }
      mesh(root, C(0.03, 0.04, 0.03, 10), o.robe ? 'white' : 'clothD', 0, 0.32, 0);          // Kragen
      var head = H.head = grp(root, 0, 0.36, 0);
      mesh(head, S(0.048), o.face || 'skin', 0, 0, 0);
      mesh(head, S(0.0075, 6, 5), 'black', -0.018, 0.006, -0.043); mesh(head, S(0.0075, 6, 5), 'black', 0.018, 0.006, -0.043);
      if (col === 1 && !o.noHorns) { mesh(head, K(0.011, 0.055, 6), 'ivory', -0.03, 0.06, -0.01, 0, 0, 0.45); mesh(head, K(0.011, 0.055, 6), 'ivory', 0.03, 0.06, -0.01, 0, 0, -0.45); }
      [['L', -1, o.armL || [0.1, -0.15]], ['R', 1, o.armR || [0.1, 0.15]]].forEach(function (a) {
        var sh = grp(root, a[1] * 0.088, 0.3, 0, a[2][0], 0, a[2][1]);
        mesh(sh, C(0.022, 0.018, 0.15, 8), o.robe ? 'cloth' : 'clothD', 0, -0.075, 0);
        if (o.robe) mesh(sh, C(0.028, 0.052, 0.1, 10), 'white', 0, -0.09, 0);        // weite Ärmel
        else mesh(sh, B(0.045, 0.06, 0.045), armor, 0, -0.1, 0);                    // Kote (Armschutz)
        mesh(sh, S(0.021, 8, 6), 'skin', 0, -0.158, 0);
        H['hand' + a[0]] = grp(sh, 0, -0.16, 0);
      });
      return H;
    }
    function kabuto(head, m, crest) {
      mesh(head, HALF(0.057), m, 0, 0.004, 0);
      mesh(head, C(0.062, 0.088, 0.045, 14), m, 0, -0.012, 0.012);             // Shikoro (Nackenschutz)
      mesh(head, B(0.03, 0.03, 0.012), 'gold', -0.06, 0.0, -0.02, 0, 0.5, 0); mesh(head, B(0.03, 0.03, 0.012), 'gold', 0.06, 0.0, -0.02, 0, -0.5, 0); // Fukigaeshi
      if (crest === 'kuwagata') { mesh(head, B(0.012, 0.11, 0.006), 'silver', -0.024, 0.085, -0.05, 0, 0, 0.32); mesh(head, B(0.012, 0.11, 0.006), 'silver', 0.024, 0.085, -0.05, 0, 0, -0.32); mesh(head, C(0.012, 0.012, 0.006, 10), 'gold', 0, 0.035, -0.056, Math.PI / 2); }
      if (crest === 'moon') { mesh(head, new T.TorusGeometry(0.075, 0.011, 6, 22, Math.PI), 'gold', 0, 0.045, -0.055); mesh(head, C(0.02, 0.02, 0.008, 12), 'clothHi', 0, 0.04, -0.058, Math.PI / 2); }
      if (crest === 'sun') { mesh(head, new T.TorusGeometry(0.045, 0.009, 6, 18, Math.PI), 'gold', 0, 0.04, -0.055); }
    }
    function at(hand, rx, ry, rz) { var p = worldPos(hand); return grp(root, p.x, p.y, p.z, rx, ry, rz); }
    function spear(g, len, blade) { mesh(g, C(0.0065, 0.0065, len, 6), 'wood', 0, 0, 0); mesh(g, K(0.016, blade || 0.075, 4), 'silver', 0, len / 2 + (blade || 0.075) / 2, 0); mesh(g, C(0.011, 0.011, 0.012, 8), 'gold', 0, len / 2, 0); }
    function flag(x, y, z, w, h) { var g = new T.PlaneGeometry(w, h); g.translate(w / 2, 0, 0); anim(g, 'clothHi', 'flag', x, y, z, 0, Math.PI / 2, 0); }
    function auraRing(r) { var g = new T.TorusGeometry(r, 0.01, 6, 36); g.rotateX(Math.PI / 2); anim(g, 'aura', 'spin', 0, 0.015, 0); }

    var armorP = promo ? 'gold' : null;
    if (base === 1) { // Ashigaru: Jingasa-Hut, Speer aufrecht
      var h1 = human({ armor: armorP || 'lacquer', armR: [0.55, 0.3] });
      mesh(h1.head, K(0.115, 0.05, 16), 'lacquer', 0, 0.05, 0); mesh(h1.head, S(0.01, 6, 5), 'gold', 0, 0.078, 0);
      mesh(h1.head, C(0.018, 0.018, 0.004, 10), 'clothHi', 0, 0.05, -0.06, 1.15);
      spear(at(h1.handR, 0, 0, 0), 0.62); root.children[root.children.length - 1].position.y += 0.13;
    }
    if (base === 2) { // Yari-Lanze: Sturmangriff, langer Speer nach vorn, Rückenbanner
      var h2 = human({ armor: armorP || 'lacquer', armL: [1.25, 0.25], armR: [1.05, -0.2] });
      kabuto(h2.head, 'lacquer', 'sun');
      var sp = at(h2.handR, -Math.PI / 2 - 0.12, 0, 0); sp.position.x = 0.02; sp.position.z -= 0.04; spear(sp, 0.46, 0.1);
      mesh(root, C(0.005, 0.005, 0.42, 5), 'wood', 0, 0.44, 0.07); flag(0, 0.56, 0.07, 0.1, 0.17);
    }
    if (base === 3) { // Kitsune-Späher: sitzender Fuchs mit drei Schwänzen
      var fx = grp(root, 0, 0, 0);
      mesh(fx, S(0.08), 'fur', 0, 0.075, 0.045, 0, 0, 0, 1, 0.8, 1.15);
      mesh(fx, S(0.065), 'fur', 0, 0.17, 0.0, 0, 0, 0, 0.92, 1.25, 1);
      mesh(fx, S(0.055), 'furW', 0, 0.165, -0.035, 0, 0, 0, 0.85, 1.15, 0.8);
      [-1, 1].forEach(function (s) { mesh(fx, C(0.015, 0.012, 0.15, 6), 'fur', s * 0.03, 0.075, -0.055); mesh(fx, S(0.019, 6, 5), 'furW', s * 0.03, 0.008, -0.065, 0, 0, 0, 1, 0.6, 1.3); mesh(fx, S(0.035, 8, 6), 'fur', s * 0.06, 0.04, 0.06, 0, 0, 0, 0.8, 0.8, 1.4); });
      var hd = grp(fx, 0, 0.29, -0.04);
      mesh(hd, S(0.06), 'fur', 0, 0, 0, 0, 0, 0, 1.05, 0.92, 1);
      mesh(hd, S(0.04), 'furW', -0.028, -0.02, -0.035, 0, 0, 0, 1, 0.8, 0.9); mesh(hd, S(0.04), 'furW', 0.028, -0.02, -0.035, 0, 0, 0, 1, 0.8, 0.9);
      mesh(hd, K(0.03, 0.085, 8), 'fur', 0, -0.012, -0.08, -Math.PI / 2);
      mesh(hd, S(0.011, 6, 5), 'black', 0, -0.012, -0.123);
      mesh(hd, S(0.009, 6, 5), 'glow', -0.024, 0.012, -0.05); mesh(hd, S(0.009, 6, 5), 'glow', 0.024, 0.012, -0.05);
      [-1, 1].forEach(function (s) { mesh(hd, K(0.028, 0.095, 4), 'fur', s * 0.034, 0.075, 0.005, 0, 0, -s * 0.28); mesh(hd, K(0.016, 0.06, 4), 'black', s * 0.034, 0.068, -0.006, 0, 0, -s * 0.28); });
      mesh(fx, new T.TorusGeometry(0.05, 0.012, 6, 16), 'clothHi', 0, 0.235, -0.025, Math.PI / 2 - 0.35);   // Halstuch
      mesh(fx, B(0.03, 0.05, 0.006), 'clothHi', 0.01, 0.2, -0.075, 0.2, 0, 0.2);
      [-0.55, 0, 0.55].forEach(function (ry) { // drei buschige Schwänze
        var tl = grp(fx, 0, 0.07, 0.1, -0.75, ry, 0);
        mesh(tl, S(0.045), 'fur', 0, 0, 0.07, 0, 0, 0, 0.75, 0.75, 1.6);
        mesh(tl, S(0.04), 'fur', 0, 0, 0.15, 0, 0, 0, 0.85, 0.85, 1.3);
        mesh(tl, S(0.034), 'furW', 0, 0, 0.21, 0, 0, 0, 0.9, 0.9, 1.1);
      });
      if (promo) mesh(hd, HALF(0.04), 'gold', 0, 0.035, 0.0);   // Hauptmanns-Helm
    }
    if (base === 4) { // Silber-Samurai: Kabuto mit Kuwagata, Katana erhoben
      var h4 = human({ armor: armorP || 'silver', sode: promo ? 'gold' : 'silver', armR: [1.0, 0.55], armL: [0.35, -0.2] });
      kabuto(h4.head, promo ? 'gold' : 'silver', 'kuwagata');
      mesh(h4.head, B(0.062, 0.028, 0.02), 'red', 0, -0.022, -0.04);  // Menpō
      var kt = at(h4.handR, -0.25, 0, -0.55);
      mesh(kt, C(0.024, 0.024, 0.006, 12), 'gold', 0, 0, 0); mesh(kt, C(0.008, 0.008, 0.075, 6), 'black', 0, -0.04, 0);
      mesh(kt, B(0.012, 0.32, 0.004), 'silver', 0, 0.163, 0); mesh(kt, K(0.008, 0.03, 4), 'silver', 0, 0.338, 0);
    }
    if (base === 5) { // Goldwache: goldene Rüstung, großer Schild, Naginata
      var h5 = human({ armor: 'gold', armL: [0.9, 0.35], armR: [0.35, 0.25] });
      kabuto(h5.head, 'lacquer', 'moon');
      var sh5 = grp(root, -0.035, 0.2, -0.11, 0, 0.2, 0);
      mesh(sh5, B(0.16, 0.25, 0.025), 'gold', 0, 0, 0); mesh(sh5, B(0.13, 0.22, 0.027), 'lacquer', 0, 0, 0.002);
      mesh(sh5, C(0.045, 0.045, 0.008, 16), 'clothHi', 0, 0.02, -0.014, Math.PI / 2); mesh(sh5, new T.TorusGeometry(0.05, 0.006, 4, 18), 'gold', 0, 0.02, -0.016);
      var ng = at(h5.handR, 0, 0, 0); ng.position.y += 0.12;
      mesh(ng, C(0.0065, 0.0065, 0.58, 6), 'black', 0, 0, 0); mesh(ng, B(0.025, 0.12, 0.005), 'silver', 0.008, 0.35, 0, 0, 0, -0.15);
    }
    if (base === 6) { // Onmyōji: Robe, Eboshi-Hut, schwebende Kugel, Bannkreis
      var h6 = human({ robe: true, armL: [0.5, -0.7], armR: [2.2, 0.95] });
      mesh(h6.head, C(0.034, 0.04, 0.12, 10), 'black', 0, 0.075, 0.012, 0.22);
      mesh(h6.head, B(0.07, 0.006, 0.05), 'black', 0, 0.04, 0.02);
      [-1, 1].forEach(function (s) { mesh(root, B(0.03, 0.08, 0.003), 'white', s * 0.15, 0.24, -0.02, 0, s * 0.4, s * 0.2); mesh(root, B(0.008, 0.06, 0.004), 'red', s * 0.15, 0.24, -0.022, 0, s * 0.4, s * 0.2); });
      var hp = worldPos(h6.handR); anim(S(0.042, 14, 12), 'glow', 'bob', hp.x, hp.y + 0.08, hp.z);
      var circ = new T.RingGeometry(0.17, 0.2, 5, 1); circ.rotateX(-Math.PI / 2); anim(circ, 'aura', 'spin', 0, 0.012, 0);
    }
    if (base === 7) { // Tengu: rotes Gesicht, lange Nase, schwarze Flügel, Blätterfächer
      var h7 = human({ armor: armorP || 'lacquer', face: 'red', armR: [0.7, 0.95], armL: [0.2, -0.25], noHorns: true });
      mesh(h7.head, C(0.005, 0.016, 0.1, 8), 'red', 0, 0.002, -0.09, -Math.PI / 2);
      mesh(h7.head, B(0.04, 0.008, 0.01), 'black', -0.02, 0.022, -0.042, 0, 0, 0.3); mesh(h7.head, B(0.04, 0.008, 0.01), 'black', 0.02, 0.022, -0.042, 0, 0, -0.3);
      mesh(h7.head, new T.DodecahedronGeometry(0.022), 'black', 0, 0.055, -0.018);  // Tokin-Kappe
      mesh(h7.head, S(0.05), 'white', 0, -0.03, 0.01, 0, 0, 0, 1, 0.7, 0.9);         // Bart
      if (col === 1) { mesh(h7.head, K(0.011, 0.05, 6), 'ivory', -0.032, 0.05, 0, 0, 0, 0.5); mesh(h7.head, K(0.011, 0.05, 6), 'ivory', 0.032, 0.05, 0, 0, 0, -0.5); }
      var fan = at(h7.handR, 0, 0, -0.5); mesh(fan, C(0.005, 0.005, 0.05, 5), 'wood', 0, 0.02, 0); mesh(fan, S(0.06, 10, 8), 'leaf', 0, 0.09, 0, 0, 0, 0, 0.75, 1.1, 0.12);
      var wsh = new T.Shape(); [[0, 0], [0.14, 0.13], [0.3, 0.2], [0.34, 0.12], [0.3, 0.06], [0.33, 0.0], [0.27, -0.03], [0.28, -0.1], [0.2, -0.08], [0.18, -0.16], [0.11, -0.08], [0.06, -0.12], [0.03, -0.04]].forEach(function (p, i) { if (i) wsh.lineTo(p[0], p[1]); else wsh.moveTo(p[0], p[1]); });
      var wg = new T.ExtrudeGeometry(wsh, { depth: 0.012, bevelEnabled: false });
      anim(wg, 'feather', 'wingR', 0.04, 0.29, 0.07, 0, -0.35, 0);
      anim(wg, 'feather', 'wingL', -0.04, 0.29, 0.07, 0, Math.PI + 0.35, 0);
    }
    if (base === 8) { // Daimyō: prachtvoller Helm, Umhang, Kriegsfächer, Fahne
      var h8 = human({ armor: 'lacquer', sode: 'gold', armR: [1.25, 0.35], armL: [0.2, -0.25] });
      kabuto(h8.head, 'lacquer', 'moon');
      mesh(h8.head, B(0.062, 0.03, 0.02), 'gold', 0, -0.022, -0.04);
      mesh(root, new T.CylinderGeometry(0.1, 0.15, 0.27, 16, 1, true, -Math.PI / 2 - 1.2, 2.4), 'clothHi', 0, 0.175, 0.012, 0, Math.PI, 0); // Jinbaori-Umhang
      var gb = at(h8.handR, 0.2, 0, 0); mesh(gb, C(0.006, 0.006, 0.06, 5), 'black', 0, 0.02, 0); mesh(gb, C(0.055, 0.055, 0.008, 18), 'gold', 0, 0.09, 0, Math.PI / 2); mesh(gb, C(0.02, 0.02, 0.01, 12), 'clothHi', 0, 0.09, -0.002, Math.PI / 2);
      mesh(root, C(0.006, 0.006, 0.52, 5), 'black', 0, 0.48, 0.09); mesh(root, S(0.012, 8, 6), 'gold', 0, 0.745, 0.09); flag(0, 0.62, 0.09, 0.13, 0.22);
    }
    if (base === 6 && promo) { // Kirin-Weiser: Kirin (Fabelwesen mit Geweih und Flammenmähne)
      root.clear(); anims.length = 0;
      var kb = grp(root, 0, 0, 0);
      mesh(kb, S(0.09), 'jade', 0, 0.21, 0.02, 0, 0, 0, 0.78, 0.72, 1.45);
      mesh(kb, new T.TorusGeometry(0.068, 0.008, 4, 18), 'gold', 0, 0.21, 0.02, 0, 0, 0, 1, 1, 1);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) { mesh(kb, C(0.017, 0.012, 0.17, 6), 'jade', p[0] * 0.045, 0.085, p[1] * 0.085); mesh(kb, C(0.016, 0.018, 0.022, 6), 'gold', p[0] * 0.045, 0.011, p[1] * 0.085); });
      mesh(kb, C(0.03, 0.045, 0.15, 8), 'jade', 0, 0.31, -0.1, 0.55);
      var kh = grp(kb, 0, 0.385, -0.15);
      mesh(kh, S(0.045), 'jade', 0, 0, -0.01, 0, 0, 0, 0.85, 0.8, 1.5); mesh(kh, S(0.008, 6, 5), 'glow', -0.03, 0.012, -0.03); mesh(kh, S(0.008, 6, 5), 'glow', 0.03, 0.012, -0.03);
      [-1, 1].forEach(function (s) { var an = grp(kh, s * 0.02, 0.03, 0.02, -0.5, 0, -s * 0.35); mesh(an, K(0.008, 0.11, 5), 'gold', 0, 0.055, 0); mesh(an, K(0.006, 0.05, 5), 'gold', 0, 0.06, -0.02, -0.9); });
      mesh(kh, K(0.01, 0.06, 5), 'gold', 0, -0.04, -0.03, 0.4);   // Bart
      [0, 1, 2, 3].forEach(function (i) { mesh(kb, K(0.022, 0.08, 6), 'flame', 0, 0.36 - i * 0.04, -0.06 + i * 0.035, 0.6); });
      mesh(kb, K(0.03, 0.12, 6), 'flame', 0, 0.26, 0.17, -1.0);
      auraRing(0.22);
    }
    if (base === 7 && promo) { // Drachenkönig: sich windender Drache
      root.clear(); anims.length = 0;
      var pts = [V(0.11, 0.03, 0.1), V(-0.08, 0.06, 0.12), V(-0.13, 0.13, -0.02), V(0.0, 0.2, -0.1), V(0.12, 0.27, 0.0), V(0.05, 0.35, 0.1), V(-0.05, 0.42, 0.04), V(-0.02, 0.47, -0.05)];
      var curve = new T.CatmullRomCurve3(pts);
      mesh(root, new T.TubeGeometry(curve, 60, 0.034, 9, false), 'jade', 0, 0, 0);
      for (var i = 1; i < 12; i++) { var u = i / 12, p = curve.getPointAt(u), tg = curve.getTangentAt(u); var sp2 = mesh(root, K(0.014, 0.05, 4), i % 2 ? 'gold' : 'flame', p.x, p.y + 0.03, p.z); sp2.lookAt(p.x + tg.x, p.y + tg.y + 1.5, p.z + tg.z); sp2.rotateX(Math.PI / 2); }
      var tip = curve.getPointAt(1), dh = grp(root, tip.x, tip.y + 0.02, tip.z - 0.02);
      mesh(dh, S(0.048), 'jade', 0, 0, 0, 0, 0, 0, 1, 0.85, 1.1);
      mesh(dh, B(0.06, 0.035, 0.08), 'jade', 0, -0.012, -0.06); mesh(dh, B(0.055, 0.015, 0.07), 'gold', 0, -0.035, -0.055);
      mesh(dh, S(0.009, 6, 5), 'glow', -0.026, 0.015, -0.035); mesh(dh, S(0.009, 6, 5), 'glow', 0.026, 0.015, -0.035);
      [-1, 1].forEach(function (s) { mesh(dh, K(0.011, 0.09, 5), 'gold', s * 0.025, 0.05, 0.03, -0.8, 0, -s * 0.25); mesh(dh, C(0.003, 0.002, 0.11, 4), 'gold', s * 0.03, -0.02, -0.09, 0.4, 0, s * 1.2); });
      auraRing(0.24);
    }
    if (promo && base !== 6 && base !== 7) auraRing(0.2);

    // ---------- verschmelzen ----------
    root.updateMatrixWorld(true);
    var byMat = new Map();
    root.traverse(function (o) {
      if (!o.isMesh) return;
      var g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); if (g.index) g = g.toNonIndexed();
      if (!byMat.has(o.material)) byMat.set(o.material, []); byMat.get(o.material).push(g);
    });
    var parts = [];
    byMat.forEach(function (list, mat) {
      var n = 0; list.forEach(function (g) { n += g.attributes.position.count; });
      var P = new Float32Array(n * 3), N = new Float32Array(n * 3), k = 0;
      list.forEach(function (g) { P.set(g.attributes.position.array, k * 3); N.set(g.attributes.normal.array, k * 3); k += g.attributes.position.count; g.dispose(); });
      var out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('normal', new T.BufferAttribute(N, 3)); out.computeBoundingSphere();
      parts.push({ geo: out, mat: mat });
    });
    return { parts: parts, anims: anims, scale: base === 8 ? 1.12 : 1 };
  }

  function instance(T, c) {
    var g = new T.Group();
    c.parts.forEach(function (p) { var m = new T.Mesh(p.geo, p.mat); m.castShadow = true; g.add(m); });
    c.anims.forEach(function (a) {
      var m = new T.Mesh(a.geo, a.mat); m.position.copy(a.pos); m.rotation.copy(a.rot); m.castShadow = a.kind !== 'spin';
      m.userData.anim = a.kind; m.userData.base = { y: a.pos.y, ry: a.rot.y }; g.add(m);
    });
    g.scale.setScalar(c.scale);
    return g;
  }

  // pro Frame aufrufen: t in Sekunden, seed pro Figur für Versatz
  function animate(fig, t, seed) {
    fig.children.forEach(function (m) {
      var a = m.userData.anim; if (!a) return; var b = m.userData.base;
      if (a === 'spin') m.rotation.y = t * 1.2 + seed;
      else if (a === 'bob') m.position.y = b.y + Math.sin(t * 3 + seed) * 0.025;
      else if (a === 'flag') m.rotation.y = b.ry + Math.sin(t * 4 + seed) * 0.3;
      else if (a === 'wingR') m.rotation.y = b.ry - Math.sin(t * 5 + seed) * 0.28;
      else if (a === 'wingL') m.rotation.y = b.ry + Math.sin(t * 5 + seed) * 0.28;
    });
  }
  return { build: build, animate: animate };
})();
