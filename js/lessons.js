// Kampagne "Pfad des Shōgun": 8 Kapitel, je Tutorial/Mission/Rätsel/Gegner/Mini-Boss/Schrein/Boss.
// Felder in Shogi-Notation: "5e" = Linie 5, Reihe e.
function SQ(n) { var file = +n[0], rank = 'abcdefghi'.indexOf(n[1]); return rank * 9 + (9 - file); }
// Baut eine SFEN aus {"5e":"K","3c":"p"} (Großbuchstaben = du, klein = Gegner, "+R" = befördert)
function POS(map, hand, turn) {
  var b = new Array(81).fill('');
  Object.keys(map).forEach(function (k) { b[SQ(k)] = map[k]; });
  var rows = [];
  for (var r = 0; r < 9; r++) { var row = '', e = 0; for (var c = 0; c < 9; c++) { var p = b[r * 9 + c]; if (!p) { e++; continue; } if (e) { row += e; e = 0; } row += p; } if (e) row += e; rows.push(row); }
  return rows.join('/') + ' ' + (turn || 'b') + ' ' + (hand || '-') + ' 1';
}

// Vorgaben (Komaochi): der Stärkere (KI, oben) nimmt Figuren weg und zieht zuerst.
// ranks = ungefährer Rangunterschied, den die Vorgabe ausgleicht (Faustregel)
var HANDICAPS = {
  none: { name: 'Gleichstand', top: 'lnsgkgsnl/1r5b1/ppppppppp', ranks: 0 },
  lance: { name: 'Lanzen-Vorgabe', top: 'lnsgkgsn1/1r5b1/ppppppppp', ranks: 2 },
  bishop: { name: 'Läufer-Vorgabe', top: 'lnsgkgsnl/1r7/ppppppppp', ranks: 3 },
  rook: { name: 'Turm-Vorgabe', top: 'lnsgkgsnl/7b1/ppppppppp', ranks: 4 },
  rooklance: { name: 'Turm+Lanze-Vorgabe', top: 'lnsgkgsn1/7b1/ppppppppp', ranks: 5 },
  two: { name: '2-Figuren-Vorgabe', top: 'lnsgkgsnl/9/ppppppppp', ranks: 7 },
  four: { name: '4-Figuren-Vorgabe', top: '1nsgkgsn1/9/ppppppppp', ranks: 9 },
  six: { name: '6-Figuren-Vorgabe', top: '2sgkgs2/9/ppppppppp', ranks: 11 },
  eight: { name: '8-Figuren-Vorgabe', top: '3gkg3/9/ppppppppp', ranks: 13 },
  ten: { name: '10-Figuren-Vorgabe', top: '4k4/9/ppppppppp', ranks: 15 },
  naked: { name: 'Nackter König', top: '4k4/9/9', ranks: 18 }
};
var HC_ORDER = ['none', 'lance', 'bishop', 'rook', 'rooklance', 'two', 'four', 'six', 'eight', 'ten', 'naked'];
function hcSFEN(key) { var h = HANDICAPS[key]; return h.top + '/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL ' + (key === 'none' ? 'b' : 'w') + ' - 1'; }

