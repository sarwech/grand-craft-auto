import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { makeCard, paperMaterial } from 'papercraft/lib/paperkit-3d.js';
import { headMaterial, roundMask } from './screen.js';

const D = P2.draw2;
const PROFILE = -Math.PI / 2, T = 0.05, GAP = 0.03, SIDE = 0.01;
const Z = { hair: 0.16, face: 0.08, torso: 0, legs: -0.16 };

const ext = ([pts]) => pts.reduce((e, [x, y]) => ({ x0: Math.min(e.x0, x), x1: Math.max(e.x1, x), y0: Math.min(e.y0, y), y1: Math.max(e.y1, y) }),
  { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });

function clipSpan(pts, axis, lo, hi) {
  return [[lo, 1], [hi, -1]].reduce((poly, [v, s]) => {
    const out = [], ok = (p) => s * (p[axis] - v) >= 0;
    poly.forEach((a, i) => {
      const b = poly[(i + 1) % poly.length];
      if (ok(a)) out.push(a);
      if (ok(a) !== ok(b)) { const t = (v - a[axis]) / (b[axis] - a[axis]); out.push(axis ? [a[0] + (b[0] - a[0]) * t, v] : [v, a[1] + (b[1] - a[1]) * t]); }
    });
    return out;
  }, pts);
}

const arc = (cx, cy, rx, ry, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });

const HAIR = {
  short: (gg, ink, c) => {
    gg.fillStyle = ink(c);
    D.poly(gg, [...arc(0, 0.4, 0.4, 0.41, 0, Math.PI, 18), [-0.39, 0.3], [-0.31, 0.3], [-0.3, 0.52], [-0.12, 0.6], [0.14, 0.57], [0.3, 0.5], [0.31, 0.3], [0.39, 0.3]]);
  },
  curly: (gg, ink, c) => {
    gg.fillStyle = ink(c);
    const out = [];
    for (let i = 0; i <= 40; i++) {
      const a = -0.5 + (Math.PI + 1.0) * i / 40, bump = 1 + 0.07 * Math.abs(Math.sin(a * 7.5));
      const rx = 0.47 * bump, ry = 0.47 * bump;
      out.push([Math.cos(a) * rx, 0.4 + Math.sin(a) * ry]);
    }
    const left = [[-0.39, 0.12], [-0.39, -0.06], [-0.36, -0.2], [-0.3, -0.24], [-0.24, -0.14], [-0.27, 0.1], [-0.3, 0.42], [-0.16, 0.57], [0, 0.6]];
    const right = left.slice(0, -1).map(([x, y]) => [-x, y]).reverse();
    D.poly(gg, [...out, ...left, ...right]);
    gg.fillStyle = ink(P2.shade(c, 0.22), 'print');
    for (const [x, y] of [[-0.3, 0.66], [0.02, 0.76], [0.31, 0.62], [-0.36, 0.3], [0.37, 0.28], [-0.33, -0.05], [0.33, -0.08]]) D.ell(gg, x, y, 0.05, 0.035, 0.6);
  },
  bob: (gg, ink, c) => {
    gg.fillStyle = ink(c);
    D.poly(gg, [...arc(0, 0.4, 0.45, 0.44, 0, Math.PI, 18), [-0.45, 0.16], [-0.4, 0.02], [-0.3, 0.0], [-0.26, 0.12], [-0.28, 0.5], [0.06, 0.53], [0.2, 0.47], [0.28, 0.5], [0.26, 0.12], [0.3, 0.0], [0.4, 0.02], [0.45, 0.16]]);
    gg.fillStyle = ink(P2.shade(c, 0.2), 'print'); D.rect(gg, -0.2, 0.7, 0.3, 0.035, 0.015);
  },
  cap: (gg, ink, c, s) => {
    gg.fillStyle = ink(s.hair);
    D.poly(gg, [[-0.38, 0.3], [-0.31, 0.3], [-0.3, 0.5], [0.3, 0.5], [0.31, 0.3], [0.38, 0.3], [0.4, 0.56], [-0.4, 0.56]]);
    gg.fillStyle = ink(c);
    D.poly(gg, [...arc(0, 0.5, 0.42, 0.36, 0, Math.PI, 16)]);
    gg.fillStyle = ink(P2.shade(c, -0.2));
    D.rect(gg, -0.46, 0.48, 0.92, 0.1, 0.05);
    gg.fillStyle = ink('#f3e7cf', 'print'); D.ell(gg, 0, 0.87, 0.06, 0.05);
  },
};

