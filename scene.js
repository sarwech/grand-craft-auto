import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { makeCard, prismFold, hinge, platform, paperMaterial } from 'papercraft/lib/paperkit-3d.js';
import { createLife } from 'papercraft/lib/paper-life.js';
import { createHarness, MOODS } from './harness.js';
import { makeBigDoll } from './figures.js';
import { createTalk } from './talk.js';
import { createSound } from './sound.js';
import { foldOut, laneCheck, flight, pageEdges } from './world.js';
import { GLYPHS, WORDS, SLANT, strokeGlyph, drawWordmark } from './wordmark.js';
import PEOPLE from './people.js';

const C = {
  sea: '#2f9aa0', seaDeep: '#1f7a8c', seaLight: '#63c7c0', foam: '#fff1dc', sand: '#f4b6a2', sandLight: '#fbd3bd',
  board: '#d8a878', boardDark: '#b98458', lawn: '#8fc4a4', pave: '#ead2cf', paveDark: '#d9bcc2', road: '#7d6f9c', roadLine: '#fbe6b8',
  pink: '#ff8fa3', coral: '#f0705e', teal: '#1fa39c', turq: '#46c6c0', lilac: '#b79be0', cream: '#fdf0d8', orange: '#ff9a4d', navy: '#2a2146', gold: '#f2b84b',
  palm: '#2f8f7f', palmB: '#49ab8c', trunk: '#a8704e', neon: '#ffd98a',
};
const s01 = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const bend = (x) => (x > 105 ? 11 * Math.sin((x - 105) * 0.028) * s01((x - 105) / 45) : 0);
const baseZ = (x) => 0.5 + 2.6 * Math.sin(x * 0.075) + 1.4 * Math.sin(x * 0.17 + 1);
const boardZ = (x) => baseZ(x) + bend(x);
const roadZ = (x) => baseZ(x) * 0.35 - 13.6 + bend(x);
const MX = 372, PAGE = { x0: -142, x1: 412 };
const shoreZ = (x) => baseZ(x) * 0.6 + 14.5 + 1.2 * Math.sin(x * 0.11) + bend(x) - 8.5 * s01((x - (MX - 34)) / 16);
const HERO_AT = [0, boardZ(0) + 2.3];
const BEA_X = 63, PIER = { x: MX, d: 19, w: 5.6, h: 0.46 }; PIER.z = boardZ(MX) + 3.3 + PIER.d;
const SPOT = {
  marisol: { at: [5.9, boardZ(5.9) - 2.6], spot: [-1.5, boardZ(-1.5) + 1.2], hail: 9, yaw: -0.5 },
  bea: { at: [BEA_X - 2.2, roadZ(BEA_X) + 6.6], spot: [BEA_X - 8.2, roadZ(BEA_X) + 8.2], hail: 9.5, yaw: 0.2 },
  lenny: { at: [PIER.x + 1.0, PIER.z - 6.5], spot: [PIER.x - 1.3, PIER.z - 12.4], hail: 8.5, yaw: 0, deck: [1.0, -6.5], lift: PIER.h + 0.18 },
};

const H = createHarness({
  ground: C.sea, stock: '#fbf2e6', play: true, mood: 'dusk',
  moods: { ...MOODS, dusk: { ...MOODS.dusk, ki: 3.3, fi: 1.5, leak: '#7a4a9a', post: { ...MOODS.dusk.post, exposure: 1.02, haze: '#f0a48c', hazeStart: 60, hazeEnd: 190, hazeAmount: 0.34, vignette: 0.1, vignetteColor: '#201040', shadowTint: '#2a1a5a' } } },
  view: { pitch: 37, dist: 60, target: [HERO_AT[0], 1.5, HERO_AT[1] - 12.5], follow: [0, -13.6] },
  bounds: { x0: -152, x1: 422, z0: -74, z1: 76 },
  walkArea: { x0: PAGE.x0 + 1.5, x1: PAGE.x1 - 1.5, z0: -42, z1: 40 },
  subject: HERO_AT,
  light: { distance: 130, shadowExtent: 60 },
  lens: { aoTint: '#4a2c6a', greenDesat: 0.05, saturation: 1.04, focusBand: 0.56, ramp: 0.4, depthWeight: 0.5 },
});
const { walk, flags, THREE } = H;
const D = P2.draw2;
const SFX = createSound({ birds: false });
let rnd = P2.rng(2026);
const between = (a, b) => a + rnd() * (b - a);
const pick = (a) => a[Math.floor(rnd() * a.length) % a.length];
const turn = P2.rng(99);
const popup = (pts, paint, o = {}) => H.popup(pts, paint, { ...o, yaw: o.yaw ?? (o.node ? 0 : o.cross ? (turn() < 0.5 ? -1 : 1) * (0.3 + turn() * 0.25) : (turn() - 0.5) * 0.36) });
const SOLIDS = [];
const solid = (x, z, r) => { SOLIDS.push([x, z, r]); walk.solid(x, z, r); };
const xs = []; for (let x = -146; x <= 416; x += 6) xs.push(x);
const LANE = P2.pathLine(xs.map((x) => [x, boardZ(x)]));
const band = (fz, x0, x1, step = 2) => { const p = []; for (let x = x0; x <= x1; x += step) p.push([x, fz(x)]); return p; };
const strip = (f0, f1, x0 = -152, x1 = 422) => [...band(f0, x0, x1), ...band(f1, x0, x1).reverse()];

H.printGround(({ g, ppu, X, Z, rnd: gr, washes, torn, line }) => {
  washes([C.seaDeep, C.seaLight, C.sea, C.seaDeep]);
  for (let k = 0; k < 5200; k++) { const x = -152 + gr() * 574, z = shoreZ(x) + 1 + gr() * 58, l = (0.6 + gr() * 1.6) * ppu; g.strokeStyle = P2.rgba(gr() < 0.7 ? C.foam : C.seaDeep, 0.5); g.lineWidth = 0.12 * ppu; g.beginPath(); g.moveTo(X(x) - l / 2, Z(z)); g.quadraticCurveTo(X(x), Z(z) - 0.16 * ppu, X(x) + l / 2, Z(z)); g.stroke(); }
  torn(strip((x) => shoreZ(x) + 1.1, (x) => boardZ(x)), C.foam, 'rgba(255,250,240,0.9)');
  torn(strip((x) => shoreZ(x), (x) => boardZ(x)), C.sand, 'rgba(255,240,225,0.7)');
  torn(strip((x) => shoreZ(x) - 3.2, (x) => boardZ(x)), C.sandLight, 'rgba(255,240,225,0)');
  for (let k = 0; k < 80; k++) { const x = -140 + gr() * 480, z = boardZ(x) + 5.5 + gr() * (shoreZ(x) - boardZ(x) - 8), a = gr() * 0.8 - 0.4; g.save(); g.translate(X(x), Z(z)); g.rotate(a); g.fillStyle = [C.turq, C.pink, C.orange, C.lilac][k % 4]; g.fillRect(-1.1 * ppu, -0.55 * ppu, 2.2 * ppu, 1.1 * ppu); g.fillStyle = C.cream; for (let q = -2; q <= 2; q += 2) g.fillRect(q * 0.4 * ppu - 0.12 * ppu, -0.55 * ppu, 0.24 * ppu, 1.1 * ppu); g.restore(); }
  torn(strip((x) => boardZ(x) - 3.4, () => -74), C.pave, 'rgba(255,245,235,0.5)');
  for (let gx = -150; gx < 420; gx += 3.2) for (let gz = -72; gz < roadZ(gx) - 5.5; gz += 3.2) { if (gr() < 0.5) continue; g.fillStyle = P2.rgba(gr() < 0.5 ? C.paveDark : '#f6e2dc', 0.5); g.fillRect(X(gx) + 2, Z(gz) + 2, 3.2 * ppu - 4, 3.2 * ppu - 4); }
  torn(strip((x) => boardZ(x) - 3.2, (x) => roadZ(x) + 4.8), C.lawn, 'rgba(240,250,235,0.6)');
  for (let k = 0; k < 4400; k++) { const x = -152 + gr() * 574, z = roadZ(x) + 5.2 + gr() * (boardZ(x) - 3.6 - roadZ(x) - 5.2); g.strokeStyle = P2.rgba(gr() < 0.5 ? '#6faf8c' : '#b5dcbc', 0.8); g.lineWidth = 1.6; g.beginPath(); g.moveTo(X(x), Z(z)); g.lineTo(X(x) + (gr() - 0.5) * 3, Z(z) - 4 - gr() * 4); g.stroke(); }
  torn(strip((x) => roadZ(x) + 5.0, (x) => roadZ(x) - 5.0), C.cream, 'rgba(255,250,240,0.6)');
  torn(strip((x) => roadZ(x) + 4.5, (x) => roadZ(x) - 4.5), C.road, 'rgba(255,250,240,0)');
  g.setLineDash([1.8 * ppu, 1.5 * ppu]); line(band(roadZ, -152, 422), 0.22, C.roadLine); g.setLineDash([]);
  for (let x = -146; x < 418; x += 11) { g.fillStyle = P2.rgba(C.cream, 0.5); g.fillRect(X(x), Z(roadZ(x) + 3.1), 0.2 * ppu, 1.3 * ppu); }
  torn(strip((x) => boardZ(x) + 3.5, (x) => boardZ(x) - 3.5), C.board, 'rgba(255,240,220,0.6)');
  for (let i = 1; i < LANE.pts.length - 1; i += 2) { const [x, z] = LANE.pts[i], tx = LANE.pts[i + 1][0] - LANE.pts[i - 1][0], tz = LANE.pts[i + 1][1] - LANE.pts[i - 1][1], n = Math.hypot(tx, tz); g.strokeStyle = P2.rgba(i % 6 ? C.boardDark : '#f0c89c', 0.55); g.lineWidth = 0.09 * ppu; g.beginPath(); g.moveTo(X(x - tz / n * 3.3), Z(z + tx / n * 3.3)); g.lineTo(X(x + tz / n * 3.3), Z(z - tx / n * 3.3)); g.stroke(); }
  { g.fillStyle = P2.rgba('#ffcf9a', 0.28); g.beginPath(); g.moveTo(X(57), Z(74)); g.lineTo(X(83), Z(74)); g.lineTo(X(76), Z(shoreZ(70) + 30)); g.lineTo(X(64), Z(shoreZ(70) + 30)); g.closePath(); g.fill(); }
  for (const s of [-1, 1]) line(band((x) => boardZ(x) + s * 3.3, -152, 422), 0.16, P2.rgba(C.boardDark, 0.7));
});

const arc = (cx, cy, rx, ry, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const ICON = {
  flamingo: (g) => { g.beginPath(); g.ellipse(0.1, 0.1, 0.55, 0.36, 0, 0, 7); g.fill(); g.lineWidth = 0.16; g.lineCap = 'round'; g.beginPath(); g.moveTo(-0.3, 0.3); g.quadraticCurveTo(-0.9, 0.8, -0.45, 1.15); g.stroke(); g.beginPath(); g.moveTo(0.1, -0.2); g.lineTo(0.1, -0.9); g.stroke(); },
  palm: (g) => { g.lineWidth = 0.16; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -0.9); g.quadraticCurveTo(0.2, 0, 0, 0.5); g.stroke(); for (const a of [0.3, 1.0, 1.7, 2.4, 3.0]) { g.beginPath(); g.moveTo(0, 0.5); g.quadraticCurveTo(Math.cos(a) * 0.6, 0.5 + Math.sin(a) * 0.7, Math.cos(a) * 1.0, 0.45 + Math.sin(a) * 0.35); g.stroke(); } },
  sun: (g) => { g.beginPath(); g.arc(0, -0.3, 0.6, 0, Math.PI); g.fill(); g.lineWidth = 0.12; for (let k = 0; k < 5; k++) { const a = 0.3 + k * 0.63; g.beginPath(); g.moveTo(Math.cos(a) * 0.8, -0.3 + Math.sin(a) * 0.8); g.lineTo(Math.cos(a) * 1.15, -0.3 + Math.sin(a) * 1.15); g.stroke(); } },
  star: (g) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 + Math.PI / 2, r = k % 2 ? 0.42 : 1.0; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); },
  glass: (g) => { g.beginPath(); g.moveTo(-0.7, 0.8); g.lineTo(0.7, 0.8); g.lineTo(0, 0); g.closePath(); g.fill(); g.lineWidth = 0.13; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -0.8); g.moveTo(-0.4, -0.8); g.lineTo(0.4, -0.8); g.stroke(); },
};
const LIFE = { flowers: [] };

