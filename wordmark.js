const R = (x, y, w, h) => ['r', x, y, w, h], P = (...p) => ['p', p];
export const GLYPHS = {
  G: [R(0, 0, 1.1, 6), R(0, 4.9, 4, 1.1), R(0, 0, 4, 1.1), R(2.9, 0, 1.1, 3.1), R(2, 2.1, 2, 1)],
  R: [R(0, 0, 1.1, 6), R(0, 4.9, 3.6, 1.1), R(2.9, 2.9, 1.1, 3.1), R(0, 2.5, 3.6, 1), P([1.7, 2.7], [3, 2.7], [4.1, 0], [2.8, 0])],
  A: [P([0, 0], [1.2, 0], [2.6, 6], [1.4, 6]), P([4, 0], [2.8, 0], [1.4, 6], [2.6, 6]), R(0.9, 1.5, 2.2, 1)],
  N: [R(0, 0, 1.1, 6), R(2.9, 0, 1.1, 6), P([0, 6], [1.3, 6], [4, 0], [2.7, 0])],
  D: [R(0, 0, 1.1, 6), R(0, 4.9, 3.1, 1.1), R(0, 0, 3.1, 1.1), R(2.9, 0.9, 1.1, 4.2), P([2.6, 6], [3.2, 6], [4, 5.1], [4, 4.4]), P([2.6, 0], [3.2, 0], [4, 0.9], [4, 1.6])],
  C: [R(0, 0, 1.1, 6), R(0, 4.9, 4, 1.1), R(0, 0, 4, 1.1), R(2.9, 4.2, 1.1, 1.8), R(2.9, 0, 1.1, 1.8)],
  F: [R(0, 0, 1.1, 6), R(0, 4.9, 4, 1.1), R(0, 2.5, 3.1, 1)],
  T: [R(1.45, 0, 1.1, 6), R(0, 4.9, 4, 1.1)],
  U: [R(0, 0, 1.1, 6), R(2.9, 0, 1.1, 6), R(0, 0, 4, 1.1)],
  O: [R(0, 0, 1.1, 6), R(2.9, 0, 1.1, 6), R(0, 0, 4, 1.1), R(0, 4.9, 4, 1.1)],
};
export const WORDS = [['GRAND', '#ff8fa3'], ['CRAFT', '#fdf0d8'], ['AUTO', '#46c6c0']];
export const SLANT = 0.16;
export function strokeGlyph(g, ch, grow = 0) {
  for (const s of GLYPHS[ch]) {
    g.beginPath();
    if (s[0] === 'r') { const [, x, y, w, h] = s; if (g.roundRect) g.roundRect(x - grow, y - grow, w + 2 * grow, h + 2 * grow, 0.22 + grow); else g.rect(x - grow, y - grow, w + 2 * grow, h + 2 * grow); }
    else { s[1].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); if (grow) { g.lineWidth = grow * 2; g.lineJoin = 'round'; g.strokeStyle = g.fillStyle; g.stroke(); } }
    g.fill();
  }
}
export function drawWordmark(canvas, sheet = null) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height, u = Math.min(W / 30, H / 26);
  g.clearRect(0, 0, W, H);
  WORDS.forEach(([word, col], row) => {
    const wd = word.length * 4.9 - 0.9, x0 = (W / u - wd) / 2 + (row - 1) * 1.2, y0 = 25 - row * 8;
    [...word].forEach((ch, i) => {
      for (const [dx, dy, c, grow] of [[0.5, -0.55, 'rgba(20,10,40,0.35)', 0.5], [0, 0, '#2a2146', 0.42], [-0.12, 0.16, col, 0]]) {
        g.save(); g.setTransform(u, 0, 0, -u, (x0 + i * 4.9 + dx) * u, (y0 + dy) * u); g.transform(1, 0, SLANT, 1, 0, 0); g.rotate(((i * 7 + row * 3) % 5 - 2) * 0.012); g.fillStyle = c; strokeGlyph(g, ch, grow); g.restore();
      }
    });
  });
  if (sheet) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.5; g.fillStyle = g.createPattern(sheet, 'repeat'); g.globalCompositeOperation = 'multiply'; g.fillRect(0, 0, W, H); g.restore(); }
}
