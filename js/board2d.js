// 2D-Brett: DOM-Figuren + Canvas-Partikel. Gleiche Schnittstelle wie Board3D.
function Board2D(root, theme, settings) {
  this.root = root; this.theme = theme; this.settings = settings; this.flip = false; this.state = null; this.hl = {};
  this.onSquare = null; this.particles = []; this.alive = true;
  root.innerHTML = '';
  root.classList.add('b2');
  var frame = el('div', 'b2-frame'); root.appendChild(frame);
  this.gridEl = el('div', 'b2-grid'); frame.appendChild(this.gridEl);
  this.cells = []; var self0 = this;
  for (var i = 0; i < 81; i++) { var c = el('div', 'b2-cell'); c.dataset.i = i; this.gridEl.appendChild(c); this.cells.push(c); }
  [[3, 3], [3, 6], [6, 3], [6, 6]].forEach(function (p) { var h = el('div', 'b2-hoshi'); h.style.left = (p[1] / 9 * 100) + '%'; h.style.top = (p[0] / 9 * 100) + '%'; self0.gridEl.appendChild(h); });
  this.coords = el('div', 'b2-coords'); this.gridEl.appendChild(this.coords);
  this.piecesEl = el('div', 'b2-pieces'); this.gridEl.appendChild(this.piecesEl); // im Gitter, damit Steine genau auf den Feldern sitzen
  this.canvas = el('canvas', 'b2-fx'); frame.appendChild(this.canvas);
  this.frame = frame;
  var self = this;
  frame.addEventListener('pointerdown', function (e) {
    var r = self.gridEl.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (x < 0 || x >= 1 || y < 0 || y >= 1) return;
    var dc = Math.floor(x * 9), dr = Math.floor(y * 9), sq = self.flip ? (8 - dr) * 9 + (8 - dc) : dr * 9 + dc;
    if (self.onSquare) self.onSquare(sq);
  });
  this.resize();
  this._ro = new ResizeObserver(function () { self.resize(); }); this._ro.observe(root);
  requestAnimationFrame(function loop() { if (!self.alive) return; self.tickFx(); requestAnimationFrame(loop); });
}
function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

Board2D.prototype.resize = function () {
  var W = this.root.clientWidth, H = this.root.clientHeight;
  if (W && H) { var w = Math.min(W, H / 1.08); this.frame.style.width = w + 'px'; this.frame.style.height = (w * 1.08) + 'px'; }
  var r = this.gridEl.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  this.canvas.width = r.width * dpr; this.canvas.height = r.height * dpr; this.dpr = dpr; this.cw = r.width;
  this.renderCoords();
};
Board2D.prototype.renderCoords = function () {
  var h = '';
  for (var i = 0; i < 9; i++) {
    var file = this.flip ? i + 1 : 9 - i, rank = this.flip ? 9 - i : i + 1;
    h += '<span class="cf" style="left:' + ((i + .5) / 9 * 100) + '%">' + file + '</span>';
    h += '<span class="cr" style="top:' + ((i + .5) / 9 * 100) + '%">' + 'abcdefghi'[rank - 1] + '</span>';
  }
  this.coords.innerHTML = h;
};
Board2D.prototype.disp = function (sq) { var r = (sq / 9) | 0, c = sq % 9; return this.flip ? { r: 8 - r, c: 8 - c } : { r: r, c: c }; };
Board2D.prototype.screenPos = function (sq) {
  var d = this.disp(sq), fr = this.gridEl.getBoundingClientRect(), rr = this.root.getBoundingClientRect();
  return { x: fr.left - rr.left + (d.c + .5) / 9 * fr.width, y: fr.top - rr.top + (d.r + .5) / 9 * fr.height };
};
Board2D.prototype.setFlip = function (f) { this.flip = !!f; this.renderCoords(); if (this.state) this.sync(this.state); this.setHighlights(this.hl); };