// Kampagnen-Gegner. r = geschätzte Wertung ohne Vorgabe (Lishogi-Skala), opts = Engine-Stärke, style = Persönlichkeit, say = Sprüche
var FOES = {
  kappa: { name: 'Kappa', title: 'Bandit vom Fluss', r: 600, icon: 'pawn', color: '#4f9a6a', opts: { depth: 1, noise: 200 },
    say: { start: 'Hehe! Gib mir deinen Reis!', capture: 'Meins!', check: 'Lauf, Fürstchen!', hurt: 'Au! Das war mein Lieblingsbauer!', lose: 'Ich geh ja schon …', win: 'Reich bin ich!', phase: 'Ich hab noch was in der Tasche!' } },
  tanuki: { name: 'Tanuki', title: 'Schelm der Reisfelder', r: 650, icon: 'pawn', color: '#a8784a', opts: { depth: 1, noise: 150 },
    say: { start: 'Pon-poko! Spielen wir!', capture: 'Gefunden!', hurt: 'Pon?!', lose: 'Pon … verloren.', win: 'Pon-poko-pon!' } },
  onichief: { name: 'Gorō', title: 'Oni-Häuptling', r: 800, icon: 'king', color: '#c8322b', opts: { depth: 2, noise: 100 },
    say: { start: 'Kleiner Fuchs. Ich zerquetsche dich.', capture: 'Knochen knacken!', check: 'Spürst du meinen Atem?', hurt: 'GRAAH!', phase: 'GENUG! Jetzt wird es ernst!', lose: 'Unmöglich … ein Fuchs …', win: 'Zu schwach.' } },
  kage: { name: 'Kage', title: 'Ninja des Nebels', r: 900, icon: 'knight', color: '#5a5a7a', opts: { depth: 2, noise: 60 },
    say: { start: 'Du siehst nicht, was ich in der Hand habe …', drop: 'Aus dem Nebel!', capture: 'Lautlos.', hurt: 'Tsk.', lose: 'Der Nebel lichtet sich.', win: 'Du hast mich nie gesehen.' } },
  warden: { name: 'Akane', title: 'Kerkermeisterin', r: 950, icon: 'gold', color: '#8a3a8a', opts: { depth: 2, noise: 40 },
    say: { start: 'Deine Gefangenen bleiben vorerst in meinem Kerker. 10 Züge lang.', drop: 'Ein neuer Wächter!', capture: 'Ab in die Zelle.', phase: 'Verstärkung!', hurt: 'Ein Ausbruch?!', lose: 'Die Zellen sind leer …', win: 'Lebenslang.' } },
  hayato: { name: 'Hayato', title: 'Samurai der Passwache', r: 1100, icon: 'silver', color: '#4a90d9', opts: { depth: 3, noise: 40 },
    say: { start: 'Zeig mir deine Burg.', capture: 'Ehrlich verdient.', hurt: 'Ein guter Hieb.', lose: 'Deine Burg hält. Respekt.', win: 'Übe weiter.' } },
  siege: { name: 'Tetsu', title: 'Belagerungsgeneral', r: 1150, icon: 'rook', color: '#b07030', opts: { depth: 3, noise: 25 },
    say: { start: 'Keine Burg hält ewig.', capture: 'Die Mauer bröckelt!', check: 'Rammbock!', phase: 'Bringt den Kakugyō! Sturmangriff!', hurt: 'Mein Belagerungsturm!', lose: 'Die Festung … hält.', win: 'Die Burg ist gefallen.' } },
  ronin: { name: 'Kaito', title: 'Zeitdruck-Ronin', r: 850, icon: 'silver', color: '#8e7cc3', opts: { depth: 2, noise: 90 },
    say: { start: 'Mein Schwert ist schnell. Deins auch? 20 Sekunden pro Zug!', capture: 'Zu langsam!', hurt: 'Schnell bist du.', lose: 'Schneller als gedacht.', win: 'Die Zeit war mein Verbündeter.' } },
  monk: { name: 'Ryōkan', title: 'Mönch der Stille', r: 1200, icon: 'gold', color: '#c8a050', opts: { depth: 3, noise: 30, style: { kingSafety: 1.6 } },
    say: { start: 'Geduld ist die schärfste Klinge.', hurt: 'Hm.', lose: 'Gut. Sehr gut.', win: 'Noch zu ungeduldig.' } },
  abbot: { name: 'Gensai', title: 'Abt der tausend Fallen', r: 1350, icon: 'bishop', color: '#d08a2a', opts: { time: 700 },
    say: { start: 'Jeder Zug eine Falle. Jede Falle eine Lektion.', capture: 'Hineingetappt!', phase: 'Der Hisha kehrt zurück!', hurt: 'Hm. Diese kannte ich nicht.', lose: 'Der Schüler übertrifft den Meister.', win: 'Lies die Falle, bevor du hineintrittst.' } },
  guardian: { name: 'Seiryū', title: 'Wächter des Drachenbergs', r: 1400, icon: 'dragon', color: '#3fa88a', opts: { time: 900 },
    say: { start: 'Nur Würdige erreichen den Gipfel.', hurt: 'Würdig …', lose: 'Geh weiter, Würdiger.', win: 'Kehr um.' } },
  dragon: { name: 'Ryūjin', title: 'Tsume-Drache', r: 1500, icon: 'dragon', color: '#2a9a5a', opts: { time: 1400 },
    say: { start: 'Mein Feuer verzeiht keinen Fehler.', capture: 'Asche!', check: 'Brenne!', hurt: 'Meine Schuppe!', lose: 'Ein Mensch … hat mich besiegt.', win: 'Nur Asche bleibt.' } },
  trader: { name: 'Baron Tausch', title: 'Der Tauscher', r: 1250, icon: 'knight', color: '#9a9aaa', opts: { time: 700, style: { handFactor: 0.5, kingSafety: 0.2 } },
    say: { start: 'Tausch vereinfacht. So lernt man das im Westen.', capture: 'Ein fairer Tausch!', hurt: 'Warte … die Figur kommt ZURÜCK?', lose: 'Das gibt es im Schach nicht!', win: 'Material ist Material.' } },
  gaston: { name: 'Gaston', title: 'Ritter aus dem Westen', r: 1300, icon: 'lance', color: '#7a8ab8', opts: { time: 900, style: { handFactor: 0.6, kingSafety: 0.3 } },
    say: { start: 'En garde! Eine Rochade braucht man hier doch nicht.', capture: 'Touché!', hurt: 'Sacrebleu!', lose: 'Mon dieu, diese Drops …', win: 'Vive l\'échec!' } },
  white: { name: 'Großmeister Weiß', title: 'Gesandter des Westens', r: 1550, icon: 'king', color: '#e0e0e0', opts: { time: 2000, style: { handFactor: 0.7, kingSafety: 0.4 } },
    say: { start: 'Ich rechne zwanzig Züge voraus. Im Schach.', capture: 'Präzise.', check: 'Schach. Das Wort kenne ich.', hurt: 'Das … hab ich nicht gesehen.', lose: 'Ich muss dieses Spiel ernst nehmen.', win: 'Logik siegt.' } },
  shadow: { name: 'Der Schachmeister', title: 'Endboss', r: 1650, icon: 'king', color: '#c0c0c0', opts: { time: 3000, style: { handFactor: 0.75, kingSafety: 0.45 } },
    say: { start: 'Wie schwer kann Shogi schon sein?', capture: 'Ha!', check: 'Schach!', hurt: 'Hm. Moment mal.', lose: 'Gut gespielt. Wirklich gut.', win: 'Noch eine?' } }
};