const SIGNS = [];
let _halo = null;
const haloTex = () => { if (_halo) return _halo; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); _halo = new THREE.CanvasTexture(c); return _halo; };
function hotel(x, o) {
  const { w, h, d = 9, wall, accent, trim, icon, seed } = o, z = o.z ?? -23.4, floors = Math.max(2, Math.floor((h - 3.6) / 2.5)), print = H.cardOpts(x, z, 1, null, 1.1);
  const front = (P) => {
    P.gradient(P2.shade(wall, 0.08), P2.shade(wall, -0.1), 0.4); P.felt(0.7);
    P.layer((g) => { g.fillRect(-w / 2 - 1, h - 0.7, w + 2, 2); for (let f = 1; f <= floors; f++) g.fillRect(-w / 2 - 1, 3.4 + f * 2.5 - 0.22, w + 2, 0.22); }, trim, { depth: 0.8 });
    P.layer((g) => { g.beginPath(); g.roundRect(-1.5, 0, 3.0, h + 2, 0.5); g.fill(); }, accent, { depth: 1.1 });
    P.layer((g) => { for (const sx of [-0.62, 0, 0.62]) g.fillRect(sx - 0.14, 3.6, 0.28, h); }, P2.shade(accent, 0.3), { depth: 0.5 });
    const panes = (g) => { for (let f = 0; f < floors; f++) for (const sd of [-1, 1]) for (let k = 0; k < Math.floor((w / 2 - 2.6) / 2.1); k++) { g.beginPath(); g.roundRect(sd * (2.5 + k * 2.1) - (sd < 0 ? 1.5 : 0), 4.2 + f * 2.5, 1.5, 1.5, 0.3); g.fill(); } };
    P.layer((g) => { g.translate(0, -0.14); panes(g); }, C.cream, { depth: 0.6 });
    P.layer(panes, C.neon, { lip: 0, shade: 0.5, depth: 0.4 }); P.glow((g) => { g.globalAlpha = 0.85; panes(g); });
    P.layer((g) => { g.beginPath(); g.roundRect(-w / 2 + 0.6, 0, w - 1.2, 3.1, 0.2); g.fill(); }, P2.shade(wall, -0.16), { depth: 0.7 });
    const door = (g) => { g.beginPath(); g.roundRect(-0.9, 0, 1.8, 2.5, [0.9, 0.9, 0, 0]); g.fill(); for (const sd of [-1, 1]) g.fillRect(sd * (w / 4 + 0.6) - 1.6, 0.6, 3.2, 1.7); };
    P.layer(door, C.neon, { lip: 0, depth: 0.5 }); P.glow((g) => { g.globalAlpha = 0.7; door(g); });
    P.layer((g) => { const n = Math.round(w / 1.3); for (let k = 0; k < n; k++) { g.fillStyle = k % 2 ? C.cream : accent; g.beginPath(); g.moveTo(-w / 2 + k * w / n, 3.5); g.lineTo(-w / 2 + (k + 1) * w / n, 3.5); g.lineTo(-w / 2 + (k + 1) * w / n, 2.75); g.lineTo(-w / 2 + (k + 0.5) * w / n, 2.45); g.lineTo(-w / 2 + k * w / n, 2.75); g.closePath(); g.fill(); } }, accent, { depth: 0.9 });
    P.layer((g) => { g.beginPath(); g.arc(0, h - 1.9, 0.7, 0, 7); g.fill(); for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * (w / 2 - 1.5), h - 2.0, 0.55, 0, 7); g.fill(); } }, C.cream, { depth: 0.6 });
    P.layer((g) => { g.beginPath(); g.roundRect(-2.6, 2.75, 5.2, 0.85, 0.4); g.fill(); }, C.navy, { depth: 0.9 });
    const bulbs = (g) => { for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(-2.2 + k * 0.55, 3.17, 0.14, 0, 7); g.fill(); } };
    P.layer(bulbs, C.neon, { lip: 0, depth: 0.3 }); P.glow(bulbs);
    P.layer((g) => { for (const sd of [-1, 1]) g.fillRect(sd * (w / 2 - 0.35) - 0.35, 0, 0.7, h); }, P2.shade(wall, 0.12), { depth: 0.6 });
    P.innerShade(P2.shade(wall, -0.6), { alpha: 0.3, blurPx: 12 });
  };
  const side = (P) => { P.gradient(P2.shade(wall, -0.04), P2.shade(wall, -0.2), 0.4); P.felt(0.7); P.layer((g) => g.fillRect(P.box.x0 - 1, h - 0.7, P.box.w + 2, 2), trim, { depth: 0.7 }); P.marks('window', { color: C.neon, alpha: 0.7, size: 1.3, units: true, lit: 0.5, dark: P2.shade(wall, -0.4), region: { ...P.box, y0: 3.6, y1: h - 1.2 } }); };
  const lid = (P) => { P.gradient(P2.shade(trim, 0.1), P2.shade(trim, -0.1), 0.3); P.felt(0.6); P.layer((g) => { g.beginPath(); g.roundRect(P.box.x0 + 1, P.box.y0 + 1, P.box.w - 2, P.box.h - 2, 0.6); g.fill(); }, P2.shade(wall, -0.25), { depth: 0.7 }); P.layer((g) => g.fillRect(P.box.x0 + 2, P.box.y0 + 2, 2.4, 1.8), C.cream, { depth: 0.6 }); };
  const node = prismFold([[-w / 2, 0], [w / 2, 0], [w / 2, -d], [-w / 2, -d]], { h, roof: 'flat', paper: H.paper, seed, thickness: 0.08, edgeWidth: 0.08, paints: { wall: [front, side, side, side], roof: lid }, print });
  const crownPts = [[-w / 2, 0], [w / 2, 0], [w / 2, 0.8], [w / 2 - 2, 0.8], [w / 2 - 2, 1.6], [3.4, 1.6], [3.4, 2.5], [-3.4, 2.5], [-3.4, 1.6], [-w / 2 + 2, 1.6], [-w / 2 + 2, 0.8], [-w / 2, 0.8]];
  const crown = makeCard(crownPts, { paper: H.paper, thickness: 0.08, edgeWidth: 0.08, pxPerUnit: 30, seed: seed + 40, folds: ['bottom'], back: 'mirror', paint: (P) => { P.gradient(P2.shade(accent, 0.08), P2.shade(accent, -0.1), 0.3); P.felt(0.6); P.layer((g) => { g.fillRect(-w / 2, 0.55, w, 0.14); g.fillRect(-w / 2 + 2, 1.35, w - 4, 0.14); g.fillRect(-3.4, 2.25, 6.8, 0.14); }, C.cream, { depth: 0.5 }); } });
  crown.position.set(0, 0, d / 2 - 0.2); node.userData.top?.add(crown);
  const signPts = [...arc(0, 2.3, 2.5, 2.5, 0, Math.PI, 18), [-2.5, 0], [2.5, 0]];
  const sign = makeCard(signPts, { paper: H.paper, thickness: 0.08, edgeWidth: 0.08, pxPerUnit: 34, seed: seed + 50, folds: ['bottom'], back: 'mirror', paint: (P) => {
    P.fill(C.navy); P.felt(0.5);
    const ring = (g) => { g.lineWidth = 0.22; g.beginPath(); g.arc(0, 2.3, 2.15, 0.05, Math.PI - 0.05); g.stroke(); };
    P.layer(ring, accent, { depth: 0.5 }); P.glow((g) => { g.globalAlpha = 0.6; g.strokeStyle = '#fff'; ring(g); });
    const ic = (g) => { g.save(); g.translate(0, 2.0); g.scale(1.25, 1.25); g.strokeStyle = g.fillStyle; ICON[icon](g); g.restore(); };
    P.layer(ic, C.neon, { depth: 0.5 }); P.glow(ic);
  } });
  sign.position.set(0, 2.5, d / 2 - 0.05); node.userData.top?.add(sign); SIGNS.push(sign);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshBasicMaterial({ map: haloTex(), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, color: accent }));
  halo.position.set(0, 4.6, d / 2 - 0.2); node.userData.top?.add(halo);
  const hh = popup(null, null, { node, height: h, x, z, level: true });
  H.glowing(hh.group);
  walk.wall(x - w / 2, z + 0.3, x + w / 2, z + 0.3, { r: 0.5, name: 'hotel' });
  return hh;
}