Board2D.prototype.pieceEl = function (p) {
  // 2D immer wie echtes Shogi: nur das Kanji, groß über den ganzen Stein; kleine Figuren etwas kleiner
  var t = Math.abs(p), col = p > 0 ? 0 : 1, u = this.theme.units[t], style = 'kanji';
  var d = el('div', 'koma c' + col + (t >= 9 ? ' promo' : '') + (t === 8 ? ' king' : ''));
  d.style.setProperty('--s', { 1: .86, 2: .9, 3: .92, 4: .95, 5: .95 }[t] || 1);
  var kan = t === 8 && col === 1 ? (u.kanji2 || u.kanji) : u.kanji;
  var inner = '<div class="koma-in">';
  if (style !== 'kanji') inner += '<div class="koma-icon">' + unitSVG(this.theme, t, col, { color: komaInk(t, col) }) + '</div>';
  if (style !== 'icon') inner += style === 'kanji' ? komaKanjiHTML(kan) : '<div class="koma-kanji">' + kan + '</div>';
  inner += '</div>';
  d.innerHTML = inner;
  return d;
};
Board2D.prototype.place = function (d, sq, p) {
  var dp = this.disp(sq), col = p > 0 ? 0 : 1, rot = (col === 1) !== this.flip ? 180 : 0;
  d.style.left = (dp.c / 9 * 100) + '%'; d.style.top = (dp.r / 9 * 100) + '%';
  d.style.setProperty('--rot', rot + 'deg');
};
Board2D.prototype.sync = function (state) {
  this.state = state; this.piecesEl.innerHTML = ''; this.pieceEls = {};
  for (var q = 0; q < 81; q++) {
    var p = state.board[q]; if (!p) continue;
    var d = this.pieceEl(p); this.place(d, q, p); this.piecesEl.appendChild(d); this.pieceEls[q] = d;
  }
};
Board2D.prototype.setHighlights = function (h) {
  this.hl = h || {}; h = this.hl;
  var cls = new Array(81).fill('');
  function add(sq, c) { if (sq >= 0 && sq < 81) cls[sq] += ' ' + c; }
  (h.threats || []).forEach(function (s) { add(s, 'threat'); });
  (h.dropDanger || []).forEach(function (s) { add(s, 'dropdanger'); });
  if (h.last) { add(h.last.from, 'last'); add(h.last.to, 'last'); }
  if (h.hint) { add(h.hint.from, 'hint'); add(h.hint.to, 'hint'); }
  (h.marks || []).forEach(function (s) { add(s, 'mark'); });
  (h.targets || []).forEach(function (s) { add(s, 'target'); });
  (h.captures || []).forEach(function (s) { add(s, 'capt'); });
  add(h.selected, 'sel'); add(h.checkSq, 'check');
  for (var q = 0; q < 81; q++) {
    var dp = this.disp(q), cell = this.cells[dp.r * 9 + dp.c];
    cell.className = 'b2-cell' + cls[q];
  }
};

// Animation eines Zuges. info: {from, to, drop, col, cap, promo, state(after)}
Board2D.prototype.animate = function (info) {
  var self = this, after = info.state;
  return new Promise(function (resolve) {
    var fromPos, toPos = self.screenPos(info.to), cell = self.cw / 9;
    if (info.drop) {
      var hand = document.querySelector('.hand-slot[data-col="' + info.col + '"][data-t="' + info.drop + '"]');
      var rr = self.root.getBoundingClientRect();
      if (hand) { var hr = hand.getBoundingClientRect(); fromPos = { x: hr.left - rr.left + hr.width / 2, y: hr.top - rr.top + hr.height / 2 }; }
      else fromPos = { x: toPos.x, y: toPos.y - cell * 3 };
    } else fromPos = self.screenPos(info.from);
    var oldEl = info.drop ? null : self.pieceEls[info.from];
    var capEl = self.pieceEls[info.to];
    // Neues Stück (ggf. befördert) an Zielposition, von alter Position her animieren
    var p = after.board[info.to], d = self.pieceEl(info.promo ? (p > 0 ? Shogi.BASE[p] : -Shogi.BASE[-p]) : p);
    self.place(d, info.to, p); self.piecesEl.appendChild(d);
    if (oldEl) oldEl.remove();
    var dx = fromPos.x - toPos.x, dy = fromPos.y - toPos.y, rot = getComputedStyle(d).getPropertyValue('--rot').trim() || '0deg';
    var hop = info.drop ? 0.6 : 0.25, ks = +(d.style.getPropertyValue('--s') || 1);
    d.style.zIndex = 50;
    var anim = d.animate([
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + ') scale(' + (info.drop ? 0.4 : ks) + ')', opacity: info.drop ? 0 : 1 },
      { transform: 'translate(' + dx / 2 + 'px,' + (dy / 2 - cell * hop) + 'px) rotate(' + rot + ') scale(' + 1.28 * ks + ')', opacity: 1, offset: 0.55 },
      { transform: 'translate(0,0) rotate(' + rot + ') scale(' + ks + ')', opacity: 1 }
    ], { duration: info.drop ? 420 : 260, easing: 'cubic-bezier(.3,.7,.4,1)' });
    anim.onfinish = function () {
      d.style.zIndex = '';
      var f = self.theme.factions[info.col];
      if (capEl) {
        capEl.classList.add('dying'); setTimeout(function () { capEl.remove(); }, 400);
        self.burst(toPos.x, toPos.y, f.color, 34, 5.5); self.burst(toPos.x, toPos.y, '#fff3c4', 14, 3);
        self.ring(toPos.x, toPos.y, f.color);
      } else self.burst(toPos.x, toPos.y, 'rgba(230,210,170,.9)', 8, 1.6, true);
      var finish = function () { self.sync(after); self.setHighlights(self.hl); resolve(); };
      if (info.promo) {
        // Beförderung: Figur dreht sich um wie ein echter Spielstein
        var nd = self.pieceEls[info.to] || d;
        d.animate([{ transform: 'rotate(' + rot + ') rotateY(0deg) scale(1.2)' }, { transform: 'rotate(' + rot + ') rotateY(90deg) scale(1.4)' }], { duration: 160 }).onfinish = function () {
          var pd = self.pieceEl(p); self.place(pd, info.to, p); d.replaceWith(pd); self.pieceEls[info.to] = pd;
          pd.animate([{ transform: 'rotate(' + rot + ') rotateY(90deg) scale(1.4)', filter: 'brightness(3)' }, { transform: 'rotate(' + rot + ') rotateY(0deg) scale(1)', filter: 'brightness(1)' }], { duration: 260 }).onfinish = finish;
          self.pillar(toPos.x, toPos.y);
          self.burst(toPos.x, toPos.y, '#ffd76a', 40, 4);
        };
      } else finish();
    };
  });
};

