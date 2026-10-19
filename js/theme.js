// Themes: austauschbar wie Monopoly-Editionen. Kampagne, Gegner und Ränge kommen aus "feudal", Editionen tauschen Namen, Figuren und Welten.
var ICONS = {
  // viewBox 0 0 100 100, Farbe über currentColor
  pawn: '<path d="M10 56 L50 22 L90 56 Z"/><path d="M33 58 v12 a17 14 0 0 0 34 0 v-12 Z" opacity=".75"/><rect x="46" y="12" width="8" height="14" rx="3"/>',
  lance: '<path d="M50 6 L61 30 L50 25 L39 30 Z"/><rect x="46" y="28" width="8" height="64" rx="3"/><rect x="34" y="34" width="32" height="7" rx="3" opacity=".8"/>',
  knight: '<path d="M18 14 L39 40 L61 40 L82 14 L78 58 L50 88 L22 58 Z"/><circle cx="38" cy="56" r="5" fill="#000" opacity=".55"/><circle cx="62" cy="56" r="5" fill="#000" opacity=".55"/><path d="M44 72 L50 78 L56 72 Z" fill="#000" opacity=".5"/>',
  silver: '<g transform="rotate(35 50 50)"><rect x="46" y="6" width="8" height="66" rx="2"/><rect x="38" y="70" width="24" height="6" rx="3"/><rect x="47" y="76" width="6" height="18" rx="2" opacity=".75"/></g><g transform="rotate(-35 50 50)"><rect x="46" y="6" width="8" height="66" rx="2"/><rect x="38" y="70" width="24" height="6" rx="3"/><rect x="47" y="76" width="6" height="18" rx="2" opacity=".75"/></g>',
  gold: '<path d="M50 8 L86 21 V50 C86 72 68 85 50 93 C32 85 14 72 14 50 V21 Z"/><circle cx="50" cy="50" r="16" fill="#000" opacity=".35"/><circle cx="50" cy="50" r="8"/>',
  bishop: '<circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="7"/><path d="M50 14 L60 42 L89 42 L66 59 L74 86 L50 70 L26 86 L34 59 L11 42 L40 42 Z"/>',
  rook: '<path d="M48 54 C30 30 14 30 4 34 C14 40 18 50 16 58 C24 56 30 60 32 66 C38 60 44 60 48 62 Z"/><path d="M52 54 C70 30 86 30 96 34 C86 40 82 50 84 58 C76 56 70 60 68 66 C62 60 56 60 52 62 Z"/><path d="M50 30 L58 46 L54 90 L46 90 L42 46 Z"/>',
  king: '<path d="M18 62 C18 36 32 24 50 24 C68 24 82 36 82 62 Z"/><path d="M8 62 H92 L84 74 H16 Z" opacity=".8"/><path d="M28 30 C34 6 66 6 72 30 C64 18 36 18 28 30 Z"/><rect x="46" y="74" width="8" height="18"/>',
  dragon: '<path d="M14 70 C10 40 30 18 58 18 C74 18 88 28 90 42 L74 44 L86 54 L66 56 C60 50 50 52 46 60 C42 70 52 80 64 78 C54 90 24 92 14 70 Z"/><circle cx="66" cy="32" r="5" fill="#000" opacity=".6"/><path d="M50 18 L44 4 L58 16 Z M64 18 L66 4 L72 20 Z"/>',
  horse: '<path d="M30 92 L34 60 C24 52 22 36 32 24 L36 8 L44 20 C60 16 78 26 82 44 L78 52 L64 48 C62 58 64 72 72 92 Z"/><circle cx="56" cy="32" r="5" fill="#000" opacity=".6"/>',
  star: '<path d="M50 6 L62 38 L96 38 L68 58 L78 92 L50 72 L22 92 L32 58 L4 38 L38 38 Z"/>'
};