function car(col, seed, top = false, driver = null) {
  const g = new THREE.Group(), L = 7.4, W = 3.0, wheels = [];
  const mk = (pts, paint, o = {}) => makeCard(pts, { paper: H.paper, paint, thickness: 0.07, edgeWidth: 0.07, pxPerUnit: 50, seed: seed++, folds: [], back: 'mirror', ...o });
  const plain = (c) => (P) => { P.gradient(P2.shade(c, 0.1), P2.shade(c, -0.12), 0.4); P.felt(0.6); P.innerShade(P2.shade(c, -0.5), { alpha: 0.25, blurPx: 8 }); };
  const profile = [[-3.5, 0.5], [3.45, 0.5], [3.72, 0.72], [3.72, 1.28], [3.3, 1.5], [1.25, 1.6], [1.05, 1.42], [-1.5, 1.42], [-1.7, 1.52], [-3.0, 1.56], [-3.72, 1.86], [-3.72, 0.8]];
  const sidePaint = (P) => {
    P.gradient(P2.shade(col, 0.12), P2.shade(col, -0.12), 0.4); P.felt(0.6);
    P.layer((gg) => { gg.fillRect(-3.8, 0.84, 7.6, 0.12); gg.fillRect(-3.8, 0.5, 7.6, 0.16); }, C.cream, { depth: 0.5 });
    P.layer((gg) => { gg.beginPath(); gg.moveTo(-3.72, 1.86); gg.lineTo(-2.2, 1.5); gg.lineTo(-3.72, 1.3); gg.closePath(); gg.fill(); }, P2.shade(col, 0.22), { depth: 0.5 });
    const lamp = (gg) => { gg.beginPath(); gg.roundRect(3.3, 0.98, 0.38, 0.32, 0.12); gg.fill(); };
    P.layer(lamp, C.neon, { depth: 0.4 }); P.glow(lamp);
    P.layer((gg) => gg.fillRect(-3.7, 0.98, 0.24, 0.5), C.coral, { depth: 0.4 });
    P.draw((gg) => { gg.strokeStyle = P2.rgba(P2.shade(col, -0.45), 0.75); gg.lineWidth = 0.05; gg.beginPath(); gg.moveTo(-1.45, 1.4); gg.lineTo(-1.4, 0.7); gg.lineTo(0.98, 0.7); gg.lineTo(1.0, 1.4); gg.stroke(); gg.fillStyle = C.cream; gg.fillRect(0.4, 1.1, 0.4, 0.08); });
    for (const wx of [-2.3, 2.3]) P.layer((gg) => { gg.beginPath(); gg.arc(wx, 0.5, 0.84, 0, Math.PI); gg.fill(); }, P2.shade(col, -0.45), { depth: 0.5 });
    P.innerShade(P2.shade(col, -0.6), { alpha: 0.3, blurPx: 8 });
  };
  const wheel = (x, z) => { const m = mk(arc(0, 0, 0.64, 0.64, 0, Math.PI * 2, 20).slice(0, -1), (P) => { P.fill('#2b2540'); P.layer((gg) => { gg.beginPath(); gg.arc(0, 0, 0.38, 0, 7); gg.fill(); }, C.cream, { depth: 0.5 }); P.layer((gg) => { gg.beginPath(); gg.arc(0, 0, 0.14, 0, 7); gg.fill(); gg.fillRect(-0.36, -0.045, 0.72, 0.09); gg.fillRect(-0.045, -0.36, 0.09, 0.72); }, C.gold, { depth: 0.3 }); }); m.position.set(x, 0.64, z); g.add(m); wheels.push(m); };
  for (const z of [0, -W]) { const sd = mk(profile, sidePaint); sd.position.z = z; g.add(sd); }
  for (const x of [-2.3, 2.3]) { wheel(x, 0.09); wheel(x, -W - 0.09); }
  const flatCard = (x0, x1, y, c, wd = W - 0.1, z = -0.05) => { const m = mk(P2.shape.rect(x1 - x0, wd), typeof c === 'function' ? c : plain(c)); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, z); g.add(m); return m; };
  flatCard(1.05, 3.55, 1.5, (P) => { plain(P2.shade(col, 0.06))(P); P.layer((gg) => gg.fillRect(-0.04, 0.2, 0.08, W - 0.5), C.cream, { depth: 0.3 }); });
  flatCard(-3.55, -1.6, 1.5, P2.shade(col, 0.03)); flatCard(-1.6, 1.05, 0.86, '#3a3158');
  flatCard(3.6, 3.95, 0.62, C.cream, W + 0.2, 0.1); flatCard(-3.95, -3.6, 0.62, C.cream, W + 0.2, 0.1);
  const cross = (x, y, hgt, c, tilt = 0, wd = W - 0.1, zc = -W / 2, extra = {}) => { const pv = new THREE.Group(); pv.position.set(x, y, zc); pv.rotation.y = Math.PI / 2; const m = mk(extra.pts || P2.shape.rect(wd, hgt), typeof c === 'function' ? c : plain(c), extra.card || {}); m.rotation.x = tilt; pv.add(m); g.add(pv); return m; };
  cross(3.7, 0.55, 0.85, (P) => { P.fill(P2.shade(col, -0.08)); const hl = (gg) => { for (const sd of [-1, 1]) { gg.beginPath(); gg.arc(sd * (W / 2 - 0.5), 0.5, 0.26, 0, 7); gg.fill(); } }; P.layer(hl, C.neon, { depth: 0.3 }); P.glow(hl); P.layer((gg) => gg.fillRect(-0.7, 0.3, 1.4, 0.3), '#3a3158', { depth: 0.3 }); });
  cross(-3.7, 0.55, 0.95, (P) => { P.fill(P2.shade(col, -0.14)); P.layer((gg) => { for (const sd of [-1, 1]) gg.fillRect(sd * (W / 2 - 0.6) - 0.3, 0.4, 0.6, 0.3); }, C.coral, { depth: 0.3 }); });
  const wsW = W - 0.1, wsH = 0.82;
  cross(1.02, 1.5, wsH, (P) => { P.fill(C.cream); }, 0.5, wsW, -W / 2, { card: { holes: [[[-wsW / 2 + 0.14, 0.12], [-wsW / 2 + 0.14, wsH - 0.13], [wsW / 2 - 0.14, wsH - 0.13], [wsW / 2 - 0.14, 0.12]]] } });
  { const pv = new THREE.Group(); pv.position.set(1.02, 1.5, -W / 2); pv.rotation.y = Math.PI / 2; const pane = new THREE.Mesh(new THREE.PlaneGeometry(wsW - 0.2, wsH - 0.2), new THREE.MeshBasicMaterial({ color: '#bfeee8', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })); pane.position.y = wsH / 2; const tl = new THREE.Group(); tl.rotation.x = 0.5; tl.add(pane); pv.add(tl); g.add(pv); }
  for (const zc of [-0.8, -2.2]) cross(-0.95, 0.88, 1.0, (P) => { P.gradient('#f6d9c2', '#e3bfa6', 0.3); P.layer((gg) => gg.fillRect(-0.5, 0.7, 1.0, 0.1), C.coral, { depth: 0.3 }); }, 0.12, 1.1, zc);
  cross(0.55, 1.05, 0.7, (P) => { P.fill('#2b2540'); P.layer((gg) => { gg.beginPath(); gg.arc(0, 0.35, 0.2, 0, 7); gg.fill(); }, C.cream, { depth: 0.3 }); }, 0.45, 0.7, -2.2, { pts: arc(0, 0.35, 0.35, 0.35, 0, Math.PI * 2, 14).slice(0, -1) });
  if (top) flatCard(-1.75, 1.0, 2.2, C.cream);
  if (driver) {
    const hy = 1.12, hr = 0.5, pts = [[-0.6, 0], [0.6, 0], [0.6, 0.46], [0.28, 0.68]];
    for (let i = 0; i <= 14; i++) { const a = (-50 + i * 20) * Math.PI / 180; pts.push([Math.cos(a) * hr, hy + Math.sin(a) * hr]); }
    pts.push([-0.28, 0.68], [-0.6, 0.46]);
    const paint = (P) => {
      P.fill(driver.shirt); P.felt(0.5);
      P.layer((gg) => { gg.beginPath(); gg.arc(0, hy, hr + 0.02, 0, 7); gg.fill(); gg.fillRect(-0.16, 0.5, 0.32, 0.3); }, driver.skin, { depth: 0.4 });
      P.layer((gg) => { gg.beginPath(); gg.arc(0, hy + 0.06, hr + 0.03, 0.05, Math.PI - 0.05); gg.closePath(); gg.fill(); }, driver.hair, { depth: 0.4 });
      P.layer((gg) => { gg.fillRect(-0.36, hy - 0.14, 0.3, 0.17); gg.fillRect(0.06, hy - 0.14, 0.3, 0.17); gg.fillRect(-0.1, hy - 0.08, 0.2, 0.05); }, '#2b2540', { depth: 0.3 });
    };
    for (const ry of [0, Math.PI / 2]) { const pv = new THREE.Group(); pv.position.set(-0.3, 0.5, -2.2); pv.rotation.y = ry; pv.scale.setScalar(1.75); pv.add(mk(pts, paint)); g.add(pv); }
  }
  g.userData.car = { wheels, L, W };
  return g;
}

