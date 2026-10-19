// Echte Skelett-Animationen für die Armee: Clips (Quaternius UAL, CC0) sind als Skin-Matrizen in eine Textur gebacken
// (Zeile = Frame, je Knochen 3 Texel = 3x4-Matrix). Der Vertex-Shader mischt pro Soldat Clip A/B (Überblendung) und
// interpoliert zwischen Frames. Pro Instanz: iClip = (Clip A, Start A, Clip B, Start B) in Sekunden der Armee-Uhr.
(function () {
  var cache = {}, done = {};
  var SkinAnim = { time: { value: 0 }, FADE: 0.18 };

  // lädt Mesh (GLB mit Gewichten), Clip-Liste (JSON) und Matrizen (Float16)
  SkinAnim.load = function (base) {
    if (cache[base]) return cache[base];
    var T = THREE;
    cache[base] = Promise.all([
      Models.load(base + '.glb'),
      fetch(base + '.json').then(function (r) { return r.json(); }),
      fetch(base + '.bin').then(function (r) { return r.arrayBuffer(); })
    ]).then(function (res) {
      var scene = res[0], meta = res[1], buf = res[2], sm = null;
      scene.traverse(function (o) { if (o.isSkinnedMesh && !sm) sm = o; });
      // Positionen sind schon im Modellraum (Blender-Welt): Mesh direkt an die Wurzel, ohne die Skelett-Knoten-Skalierung
      // als normales Mesh: SkinnedMesh rechnet seine Bounding-Box über die (abgehängten) Knochen, dann stimmen Größe und Bodenhöhe nicht
      var pm = new T.Mesh(sm.geometry, sm.material);
      while (scene.children.length) scene.remove(scene.children[0]); scene.add(pm); scene.updateMatrixWorld(true);
      var geo = sm.geometry.clone(), nb = meta.bones.length;
      // Gelenk-Index der GLB -> Reihenfolge in der Textur (über Knochennamen)
      var remap = sm.skeleton.bones.map(function (b) { return meta.bones.indexOf(b.name); });
      var si = geo.getAttribute('skinIndex'), sw = geo.getAttribute('skinWeight'), ai = new Float32Array(si.count * 4);
      for (var i = 0; i < si.count; i++) for (var k = 0; k < 4; k++) ai[i * 4 + k] = Math.max(0, remap[si.getComponent(i, k)]);
      geo.setAttribute('aSkinI', new T.BufferAttribute(ai, 4)); geo.setAttribute('aSkinW', sw.clone());
      geo.deleteAttribute('skinIndex'); geo.deleteAttribute('skinWeight');
      // eine Zeile Einheitsmatrizen anhängen: Clip 'bind' = Ruhepose des Modells (Statue steht wie modelliert)
      var rows = buf.byteLength / 2 / (nb * 12), data = new Uint16Array((rows + 1) * nb * 12); data.set(new Uint16Array(buf));
      for (var b = 0; b < nb; b++) for (var r = 0; r < 3; r++) data[rows * nb * 12 + b * 12 + r * 4 + r] = 0x3C00; // Half-Float 1.0
      meta.clips.bind = [rows, 1, 0]; rows++;
      var tex = new T.DataTexture(data, nb * 3, rows, T.RGBAFormat, T.HalfFloatType);
      tex.minFilter = tex.magFilter = T.NearestFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
      var names = Object.keys(meta.clips), clips = names.map(function (n) { var c = meta.clips[n]; return new T.Vector4(c[0], c[1], meta.fps, c[2]); });
      while (clips.length < 32) clips.push(new T.Vector4(0, 1, 24, 0));
      var ids = {}, dur = {}; names.forEach(function (n, j) { ids[n] = j; dur[n] = meta.clips[n][1] / meta.fps; });
      var A = { geo: geo, mat: sm.material, map: (sm.material && sm.material.map) || null, tex: tex, clips: clips, ids: ids, dur: dur, hit: meta.hit || {}, meta: meta, src: scene, mesh: pm };
      done[base] = A; return A;
    }, function (e) { done[base] = false; throw e; });
    return cache[base];
  };

  SkinAnim.VS_HEAD = [
    'uniform sampler2D uSkinTex; uniform vec4 uClips[32]; uniform float uSkinT; uniform float uFade;',
    'attribute vec4 aSkinI; attribute vec4 aSkinW; attribute vec4 iClip;',
    'mat4 skBone(float row, float b) {',
    '  int x = int(b) * 3, y = int(row);',
    '  vec4 r0 = texelFetch(uSkinTex, ivec2(x, y), 0), r1 = texelFetch(uSkinTex, ivec2(x + 1, y), 0), r2 = texelFetch(uSkinTex, ivec2(x + 2, y), 0);',
    '  return mat4(r0.x, r1.x, r2.x, 0.0, r0.y, r1.y, r2.y, 0.0, r0.z, r1.z, r2.z, 0.0, r0.w, r1.w, r2.w, 1.0);',
    '}',
    'mat4 skRow(float row) { return skBone(row, aSkinI.x) * aSkinW.x + skBone(row, aSkinI.y) * aSkinW.y + skBone(row, aSkinI.z) * aSkinW.z + skBone(row, aSkinI.w) * aSkinW.w; }',
    'mat4 skClip(float c, float t) {',
    '  vec4 ci = uClips[int(c)]; float f = max(t, 0.0) * ci.z, n = ci.y, f0, f1;',
    '  if (ci.w > 0.5) { f = mod(f, n); f0 = floor(f); f1 = mod(f0 + 1.0, n); } else { f = min(f, n - 1.0); f0 = floor(f); f1 = min(f0 + 1.0, n - 1.0); }',
    '  return skRow(ci.x + f0) * (1.0 - fract(f)) + skRow(ci.x + f1) * fract(f);',
    '}'
  ].join('\n');
  SkinAnim.VS_NORMAL = [
    '#include <beginnormal_vertex>',
    'float skBl = clamp((uSkinT - iClip.y) / uFade, 0.0, 1.0);',
    'mat4 skM = skClip(iClip.x, uSkinT - iClip.y);',
    'if (skBl < 1.0 && iClip.z >= 0.0) skM = skM * skBl + skClip(iClip.z, uSkinT - iClip.w) * (1.0 - skBl);',
    'objectNormal = normalize(mat3(skM) * objectNormal);'
  ].join('\n');
  SkinAnim.VS_POS = '#include <begin_vertex>\ntransformed = (skM * vec4(position, 1.0)).xyz;';

  // synchron: fertig geladen (oder null = noch nicht / false = fehlt)
  SkinAnim.cached = function (base) { return base in done ? done[base] : null; };
  // Material-Shader patchen (onBeforeCompile); depth = Schatten-Material (hat keinen Normalen-Teil)
  SkinAnim.patch = function (sh, A, depth) {
    sh.uniforms.uSkinTex = { value: A.tex }; sh.uniforms.uClips = { value: A.clips }; sh.uniforms.uSkinT = SkinAnim.time; sh.uniforms.uFade = { value: SkinAnim.FADE };
    var body = depth ? sh.vertexShader.replace('#include <begin_vertex>', SkinAnim.VS_NORMAL.replace('#include <beginnormal_vertex>', '').replace(/objectNormal = .*$/m, '') + '\n' + SkinAnim.VS_POS)
      : sh.vertexShader.replace('#include <beginnormal_vertex>', SkinAnim.VS_NORMAL).replace('#include <begin_vertex>', SkinAnim.VS_POS);
    sh.vertexShader = SkinAnim.VS_HEAD + '\n' + body;
  };

  // Soldat (Objekt mit userData.clip) einen Clip spielen lassen, mit Überblendung vom bisherigen
  SkinAnim.play = function (A, u, name, off) {
    var id = A.ids[name]; if (id == null) return;
    var now = SkinAnim.time.value, c = u.clip || (u.clip = [id, now, -1, 0]);
    if (c[0] === id && !off && A.meta.clips[name][2]) return;
    c[2] = c[0]; c[3] = c[1]; c[0] = id; c[1] = now - (off || 0);
  };
  window.SkinAnim = SkinAnim;
})();