var THEMES = {
  feudal: {
    id: 'feudal', name: 'Pfad des Shōgun', sub: 'Fantasy-Feudaljapan', ready: true, board: 'urushi',
    // Welten (nur im 3D-Modus sichtbar), id = settings.scene
    maps: [{ id: 'buehne', name: 'Dunkle Bühne', sub: 'Spotlicht, schwarzer Glanzboden' }, { id: 'garten', name: 'Zen-Garten', sub: 'Kies, Felsen, Bambus, Sternenhimmel' }, { id: 'see', name: 'Mondsee', sub: 'Steininsel im Wasser, Torii' }],
    factions: [
      { name: 'Kitsune-Clan', color: '#46d7ff', glow: 'rgba(70,215,255,.6)', dark: '#0b3a52' },
      { name: 'Oni-Clan', color: '#ff5a4e', glow: 'rgba(255,90,78,.6)', dark: '#4a0f0f' }
    ],
    // Index = Figurentyp aus core.js
    units: {
      1: { name: 'Ashigaru', icon: 'pawn', kanji: '歩', real: 'Fu (Bauer)', lore: 'Fußsoldat. Geht nur 1 Feld geradeaus und schlägt auch geradeaus, nicht schräg wie im Schach.' },
      2: { name: 'Yari-Lanze', icon: 'lance', kanji: '香', real: 'Kyōsha (Lanze)', lore: 'Stürmt beliebig weit geradeaus, aber nie zurück oder zur Seite.' },
      3: { name: 'Kitsune-Späher', icon: 'knight', kanji: '桂', real: 'Keima (Springer)', lore: 'Springt nur nach vorne: 2 vor, 1 zur Seite. Kann über andere springen.' },
      4: { name: 'Silber-Samurai', icon: 'silver', kanji: '銀', real: 'Ginshō (Silber)', lore: '1 Feld: nach vorne (3 Richtungen) oder schräg zurück. Nicht zur Seite, nicht gerade zurück.' },
      5: { name: 'Goldwache', icon: 'gold', kanji: '金', real: 'Kinshō (Gold)', lore: '1 Feld in alle Richtungen außer schräg zurück. Bester Verteidiger des Daimyō.' },
      6: { name: 'Onmyōji', icon: 'bishop', kanji: '角', real: 'Kakugyō (Läufer)', lore: 'Magier der Diagonalen. Zieht beliebig weit schräg.' },
      7: { name: 'Tengu-Krieger', icon: 'rook', kanji: '飛', real: 'Hisha (Turm)', lore: 'Fliegt beliebig weit gerade in alle 4 Richtungen. Stärkste normale Einheit.' },
      8: { name: 'Daimyō', icon: 'king', kanji: '玉', kanji2: '王', real: 'Ōshō (König)', lore: 'Dein Fürst. 1 Feld in jede Richtung. Wird er mattgesetzt, ist die Schlacht verloren.' },
      9: { name: 'Tokin-Veteran', icon: 'pawn', kanji: 'と', real: 'Tokin (befördert)', lore: 'Beförderter Ashigaru. Zieht wie eine Goldwache. Wird er geschlagen, bekommt der Gegner nur einen Ashigaru.' },
      10: { name: 'Lanzen-Hauptmann', icon: 'lance', kanji: '杏', real: 'Narikyō (befördert)', lore: 'Beförderte Lanze. Zieht wie eine Goldwache.' },
      11: { name: 'Fuchs-Hauptmann', icon: 'knight', kanji: '圭', real: 'Narikei (befördert)', lore: 'Beförderter Späher. Zieht wie eine Goldwache.' },
      12: { name: 'Silber-Hauptmann', icon: 'silver', kanji: '全', real: 'Narigin (befördert)', lore: 'Befördertes Silber. Zieht wie eine Goldwache.' },
      13: { name: 'Kirin-Weiser', icon: 'horse', kanji: '馬', real: 'Ryūma (Drachenpferd)', lore: 'Beförderter Onmyōji: schräg beliebig weit + 1 Feld gerade.' },
      14: { name: 'Drachenkönig', icon: 'dragon', kanji: '龍', real: 'Ryūō (Drachenkönig)', lore: 'Beförderter Tengu: gerade beliebig weit + 1 Feld schräg.' }
    },
    mentor: { name: 'Hoshi', title: 'Fuchsgeist-Sensei', icon: 'knight', color: '#ffb347' },
    opponents: [
      { id: 'bandit', name: 'Goro', title: 'Bandit der Reisfelder', lvl: 1, r: 450, opts: { depth: 1, noise: 320 }, color: '#b5651d', quote: 'Hehe, deine Figuren gehören bald mir!' },
      { id: 'ronin', name: 'Kaito', title: 'Herrenloser Ronin', lvl: 2, r: 650, opts: { depth: 2, noise: 140 }, color: '#8e7cc3', quote: 'Mein Schwert kennt keinen Herrn.' },
      { id: 'kenji', name: 'Kenji', title: 'Samurai der Grenzburg', lvl: 3, r: 1000, opts: { depth: 3, noise: 45 }, color: '#4a90d9', quote: 'Ehre und Geduld. Zeig mir deine Burg.' },
      { id: 'takeda', name: 'Takeda', title: 'General aus dem Westen', lvl: 4, r: 1250, opts: { time: 900, style: { handFactor: 0.6, kingSafety: 0.25 } }, color: '#d9534f', quote: 'Tausch ist Vereinfachung. Ich greife an!', note: 'Spielt wie ein Schachspieler: tauscht gern, baut keine Burg.' },
      { id: 'raijin', name: 'Raijin', title: 'Donner-Shōgun', lvl: 5, r: 1450, opts: { time: 2200 }, color: '#f0ad4e', quote: 'Der Donner wartet nicht.' },
      { id: 'meister', name: 'Der Schachmeister', title: 'Großmeister des Westens', lvl: 6, r: 1600, opts: { time: 3500, style: { handFactor: 0.75, kingSafety: 0.4 } }, color: '#e0e0e0', quote: 'Schach ist Schach. Wie schwer kann das sein?', note: 'Endboss: stark, aber mit Schachspieler-Gewohnheiten.' }
    ],
    ranks: ['Stufe 1', 'Stufe 2', 'Stufe 3', 'Stufe 4', 'Stufe 5', 'Stufe 6', 'Stufe 7', 'Stufe 8', 'Stufe 9', 'Stufe 10', 'Stufe 11', 'Stufe 12', 'Stufe 13', 'Stufe 14', 'Stufe 15', 'Stufe 16', 'Stufe 17', 'Stufe 18'],
    rankTitles: ['Reisbauer', 'Rekrut', 'Ashigaru', 'Ashigaru', 'Späher', 'Späher', 'Lanzenträger', 'Lanzenträger', 'Samurai', 'Samurai', 'Hatamoto', 'Hatamoto', 'Hauptmann', 'Hauptmann', 'General', 'Daimyō', 'Daimyō', 'Shōgun']
  },
  mecha: {
    id: 'mecha', name: 'Iron Protocol', sub: 'Mecha / Sci-Fi', ready: true, board: 'carbon',
    maps: [{ id: 'hangar', name: 'Hangar', sub: 'Montagehalle, Kräne, Warnstreifen' }, { id: 'neon', name: 'Neon-Dach', sub: 'Hochhausdach bei Nacht, Regen' }, { id: 'orbit', name: 'Orbitalstation', sub: 'Deck im All, Planet, Sterne' }],
    factions: [
      { name: 'Aurora-Pakt', color: '#46d7ff', glow: 'rgba(70,215,255,.6)', dark: '#0b3a52' },
      { name: 'Eisen-Syndikat', color: '#ff5a4e', glow: 'rgba(255,90,78,.6)', dark: '#4a0f0f' }
    ],
    units: {
      1: { name: 'Infanterie-Droide', icon: 'pawn', kanji: '歩', real: 'Fu (Bauer)', lore: 'Kleiner Kampfroboter. Geht nur 1 Feld geradeaus und schlägt auch geradeaus, nicht schräg wie im Schach.' },
      2: { name: 'Rail-Lancer', icon: 'lance', kanji: '香', real: 'Kyōsha (Lanze)', lore: 'Stürmt mit der Energielanze beliebig weit geradeaus, aber nie zurück oder zur Seite.' },
      3: { name: 'Sprung-Mech', icon: 'knight', kanji: '桂', real: 'Keima (Springer)', lore: 'Springt mit Düsen nur nach vorne: 2 vor, 1 zur Seite. Kann über andere springen.' },
      4: { name: 'Duell-Mech', icon: 'silver', kanji: '銀', real: 'Ginshō (Silber)', lore: '1 Feld: nach vorne (3 Richtungen) oder schräg zurück. Nicht zur Seite, nicht gerade zurück.' },
      5: { name: 'Schild-Mech', icon: 'gold', kanji: '金', real: 'Kinshō (Gold)', lore: '1 Feld in alle Richtungen außer schräg zurück. Bester Verteidiger des Kommandanten.' },
      6: { name: 'Psi-Operator', icon: 'bishop', kanji: '角', real: 'Kakugyō (Läufer)', lore: 'Android der Diagonalen. Zieht beliebig weit schräg.' },
      7: { name: 'Gunship', icon: 'rook', kanji: '飛', real: 'Hisha (Turm)', lore: 'Fliegt beliebig weit gerade in alle 4 Richtungen. Stärkste normale Einheit.' },
      8: { name: 'Kommandant', icon: 'king', kanji: '玉', kanji2: '王', real: 'Ōshō (König)', lore: 'Dein Kommando-Mech. 1 Feld in jede Richtung. Wird er mattgesetzt, ist die Schlacht verloren.' },
      9: { name: 'Elite-Droide', icon: 'pawn', kanji: 'と', real: 'Tokin (befördert)', lore: 'Beförderter Droide. Zieht wie ein Schild-Mech. Wird er geschlagen, bekommt der Gegner nur einen Droiden.' },
      10: { name: 'Rail-Hauptmann', icon: 'lance', kanji: '杏', real: 'Narikyō (befördert)', lore: 'Beförderter Lancer. Zieht wie ein Schild-Mech.' },
      11: { name: 'Sprung-Hauptmann', icon: 'knight', kanji: '圭', real: 'Narikei (befördert)', lore: 'Beförderter Sprung-Mech. Zieht wie ein Schild-Mech.' },
      12: { name: 'Duell-Hauptmann', icon: 'silver', kanji: '全', real: 'Narigin (befördert)', lore: 'Beförderter Duell-Mech. Zieht wie ein Schild-Mech.' },
      13: { name: 'Kampf-Läufer', icon: 'horse', kanji: '馬', real: 'Ryūma (Drachenpferd)', lore: 'Beförderter Psi-Operator: schräg beliebig weit + 1 Feld gerade.' },
      14: { name: 'Mecha-Drache', icon: 'dragon', kanji: '龍', real: 'Ryūō (Drachenkönig)', lore: 'Befördertes Gunship: gerade beliebig weit + 1 Feld schräg.' }
    },
    mentor: { name: 'NOVA', title: 'Taktik-KI', icon: 'knight', color: '#46d7ff' }
  },
  fantasy: {
    id: 'fantasy', name: 'Kronen & Drachen', sub: 'Klassisch Fantasy', ready: true, board: 'urushi',
    maps: [{ id: 'burghof', name: 'Burghof', sub: 'Mauern, Türme, Banner, Abendrot' }, { id: 'hort', name: 'Drachenhort', sub: 'Höhle voller Gold, Lava, Kristalle' }, { id: 'wald', name: 'Elfenwald', sub: 'Riesenbäume, Leuchtpilze, Glühwürmchen' }],
    factions: [
      { name: 'Haus Löwenherz', color: '#46d7ff', glow: 'rgba(70,215,255,.6)', dark: '#0b3a52' },
      { name: 'Haus Rabenstein', color: '#ff5a4e', glow: 'rgba(255,90,78,.6)', dark: '#4a0f0f' }
    ],
    units: {
      1: { name: 'Knappe', icon: 'pawn', kanji: '歩', real: 'Fu (Bauer)', lore: 'Junger Fußsoldat. Geht nur 1 Feld geradeaus und schlägt auch geradeaus, nicht schräg wie im Schach.' },
      2: { name: 'Pikenier', icon: 'lance', kanji: '香', real: 'Kyōsha (Lanze)', lore: 'Stürmt mit der Pike beliebig weit geradeaus, aber nie zurück oder zur Seite.' },
      3: { name: 'Greif', icon: 'knight', kanji: '桂', real: 'Keima (Springer)', lore: 'Springt nur nach vorne: 2 vor, 1 zur Seite. Kann über andere springen.' },
      4: { name: 'Zwergenkrieger', icon: 'silver', kanji: '銀', real: 'Ginshō (Silber)', lore: '1 Feld: nach vorne (3 Richtungen) oder schräg zurück. Nicht zur Seite, nicht gerade zurück.' },
      5: { name: 'Paladin', icon: 'gold', kanji: '金', real: 'Kinshō (Gold)', lore: '1 Feld in alle Richtungen außer schräg zurück. Bester Verteidiger des Königs.' },
      6: { name: 'Erzmagier', icon: 'bishop', kanji: '角', real: 'Kakugyō (Läufer)', lore: 'Magier der Diagonalen. Zieht beliebig weit schräg.' },
      7: { name: 'Steingolem', icon: 'rook', kanji: '飛', real: 'Hisha (Turm)', lore: 'Walzt beliebig weit gerade in alle 4 Richtungen. Stärkste normale Einheit.' },
      8: { name: 'König', icon: 'king', kanji: '玉', kanji2: '王', real: 'Ōshō (König)', lore: 'Dein König. 1 Feld in jede Richtung. Wird er mattgesetzt, ist die Schlacht verloren.' },
      9: { name: 'Ritter', icon: 'pawn', kanji: 'と', real: 'Tokin (befördert)', lore: 'Zum Ritter geschlagener Knappe. Zieht wie ein Paladin. Wird er geschlagen, bekommt der Gegner nur einen Knappen.' },
      10: { name: 'Pike-Hauptmann', icon: 'lance', kanji: '杏', real: 'Narikyō (befördert)', lore: 'Beförderter Pikenier. Zieht wie ein Paladin.' },
      11: { name: 'Greifenfürst', icon: 'knight', kanji: '圭', real: 'Narikei (befördert)', lore: 'Beförderter Greif. Zieht wie ein Paladin.' },
      12: { name: 'Zwergenthan', icon: 'silver', kanji: '全', real: 'Narigin (befördert)', lore: 'Beförderter Zwerg. Zieht wie ein Paladin.' },
      13: { name: 'Einhorn', icon: 'horse', kanji: '馬', real: 'Ryūma (Drachenpferd)', lore: 'Beförderter Erzmagier: schräg beliebig weit + 1 Feld gerade.' },
      14: { name: 'Drache', icon: 'dragon', kanji: '龍', real: 'Ryūō (Drachenkönig)', lore: 'Beförderter Golem: gerade beliebig weit + 1 Feld schräg.' }
    },
    mentor: { name: 'Merla', title: 'Hofmagierin', icon: 'bishop', color: '#b98cff' }
  },
  hunde: {
    id: 'hunde', name: 'Rudel der Rassen', sub: 'Hunde', ready: true, board: 'urushi',
    maps: [{ id: 'park', name: 'Hundepark', sub: 'Wiese, Zaun, Bäume, Hydrant, Sommerabend' }, { id: 'show', name: 'Hundeschau', sub: 'Siegerring, roter Teppich, Podest, Scheinwerfer' }, { id: 'strand', name: 'Strand', sub: 'Sand, Wellen, Leuchtturm, Sonnenuntergang' }],
    factions: [
      { name: 'Rudel Sonnenfell', color: '#46d7ff', glow: 'rgba(70,215,255,.6)', dark: '#0b3a52' },
      { name: 'Rudel Mondpfote', color: '#ff5a4e', glow: 'rgba(255,90,78,.6)', dark: '#4a0f0f' }
    ],
    units: {
      1: { name: 'Dackel', icon: 'pawn', kanji: '歩', real: 'Fu (Bauer)', lore: 'Klein, aber mutig. Geht nur 1 Feld geradeaus und schlägt auch geradeaus, nicht schräg wie im Schach.' },
      2: { name: 'Deutsch Kurzhaar', icon: 'lance', kanji: '香', real: 'Kyōsha (Lanze)', lore: 'Vorstehhund: zeigt starr geradeaus und prescht beliebig weit nach vorne, aber nie zurück oder zur Seite.' },
      3: { name: 'Jack Russell', icon: 'knight', kanji: '桂', real: 'Keima (Springer)', lore: 'Springt nur nach vorne: 2 vor, 1 zur Seite. Hüpft über andere drüber.' },
      4: { name: 'Border Collie', icon: 'silver', kanji: '銀', real: 'Ginshō (Silber)', lore: '1 Feld: nach vorne (3 Richtungen) oder schräg zurück. Nicht zur Seite, nicht gerade zurück.' },
      5: { name: 'Schäferhund', icon: 'gold', kanji: '金', real: 'Kinshō (Gold)', lore: '1 Feld in alle Richtungen außer schräg zurück. Treuester Wächter des Königs.' },
      6: { name: 'Pudel', icon: 'bishop', kanji: '角', real: 'Kakugyō (Läufer)', lore: 'Eleganter Zauberer der Diagonalen. Zieht beliebig weit schräg.' },
      7: { name: 'Husky', icon: 'rook', kanji: '飛', real: 'Hisha (Turm)', lore: 'Schlittenhund: zieht beliebig weit gerade in alle 4 Richtungen. Stärkste normale Einheit.' },
      8: { name: 'Corgi-König', icon: 'king', kanji: '玉', kanji2: '王', real: 'Ōshō (König)', lore: 'Dein König mit Krone. 1 Feld in jede Richtung. Wird er mattgesetzt, ist die Partie verloren.' },
      9: { name: 'Dackel-Held', icon: 'pawn', kanji: 'と', real: 'Tokin (befördert)', lore: 'Beförderter Dackel. Zieht wie ein Schäferhund. Wird er geschlagen, bekommt der Gegner nur einen Dackel.' },
      10: { name: 'Kurzhaar-Champion', icon: 'lance', kanji: '杏', real: 'Narikyō (befördert)', lore: 'Beförderter Kurzhaar. Zieht wie ein Schäferhund.' },
      11: { name: 'Terrier-Champion', icon: 'knight', kanji: '圭', real: 'Narikei (befördert)', lore: 'Beförderter Jack Russell. Zieht wie ein Schäferhund.' },
      12: { name: 'Collie-Champion', icon: 'silver', kanji: '全', real: 'Narigin (befördert)', lore: 'Beförderter Border Collie. Zieht wie ein Schäferhund.' },
      13: { name: 'Deutsche Dogge', icon: 'horse', kanji: '馬', real: 'Ryūma (Drachenpferd)', lore: 'Beförderter Pudel, groß wie ein Pferd: schräg beliebig weit + 1 Feld gerade.' },
      14: { name: 'Tibet-Mastiff', icon: 'dragon', kanji: '龍', real: 'Ryūō (Drachenkönig)', lore: 'Beförderter Husky mit Löwenmähne: gerade beliebig weit + 1 Feld schräg.' }
    },
    mentor: { name: 'Bello', title: 'Alter Leitwolf', icon: 'knight', color: '#e8b46a' }
  }
};