// Belohnungen: Brett-Skins
var SKINS = {
  classic: { name: 'Kaya-Holz', a: '#e7bf7f', b: '#b98440', line: '#2b1a0c' },
  straw: { name: 'Reisstroh', a: '#f0dc96', b: '#c8a850', line: '#4a3a10' },
  moon: { name: 'Mondnacht', a: '#6a7aaa', b: '#2a3058', line: '#d8e4ff' },
  bamboo: { name: 'Bambuswald', a: '#a8d088', b: '#4a7a3a', line: '#14280c' },
  sakura: { name: 'Kirschblüte', a: '#f8d0de', b: '#d88aa8', line: '#5a1a30' },
  lava: { name: 'Vulkan', a: '#6a3020', b: '#2a0a08', line: '#ff8a3a' },
  chess: { name: 'Schachbrett (Gag)', a: '#eeeed2', b: '#769656', line: '#2a3a1a', check: true },
  gold: { name: 'Goldener Thron', a: '#ffe08a', b: '#c8902a', line: '#4a2a00' }
};

var CHAPTERS = [
  { id: 1, name: 'Das Dorf am Fluss', sub: 'König, Gold, Silber, Bauer', x: 14, y: 86 },
  { id: 2, name: 'Die Reisfelder', sub: 'Turm, Läufer, Lanze, Springer, Aufstieg', x: 40, y: 76 },
  { id: 3, name: 'Das Gefangenenlager', sub: 'Drops und ihre Regeln', x: 74, y: 82 },
  { id: 4, name: 'Die Burg am Pass', sub: 'Mino-Burg + Vierte-Linie-Turm', x: 84, y: 62 },
  { id: 5, name: 'Das Tesuji-Kloster', sub: 'Gabeln, Fallen, Tempo', x: 56, y: 52 },
  { id: 6, name: 'Der Drachenberg', sub: 'Matt in 3, Burgen knacken', x: 22, y: 50 },
  { id: 7, name: 'Gesandte aus dem Westen', sub: 'Schachspieler-Fehler ausnutzen', x: 34, y: 26 },
  { id: 8, name: 'Der Thron', sub: 'Finale', x: 70, y: 14 }
];

