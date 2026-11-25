export const s01 = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const baseZ = (x) => 0.5 + 2.6 * Math.sin(x * 0.075) + 1.4 * Math.sin(x * 0.17 + 1);
export const boardZ = baseZ;
export const roadZ = (x) => baseZ(x) * 0.35 - 13.6;
export const coastC = (x) => roadZ(x) - 1.3;
export const MX = 102;
export const PAGE = { x0: -125, x1: 125, z0: -150, z1: 190 };
export const shoreZ = (x) => baseZ(x) * 0.6 + 14.5 + 1.2 * Math.sin(x * 0.11) - 8.5 * s01((x - (MX - 34)) / 16);
export const S2 = -56, S3 = -104, XS = [-85, -25, 20, 80], LANE_W = 1.6, END = PAGE.x1 - 4, LIM = 6.2;
export const STORE = { x: 36, z: -23.4, w: 15, h: 6.2, d: 9 };
export const ALLEY = { x: -2, w: 6, z0: S2 - 7.5, z1: S3 + 7.5 };
export const COURT = { x: -55, z: -120, w: 24, d: 13 };
export const PLAZA = { x: -2.5, z: -123, r: 9 };
export const LOT = { x0: 36, x1: 64, z0: -127, z1: -108 };
export const AREAS = [LOT];

export const BUILDINGS = [
  ...[[-113, 13, 12, 'lilac', 'coral', 'star'], [-100, 11, 11, 'turq', 'pink', 'palm'], [-69, 14, 14, 'pink', 'teal', 'flamingo'], [-54, 13, 10.5, 'cream', 'coral', 'sun'], [-39.5, 11, 13, 'lilac', 'orange', 'star'],
    [-9.5, 13, 11, 'peach', 'teal', 'glass'], [5.5, 11, 14.5, 'turq', 'coral', 'flamingo'], [57, 14, 14, 'lilac', 'coral', 'glass'], [97, 12, 11, 'turq', 'orange', 'flamingo']]
    .map(([x, w, h, wall, accent, icon]) => ({ kind: 'hotel', x, z: -23.4, w, h, d: 9, wall, accent, icon })),
  { kind: 'hotel', x: 117, z: roadZ(117) - 9, w: 11, h: 6.5, d: 7, wall: 'cream', accent: 'teal', icon: 'star' },
  ...[[-112, 13, 8.5, 'club', 'note'], [-99.5, 11, 6.5, 'diner', 'cup'], [-68, 15, 6.5, 'diner', 'cup'], [-51, 13, 9, 'club', 'glass'], [-38.5, 9, 7.5, 'club', 'star'],
    [-11, 12, 9.5, 'club', 'note'], [6.5, 10, 6, 'diner', 'sun'], [37, 16, 10, 'club', 'star'], [55, 14, 7, 'diner', 'cup'], [67.5, 9, 6, 'diner', 'palm'], [96, 13, 9, 'club', 'glass'], [112, 12, 6.5, 'diner', 'cup']]
    .map(([x, w, h, kind, icon], i) => ({ kind, x, z: S2 - 7.5, w, h, d: 8, icon, i })),
  ...[[-115, 9, 0], [-102, 9, 1], [95, 8, 2], [106, 9, 3], [117.5, 8, 4], [-110, 9, 5, -133], [-75, 10, 6, -133], [-40, 9, 7, -133], [30, 9, 8, -133], [70, 10, 9, -133], [108, 9, 10, -133], [-2, 10, 11, -134], [-95, 8, 12, -133], [88, 8, 13, -133],
    [-112, 9, 14, -82], [-66, 8, 15, -82], [-44, 9, 16, -82], [8.5, 8, 17, -82], [40, 9, 18, -82], [62, 8, 19, -82], [104, 9, 20, -82]]
    .map(([x, w, i, z = S3 - 7.5]) => ({ kind: 'house', x, z, w, h: 4.6 + (i % 3) * 0.7, d: 7, i })),
];
export const inBuilding = (x, z, pad = 0.35) => BUILDINGS.some((b) => x > b.x - b.w / 2 - pad && x < b.x + b.w / 2 + pad && z < b.z + pad && z > b.z - b.d - pad);