const frond = (g, x, y, a, len) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, len * 0.34, len, -len * 0.1); g.quadraticCurveTo(len * 0.5, len * 0.02, 0, 0); g.fill(); g.restore(); };
const K = {
  palm: () => { const h = between(9, 11.5), lean = between(-0.9, 0.9); return P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.trunk); const p = []; for (let i = 0; i <= 10; i++) { const t = i / 10; p.push([lean * t * t - 0.34 * (1 - t * 0.5), h * 0.86 * t]); } for (let i = 10; i >= 0; i--) { const t = i / 10; p.push([lean * t * t + 0.34 * (1 - t * 0.5), h * 0.86 * t]); } D.poly(g, p);
    g.fillStyle = ink(P2.shade(C.trunk, -0.3), 'print'); for (let i = 1; i < 9; i++) { const t = i / 10; D.rect(g, lean * t * t - 0.3, h * 0.86 * t, 0.6, 0.07); }
    for (const [a, l, c] of [[2.75, 3.6, C.palm], [0.4, 3.6, C.palm], [2.2, 3.9, C.palmB], [0.95, 3.9, C.palmB], [3.25, 3.0, C.palm], [-0.1, 3.0, C.palm], [1.57, 3.2, C.palmB]]) { g.fillStyle = ink(c); frond(g, lean, h * 0.85, a, l); }
    g.fillStyle = ink(C.orange); D.ell(g, lean - 0.2, h * 0.82, 0.24, 0.24); D.ell(g, lean + 0.24, h * 0.8, 0.22, 0.22);
  }, { w: 9.4, h: h + 2.4, res: 40, name: 'palm' }); },
  parasol: () => { const c = pick([C.pink, C.turq, C.orange, C.lilac]); return P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.cream); D.rect(g, -0.09, 0, 0.18, 3.2);
    g.fillStyle = ink(c); D.poly(g, [...arc(0, 2.7, 2.3, 1.25, 0, Math.PI, 16)]);
    g.fillStyle = ink(C.cream); for (const k of [-1, 1]) D.poly(g, [[k * 0.45, 2.7], [k * 1.35, 2.7], [k * 0.9, 3.72], [k * 0.3, 3.92]]);
    g.fillStyle = ink(C.gold, 'print'); D.ell(g, 0, 4.0, 0.12, 0.12);
  }, { w: 4.9, h: 4.3, name: 'parasol' }); },
  flamingo: () => { const f = rnd() < 0.5 ? 1 : -1; return P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.coral); D.rect(g, -0.06, 0, 0.12, 1.5); D.rect(g, 0.2, 0, 0.1, 1.4);
    g.fillStyle = ink(C.pink); D.ell(g, 0.1, 1.75, 0.72, 0.46); const n = []; for (let i = 0; i <= 10; i++) { const t = i / 10; n.push([f * (0.6 + 0.5 * Math.sin(t * 3.1)) - 0.12, 1.8 + t * 1.5]); } for (let i = 10; i >= 0; i--) { const t = i / 10; n.push([f * (0.6 + 0.5 * Math.sin(t * 3.1)) + 0.12, 1.8 + t * 1.5]); } D.poly(g, n);
    D.ell(g, f * 0.62, 3.32, 0.24, 0.2); g.fillStyle = ink(C.navy); D.poly(g, [[f * 0.8, 3.36], [f * 1.16, 3.12], [f * 0.8, 3.2]]);
    g.fillStyle = ink('#ffb3c0', 'print'); D.ell(g, 0.2, 1.8, 0.4, 0.22);
  }, { w: 3, h: 3.7, res: 70, name: 'flamingo' }); },
  bench: () => P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.navy); D.rect(g, -1.4, 0, 0.2, 1.6); D.rect(g, 1.2, 0, 0.2, 1.6); g.fillStyle = ink(C.turq); D.rect(g, -1.6, 0.62, 3.2, 0.26, 0.06); D.rect(g, -1.5, 1.12, 3.0, 0.22, 0.06); D.rect(g, -1.5, 1.44, 3.0, 0.22, 0.06); }, { w: 3.4, h: 1.8, name: 'bench' }),
  lamp: () => P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.navy); D.rect(g, -0.11, 0, 0.22, 4.6); D.rect(g, -0.9, 4.3, 1.8, 0.14, 0.05); g.fillStyle = ink(C.neon); D.ell(g, -0.9, 4.75, 0.36, 0.4); D.ell(g, 0.9, 4.75, 0.36, 0.4); g.fillStyle = ink(C.navy); D.rect(g, -1.1, 5.1, 0.4, 0.1); D.rect(g, 0.7, 5.1, 0.4, 0.1); }, { w: 2.8, h: 5.4, name: 'lamp' }),
  rail: () => P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.cream); for (let i = 0; i < 6; i++) D.rect(g, -2.6 + i * 1.0, 0, 0.2, 1.25); g.fillStyle = ink('#f6dcc4'); D.rect(g, -2.7, 1.1, 5.4, 0.22, 0.06); }, { w: 5.6, h: 1.4, name: 'rail' }),
  kiosk: () => P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.cream); D.rect(g, -1.9, 0, 3.8, 3.3, 0.1); g.fillStyle = ink(C.turq); D.rect(g, -1.9, 0, 3.8, 1.2); g.fillStyle = ink(C.navy); D.rect(g, -1.4, 1.5, 2.8, 1.2, 0.1);
    for (let k = 0; k < 6; k++) { g.fillStyle = ink(k % 2 ? C.cream : C.pink); D.poly(g, [[-2.3 + k * 0.767, 3.9], [-2.3 + (k + 1) * 0.767, 3.9], [-2.3 + (k + 1) * 0.767, 3.2], [-2.3 + (k + 0.5) * 0.767, 2.95], [-2.3 + k * 0.767, 3.2]]); }
    g.fillStyle = ink(C.orange); D.ell(g, 0, 4.5, 0.7, 0.62); g.fillStyle = ink(C.cream, 'print'); D.ell(g, 0, 4.5, 0.3, 0.26); g.fillStyle = ink(C.gold, 'print'); for (const x of [-0.8, 0, 0.8]) D.ell(g, x, 2.0, 0.22, 0.26);
  }, { w: 4.9, h: 5.3, name: 'kiosk' }),
  barrier: () => P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.navy); D.rect(g, -1.9, 0, 0.2, 1.5); D.rect(g, 1.7, 0, 0.2, 1.5); g.fillStyle = ink(C.cream); D.rect(g, -2.2, 0.8, 4.4, 0.7, 0.08); g.fillStyle = ink(C.coral, 'print'); for (let k = 0; k < 5; k++) D.poly(g, [[-2.0 + k * 0.9, 0.82], [-1.6 + k * 0.9, 0.82], [-1.25 + k * 0.9, 1.48], [-1.65 + k * 0.9, 1.48]]); }, { w: 4.6, h: 1.7, name: 'barrier' }),
  hut: () => { const c = pick([C.pink, C.turq, C.lilac, C.orange, C.cream]); return P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.cream); D.rect(g, -1.7, 0, 3.4, 2.6); for (let k = 0; k < 5; k++) { g.fillStyle = ink(k % 2 ? C.cream : c); D.rect(g, -1.7 + k * 0.68, 0, 0.68, 2.6); }
    g.fillStyle = ink(P2.shade(c, -0.2)); D.poly(g, [[-2.1, 2.5], [2.1, 2.5], [0, 4.1]]); g.fillStyle = ink(C.navy); D.rect(g, -0.5, 0, 1.0, 1.7, 0.1); g.fillStyle = ink(C.neon, 'print'); D.ell(g, 0, 3.0, 0.3, 0.3);
  }, { w: 4.4, h: 4.3, name: 'hut' }); },
  lighthouse: () => P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.cream); D.poly(g, [[-1.6, 0], [1.6, 0], [1.0, 12], [-1.0, 12]]); g.fillStyle = ink(C.coral); for (const y of [1.5, 5.5, 9.5]) D.poly(g, [[-1.6 + y * 0.05, y], [1.6 - y * 0.05, y], [1.6 - (y + 2) * 0.05, y + 2], [-1.6 + (y + 2) * 0.05, y + 2]]);
    g.fillStyle = ink(C.navy); D.rect(g, -1.4, 12, 2.8, 0.4); g.fillStyle = ink(C.neon); D.rect(g, -0.9, 12.4, 1.8, 1.5, 0.2); g.fillStyle = ink(C.coral); D.poly(g, [[-1.2, 13.9], [1.2, 13.9], [0, 15.2]]);
  }, { w: 3.6, h: 15.4, res: 40, name: 'lighthouse' }),
  billboard: () => P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.navy); D.rect(g, -2.6, 0, 0.3, 3.4); D.rect(g, 2.3, 0, 0.3, 3.4); g.fillStyle = ink(C.cream); D.rect(g, -3.6, 3.0, 7.2, 4.2, 0.2); g.fillStyle = ink(C.turq); D.rect(g, -3.3, 3.3, 6.6, 3.6, 0.1);
    g.fillStyle = ink(C.orange); D.ell(g, 0, 4.4, 1.5, 1.5); g.fillStyle = ink(C.turq); D.rect(g, -3.3, 3.3, 6.6, 1.1); g.fillStyle = ink(C.cream, 'print'); for (const x of [-2, -0.6, 0.8, 2.2]) D.rect(g, x, 3.75, 0.9, 0.12);
  }, { w: 7.6, h: 7.4, name: 'billboard' }),
  boat: () => { const c = pick([C.coral, C.turq, C.gold, C.lilac]); return P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.cream); D.rect(g, -0.08, 0.8, 0.16, 3.6); D.poly(g, [[0.04, 1.3], [0.04, 4.2], [1.9, 1.5]]); g.fillStyle = ink(c); D.poly(g, [[-0.04, 1.5], [-0.04, 3.6], [-1.4, 1.6]]);
    g.fillStyle = ink(c); D.poly(g, [[-2.6, 1.1], [2.8, 1.1], [2.0, 0], [-2.0, 0]]); g.fillStyle = ink(C.cream, 'print'); D.rect(g, -2.4, 0.72, 5.0, 0.14);
  }, { w: 5.8, h: 4.6, name: 'boat' }); },
  bollard: () => P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.navy); D.rect(g, -0.22, 0, 0.44, 0.9, 0.1); g.fillStyle = ink(C.cream); D.rect(g, -0.3, 0.7, 0.6, 0.24, 0.1); }, { w: 0.8, h: 1.1, res: 100, name: 'bollard' }),
  gull: () => P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.trunk); D.rect(g, -0.14, 0, 0.28, 1.8); g.fillStyle = ink(C.cream); D.ell(g, 0.05, 1.95, 0.5, 0.3); D.ell(g, 0.45, 2.25, 0.2, 0.19); g.fillStyle = ink(C.orange); D.poly(g, [[0.6, 2.28], [0.92, 2.2], [0.6, 2.14]]); g.fillStyle = ink('#9aa4b4', 'print'); D.ell(g, -0.1, 2.0, 0.3, 0.14); }, { w: 2.0, h: 2.6, res: 80, name: 'gull post' }),
  box: () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#c9a070'); D.rect(g, -0.6, 0, 1.2, 1.0, 0.04); g.fillStyle = ink('#e9d2a8'); D.rect(g, -0.12, 0, 0.24, 1.0); g.fillStyle = ink(C.coral, 'print'); D.rect(g, -0.42, 0.56, 0.22, 0.22); g.fillStyle = ink('#a5804f', 'print'); D.rect(g, -0.6, 0.94, 1.2, 0.06); }, { w: 1.4, h: 1.1, res: 100, name: 'box' }),
};

const people = [];
const DRESS = {
  lenny: { scarf: C.gold, skin: '#eec7a2', top: C.teal, legs: '#e9dcc4', shoes: '#7a4a32', cuff: '#178a84', seed: 1300,
    collar: (g, ink) => { g.fillStyle = ink('#c9962a', 'print'); for (const x of [-0.4, -0.2, 0, 0.2, 0.4]) D.ell(g, x, 0.1, 0.05, 0.05); },
    torso: (g, ink) => { g.fillStyle = ink(C.pink); for (const [x, y] of [[-0.45, 0.6], [0.4, 1.0], [-0.3, 1.7], [0.3, 2.2], [0.05, 0.4], [-0.6, 1.2]]) { D.ell(g, x, y, 0.16, 0.1); D.rect(g, x - 0.02, y - 0.26, 0.04, 0.2); } g.fillStyle = ink(C.cream, 'print'); D.rect(g, -0.03, 0.2, 0.06, 2.4); g.fillStyle = ink(C.gold, 'print'); D.poly(g, [[-0.2, 2.74], [0, 2.3], [0.2, 2.74], [0.14, 2.74], [0, 2.42], [-0.14, 2.74]]); } },
  hero: { hero: true, slim: 0.8, lift: 0.95, hair: '#3a2a22', cap: '#3a2a22', skin: '#e9c3a0', top: '#f6ecd9', legs: '#d9c7a8', shoes: '#7a4a32', cuff: '#e9dcc4', scarf: C.teal,
    torso: (g, ink) => { g.fillStyle = ink(C.teal); D.poly(g, [[-0.2, 2.74], [0.2, 2.74], [0.12, 1.3], [-0.12, 1.3]]); g.fillStyle = ink('#e6d8be'); D.poly(g, [[-0.42, 2.72], [-0.2, 2.74], [-0.08, 1.5], [-0.5, 2.1]]); D.poly(g, [[0.42, 2.72], [0.2, 2.74], [0.08, 1.5], [0.5, 2.1]]); g.fillStyle = ink('#cdbb9a', 'print'); D.rect(g, -0.02, 0.2, 0.04, 1.2); g.fillStyle = ink(C.gold, 'print'); for (const y of [0.7, 1.15]) D.ell(g, 0.12, y, 0.05, 0.05); g.fillStyle = ink(C.pink); D.poly(g, [[0.3, 1.9], [0.52, 1.92], [0.5, 1.72], [0.32, 1.7]]); g.fillStyle = ink('#e6d8be', 'print'); D.rect(g, -0.95, 0.3, 1.9, 0.07); } },
  marisol: { scarf: '#fdf4e6', skin: '#e2b08a', top: C.coral, legs: C.navy, shoes: C.coral, cuff: '#d95a4a', seed: 1100,
    torso: (g, ink) => { g.fillStyle = ink('#fdf4e6'); D.poly(g, [[-0.22, 2.74], [0.22, 2.74], [0.1, 1.2], [-0.1, 1.2]]); g.fillStyle = ink('#d95a4a'); D.poly(g, [[-0.44, 2.72], [-0.22, 2.74], [-0.06, 1.4], [-0.55, 2.0]]); D.poly(g, [[0.44, 2.72], [0.22, 2.74], [0.06, 1.4], [0.55, 2.0]]); g.fillStyle = ink(C.gold); D.ell(g, 0, 1.05, 0.09, 0.09); g.fillStyle = ink('#d95a4a', 'print'); D.rect(g, -0.7, 0.75, 0.42, 0.06); D.rect(g, 0.28, 0.75, 0.42, 0.06); } },
  bea: { scarf: '#9c7fd0', skin: '#f0c9a8', top: C.lilac, legs: '#8f74c4', shoes: C.navy, cuff: '#8f74c4', seed: 1200,
    torso: (g, ink) => { g.fillStyle = ink('#8f74c4', 'print'); D.rect(g, -0.03, 0.25, 0.06, 2.4); g.fillStyle = ink('#a58ad6'); D.rect(g, -0.62, 1.5, 0.44, 0.46, 0.06); D.rect(g, 0.2, 0.6, 0.5, 0.5, 0.06); g.fillStyle = ink(C.gold, 'print'); D.ell(g, 0, 2.5, 0.06, 0.06); g.fillStyle = ink('#4a3a5a', 'print'); D.ell(g, 0.42, 1.9, 0.16, 0.1, 0.5); D.ell(g, -0.3, 1.0, 0.1, 0.07, -0.4); g.fillStyle = ink('#7d62b4', 'print'); D.rect(g, -0.95, 1.22, 1.9, 0.09); },
    carry: { w: 0.6, h: 1.1, draw: (g, ink) => { g.fillStyle = ink('#b9c0cc'); D.rect(g, -0.08, 0.1, 0.16, 0.8, 0.05); D.ell(g, 0, 0.16, 0.2, 0.16); D.ell(g, 0, 0.92, 0.18, 0.14); g.fillStyle = ink(C.navy, 'print'); D.ell(g, 0, 0.12, 0.08, 0.08); } } },
};
const decks = {};
function placePerson(cfg) {
  const sp = SPOT[cfg.id]; if (!sp) return;
  const doll = makeBigDoll(H, { id: cfg.id, poster: cfg.poster, ...DRESS[cfg.id] });
  const on = sp.deck ? { parent: decks.pier, x: sp.deck[0], z: sp.deck[1], order: 99 } : { x: sp.at[0], z: sp.at[1] };
  const handle = popup(null, null, { node: doll, height: 5.5, ...on, yaw: sp.yaw, scale: 0.94, level: true, sight: false });
  handle.x = sp.at[0]; handle.z = sp.at[1];
  walk.solid(sp.at[0], sp.at[1], 0.75, sp.lift ? { base: sp.lift } : {});
  people.push({ ...cfg, ...sp, scale: 0.94, card: { x: 0, z: 0, yaw: 0 }, side: 1, doll, handle, seed: people.length * 17 + 3, height: doll.userData.height * 0.94 });
}