var LESSONS = [
  // ===== Kapitel 1: Dorf =====
  { id: '1-1', ch: 1, type: 'T', title: 'Der Ōshō', unit: 8, kind: 'mission',
    intro: ['Willkommen, junger Fürst! Ich bin Hoshi, dein Fuchsgeist-Sensei.', 'Das ist dein Ōshō, der König. Er zieht 1 Feld in jede Richtung.', 'Führ ihn zum Banner. Im Shogi gilt: Wird der Ōshō mattgesetzt, ist alles verloren.'],
    sfen: POS({ '5i': 'K' }), goal: { kind: 'reach', piece: 8, sq: ['5e'] }, par: 4, max: 8 },
  { id: '1-2', ch: 1, type: 'T', title: 'Das Kinshō', unit: 5, kind: 'mission',
    intro: ['Das Kinshō (Gold) zieht 1 Feld: gerade in alle Richtungen und schräg nach vorne.', 'Nur schräg zurück kann es NICHT. Es ist der beste Leibwächter deines Ōshō.', 'Zerschlage die Strohpuppen des Gegners!'],
    sfen: POS({ '5h': 'G', '4g': 'p', '4f': 'p', '3f': 'p' }), goal: { kind: 'capture' }, par: 3, max: 7 },
  { id: '1-3', ch: 1, type: 'T', title: 'Das Ginshō', unit: 4, kind: 'mission',
    intro: ['Das Ginshō (Silber) zieht 1 Feld: nach vorne (gerade und schräg) oder schräg zurück.', 'Es kann NICHT zur Seite und NICHT gerade zurück. Dafür ist es ein super Angreifer.'],
    sfen: POS({ '5h': 'S', '4g': 'p', '5f': 'p', '6g': 'p' }), goal: { kind: 'capture' }, par: 3, max: 7 },
  { id: '1-4', ch: 1, type: 'T', title: 'Der Fu', unit: 1, kind: 'mission',
    intro: ['Der Fu (Bauer) geht 1 Feld geradeaus.', 'WICHTIG, anders als im Schach: Er schlägt auch geradeaus, nicht schräg! Schachspieler verwechseln das am Anfang.'],
    sfen: POS({ '5g': 'P', '5f': 'p', '5e': 'p' }), goal: { kind: 'capture' }, par: 2, max: 3 },
  { id: '1-5', ch: 1, type: 'R', title: 'Kopf-Gold', unit: 5, kind: 'tsume', plies: 1, card: 'atamakin',
    intro: ['Schach heißt: Der Ōshō wird angegriffen. Matt: Er kann nicht mehr entkommen.', 'Das berühmteste Matt: Gold auf den Kopf (Atama-Kin). Setz das Kinshō aus deiner Reserve direkt vor den König, gedeckt vom Fu.', 'Tipp unten auf das Kinshō in deiner Reserve, dann aufs Feld.'],
    sfen: POS({ '5a': 'k', '5c': 'P' }, 'G') },
  { id: '1-6', ch: 1, type: 'R', title: 'Silber im Bauch', unit: 4, kind: 'tsume', plies: 1,
    intro: ['Manchmal ist es nicht Gold, sondern Silber. Silber greift schräg nach hinten an, perfekt um Fluchtfelder zu schließen.'],
    sfen: POS({ '1a': 'k', '3a': 'g', '2c': 'P', '1c': 'P' }, 'S') },
  { id: '1-7', ch: 1, type: 'M', title: 'Jagd auf den nackten König', unit: 8, kind: 'battle', foe: 'kappa', hc: 'naked', maxMoves: 40, opts: { depth: 2, noise: 0 },
    intro: ['Kappa ist ohne Armee geflohen. Nur sein König ist übrig. So lernen Kinder in Japan: Der Lehrer spielt mit Vorgabe.', 'Setz ihn in höchstens 40 Zügen matt. Tipp: Bring Gold und Silber nach vorne und treib ihn an den Rand.'], bonus: { kind: 'fast', n: 25, txt: 'Matt in ≤ 25 Zügen' } },
  { id: '1-8', ch: 1, type: 'S', title: 'Schrein des Flusses', kind: 'shrine', reward: { charge: 1 },
    intro: ['Ein Schrein. Hier verrate ich dir die Tricks des nächsten Bosses.', 'Kappa spielt nur mit König und Bauern (10-Figuren-Vorgabe) und zieht zuerst, wie es bei Vorgaben üblich ist.', 'Aber Vorsicht: Ab seinem 15. Zug zaubert er ein Kinshō aus der Tasche. Bring deinen König vorher in Sicherheit.', 'Als Geschenk: eine Fuchsgeist-Ladung. Damit schlage ich dir im Kampf einmal den besten Zug vor.'] },
  { id: '1-9', ch: 1, type: 'B', title: 'Boss: Kappa', kind: 'battle', foe: 'kappa', hc: 'ten', reinforce: [{ at: 15, t: 5 }],
    intro: ['Kappa will die Reisernte stehlen! Verteidige das Dorf.'], bonus: { kind: 'noUndo', txt: 'Ohne Rücknahme gewinnen' },
    reward: { title: 'Dorfbeschützer', skin: 'straw' } },

  // ===== Kapitel 2: Reisfelder =====
  { id: '2-1', ch: 2, type: 'T', title: 'Der Hisha', unit: 7, kind: 'mission',
    intro: ['Der Hisha (Turm) fliegt beliebig weit gerade: vor, zurück, links, rechts.'],
    sfen: POS({ '5h': 'R', '5d': 'p', '2d': 'p', '2f': 'p' }), goal: { kind: 'capture' }, par: 3, max: 7 },
  { id: '2-2', ch: 2, type: 'T', title: 'Der Kakugyō', unit: 6, kind: 'mission',
    intro: ['Der Kakugyō (Läufer) ist ein Magier der Diagonalen. Er zieht beliebig weit schräg.'],
    sfen: POS({ '8h': 'B', '5e': 'p', '3c': 'p', '1e': 'p' }), goal: { kind: 'capture' }, par: 3, max: 7 },
  { id: '2-3', ch: 2, type: 'T', title: 'Keima & Kyōsha', unit: 3, kind: 'mission',
    intro: ['Der Keima (Springer) springt NUR nach vorne: 2 vor und 1 zur Seite. Er springt über Figuren.', 'Die Kyōsha (Lanze) stürmt beliebig weit geradeaus, nie zurück.', 'Beide können nie umkehren. Überleg gut, bevor du sie losschickst.'],
    sfen: POS({ '8i': 'N', '1i': 'L', '8h': 'P', '7h': 'P', '7g': 'p', '6e': 'p', '1e': 'p' }), goal: { kind: 'capture' }, par: 3, max: 5 },
  { id: '2-4', ch: 2, type: 'T', title: 'Der Aufstieg', unit: 14, kind: 'mission', card: 'ryu',
    intro: ['Die obersten 3 Reihen sind Feindesland. Zieht eine Einheit hinein, hinaus oder darin, darf sie aufsteigen (befördern).', 'Der Stein wird umgedreht. Aus dem Hisha wird der Ryūō (Drachenkönig): gerade beliebig weit plus 1 Feld schräg.', 'Alle kleinen Einheiten ziehen nach dem Aufstieg wie ein Kinshō. König und Gold steigen nie auf.', 'Erobere beide Puppen. Sag JA zum Aufstieg.'],
    sfen: POS({ '2h': 'R', '2c': 'p', '1b': 'p' }), goal: { kind: 'capture' }, par: 2, max: 4 },
  { id: '2-5', ch: 2, type: 'G', title: 'Tanuki', kind: 'battle', foe: 'tanuki', hc: 'ten',
    intro: ['Ein Tanuki hat sich in deinen Reisfeldern breit gemacht. Er hat nur König und Bauern.', 'Ziel: Bring Hisha und Kakugyō durch die Bauernwand und lass sie aufsteigen.'], bonus: { kind: 'promote2', txt: 'Turm UND Läufer befördern' } },
  { id: '2-6', ch: 2, type: 'S', title: 'Schrein der Felder', kind: 'shrine', reward: { charge: 1 },
    intro: ['Der Oni-Häuptling Gorō spielt mit 8-Figuren-Vorgabe: König, 2 Kinshō, Bauern.', 'Ab seinem 20. Zug wird er wütend, holt ein Silber aus der Tasche und greift wild an. Dann sollte dein König schon sicher stehen.'] },
  { id: '2-7', ch: 2, type: 'B', title: 'Boss: Oni-Häuptling', kind: 'battle', foe: 'onichief', hc: 'eight', phase: { at: 20, style: { kingSafety: 0, handFactor: 1.2 }, give: [4] },
    intro: ['Der Oni-Häuptling stampft durch die Reisfelder!'], bonus: { kind: 'noUndo', txt: 'Ohne Rücknahme gewinnen' },
    reward: { title: 'Oni-Bezwinger', charge: 2 } },

  // ===== Kapitel 3: Gefangenenlager =====
  { id: '3-1', ch: 3, type: 'T', title: 'Die Beschwörung', unit: 5, kind: 'mission',
    intro: ['Das Herz des Shogi: Geschlagene Figuren wechseln die Seite und landen in deiner Reserve.', 'Statt zu ziehen, darfst du eine Figur aus der Reserve auf ein beliebiges freies Feld setzen (Drop).', 'Du hast ein Kinshō in der Reserve. Setz sie aufs Feld und erobere damit beide Puppen.'],
    sfen: POS({ '9i': 'L', '5c': 'p', '4c': 'p' }, 'G'), goal: { kind: 'capture' }, par: 3, max: 5 },
  { id: '3-2', ch: 3, type: 'T', title: 'Der Seitenwechsel', unit: 6, kind: 'mission',
    intro: ['Schlag den feindlichen Kakugyō. Er wechselt die Seite und kommt in deine Reserve.', 'Dann beschwöre ihn selbst und erobere den Rest. Mindestens ein Drop ist Pflicht.'],
    sfen: POS({ '5i': 'R', '5e': 'b', '1a': 'p', '9a': 'p' }), goal: { kind: 'capture', requireDrop: true }, par: 5, max: 8 },
  { id: '3-3', ch: 3, type: 'T', title: 'Verbotene Künste', unit: 1, kind: 'quiz',
    intro: ['Drei Regeln für Drops. Die musst du kennen, sonst glaubt dir ein Schachspieler nicht.'],
    questions: [
      { sfen: POS({ '5i': 'K', '7g': 'P', '5a': 'k', '3c': 'g' }, 'P'), q: 'Darfst du einen Fu auf 7e setzen?', a: ['Ja', 'Nein'], ok: 1, why: 'Nifu: Nie zwei eigene unbeförderte Fu in derselben Linie. Auf Linie 7 steht schon einer.' },
      { sfen: POS({ '5i': 'K', '5a': 'k' }, 'N'), q: 'Darfst du einen Keima auf die oberste Reihe (z. B. 3a) setzen?', a: ['Ja', 'Nein'], ok: 1, why: 'Eine Figur darf nie dort hin, wo sie nie wieder ziehen könnte. Fu und Kyōsha nicht auf die letzte Reihe, Keima nicht auf die letzten zwei.' },
      { sfen: POS({ '5i': 'K', '1a': 'k', '2c': 'G', '3b': 'G' }, 'P'), q: 'Der Fu-Drop auf 1b wäre Matt. Ist er erlaubt?', a: ['Ja', 'Nein'], ok: 1, why: 'Uchifuzume: Matt durch einen Fu-DROP ist verboten. Matt durch einen gezogenen Fu ist erlaubt.' },
      { sfen: POS({ '5i': 'K', '5a': 'k' }), q: 'Gibt es im Shogi oft Remis?', a: ['Ja, wie im Schach', 'Fast nie'], ok: 1, why: 'Weil Figuren zurück aufs Brett kommen, wird es nie leer. Fast jede Partie endet mit Matt. Tausch vereinfacht hier nichts. Genau das unterschätzen Schachspieler.' }
    ] },
  { id: '3-4', ch: 3, type: 'R', title: 'Der Hisha-Sturz', unit: 7, kind: 'tsume', plies: 1,
    intro: ['Ein Hisha aus der Reserve kann aus der Ferne Matt setzen. Der König steht in der Ecke.'],
    sfen: POS({ '1a': 'k', '2a': 'p', '2c': 'P' }, 'R') },
  { id: '3-5', ch: 3, type: 'R', title: 'Der Fuchssprung', unit: 3, kind: 'tsume', plies: 1, card: 'keima',
    intro: ['Der Keima springt über Verteidiger hinweg. Den kann man nicht blocken!'],
    sfen: POS({ '1a': 'k', '2a': 'n', '1b': 'p', '2b': 'b' }, 'N') },
  { id: '3-6', ch: 3, type: 'R', title: 'Matt-Training', kind: 'puzzles', set: 'm1', count: 5,
    intro: ['Echte Stellungen aus Partien. Finde jeweils das Matt in 1. Oft ist es ein Drop!'] },
  { id: '3-7', ch: 3, type: 'MB', title: 'Mini-Boss: Ninja Kage', kind: 'battle', foe: 'kage', hc: 'six', fog: true,
    intro: ['Kage versteckt seine Reserve im Nebel. Du siehst nicht, was er droppen kann.', 'Merk dir, was du ihm gegeben hast!'], reward: { title: 'Nebelseher' } },
  { id: '3-8', ch: 3, type: 'S', title: 'Schrein des Kerkers', kind: 'shrine', reward: { charge: 1 },
    intro: ['Die Kerkermeisterin hält deine Gefangenen fest: Du darfst erst ab deinem 10. Zug droppen.', 'Und sie bekommt Verstärkung in die Hand (Zug 8, 16, 24): Fu, Ginshō, Kinshō.', 'Spiel solide, sammle Figuren und schlag dann mit allem zu, was du hast.'] },
  { id: '3-9', ch: 3, type: 'B', title: 'Boss: Kerkermeisterin', kind: 'battle', foe: 'warden', hc: 'six', noDropUntil: 10, reinforce: [{ at: 8, t: 1 }, { at: 16, t: 4 }, { at: 24, t: 5 }],
    intro: ['Befreie die Gefangenen aus dem Lager!'], bonus: { kind: 'noUndo', txt: 'Ohne Rücknahme gewinnen' },
    reward: { title: 'Meister der Drops', skin: 'moon' } },

  // ===== Kapitel 4: Burg am Pass =====
  { id: '4-1', ch: 4, type: 'T', title: 'Der Turm wandert', unit: 7, kind: 'mission',
    intro: ['Dein Schlachtplan gegen Schachspieler: Vierte-Linie-Turm (Shikenbisha) plus Mino-Burg. Immer derselbe Plan, bis er sitzt.', 'Erster Schritt: Öffne den Weg deines Kakugyō (Fu 7g auf 7f) und schick den Hisha auf Linie 6 (Feld 6h).', 'Der Gegner schläft gerade, nur du ziehst.'],
    sfen: 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1', goal: { kind: 'pattern', need: { '7f': 'P', '6h': 'R' } }, par: 2, max: 4 },
  { id: '4-2', ch: 4, type: 'T', title: 'Die Mino-Festung', unit: 8, kind: 'mission', card: 'mino',
    intro: ['Jetzt die Burg. Der Ōshō flieht nach rechts: 5i, 4h, 3h, 2h.', 'Dann das Ginshō auf 3h, ein Kinshō auf 5h. Die andere bleibt auf 4i.', 'Das ist die Mino-Burg. Schnell gebaut und sehr stabil.'],
    sfen: 'lnsgkgsnl/1r5b1/ppppppppp/9/9/2P6/PP1PPPPPP/1B1R5/LNSGKGSNL b - 1', goal: { kind: 'pattern', need: { '2h': 'K', '3h': 'S', '4i': 'G', '5h': 'G', '6h': 'R' } }, par: 5, max: 9 },
  { id: '4-3', ch: 4, type: 'M', title: 'Burgbau unter Beschuss', unit: 8, kind: 'battle', foe: 'hayato', hc: 'four', castleBy: 16,
    intro: ['Jetzt mit echtem Gegner: Bau Turm auf 6h und die Mino-Burg bis zu deinem 16. Zug. Hayato stört.', 'Steht die Burg nicht rechtzeitig, ist die Mission verloren. Danach spielst du die Partie zu Ende.'], bonus: { kind: 'noUndo', txt: 'Ohne Rücknahme gewinnen' } },
  { id: '4-4', ch: 4, type: 'G', title: 'Samurai Hayato', kind: 'battle', foe: 'hayato', hc: 'four',
    intro: ['Hayato fordert dich zum ehrlichen Duell. 4-Figuren-Vorgabe.'], bonus: { kind: 'mino', txt: 'Mit Mino-Burg gewinnen' } },
  { id: '4-5', ch: 4, type: 'S', title: 'Schrein am Pass', kind: 'shrine', reward: { charge: 1 },
    intro: ['General Tetsu belagert mit 4-Figuren-Vorgabe. Ab seinem 30. Zug bekommt er einen Kakugyō in die Hand und stürmt.', 'Drei Sterne gibt es nur, wenn deine Mino-Burg steht. Die Burg ist dein Schild gegen jeden Sturm.'] },
  { id: '4-6', ch: 4, type: 'B', title: 'Boss: Belagerungsgeneral', kind: 'battle', foe: 'siege', hc: 'four', phase: { at: 30, style: { kingSafety: 0.2, handFactor: 1.2 }, give: [6] },
    intro: ['Die Burg am Pass wird belagert!'], bonus: { kind: 'mino', txt: 'Mit Mino-Burg gewinnen' },
    reward: { title: 'Burgherr', skin: 'bamboo' } },

  // ===== Kapitel 5: Tesuji-Kloster =====
  { id: '5-1', ch: 5, type: 'R', title: 'Gabeln & Tesuji', kind: 'puzzles', set: 'tac', count: 5,
    intro: ['Tesuji sind kluge Kniffe. Oft ein Drop, der zwei Figuren gleichzeitig angreift.', 'Finde den Zug, der Material gewinnt.'] },
  { id: '5-2', ch: 5, type: 'R', title: 'Matt-Serie', kind: 'puzzles', set: 'm1', count: 8, offset: 5,
    intro: ['Mehr Matt-Training. Wiederholung macht dich schneller als jeden Schachspieler.'] },
  { id: '5-3', ch: 5, type: 'MB', title: 'Mini-Boss: Zeitdruck-Ronin', kind: 'battle', foe: 'ronin', hc: 'two', moveTime: 20,
    intro: ['Kaito gibt dir nur 20 Sekunden pro Zug. Läuft die Zeit ab, verlierst du.', 'Echte Partien laufen oft mit Uhr. Gewöhn dich dran!'], reward: { title: 'Blitzklinge' } },
  { id: '5-4', ch: 5, type: 'G', title: 'Mönch Ryōkan', kind: 'battle', foe: 'monk', hc: 'two',
    intro: ['Ryōkan verteidigt sich wie eine Mauer. 2-Figuren-Vorgabe: kein Turm, kein Läufer.'] },
  { id: '5-5', ch: 5, type: 'S', title: 'Schrein der Stille', kind: 'shrine', reward: { charge: 1 },
    intro: ['Abt Gensai spielt mit 2-Figuren-Vorgabe, rechnet aber gut.', 'Ab seinem 25. Zug holt er seinen Hisha zurück in die Hand. Sei dann bereit.'] },
  { id: '5-6', ch: 5, type: 'B', title: 'Boss: Abt der tausend Fallen', kind: 'battle', foe: 'abbot', hc: 'two', phase: { at: 25, give: [7] },
    intro: ['Der Abt erwartet dich im Kloster.'], bonus: { kind: 'noUndo', txt: 'Ohne Rücknahme gewinnen' },
    reward: { title: 'Taktiker', skin: 'sakura' } },

  // ===== Kapitel 6: Drachenberg =====
  { id: '6-1', ch: 6, type: 'R', title: 'Matt in 3', kind: 'puzzles', set: 'm3', count: 5,
    intro: ['Jetzt drei Züge tief: du, der Gegner, du. Jeder deiner Züge muss Schach sein.'] },
  { id: '6-2', ch: 6, type: 'G', title: 'Wächter Seiryū', kind: 'battle', foe: 'guardian', hc: 'rooklance',
    intro: ['Der Wächter spielt mit Turm-und-Lanzen-Vorgabe.'] },
  { id: '6-3', ch: 6, type: 'S', title: 'Schrein des Gipfels', kind: 'shrine', reward: { charge: 1 },
    intro: ['Ryūjin, der Tsume-Drache, spielt mit Turm-Vorgabe und rechnet stark.', 'Wenn du ihn in die Enge treibst: Jeder Zug ein Schach. Wie in den Matt-in-3-Rätseln.'] },
  { id: '6-4', ch: 6, type: 'B', title: 'Boss: Tsume-Drache', kind: 'battle', foe: 'dragon', hc: 'rook',
    intro: ['Der Drache erwacht!'], bonus: { kind: 'fast', n: 60, txt: 'In ≤ 60 Zügen gewinnen' },
    reward: { title: 'Drachentöter', skin: 'lava' } },

  // ===== Kapitel 7: Gesandte aus dem Westen =====
  { id: '7-1', ch: 7, type: 'T', title: 'Wie Schachspieler denken', unit: 8, kind: 'quiz',
    intro: ['Gesandte aus dem Westen sind da. Sie spielen wie Schachspieler. Lern ihre Schwächen!'],
    questions: [
      { sfen: POS({ '5i': 'K', '5a': 'k' }), q: 'Ein Schachspieler tauscht Turm gegen Turm, um zu vereinfachen. Wird es im Shogi dadurch ruhiger?', a: ['Ja', 'Nein, im Gegenteil'], ok: 1, why: 'Beide haben danach einen Turm in der Hand, der überall einschlagen kann. Gegen einen König ohne Burg ist das tödlich. Tausch nur, wenn deine Burg steht und seine nicht.' },
      { sfen: hcSFEN('none'), q: 'Ein Schachspieler lässt den König in der Mitte stehen. Was tust du?', a: ['Sofort angreifen', 'Erst meine Burg bauen, dann angreifen'], ok: 1, why: 'Erst Burg, dann Krieg. Ein früher Angriff ohne Burg wird gekontert. Mit fertiger Mino-Burg kannst du ruhig tauschen und mit Drops zuschlagen.' },
      { sfen: POS({ '5i': 'K', '5a': 'k' }), q: 'Wie wertvoll ist ein Fu in der Hand?', a: ['Fast nichts, wie ein Bauer', 'Sehr nützlich: Drop-Tricks, Blocken, Angriff'], ok: 1, why: 'Ein Fu in der Hand blockt Schachs, greift Köpfe an und öffnet Burgen. Schachspieler unterschätzen ihn.' }
    ] },
  { id: '7-2', ch: 7, type: 'MB', title: 'Mini-Boss: Der Tauscher', kind: 'battle', foe: 'trader', hc: 'bishop',
    intro: ['Baron Tausch tauscht alles und baut keine Burg. Läufer-Vorgabe.', 'Lass ihn tauschen und bestraf ihn mit deinen Handfiguren.'], bonus: { kind: 'drops', n: 3, txt: 'Mindestens 3 Drops' }, reward: { title: 'Händlerschreck' } },
  { id: '7-3', ch: 7, type: 'G', title: 'Ritter Gaston', kind: 'battle', foe: 'gaston', hc: 'lance',
    intro: ['Gaston denkt, im Shogi braucht man keine Burg. Lanzen-Vorgabe.'], bonus: { kind: 'mino', txt: 'Mit Mino-Burg gewinnen' } },
  { id: '7-4', ch: 7, type: 'S', title: 'Schrein des Westens', kind: 'shrine', reward: { charge: 1 },
    intro: ['Großmeister Weiß spielt ohne Vorgabe und rechnet stark, unterschätzt aber Handfiguren und Königssicherheit.', 'Dein Plan: Vierte-Linie-Turm, Mino-Burg, abwarten, dann Drops.'] },
  { id: '7-5', ch: 7, type: 'B', title: 'Boss: Großmeister Weiß', kind: 'battle', foe: 'white', hc: 'none',
    intro: ['Der Gesandte des Westens fordert dich heraus. Gleichstand, keine Vorgabe mehr.'], bonus: { kind: 'mino', txt: 'Mit Mino-Burg gewinnen' },
    reward: { title: 'Bezwinger des Westens', skin: 'chess' } },

  // ===== Kapitel 8: Thron =====
  { id: '8-1', ch: 8, type: 'S', title: 'Letzter Schrein', kind: 'shrine', reward: { charge: 2 },
    intro: ['Der letzte Gegner: der Schachmeister. Best-of-3, keine Hilfen, keine Rücknahme.', 'Erinnere dich: Burg zuerst. Tausch erst, wenn deine Burg steht. Fu in der Hand sind Gold wert.', 'Ich glaube an dich, junger Fürst.'] },
  { id: '8-2', ch: 8, type: 'B', title: 'Endboss: Der Schachmeister', kind: 'battle', foe: 'shadow', hc: 'none', bestOf: 3, noAssist: true,
    intro: ['Der Thron wartet. Gewinne 2 von 3 Partien.'],
    reward: { title: 'Shōgun', skin: 'gold' } }
];

// Sammelkarten (Muster), werden durch Lektionen freigeschaltet
var CARDS = {
  atamakin: { name: 'Kopf-Gold', jp: '頭金', txt: 'Gold direkt vor den König, gedeckt. Das häufigste Matt.' },
  ryu: { name: 'Drachenkönig', jp: '龍', txt: 'Beförderter Turm: stärkste Figur. Bring ihn ins Feindesland!' },
  keima: { name: 'Fuchssprung', jp: '桂', txt: 'Springer-Drops lassen sich nicht blocken. Gabel zwei Figuren!' },
  mino: { name: 'Mino-Burg', jp: '美濃囲い', txt: 'K 2h, S 3h, G 4i, G 5h. Schnell gebaut, stabil von der Seite.' }
};
var MINO = { '2h': 'K', '3h': 'S', '4i': 'G', '5h': 'G' };