export const nodes = [], edges = [];
const node = (x, z) => { let n = nodes.find((q) => Math.hypot(q.x - x, q.z - z) < 0.5); if (!n) { n = { i: nodes.length, x, z, out: [] }; nodes.push(n); } return n; };
function addEdge(pts, street) {
  const a = node(...pts[0]), b = node(...pts[pts.length - 1]), cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const e = { i: edges.length, pts, cum, len: cum[cum.length - 1], a, b, street };
  edges.push(e); a.out.push({ e, dir: 1 }); b.out.push({ e, dir: -1 });
}
{
  const cuts = [-END, ...XS, END];
  for (let k = 0; k < cuts.length - 1; k++) {
    const x0 = cuts[k], x1 = cuts[k + 1], pts = [];
    for (let x = x0; x < x1 - 0.5; x += 6) pts.push([x, coastC(x)]);
    pts.push([x1, coastC(x1)]); addEdge(pts, 'coast');
  }
  for (const [z, name] of [[S2, 'neon'], [S3, 'back']]) for (let k = 0; k < cuts.length - 1; k++) addEdge([[cuts[k], z], [cuts[k + 1], z]], name);
  for (const x of XS) { addEdge([[x, coastC(x)], [x, S2]], 'cross'); addEdge([[x, S2], [x, S3]], 'cross'); }
}
export const D = nodes.map((a) => nodes.map((b) => (a === b ? 0 : Infinity)));
for (const e of edges) { D[e.a.i][e.b.i] = Math.min(D[e.a.i][e.b.i], e.len); D[e.b.i][e.a.i] = D[e.a.i][e.b.i]; }
for (let k = 0; k < nodes.length; k++) for (let i = 0; i < nodes.length; i++) for (let j = 0; j < nodes.length; j++) if (D[i][k] + D[k][j] < D[i][j]) D[i][j] = D[i][k] + D[k][j];

export function pointAt(e, s) {
  s = clamp(s, 0, e.len); let i = 1;
  while (i < e.cum.length - 1 && e.cum[i] < s) i++;
  const [ax, az] = e.pts[i - 1], [bx, bz] = e.pts[i], l = e.cum[i] - e.cum[i - 1] || 1, u = (s - e.cum[i - 1]) / l;
  return [ax + (bx - ax) * u, az + (bz - az) * u, (bx - ax) / l, (bz - az) / l];
}
export const along = (e, dir, s) => { if (dir > 0) return pointAt(e, s); const p = pointAt(e, e.len - s); return [p[0], p[1], -p[2], -p[3]]; };
export const laneAt = (e, dir, s) => { const [x, z, tx, tz] = along(e, dir, s); return [x - tz * LANE_W, z + tx * LANE_W, tx, tz]; };
export function nearest(x, z, th = null) {
  let best = null, bs = Infinity;
  const c = th == null ? 0 : Math.cos(th), sn = th == null ? 0 : Math.sin(th);
  for (const e of edges) for (let i = 1; i < e.pts.length; i++) {
    const [ax, az] = e.pts[i - 1], [bx, bz] = e.pts[i], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, l = Math.sqrt(l2);
    const u = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1), px = ax + dx * u, pz = az + dz * u, d = Math.hypot(x - px, z - pz);
    const score = th == null ? d : d + (1 - Math.abs((dx * c + dz * sn) / l)) * 6;
    if (score < bs) { bs = score; best = { e, s: e.cum[i - 1] + u * l, d, px, pz, tx: dx / l, tz: dz / l }; }
  }
  return best;
}
export function routeCost(fromNode, e, s) { return Math.min(D[fromNode.i][e.a.i] + s, D[fromNode.i][e.b.i] + e.len - s); }

const band = (f, x0, x1, step = 6) => { const p = []; for (let x = x0; x < x1; x += step) p.push([x, f(x)]); p.push([x1, f(x1)]); return p; };
export const TRACKS = [
  { pts: band(boardZ, -119, 119), w: 2.2, board: true },
  { pts: band((x) => roadZ(x) - 6.6, -119, 119), w: 0.35 },
  ...[S2, S3].flatMap((z) => [-1, 1].map((sd) => ({ pts: [[-119, z + sd * 6.6], [119, z + sd * 6.6]], w: 0.35 }))),
  ...XS.flatMap((x) => [-1, 1].map((sd) => ({ pts: [[x + sd * 6.6, roadZ(x) - 6.6], [x + sd * 6.6, S3 - 6.6]], w: 0.35 }))),
  { pts: [[ALLEY.x, ALLEY.z0 + 0.5], [ALLEY.x, ALLEY.z1 - 0.5]], w: 0.8 },
];
for (const t of TRACKS) { t.cum = [0]; for (let i = 1; i < t.pts.length; i++) t.cum.push(t.cum[i - 1] + Math.hypot(t.pts[i][0] - t.pts[i - 1][0], t.pts[i][1] - t.pts[i - 1][1])); t.len = t.cum[t.cum.length - 1]; }
export const trackAt = (t, s) => pointAt(t, s);