export function makeDoll(H, s) {
  const THREE = H.THREE, g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  let seed = s.seed;
  const card = ([pts, paint], { x = 0, y = 0, z = 0, ry = 0, parent = body, back = 'mirror', name = '', cut = null } = {}) => {
    const m = makeCard(pts, { paint, paper: H.paper, thickness: T, edgeWidth: 0.04, pxPerUnit: s.ppu || 96, seed: seed++, back, folds: [], geomPts: cut });
    m.position.set(x, y, z); m.rotation.y = ry; m.name = `${s.id} ${name}`; parent.add(m); return m;
  };
  const piece = (draw, w, h, name) => P2.drawnPiece(draw, { w, h, name: `${s.id} ${name}` });
  const behind = (p, z0) => z0 - T / 2 - GAP - ext(p).x1;
  const plain = (c) => (P) => { P.gradient(P2.shade(c, 0.08), P2.shade(c, -0.1), 0.5); P.felt(); P.innerShade(P2.shade(c, -0.5), { alpha: 0.25, blurPx: 8 }); };
  const topSide = P2.shade(s.top, -0.1);

  const torso = piece((gg, ink) => { gg.fillStyle = ink(s.top); D.rect(gg, -0.4, 0, 0.8, 1.26, 0.2); s.torso?.(gg, ink); }, 0.9, 1.3, 'torso');
  const torsoY = 0.8, tx = ext(torso), torsoTop = torsoY + tx.y1;
  card(torso, { y: torsoY, z: Z.torso, back: plain(P2.shade(s.top, -0.06)), name: 'torso' });
  const torsoSide = piece((gg, ink) => {
    gg.fillStyle = ink(topSide); D.rect(gg, -0.24, 0, 0.48, 1.22, 0.18);
    gg.fillStyle = ink(P2.shade(s.top, -0.28), 'print'); D.rect(gg, -0.02, 0.06, 0.04, 1.08);
  }, 0.55, 1.3, 'torso side');
  const DEPTH = 0.32, torsoSideZ = behind(torsoSide, Z.torso), torsoBack = Z.torso - T / 2 - GAP - DEPTH;
  card(torsoSide, { y: torsoY + 0.02, z: torsoSideZ, ry: PROFILE, name: 'torso side', cut: clipSpan(torsoSide[0], 0, torsoBack - torsoSideZ, 9) });

  const legFront = (i) => piece((gg, ink) => { gg.fillStyle = ink(s.legs); D.rect(gg, -0.1, 0.18, 0.2, 0.8, 0.05); gg.fillStyle = ink(s.shoes); D.rect(gg, -0.12, 0, 0.24, 0.22, 0.07); }, 0.3, 1.0, `leg ${i}`);
  const legSide = (i) => piece((gg, ink) => { gg.fillStyle = ink(P2.shade(s.legs, -0.08)); D.rect(gg, -0.1, 0.18, 0.2, 0.8, 0.05); gg.fillStyle = ink(s.shoes); D.rect(gg, -0.1, 0, 0.3, 0.22, 0.08); }, 0.45, 1.0, `leg ${i} side`);
  const hipX = ext(legFront(0)).x1 + T / 2 + SIDE;
  const legs = [-hipX, hipX].map((x, i) => {
    const hip = new THREE.Group(); hip.position.set(x, 0.95, Z.legs); body.add(hip);
    const side = legSide(i);
    card(legFront(i), { y: -0.97, parent: hip, name: `leg ${i}` });
    card(side, { y: -0.97, z: behind(side, 0), ry: PROFILE, parent: hip, name: `leg ${i} side` });
    return hip;
  });

  const headY = 1.9;
  const face = piece((gg, ink) => {
    gg.fillStyle = ink(s.skin); D.ell(gg, 0, 0.38, 0.36, 0.38);
    gg.fillStyle = ink('#2c1a1c', 'print'); D.ell(gg, -0.125, 0.35, 0.04, 0.05); D.ell(gg, 0.125, 0.35, 0.04, 0.05);
    gg.fillStyle = ink(P2.mix(s.skin, '#d9735f', 0.42), 'print'); D.ell(gg, -0.21, 0.24, 0.055, 0.04); D.ell(gg, 0.21, 0.24, 0.055, 0.04);
    gg.fillStyle = ink('#8a3b30', 'print'); D.rect(gg, -0.07, 0.15, 0.14, 0.032, 0.016);
    s.face?.(gg, ink);
  }, 0.8, 0.8, 'face');
  card(face, { y: headY, z: Z.face, back: plain(s.hair), name: 'face' });
  const headSide = piece((gg, ink) => {
    gg.fillStyle = ink(P2.shade(s.skin, -0.04)); D.ell(gg, 0.08, 0.32, 0.22, 0.3);
    gg.fillStyle = ink(P2.shade(s.hairStyle === 'cap' ? s.cap : s.hair, -0.06)); D.ell(gg, -0.08, 0.42, 0.25, 0.3);
    if (s.hairStyle === 'curly' || s.hairStyle === 'bob') D.rect(gg, -0.3, 0.12, 0.26, 0.36, 0.1);
  }, 0.7, 0.8, 'head side');
  const headSideZ = behind(headSide, Z.face), headBack = headSideZ + ext(headSide).x0;
  card(headSide, { y: headY, z: headSideZ, ry: PROFILE, name: 'head side', cut: clipSpan(headSide[0], 1, torsoTop + GAP - headY, s.hairStyle === 'cap' ? 0.4 : 0.58) });
  const hairCol = s.hairStyle === 'cap' ? s.cap : s.hair, LIFT = 0.3;
  const hair = piece((gg, ink) => { gg.save(); gg.translate(0, LIFT); HAIR[s.hairStyle](gg, ink, hairCol, s); gg.restore(); }, 1.2, 1.3, 'hair');
  card(hair, { y: headY - LIFT, z: Z.hair, back: plain(hairCol), name: 'hair' });

  const armArt = (c, name) => piece((gg, ink) => {
    gg.fillStyle = ink(c); D.rect(gg, -0.1, 0.14, 0.2, 0.66, 0.09);
    gg.fillStyle = ink(s.cuff || P2.shade(c, -0.2)); D.rect(gg, -0.1, 0.12, 0.2, 0.09, 0.04);
    gg.fillStyle = ink(s.skin); D.ell(gg, 0, 0.08, 0.09, 0.08);
  }, 0.3, 0.85, name);
  const shoulderX = tx.x1 + ext(armArt(s.top, 'arm')).x1 + SIDE;
  const arms = [-shoulderX, shoulderX].map((x, i) => {
    const sh = new THREE.Group(); sh.position.set(x, 1.98, Z.torso); body.add(sh);
    const side = armArt(topSide, `arm ${i} side`);
    card(armArt(s.top, `arm ${i}`), { y: -0.8, parent: sh, name: `arm ${i}` });
    card(side, { y: -0.8, z: behind(side, 0), ry: PROFILE, parent: sh, name: `arm ${i} side`, cut: clipSpan(side[0], 1, -1, 0.56) });
    return sh;
  });
  if (s.carry) {
    const item = piece(s.carry.draw, s.carry.w, s.carry.h, 'carried');
    card(item, { y: -0.8 - GAP - ext(item).y1, ry: PROFILE, parent: arms[1], name: 'carried' });
  }
  if (s.pack) {
    const side = piece((gg, ink) => s.pack.draw(gg, ink, true), 0.75, s.pack.h, 'pack side'), ps = ext(side), PD = s.pack.depth;
    const sideZ = torsoBack - GAP - ps.x1, packZ = sideZ + ps.x1 - PD - GAP - T / 2;
    card(side, { x: T + SIDE, y: s.pack.y, z: sideZ, ry: PROFILE, name: 'pack side', cut: clipSpan(side[0], 0, ps.x1 - PD, 9) });
    card(piece((gg, ink) => s.pack.draw(gg, ink, false), 0.8, s.pack.h, 'pack'), { y: s.pack.y, z: Math.min(packZ, headBack - T / 2 - GAP), name: 'pack' });
  }

  const legLen = 0.97 * 1.25, stepLen = 1.2, R = stepLen / (2 * legLen);
  const swing = (ph, gait) => { const u = (ph / Math.PI) % 2, A = gait * R; if (u >= 1) return A * (3 - 2 * u); const e = u * u * (3 - 2 * u); return A * (2 * e - 1); };
  let talk = 0, idleT = 0;
  const pose = (walked, gait) => {
    const ph = walked / stepLen * Math.PI, l0 = swing(ph, gait), l1 = swing(ph + Math.PI, gait), k = s.carry ? 0.3 : 0.7;
    legs[0].rotation.x = -l0; legs[1].rotation.x = -l1;
    const up = g.userData.up || 0, fist = g.userData.fist || 0;
    arms[0].rotation.x = (l0 * 0.7 - talk * (0.55 + 0.16 * Math.sin(idleT * 4.1))) * (1 - up) - up * 2.9;
    arms[1].rotation.x = (l1 * k + Math.sin(idleT * 1.3) * 0.03) * (1 - Math.max(up, fist)) - up * 2.9 - fist * (2.5 + 0.5 * Math.sin(idleT * 17));
    body.position.y = Math.abs(Math.sin(ph)) * 0.05 * gait;
  };
  g.userData.stride = pose;
  g.userData.idle = (t, talking) => { idleT = t; talk += ((talking ? 1 : 0) - talk) * 0.08; pose(0, 0); };
  g.userData.clock = (t) => { idleT = t; };
  g.userData.height = 2.7;
  return g;
}

