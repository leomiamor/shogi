// Sound komplett synthetisch (WebAudio), keine Dateien nötig.
var Sfx = (function () {
  var ctx = null, master, sfxGain, musicGain, noiseBuf, musicOn = false, musicTimer = null, intensity = 0;
  var vol = { sfx: 0.8, music: 0.35 };
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 1;
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
    capture: function (big) {
      var t = t0(); noise(t, 0.18, 0.7, 'bandpass', 600, 1.2, 4000);
      osc('sawtooth', 220, t + 0.05, 0.25, 0.18, null, 80, true);
      [1, 2.76, 5.4].forEach(function (h) { osc('sine', 700 * h, t + 0.06, 0.4, 0.12 / h, null, null, true); });
      osc('sine', 70, t + 0.05, 0.35, big ? 0.9 : 0.6, null, 40);
    },
    drop: function () { var t = t0(); noise(t, 0.35, 0.35, 'bandpass', 400, 4, 5000, null, true); for (var i = 0; i < 4; i++) osc('sine', note(i * 2 + 5), t + i * 0.05, 0.3, 0.1, null, null, true); setTimeout(S.tok, 300); },
    promote: function () { var t = t0(); for (var i = 0; i < 7; i++) { osc('sine', note(i + 5), t + i * 0.07, 0.8, 0.14, null, null, true); osc('sine', note(i + 5) * 3.01, t + i * 0.07, 0.3, 0.03, null, null, true); } noise(t, 0.6, 0.2, 'highpass', 3000, 1, 9000, null, true); },
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
    play: function (name, arg) { if (!ensure() || vol.sfx <= 0) return; try { S[name] && S[name](arg); } catch (e) { } },
    music: function (on) {
      if (!ensure()) return; musicOn = on && vol.music > 0;
      clearTimeout(musicTimer);
      if (musicOn) { startDrone(); drone.g.gain.cancelScheduledValues(ctx.currentTime); drone.g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2); musicTick(); }
      else if (drone) { drone.g.gain.cancelScheduledValues(ctx.currentTime); drone.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1); }
    },
    setIntensity: function (x) { intensity = Math.max(0, Math.min(1, x)); },
    setVolume: function (sfx, music) { vol.sfx = sfx; vol.music = music; if (ctx) { sfxGain.gain.value = sfx; musicGain.gain.value = music; } }
  };
})();
