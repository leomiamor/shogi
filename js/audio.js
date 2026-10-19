// Sound komplett synthetisch (WebAudio), keine Dateien nötig.
var Sfx = (function () {
  var ctx = null, master, sfxGain, musicGain, noiseBuf, musicOn = false, musicTimer = null, intensity = 0;
  var vol = { sfx: 0.8, music: 0.35, mute: false }, wantMusic = false;
  // weich nachregeln statt springen (kein Knacksen beim Ziehen)
  function ramp(g, v) { var t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(v, t, 0.04); }
  function masterLevel() { return vol.mute || document.hidden ? 0 : 1; }
  // Tab im Hintergrund oder Handy gesperrt: Ton aus
  document.addEventListener('visibilitychange', function () { if (ctx) ramp(master, masterLevel()); });
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = masterLevel();
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = vol.sfx; sfxGain.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = vol.music; musicGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // kleiner Hall
    reverb = ctx.createConvolver(); var len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var ch = ir.getChannelData(c); for (i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    reverb.buffer = ir; revGain = ctx.createGain(); revGain.gain.value = 0.25; reverb.connect(revGain); revGain.connect(master);
    loadSamples();
    return true;
  }
  var reverb, revGain;
  // Echte Kampfklänge (CC0, snd/credits.txt) statt Synthesizer. Wie in Strategiespielen:
  // Varianten, Tonhöhe ±8 %, nie zweimal dieselbe, Mindestabstand je Art, höchstens 6 gleichzeitig, Schlacht-Teppich als Loop.
  var SMP = { clash: 3, hit: 2, cry: 2, impact: 0, drum: 0, fall: 0, whoosh: 0, cheer: 0, bed: 0 }, buf = {}, lastVar = {}, lastAt = {}, voices = 0, bedSrc = null, bedGain = null, bedTimer = null;
  var GAP = { clash: 70, hit: 70, fall: 110, whoosh: 90, cry: 400, impact: 120, drum: 120, cheer: 1500, yip: 220, snarl: 160, foxcry: 500, yelp: 260, horn: 20000,
    thrust: 90, stab: 90, slash: 90, cut: 90, kiai: 300, warcry: 600, die: 230, ofuda: 140, wing: 160, caw: 280, stag: 500, snort: 300, dragon: 900, dgrowl: 250, flame: 400 };
  // Klänge je Truppentyp (nur Feudal): Waffe, Stimme, Kreatur, Laufen. Sets laden erst, wenn der Typ zum ersten Mal klingt (Handy).
  var XS = { yip: 3, foxcry: 2, snarl: 3, yelp: 3, paws: 0, horn: 0, thrust: 3, stab: 2, slash: 4, cut: 2, kiai: 4, warcry: 2, die: 5, march: 0, ofuda: 3, wing: 3, caw: 3, flap: 0,
    stag: 3, snort: 2, hooves: 0, dragon: 2, dgrowl: 2, flame: 0 }, loaded = {};
  var KIND = { 1: 'speer', 2: 'speer', 5: 'speer', 9: 'speer', 10: 'speer', 4: 'schwert', 8: 'schwert', 12: 'schwert', 3: 'fuchs', 11: 'fuchs', 6: 'ofuda', 7: 'tengu', 13: 'hirsch', 14: 'drache' };
  // Ereignis -> [Sample, Lautstärke, Tonhöhe]: swing Ausholen/Sprung, hit Treffer, parry Parade, shout Zwischenruf beim Treffer, cry Schlachtruf (pack = mehrstimmig),
  // die Sterbelaut, mag Fernangriff, step Laufen (Loop). Fehlt ein Eintrag, klingt der allgemeine Kampfklang.
  var VOX = {
    speer: { swing: ['thrust', 0.6], hit: ['stab', 0.7], shout: ['kiai', 0.4], cry: ['warcry', 0.9], die: ['die', 0.45], step: ['march', 1.1] },
    schwert: { swing: ['slash', 0.6], hit: ['cut', 0.65], shout: ['kiai', 0.45], cry: ['cry', 0.9], also: ['kiai', 0.6], die: ['die', 0.45], step: ['march', 1.1, 0.9] },
    ofuda: { mag: ['ofuda', 0.7], hit: ['ofuda', 0.4], shout: ['kiai', 0.35], cry: ['ofuda', 0.8], also: ['kiai', 0.5], die: ['die', 0.45], step: ['march', 0.9, 1.05] },
    fuchs: { swing: ['yip', 0.45], hit: ['snarl', 0.6], parry: ['snarl', 0.45], shout: ['yip', 0.35], cry: ['foxcry', 0.75], pack: 3, die: ['yelp', 0.5], step: ['paws', 1.6] },
    tengu: { swing: ['wing', 0.55], shout: ['caw', 0.35], cry: ['caw', 0.75], pack: 3, also: ['wing', 0.6], die: ['caw', 0.45, 0.85], step: ['flap', 1, 0.9] },
    hirsch: { swing: ['snort', 0.5], shout: ['snort', 0.35], cry: ['stag', 0.85], die: ['stag', 0.4, 1.2], step: ['hooves', 1.2] },
    drache: { swing: ['wing', 0.6, 0.6], hit: ['dgrowl', 0.6], shout: ['dgrowl', 0.4], cry: ['dragon', 0.9], die: ['dragon', 0.6, 0.8], mag: ['flame', 0.8], step: ['flap', 1.3, 0.55] }
  };
  function load(k, n) {
    if (loaded[k]) return; loaded[k] = true;
    (n ? Array.from({ length: n }, function (_, i) { return k + (i + 1); }) : [k]).forEach(function (f) {
      fetch('snd/' + f + '.mp3').then(function (r) { if (!r.ok) throw r.status; return r.arrayBuffer(); }).then(function (a) { return new Promise(function (ok, no) { ctx.decodeAudioData(a, ok, no); }); })
        .then(function (b) { (buf[k] = buf[k] || []).push(b); }).catch(function () { });
    });
  }
  function loadSamples() {
    if (loadSamples.done) return; loadSamples.done = true;
    Object.keys(SMP).forEach(function (k) { load(k, SMP[k]); });
  }
  // Eintrag für Typ t und Ereignis ev (lädt das Set des Typs nach)
  function vx(t, ev) {
    var kd = t && KIND[t], v = kd && VOX[kd]; if (!v) return null;
    if (!v._ld) { v._ld = true; load('horn', 0); Object.keys(v).forEach(function (e) { var s = v[e]; if (s && s.length && XS[s[0]] != null) load(s[0], XS[s[0]]); }); }
    return v[ev] || null;
  }
  function vplay(t, ev, k, opt) { var e = vx(t, ev); if (!e) return false; opt = opt || {}; opt.rate = (opt.rate || 1) * (e[2] || 1); return smp(e[0], e[1] * (k == null ? 1 : k), opt); }
  function has(k) { return buf[k] && buf[k].length; }
  function smp(k, v, opt) {
    if (!has(k)) return false; opt = opt || {};
    var now = ctx.currentTime * 1000; if (!opt.nogap && lastAt[k] && now - lastAt[k] < (GAP[k] || 60)) return true; if (voices >= 6 && !opt.force) return true; lastAt[k] = now;
    var list = buf[k], i = Math.floor(Math.random() * list.length); if (list.length > 1 && i === lastVar[k]) i = (i + 1) % list.length; lastVar[k] = i;
    var src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = list[i];
    src.playbackRate.value = (opt.rate || 1) * (0.92 + Math.random() * 0.16); g.gain.value = (v == null ? 0.8 : v) * (0.75 + Math.random() * 0.25);
    src.connect(g); g.connect(sfxGain); if (opt.wet) g.connect(reverb);
    voices++; src.onended = function () { voices--; }; src.start(ctx.currentTime + 0.005 + (opt.delay || 0)); return true;
  }
  var stepSrc = null, stepG = null;
  function stepStop(f) { if (!stepSrc) return; var t = ctx.currentTime; stepG.gain.cancelScheduledValues(t); stepG.gain.setTargetAtTime(0.0001, t, f / 3); stepSrc.stop(t + f + 0.05); stepSrc = null; }
  function stepLoop(k, ms, v, rate) {
    if (!has(k)) return; stepStop(0.08);
    var b = buf[k][0], src = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime, d = Math.max(0.3, ms / 1000);
    src.buffer = b; src.loop = true; src.playbackRate.value = (rate || 1) * (0.95 + Math.random() * 0.1);
    g.gain.setValueAtTime(0.0001, t); g.gain.setTargetAtTime(v, t, 0.08); g.gain.setTargetAtTime(0.0001, t + d - 0.25, 0.08);
    src.connect(g); g.connect(sfxGain); src.start(t, Math.random() * b.duration); src.stop(t + d + 0.3); stepSrc = src; stepG = g;
  }
  // Teppich kurz absenken (Schrei, Aufprall)
  function duck(ms) { if (!bedGain) return; var t = ctx.currentTime; bedGain.gain.cancelScheduledValues(t); bedGain.gain.setTargetAtTime(bedGain._lvl * 0.55, t, 0.03); bedGain.gain.setTargetAtTime(bedGain._lvl, t + ms / 1000, 0.15); }
  function bedStop(fade) {
    if (bedTimer) { clearTimeout(bedTimer); bedTimer = null; } if (!bedSrc) return;
    var t = ctx.currentTime, s0 = bedSrc; bedGain.gain.cancelScheduledValues(t); bedGain.gain.setTargetAtTime(0.0001, t, (fade || 0.6) / 3); s0.stop(t + (fade || 0.6) + 0.1); bedSrc = null;
  }
  function t0() { return ctx.currentTime + 0.005; }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function osc(type, f, t, dur, peak, out, f2, wet) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, 0.004, peak, dur); o.connect(g); g.connect(out || sfxGain); if (wet) g.connect(reverb);
    o.start(t); o.stop(t + dur + 0.05); return o;
  }
  function noise(t, dur, peak, type, f, q, f2, out, wet) {
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(f || 1500, t); fl.Q.value = q || 1;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, 0.003, peak, dur); s.connect(fl); fl.connect(g); g.connect(out || sfxGain); if (wet) g.connect(reverb);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  var IN = [0, 1, 5, 7, 8]; // Miyako-bushi / In-Skala
  function note(deg, base) { var o = Math.floor(deg / 5), i = ((deg % 5) + 5) % 5; return (base || 293.66) * Math.pow(2, o + IN[i] / 12); }

  var S = {
    tok: function () { var t = t0(); noise(t, 0.05, 0.9, 'bandpass', 2200, 3); osc('sine', 520, t, 0.08, 0.5, null, 260); osc('sine', 130, t, 0.12, 0.35, null, 90); },
    select: function () { var t = t0(); osc('triangle', 880, t, 0.06, 0.12); },
    hover: function () { var t = t0(); osc('sine', 1400, t, 0.03, 0.04); },
    ui: function () { var t = t0(); osc('triangle', 660, t, 0.05, 0.12); osc('triangle', 990, t + 0.03, 0.05, 0.08); },
    error: function () { var t = t0(); osc('square', 140, t, 0.12, 0.08); osc('square', 110, t + 0.08, 0.14, 0.08); },
    // Schlagen: dumpfer Einschlag mit Knirschen, ohne Glocken-Obertöne (klang wie „Ding“)
    capture: function (big) {
      if (smp('impact', big ? 1 : 0.8, { force: true })) return;
      var t = t0(); noise(t, 0.16, 0.6, 'bandpass', 900, 1.1, 300);
      noise(t + 0.02, 0.3, 0.35, 'lowpass', 700, 0.8, 120, null, true);
      osc('sine', 85, t, 0.4, big ? 0.95 : 0.65, null, 38);
    },
    drop: function () { var t = t0(); noise(t, 0.35, 0.35, 'bandpass', 400, 4, 5000, null, true); for (var i = 0; i < 4; i++) osc('sine', note(i * 2 + 5), t + i * 0.05, 0.3, 0.1, null, null, true); setTimeout(S.tok, 300); },
    promote: function () { var t = t0(); for (var i = 0; i < 7; i++) { osc('sine', note(i + 5), t + i * 0.07, 0.8, 0.14, null, null, true); osc('sine', note(i + 5) * 3.01, t + i * 0.07, 0.3, 0.03, null, null, true); } noise(t, 0.6, 0.2, 'highpass', 3000, 1, 9000, null, true); },
    // Kampf: Klingen-Klirren, Luftzug, Magie/Schuss, Feuer, Zerbröseln der Statue
    // Hieb: kurzes Krachen von Stahl auf Rüstung/Holz, jedes Mal leicht anders, kein Nachklingen
    clash: function (v, t) {
      if (t && vplay(t, 'parry', v || 0.8)) return;
      if (smp('clash', (v || 0.8) * 0.9)) return;
      var t = t0(), k = v || 0.8, r = 0.75 + Math.random() * 0.5;
      noise(t, 0.05, 0.9 * k, 'bandpass', 1900 * r, 1.6); noise(t, 0.025, 0.4 * k, 'highpass', 5200 * r, 0.7);
      noise(t + 0.01, 0.09, 0.45 * k, 'bandpass', 520 * r, 1.2, 260); osc('sine', 120 * r, t, 0.08, 0.35 * k, null, 60);
    },
    // Schlachtruf der Armee: viele Stimmen „Uooo!“ (Sägezahn durch Vokal-Formanten), dazu Atemrauschen
    roar: function (v, t) {
      var e = t && vx(t, 'cry');
      if (e && has(e[0])) { for (var j = 0, n = VOX[KIND[t]].pack || 1; j < n; j++) smp(e[0], e[1] * (v || 1) * (j ? 0.6 : 1), { force: true, nogap: j > 0, wet: true, delay: j * (0.08 + Math.random() * 0.14) }); if (VOX[KIND[t]].also) vplay(t, 'also', v, { force: true, nogap: true, delay: 0.25 }); duck(500); return; }
      if (smp('cry', v || 1, { force: true, wet: true })) { duck(500); return; }
      var t = t0(), k = v || 1;
      for (var i = 0; i < 9; i++) {
        var f = 95 + Math.random() * 110, d = 0.9 + Math.random() * 0.5, st = t + Math.random() * 0.18;
        var o = ctx.createOscillator(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain(), g2 = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.92, st); o.frequency.linearRampToValueAtTime(f * 1.06, st + 0.25); o.frequency.exponentialRampToValueAtTime(f * 0.8, st + d);
        f1.type = 'bandpass'; f1.frequency.value = 520 + Math.random() * 160; f1.Q.value = 4; f2.type = 'bandpass'; f2.frequency.value = 900 + Math.random() * 250; f2.Q.value = 5;
        g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.09 * k, st + 0.12); g.gain.setValueAtTime(0.09 * k, st + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, st + d);
        g2.gain.value = 0.6; o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g2); g2.connect(g); g.connect(sfxGain); g.connect(reverb);
        o.start(st); o.stop(st + d + 0.05);
      }
      noise(t, 1.1, 0.25 * k, 'bandpass', 800, 0.7, 500, null, true);
    },
    hit: function (v, t) {
      if (t && vplay(t, 'hit', v || 0.7)) { if (Math.random() < 0.4) smp('hit', (v || 0.7) * 0.45); if (Math.random() < 0.2) vplay(t, 'shout'); return; }
      if (!smp('hit', v || 0.7)) S.clash(v);
    },
    fall: function (v, t) { smp('fall', v || 0.6); if (t && Math.random() < 0.55) vplay(t, 'die', v ? 0.6 + v * 0.5 : 1, { force: true }); },
    // Laufen je Typ (Schritte, Pfoten, Hufe, Flügel) als Loop über die Zugdauer
    march: function (ms, t) { var e = vx(t, 'step'); if (e) stepLoop(e[0], ms, e[1], e[2]); },
    // Horagai (Muschelhorn) zum Schlachtbeginn, höchstens alle 20 s
    horn: function (v, t) { vx(t, 'cry'); smp('horn', v || 0.7, { force: true, wet: true }); },
    cheer: function (v) { bedStop(1.2); smp('cheer', v || 0.8, { force: true, wet: true }); },
    bedStop: function () { bedStop(0.8); },
    // Taiko-Schlag beim Aufprall der Linien
    taiko: function (v) { if (smp('drum', v || 1, { force: true, wet: true })) { smp('impact', (v || 1) * 0.8, { force: true }); duck(300); return; } var t = t0(), k = v || 1; osc('sine', 78, t, 0.55, 1 * k, null, 42, true); noise(t, 0.12, 0.5 * k, 'lowpass', 380, 0.8, 120); noise(t, 0.02, 0.25 * k, 'bandpass', 2500, 1); },
    // Gemenge im Hintergrund: Klappern, Stampfen, Rufe, ein paar Sekunden
    melee: function (sec) {
      if (has('bed')) {
        bedStop(0.2); var src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf.bed[0]; src.loop = true; g._lvl = 0.7;
        g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.setTargetAtTime(g._lvl, ctx.currentTime, 0.12); src.connect(g); g.connect(sfxGain);
        src.start(ctx.currentTime, Math.random() * 6); bedSrc = src; bedGain = g; bedTimer = setTimeout(function () { bedStop(0.8); }, (sec || 3) * 1000); return;
      }
      var t = t0(), n = Math.round((sec || 3) * 14);
      for (var i = 0; i < n; i++) { var u = t + Math.random() * (sec || 3), r = 0.7 + Math.random() * 0.6; noise(u, 0.04, 0.25 + Math.random() * 0.25, 'bandpass', 1600 * r, 1.4); if (Math.random() < 0.3) noise(u, 0.08, 0.3, 'lowpass', 300 * r, 0.8); }
      for (var j = 0; j < (sec || 3) * 1.5; j++) { var w = t + Math.random() * (sec || 3), f = 120 + Math.random() * 120; osc('sawtooth', f * 1.1, w, 0.25, 0.025, null, f * 0.75, true); }
      noise(t, sec || 3, 0.12, 'bandpass', 700, 0.5, 400, null, true);
    },
    whoosh: function (v, t) { if (t && vplay(t, 'swing', v ? v * 1.6 : 1)) return; if (smp('whoosh', (v || 0.6) * 0.8)) return; var t = t0(); noise(t, 0.22, 0.35, 'bandpass', 500, 2, 2600); },
    zap: function (v, k) { if (k && vplay(k, 'mag', v ? v * 1.6 : 1, { wet: true })) return; var t = t0(); osc('sawtooth', 1400, t, 0.18, 0.12, null, 180, true); noise(t, 0.08, 0.3, 'highpass', 5000, 1); },
    fire: function (v, k) { if (k && vplay(k, 'mag', 1, { force: true, wet: true })) { vplay(k, 'cry', 0.8, { force: true, delay: 0.05 }); return; } var t = t0(); noise(t, 0.8, 0.5, 'lowpass', 900, 0.8, 300, null, true); osc('sine', 60, t, 0.7, 0.4, null, 40); },
    crumble: function () { var t = t0(); noise(t, 0.6, 0.6, 'lowpass', 1800, 0.7, 200, null, true); for (var i = 0; i < 5; i++) noise(t + i * 0.06 + Math.random() * 0.04, 0.05, 0.4, 'bandpass', 1500 + Math.random() * 2000, 4); },
    check: function () { var t = t0(); osc('sine', 90, t, 0.5, 1, null, 45, true); noise(t, 0.12, 0.5, 'lowpass', 400, 1); osc('sine', 90, t + 0.22, 0.45, 0.8, null, 45, true); },
    win: function () { var t = t0(); [0, 2, 4, 5, 7, 9, 10].forEach(function (d, i) { osc('triangle', note(d + 5), t + i * 0.12, 0.9, 0.18, null, null, true); }); for (var i = 0; i < 6; i++) osc('sine', 80, t + i * 0.15, 0.3, 0.6, null, 50); },
    lose: function () { var t = t0(); [1, 2.4, 3.8, 5.1].forEach(function (h) { osc('sine', 98 * h, t, 3, 0.25 / h, null, null, true); }); },
    levelup: function () { var t = t0(); [5, 7, 9, 10, 12].forEach(function (d, i) { osc('square', note(d), t + i * 0.08, 0.25, 0.06); osc('sine', note(d), t + i * 0.08, 0.7, 0.15, null, null, true); }); },
    star: function (i) { var t = t0(); osc('sine', note(7 + i * 2), t, 0.5, 0.2, null, null, true); osc('sine', note(7 + i * 2) * 2, t, 0.3, 0.06, null, null, true); },
    grade: function (g) { var t = t0(); if (g >= 3) { osc('sine', note(10), t, 0.4, 0.15, null, null, true); osc('sine', note(12), t + 0.08, 0.5, 0.15, null, null, true); } else if (g <= 1) { osc('triangle', 220, t, 0.3, 0.12, null, 150); } }
  };

  function musicTick() {
    if (!musicOn || !ctx) return;
    var t = t0(), base = 146.83;
    // Koto-Zupfen: Dreieck mit schnellem Abklingen
    var deg = Math.floor(Math.random() * 8);
    var g = ctx.createGain(), o = ctx.createOscillator(), o2 = ctx.createOscillator();
    o.type = 'triangle'; o2.type = 'sine'; var f = note(deg, base * 2); o.frequency.value = f; o2.frequency.value = f * 2.01;
    env(g, t, 0.003, 0.22, 1.6); o.connect(g); o2.connect(g); g.connect(musicGain); g.connect(reverb);
    o.start(t); o2.start(t); o.stop(t + 1.8); o2.stop(t + 1.8);
    if (Math.random() < 0.35) { var o3 = ctx.createOscillator(), g3 = ctx.createGain(); o3.type = 'triangle'; o3.frequency.value = note(deg - 3, base * 2); env(g3, t + 0.18, 0.003, 0.12, 1.2); o3.connect(g3); g3.connect(musicGain); g3.connect(reverb); o3.start(t + 0.18); o3.stop(t + 1.6); }
    // Taiko bei Spannung
    if (intensity > 0 && Math.random() < 0.25 + intensity * 0.5) { var gt = ctx.createGain(), ot = ctx.createOscillator(); ot.frequency.setValueAtTime(110, t); ot.frequency.exponentialRampToValueAtTime(48, t + 0.4); env(gt, t, 0.003, 0.35 * intensity + 0.1, 0.45); ot.connect(gt); gt.connect(musicGain); ot.start(t); ot.stop(t + 0.5); }
    var gap = intensity > 0.5 ? 380 : 650 + Math.random() * 700;
    musicTimer = setTimeout(musicTick, gap);
  }
  var drone = null;
  function startDrone() {
    if (drone) return;
    var g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 3);
    var a = ctx.createOscillator(), b = ctx.createOscillator(), lp = ctx.createBiquadFilter();
    a.type = 'sawtooth'; b.type = 'sawtooth'; a.frequency.value = 73.42; b.frequency.value = 73.42 * 1.498; b.detune.value = 6;
    lp.type = 'lowpass'; lp.frequency.value = 380; a.connect(lp); b.connect(lp); lp.connect(g); g.connect(musicGain); g.connect(reverb);
    a.start(); b.start(); drone = { g: g, a: a, b: b };
  }
  return {
    unlock: ensure,
    // type: Truppentyp 1–14 (Feudal) für eigene Klänge, sonst allgemein
    play: function (name, arg, type) { if (vol.mute || vol.sfx <= 0 || !ensure()) return; try { S[name] && S[name](arg, type); } catch (e) { } },
    music: function (on) {
      wantMusic = on; if (!ensure()) return; musicOn = on && vol.music > 0;
      clearTimeout(musicTimer);
      if (musicOn) { startDrone(); drone.g.gain.cancelScheduledValues(ctx.currentTime); drone.g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2); musicTick(); }
      else if (drone) { drone.g.gain.cancelScheduledValues(ctx.currentTime); drone.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1); }
    },
    setIntensity: function (x) { intensity = Math.max(0, Math.min(1, x)); },
    setVolume: function (sfx, music, mute) {
      var wasOn = vol.music > 0; vol.sfx = sfx; vol.music = music; vol.mute = !!mute;
      if (!ctx) return;
      ramp(sfxGain, sfx); ramp(musicGain, music); ramp(master, masterLevel());
      if (wantMusic && wasOn !== music > 0) this.music(true); // Musik von 0 hochgezogen oder auf 0 gestellt
    }
  };
})();