// Gegnernamen und Rangtitel pro Edition (Stärke und Rest wie feudal)
(function () {
  var F = THEMES.feudal, extra = {
    mecha: { opp: [['Schrott-Bot', 'Plünderer der Schrottzone'], ['Vex', 'Söldner-Pilotin'], ['Kade', 'Wächter des Außenpostens'], ['General Voss', 'Taktiker der Westflotte'], ['TITAN', 'Donner-Mainframe'], ['Der Schachmeister', 'Großmeister-KI']],
      titles: ['Kadett', 'Rekrut', 'Droidenführer', 'Droidenführer', 'Späher', 'Späher', 'Lancer', 'Lancer', 'Pilot', 'Pilot', 'Elitepilot', 'Elitepilot', 'Staffelführer', 'Staffelführer', 'General', 'Kommandant', 'Kommandant', 'Admiral'] },
    hunde: { opp: [['Struppi', 'Streuner vom Hinterhof'], ['Luna', 'Frisbee-Profi'], ['Rex', 'Wachhund vom Bauernhof'], ['Baron von Bulldogg', 'Champion aus dem Westen'], ['Donner', 'Donner-Bernhardiner'], ['Der Schachmeister', 'Großmeister-Pudel']],
      titles: ['Welpe', 'Welpe', 'Junghund', 'Junghund', 'Spürnase', 'Spürnase', 'Vorstehhund', 'Vorstehhund', 'Wachhund', 'Wachhund', 'Rudelführer', 'Rudelführer', 'Champion', 'Champion', 'Großchampion', 'Leitwolf', 'Leitwolf', 'Hundekönig'] },
    fantasy: { opp: [['Grimbald', 'Räuber vom Hohlweg'], ['Sira', 'Fahrende Klinge'], ['Sir Aldric', 'Ritter der Grenzfeste'], ['Herzog Morven', 'Feldherr aus dem Westen'], ['Ignatius', 'Donnerkönig'], ['Der Schachmeister', 'Großmeister des Westens']],
      titles: ['Bauer', 'Rekrut', 'Knappe', 'Knappe', 'Späher', 'Späher', 'Pikenier', 'Pikenier', 'Ritter', 'Ritter', 'Bannerritter', 'Bannerritter', 'Hauptmann', 'Hauptmann', 'Feldherr', 'Fürst', 'Fürst', 'König'] }
  };
  Object.keys(extra).forEach(function (k) {
    var T = THEMES[k], e = extra[k];
    T.opponents = F.opponents.map(function (o, i) { return Object.assign({}, o, { name: e.opp[i][0], title: e.opp[i][1] }); });
    T.ranks = F.ranks; T.rankTitles = e.titles;
  });
})();