const crest = (x0, s, hh) => [[x0, 0.3 * hh], [x0 + 0.28 * s, 0.42 * hh], [x0 + 0.5 * s, 0.78 * hh], [x0 + 0.66 * s, 0.98 * hh], [x0 + 0.8 * s, 1.0 * hh], [x0 + 0.92 * s, 0.86 * hh], [x0 + 0.96 * s, 0.64 * hh], [x0 + 0.88 * s, 0.5 * hh], [x0 + 0.83 * s, 0.6 * hh], [x0 + 0.8 * s, 0.72 * hh], [x0 + 0.72 * s, 0.6 * hh], [x0 + 0.76 * s, 0.42 * hh], [x0 + 0.86 * s, 0.3 * hh]];
const foam = (x0, s, hh) => [[x0 + 0.44 * s, 0.7 * hh], [x0 + 0.62 * s, 0.98 * hh], [x0 + 0.8 * s, 1.06 * hh], [x0 + 0.95 * s, 0.9 * hh], [x0 + 1.0 * s, 0.62 * hh], [x0 + 0.9 * s, 0.44 * hh], [x0 + 0.8 * s, 0.56 * hh], [x0 + 0.86 * s, 0.7 * hh], [x0 + 0.8 * s, 0.84 * hh], [x0 + 0.66 * s, 0.82 * hh], [x0 + 0.54 * s, 0.64 * hh]];
const WAVE_W = 24, WAVE_N = 3;
const wavePts = (hh, lift = 0) => { const top = []; for (let k = 0; k < WAVE_N; k++) top.push(...crest(-WAVE_W / 2 + k * WAVE_W / WAVE_N, WAVE_W / WAVE_N, hh).map(([x, y]) => [x, y + lift])); return [[-WAVE_W / 2, 0], [WAVE_W / 2, 0], [WAVE_W / 2, 0.3 * hh + lift], ...top.reverse()]; };
const foamPts = (hh) => { const p = [[-WAVE_W / 2, 0], [WAVE_W / 2, 0], [WAVE_W / 2, 0.16 * hh]]; for (let k = WAVE_N - 1; k >= 0; k--) { const x0 = -WAVE_W / 2 + k * WAVE_W / WAVE_N, sw = WAVE_W / WAVE_N; p.push([x0 + 0.99 * sw, 0.2 * hh], ...foam(x0, sw, hh).slice().reverse().map(([x, y]) => [x, y]), [x0 + 0.4 * sw, 0.2 * hh]); } p.push([-WAVE_W / 2, 0.16 * hh]); return p; };

