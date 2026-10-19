// Bedienklänge synthetisch (WebAudio), Kampf und Musik aus Aufnahmen (snd/, CC0).
var Sfx = (function () {
  var ctx = null, master, sfxGain, musicGain, noiseBuf, intensity = 0;
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
    // Kampf-Bus: nah trocken und hell, aus der Übersicht dumpf und hallig (Tiefpass, leiser, mehr Hall); ferner Bus für Schreie/Krähen
    busF = ctx.createBiquadFilter(); busF.type = 'lowpass'; busF.frequency.value = 20000; busF.Q.value = 0.5; bus = ctx.createGain(); busF.connect(bus); bus.connect(sfxGain);
    busRev = ctx.createGain(); busRev.gain.value = 0.15; busF.connect(busRev); busRev.connect(reverb);
    far = ctx.createBiquadFilter(); far.type = 'lowpass'; far.frequency.value = 900; var fg = ctx.createGain(); fg.gain.value = 0.7; far.connect(fg); fg.connect(sfxGain); var fr = ctx.createGain(); fr.gain.value = 0.9; far.connect(fr); fr.connect(reverb);
    ambBus = ctx.createGain(); ambBus.gain.value = 0.5; ambBus.connect(sfxGain);
    loadSamples(); ambTick();
    return true;
  }
  var reverb, revGain, busF, busRev, bus, far, ambBus;
  // Echte Kampfklänge (CC0, snd/credits.txt) statt Synthesizer. Wie in Strategiespielen:
  // Varianten, Tonhöhe ±8 %, nie zweimal dieselbe, Mindestabstand je Art, höchstens 6 gleichzeitig, Schlacht-Teppich als Loop.
  var SMP = { clash: 3, hit: 2, cry: 3, impact: 0, drum: 2, fall: 0, whoosh: 0, cheer: 0, bed: 0, wood: 3, body: 3 }, buf = {}, lastVar = {}, lastAt = {}, voices = 0, bedSrc = null, bedGain = null, bedTimer = null;
  var GAP = { clash: 70, hit: 70, fall: 110, whoosh: 90, cry: 400, impact: 120, drum: 120, cheer: 1500, wood: 80, body: 80, thunder: 3000, yip: 220, snarl: 160, foxcry: 500, yelp: 260, horn: 20000,
    thrust: 90, stab: 90, slash: 90, cut: 90, kiai: 300, warcry: 600, die: 230, ofuda: 140, wing: 160, caw: 280, stag: 500, snort: 300, dragon: 900, dgrowl: 250, flame: 400 };
  // Klänge je Truppentyp (nur Feudal): Waffe, Stimme, Kreatur, Laufen. Sets laden erst, wenn der Typ zum ersten Mal klingt (Handy).
  var XS = { yip: 3, foxcry: 2, snarl: 3, yelp: 3, paws: 0, horn: 0, thrust: 3, stab: 2, slash: 4, cut: 2, kiai: 6, warcry: 3, die: 8, thunder: 2, march: 0, ofuda: 3, wing: 3, caw: 3, flap: 0,
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
  // Editionen: Feudal ist die Grundlage. Die anderen haben eigene Typ-Arten (kind), leiten allgemeine Kampfklänge um (remap, null = still)
  // und bringen eigene Musik mit (calm/mid/hi = ruhig, Spannung, Kampf; Loops mit Überblendung). Sets laden erst beim ersten Gebrauch.
  var ED = {
    hunde: {
      kind: { 1: 'klein', 3: 'klein', 9: 'klein', 11: 'klein', 2: 'mittel', 4: 'mittel', 5: 'mittel', 6: 'mittel', 8: 'mittel', 10: 'mittel', 12: 'mittel', 7: 'husky', 13: 'gross', 14: 'gross' },
      // kein Blut, keine Sterbeschreie: Treffer = Knurren/Schnappen, Sturz = Winseln, Jubel = Bellchor, Schlachtbeginn = Heulen
      remap: { clash: 'dg_snap', hit: 'dg_growl', impact: 'dg_growl', fall: 'dg_whine', cry: 'dg_chorus', cheer: 'dg_chorus', bed: 'dg_bed', horn: 'dg_howl', drum: null, wood: null, body: null, die: 'dg_whine', kiai: 'dg_mid', warcry: 'dg_chorus' },
      music: ['mus_dg1', 'mus_dg2', 'mus_dg3']
    },
    mecha: {
      kind: { 1: 'droide', 9: 'droide', 2: 'rail', 10: 'rail', 3: 'sprung', 11: 'sprung', 4: 'duell', 8: 'duell', 12: 'duell', 5: 'schild', 6: 'psi', 7: 'gunship', 13: 'laeufer', 14: 'mdrache' },
      // Funksprüche statt Kampfrufe, Metall statt Fleisch, Explosion statt Taiko, Alarm statt Muschelhorn
      remap: { clash: 'mc_metal', hit: 'mc_metal', impact: 'mc_boom', fall: 'mc_metal', cry: 'mc_radio', warcry: 'mc_radio', kiai: null, die: 'mc_down', cheer: 'mc_vic', horn: 'mc_alarm', drum: 'mc_boom', wood: null, body: null, bed: 'mc_bed', whoosh: 'mc_servo', zap: 'mc_laser', fire: 'mc_boom', crumble: 'mc_metal' },
      music: ['mus_mc1', 'mus_mc2', 'mus_mc3']
    },
    fantasy: {
      kind: { 1: 'ritter', 5: 'ritter', 8: 'ritter', 9: 'ritter', 2: 'pike', 10: 'pike', 4: 'zwerg', 12: 'zwerg', 3: 'greif', 11: 'greif', 6: 'magier', 7: 'golem', 13: 'einhorn', 14: 'drache' },
      // Rufe englisch im Warhammer-Stil, Stahl auf Stahl, Schilde, Pauke statt Taiko, Kriegshorn
      remap: { clash: 'fa_clash', cry: 'fa_cry', warcry: 'fa_warcry', kiai: 'fa_shout', die: 'fa_die', cheer: 'fa_cheer', horn: 'fa_horn', drum: 'fa_drum', wood: 'fa_shield', bed: 'fa_bed', zap: 'fa_magic', crumble: 'fa_rock' },
      music: ['mus_fa1', 'mus_fa2', 'mus_fa3']
    }
  };
  var FILE = { fa_die: 'die' }; // Sets, die vorhandene Dateien nutzen (die1–5: echte Schreie ohne Sprache)
  Object.assign(XS, { mc_laser: 3, mc_rail: 2, mc_blade: 3, mc_metal: 3, mc_servo: 3, mc_step: 0, mc_heavy: 0, mc_jet: 2, mc_boom: 3, mc_down: 3, mc_alarm: 0, mc_rotor: 0, mc_roar: 2, mc_zap: 2,
    mc_radio: 6, mc_lost: 3, mc_vic: 2, mc_bed: 0, fa_clash: 3, fa_shield: 2, fa_axe: 2, fa_magic: 3, fa_griff: 3, fa_rock: 2, fa_golem: 0, fa_neigh: 2, fa_chime: 0, fa_horn: 0, fa_drum: 0,
    fa_warcry: 3, fa_cry: 4, fa_shout: 5, fa_cheer: 0, fa_bed: 0, fa_die: 5 });
  Object.assign(GAP, { mc_laser: 70, mc_rail: 400, mc_metal: 90, mc_servo: 150, mc_jet: 400, mc_boom: 350, mc_down: 300, mc_radio: 1800, mc_lost: 2500, mc_roar: 1500, mc_zap: 80,
    fa_clash: 80, fa_shield: 120, fa_axe: 100, fa_magic: 200, fa_griff: 1200, fa_rock: 250, fa_golem: 600, fa_neigh: 1500, fa_chime: 1500, fa_drum: 250, fa_warcry: 700, fa_cry: 1500, fa_shout: 250, fa_die: 250 });
  // Mecha: Servos, Hydraulik, Schritte; Laser, Railgun, Energieklinge; Funk bei Angriff und Ausfall
  Object.assign(VOX, {
    droide: { swing: ['mc_servo', 0.45], hit: ['mc_metal', 0.6], mag: ['mc_laser', 0.6], shout: ['mc_radio', 0.35], cry: ['mc_radio', 0.75], die: ['mc_down', 0.5], step: ['mc_step', 1.1] },
    rail: { swing: ['mc_servo', 0.45], hit: ['mc_metal', 0.65], mag: ['mc_rail', 0.7], shout: ['mc_radio', 0.35], cry: ['mc_radio', 0.75], die: ['mc_lost', 0.55], step: ['mc_step', 1.1, 0.95] },
    sprung: { swing: ['mc_jet', 0.6], hit: ['mc_metal', 0.6], shout: ['mc_radio', 0.35], cry: ['mc_radio', 0.75], also: ['mc_jet', 0.6], die: ['mc_down', 0.5], step: ['mc_step', 1.1, 1.08] },
    duell: { swing: ['mc_blade', 0.6], hit: ['mc_metal', 0.65], parry: ['mc_blade', 0.5, 0.9], shout: ['mc_radio', 0.35], cry: ['mc_radio', 0.75], die: ['mc_lost', 0.55], step: ['mc_step', 1.1, 0.95] },
    schild: { swing: ['mc_servo', 0.5, 0.85], hit: ['mc_metal', 0.7, 0.8], parry: ['mc_metal', 0.6, 0.75], shout: ['mc_radio', 0.35], cry: ['mc_radio', 0.75], die: ['mc_down', 0.55, 0.85], step: ['mc_heavy', 1.2] },
    psi: { mag: ['mc_zap', 0.6], hit: ['mc_zap', 0.4], shout: ['mc_radio', 0.3], cry: ['mc_radio', 0.7], die: ['mc_down', 0.45, 1.15], step: ['mc_step', 0.9, 1.1] },
    gunship: { swing: ['mc_jet', 0.5, 0.8], mag: ['mc_laser', 0.6, 0.75], hit: ['mc_boom', 0.6], shout: ['mc_radio', 0.3], cry: ['mc_radio', 0.75], die: ['mc_boom', 0.7], step: ['mc_rotor', 0.9] },
    laeufer: { swing: ['mc_servo', 0.6, 0.75], mag: ['mc_rail', 0.7, 0.8], hit: ['mc_metal', 0.7, 0.7], shout: ['mc_servo', 0.4, 0.7], cry: ['mc_alarm', 0.5], die: ['mc_boom', 0.7, 0.85], step: ['mc_heavy', 1.4, 0.9] },
    mdrache: { swing: ['mc_jet', 0.6, 0.8], hit: ['mc_metal', 0.7, 0.7], shout: ['mc_roar', 0.4], cry: ['mc_roar', 0.9], die: ['mc_roar', 0.6, 0.75], mag: ['flame', 0.8], step: ['mc_heavy', 1.4, 0.8] },
    // Fantasy: Ritter und Pikeniere mit Stahl, Zwerge tiefer, Greif und Einhorn als Kreaturen, Golem aus Stein
    ritter: { swing: ['slash', 0.6], hit: ['cut', 0.65], parry: ['fa_clash', 0.55], shout: ['fa_shout', 0.4], cry: ['fa_cry', 0.85], die: ['fa_die', 0.45], step: ['march', 1.1, 0.95] },
    pike: { swing: ['thrust', 0.6], hit: ['stab', 0.7], parry: ['fa_shield', 0.5], shout: ['fa_shout', 0.4], cry: ['fa_warcry', 0.9], pack: 2, die: ['fa_die', 0.45], step: ['march', 1.1] },
    zwerg: { swing: ['fa_axe', 0.6], hit: ['fa_axe', 0.6, 0.85], parry: ['fa_shield', 0.55, 0.85], shout: ['fa_shout', 0.45, 0.8], cry: ['fa_cry', 0.85, 0.85], die: ['fa_die', 0.45, 0.8], step: ['march', 1.1, 0.85] },
    magier: { mag: ['fa_magic', 0.7], hit: ['fa_magic', 0.4], shout: ['fa_shout', 0.35], cry: ['fa_cry', 0.8], also: ['fa_chime', 0.4], die: ['fa_die', 0.45], step: ['march', 0.9, 1.05] },
    greif: { swing: ['wing', 0.55], hit: ['fa_griff', 0.4, 1.1], shout: ['fa_griff', 0.35, 1.1], cry: ['fa_griff', 0.85], also: ['wing', 0.6], die: ['fa_griff', 0.45, 0.8], step: ['flap', 1, 0.9] },
    golem: { swing: ['fa_rock', 0.6], hit: ['fa_rock', 0.65], shout: ['fa_golem', 0.5], cry: ['fa_golem', 0.9], also: ['fa_rock', 0.6], die: ['fa_rock', 0.6, 0.8], step: ['mc_heavy', 1.3, 0.85] },
    einhorn: { swing: ['snort', 0.5], shout: ['fa_neigh', 0.35], cry: ['fa_neigh', 0.85], also: ['fa_chime', 0.5], die: ['fa_neigh', 0.45, 0.85], step: ['hooves', 1.2] }
  });
  Object.assign(XS, { dg_small: 3, dg_mid: 3, dg_big: 3, dg_howl: 2, dg_growl: 3, dg_whine: 3, dg_snap: 0, dg_squeak: 0, dg_chorus: 0, dg_paws: 0, dg_bed: 0 });
  Object.assign(GAP, { dg_small: 140, dg_mid: 160, dg_big: 220, dg_howl: 3000, dg_growl: 160, dg_whine: 700, dg_snap: 200, dg_chorus: 1500 });
  // Hunde je Rasse: Dackel/Terrier hoch, Dogge/Mastiff tief, Husky heult
  Object.assign(VOX, {
    klein: { swing: ['dg_small', 0.6, 1.1], hit: ['dg_growl', 0.5, 1.25], parry: ['dg_snap', 0.5, 1.1], shout: ['dg_small', 0.45, 1.15], cry: ['dg_small', 0.7, 1.1], pack: 3, die: ['dg_whine', 0.5, 1.15], step: ['dg_paws', 1.2, 1.15] },
    mittel: { swing: ['dg_mid', 0.6], hit: ['dg_growl', 0.55], parry: ['dg_snap', 0.5], shout: ['dg_mid', 0.45], cry: ['dg_mid', 0.75], pack: 3, die: ['dg_whine', 0.5], step: ['dg_paws', 1.2] },
    husky: { swing: ['dg_mid', 0.6, 0.95], hit: ['dg_growl', 0.55, 0.9], parry: ['dg_snap', 0.5], shout: ['dg_howl', 0.4], cry: ['dg_howl', 0.8], pack: 2, die: ['dg_whine', 0.5, 0.9], step: ['dg_paws', 1.3, 0.9] },
    gross: { swing: ['dg_big', 0.7], hit: ['dg_growl', 0.7, 0.7], parry: ['dg_snap', 0.5, 0.8], shout: ['dg_big', 0.5], cry: ['dg_big', 0.9, 0.9], pack: 2, die: ['dg_whine', 0.5, 0.75], step: ['dg_paws', 1.4, 0.75] }
  });
  var curEd = 'feudal';
  function kindOf(t) { var E = ED[curEd]; return t && (E ? E.kind[t] : KIND[t]); }
  function rk(k) { var E = ED[curEd]; return E && E.remap && k in E.remap ? E.remap[k] : k; }
  function edition() { try { var e = ShogiApp.P().settings.theme; return ED[e] || e === 'feudal' ? e : 'feudal'; } catch (e) { return 'feudal'; } }
  function load(k, n) {
    if (loaded[k]) return; loaded[k] = true;
    var fk = FILE[k] || k;
    (n ? Array.from({ length: n }, function (_, i) { return fk + (i + 1); }) : [fk]).forEach(function (f) {
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
    var kd = kindOf(t), v = kd && VOX[kd]; if (!v) return null;
    if (!v._ld) { v._ld = true; load('horn', 0); Object.keys(v).forEach(function (e) { var s = v[e]; if (s && s.length && XS[s[0]] != null) load(s[0], XS[s[0]]); }); }
    return v[ev] || null;
  }
  function vplay(t, ev, k, opt) { var e = vx(t, ev); if (!e) return false; opt = opt || {}; opt.rate = (opt.rate || 1) * (e[2] || 1); return smp(e[0], e[1] * (k == null ? 1 : k), opt); }
  function has(k) { return buf[k] && buf[k].length; }
  // Kreaturen (Warhammer): Tengu, Kirin, Drache rumpeln beim Aufprall und gehen im Stimmenlimit vor
  var CREA = { 7: 1, 13: 1, 14: 1 }, heroAt = -99;
  // Heldenduell (Three Kingdoms): kämpft König oder Drache, kommt ein Taiko-Stich (mit Musik eine Shamisen-Phrase), das Gemenge tritt zurück
  function hero(t) {
    if (t !== 8 && t !== 14) return; var now = ctx.currentTime; if (now - heroAt < 8) return; heroAt = now;
    smp('drum', 1, { force: true, nogap: true, out: sfxGain }); smp('drum', 0.8, { force: true, nogap: true, delay: 0.3, rate: 0.85, out: sfxGain }); duck(1800);
    if (mus && !mus.ed && has('mus_sham')) musPlay(buf.mus_sham[buf.mus_sham.length - 1], mus.out, now + 0.6, 0, 0.6);
  }
  // Brett der laufenden Partie (nur lesen): Schlachtfeld-Stimmung, Wetter, Brände, Kameraabstand
  function board() { try { var g = window.ShogiApp && ShogiApp.G && ShogiApp.G(), r = g && g.r; return r && r.orbit ? r : null; } catch (e) { return null; } }
  // Ambiente je Schlachtfeld-Stimmung (Pass: Wind, Flusstal: Bach, Belagerung: Feuer, Sommertag: Zikaden), Fahnen, Regen, seltene Krähen/ferne Schreie.
  // Loops mit weicher Überblendung (MP3 loopt nicht lückenlos). Stumm, Effekte 0 oder Tab im Hintergrund: nichts ansetzen.
  var amb = { L: {}, f: 0, oneAt: 0 }, MOOD = { pass: 'amb_wind', tal: 'amb_river', belagerung: 'amb_fire', mittag: 'amb_cicada', feldzug: 'amb_river', kontinent: 'amb_river' };
  function ambLayer(k, want) {
    var L = amb.L[k] || (amb.L[k] = { g: null, next: 0, v: -1 }), t = ctx.currentTime;
    if (want > 0.01) load(k, 0); else if (!L.g) return;
    if (!L.g) { L.g = ctx.createGain(); L.g.gain.value = 0; L.g.connect(ambBus); }
    if (Math.abs(want - L.v) > 0.01) { L.v = want; L.g.gain.cancelScheduledValues(t); L.g.gain.setTargetAtTime(want, t, 1.2); }
    if (want <= 0.01) { L.next = 0; return; }
    if (has(k) && t + 0.6 >= L.next) {
      var b = buf[k][0], X = 1.5, at = Math.max(t + 0.05, L.next), sc = ctx.createBufferSource(), sg = ctx.createGain(), d = b.duration;
      sc.buffer = b; sg.gain.setValueAtTime(0, at); sg.gain.linearRampToValueAtTime(1, at + X); sg.gain.setValueAtTime(1, at + d - X); sg.gain.linearRampToValueAtTime(0, at + d);
      sc.connect(sg); sg.connect(L.g); sc.start(at); sc.stop(at + d + 0.05); L.next = at + d - X;
    }
  }
  function ambTick() {
    setTimeout(ambTick, 500);
    curEd = edition(); if (mus && mus.edId !== curEd) { musStop(); if (wantMusic && vol.music > 0) musStart(); }
    var r = board(), live = !vol.mute && vol.sfx > 0 && !document.hidden, on = !!(live && r && r.look === 'feld' && r.settings && r.settings.army), W = (on && r.wx) || {}, t = ctx.currentTime;
    var base = on ? MOOD[r.settings.fieldMood || 'pass'] : null, rain = W.rain || 0;
    Object.keys(MOOD).forEach(function (m) { var k = MOOD[m]; ambLayer(k, k === base ? (k === 'amb_fire' ? 0.45 + 0.07 * Math.min(8, r.firesLit || 0) : 0.55) * (1 - 0.5 * rain) : 0); });
    ambLayer('amb_flag', on ? 0.3 + 0.2 * (W.storm || 0) : 0); ambLayer('amb_rain', on ? 0.9 * rain : 0);
    if (on && W.storm > 0.1) load('thunder', 2);
    if (on && ED[curEd]) ['bed', 'drum', 'impact', 'clash', 'hit', 'fall', 'cry'].forEach(function (k) { var e = rk(k); if (e && e !== k) load(e, XS[e] || 0); }); // Grundklänge der Edition vorladen
    // seltene Einzelklänge aus der Ferne: Krähen, bei der Belagerung Schreie
    if (on && t > amb.oneAt) {
      if (amb.oneAt) {
        var k = base === 'amb_fire' && curEd === 'feudal' && Math.random() < 0.6 ? ['die', 'warcry', 'cry'][Math.floor(Math.random() * 3)] : base !== 'amb_cicada' ? 'caw' : null;
        if (k) { load(k, XS[k] != null ? XS[k] : SMP[k]); smp(k, 0.35, { force: true, nogap: true, out: far, rate: 0.9 }); }
      }
      amb.oneAt = t + 14 + Math.random() * 24;
    }
    if (!on) amb.oneAt = 0;
    // Kameraabstand: 0 = Kino-Nahsicht (trocken, hell), 1 = Übersicht (dumpf, hallig, Teppich trägt)
    var f = on ? sstep(r.orbit.radius, 12, 32) : 0;
    if (Math.abs(f - amb.f) > 0.02 || (f === 0 && amb.f)) { amb.f = f; busF.frequency.setTargetAtTime(20000 * Math.pow(0.1, f), t, 0.3); bus.gain.setTargetAtTime(1 - 0.35 * f, t, 0.3); busRev.gain.setTargetAtTime(0.15 + 0.45 * f, t, 0.3); }
  }
  function smp(k, v, opt) {
    if (rk(k) !== k) { k = rk(k); if (!k) return true; load(k, XS[k] || 0); if (!has(k)) return true; } // umgeleitet: lieber still als Synth-Ersatz
    if (!has(k)) return false; opt = opt || {};
    var now = ctx.currentTime * 1000; if (!opt.nogap && lastAt[k] && now - lastAt[k] < (GAP[k] || 60)) return true; if (voices >= 6 && !opt.force) return true; lastAt[k] = now;
    var list = buf[k], i = Math.floor(Math.random() * list.length); if (list.length > 1 && i === lastVar[k]) i = (i + 1) % list.length; lastVar[k] = i;
    var src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = list[i];
    src.playbackRate.value = (opt.rate || 1) * (0.92 + Math.random() * 0.16); g.gain.value = (v == null ? 0.8 : v) * (0.75 + Math.random() * 0.25);
    src.connect(g); g.connect(opt.out || busF); if (opt.wet) g.connect(reverb);
    voices++; src.onended = function () { voices--; }; src.start(ctx.currentTime + 0.005 + (opt.delay || 0)); return true;
  }
  var stepSrc = null, stepG = null;
  function stepStop(f) { if (!stepSrc) return; var t = ctx.currentTime; stepG.gain.cancelScheduledValues(t); stepG.gain.setTargetAtTime(0.0001, t, f / 3); stepSrc.stop(t + f + 0.05); stepSrc = null; }
  function stepLoop(k, ms, v, rate) {
    if (!has(k)) return; stepStop(0.08);
    var b = buf[k][0], src = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime, d = Math.max(0.3, ms / 1000);
    src.buffer = b; src.loop = true; src.playbackRate.value = (rate || 1) * (0.95 + Math.random() * 0.1);
    g.gain.setValueAtTime(0.0001, t); g.gain.setTargetAtTime(v, t, 0.08); g.gain.setTargetAtTime(0.0001, t + d - 0.25, 0.08);
    src.connect(g); g.connect(busF); src.start(t, Math.random() * b.duration); src.stop(t + d + 0.3); stepSrc = src; stepG = g;
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
      hero(t); if (kindOf(t) === 'speer' && Math.random() < 0.6) smp('wood', (v || 0.8) * 0.6); // Speerschaft aus Holz
      if (t && vplay(t, 'parry', v || 0.8)) return;
      if (smp('clash', (v || 0.8) * 0.9)) return;
      var t = t0(), k = v || 0.8, r = 0.75 + Math.random() * 0.5;
      noise(t, 0.05, 0.9 * k, 'bandpass', 1900 * r, 1.6); noise(t, 0.025, 0.4 * k, 'highpass', 5200 * r, 0.7);
      noise(t + 0.01, 0.09, 0.45 * k, 'bandpass', 520 * r, 1.2, 260); osc('sine', 120 * r, t, 0.08, 0.35 * k, null, 60);
    },
    // Schlachtruf der Armee: viele Stimmen „Uooo!“ (Sägezahn durch Vokal-Formanten), dazu Atemrauschen
    roar: function (v, t) {
      var e = t && vx(t, 'cry');
      if (e && has(e[0])) { for (var j = 0, n = VOX[kindOf(t)].pack || 1; j < n; j++) smp(e[0], e[1] * (v || 1) * (j ? 0.6 : 1), { force: true, nogap: j > 0, wet: true, delay: j * (0.08 + Math.random() * 0.14) }); if (VOX[kindOf(t)].also) vplay(t, 'also', v, { force: true, nogap: true, delay: 0.25 }); duck(500); return; }
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
      // Treffer in Schichten: Aufprall + Material (Stoff/Körper, oft Lackrüstung aus Holz); Kreaturen: tiefes Rumpeln, Vorrang, Teppich weicht
      hero(t); smp('body', (v || 0.7) * 0.55); if (Math.random() < 0.5) smp('wood', (v || 0.7) * 0.4, { delay: 0.01 });
      if (CREA[t]) { smp('drum', (v || 0.7) * 0.9, { force: true, nogap: true, rate: 0.55 }); duck(400); vplay(t, 'hit', v || 0.7, { force: true }); if (Math.random() < 0.3) vplay(t, 'shout', 1, { force: true }); return; }
      if (t && vplay(t, 'hit', v || 0.7)) { if (Math.random() < 0.4) smp('hit', (v || 0.7) * 0.45); if (Math.random() < 0.2) vplay(t, 'shout'); return; }
      if (!smp('hit', v || 0.7)) S.clash(v);
    },
    fall: function (v, t) { smp('fall', v || 0.6); if (CREA[t]) smp('drum', 0.8, { force: true, nogap: true, rate: 0.5 }); if (t && Math.random() < 0.55) vplay(t, 'die', v ? 0.6 + v * 0.5 : 1, { force: true }); },
    // Laufen je Typ (Schritte, Pfoten, Hufe, Flügel) als Loop über die Zugdauer
    march: function (ms, t) { var e = vx(t, 'step'); if (e) stepLoop(e[0], ms, e[1], e[2]); },
    // Horagai (Muschelhorn) zum Schlachtbeginn, höchstens alle 20 s
    horn: function (v, t) { vx(t, 'cry'); smp('horn', v || 0.7, { force: true, wet: true }); },
    cheer: function (v) { bedStop(1.2); smp('cheer', v || 0.8, { force: true, wet: true }); },
    bedStop: function () { bedStop(0.8); },
    // Donner (Gewitter aus fieldfx.js): v = Stärke 0–1
    thunder: function (v) { load('thunder', 2); smp('thunder', 0.5 + 0.5 * (v || 1), { force: true, wet: true, out: sfxGain }); },
    // Taiko-Schlag beim Aufprall der Linien
    taiko: function (v) { if (smp('drum', v || 1, { force: true, wet: true })) { smp('impact', (v || 1) * 0.8, { force: true }); duck(300); return; } var t = t0(), k = v || 1; osc('sine', 78, t, 0.55, 1 * k, null, 42, true); noise(t, 0.12, 0.5 * k, 'lowpass', 380, 0.8, 120); noise(t, 0.02, 0.25 * k, 'bandpass', 2500, 1); },
    // Gemenge im Hintergrund: Klappern, Stampfen, Rufe, ein paar Sekunden
    melee: function (sec) {
      var bk = rk('bed'); if (bk) load(bk, 0);
      if (bk !== 'bed' && !(bk && has(bk))) return; // Edition: lieber kurz still als Synth-Gemenge
      if (bk && has(bk)) {
        bedStop(0.2); var src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf[bk][0]; src.loop = true; g._lvl = 0.7 * (1 + 0.6 * amb.f); // aus der Ferne trägt der Teppich
        g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.setTargetAtTime(g._lvl, ctx.currentTime, 0.12); src.connect(g); g.connect(busF);
        src.start(ctx.currentTime, Math.random() * 6); bedSrc = src; bedGain = g; bedTimer = setTimeout(function () { bedStop(0.8); }, (sec || 3) * 1000); return;
      }
      var t = t0(), n = Math.round((sec || 3) * 14);
      for (var i = 0; i < n; i++) { var u = t + Math.random() * (sec || 3), r = 0.7 + Math.random() * 0.6; noise(u, 0.04, 0.25 + Math.random() * 0.25, 'bandpass', 1600 * r, 1.4); if (Math.random() < 0.3) noise(u, 0.08, 0.3, 'lowpass', 300 * r, 0.8); }
      for (var j = 0; j < (sec || 3) * 1.5; j++) { var w = t + Math.random() * (sec || 3), f = 120 + Math.random() * 120; osc('sawtooth', f * 1.1, w, 0.25, 0.025, null, f * 0.75, true); }
      noise(t, sec || 3, 0.12, 'bandpass', 700, 0.5, 400, null, true);
    },
    whoosh: function (v, t) { if (t && vplay(t, 'swing', v ? v * 1.6 : 1)) return; if (smp('whoosh', (v || 0.6) * 0.8)) return; var t = t0(); noise(t, 0.22, 0.35, 'bandpass', 500, 2, 2600); },
    // Fernkampf: ferne Salven kommen später und dumpfer an (Empire/Napoleon)
    zap: function (v, k) { if (k && vplay(k, 'mag', v ? v * 1.6 : 1, { wet: true, delay: 0.03 + 0.12 * amb.f })) return; if (smp('zap', (v || 0.6) * 1.1, { wet: true, delay: 0.03 + 0.12 * amb.f })) return; var t = t0(); osc('sawtooth', 1400, t, 0.18, 0.12, null, 180, true); noise(t, 0.08, 0.3, 'highpass', 5000, 1); },
    fire: function (v, k) { if (k && vplay(k, 'mag', 1, { force: true, wet: true, delay: 0.03 + 0.12 * amb.f })) { vplay(k, 'cry', 0.8, { force: true, delay: 0.05 }); return; } if (smp('fire', 0.9, { force: true, wet: true })) return; var t = t0(); noise(t, 0.8, 0.5, 'lowpass', 900, 0.8, 300, null, true); osc('sine', 60, t, 0.7, 0.4, null, 40); },
    crumble: function () { if (smp('crumble', 0.8, { force: true, wet: true })) return; var t = t0(); noise(t, 0.6, 0.6, 'lowpass', 1800, 0.7, 200, null, true); for (var i = 0; i < 5; i++) noise(t + i * 0.06 + Math.random() * 0.04, 0.05, 0.4, 'bandpass', 1500 + Math.random() * 2000, 4); },
    check: function () { var t = t0(); osc('sine', 90, t, 0.5, 1, null, 45, true); noise(t, 0.12, 0.5, 'lowpass', 400, 1); osc('sine', 90, t + 0.22, 0.45, 0.8, null, 45, true); },
    win: function () { var t = t0(); [0, 2, 4, 5, 7, 9, 10].forEach(function (d, i) { osc('triangle', note(d + 5), t + i * 0.12, 0.9, 0.18, null, null, true); }); for (var i = 0; i < 6; i++) osc('sine', 80, t + i * 0.15, 0.3, 0.6, null, 50); },
    lose: function () { var t = t0(); [1, 2.4, 3.8, 5.1].forEach(function (h) { osc('sine', 98 * h, t, 3, 0.25 / h, null, null, true); }); },
    levelup: function () { var t = t0(); [5, 7, 9, 10, 12].forEach(function (d, i) { osc('square', note(d), t + i * 0.08, 0.25, 0.06); osc('sine', note(d), t + i * 0.08, 0.7, 0.15, null, null, true); }); },
    star: function (i) { var t = t0(); osc('sine', note(7 + i * 2), t, 0.5, 0.2, null, null, true); osc('sine', note(7 + i * 2) * 2, t, 0.3, 0.06, null, null, true); },
    grade: function (g) { var t = t0(); if (g >= 3) { osc('sine', note(10), t, 0.4, 0.15, null, null, true); osc('sine', note(12), t + 0.08, 0.5, 0.15, null, null, true); } else if (g <= 1) { osc('triangle', 220, t, 0.3, 0.12, null, 150); } }
  };

  // Musik aus Aufnahmen (CC0, snd/credits.txt) statt Synthesizer, dynamisch in drei Schichten:
  // 0 ruhig: Koto-Töne in der In-Skala auf D, ab und zu eine Shakuhachi-Phrase (Ro = D); 1 Taiko leicht, 2 Taiko schwer (beide 120 BPM, 8 s, taktgleich).
  // Spannung (setIntensity: Schach, Endspiel, Boss) und Kampfklänge im Armee-Modus blenden die Taiko ein. Lädt erst bei Musik > 0, Taiko erst bei Spannung.
  // Stumm oder Tab im Hintergrund: nichts Neues ansetzen (Akku).
  var mus = null, fightAt = -99, FIGHT = { clash: 1, hit: 1, roar: 1, horn: 1, fire: 1, zap: 1, fall: 1 }, TAIKO = ['mus_taiko1', 'mus_taiko2'];
  function sstep(x, a, b) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  function musLevel() { return Math.max(intensity, ctx && ctx.currentTime - fightAt < 5 ? 0.8 : 0); }
  function musPlay(k, g, at, off, v, rate) {
    var s = ctx.createBufferSource(), sg = ctx.createGain(); s.buffer = k; s.playbackRate.value = rate || 1; sg.gain.value = v == null ? 1 : v;
    s.connect(sg); sg.connect(g); s.start(at, off || 0); var m = mus; m.src.push(s); s.onended = function () { var i = m.src.indexOf(s); if (i >= 0) m.src.splice(i, 1); };
  }
  // Taiko-Schicht j ab Zeitpunkt t im laufenden 8-s-Zyklus einsetzen (beim Einblenden mitten im Zyklus mit Versatz, damit es im Takt bleibt)
  function taiko(j, at) {
    var k = TAIKO[j - 1]; if (!has(k) || mus.on[j] === mus.cyc) return;
    mus.on[j] = mus.cyc; musPlay(buf[k][0], mus.g[j], at, Math.max(0, at - mus.c0));
  }
  function musMix(tc) {
    if (!mus) return; var i = musLevel(), t = ctx.currentTime;
    if (mus.ed) {
      mus.lv = [1 - sstep(i, 0.25, 0.55), 0.85 * sstep(i, 0.2, 0.45) * (1 - sstep(i, 0.6, 0.85)), sstep(i, 0.6, 0.85)];
      if (i > 0.15) mus.ed.forEach(function (k) { load(k, 0); });
      mus.g.forEach(function (g, k) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(mus.lv[k], t, tc || 1.5); });
      mus.fight = i >= 0.8 && intensity < 0.8; return;
    }
    mus.lv = [1 - 0.55 * sstep(i, 0.3, 0.9), 0.75 * sstep(i, 0.22, 0.5), 0.8 * sstep(i, 0.6, 0.85)];
    if (i > 0.15) { TAIKO.forEach(function (k) { load(k, 0); }); load('mus_sham', 2); }
    mus.g.forEach(function (g, k) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(mus.lv[k], t, tc || 1.2); if (k && mus.lv[k] > 0.02) taiko(k, Math.max(t + 0.03, mus.c0)); });
    mus.fight = i >= 0.8 && intensity < 0.8;
  }
  function musTick() {
    if (!mus) return; var t = ctx.currentTime;
    if (vol.mute || document.hidden) { mus.c0 = mus.next = t + 0.3; mus.cyc++; mus.calmAt = t + 1; }
    else {
      if (mus.ed) { for (var q = 0; q < 3; q++) musLoop(q, t); if (mus.fight && musLevel() < 0.8) musMix(2.5); mus.timer = setTimeout(musTick, 400); return; }
      if (t + 0.6 >= mus.next) { mus.c0 = Math.max(mus.next, t + 0.05); mus.next = mus.c0 + 8; mus.cyc++; }
      for (var j = 1; j < 3; j++) if (mus.lv[j] > 0.02) taiko(j, Math.max(t + 0.05, mus.c0)); // auch wenn die Aufnahme gerade erst geladen ist
      if (t >= mus.calmAt) musCalm(t);
      if (mus.lv[1] > 0.25 && t >= mus.shamAt && has('mus_sham')) { var sb = buf.mus_sham[Math.floor(Math.random() * buf.mus_sham.length)]; musPlay(sb, mus.g[1], t + 0.05, 0, 0.7); mus.shamAt = t + sb.duration + 14 + Math.random() * 20; }
      if (mus.fight && musLevel() < 0.8) musMix(2.5); // Kampf vorbei: Taiko langsam zurück
    }
    mus.timer = setTimeout(musTick, 400);
  }
  // Koto: Wanderung in der In-Skala (A3–B♭4), Ton aus der näheren Aufnahme (C4 oder G4) umgestimmt; Shakuhachi-Phrase alle 25–50 s
  function musCalm(t) {
    var g = mus.g[0];
    if (t >= mus.shakuAt && has('mus_shaku')) {
      var L = buf.mus_shaku, i = Math.floor(Math.random() * L.length); if (L.length > 1 && i === mus.lastShaku) i = (i + 1) % L.length; mus.lastShaku = i;
      musPlay(L[i], g, t + 0.05, 0, 0.5); mus.shakuAt = t + L[i].duration + 25 + Math.random() * 25; mus.calmAt = t + L[i].duration * 0.6; return;
    }
    if (has('mus_koto1') && has('mus_koto2')) {
      mus.deg = Math.max(-2, Math.min(4, mus.deg + [-2, -1, 1, 2][Math.floor(Math.random() * 4)] + (mus.deg < 0 ? 1 : mus.deg > 2 ? -1 : 0)));
      var kn = function (d, at, v) { var f = note(d), c = Math.abs(Math.log(f / 261.63)) < Math.abs(Math.log(f / 392)); musPlay(buf[c ? 'mus_koto1' : 'mus_koto2'][0], g, at, 0, v, f / (c ? 261.63 : 392)); };
      kn(mus.deg, t + 0.03, 0.6 + Math.random() * 0.2);
      if (Math.random() < 0.3) kn(mus.deg - 2, t + 0.21, 0.4);
    }
    mus.calmAt = t + (mus.lv[2] > 0.3 ? 2.4 : 1.3) + Math.random() * 2.2;
  }
  // Loop q der Edition: neue Kopie 2 s vor Ende weich einblenden (nur solange die Schicht hörbar ist)
  function musLoop(q, t) {
    var k = mus.ed[q]; if (mus.lv[q] <= 0.02) { mus.nx[q] = 0; return; }
    if (!has(k) || t + 0.6 < mus.nx[q]) return;
    var b = buf[k][0], X = 2, at = Math.max(t + 0.05, mus.nx[q]), sg = ctx.createGain(), d = b.duration;
    sg.gain.setValueAtTime(0, at); sg.gain.linearRampToValueAtTime(1, at + X); sg.gain.setValueAtTime(1, at + d - X); sg.gain.linearRampToValueAtTime(0, at + d); sg.connect(mus.g[q]);
    musPlay(b, sg, at, 0, 1); mus.nx[q] = at + d - X;
  }
  function musStart() {
    var t = ctx.currentTime;
    if (mus) { mus.out.gain.cancelScheduledValues(t); mus.out.gain.setTargetAtTime(1, t, 0.4); return; }
    var E = ED[curEd = edition()]; if (E) load(E.music[0], 0); else { load('mus_koto1', 0); load('mus_koto2', 0); load('mus_shaku', 5); }
    var out = ctx.createGain(); out.gain.value = 0; out.gain.setTargetAtTime(1, t, 0.6); out.connect(musicGain);
    var g = [0, 1, 2].map(function (k) { var x = ctx.createGain(); x.gain.value = 0; x.connect(out); return x; });
    mus = { out: out, g: g, lv: [1, 0, 0], src: [], on: [0, 0, 0], cyc: 0, c0: t + 0.3, next: t + 0.3, calmAt: t + 0.8, shakuAt: t + 6, shamAt: t + 8, deg: 1, lastShaku: -1, fight: false, edId: curEd, ed: E ? E.music : null, nx: [0, 0, 0] };
    musMix(0.5); musTick();
  }
  function musStop() {
    if (!mus) return; var m = mus, t = ctx.currentTime; mus = null; clearTimeout(m.timer);
    m.out.gain.cancelScheduledValues(t); m.out.gain.setTargetAtTime(0.0001, t, 0.3);
    m.src.forEach(function (s) { try { s.stop(t + 1.5); } catch (e) { } }); setTimeout(function () { m.out.disconnect(); }, 1800);
  }
  return {
    unlock: ensure,
    // type: Truppentyp 1–14 (Feudal) für eigene Klänge, sonst allgemein
    play: function (name, arg, type) { if (FIGHT[name] && ctx) { var low = musLevel() < 0.8; fightAt = ctx.currentTime; if (low) musMix(0.7); } if (vol.mute || vol.sfx <= 0 || !ensure()) return; try { S[name] && S[name](arg, type); } catch (e) { } },
    music: function (on) {
      wantMusic = on; if (!ensure()) return;
      if (on && vol.music > 0) musStart(); else musStop();
    },
    setIntensity: function (x) { intensity = Math.max(0, Math.min(1, x)); musMix(); },
    setVolume: function (sfx, music, mute) {
      var wasOn = vol.music > 0; vol.sfx = sfx; vol.music = music; vol.mute = !!mute;
      if (!ctx) return;
      ramp(sfxGain, sfx); ramp(musicGain, music); ramp(master, masterLevel());
      if (wantMusic && wasOn !== music > 0) this.music(true); // Musik von 0 hochgezogen oder auf 0 gestellt
    }
  };
})();