// ---------- Partikel ----------
Board2D.prototype.burst = function (x, y, color, n, speed, dust) {
  var fr = this.gridEl.getBoundingClientRect(), rr = this.root.getBoundingClientRect(); x -= fr.left - rr.left; y -= fr.top - rr.top;
  for (var i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2, v = (0.4 + Math.random()) * speed;
    this.particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (dust ? 0.5 : 1), life: 1, decay: 0.015 + Math.random() * 0.03, size: dust ? 3 + Math.random() * 3 : 1.5 + Math.random() * 3, color: color, g: dust ? 0.02 : 0.12 });
  }
};
Board2D.prototype.ring = function (x, y, color) { var fr = this.gridEl.getBoundingClientRect(), rr = this.root.getBoundingClientRect(); this.particles.push({ ring: true, x: x - (fr.left - rr.left), y: y - (fr.top - rr.top), r: 4, life: 1, decay: 0.04, color: color }); };
Board2D.prototype.pillar = function (x, y) { var fr = this.gridEl.getBoundingClientRect(), rr = this.root.getBoundingClientRect(); this.particles.push({ pillar: true, x: x - (fr.left - rr.left), y: y - (fr.top - rr.top), life: 1, decay: 0.025 }); };
Board2D.prototype.fx = function (name, sq) {
  var p = this.screenPos(sq);
  if (name === 'check') { this.ring(p.x, p.y, '#ff3030'); this.ring(p.x, p.y, '#ff9090'); }
  if (name === 'mate') { for (var i = 0; i < 4; i++) this.burst(p.x, p.y, ['#ffd76a', '#ff5a4e', '#fff', '#46d7ff'][i], 40, 7); this.ring(p.x, p.y, '#ffd76a'); }
  if (name === 'sparkle') this.burst(p.x, p.y, '#ffd76a', 20, 3);
};
Board2D.prototype.tickFx = function () {
  // Akku: ohne Partikel nichts zeichnen (nur einmal leeren, dann Ruhe)
  if (!this.particles.length && this._clean) return;
  var c = this.canvas, g = c.getContext('2d'), dpr = this.dpr || 1;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, c.width, c.height);
  this._clean = !this.particles.length; if (this._clean) return;
  g.globalCompositeOperation = 'lighter';
  var cell = this.cw / 9;
  this.particles = this.particles.filter(function (p) {
    p.life -= p.decay; if (p.life <= 0) return false;
    if (p.ring) { p.r += cell * 0.09; g.strokeStyle = p.color; g.globalAlpha = p.life; g.lineWidth = 3 * p.life + 1; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.stroke(); return true; }
    if (p.pillar) { var w = cell * 0.9 * p.life, grd = g.createLinearGradient(0, 0, 0, p.y); grd.addColorStop(0, 'rgba(255,215,106,0)'); grd.addColorStop(1, 'rgba(255,215,106,' + (0.7 * p.life) + ')'); g.fillStyle = grd; g.globalAlpha = 1; g.fillRect(p.x - w / 2, 0, w, p.y + cell * 0.4); return true; }
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.97;
    g.globalAlpha = Math.min(1, p.life * 1.4); g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size * (0.5 + p.life * 0.5), 0, 7); g.fill();
    return true;
  });
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
};
Board2D.prototype.destroy = function () { this.alive = false; this._ro && this._ro.disconnect(); this.root.classList.remove('b2'); this.root.innerHTML = ''; };