// 2D-Steine: Schwarz (Sente, im 3D Gold) gegen Weiß (Gote), befördert rot wie echte Kanji
// Echte Steinschrift (Ka-hu, kanji_light, CC BY 4.0) als Maske: Kanji → Datei in img/koma/
var KOMA_MASK = { '歩': 'FU', '香': 'KY', '桂': 'KE', '銀': 'GI', '金': 'KI', '角': 'KA', '飛': 'HI', '王': 'OU', '玉': 'GY', 'と': 'TO', '杏': 'NY', '圭': 'NK', '全': 'NG', '馬': 'UM', '龍': 'RY', '竜': 'RY' };
// url() in einer CSS-Variable löst relativ zur style.css auf (css/), daher ../
function komaKanjiHTML(kan) { var m = KOMA_MASK[kan]; return m ? '<div class="koma-kanji km" role="img" aria-label="' + kan + '" style="--km:url(../img/koma/' + m + '.svg)"></div>' : '<div class="koma-kanji big">' + kan + '</div>'; }
function komaInk(t, col) { return t >= 9 ? (col === 0 ? '#ff6b5c' : '#c41e1e') : col === 0 ? '#ecd08a' : '#1b1b1b'; }
function unitSVG(theme, t, col, opts) {
  opts = opts || {};
  var u = theme.units[t], promoted = t >= 9, f = theme.factions[col];
  var color = promoted ? '#ffd76a' : '#f4ead2';
  var body = ICONS[u.icon];
  var badge = promoted && t <= 12 ? '<g transform="translate(64 2) scale(.34)" style="color:#ffd76a">' + ICONS.star + '</g>' : '';
  if (opts.color) color = opts.color;
  var size = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : '';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"' + size + ' style="color:' + color + '" color="' + color + '" fill="' + color + '">' + body.replace(/currentColor/g, color) + badge.replace(/currentColor/g, '#ffd76a') + '</svg>';
}