const HEAD_H = 2.4, NECK_Y = 3.11;

function heroFace(THREE, back, s) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 288; const g = c.getContext('2d');
  g.fillStyle = s.hair; g.beginPath(); g.ellipse(128, 132, 112, 124, 0, 0, 7); g.fill();
  if (!back) {
    g.fillStyle = s.skin; g.beginPath(); g.ellipse(128, 160, 92, 100, 0, 0, 7); g.fill();
    g.fillStyle = s.hair; g.beginPath(); g.ellipse(128, 62, 104, 58, 0, 0, 7); g.fill();
    g.fillStyle = '#2c1a1c'; for (const x of [92, 164]) { g.beginPath(); g.ellipse(x, 160, 10, 13, 0, 0, 7); g.fill(); }
    g.fillStyle = '#e59a86'; for (const x of [70, 186]) { g.beginPath(); g.ellipse(x, 194, 15, 10, 0, 0, 7); g.fill(); }
    g.strokeStyle = '#8a3b30'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(128, 196, 22, 0.25, Math.PI - 0.25); g.stroke();
  }
  g.fillStyle = s.cap; g.beginPath(); g.ellipse(128, 44, 100, 40, 0, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}

export function makeBigDoll(H, s) {
  const THREE = H.THREE, g = new THREE.Group(), body = new THREE.Group(); g.add(body); if (s.slim) body.scale.x = s.slim; const LIFT = s.lift || 0; body.position.y = LIFT;
  let seed = s.seed;
  const card = ([pts, paint], { x = 0, y = 0, z = 0, ry = 0, parent = body, back = 'mirror', name = '', folds = [] } = {}) => {
    const m = makeCard(pts, { paint, paper: H.paper, thickness: T, edgeWidth: 0.05, pxPerUnit: s.ppu || 90, seed: seed++, back, folds });
    m.position.set(x, y, z); m.rotation.y = ry; m.name = `${s.id} ${name}`; parent.add(m); return m;
  };
  const piece = (draw, w, h, name) => P2.drawnPiece(draw, { w, h, name: `${s.id} ${name}` });
  const plain = (c) => (P) => { P.gradient(P2.shade(c, 0.08), P2.shade(c, -0.1), 0.5); P.felt(); P.innerShade(P2.shade(c, -0.5), { alpha: 0.25, blurPx: 8 }); };
  const BODY_Y = 0.36, BODY_H = 2.75, DEEP = 1.1;
  const bell = [[-0.8, 0], [0.8, 0], [0.93, 0.14], [0.95, 0.34], [0.88, 0.7], [0.62, 2.25], [0.54, 2.55], [0.36, 2.72], [0.16, BODY_H], [-0.16, BODY_H], [-0.36, 2.72], [-0.54, 2.55], [-0.62, 2.25], [-0.88, 0.7], [-0.95, 0.34], [-0.93, 0.14]];
  const hem = P2.shade(s.top, -0.2);
  const front = piece((gg, ink) => {
    gg.fillStyle = ink(s.top); D.poly(gg, bell);
    gg.fillStyle = ink(hem, 'print'); D.rect(gg, -0.95, 0.1, 1.9, 0.13);
    s.torso?.(gg, ink);
  }, 2.1, BODY_H + 0.1, 'body');
  card(front, { y: BODY_Y, back: plain(P2.shade(s.top, -0.06)), name: 'body' });
  const side = piece((gg, ink) => {
    gg.fillStyle = ink(P2.shade(s.top, -0.1)); D.poly(gg, [[-DEEP / 2, 0], [DEEP / 2, 0], [0.34, BODY_H - 0.5], [0.2, BODY_H - 0.3], [-0.2, BODY_H - 0.3], [-0.34, BODY_H - 0.5]]);
    gg.fillStyle = ink(hem, 'print'); D.rect(gg, -DEEP / 2, 0.1, DEEP, 0.13); D.rect(gg, -0.03, 0.4, 0.06, BODY_H - 1.2);
  }, DEEP + 0.1, BODY_H, 'body side');
  const sideZ = -T / 2 - GAP - ext(side).x1, backZ = sideZ + ext(side).x0 - GAP - T / 2;
  card(side, { y: BODY_Y + 0.02, z: sideZ, ry: PROFILE, name: 'body side' });
  const rearBody = piece((gg, ink) => { gg.fillStyle = ink(P2.shade(s.top, -0.05)); D.poly(gg, bell); gg.fillStyle = ink(hem, 'print'); D.rect(gg, -0.95, 0.1, 1.9, 0.13); s.backPrint?.(gg, ink); }, 2.1, BODY_H + 0.1, 'body back');
  const rb = card(rearBody, { y: BODY_Y, z: backZ, back: plain(P2.shade(s.top, -0.06)), name: 'body back' }); rb.rotation.y = Math.PI;
  body.position.z = -backZ / 2;
  const MID = backZ / 2;
  const legs = [-0.42, 0.42].map((x, i) => {
    const hip = new THREE.Group(); hip.position.set(x, 0.6, MID + 0.2); body.add(hip);
    const leg = piece((gg, ink) => { gg.fillStyle = ink(s.legs); D.rect(gg, -0.15, 0.16, 0.3, 0.44 + LIFT, 0.06); gg.fillStyle = ink(s.shoes); D.rect(gg, -0.23, 0, 0.46, 0.3, 0.13); gg.fillStyle = ink(P2.shade(s.shoes, 0.35), 'print'); D.rect(gg, -0.12, 0.2, 0.24, 0.04); }, 0.56, 0.64 + LIFT, `leg ${i}`);
    card(leg, { y: -0.6 - LIFT, parent: hip, name: `leg ${i}` });
    const shoe = piece((gg, ink) => { gg.fillStyle = ink(P2.shade(s.legs, -0.08)); D.rect(gg, -0.12, 0.16, 0.24, 0.44 + LIFT, 0.06); gg.fillStyle = ink(s.shoes); D.rect(gg, -0.16, 0, 0.5, 0.3, 0.13); }, 0.76, 0.64 + LIFT, `shoe ${i}`);
    card(shoe, { y: -0.6 - LIFT, z: -T / 2 - GAP - ext(shoe).x1, ry: PROFILE, parent: hip, name: `shoe ${i}` });
    return hip;
  });
  const arms = [-1, 1].map((sd, i) => {
    const sh = new THREE.Group(); sh.position.set(sd * 0.84, 2.6, MID); sh.rotation.z = sd * 0.3; body.add(sh);
    const sw = new THREE.Group(); sh.add(sw); sw.userData.root = sh;
    const art = (c, name) => piece((gg, ink) => {
      gg.fillStyle = ink(c); D.rect(gg, -0.17, 0.3, 0.34, 1.06, 0.16);
      gg.fillStyle = ink(s.cuff || P2.shade(s.top, -0.22)); D.rect(gg, -0.18, 0.3, 0.36, 0.16, 0.06);
      gg.fillStyle = ink(s.skin); D.ell(gg, 0, 0.2, 0.19, 0.2); D.ell(gg, 0.15, 0.3, 0.07, 0.09);
    }, 0.5, 1.4, name);
    card(art(s.top, `arm ${i}`), { y: -1.3, parent: sw, name: `arm ${i}` });
    const sidePiece = art(P2.shade(s.top, -0.1), `arm ${i} side`);
    card(sidePiece, { y: -1.3, z: -T / 2 - GAP - ext(sidePiece).x1, ry: PROFILE, parent: sw, name: `arm ${i} side` });
    if (s.carry && i === 1) { const item = piece(s.carry.draw, s.carry.w, s.carry.h, 'carried'); card(item, { y: -1.3 - GAP - ext(item).y1, parent: sw, name: 'carried' }); }
    return sw;
  });

  const neck = new THREE.Group(); neck.position.set(0, NECK_Y + LIFT, 0); g.add(neck);
  const tilt = new THREE.Group(); tilt.rotation.x = -0.1; neck.add(tilt);
  const mater = headMaterial(THREE), geo = new THREE.PlaneGeometry(1, 1);
  const face = new THREE.Mesh(geo, mater); face.position.set(0, HEAD_H / 2 + 0.05, 0.84); face.scale.set(HEAD_H * 0.85, HEAD_H, 1); face.name = `${s.id} head`;
  const backMat = paperMaterial({ color: s.headBack || '#efe4cf', side: THREE.DoubleSide }); backMat.alphaTest = 0.5;
  const rear = new THREE.Mesh(geo, backMat); rear.position.set(0, HEAD_H / 2 + 0.05, 0.79); rear.scale.copy(face.scale); rear.castShadow = true;
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 }); rear.customDepthMaterial = depth;
  tilt.add(rear, face);
  const setMask = (tex) => { mater.uniforms.mask.value = tex; backMat.alphaMap = tex; backMat.needsUpdate = true; depth.alphaMap = tex; depth.needsUpdate = true; };
  setMask(roundMask(THREE));
  const collar = piece((gg, ink) => {
    gg.fillStyle = ink(s.scarf); D.poly(gg, [[-0.5, 0], [0.5, 0], [0.62, 0.1], [0.6, 0.24], [0.34, 0.17], [0, 0.13], [-0.34, 0.17], [-0.6, 0.24], [-0.62, 0.1]]);
    s.collar?.(gg, ink);
  }, 1.4, 0.3, 'collar');
  if (!s.hero) card(collar, { y: 0.0, z: 0.92, parent: neck, name: 'collar' });
  const head = { mater, face, bbox: null, hero: !!s.hero, textures: null, eyes: null, posterTex: null, uv: [0, 0, 1, 1],
    show(tex) { mater.uniforms.map.value = tex; if (head.eyes && tex === head.eyes.tex) mater.uniforms.uUv.value.set(0, 0, 1, 1); else mater.uniforms.uUv.value.set(...head.uv); } };
  const sizeTo = (w, h) => { const sc = [HEAD_H * w / h, HEAD_H, 1]; face.scale.set(...sc); rear.scale.set(...sc); };
  const loader = new THREE.TextureLoader(), raw = (t) => { t.colorSpace = THREE.NoColorSpace; return t; };
  if (s.hero) {
    head.textures = [heroFace(THREE, false, s), heroFace(THREE, true, s)];
    mater.uniforms.uMode.value = 1; mater.uniforms.map.value = head.textures[0]; sizeTo(256, 288);
    backMat.alphaMap = head.textures[1]; backMat.alphaTest = 0.99; backMat.visible = false; rear.castShadow = false; face.castShadow = true;
    const depthA = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5, map: head.textures[0] }); face.customDepthMaterial = depthA;
    loader.load('media/hero_head_rim.png', (t) => { mater.uniforms.rim.value = raw(t); mater.uniforms.uRim.value = 1; }, undefined, () => {});
    for (const [i, name] of [[0, 'hero_front'], [1, 'hero_back']]) loader.load(`media/${name}.png`, (t) => { raw(t); head.textures[i] = t; if (i === 0) { sizeTo(t.image.width, t.image.height); depthA.map = t; depthA.needsUpdate = true; } }, undefined, () => {});
  } else {
    fetch(`media/${s.id}_head.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((j) => {
      const [vw, vh] = j?.video || [720, 1280], [bx, by, bw, bh] = j?.bbox || [110, 90, 500, 560];
      head.bbox = [bx, by, bw, bh, vw, vh];
      head.uv = [bx / vw, 1 - (by + bh) / vh, bw / vw, bh / vh]; head.show(mater.uniforms.map.value); sizeTo(bw, bh);
      if (j && s.poster) loadEyes(THREE, s, head);
      if (!j) return;
      loader.load(`media/${s.id}_head_mask.png`, (t) => setMask(raw(t)), undefined, () => {});
      loader.load(`media/${s.id}_head_rim.png`, (t) => { mater.uniforms.rim.value = raw(t); mater.uniforms.uRim.value = 1; }, undefined, () => {});
    });
  }

  const stepLen = 1.1;
  let talk = 0, idleT = 0;
  const pose = (walked, gait) => {
    const ph = walked / stepLen * Math.PI, a = Math.sin(ph) * 0.55 * gait;
    legs[0].rotation.x = -a; legs[1].rotation.x = a;
    const up = g.userData.up || 0, aim = g.userData.aim || 0;
    arms[0].rotation.x = (a * 0.6 - talk * (0.5 + 0.2 * Math.sin(idleT * 3.7))) * (1 - up) - up * 2.75;
    arms[1].rotation.x = ((-a * 0.6 - talk * 0.12 * (1 + Math.sin(idleT * 2.9 + 1))) * (1 - up) - up * 2.75) * (1 - aim) - aim * 1.5;
    arms[1].userData.root.rotation.z = 0.3 * (1 - aim);
    body.position.y = LIFT + Math.abs(Math.sin(ph)) * 0.05 * gait;
    body.rotation.z = Math.sin(idleT * 2.3) * 0.025 * talk; tilt.rotation.z = Math.sin(idleT * 1.9 + 0.6) * 0.03 * talk;
  };
  g.userData.stride = pose;
  g.userData.idle = (t, talking, waiting) => { idleT = t; talk += ((talking ? 1 : waiting ? 0.3 : 0) - talk) * 0.08; pose(0, 0); };
  g.userData.head = head;
  g.userData.faceCamera = (yaw, camYaw = 0) => {
    neck.rotation.y = camYaw - yaw;
    if (!head.hero) return;
    const away = Math.cos(yaw - camYaw) < -0.15, sx = Math.sin(yaw - camYaw);
    mater.uniforms.map.value = head.textures[away ? 1 : 0];
    if (Math.abs(sx) > 0.2) mater.uniforms.uFlip.value = (sx < 0) !== away ? 1 : 0;
  };
  g.userData.headY = NECK_Y + LIFT + HEAD_H / 2;
  g.userData.height = NECK_Y + LIFT + HEAD_H;
  g.userData.legs = legs; g.userData.body = body; g.userData.arms = arms; g.userData.tilt = tilt;
  return g;
}

const img = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

async function loadEyes(THREE, s, head) {
  try {
    const r = await fetch(`media/${s.id}_eyes.json`); if (!r.ok) return;
    const j = await r.json(), [maskImg, poster] = await Promise.all([img(`media/${s.id}_eyes_mask.png`), img(s.poster)]);
    const [bx, by, bw, bh] = head.bbox, k = Math.min(1, 640 / bw), W = Math.round(bw * k), Hh = Math.round(bh * k);
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = Hh; return c; };
    const base = mk(), out = mk(), layer = mk(), alpha = mk();
    base.getContext('2d').drawImage(poster, bx, by, bw, bh, 0, 0, W, Hh);
    const ag = alpha.getContext('2d', { willReadFrequently: true }); ag.drawImage(maskImg, 0, 0, W, Hh);
    const d = ag.getImageData(0, 0, W, Hh); for (let i = 0; i < d.data.length; i += 4) { d.data[i + 3] = d.data[i]; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; } ag.putImageData(d, 0, 0);
    const tex = new THREE.CanvasTexture(out); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 8;
    const og = out.getContext('2d'), lg = layer.getContext('2d');
    let ox = 0, oy = 0, cam = 0, drawnX = 9, drawnY = 9, drawnC = 9, hold = 0, last = [0, 0];
    const draw = () => {
      lg.globalCompositeOperation = 'source-over'; lg.fillStyle = j.white || '#f6efe6'; lg.fillRect(0, 0, W, Hh);
      for (const e of j.eyes) {
        let px = e.cx + ox * e.travel, py = e.cy + oy * e.travel;
        if (e.ball) { const [qx, qy, qw, qh] = e.ball, m = 0.6 * e.r; px = Math.max(Math.min(qx + m, e.cx), Math.min(Math.max(qx + qw - m, e.cx), px)); py = Math.max(Math.min(qy + m, e.cy), Math.min(Math.max(qy + qh - m, e.cy), py)); }
        if (e.ball && cam > 0) { px += (e.ball[0] + e.ball[2] / 2 - px) * cam; py += (e.ball[1] + e.ball[3] / 2 - py) * cam; }
        const cx = px * k, cy = py * k, rr = e.r * k;
        lg.fillStyle = j.pupil || '#2c1a1c'; lg.beginPath(); lg.arc(cx, cy, rr, 0, 7); lg.fill();
        lg.fillStyle = 'rgba(255,255,255,0.92)'; lg.beginPath(); lg.arc(cx - rr * 0.34, cy - rr * 0.36, rr * 0.27, 0, 7); lg.fill();
      }
      lg.globalCompositeOperation = 'destination-in'; lg.drawImage(alpha, 0, 0);
      og.drawImage(base, 0, 0); og.drawImage(layer, 0, 0); tex.needsUpdate = true; drawnX = ox; drawnY = oy; drawnC = cam;
    };
    const update = (dt, t, rel, mood) => {
      let tx = 0, ty = 0, rate = 9;
      if (rel) { const far = Math.hypot(rel[0], rel[1]) || 1, reach = Math.min(1, far / 2.5); tx = rel[0] / far * reach; ty = Math.max(-0.5, Math.min(1, rel[1] / far * reach * 0.8 + 0.25)); const n = Math.hypot(tx, ty); if (n > 1) { tx /= n; ty /= n; } }
      if (mood === 'lazy') { rate = 1.3; const c = t % 9; if (!(rel && c > 5.5 && c < 8.2)) { tx = 0; ty = 0; } }
      else if (mood === 'suspicious' || mood === 'steady') { rate = 2.2; if (rel) { hold = 1.6; last = [tx * 0.9, ty * 0.9]; } else if (hold > 0) { hold -= dt; } if (rel || hold > 0) [tx, ty] = last; }
      else if (mood === 'nervous') { rate = 16; if (rel) { const c = t % 1.7; if (c > 0.9) { tx = (Math.floor(t / 1.7) % 2 ? 1 : -1) * 0.95; ty = c > 1.3 ? 0.3 : -0.1; } } }
      const a = 1 - Math.exp(-dt * rate); ox += (tx - ox) * a; oy += (ty - oy) * a; cam += ((mood === 'camera' ? 1 : 0) - cam) * (1 - Math.exp(-dt * 7));
      if (Math.abs(ox - drawnX) + Math.abs(oy - drawnY) + Math.abs(cam - drawnC) > 0.012) draw();
    };
    draw();
    const wasIdle = head.posterTex && head.mater.uniforms.map.value === head.posterTex;
    head.eyes = { tex, update, offset: () => [ox, oy] };
    if (wasIdle) head.show(tex);
  } catch { return; }
}
