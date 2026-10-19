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
    return true;
  }
  var reverb, revGain;
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
      var t = t0(); noise(t, 0.16, 0.6, 'bandpass', 900, 1.1, 300);
      noise(t + 0.02, 0.3, 0.35, 'lowpass', 700, 0.8, 120, null, true);
      osc('sine', 85, t, 0.4, big ? 0.95 : 0.65, null, 38);
    },
    drop: function () { var t = t0(); noise(t, 0.35, 0.35, 'bandpass', 400, 4, 5000, null, true); for (var i = 0; i < 4; i++) osc('sine', note(i * 2 + 5), t + i * 0.05, 0.3, 0.1, null, null, true); setTimeout(S.tok, 300); },
    promote: function () { var t = t0(); for (var i = 0; i < 7; i++) { osc('sine', note(i + 5), t + i * 0.07, 0.8, 0.14, null, null, true); osc('sine', note(i + 5) * 3.01, t + i * 0.07, 0.3, 0.03, null, null, true); } noise(t, 0.6, 0.2, 'highpass', 3000, 1, 9000, null, true); },
    // Kampf: Klingen-Klirren, Luftzug, Magie/Schuss, Feuer, Zerbröseln der Statue
    // Hieb: kurzes Krachen von Stahl auf Rüstung/Holz, jedes Mal leicht anders, kein Nachklingen
    clash: function (v) {
      var t = t0(), k = v || 0.8, r = 0.75 + Math.random() * 0.5;
      noise(t, 0.05, 0.9 * k, 'bandpass', 1900 * r, 1.6); noise(t, 0.025, 0.4 * k, 'highpass', 5200 * r, 0.7);
      noise(t + 0.01, 0.09, 0.45 * k, 'bandpass', 520 * r, 1.2, 260); osc('sine', 120 * r, t, 0.08, 0.35 * k, null, 60);
    },
    // Schlachtruf der Armee: viele Stimmen „Uooo!“ (Sägezahn durch Vokal-Formanten), dazu Atemrauschen
    roar: function (v) {
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
    // Taiko-Schlag beim Aufprall der Linien
    taiko: function (v) { var t = t0(), k = v || 1; osc('sine', 78, t, 0.55, 1 * k, null, 42, true); noise(t, 0.12, 0.5 * k, 'lowpass', 380, 0.8, 120); noise(t, 0.02, 0.25 * k, 'bandpass', 2500, 1); },
    // Gemenge im Hintergrund: Klappern, Stampfen, Rufe, ein paar Sekunden
    melee: function (sec) {
      var t = t0(), n = Math.round((sec || 3) * 14);
      for (var i = 0; i < n; i++) { var u = t + Math.random() * (sec || 3), r = 0.7 + Math.random() * 0.6; noise(u, 0.04, 0.25 + Math.random() * 0.25, 'bandpass', 1600 * r, 1.4); if (Math.random() < 0.3) noise(u, 0.08, 0.3, 'lowpass', 300 * r, 0.8); }
      for (var j = 0; j < (sec || 3) * 1.5; j++) { var w = t + Math.random() * (sec || 3), f = 120 + Math.random() * 120; osc('sawtooth', f * 1.1, w, 0.25, 0.025, null, f * 0.75, true); }
      noise(t, sec || 3, 0.12, 'bandpass', 700, 0.5, 400, null, true);
    },
    whoosh: function () { var t = t0(); noise(t, 0.22, 0.35, 'bandpass', 500, 2, 2600); },
    zap: function () { var t = t0(); osc('sawtooth', 1400, t, 0.18, 0.12, null, 180, true); noise(t, 0.08, 0.3, 'highpass', 5000, 1); },
    fire: function () { var t = t0(); noise(t, 0.8, 0.5, 'lowpass', 900, 0.8, 300, null, true); osc('sine', 60, t, 0.7, 0.4, null, 40); },
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
    play: function (name, arg) { if (vol.mute || vol.sfx <= 0 || !ensure()) return; try { S[name] && S[name](arg); } catch (e) { } },
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