const waves = [], movers = [], letters = [], boats = [];
const CARS = []; let heroDoll = null, heroHandle = null, conv = null, boxMesh = null, foamLine = null, marisolH = null;
function build() {
  const stamp = (kind, n, cross) => Array.from({ length: n }, () => { const [pts, paint] = K[kind](); return { pts, m: H.printed(pts, paint, { cross: true, res: 0.9 }), cross }; });
  const ST = { palm: stamp('palm', 5, true), parasol: stamp('parasol', 4, true), flamingo: stamp('flamingo', 3), bench: stamp('bench', 1), lamp: stamp('lamp', 1, true), rail: stamp('rail', 1), hut: stamp('hut', 5), boat: stamp('boat', 4), gull: stamp('gull', 1) };
  const put = (kind, x, z, o = {}) => { const q = ST[kind][Math.floor(rnd() * ST[kind].length) % ST[kind].length]; return popup(q.pts, null, { materials: q.m, x, z, cross: q.cross, ...o }); };

  const HOTELS = [[-136, 13, 12, C.lilac, C.coral, 'star'], [-118, 15, 11, C.turq, C.pink, 'palm'], [-99, 14, 14, C.pink, C.teal, 'flamingo'], [-80, 16, 10.5, C.cream, C.coral, 'sun'], [-60, 13, 13, C.lilac, C.orange, 'star'], [-42, 15, 11, '#ffc9a8', C.teal, 'glass'], [-22, 14, 14.5, C.turq, C.coral, 'flamingo'], [-3, 16, 11.5, C.pink, C.lilac, 'sun'], [17, 13, 13.5, C.cream, C.teal, 'palm'], [36, 15, 10.5, '#ffc9a8', C.pink, 'star'], [56, 14, 14, C.lilac, C.coral, 'glass'], [75, 16, 11, C.turq, C.orange, 'flamingo'], [95, 14, 12, C.pink, C.teal, 'sun']];
  HOTELS.forEach(([x, w, h, wall, accent, icon], i) => hotel(x, { w, h, wall, accent, trim: i % 2 ? C.cream : '#fbe3d2', icon, seed: 300 + i * 20 }));
  hotel(MX + 15, { w: 11, h: 6.5, d: 7, z: roadZ(MX + 15) - 9, wall: C.cream, accent: C.teal, trim: '#fbe3d2', icon: 'star', seed: 700 });
  walk.block((x, z) => z > boardZ(x) + 2.95 || z < (x < 108 ? -22.4 : roadZ(x) - 8.2));

  for (let i = 2; i < LANE.pts.length - 2; i += 2) { const [x, z] = LANE.pts[i], tx = LANE.pts[i + 1][0] - LANE.pts[i - 1][0], tz = LANE.pts[i + 1][1] - LANE.pts[i - 1][1], n = Math.hypot(tx, tz); if (x > PAGE.x0 + 3 && x < PAGE.x1 - 3 && Math.abs(x - PIER.x) > 4 && Math.abs(x - PIER.x + 17) > 4) put('rail', x - tz / n * 0 , z + 3.4, { yaw: -Math.atan2(tz, tx), level: true }); }
  let k = 0;
  for (let x = PAGE.x0 + 5; x < PAGE.x1 - 5; x += 6.5) {
    k++; const zb = boardZ(x), far = x > 108;
    if (Math.abs(x - HERO_AT[0]) < 6 || Math.abs(x - SPOT.marisol.at[0]) < 4 || Math.abs(x - BEA_X) < 9 || Math.abs(x - MX) < 7) continue;
    if (k % 3 === 0) put('palm', x + between(-1, 1), zb - 5.2 - between(0, 1.2), { sway: 0.5, level: true });
    else if (k % 3 === 1) { const lz = zb - 4.6; put('lamp', x, lz, { level: true }); solid(x, lz, 0.4); if (x > -30 && x < 80 && k % 6 === 1) H.lamp(x, 4.6, lz + 0.4, 0.8, 12); }
    else if (k % 4 === 2) { put('bench', x, zb - 4.3, { yaw: 0 }); solid(x, zb - 4.3, 1.2); }
    if (k % 2 === 0) put('palm', x + 3, far ? roadZ(x) - 7 : -20.6, { sway: 0.5, level: true, scale: 0.9 });
    if (far && k % 3 === 1 && x < MX - 26) put('hut', x, roadZ(x) - 10.5, { yaw: 0, level: true });
    if (k % 2 && x < MX - 30) put('parasol', x + between(-1.5, 1.5), zb + between(8.2, 11), { level: true });
  }
  for (const [dx, dz] of [[0, 0], [1.8, 0.9], [-1.6, 1.1], [3.4, -0.2], [-3.2, -0.4], [0.6, 1.9], [4.6, 1.2]]) put('flamingo', 24 + dx, boardZ(24) - 6.2 + dz, { scale: 0.95 });
  for (const [dx, dz] of [[0, 0], [1.6, 0.8], [-1.5, 0.9]]) { put('flamingo', -58 + dx, boardZ(-58) - 6 + dz, {}); put('flamingo', 150 + dx, boardZ(150) - 6 + dz, {}); }
  for (const kx of [-13.5, 44, 205]) { const kz = boardZ(kx) - 5.8; popup(...K.kiosk(), { x: kx, z: kz, yaw: 0.05, level: true }); solid(kx, kz, 1.9); }
  popup(...K.lighthouse(), { x: 292, z: boardZ(292) + 9.5, cross: true, level: true, yaw: 0.4 });
  popup(...K.billboard(), { x: 178, z: roadZ(178) - 9.5, yaw: 0, level: true }); popup(...K.billboard(), { x: 262, z: roadZ(262) - 9.5, yaw: 0.1, level: true });

  const parked = [[-16, C.coral, false], [30, C.cream, true], [84, C.lilac, false], [-52, C.orange, true], [-88, C.pink, false]];
  parked.forEach(([x, col, top], i) => { const z = roadZ(x) + 4.0, node = car(col, 600 + i * 40, top), h = popup(null, null, { node, height: 2, x, z, level: true }); walk.wall(x - 3.6, z - 1.5, x + 3.6, z - 1.5, { r: 1.7, name: 'car' }); if (!top) CARS.push({ h, node, x, z, x0: x, z0: z, th: 0, v: 0, steer: 0, on: false, t: 0, walk, solid: walk.solids[walk.solids.length - 1] }); });
  { const z = roadZ(BEA_X + 2.6) + 4.0, node = car(C.teal, 900); const h = popup(null, null, { node, height: 2, x: BEA_X + 2.6, z, level: true }); conv = { h, node, x: BEA_X + 2.6, z, x0: BEA_X + 2.6, z0: z, th: 0, v: 0, steer: 0, on: false, t: 0 }; CARS.push(conv); }
  for (const [x0, col, i] of [[60, C.turq, 0], [118, C.gold, 1], [200, C.coral, 2], [300, C.lilac, 3]]) { const node = car(col, 1000 + i * 40, i % 2 === 1, [{ shirt: C.cream, skin: '#e9b48f', hair: '#3a2a22' }, { shirt: C.coral, skin: '#b9794f', hair: '#1f1a2e' }, { shirt: C.pink, skin: '#f0c7a4', hair: '#c9772f' }, { shirt: C.teal, skin: '#8d5a3b', hair: '#2b2540' }][i]); node.rotation.y = Math.PI; H.scene.add(node); movers.push({ node, x0, x: x0, road: i > 1 }); }

  const bodyM = [0, 1].map(() => H.printed(wavePts(2.6), (P) => { P.gradient(C.seaLight, C.sea, 0); P.felt(0.5); P.marks('wave', { color: C.foam, alpha: 0.5, size: 0.2, units: true, region: { ...P.box, y1: 1.2 } }); P.innerShade(C.seaDeep, { alpha: 0.4, blurPx: 10 }); }, { cross: true }));
  const backM = H.printed(wavePts(2.6, 0.5), (P) => { P.gradient(C.seaDeep, '#165d70', 0); P.felt(0.5); }, { cross: true });
  const foamM = H.printed(foamPts(2.6), (P) => { P.gradient('#fff6e6', C.foam, 0); P.felt(0.4); P.innerShade('#d9b89a', { alpha: 0.35, blurPx: 6 }); }, { cross: true });
  for (const m of [...bodyM, backM, foamM]) for (const q of [m[0], m[2]]) { q.emissive.set('#ffffff'); q.emissiveMap = q.map; q.emissiveIntensity = q === m[2] ? 0.45 : 0.14; }
  for (let r = 0; r < 6; r++) for (let x = PAGE.x0 - 6 + (r % 2) * 12; x < PAGE.x1 + 8; x += WAVE_W - 0.5) {
    const z = shoreZ(x) + 2.6 + r * 5.2, node = new THREE.Group(), sc = 0.8 + r * 0.16;
    const back = makeCard(wavePts(2.6, 0.5), { materials: backM }); back.position.set(1.6, 0, -0.5);
    const body = makeCard(wavePts(2.6), { materials: bodyM[(r + Math.round(x)) & 1] });
    const cap = makeCard(foamPts(2.6), { materials: foamM }); cap.position.z = 0.34;
    node.add(back, body, cap);
    const h = popup(null, null, { node, height: 2.8, x, z, yaw: 0, level: true, scale: sc, sight: false }); h.rocks = true; waves.push({ h, r, x0: x, z0: z });
  }
  { const sh = new THREE.Shape(); const pts = []; for (let x = PAGE.x0; x <= PAGE.x1; x += 3) pts.push([x, shoreZ(x) + 1.3 + 0.5 * Math.sin(x * 0.6)]); for (let x = PAGE.x1; x >= PAGE.x0; x -= 3) pts.push([x, shoreZ(x) - 0.9 + 0.4 * Math.sin(x * 0.9)]); pts.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
    foamLine = new THREE.Mesh(new THREE.ShapeGeometry(sh), paperMaterial({ color: '#fff4e2', map: H.paper.map })); foamLine.rotation.x = -Math.PI / 2; foamLine.position.y = 0.035; foamLine.receiveShadow = true; H.scene.add(foamLine); }

  const posts = (w, h) => P2.fromDrawing((gg) => { D.rect(gg, -w / 2, h - 0.2, w, 0.2); const n = Math.round(w / 1.3); for (let i = 0; i <= n; i++) D.rect(gg, -w / 2 + i * (w - 0.24) / n, 0, 0.24, h); }, { w: w + 0.1, h: h + 0.05, name: 'pier posts' });
  const wood = (P) => { P.gradient(C.board, C.boardDark, 0.3); P.felt(0.6); P.marks('hatch', { color: '#8a5a38', alpha: 0.4, size: 0.5, units: true, angle: 0 }); };
  for (const [name, px, d] of [['pier', PIER.x, PIER.d], ['pier2', PIER.x - 17, 13]]) {
    const node = platform({ w: PIER.w, d: d + 1.1, h: PIER.h, paper: H.paper, seed: 1500 + px, facePts: posts(PIER.w, PIER.h), supportPts: posts(PIER.w * 0.9, PIER.h).map(([x, y]) => [x, y - PIER.h]), paints: { face: wood, deck: wood, support: wood }, print: H.cardOpts(px, PIER.z) });
    node.name = name; const pz = boardZ(px) + 3.3 + d; popup(null, null, { node, height: PIER.h, x: px, z: pz, level: true }); walk.add(node); decks[name] = node.userData.deck;
    for (const [dx, dz] of [[-2.3, -1], [2.3, -1], [-2.3, -d * 0.55], [2.3, -d * 0.55]]) { const b = popup(...K.bollard(), { parent: node.userData.deck, x: dx, z: dz, order: 98, yaw: 0 }); b.x = px; b.z = pz; }
    for (const [dx, zz, sc] of [[-6.2, pz - 4, 1], [6.4, pz - 9, 0.9]]) { const h = put('boat', px + dx, zz, { yaw: dx < 0 ? 0.15 : -0.15, scale: sc, level: true }); h.rocks = true; boats.push({ h, x0: px + dx, z0: zz }); }
  }
  for (const [dx, dz] of [[-9, 2], [9.5, 6], [-24, 3]]) put('gull', PIER.x + dx, boardZ(PIER.x + dx) + 4.4 + dz, { level: true });
  { const bx = decks.pier, [pts, paint] = K.box(); boxMesh = makeCard(pts, { paper: H.paper, paint, thickness: 0.5, edgeWidth: 0.06, pxPerUnit: 70, seed: 808, folds: [] }); boxMesh.position.set(-1.3, 0.02, -5.6); boxMesh.userData.home = [-1.3, 0.02, -5.6]; bx.add(boxMesh); }

  PEOPLE.forEach(placePerson);
  marisolH = people[0].handle;
  heroDoll = makeBigDoll(H, { id: 'hero', seed: 900, ...DRESS.hero });
  heroHandle = popup(null, null, { node: heroDoll, height: 6.4, x: HERO_AT[0], z: HERO_AT[1], scale: 0.84, level: true });
  const hp = heroHandle.group.position;
  H.setHero(heroHandle, { stride: (w, gait) => { if (conv.on) { heroDoll.userData.stride(0, 0); return; } heroDoll.userData.stride(w, gait); if (gait > 0.4 && !conv.on) SFX.walked(w, Math.abs(hp.z - boardZ(hp.x)) < 3.4 || hp.y > 0.3 ? 'wood' : 'path'); } });

  const sky = (wd, hgt) => { const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); [[0, '#2a2146'], [0.3, '#5b3f8a'], [0.52, '#b0669c'], [0.7, '#f08a7c'], [0.85, '#ffb070'], [1, '#ffd9a0']].forEach(([t, col]) => gr.addColorStop(t, col)); g.fillStyle = gr; g.fillRect(0, 0, 8, 256); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(wd, hgt), new THREE.MeshBasicMaterial({ map: tex })); };
  const s1 = sky(1800, 340); s1.position.set(120, 170, 300); s1.rotation.y = Math.PI; const s2 = sky(1100, 340); s2.position.set(560, 170, 20); s2.rotation.y = -Math.PI / 2; const s3 = sky(1800, 340); s3.position.set(120, 170, -330); H.scene.add(s1, s2, s3); H.scene.background = new THREE.Color('#f2b48c');
  const flatMesh = (pts, paint, x, y, z, ppu = 5, glow = 0) => { const m = makeCard(pts, { paper: H.paper, paint, thickness: 0.3, edgeWidth: 0, pxPerUnit: ppu, seed: 77, folds: [], back: false, effects: 0, contact: null, glow }); m.position.set(x, y, z); m.rotation.y = Math.PI; m.castShadow = false; m.receiveShadow = false; H.scene.add(m); return m; };
  [[72, '#ffd6a8'], [56, '#ffb07c'], [40, '#ff8f7a'], [24, '#ffe6b8']].forEach(([r, col], i) => flatMesh(arc(0, 0, r, r, 0, Math.PI, 44), (P) => { P.fill(col); }, 70, 0, 292 - i * 2, 3));
  for (const [x, y, wd, col, zz] of [[40, 34, 120, '#ffd0c0', 282], [112, 50, 100, '#f6a8b0', 283], [56, 66, 80, '#c890c8', 284], [-150, 84, 140, '#e098b8', 282], [250, 58, 130, '#ffc8a8', 280]]) flatMesh([...arc(wd / 2 - 5, 3, 5, 4, -Math.PI / 2, Math.PI / 2, 8), ...arc(-wd / 2 + 5, 3, 5, 4, Math.PI / 2, Math.PI * 1.5, 8)].map(([px, py]) => [px, py + 2]), (P) => { P.fill(col); }, x, y, zz, 3);
  const LAYERS = [['#f2a8b8', '#e08aa8', 258, 30, 62, 0.25], ['#c88ac0', '#a86cb0', 248, 26, 76, 0.4], ['#8a68b8', '#6a4c9c', 238, 22, 64, 0.55], ['#f08aa0', '#c8608c', 228, 16, 50, 0.7], ['#46c6c0', '#1fa39c', 218, 12, 38, 0.85], ['#2a5d86', '#2a2146', 208, 8, 26, 1]];
  LAYERS.forEach(([c0, c1, zz, lo, hi, lit], li) => {
    const r = P2.rng(40 + li * 7), wd = 250 - li * 12, blds = []; let x = -wd / 2;
    while (x < wd / 2 - 6) { const bw = 9 + r() * 9, bh = lo + r() * (hi - lo), kind = Math.floor(r() * 5); blds.push([x, Math.min(bw, wd / 2 - x), bh, kind]); x += bw * (0.8 + r() * 0.3); }
    const pts = [[wd / 2, 0], [wd / 2, lo * 0.4]]; for (let i = blds.length - 1; i >= 0; i--) { const [bx, bw, bh, kind] = blds[i], x1 = Math.min(wd / 2, bx + bw);
      if (kind === 0) pts.push([x1, bh], [bx, bh]);
      else if (kind === 1) pts.push([x1, bh * 0.8], [x1 - bw * 0.2, bh * 0.8], [x1 - bw * 0.2, bh * 0.92], [x1 - bw * 0.36, bh * 0.92], [x1 - bw * 0.36, bh], [bx + bw * 0.36, bh], [bx + bw * 0.36, bh * 0.92], [bx + bw * 0.2, bh * 0.92], [bx + bw * 0.2, bh * 0.8], [bx, bh * 0.8]);
      else if (kind === 2) pts.push([x1, bh * 0.78], [bx + bw * 0.56, bh * 0.78], [bx + bw * 0.5, bh * 1.25], [bx + bw * 0.44, bh * 0.78], [bx, bh * 0.78]);
      else if (kind === 3) pts.push(...arc(bx + bw / 2, bh * 0.82, bw / 2, bh * 0.18, 0, Math.PI, 8));
      else pts.push([x1, bh * 0.86], [x1 - bw * 0.15, bh * 0.86], [x1 - bw * 0.15, bh], [bx + bw * 0.15, bh], [bx + bw * 0.15, bh * 0.86], [bx, bh * 0.86]); }
    pts.push([-wd / 2, lo * 0.4], [-wd / 2, 0]);
    flatMesh(pts, (P) => { P.gradient(c0, c1, 0); for (const [bx, bw, bh, kind] of blds) { P.draw((g) => { g.fillStyle = r() < 0.5 ? P2.shade(c0, -0.12) : P2.shade(c1, 0.1); g.fillRect(bx + 0.4, 0, bw * 0.5, bh * 0.78); }); const win = (g) => { for (let wy = 3; wy < bh * 0.74; wy += 3.6) for (let wx = bx + 1.2; wx < bx + bw - 1.6; wx += 2.3) if (r() < 0.55) g.fillRect(wx, wy, 1.1, 1.9); if (kind === 4 && li > 2) { g.beginPath(); g.arc(bx + bw / 2, bh - 2.2, 1.6, 0, 7); g.fill(); } }; P.draw((g) => { g.fillStyle = P2.rgba('#ffe2a0', 0.4 + lit * 0.5); win(g); }); if (li > 2) P.glow((g) => { g.globalAlpha = 0.5; win(g); }); } }, 70 + (li % 2 ? 8 : -6), 0, zz, 4, 0.9);
  });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffc890', transparent: true, opacity: 0.3, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(70, 0.05, 140); m.scale.set(30, 130, 1); H.scene.add(m); }
  const dusk = new THREE.MeshBasicMaterial({ color: '#4a3470' });
  for (const [x, z, sc] of [[-46, -12, 2.1], [22, -24, 1.9], [-58, -20, 2.4]]) { const q = ST.palm[Math.floor(rnd() * 5)], m = makeCard(q.pts, { materials: [dusk, dusk, dusk] }); m.scale.setScalar(sc); m.position.set(x, 0, z); m.rotation.y = Math.PI + 0.3; m.castShadow = false; m.visible = false; H.scene.add(m); letters.silhouettes = (letters.silhouettes || []).concat(m); }

  const LS = 1.38, pitchX = 4.9 * LS + 0.55, total = 14 * pitchX + 2 * 3.2; let li = 0, xc = 34 + total / 2;
  WORDS.forEach(([word, col], row) => {
    [...word].forEach((ch) => {
      const [pts, paint] = P2.drawnPiece((g, ink) => { g.save(); g.translate(-2.4, 0.5); g.transform(1, 0, SLANT, 1, 0, 0); g.fillStyle = ink(C.navy); strokeGlyph(g, ch, 0.34); g.translate(-0.1, 0.12); g.fillStyle = ink(col); strokeGlyph(g, ch, 0); g.restore(); }, { w: 7.4, h: 7.2, res: 40, finish: false, name: `letter ${ch}` });
      const card = makeCard(pts, { paper: H.paper, paint, thickness: 0.2, edgeWidth: 0.1, pxPerUnit: 36, seed: 2000 + li, back: 'kraft' }); card.scale.setScalar(LS);
      const fm = card.material[0]; fm.emissive.set('#ffffff'); fm.emissiveMap = fm.map; fm.emissiveIntensity = 0.6;
      const h = hinge(card, { at: new THREE.Vector3(xc - pitchX / 2, 0.05, 68 + (li % 2) * 0.6), yaw: Math.PI + ((li * 5) % 3 - 1) * 0.03, open: 0, size: 0.6, rest: -0.06 }); h.group.visible = false; H.scene.add(h.group);
      letters.push({ h, at: li * 0.1 }); li++; xc -= pitchX;
    });
    xc -= 3.2;
  });
}

