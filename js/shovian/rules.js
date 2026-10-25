// Shovian: Völker, Truppen, Tiere (Werte wie Travian Legends, aus dem Kopf; vor dem Bauen gegen kirilloid.ru prüfen).
// a = Angriff, vi/vk = Verteidigung gegen Infanterie/Kavallerie, cav = Kavallerie, cost = Ausbildungskosten (Summe Rohstoffe),
// mv = Shogi-Zug (fu, ky, ke, gi, ki, ka, hi, ou), ico = Symbol, ranged = Katapult (schießt), ram = Rammbock (Bonus gegen Mauer)
var SV = (function () {
  var TRIBES = {
    rom: { name: 'Römer', wall: 0.03, wallName: 'Stadtmauer', units: {
      legion: { n: 'Legionär', a: 40, vi: 35, vk: 50, cost: 400, mv: 'fu', ico: 'spear' },
      praet: { n: 'Prätorianer', a: 30, vi: 65, vk: 35, cost: 460, mv: 'ki', ico: 'shield' },
      imper: { n: 'Imperianer', a: 70, vi: 40, vk: 25, cost: 600, mv: 'gi', ico: 'sword' },
      eimp: { n: 'Equites Imperatoris', a: 120, vi: 65, vk: 50, cost: 1410, mv: 'ke', ico: 'horse', cav: true },
      ecaes: { n: 'Equites Caesaris', a: 180, vi: 80, vk: 105, cost: 2170, mv: 'hi', ico: 'horse2', cav: true },
      ram: { n: 'Rammbock', a: 60, vi: 30, vk: 75, cost: 1830, mv: 'ky', ico: 'ram', ram: true },
      cata: { n: 'Feuerkatapult', a: 75, vi: 60, vk: 10, cost: 2990, mv: 'ka', ico: 'cata', ranged: true },
      senat: { n: 'Senator', a: 50, vi: 40, vk: 30, cost: 4000, mv: 'ki', ico: 'banner', chief: true }
    } },
    gal: { name: 'Gallier', wall: 0.025, wallName: 'Palisade', units: {
      phal: { n: 'Phalanx', a: 15, vi: 40, vk: 50, cost: 315, mv: 'fu', ico: 'spear' },
      sword: { n: 'Schwertkämpfer', a: 65, vi: 35, vk: 20, cost: 535, mv: 'gi', ico: 'sword' },
      tt: { n: 'Theutates Blitz', a: 100, vi: 25, vk: 40, cost: 1090, mv: 'ke', ico: 'horse', cav: true },
      druid: { n: 'Druidenreiter', a: 45, vi: 115, vk: 55, cost: 1090, mv: 'ki', ico: 'shield', cav: true },
      haed: { n: 'Haeduaner', a: 140, vi: 50, vk: 165, cost: 1965, mv: 'hi', ico: 'horse2', cav: true },
      ram: { n: 'Rammholz', a: 50, vi: 30, vk: 105, cost: 1910, mv: 'ky', ico: 'ram', ram: true },
      cata: { n: 'Kriegskatapult', a: 70, vi: 45, vk: 10, cost: 3130, mv: 'ka', ico: 'cata', ranged: true },
      chief: { n: 'Häuptling', a: 40, vi: 50, vk: 50, cost: 4000, mv: 'ki', ico: 'banner', chief: true }
    } },
    teu: { name: 'Germanen', wall: 0.02, wallName: 'Erdwall', units: {
      club: { n: 'Keulenschwinger', a: 40, vi: 20, vk: 5, cost: 250, mv: 'fu', ico: 'club' },
      spear: { n: 'Speerkämpfer', a: 10, vi: 35, vk: 60, cost: 340, mv: 'ki', ico: 'spear' },
      axe: { n: 'Axtkämpfer', a: 60, vi: 30, vk: 30, cost: 490, mv: 'gi', ico: 'axe' },
      pala: { n: 'Paladin', a: 55, vi: 100, vk: 40, cost: 1440, mv: 'ke', ico: 'horse', cav: true },
      tk: { n: 'Teutonen-Reiter', a: 150, vi: 50, vk: 75, cost: 1845, mv: 'hi', ico: 'horse2', cav: true },
      ram: { n: 'Ramme', a: 65, vi: 30, vk: 80, cost: 1720, mv: 'ky', ico: 'ram', ram: true },
      cata: { n: 'Katapult', a: 50, vi: 60, vk: 10, cost: 2760, mv: 'ka', ico: 'cata', ranged: true },
      chief: { n: 'Stammesführer', a: 40, vi: 60, vk: 40, cost: 4000, mv: 'ki', ico: 'banner', chief: true }
    } },
    nat: { name: 'Natur', wall: 0, wallName: '', units: {
      rat: { n: 'Ratte', a: 10, vi: 25, vk: 20, cost: 110, mv: 'fu', ico: 'paw' },
      spider: { n: 'Spinne', a: 20, vi: 35, vk: 40, cost: 190, mv: 'fu', ico: 'paw' },
      snake: { n: 'Schlange', a: 60, vi: 40, vk: 60, cost: 320, mv: 'gi', ico: 'paw' },
      bat: { n: 'Fledermaus', a: 80, vi: 66, vk: 50, cost: 390, mv: 'ke', ico: 'paw' },
      boar: { n: 'Wildschwein', a: 50, vi: 70, vk: 33, cost: 310, mv: 'ky', ico: 'paw' },
      wolf: { n: 'Wolf', a: 100, vi: 80, vk: 70, cost: 500, mv: 'gi', ico: 'paw' },
      bear: { n: 'Bär', a: 250, vi: 140, vk: 200, cost: 1180, mv: 'ki', ico: 'paw' },
      croc: { n: 'Krokodil', a: 450, vi: 380, vk: 240, cost: 2140, mv: 'ki', ico: 'paw' },
      tiger: { n: 'Tiger', a: 200, vi: 170, vk: 250, cost: 1240, mv: 'ka', ico: 'paw' },
      eleph: { n: 'Elefant', a: 600, vi: 440, vk: 520, cost: 3120, mv: 'hi', ico: 'paw' }
    } }
  };
  // Held (Prototyp: feste Stufe), zieht wie der König, Leben = Kampfkraft
  var HERO = { n: 'Held', a: 500, vi: 500, vk: 500, cost: 2500, mv: 'ou', ico: 'crown', hero: true };

  // Shogi-Züge aus Sicht von Seite 0 (vorwärts = y-1); Schritte [dx, dy], Gleiter als Richtungen
  var STEP = {
    fu: [[0, -1]], ke: [[-1, -2], [1, -2]],
    gi: [[-1, -1], [0, -1], [1, -1], [-1, 1], [1, 1]],
    ki: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]],
    ou: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
    ka: [], hi: [], ky: [], um: [[0, -1], [-1, 0], [1, 0], [0, 1]], ry: [[-1, -1], [1, -1], [-1, 1], [1, 1]]
  };
  var SLIDE = { ky: [[0, -1]], ka: [[-1, -1], [1, -1], [-1, 1], [1, 1]], hi: [[0, -1], [-1, 0], [1, 0], [0, 1]], um: [[-1, -1], [1, -1], [-1, 1], [1, 1]], ry: [[0, -1], [-1, 0], [1, 0], [0, 1]] };
  // Beförderung: fu/ky/ke/gi werden Gold, Läufer → Drachenpferd (um), Turm → Drachenkönig (ry)
  var PROMO = { fu: 'ki', ky: 'ki', ke: 'ki', gi: 'ki', ka: 'um', hi: 'ry' };
  var KANJI = { fu: '歩', ky: '香', ke: '桂', gi: '銀', ki: '金', ka: '角', hi: '飛', ou: '王', um: '馬', ry: '龍' };
  var MVNAME = { fu: 'Fu: 1 Feld vor', ky: 'Lanze: beliebig weit geradeaus', ke: 'Springer: 2 vor, 1 seitlich (springt)', gi: 'Silber: diagonal + vor', ki: 'Gold: alles außer diagonal zurück', ka: 'Läufer: diagonal beliebig weit', hi: 'Turm: gerade beliebig weit', ou: 'König: 1 Feld in jede Richtung', um: 'Drachenpferd: Läufer + 1 gerade', ry: 'Drachenkönig: Turm + 1 diagonal' };

  function unit(tribe, key) { return key === 'hero' ? HERO : TRIBES[tribe].units[key]; }
  return { TRIBES: TRIBES, HERO: HERO, STEP: STEP, SLIDE: SLIDE, PROMO: PROMO, KANJI: KANJI, MVNAME: MVNAME, unit: unit };
})();
if (typeof module !== 'undefined') module.exports = SV;