if (flags.TEST) { heroDoll = makeBigDoll(H, { id: 'hero', seed: 900, ...DRESS.hero }); heroHandle = popup(null, null, { node: heroDoll, height: 5.5, x: 2, z: -4, scale: 0.86 }); H.setHero(heroHandle, { stride: heroDoll.userData.stride }); popup(...K.palm(), { x: -3, z: -9, cross: true }); popup(null, null, { node: car(C.teal, 900), height: 2, x: 8, z: -6 }); }
else build();

let lifeGroup = null;
if (!flags.TEST) {
  const life = createLife({ scene: H.scene, camera: H.camera, heroHeight: H.heroHeight, seed: 31, wind: [0.9, -0.3] });
  life.flock({ size: 4, height: 4.4, every: 26, colors: ['#fff6ea', '#f0dcd8'] });
  life.motes({ count: 40, colors: ['#ffe2b0', '#ffc9c0'], size: [0.04, 0.07], height: [0.6, 5] });
  lifeGroup = life.group; life.reset(H.target);
  H.onStep((t, dt) => life.update(dt, H.target)); H.onRestart(() => life.reset(H.target));
}

const T = { open: 25.0, steer: 26.15, swing: 26.3, end: 29.0, lettersUp: 12.3, lettersDown: 17.2 };
const INTRO = { on: !flags.TEST, t: 0, cut: T.end, stage: 0, gulls: 0 };
const S3 = { pos: [0.7, 6.9, HERO_AT[1] - 12.5], look: [0, 4.3, HERO_AT[1] + 30] };
const cam = flight(H, [
  { t: 0, pos: [-128, 4.4, 36], look: [-96, 2.4, 27], fov: 40 },
  { t: 4, pos: [-100, 5.2, 27], look: [-68, 2.6, 15], fov: 40 },
  { t: 7.2, pos: [-76, 7.6, 7], look: [-46, 3.6, -6], fov: 40 },
  { t: 10.2, pos: [-50, 11, -8], look: [-18, 6.5, -17], fov: 40 },
  { t: 13, pos: [-26, 27, -31], look: [42, 15, 170], fov: 38 },
  { t: 20, pos: [-12, 31, -38], look: [50, 17, 170], fov: 36 },
  { t: 24, pos: S3.pos, look: S3.look, fov: 38 },
  { t: 40, pos: S3.pos, look: S3.look, fov: 38 },
]);
const V3 = THREE.Vector3;
cam.custom = (t, api) => {
  if (t < T.swing || !people.length) return false;
  const m = people[0], u = s01((t - T.swing) / (T.end - T.swing)), d = 10.6, pit = 17 * Math.PI / 180;
  const eLook = new V3(m.at[0], heroLookY(m) - 0.3, m.at[1] + 0.85), ePos = new V3(eLook.x, eLook.y + Math.sin(pit) * d, eLook.z + Math.cos(pit) * d), sPos = new V3(...S3.pos), sLook = new V3(...S3.look);
  const P = new V3((HERO_AT[0] + m.at[0]) / 2, 0, (HERO_AT[1] + m.at[1]) / 2), aS = Math.atan2(sPos.x - P.x, sPos.z - P.z), aE = Math.atan2(ePos.x - P.x, ePos.z - P.z), a0 = aS < 0 ? aS + 2 * Math.PI : aS;
  const a = a0 + (aE + 2 * Math.PI - a0) * u, r = Math.hypot(sPos.x - P.x, sPos.z - P.z) + (Math.hypot(ePos.x - P.x, ePos.z - P.z) - Math.hypot(sPos.x - P.x, sPos.z - P.z)) * u;
  api.pos.set(P.x + Math.sin(a) * r, sPos.y + (ePos.y - sPos.y) * u, P.z + Math.cos(a) * r); api.look.lerpVectors(sLook, eLook, s01(u * 1.25)); api.fov = 38 + (26 - 38) * u; api.focus = eLook;
  return true;
};
const heroLookY = (m) => m.doll.userData.headY * m.scale;
const marker = (() => {
  const [pts, paint] = P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.navy); D.rect(g, -0.07, 0, 0.14, 1.7); g.fillStyle = ink(C.pink); D.poly(g, [[0.05, 1.7], [0.95, 1.4], [0.05, 1.08]]); }, { w: 2.1, h: 1.9, name: 'marker' });
  const h = hinge(makeCard(pts, { paper: H.paper, paint, thickness: 0.06, edgeWidth: 0.06, pxPerUnit: 70, seed: 4242 }), { at: new THREE.Vector3(0, 0.03, 0), yaw: 0.2, open: 0, size: 0.15, rest: -0.08 });
  h.group.visible = false; H.scene.add(h.group);
  return { h, set(goal) { if (goal) { h.group.position.set(goal[0], 0.03, goal[1]); h.group.visible = true; h.reset(0); h.set(1, 0); } else h.set(0, 0); } };
})();

const carCue = (() => {
  const [pts, paint] = P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.cream); D.poly(g, [[0, 0], [0.42, 0.55], [1.0, 0.55], [1.0, 2.3], [-1.0, 2.3], [-1.0, 0.55], [-0.42, 0.55]]); g.fillStyle = ink(C.navy); D.ell(g, 0, 1.42, 0.68, 0.68); g.fillStyle = ink(C.cream); D.ell(g, 0, 1.42, 0.44, 0.44); g.fillStyle = ink(C.navy); D.rect(g, -0.6, 1.34, 1.2, 0.16); D.rect(g, -0.08, 0.8, 0.16, 0.62); g.fillStyle = ink(C.gold); D.ell(g, 0, 1.42, 0.17, 0.17); }, { w: 2.3, h: 2.5, res: 90, finish: false, name: 'car cue' });
  const m = makeCard(pts, { paper: H.paper, paint, thickness: 0.07, edgeWidth: 0.07, pxPerUnit: 70, seed: 515, folds: [], back: 'mirror' }); m.castShadow = false; m.visible = false; m.material[0].emissive.set('#ffffff'); m.material[0].emissiveMap = m.material[0].map; m.material[0].emissiveIntensity = 0.45; H.scene.add(m); return m;
})();
const skip = () => { if (INTRO.on && INTRO.t > 2 && INTRO.t < T.open - 0.1) { INTRO.t = T.open - 0.3; for (const L of letters) { L.h.reset(0); L.h.group.visible = false; L.s = 3; } } };
const route = []; for (let x = 6; x < SPOT.bea.spot[0] - 3; x += 7) route.push([x, boardZ(x) - 0.4]);
const KEYS = new Set(), carC = () => [conv.x + Math.sin(conv.th) * 1.5, conv.z - Math.cos(conv.th) * 1.5];
const heroNearCar = (r) => { const p = window.__papercraft.heroPos, [cx, cz] = carC(); return Math.hypot(p.x - cx, p.z - cz) < r; };
const drive = {
  enter() { if (conv.on || INTRO.on) return false; talk.close(); if (conv.solid) { const i = conv.walk.solids.indexOf(conv.solid); if (i >= 0) conv.walk.solids.splice(i, 1); } conv.on = true; conv.t = 0; conv.v = 0; SFX.thump(); SFX.setIdle(true); KEYS.clear(); return true; },
  exit() { if (!conv.on || Math.abs(conv.v) > 2.2) return false; const hook = window.__papercraft, [cx, cz] = carC(); conv.on = false; conv.v = 0; SFX.setIdle(false); SFX.thump(); for (const dz of [3.2, -3.4, 4.4]) if (hook.place(cx - 0.6, cz + dz) != null) break; heroHandle.group.position.y = 0.02; return true; },
};
const DEMO_Q = new URLSearchParams(location.search).has('demo');
const talk = flags.TEST ? null : createTalk(H, { people, cards: false, sfx: SFX, onGoal: (goal) => marker.set(goal), onBlend: (e) => { if (lifeGroup) lifeGroup.visible = e < 0.4; },
  hold: () => INTRO.on || conv.on, locked: () => INTRO.on, onKey: skip, camHold: () => INTRO.on,
  onUse: (near) => { if (conv.on) { drive.exit(); return true; } const p = window.__papercraft.heroPos, [cx, cz] = carC(), cd = Math.hypot(p.x - cx, p.z - cz); if (cd < 10 && (talk.busy() || !near || cd <= near.dist + 2.5)) return drive.enter(); return false; },
  onClick: (x, z) => { const [cx, cz] = carC(); if (!conv.on && Math.hypot(x - cx, z - cz) < 5 && heroNearCar(16)) return drive.enter(); return conv.on; },
  demoPlan: [{ wait: T.end + 0.3 }, { converse: 0, pick: 0 }, { walk: [...route, SPOT.bea.spot] }, { converse: 1, pick: 1 }, { walk: [[BEA_X + 1.5, roadZ(BEA_X) + 6.4]] }, { until: () => drive.enter() || conv.on },
    { until: () => conv.on && conv.x > MX - 18 && Math.abs(conv.v) < 0.5 }, { until: () => drive.exit() || !conv.on }, { walk: [[MX - 0.6, boardZ(MX) + 1.5], SPOT.lenny.spot] }, { converse: 2, pick: 1 }, { until: () => boxState > 1 }, { wait: 60 }] });
let boxState = 0, boxT = 0;
H.start();
talk?.attach();
if (!flags.TEST) {
  cam.attach();
  { const wm = document.getElementById('wordmark'); if (wm) drawWordmark(wm, H.paper.sheet); }
  pageEdges(H, { x0: PAGE.x0, x1: PAGE.x1, paperMaterial });
  for (const sgn of SIGNS) sgn.userData.setGlow?.(2.3);
  const hook = window.__papercraft; SFX.loadMusic('media/radio.mp3');
  addEventListener('keydown', (e) => KEYS.add(e.code)); addEventListener('keyup', (e) => KEYS.delete(e.code)); addEventListener('blur', () => KEYS.clear());
  const fold = foldOut(H, { sfx: SFX, reach: 1, dist: (h, p) => { const d = h.x - p.x, ahead = conv.on ? 64 : 22; return h === marisolH ? 9 : d > -26 && d < ahead ? 0 : 9; }, startUp: (h) => h.x < 42 && h !== marisolH, hold: () => INTRO.on });
  let waveT = 0, gullT = 30, dw = 0; const wrote = new V3(NaN, 0, 0), base = new V3(), dPos = new V3(), dLook = new V3(), lk = new V3();
  cam.extra = (c, post) => { if (dw <= 0) return; const e = s01(dw); if (!c.position.equals(wrote)) base.copy(c.position); c.position.lerpVectors(base, dPos, e); lk.copy(H.target).lerp(dLook, e); c.lookAt(lk); c.updateMatrixWorld(); wrote.copy(c.position); post.focus.lerp(dLook, e); };
  const resetIntro = () => { INTRO.on = true; INTRO.t = 0; INTRO.stage = 0; INTRO.gulls = 0; waveT = 0; marker.h.reset(0); for (const L of letters) { L.h.reset(0); L.h.group.visible = false; L.s = 0; } for (const m of letters.silhouettes) m.visible = true; marisolH.reset(0); marisolH.group.visible = false; marisolH.up = false;
    for (const c of CARS) { c.on = false; c.v = 0; c.th = 0; c.steer = 0; c.x = c.x0; c.z = c.z0; c.h.x = c.x; c.h.group.position.set(c.x, c.h.group.position.y, c.z); c.h.group.rotation.y = 0; if (c.solid && !c.walk.solids.includes(c.solid)) c.walk.solids.push(c.solid); } boxState = 0; if (boxMesh.parent !== decks.pier) decks.pier.add(boxMesh); boxMesh.position.set(...boxMesh.userData.home); boxMesh.rotation.set(0, 0, 0); for (const m of movers) m.x = m.x0; };
  H.onRestart(resetIntro);
  let first = true;
  H.onStep((t, dt) => {
    if (first) { first = false; resetIntro(); }
    for (const L of letters) L.h.update(dt);
    marker.h.update(dt); if (marker.h.open === 0 && marker.h.p < 0.03) marker.h.group.visible = false;
    SFX.update(dt, talk.speaking()); SFX.music(dt, INTRO.on ? 0.5 : conv.on ? 0.55 : 0.2);
    const eye = INTRO.on ? (cam.at(INTRO.t), cam.pos) : H.camera.position;
    heroDoll.userData.faceCamera(heroHandle.group.rotation.y, Math.atan2(eye.x - hook.heroPos.x, eye.z - hook.heroPos.z));
    for (const { h, r, x0, z0 } of waves) { if (!h.up) continue; const ph = t * 1.05 - r * 1.05 + x0 * 0.012, k = Math.sin(ph); h.sway = -0.34 * k - 0.1; h.group.position.x = x0 + 1.8 * Math.sin(ph * 0.5 + r * 0.7); h.group.position.z = z0 - 1.1 * k; }
    foamLine.position.z = -(0.9 * Math.sin(t * 1.05 - 6.3) + 0.4);
    for (const b of boats) { b.h.sway = 0.07 * Math.sin(t * 1.3 + b.x0); b.h.group.position.y = 0.05 + 0.12 * Math.sin(t * 1.1 + b.x0 * 0.7); }
    if ((waveT -= dt) <= 0) { waveT = 5.98; if (!talk.speaking()) SFX.wave(INTRO.on && INTRO.t < 11 ? 0.2 : INTRO.on ? 0.1 : hook.heroPos.z > boardZ(hook.heroPos.x) - 6 ? 0.05 : 0.025); }
    for (const m of movers) {
      if (m.road) { m.x -= 4.4 * dt; if (m.x < 112) m.x = MX - 12; } else m.x = m.x0 - INTRO.t * 8.2 - (INTRO.on ? 0 : 400);
      const x = m.x; m.node.visible = m.road ? Math.abs(x - hook.heroPos.x) < 75 && x < hook.heroPos.x + 66 : x > -150;
      m.node.position.set(x + 3.7, 0.03, roadZ(x) - 4.0); m.node.rotation.y = Math.PI - Math.atan2(roadZ(x - 1) - roadZ(x + 1), 2) * -1; for (const w of m.node.userData.car.wheels) w.rotation.z = x * 1.5;
      if (m.road && conv.on) { const [cx, cz] = carC(), ddx = cx - x, ddz = cz - (roadZ(x) - 2.5), dd = Math.hypot(ddx, ddz); if (dd < 4.8) { conv.z += (4.8 - dd) * 0.25 * (ddz >= 0 ? 1 : -1); conv.v *= 0.97; } }
    }
    if (!conv.on) { const p = hook.heroPos; let best = Infinity; for (const c of CARS) { const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < best) { best = d; conv = c; } } }
    { const canIn = !conv.on && !INTRO.on && heroNearCar(10), canOut = conv.on && Math.abs(conv.v) < 2.2 && conv.t > 1; carCue.visible = canIn || canOut;
      if (carCue.visible) { const [cx, cz] = carC(); carCue.position.set(cx + 0.4, 3.5 + (canOut ? 2.6 : 0) + 0.22 * Math.sin(t * 3.2), cz + 1.7); carCue.rotation.set(0, 0, canOut ? Math.PI : 0.06 * Math.sin(t * 2.1)); if (canOut) carCue.position.y += 2.4; } }

    if (conv.on) {
      conv.t += dt;
      let up = KEYS.has('KeyW') || KEYS.has('ArrowUp'), down = KEYS.has('KeyS') || KEYS.has('ArrowDown'), st = (KEYS.has('KeyD') || KEYS.has('ArrowRight') ? 1 : 0) - (KEYS.has('KeyA') || KEYS.has('ArrowLeft') ? 1 : 0);
      const [cx0, cz0] = carC(), slope = (roadZ(cx0 + 1) - roadZ(cx0 - 1)) / 2, tang = Math.atan(slope), off = cz0 - roadZ(cx0);
      if (DEMO_Q) { up = cx0 < MX - 24; down = cx0 > MX - 15 && conv.v > 0.2; st = 0; }
      const TOP = 11.5;
      if (up) conv.v += 8 * dt; else if (down) conv.v -= (conv.v > 0 ? 15 : 7) * dt; else conv.v -= Math.sign(conv.v) * Math.min(Math.abs(conv.v), 3 * dt);
      conv.v = Math.max(-5.5, Math.min(TOP, conv.v)); if (cx0 > PAGE.x1 - 9 && conv.v > 0) conv.v *= 0.9; if (cx0 < PAGE.x0 + 9 && conv.v < 0) conv.v *= 0.9;
      conv.steer += (st - conv.steer) * (1 - Math.exp(-dt * 6));
      const moving = Math.min(1, Math.abs(conv.v) / 3) * Math.sign(conv.v || 1);
      conv.th += conv.steer * 1.5 * moving * dt;
      const fwd = Math.cos(conv.th) >= 0 ? tang : tang + Math.PI; let da = fwd - conv.th; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (!st || DEMO_Q) conv.th += da * (1 - Math.exp(-dt * 2.6)) * Math.min(1, Math.abs(conv.v) / 3);
      conv.x += Math.cos(conv.th) * conv.v * dt; conv.z += Math.sin(conv.th) * conv.v * dt;
      const [cx, cz] = carC(), o2 = cz - roadZ(cx), lim = 3.6; if (Math.abs(o2) > lim) { conv.z -= (o2 - Math.sign(o2) * lim) * (1 - Math.exp(-dt * 7)); conv.v *= 1 - 0.6 * dt; }
      void off;
      const g = conv.h.group; g.position.set(conv.x, 0.02 + Math.abs(Math.sin(conv.t * 9)) * 0.025 * Math.min(1, Math.abs(conv.v) / 4), conv.z); g.rotation.y = -conv.th; conv.node.rotation.x = -conv.steer * 0.05 * moving;
      conv.h.x = conv.x; for (const w of conv.node.userData.car.wheels) w.rotation.z -= conv.v * dt / 0.64;
      const sx = conv.x + Math.cos(conv.th) * 0.15 + Math.sin(conv.th) * 2.2, sz = conv.z + Math.sin(conv.th) * 0.15 - Math.cos(conv.th) * 2.2;
      hook.place(sx, sz); const hg = heroHandle.group, hop = conv.t < 0.4 ? Math.sin(conv.t / 0.4 * Math.PI) * 0.9 : 0; hg.position.set(sx, -1.42 + hop + Math.abs(Math.sin(conv.t * 9)) * 0.03 * Math.min(1, Math.abs(conv.v) / 4), sz); hg.rotation.y = Math.PI / 2 - conv.th;
      heroDoll.userData.faceCamera(hg.rotation.y, Math.atan2(H.camera.position.x - sx, H.camera.position.z - sz));
      heroDoll.userData.stride(0, 0);
      SFX.motor(dt, conv.v, conv.steer, up || (down && conv.v < 0.1));
      dLook.set(cx + Math.cos(conv.th) * (6 + conv.v * 0.7), 1.6, cz + Math.sin(conv.th) * 3 - 5); dPos.set(dLook.x - Math.cos(conv.th) * 7, dLook.y + 31, dLook.z + 45);
    }
    dw += Math.sign((conv.on ? 1 : 0) - dw) * Math.min(Math.abs((conv.on ? 1 : 0) - dw), dt / 1.2);

    const len = people[2];
    if (len && boxState === 0 && len.heard.some(Boolean) && !talk.busy()) { boxState = 1; boxT = 0; const wp = new V3(); boxMesh.getWorldPosition(wp); H.scene.add(boxMesh); boxMesh.position.copy(wp); boxMesh.userData.from = wp.clone(); SFX.flap({ size: 0.4, up: true }); }
    if (boxState === 1) { boxT += dt; const u = Math.min(1, boxT / 0.85), p = hook.heroPos, to = new V3(p.x + 0.9, p.y + 2.0, p.z + 0.9); boxMesh.position.lerpVectors(boxMesh.userData.from, to, s01(u)); boxMesh.position.y += Math.sin(u * Math.PI) * 2.6; boxMesh.rotation.z = u * Math.PI * 2; if (u >= 1) { boxState = 2; heroDoll.add(boxMesh); boxMesh.position.set(0.95, 2.1, 1.0); boxMesh.rotation.set(0, 0, 0.1); } }

    if (!INTRO.on) { if ((gullT -= dt) <= 0) { gullT = 22 + (t * 7 % 17); if (!talk.speaking()) SFX.gull(); } return; }
    INTRO.t += dt; cam.t = INTRO.t; cam.weight = 1; const it = INTRO.t;
    if (INTRO.gulls === 0 && it > 2.5) { INTRO.gulls = 1; SFX.gull(); }
    if (INTRO.gulls === 1 && it > 10.4) { INTRO.gulls = 2; SFX.gull(); SFX.wave(0.05); }
    if (INTRO.gulls === 2 && it > 20.5) { INTRO.gulls = 3; SFX.gull(); }
    for (const L of letters) {
      if (!L.s && it > T.lettersUp + L.at && it < T.lettersDown) { L.s = 1; L.h.group.visible = true; L.h.set(1, 0); SFX.flap({ size: 0.5, up: true }); }
      if (L.s === 1 && it > T.lettersDown + (letters.length * 0.11 - L.at) * 0.6) { L.s = 2; L.h.set(0, 0); SFX.flap({ size: 0.5, up: false }); }
      if (L.s === 2 && L.h.p < 0.04) { L.s = 3; L.h.group.visible = false; }
    }
    if (it > 22) for (const m of letters.silhouettes) m.visible = false;
    if (INTRO.stage === 0 && it >= T.open) { INTRO.stage = 1; for (const L of letters) { L.h.reset(0); L.h.group.visible = false; L.s = 3; } marisolH.up = true; talk.open(people[0]); }
    if (INTRO.stage === 1 && it >= T.steer) { INTRO.stage = 2; marisolH.group.visible = true; marisolH.reset(0); marisolH.set(1, 0.1); }
    if (INTRO.stage === 2 && it < T.steer + 0.2) hook.steer(people[0].at[0] - hook.heroPos.x, people[0].at[1] - 2.6 - hook.heroPos.z); else if (INTRO.stage === 2) { hook.steer(null); INTRO.stage = 3; }
    if (it >= T.end) { INTRO.on = false; cam.weight = 0; hook.steer(null); talk.setW(1); }
  });
  window.__world = { sfx: SFX, intro: INTRO, T, skip, drive, get conv() { return conv; }, cars: CARS, movers, laneCheck: () => laneCheck(LANE, SOLIDS, 1.6), settleCheck: fold.settleCheck, revealAll: fold.revealAll, risen: fold.risen, total: fold.total, box: () => boxState, endIntro() { INTRO.t = Math.max(INTRO.t, T.end - 0.02); if (INTRO.stage < 2) { marisolH.group.visible = true; marisolH.reset(1); marisolH.up = true; INTRO.stage = 3; talk.open(people[0]); } } };
}
