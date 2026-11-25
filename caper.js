import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { makeCard, hinge, prismFold, paperMaterial } from 'papercraft/lib/paperkit-3d.js';
import { makeDoll } from './figures.js';
import { strokeGlyph, drawWordmark } from './wordmark.js';

export function createCaper(X) {
  const { H, C, SFX, geo, CARS, people, KEYS } = X, { THREE, walk } = H, D = P2.draw2, V3 = THREE.Vector3;
  const { roadZ, boardZ, shoreZ, PAGE, MX, PIER, HERO_AT, STORE } = geo;
  const Q = new URLSearchParams(location.search), DEMO = Q.has('demo');
  const rnd = P2.rng(4711), s01 = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }, clamp = (v, a, b) => Math.min(b, Math.max(a, v)), wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const ease = (dt, k) => 1 - Math.exp(-dt * k);
  let seed = 7000, hook = null, hp = null;
  const mk = (pts, paint, o = {}) => makeCard(pts, { paper: H.paper, paint, thickness: 0.06, edgeWidth: 0.06, pxPerUnit: 50, seed: seed++, folds: [], back: 'mirror', ...o });
  const rect = (w, h, x = 0, y = 0) => [[x - w / 2, y], [x + w / 2, y], [x + w / 2, y + h], [x - w / 2, y + h]];
  const lit = (m, k = 0.5) => { const f = m.material[0]; f.emissive.set('#ffffff'); f.emissiveMap = f.map; f.emissiveIntensity = k; return m; };
  const tang = (x) => Math.atan((roadZ(x + 1) - roadZ(x - 1)) / 2);
  const centre = (c) => [c.x + Math.sin(c.th) * 1.5, c.z - Math.cos(c.th) * 1.5];
  const poseCar = (node, cx, cz, th, y = 0.03) => { node.position.set(cx - Math.sin(th) * 1.5, y, cz + Math.cos(th) * 1.5); node.rotation.y = -th; };
  const LANE = { fwd: 0.3, back: -2.9 }, ROAD = [PAGE.x0 - 4, MX - 12], STATIONS = ['radio', 'radio2', 'radio3', null];
  const S = { t: 0, cash: 20, stars: 0, calm: 0, gun: Q.has('gun'), drawn: false, shades: false, station: 0, radioT: 0, inside: false, view: 0, bust: null, bustT: 0, menace: [], fireStar: -9, job: 0, bigT: 0, big: null, shots: 0, chases: 0, jacks: 0, busts: 0, hits: 0, seenX: 0, shake: 0, boxT: 0, hud: '' };
  const PROPS = [], hitT = new Map();
  const prop = (x, z, r, h = null, knock = false) => PROPS.push({ x, z, r, h, knock, down: 0 });
  const conv = () => X.conv();

  const gun = { card: null, flag: null, piv: null, t: -1, cool: 0, yaw: 0, k: 0, px: innerWidth / 2, py: innerHeight / 2, bits: [], aim: new V3() };
  const letters = (g, word, x, y, k) => { g.save(); g.translate(x, y); g.scale(k, k); [...word].forEach((ch, i) => { g.save(); g.translate(i * 4.9, 0); strokeGlyph(g, ch, 0); g.restore(); }); g.restore(); };
  function buildGun() {
    const arm = X.heroDoll.userData.arms[1];
    const [pts, paint] = P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.coral); D.rect(g, -0.17, 0.2, 0.34, 1.1, 0.08); D.rect(g, -0.62, 0.2, 0.6, 0.32, 0.1); g.fillStyle = ink(C.cream, 'print'); D.rect(g, -0.17, 1.12, 0.34, 0.12); g.fillStyle = ink(C.gold, 'print'); D.ell(g, 0, 0.36, 0.08, 0.08); }, { w: 1.5, h: 1.4, res: 90, name: 'flag gun' });
    gun.card = mk(pts, paint, { pxPerUnit: 80 }); gun.card.rotation.set(0, Math.PI / 2, Math.PI); gun.card.position.set(0, -0.95, 0.02); gun.card.visible = false; arm.add(gun.card);
    const fg = new THREE.Group(); fg.visible = false; H.scene.add(fg); gun.flag = fg;
    fg.add(mk(rect(0.1, 1.5), (P) => { P.fill(C.cream); }));
    gun.piv = new THREE.Group(); gun.piv.position.y = 1.45; fg.add(gun.piv);
    gun.piv.add(lit(mk([[-1.5, 0], [1.5, 0], [1.74, 0.55], [1.5, 1.1], [-1.5, 1.1], [-1.74, 0.55]], (P) => { P.fill(C.cream); P.felt(0.5); P.layer((g) => letters(g, 'BANG', -1.17, 0.19, 0.125), C.coral, { depth: 0.4 }); P.layer((g) => { g.fillRect(-1.5, 0, 3, 0.07); g.fillRect(-1.5, 1.03, 3, 0.07); }, C.teal, { depth: 0.3 }); }, { pxPerUnit: 90 }), 0.3));
    const cg = new THREE.PlaneGeometry(0.28, 0.17);
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(cg, paperMaterial({ color: [C.pink, C.turq, C.gold, C.cream, C.coral][i % 5], side: THREE.DoubleSide })); m.visible = false; m.castShadow = true; H.scene.add(m); gun.bits.push({ m, v: new V3(), w: new V3(), t: 9 }); }
    const [sp, spaint] = P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.navy); D.rect(g, -0.62, 0.31, 1.24, 0.1, 0.04); D.ell(g, -0.35, 0.25, 0.3, 0.2); D.ell(g, 0.35, 0.25, 0.3, 0.2); g.fillStyle = ink(C.turq, 'print'); D.ell(g, -0.42, 0.3, 0.1, 0.05, 0.5); D.ell(g, 0.28, 0.3, 0.1, 0.05, 0.5); }, { w: 1.5, h: 0.55, res: 110, name: 'paper shades' });
    S.shadeCard = mk(sp, spaint, { pxPerUnit: 110, back: false }); S.shadeCard.position.set(0, 0.76, 0.9); S.shadeCard.visible = false; X.heroDoll.userData.tilt.add(S.shadeCard);
  }
  function toggleGun(on = !S.drawn) { if (on && (!S.gun || conv().on || X.INTRO.on || S.bust || X.talk.busy())) return false; if (S.drawn !== on) SFX.flap({ size: 0.3, up: on }); S.drawn = on; document.getElementById('pointer')?.classList.toggle('aim', on); return true; }
  function fire() {
    if (!S.drawn || gun.cool > 0 || X.talk.busy() || X.INTRO.on || conv().on || S.bust) return false;
    gun.cool = 0.75; gun.t = 0; S.shots++;
    X.heroDoll.updateWorldMatrix(true, true);
    const mz = gun.card.localToWorld(new V3(0, 1.35, 0));
    for (const b of gun.bits) { b.t = 0; b.m.visible = true; b.m.position.copy(mz); b.m.position.y += 1.7; b.v.set((rnd() - 0.5) * 7 + Math.sin(gun.yaw) * 3, 3 + rnd() * 5, (rnd() - 0.5) * 7 + Math.cos(gun.yaw) * 3); b.w.set(rnd() * 12, rnd() * 12, rnd() * 12); }
    SFX.pop(); SFX.flap({ size: 0.6, up: true });
    const seen = scare(hp.x, hp.z, gun.yaw, 14); scatter(hp.x, hp.z);
    if (seen && S.t - S.fireStar > 5) { S.fireStar = S.t; addStar(); }
    return true;
  }
  const ray = new THREE.Raycaster(), ground = new THREE.Plane(new V3(0, 1, 0), 0);
  function gunStep(dt) {
    gun.cool -= dt;
    const want = S.drawn ? 1 : 0; gun.k += (want - gun.k) * ease(dt, 12); X.heroDoll.userData.aim = gun.k; gun.card.visible = gun.k > 0.3;
    if (S.drawn && (conv().on || X.INTRO.on || S.bust)) toggleGun(false);
    if (S.drawn) {
      const r = H.renderer.domElement.getBoundingClientRect();
      ray.setFromCamera({ x: (gun.px - r.left) / r.width * 2 - 1, y: 1 - (gun.py - r.top) / r.height * 2 }, H.camera);
      if (ray.ray.intersectPlane(ground, gun.aim)) { const dx = gun.aim.x - hp.x, dz = gun.aim.z - hp.z; if (Math.hypot(dx, dz) > 0.8) gun.yaw = Math.atan2(dx, dz); }
      if (!X.talk.busy()) { X.heroHandle.group.rotation.y = gun.yaw; X.heroDoll.userData.faceCamera(gun.yaw, Math.atan2(H.camera.position.x - hp.x, H.camera.position.z - hp.z)); }
    }
    if (gun.t >= 0) {
      gun.t += dt; X.heroDoll.updateWorldMatrix(true, true); gun.card.localToWorld(gun.flag.position.set(0, 1.35, 0));
      const u = gun.t, out = u < 0.95 ? 1 - Math.exp(-u * 11) * Math.cos(u * 21) : Math.max(0, 1 - (u - 0.95) / 0.22);
      gun.flag.visible = true; gun.flag.scale.setScalar(clamp(u < 0.95 ? u / 0.1 : out * 1.4, 0.01, 1)); gun.piv.rotation.x = -(1 - out) * 1.5;
      if (u > 1.2) { gun.t = -1; gun.flag.visible = false; }
    }
    for (const b of gun.bits) { if (b.t > 1.3) { b.m.visible = false; continue; } b.t += dt; b.v.y -= 15 * dt; b.m.position.addScaledVector(b.v, dt); if (b.m.position.y < 0.06) { b.m.position.y = 0.06; b.v.set(0, 0, 0); b.w.set(0, 0, 0); } b.m.rotation.x += b.w.x * dt; b.m.rotation.y += b.w.y * dt; b.m.rotation.z += b.w.z * dt; }
    const head = X.heroDoll.userData.head; S.shadeCard.visible = S.shades && head.textures && head.mater.uniforms.map.value === head.textures[0];
  }

  function scare(x, z, yaw, r = 14) {
    let n = 0;
    const inLine = (ox, oz) => { const dx = ox - x, dz = oz - z, d = Math.hypot(dx, dz); return d < 5 || (d < r && Math.abs(wrap(Math.atan2(dx, dz) - yaw)) < 0.62); };
    for (const p of peds) if (p.live && p.rise > 0.8 && p.mode !== 'hide' && p.mode !== 'up' && inLine(p.x, pedZ(p))) { n++; p.mode = 'up'; p.t = 0.7; p.from = x; }
    for (const v of people) {
      if (v.handle.p < 0.9 || v.handle.group.visible === false || v.id === 'officer' || !inLine(v.at[0], v.at[1])) continue;
      n++; v.upT = 2.6;
      if (v.gun && S.t - (v.barkAt ?? -99) > 20 && X.talk.bark(v, v.gun)) { v.barkAt = S.t; v.upT = 3.6; }
    }
    for (const c of traffic) if (!c.taken && Math.abs(c.x - x) < 30 && inLine(c.x, laneZ(c))) { n++; c.duck = 3.2; }
    return n;
  }
  function addStar() {
    if (DEMO || X.INTRO.on || S.bust) return;
    const was = S.stars; S.stars = Math.min(3, S.stars + 1); S.calm = 0;
    if (S.stars > was) { SFX.flap({ size: 0.5, up: true }); if (!was) { S.seenX = hp.x; SFX.playClip('mega' + (1 + (S.chases++ % 2)), 0.6); } }
  }

  const traffic = [], police = [];
  const DRIVERS = [{ shirt: C.cream, skin: '#e9b48f', hair: '#3a2a22' }, { shirt: C.coral, skin: '#b9794f', hair: '#1f1a2e' }, { shirt: C.pink, skin: '#f0c7a4', hair: '#c9772f' }, { shirt: C.teal, skin: '#8d5a3b', hair: '#2b2540' }];
  const laneZ = (c) => roadZ(c.x) + (c.dir > 0 ? LANE.fwd : LANE.back);
  function buildTraffic() {
    [[-96, -1, C.turq], [-34, 1, C.gold], [52, -1, C.coral], [128, -1, C.lilac], [190, 1, C.orange], [268, -1, C.pink], [-70, 1, C.cream], [330, 1, C.turq]].forEach(([x, dir, col], i) => {
      if (DEMO && dir > 0) return;
      const node = X.car(col, 1400 + i * 40, i % 3 === 1, DRIVERS[i % 4]); node.visible = false; H.scene.add(node);
      traffic.push({ node, x, x0: x, dir, v: 4.4 + (i % 3) * 0.7, vmax: 4.4 + (i % 3) * 0.7, duck: 0, dk: 0, taken: false, drv: node.userData.car.driver, stuck: 0, ej: null, entry: null, idle: 0 });
    });
    const fist = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.cream); D.rect(g, -0.09, 0, 0.18, 0.7, 0.07); g.fillStyle = ink('#e9b48f'); D.ell(g, 0, 0.78, 0.17, 0.16); }, { w: 0.5, h: 1.0, res: 90, name: 'fist' });
    for (const t of traffic) { const g = new THREE.Group(), [fp, fpaint] = fist(), f = mk(fp, fpaint, { pxPerUnit: 80 }); const sh = new THREE.Group(); sh.position.set(0.95, 0.9, 0.05); sh.add(f); g.add(sh); g.visible = false; H.scene.add(g); t.ej = { g, sh, t: -1, from: new V3(), to: new V3(), dir: 1 }; }
    for (let i = 0; i < 2; i++) {
      const node = X.car('#f6f1e6', 1800 + i * 40, true, { shirt: C.navy, skin: i ? '#b9794f' : '#f0c7a4', hair: C.navy }); node.visible = false; H.scene.add(node);
      for (const z of [0.045, -3.045]) { const band = mk(rect(5.4, 0.36), (P) => { P.fill(C.navy); P.draw((g) => { g.fillStyle = C.cream; for (let k = 0; k < 9; k++) g.fillRect(-2.7 + k * 0.6 + (k % 2 ? 0 : 0.3), k % 2 ? 0 : 0.18, 0.3, 0.18); }); }); band.position.set(0, 0.98, z); node.add(band); }
      const lights = [C.pink, C.turq].map((col, k) => { const piv = new THREE.Group(); piv.position.set(-0.4, 2.24, k ? -2.1 : -0.9); piv.rotation.y = Math.PI / 2; const m = mk(rect(0.9, 0.5), (P) => { P.fill(col); }); m.material[0].emissive.set(col); piv.add(m); node.add(piv);
        const halo = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: X.haloTex(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: col })); halo.position.set(-0.4, 2.6, k ? -2.1 : -0.9); halo.rotation.x = -0.6; node.add(halo); return { m, halo }; });
      police.push({ node, lights, x: 0, z: 0, off: LANE.fwd, dir: 1, th: 0, v: 0, on: false, fold: 0, away: 0 });
    }
  }
  function restoreDriver(t) { for (const pv of t.drv) { t.node.add(pv); pv.position.set(-0.3, 0.5, -2.2); pv.scale.setScalar(1.75); pv.rotation.z = 0; } t.ej.g.visible = false; t.ej.t = -1; }
  function release(t, far = true) {
    const i = CARS.indexOf(t.entry); if (i >= 0) CARS.splice(i, 1);
    t.entry = null; t.taken = false; t.idle = 0; t.node.rotation.x = 0; restoreDriver(t);
    if (far) { let x = hp.x - t.dir * 72; if (x < ROAD[0] + 6 || x > ROAD[1] - 6) x = hp.x + t.dir * 72; t.x = clamp(x, ROAD[0] + 6, ROAD[1] - 6); } else t.x = t.x0;
    t.v = t.vmax;
  }
  function tryJack(maxD = 99) {
    if (conv().on || X.INTRO.on || DEMO) return false;
    let best = null, bd = Math.min(7, maxD);
    for (const t of traffic) { if (t.taken || Math.abs(t.v) > 1.8 || !t.node.visible) continue; const d = Math.hypot(hp.x - t.x, hp.z - laneZ(t)); if (d < bd) { bd = d; best = t; } }
    if (!best) return false;
    const t = best, th = t.dir > 0 ? tang(t.x) : tang(t.x) + Math.PI, e = t.ej, lz = laneZ(t);
    e.from.set(t.x, 1.4, lz); e.to.set(t.x - t.dir * 0.5, 0.02, roadZ(t.x) + (hp.z > lz ? -6.0 : 6.0)); e.t = 0; e.dir = t.dir; e.g.visible = true; e.g.position.copy(e.from);
    for (const pv of t.drv) { e.g.add(pv); pv.position.set(0, 0, 0); }
    t.taken = true; t.duck = 0; t.dk = 0; t.idle = 0; t.entry = { h: { group: t.node, x: t.node.position.x }, node: t.node, x: t.node.position.x, z: t.node.position.z, x0: null, th, v: 0, steer: 0, on: false, t: 0, traffic: t };
    CARS.push(t.entry); X.setConv(t.entry); S.jacks++;
    addStar(); SFX.playClip('shout' + (1 + Math.floor(rnd() * 4)), 0.7);
    return X.drive.enter();
  }
  function trafficStep(t, dt) {
    const c = conv();
    for (const k of traffic) {
      const e = k.ej;
      if (e.t >= 0) {
        e.t += dt; const u = e.t, g = e.g;
        if (u < 0.6) { const a = u / 0.6; g.position.lerpVectors(e.from, e.to, s01(a)); g.position.y += Math.sin(a * Math.PI) * 2.6; g.rotation.z = -e.dir * a * Math.PI * 2; e.sh.visible = false; }
        else if (u < 3) { g.rotation.z = 0; g.position.set(e.to.x, e.to.y + Math.abs(Math.sin((u - 0.6) * 9)) * 0.55, e.to.z); g.rotation.y = Math.atan2(hp.x - e.to.x, hp.z - e.to.z); e.sh.visible = true; e.sh.rotation.z = -0.5 + 0.5 * Math.sin(u * 19); }
        else if (u < 9) { e.sh.visible = false; g.position.x = e.to.x - e.dir * (u - 3) * 2.1; g.position.z = e.to.z; g.position.y = e.to.y + Math.abs(Math.sin(u * 7)) * 0.16; g.rotation.y = -e.dir * Math.PI / 2; g.scale.y = 1 - s01((u - 8.4) / 0.6) * 0.98; }
        else { g.visible = false; g.scale.y = 1; e.t = -1; }
      }
      if (k.taken) {
        const en = k.entry; if (en.on) { k.idle = 0; continue; }
        k.idle += dt; const far = Math.abs(en.x - hp.x) > 58;
        if ((far || k.idle > 45) && e.t < 0) { k.node.scale.y = Math.max(0.02, k.node.scale.y - dt * 3); if (k.node.scale.y <= 0.03 || far) release(k); }
        continue;
      }
      let gap = 99, block = null;
      const lz = (x) => roadZ(x) + (k.dir > 0 ? LANE.fwd : LANE.back);
      const see = (ox, oz, pad, who = null) => { const s = (ox - k.x) * k.dir; if (s > 0.5 && s < 16 && Math.abs(oz - lz(ox)) < 2.5 && s - pad < gap) { gap = s - pad; block = who; } };
      if (!c.on && !X.INTRO.on) see(hp.x, hp.z, 3.5);
      for (const o of CARS) { const [ox, oz] = centre(o); see(ox, oz, 5.2, o.on ? null : o); }
      for (const o of traffic) if (o !== k && !o.taken && o.dir === k.dir) see(o.x, lz(o.x), 5.6);
      for (const p of police) if (p.on) see(p.x, p.z, 5.4);
      const want = k.duck > 0 ? 0 : gap < 2.5 ? 0 : Math.min(k.vmax, (gap - 2.5) * 1.1);
      k.v += clamp(want - k.v, -15 * dt, 4 * dt); k.x += k.v * k.dir * dt;
      if (k.v < 0.3 && block && Math.abs(block.x - hp.x) > 34) { k.stuck += dt; if (k.stuck > 5) { tow(block); k.stuck = 0; } } else k.stuck = 0;
      if (k.dir < 0 && k.x < ROAD[0]) k.x = ROAD[1]; if (k.dir > 0 && k.x > ROAD[1]) k.x = ROAD[0];
      k.duck -= dt; k.dk += ((k.duck > 0 ? 1 : 0) - k.dk) * ease(dt, 9);
      for (const pv of k.drv) pv.scale.y = 1.75 * (1 - 0.62 * k.dk);
      const edge = s01(Math.min(k.x - ROAD[0], ROAD[1] - k.x) / 5);
      k.node.visible = !X.INTRO.on && Math.abs(k.x - hp.x) < 88; k.node.scale.y = Math.max(0.02, edge);
      poseCar(k.node, k.x, lz(k.x), k.dir > 0 ? tang(k.x) : tang(k.x) + Math.PI);
      for (const w of k.node.userData.car.wheels) w.rotation.z -= k.v * dt / 0.64;
    }
  }
  function tow(c) {
    if (c.on) return;
    if (c.traffic) { release(c.traffic); return; }
    c.x = c.x0; c.z = c.z0; c.th = 0; c.v = 0; c.h.x = c.x; c.h.group.position.set(c.x, c.h.group.position.y, c.z); c.h.group.rotation.y = 0;
    if (c.solid && !c.walk.solids.includes(c.solid)) c.walk.solids.push(c.solid);
  }
  function policeStep(t, dt) {
    const c = conv(), onPier = hp.y > 0.3, hidden = S.inside || onPier, [tx0, tz] = c.on ? centre(c) : [hp.x, hp.z];
    if (!hidden) S.seenX = tx0;
    const tx = hidden ? S.seenX : tx0, need = X.INTRO.on || DEMO || S.bust ? 0 : S.stars >= 2 ? 2 : S.stars;
    let near = 99, level = 0;
    police.forEach((p, i) => {
      const want = i < need;
      if (want && !p.on) { const side = i ? -1 : 1; let x = tx + side * 64; if (x < ROAD[0] + 8 || x > ROAD[1] - 4) x = tx - side * 64; p.x = clamp(x, ROAD[0] + 8, ROAD[1] - 4); p.dir = Math.sign(tx - p.x) || 1; p.off = p.dir > 0 ? LANE.fwd : LANE.back; p.th = p.dir > 0 ? tang(p.x) : tang(p.x) + Math.PI; p.v = 7; p.on = true; p.fold = 0; p.away = 0; }
      if (!p.on) { p.node.visible = false; return; }
      const dx = tx - p.x, adx = Math.abs(dx);
      if (want && adx > 5.5) p.dir = Math.sign(dx);
      const vmax = !want ? 9.5 : S.stars >= 2 ? 10.4 : 8.2;
      const lanes = p.dir > 0 ? [LANE.fwd, LANE.back] : [LANE.back, LANE.fwd];
      const clear = (off) => { for (const o of traffic) { if (o.taken) continue; const s = (o.x - p.x) * p.dir; if (s > -4 && s < (o.dir === p.dir ? 11 : 20) && Math.abs(laneZ(o) - roadZ(o.x) - off) < 2.2) return false; } for (const o of CARS) { if (o.on) continue; const [ox, oz] = centre(o), s = (ox - p.x) * p.dir; if (s > -4 && s < 11 && Math.abs(oz - roadZ(ox) - off) < 2.6) return false; } return true; };
      let off = lanes.find(clear), wantV = !want ? vmax : adx < 6.5 ? 0 : Math.min(vmax, (adx - 5) * 1.6 + 1.5);
      if (off == null) { off = p.off; wantV = Math.min(wantV, 1.2); }
      p.v += clamp(wantV - p.v, -16 * dt, 7 * dt); p.x = clamp(p.x + p.v * p.dir * dt, ROAD[0] + 2, ROAD[1]); p.off += (off - p.off) * ease(dt, 2.6); p.z = roadZ(p.x) + p.off;
      p.th += wrap((p.dir > 0 ? tang(p.x) : tang(p.x) + Math.PI) - p.th) * ease(dt, 5);
      if (!want) { p.away += dt; p.fold = Math.max(0, p.fold - dt * (p.away > 5 || adx > 60 ? 2.5 : 0)); if (p.fold <= 0) { p.on = false; p.node.visible = false; return; } } else p.fold = Math.min(1, p.fold + dt * 2.5);
      p.node.visible = true; p.node.scale.y = Math.max(0.02, s01(p.fold)); poseCar(p.node, p.x, p.z, p.th);
      for (const w of p.node.userData.car.wheels) w.rotation.z -= p.v * dt / 0.64;
      const ph = Math.floor(t * 5.5) % 2; p.lights.forEach((l, k) => { const on = want && ph === k; l.m.material[0].emissiveIntensity = on ? 1.8 : 0.08; l.halo.material.opacity = on ? 0.55 : 0; });
      const d = Math.hypot(tx0 - p.x, tz - p.z); if (want) { near = Math.min(near, d); level = Math.max(level, clamp(1.15 - d / 75, 0, 1)); }
    });
    SFX.siren(level);
    if (S.stars > 0 && !S.bust) {
      const slow = !c.on || Math.abs(c.v) < 2.6, reach = S.stars >= 2 ? 15 : 9.5;
      if (near < reach && slow && !hidden && !X.talk.busy()) S.bustT += dt; else S.bustT = Math.max(0, S.bustT - dt * 0.7);
      if (S.bustT > 1.5) bust();
      if (near > 42 || hidden) S.calm += dt * (onPier && (!c.on || Math.abs(c.v) < 1) ? 2.4 : 1); else if (near > reach + 1.5) S.calm += dt * 0.5; else S.calm = Math.max(0, S.calm - dt * 2);
      if (S.calm > 12) { S.stars--; S.calm = 9.4; SFX.flap({ size: 0.5, up: false }); }
    } else S.bustT = 0;
  }
  const big = { el: null, cv: null, bits: null, wipe: null };
  function showBig(kind) {
    if (!big.el) return;
    const cv = big.cv, g = cv.getContext('2d');
    if (kind === 'job') drawWordmark(cv, X.sheet(), [['JOB', C.pink], ['DONE', C.turq]]);
    else {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.lineCap = 'round';
      const cx = cv.width / 2, cy = cv.height / 2 + 30;
      for (const [w, col, dy] of [[70, 'rgba(20,10,40,0.3)', 16], [60, C.navy, 0], [34, '#c9ced8', -4]]) { g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * 270, cy + dy, 140, 0, 7); g.stroke(); g.beginPath(); g.roundRect(cx + sx * 270 - 62 - w / 4, cy + dy - 205 - w / 4, 124 + w / 2, 80 + w / 2, 18); g.fill(); } g.lineWidth = w * 0.45; for (const lx of [-76, 0, 76]) { g.beginPath(); g.ellipse(cx + lx, cy + dy - 150 + Math.abs(lx) * 0.3, 44, 24, lx * 0.006, 0, 7); g.stroke(); } }
      g.fillStyle = C.navy; for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * 270, cy - 172, 13, 0, 7); g.fill(); g.fillRect(cx + sx * 270 - 5, cy - 172, 10, 26); }
    }
    S.big = kind; S.bigT = kind === 'job' ? 2.6 : 1.15; big.el.classList.add('on'); SFX.flap({ size: 1, up: true });
  }
  function confetti() {
    if (!big.bits) return;
    big.bits.textContent = '';
    for (let i = 0; i < 34; i++) { const b = document.createElement('b'), a = rnd() * 6.283, d = 160 + rnd() * 380; b.style.cssText = `background:${[C.pink, C.turq, C.gold, C.cream, C.coral, C.lilac][i % 6]};--x:${Math.round(Math.cos(a) * d)}px;--y:${Math.round(Math.sin(a) * d * 0.7 + 180)}px;--r:${Math.round(rnd() * 900 - 450)}deg;animation-delay:${(rnd() * 0.12).toFixed(2)}s`; big.bits.appendChild(b); }
    setTimeout(() => { big.bits.textContent = ''; }, 1900);
  }
  function bust() {
    if (S.bust || DEMO) return;
    S.bust = { t: 0, stage: 0, opened: false }; S.busts++; S.bustT = 0; KEYS.clear(); hook.steer(null); X.talk.close(); toggleGun(false);
    big.wipe?.classList.remove('out'); big.wipe?.classList.add('on'); SFX.thump(); showBig('cuffs');
  }
  function bustStep(dt) {
    const b = S.bust; if (!b) return; b.t += dt;
    const cop = people.find((v) => v.id === 'officer'), c = conv();
    if (b.stage === 0 && b.t > 0.6) {
      b.stage = 1; if (c.on) { c.on = false; c.v = 0; SFX.setIdle(false); }
      hook.place(HERO_AT[0], HERO_AT[1]); X.heroHandle.group.position.y = 0.02; X.heroHandle.group.rotation.y = 0;
      S.stars = 0; S.calm = 0; S.gun = false; S.drawn = false; for (const p of police) { p.on = false; p.node.visible = false; }
      if (cop) { cop.handle.group.visible = true; cop.handle.reset(1); cop.handle.up = true; }
    }
    if (b.stage === 1 && b.t > 1.05) { b.stage = 2; big.wipe?.classList.add('out'); if (cop) b.opened = X.talk.open(cop, true); }
    if (b.stage === 2 && b.t > 1.9 && !X.talk.busy()) { b.stage = 3; b.t = 0; if (big.wipe) { big.wipe.style.transition = 'none'; big.wipe.classList.remove('on', 'out'); void big.wipe.offsetWidth; big.wipe.style.transition = ''; } if (cop) cop.handle.set(0, 0); }
    if (b.stage === 3 && b.t > 0.9) { if (cop) { cop.handle.group.visible = false; cop.handle.reset(0); } S.bust = null; }
  }

  function bumpCar(c, nx, nz, depth, hard, key) {
    c.x += nx * depth; c.z += nz * depth;
    const into = -(Math.cos(c.th) * c.v * nx + Math.sin(c.th) * c.v * nz);
    if (into > 1.1 && S.t - (hitT.get(key) ?? -9) > 0.45) { hitT.set(key, S.t); c.v *= hard ? 0.4 : 0.75; S.shake = Math.min(1, into / 7); S.hits++; SFX.thump(); }
    else if (into > 0) c.v *= 1 - Math.min(0.5, into * 0.02);
  }
  function knock(p) { if (p.down > 0 || !p.h || !p.h.up) return; p.down = 10; p.h.set(0, 0); S.hits++; SFX.flap({ size: 0.7, up: false }); }
  function collide(c, dt) {
    const [cx, cz] = centre(c), rz = roadZ(cx), off = cz - rz, lo = -6.3, hi = Math.max(4.4, boardZ(cx) - rz - 6.2), tg = tang(cx);
    if (off < lo || off > hi) {
      const over = off < lo ? off - lo : off - hi, out = Math.sin(c.th - tg) * Math.sign(c.v || 1) * Math.sign(over);
      c.z -= over * ease(dt, 9);
      if (out > 0.05) {
        const cap = 3 + (1 - out) * 7, sp = Math.abs(c.v);
        if (sp > cap + 3.5 && out > 0.35 && S.t - (hitT.get('edge') ?? -9) > 0.8) { hitT.set('edge', S.t); S.shake = 0.6; S.hits++; SFX.thump(); }
        if (sp > cap) c.v += (Math.sign(c.v) * cap - c.v) * ease(dt, 9);
      }
    } else if (off > 5.0 || off < -5.0) c.v *= 1 - 0.4 * dt;
    if (DEMO) { c.z += (rz + LANE.fwd - cz) * ease(dt, 1.3) * Math.min(1, Math.abs(c.v) / 3); return; }
    if (Math.abs(c.steer) < 0.12 && off > 1.5 && off < 4.8 && Math.abs(c.v) > 2.5) c.z += (rz + LANE.fwd - cz) * ease(dt, 1.1);
    const co = Math.cos(c.th), si = Math.sin(c.th), pts = [[cx + co * 1.9, cz + si * 1.9], [cx - co * 1.9, cz - si * 1.9]];
    const test = (ox, oz, r, hard, key) => { for (const [px, pz] of pts) { const dx = px - ox, dz = pz - oz, d = Math.hypot(dx, dz), m = r + 1.3; if (d < m && d > 1e-3) { bumpCar(c, dx / d, dz / d, (m - d) * 0.7, hard, key); return true; } } return false; };
    for (const p of PROPS) { if (Math.abs(p.x - cx) > 7 || p.down > 0 || (p.h && p.h.p < 0.5)) continue; if (p.knock) { for (const [px, pz] of pts) if (Math.hypot(px - p.x, pz - p.z) < p.r + 1.3) { knock(p); break; } } else test(p.x, p.z, p.r, true, p); }
    const two = (ox, oz, th, key) => { if (Math.abs(ox - cx) > 9) return; const a = Math.cos(th) * 1.9, b = Math.sin(th) * 1.9; if (!test(ox + a, oz + b, 1.3, true, key)) test(ox - a, oz - b, 1.3, true, key); };
    for (const o of CARS) if (o !== c) { const [ox, oz] = centre(o); two(ox, oz, o.th, o); }
    for (const k of traffic) if (!k.taken && k.node.visible) two(k.x, laneZ(k), 0, k);
    for (const p of police) if (p.on) two(p.x, p.z, p.th, p);
    for (const v of people) if (v.handle.p > 0.9 && v.handle.group.visible !== false && !v.deck) test(v.at[0], v.at[1], 0.8, true, v);
    if (S.shake > 0) { c.node.rotation.z = Math.sin(S.t * 40) * 0.05 * S.shake; S.shake = Math.max(0, S.shake - dt * 3.2); } else c.node.rotation.z = 0;
  }

  const peds = [], gulls = [];
  const NOGO = [[-15, 15.5], [54, 72]];
  const SKIN = ['#f0c9a8', '#e2b08a', '#b9794f', '#8d5a3b', '#f6d9c2', '#c98e62'], TOPS = [C.pink, C.turq, C.gold, C.lilac, C.coral, C.cream, C.orange, C.teal, '#f6ecd9', '#8f74c4'], HAIRS = ['#3a2a22', '#1f1a2e', '#c9772f', '#6b4a2e', '#e9d2a8', '#7d3a2a'], STYLES = ['short', 'curly', 'bob', 'cap'];
  const pedZ = (p) => (p.track === 'board' ? boardZ(p.x) + p.off : roadZ(p.x) - 6.1 + p.off);
  const pedHi = (p) => (p.track === 'board' ? PAGE.x1 - 8 : MX - 34);
  const barred = (p, x) => p.track === 'board' && NOGO.some(([a, b]) => x > a && x < b);
  function buildPeds(n = 12) {
    for (let i = 0; i < n; i++) {
      const top = TOPS[i % TOPS.length], k = i % 3;
      const doll = makeDoll(H, { id: `ped${i}`, seed: 5000 + i * 31, ppu: 60, hairStyle: STYLES[i % 4], hair: HAIRS[(i * 5) % 6], cap: TOPS[(i + 4) % TOPS.length], skin: SKIN[(i * 7) % 6], top, legs: [C.navy, '#e9dcc4', '#5b6a9a', '#d9c7a8'][i % 4], shoes: [C.coral, '#7a4a32', C.cream][i % 3],
        torso: (g, ink) => { g.fillStyle = ink(P2.shade(top, k ? -0.25 : 0.3), 'print'); if (k === 0) for (const y of [0.25, 0.55, 0.85]) D.rect(g, -0.4, y, 0.8, 0.1); else if (k === 1) for (const [x, y] of [[-0.2, 0.3], [0.15, 0.6], [-0.1, 0.9], [0.22, 1.0], [0.2, 0.25]]) D.ell(g, x, y, 0.07, 0.07); else D.rect(g, -0.03, 0.1, 0.06, 1.1); } });
      doll.scale.setScalar(1.74);
      const root = new THREE.Group(), tip = new THREE.Group(); tip.add(doll); root.add(tip); root.visible = false; H.scene.add(root);
      peds.push({ i, doll, root, tip, track: 'board', x: 0, off: 0, dir: 1, sp: 1.7 + (i % 4) * 0.25, walked: 0, mode: 'walk', t: 0, next: 3, yaw: 0, look: 0, rise: 0, up: 0, duck: 0, hopT: -1, hx: 0, hz: 0, y: 0, from: 0, goal: null, live: false });
    }
    const [gp, gpaint] = P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.orange); D.rect(g, -0.1, 0, 0.07, 0.34); D.rect(g, 0.08, 0, 0.07, 0.34); D.poly(g, [[0.58, 0.92], [0.92, 0.84], [0.58, 0.78]]); g.fillStyle = ink(C.cream); D.ell(g, 0, 0.58, 0.5, 0.3); D.ell(g, 0.42, 0.88, 0.2, 0.19); g.fillStyle = ink('#9aa4b4', 'print'); D.ell(g, -0.12, 0.62, 0.3, 0.14); g.fillStyle = ink(C.navy, 'print'); D.ell(g, 0.48, 0.92, 0.04, 0.04); }, { w: 1.9, h: 1.2, res: 80, name: 'gull' });
    [-22, -9, 16, 24, 39, 47, 78, 96, 131].forEach((x, i) => { const m = mk(gp, gpaint, { pxPerUnit: 70 }), g = new THREE.Group(); g.add(m); const z = boardZ(x) + 5.4 + (i % 3) * 1.6; g.position.set(x, 0.03, z); g.rotation.y = (i % 2 ? 0.5 : -0.4); if (i % 2) m.scale.x = -1; H.scene.add(g); gulls.push({ g, m, x, z, t: -1, dir: i % 2 ? 1 : -1 }); });
    const bin = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.teal); D.poly(g, [[-0.42, 0], [0.42, 0], [0.52, 1.25], [-0.52, 1.25]]); g.fillStyle = ink(C.cream); D.rect(g, -0.6, 1.2, 1.2, 0.2, 0.07); g.fillStyle = ink(C.navy, 'print'); for (const x of [-0.24, 0, 0.24]) D.rect(g, x - 0.03, 0.15, 0.06, 0.9); }, { w: 1.3, h: 1.45, res: 80, name: 'bin' });
    for (const [x, side] of [[-74, -1], [-36, -1], [9, -1], [26, 1], [50, -1], [88, -1], [-58, 1], [104, 1], [150, -1], [224, -1]]) { const z = roadZ(x) + (side > 0 ? 6.1 : -7.5), [bp, bpaint] = bin(); const h = X.popup(bp, bpaint, { x, z, yaw: 0.1 * side }); prop(x, z, 0.55, h, true); }
  }
  function placePeds() {
    peds.forEach((p, i) => { p.track = i % 3 === 2 ? 'pave' : 'board'; p.x = HERO_AT[0] + (i - peds.length / 2 + 0.5) * 9.5 + (i % 2 ? 2 : -2); if (barred(p, p.x)) p.x += p.x < 3 ? -24 : 22; if (barred(p, p.x)) p.x += 20; p.off = p.track === 'board' ? ((i * 37) % 9) / 9 * 4.4 - 2.2 : ((i * 13) % 5) / 5 - 0.5; p.dir = i % 2 ? 1 : -1; p.mode = 'walk'; p.t = 0; p.next = 3 + (i * 1.7) % 8; p.rise = 1; p.up = 0; p.duck = 0; p.hopT = -1; p.y = 0; p.live = true; p.walked = i; p.goal = null; });
    for (const g of gulls) { g.t = -1; g.g.position.set(g.x, 0.03, g.z); g.g.scale.setScalar(1); g.g.visible = true; }
  }
  function hop(p, nx, nz, blame = false) { if (p.hopT >= 0 || p.rise < 0.8) return; p.hopT = 0; p.hx = nx * 2.7; p.hz = nz * 2.7; if (blame && S.t - (p.blameT ?? -99) > 8) { p.blameT = S.t; S.menace.push(S.t); S.menace = S.menace.filter((q) => S.t - q < 12); if (S.menace.length >= 3) { S.menace = []; addStar(); } } }
  function honk() {
    const c = conv(); if (!c.on) return false;
    SFX.horn(); const [cx, cz] = centre(c), fx = Math.cos(c.th), fz = Math.sin(c.th);
    for (const p of peds) { const dx = p.x - cx, dz = pedZ(p) - cz, d = Math.hypot(dx, dz), ahead = dx * fx + dz * fz; if (d < 6 || (d < 16 && ahead > 0)) { const side = Math.sign(-fz * dx + fx * dz) || 1; hop(p, -fz * side, fx * side); } }
    scatter(cx, cz); return true;
  }
  function scatter(x, z) { let any = false; for (const g of gulls) if (g.t < 0 && Math.hypot(g.x - x, g.z - z) < 36) { g.t = (g.x * 0.37) % 0.25; any = true; } if (any) SFX.gull(); }
  function pedStep(t, dt) {
    const c = conv(), [cx, cz] = c.on ? centre(c) : [0, 0];
    for (const p of peds) {
      const lo = PAGE.x0 + 6, hi = pedHi(p);
      if (!p.live || Math.abs(p.x - hp.x) > 68) {
        const side = rnd() < 0.5 ? -1 : 1, d = 46 + rnd() * 16; let x = hp.x + side * d; p.track = rnd() < 0.36 ? 'pave' : 'board';
        if (x < lo || x > pedHi(p)) x = hp.x - side * d; p.live = x > lo && x < pedHi(p) && !barred(p, x); if (!p.live) { p.root.visible = false; continue; }
        p.x = x; p.off = p.track === 'board' ? rnd() * 4.4 - 2.2 : rnd() - 0.5; p.dir = rnd() < 0.5 ? 1 : -1; p.mode = 'walk'; p.next = 3 + rnd() * 8; p.rise = 0; p.up = 0; p.duck = 0; p.hopT = -1; p.y = 0; p.goal = null;
      }
      p.rise = Math.min(1, p.rise + dt * 2.2);
      let gait = 0, sp = 0, upW = 0, duckW = 0, yawW = p.dir * 0.6;
      const lim = p.track === 'board' ? 2.7 : 0.8;
      if (p.mode === 'walk') {
        sp = p.sp; gait = 1; p.next -= dt;
        if (p.next <= 0) { p.next = 5 + rnd() * 9; if (rnd() < 0.6) { p.mode = 'pause'; p.t = 1.2 + rnd() * 2.6; p.look = rnd() < 0.65 ? 0 : Math.PI; } else p.dir = -p.dir; }
      } else if (p.mode === 'pause') { yawW = p.look + Math.sin(t * 0.9 + p.i) * 0.35; if ((p.t -= dt) <= 0) p.mode = 'walk'; }
      else if (p.mode === 'up') { upW = 1; yawW = clamp(Math.atan2(hp.x - p.x, hp.z - pedZ(p)), -0.5, 0.5); if ((p.t -= dt) <= 0) { p.mode = 'run'; p.t = 3.2; p.dir = Math.sign(p.x - p.from) || 1; p.goal = null; let bd = 24; for (const q of PROPS) { const s = (q.x - p.x) * p.dir; if (!q.knock && s > 4 && s < bd && Math.abs(q.z - pedZ(p)) < 6.5) { bd = s; p.goal = q; } } } }
      else if (p.mode === 'run') { sp = p.sp * 3.1; gait = 1; upW = 0.75; if (p.goal) p.off += clamp(p.goal.z - pedZ(p), -1, 1) * 3 * dt; if ((p.t -= dt) <= 0 || (p.goal && (p.goal.x - p.x) * p.dir < 0.9)) { p.mode = 'hide'; p.t = 3.6; } }
      else if (p.mode === 'hide') { duckW = 1; upW = 0.5; yawW = clamp(Math.atan2(hp.x - p.x, hp.z - pedZ(p)), -0.5, 0.5); if ((p.t -= dt) <= 0) { p.mode = 'walk'; p.goal = null; } }
      if (sp) { const nx = p.x + p.dir * sp * dt; if (nx < lo + 2 || nx > hi - 2 || barred(p, nx)) { p.dir = -p.dir; if (p.mode === 'run') { p.mode = 'hide'; p.t = 3.6; } } else { p.x = nx; p.walked += sp * dt; } }
      const z0 = pedZ(p);
      if (!c.on && p.hopT < 0) { const dx = p.x - hp.x, dz = z0 - hp.z, d = Math.hypot(dx, dz); if (d < 2.5) p.off += (Math.sign(dz) || 1) * 2.6 * dt; }
      if (p.track === 'board') for (const v of people) { if (v.deck) continue; const dz = z0 - v.at[1]; if (Math.abs(p.x - v.at[0]) < 2.4 && Math.abs(dz) < 2.2) p.off += (Math.sign(dz) || 1) * 2.4 * dt; }
      if (c.on && Math.abs(c.v) > 2 && p.hopT < 0) { const dx = p.x - cx, dz = z0 - cz, d = Math.hypot(dx, dz); if (d < 4.6) hop(p, dx / (d || 1), dz / (d || 1), true); }
      for (const q of police) if (q.on && q.v > 2 && p.hopT < 0) { const dx = p.x - q.x, dz = z0 - q.z, d = Math.hypot(dx, dz); if (d < 4.2) hop(p, dx / (d || 1), dz / (d || 1)); }
      if (p.hopT >= 0) { p.hopT += dt; const u = p.hopT / 0.5; p.x = clamp(p.x + p.hx * dt / 0.5, lo, hi); p.off += p.hz * dt / 0.5; p.y = Math.sin(Math.min(1, u) * Math.PI) * 1.5; upW = 1; if (u >= 1) { p.hopT = -1; p.y = 0; } }
      const wide = p.mode === 'run' || p.mode === 'hide' || p.hopT >= 0 ? lim + 0.9 : lim; p.off = clamp(p.off, -wide, wide);
      p.up += (upW - p.up) * ease(dt, 11); p.duck += (duckW - p.duck) * ease(dt, 9); p.yaw += wrap(yawW - p.yaw) * ease(dt, 7);
      p.root.visible = Math.abs(p.x - hp.x) < 72; p.root.position.set(p.x, p.y + 0.02 + Math.abs(Math.sin(p.walked * 2.6)) * 0.1 * gait, pedZ(p)); p.root.rotation.y = p.yaw; p.root.rotation.z = Math.sin(p.walked * 2.6) * 0.07 * gait;
      p.tip.rotation.x = -(1 - s01(p.rise)) * 1.5; p.tip.scale.y = 1 - 0.42 * p.duck;
      p.doll.userData.up = p.up; p.doll.userData.clock(t + p.i); p.doll.userData.stride(p.walked, gait);
    }
    for (const g of gulls) {
      if (g.t < 0) continue; g.t += dt; const u = g.t;
      if (u < 2.2) { g.g.position.set(g.x + g.dir * u * 7, 0.03 + u * 6.5 + Math.sin(u * 20) * 0.2, g.z + u * 6); g.m.rotation.z = Math.sin(u * 22) * 0.5; g.g.scale.setScalar(1 - s01((u - 1.2) / 1.0) * 0.98); }
      else if (u < 13) g.g.visible = false;
      else if (u < 13.5) { g.g.visible = true; g.g.position.set(g.x, 0.03, g.z); g.m.rotation.z = 0; g.g.scale.setScalar(s01((u - 13) / 0.5)); }
      else { g.t = -1; g.g.scale.setScalar(1); }
    }
    for (const v of people) { v.upT = (v.upT || 0) - dt; v.upK = (v.upK || 0) + ((v.upT > 0 ? 1 : 0) - (v.upK || 0)) * ease(dt, 9); v.doll.userData.up = v.upK; }
    for (const p of PROPS) if (p.down > 0 && (p.down -= dt) <= 0) { p.h.set(1, 0); }
  }

  const store = { h: null, L: null, R: null, lid: null, open: 0, v: 0, want: 0, items: [], beads: null };
  const arc = (cx, cy, rx, ry, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  function buildStore() {
    const { x, z, w, h, d } = STORE, wall = '#ffc9a8', acc = C.pink, G = new THREE.Group();
    const goods = (g, x0, y0, n, kind, sp = 0.64) => { for (let i = 0; i < n; i++) { const gx = x0 + i * sp; g.beginPath(); if (kind === 0) g.roundRect(gx, y0, 0.4, 0.62, 0.08); else if (kind === 1) { g.roundRect(gx + 0.07, y0, 0.28, 0.5, 0.06); g.rect(gx + 0.15, y0 + 0.5, 0.12, 0.2); } else g.rect(gx, y0, 0.46, 0.46); g.fill(); } };
    const floor = mk(rect(w - 0.3, d - 0.2), (P) => { P.fill('#f6e2c8'); P.felt(0.5); P.draw((g) => { g.fillStyle = P2.rgba(C.turq, 0.5); for (let i = 0; i < 15; i++) for (let j = 0; j < 9; j++) if ((i + j) % 2) g.fillRect(-w / 2 + i, j, 1, 1); }); }, { pxPerUnit: 24, back: false, edgeWidth: 0 });
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.04, -0.1); floor.castShadow = false; G.add(floor);
    const back = mk(rect(w, h), (P) => {
      P.gradient(P2.shade(wall, 0.06), P2.shade(wall, -0.12), 0.4); P.felt(0.6);
      P.layer((g) => { for (const y of [1.3, 2.6, 3.9]) g.fillRect(-6.9, y - 0.14, 9.6, 0.14); g.fillRect(-6.9, 0, 0.16, 4.9); g.fillRect(2.54, 0, 0.16, 4.9); g.fillRect(-6.9, 4.76, 9.6, 0.14); }, C.cream, { depth: 0.6 });
      [[1.3, 0, C.coral], [2.6, 1, C.teal], [3.9, 2, C.gold], [0.04, 2, C.lilac]].forEach(([y, kind, col]) => P.layer((g) => goods(g, -6.55, y, 14, kind), col, { depth: 0.5 }));
      P.layer((g) => { g.beginPath(); g.roundRect(4.3, 0, 2.5, 4.4, [1.2, 1.2, 0, 0]); g.fill(); }, C.navy, { depth: 0.4 });
      P.innerShade(P2.shade(wall, -0.6), { alpha: 0.3, blurPx: 12 });
    }, { pxPerUnit: 36, thickness: 0.08 });
    back.position.set(0, 0, -d + 0.06); G.add(back);
    for (const sd of [-1, 1]) {
      const sw = mk(rect(d, h), (P) => { P.gradient(P2.shade(wall, -0.02), P2.shade(wall, -0.18), 0.4); P.felt(0.6); P.layer((g) => { g.fillRect(-3.4, 1.76, 6.8, 0.14); g.fillRect(-3.4, 3.16, 6.8, 0.14); }, C.cream, { depth: 0.5 }); P.layer((g) => goods(g, -3.2, 1.9, 10, sd < 0 ? 1 : 0), sd < 0 ? C.pink : C.turq, { depth: 0.5 }); P.layer((g) => goods(g, -3.2, 3.3, 10, 2), sd < 0 ? C.orange : C.lilac, { depth: 0.5 }); }, { pxPerUnit: 30, thickness: 0.08 });
      sw.rotation.y = Math.PI / 2; sw.position.set(sd * (w / 2 - 0.05), 0, -d / 2); G.add(sw);
    }
    const lidP = new THREE.Group(); lidP.position.set(0, h, -d); G.add(lidP); store.lid = lidP;
    const lid = mk(rect(w + 0.5, d + 0.4), (P) => { P.gradient('#fbe3d2', '#f0cfc0', 0.3); P.felt(0.6); P.layer((g) => { g.beginPath(); g.roundRect(-w / 2 + 1, 1, w - 2, d - 2, 0.6); g.fill(); }, P2.shade(wall, -0.25), { depth: 0.6 }); }, { pxPerUnit: 24, thickness: 0.1 });
    lid.rotation.x = Math.PI / 2; lidP.add(lid);
    const bag = (g) => { g.beginPath(); g.moveTo(-0.6, 0.28); g.lineTo(0.6, 0.28); g.lineTo(0.78, 1.5); g.lineTo(-0.78, 1.5); g.closePath(); g.fill(); g.lineWidth = 0.12; g.strokeStyle = g.fillStyle; for (const sx of [-0.3, 0.3]) { g.beginPath(); g.arc(sx, 1.5, 0.24, 0, Math.PI); g.stroke(); } };
    const sign = mk([[-3.6, 0], [3.6, 0], [3.6, 1.5], ...arc(0, 1.5, 1.7, 1.2, 0, Math.PI, 14), [-3.6, 1.5]], (P) => {
      P.fill(C.navy); P.felt(0.5); P.layer(bag, C.neon, { depth: 0.5 }); P.glow(bag);
      const bulbs = (g) => { for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(sd * (1.5 + k * 0.56), 0.75, 0.17, 0, 7); g.fill(); } };
      P.layer(bulbs, acc, { lip: 0, depth: 0.3 }); P.glow(bulbs);
      P.layer((g) => { g.fillRect(-3.6, 0, 7.2, 0.16); }, C.turq, { depth: 0.4 });
    }, { pxPerUnit: 34, thickness: 0.08 });
    sign.position.set(0, 0.08, d + 0.2); lidP.add(sign); store.sign = sign;
    const half = (sd) => {
      const piv = new THREE.Group(); piv.position.set(sd * w / 2, 0, 0.03);
      const pts = [[0, 0], [6.3, 0], [6.3, 3.4], [7.5, 3.4], [7.5, h], [0, h]].map(([px, py]) => [-sd * px, py]); if (sd > 0) pts.reverse();
      const x0 = sd < 0 ? 0 : -7.5;
      const card = mk(pts, (P) => {
        P.gradient(P2.shade(wall, 0.08), P2.shade(wall, -0.1), 0.4); P.felt(0.7);
        P.layer((g) => g.fillRect(x0, h - 0.6, 7.5, 0.6), '#fbe3d2', { depth: 0.6 });
        const wx = sd < 0 ? 0.95 : -5.35, pane = (g) => { g.beginPath(); g.roundRect(wx, 0.9, 4.4, 2.3, 0.25); g.fill(); };
        P.layer((g) => { g.beginPath(); g.roundRect(wx - 0.16, 0.74, 4.72, 2.62, 0.3); g.fill(); }, C.cream, { depth: 0.6 });
        P.layer(pane, C.neon, { lip: 0, shade: 0.5, depth: 0.4 }); P.glow((g) => { g.globalAlpha = 0.8; pane(g); });
        P.layer((g) => goods(g, wx + 0.3, 0.95, 6, 1), C.teal, { depth: 0.3 }); P.layer((g) => goods(g, wx + 0.3, 2.0, 6, 2), C.coral, { depth: 0.3 });
        P.layer((g) => { const n = 6; for (let k = 0; k < n; k++) { g.fillStyle = k % 2 ? C.cream : acc; const a = x0 + k * 7.5 / n; g.beginPath(); g.moveTo(a, 4.6); g.lineTo(a + 7.5 / n, 4.6); g.lineTo(a + 7.5 / n, 3.85); g.lineTo(a + 3.75 / n, 3.55); g.lineTo(a, 3.85); g.closePath(); g.fill(); } }, acc, { depth: 0.9 });
        P.innerShade(P2.shade(wall, -0.6), { alpha: 0.3, blurPx: 12 });
      }, { pxPerUnit: 36, thickness: 0.08 });
      piv.add(card); G.add(piv); return piv;
    };
    store.L = half(-1); store.R = half(1);
    const cw = 5.4, cd = 1.25, ch = 1.75, cx = 3.3, cz = -4.9;
    const cFront = (P) => { P.gradient(C.turq, P2.shade(C.turq, -0.14), 0.4); P.felt(0.6); P.layer((g) => { for (let k = 0; k < 9; k++) g.fillRect(-cw / 2 + 0.3 + k * 0.6, 0.2, 0.3, ch - 0.5); }, C.cream, { depth: 0.4 }); P.layer((g) => g.fillRect(-cw / 2, ch - 0.2, cw, 0.2), C.navy, { depth: 0.5 }); };
    const cSide = (P) => { P.gradient(P2.shade(C.turq, -0.06), P2.shade(C.turq, -0.2), 0.4); P.felt(0.6); };
    const cnt = prismFold([[-cw / 2, 0], [cw / 2, 0], [cw / 2, -cd], [-cw / 2, -cd]], { h: ch, roof: 'flat', paper: H.paper, seed: seed++, thickness: 0.07, edgeWidth: 0.07, paints: { wall: [cFront, cSide, cSide, cSide], roof: (P) => { P.gradient('#fbe3d2', '#f0cfc0', 0.3); P.felt(0.5); } }, print: H.cardOpts(x + cx, z + cz, 1, null, 1.1) });
    cnt.position.set(cx, 0, cz); G.add(cnt);
    const till = mk(rect(1.1, 0.8), (P) => { P.fill(C.coral); P.felt(0.5); P.layer((g) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(-0.3 + i * 0.3, 0.2 + j * 0.24, 0.09, 0, 7); g.fill(); } }, C.cream, { depth: 0.3 }); P.layer((g) => g.fillRect(-0.4, 0.58, 0.8, 0.14), C.navy, { depth: 0.3 }); }, { pxPerUnit: 70 });
    till.position.set(cx + 2.0, ch + 0.04, cz - 0.75); G.add(till);
    const tillTab = mk(rect(0.5, 0.5), (P) => { P.fill(C.cream); P.layer((g) => letters(g, '$', -0.1, 0.09, 0.05), C.teal, { depth: 0.3 }); }, { pxPerUnit: 90 }); tillTab.position.set(cx + 2.0, ch + 0.84, cz - 0.75); G.add(tillTab);
    const item = (id, price, lx, draw) => {
      const [pts, paint] = P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.cream); D.rect(g, -0.5, 0, 1.9, 0.16); D.rect(g, -0.09, 0, 0.18, 0.98); draw(g, ink); g.fillStyle = ink(C.gold); D.rect(g, 0.5, 0.08, 0.86, 0.5, 0.08); g.fillStyle = ink(C.navy, 'print'); letters(g, '$' + price, 0.58, 0.17, 0.055); }, { w: 3.0, h: 1.7, res: 90, name: `store ${id}` });
      const hgt = hinge(mk(pts, paint, { pxPerUnit: 80 }), { at: new V3(cx + lx, ch + 0.04, cz - 0.5), yaw: 0, open: 0, size: 0.25 }); G.add(hgt.group);
      store.items.push({ id, price, h: hgt, wx: x + cx + lx, wz: z + cz - 0.5, y: ch + 1.4, up: false });
    };
    item('gun', 5, -1.5, (g, ink) => { g.fillStyle = ink(C.coral); D.rect(g, -0.6, 0.86, 1.15, 0.34, 0.08); D.rect(g, -0.62, 0.42, 0.34, 0.6, 0.1); g.fillStyle = ink(C.cream, 'print'); D.rect(g, 0.42, 0.86, 0.13, 0.34); });
    item('shades', 3, 0.4, (g, ink) => { g.fillStyle = ink(C.navy); D.rect(g, -0.62, 0.92, 1.24, 0.1, 0.04); D.ell(g, -0.35, 0.86, 0.3, 0.2); D.ell(g, 0.35, 0.86, 0.3, 0.2); g.fillStyle = ink(C.turq, 'print'); D.ell(g, -0.42, 0.9, 0.1, 0.05, 0.5); D.ell(g, 0.28, 0.9, 0.1, 0.05, 0.5); });
    const shelf = mk(rect(4.4, 3.5), (P) => { P.gradient('#fbe3d2', '#eccdb8', 0.3); P.felt(0.6); P.layer((g) => { for (const y of [0.1, 1.2, 2.3]) g.fillRect(-2.2, y, 4.4, 0.14); }, C.navy, { depth: 0.5 }); [[0.24, 0, C.gold], [1.34, 1, C.pink], [2.44, 2, C.turq]].forEach(([y, kind, col]) => P.layer((g) => goods(g, -1.95, y, 6, kind, 0.68), col, { depth: 0.5 })); }, { pxPerUnit: 40, thickness: 0.1 });
    shelf.position.set(-4.5, 0, -6.6); G.add(shelf);
    const [bp, bpaint] = P2.drawnPiece((g, ink) => { for (let i = 0; i < 9; i++) { const bx = -1.08 + i * 0.27; g.fillStyle = ink([C.pink, C.turq, C.gold][i % 3]); D.rect(g, bx - 0.035, 0.5 + (i % 2) * 0.3, 0.07, 3.75 - (i % 2) * 0.3); for (let y = 0.7 + (i % 2) * 0.3; y < 4.0; y += 0.42) D.ell(g, bx, y, 0.1, 0.1); } g.fillStyle = ink(C.gold); D.rect(g, -1.3, 4.1, 2.6, 0.24, 0.08); }, { w: 2.8, h: 4.5, res: 60, name: 'bead curtain' });
    const bpiv = new THREE.Group(); bpiv.position.set(5.55, 4.3, -d + 0.34); const beads = mk(bp, bpaint, { pxPerUnit: 60 }); beads.position.y = -4.3; bpiv.add(beads); G.add(bpiv); store.beads = bpiv;
    store.h = X.popup(null, null, { node: G, height: h, x, z, level: true }); H.glowing(store.h.group);
    walk.wall(x - w / 2, z + 0.1, x - 1.9, z + 0.1, { r: 0.35, name: 'store front' }); walk.wall(x + 1.9, z + 0.1, x + w / 2, z + 0.1, { r: 0.35, name: 'store front' });
    walk.wall(x + cx - cw / 2, z + cz - 0.6, x + cx + cw / 2, z + cz - 0.6, { r: 0.8, name: 'counter' }); walk.wall(x - 6.7, z - 6.6, x - 2.3, z - 6.6, { r: 0.6, name: 'shelf' });
  }
  function storeStep(t, dt) {
    const { x, z, w } = STORE, c = conv(), otis = people.find((v) => v.id === 'otis');
    const was = S.inside; S.inside = !c.on && !X.INTRO.on && Math.abs(hp.x - x) < w / 2 && hp.z < z + (was ? 0.5 : -0.15);
    if (S.inside !== was) SFX.flap({ size: 1, up: S.inside });
    store.v += ((S.inside ? 1 : 0) - store.open) * 34 * dt - store.v * 7.2 * dt; store.open = clamp(store.open + store.v * dt, -0.02, 1.06);
    store.L.rotation.y = -store.open * 2.5; store.R.rotation.y = store.open * 2.5; store.lid.rotation.x = -store.open * 1.95;
    store.beads.rotation.x = Math.sin(t * 1.3) * 0.035;
    S.view += Math.sign((S.inside ? 1 : 0) - S.view) * Math.min(Math.abs((S.inside ? 1 : 0) - S.view), dt / 0.9);
    const avail = S.inside && (!otis || otis.greeted); let cue = null, bd = 3.3;
    for (const it of store.items) {
      const want = avail && !(it.id === 'gun' ? S.gun : S.shades);
      if (want !== it.up) { it.up = want; it.h.set(want ? 1 : 0, want ? 0.25 : 0); }
      it.h.update(dt); it.h.group.visible = it.up || it.h.p > 0.04;
      if (it.up && !X.talk.busy()) { const dd = Math.hypot(hp.x - it.wx, hp.z - it.wz); if (dd < bd) { bd = dd; cue = it; } }
    }
    store.cue = cue; X.talk.cue = cue ? [cue.wx, cue.y, cue.wz] : null;
  }
  function buy(it) {
    if (S.cash < it.price) { SFX.thump(); bumpCash(); return true; }
    S.cash -= it.price; SFX.coin(); bumpCash(); if (it.id === 'gun') S.gun = true; else S.shades = true;
    return true;
  }
  function use(near, cd = 99) {
    if (S.bust || X.INTRO.on) return true;
    if (conv().on) return false;
    if (store.cue) return buy(store.cue);
    if (near && near.id === 'marisol' && X.box() === 2 && X.talk.open(near, false, true)) { X.setBox(3); S.boxT = 0; S.job = 1; const m = X.boxMesh(), wp = new V3(); m.getWorldPosition(wp); H.scene.add(m); m.position.copy(wp); m.rotation.set(0, 0, 0); m.userData.from = wp.clone(); m.userData.to = new V3(near.at[0] - 1.5, 0.02, near.at[1] + 1.1); SFX.flap({ size: 0.4, up: true }); return true; }
    return tryJack(cd);
  }
  function jobStep(dt) {
    if (X.box() === 3 && S.boxT < 1) { S.boxT = Math.min(1, S.boxT + dt / 0.8); const m = X.boxMesh(), u = S.boxT; m.position.lerpVectors(m.userData.from, m.userData.to, s01(u)); m.position.y += Math.sin(u * Math.PI) * 2.4; m.rotation.z = u * Math.PI * 2; }
    if (S.job === 1 && !X.talk.busy() && S.boxT >= 1) { S.job = 2; S.cash += 200; bumpCash(); showBig('job'); SFX.fanfare(); }
    if (S.bigT > 0 && (S.bigT -= dt) <= 0) { big.el?.classList.remove('on'); SFX.flap({ size: 1, up: false }); if (S.big === 'job') confetti(); S.big = null; }
  }

  const hud = { stars: [], cash: null, cashCv: null, map: null, base: null, radio: null, radioCv: null, el: null, n: 0, bump: 0 };
  function bumpCash() { hud.bump = 0.22; hud.cash?.classList.add('bump'); }
  function drawCash() {
    const cv = hud.cashCv; if (!cv) return; const g = cv.getContext('2d'), text = '$' + S.cash, u = 10.5;
    cv.width = Math.round((text.length * 4.9 + 0.6) * u); g.clearRect(0, 0, cv.width, cv.height);
    for (const [dx, dy, col, grow] of [[0, 0, C.navy, 0.4], [-0.1, 0.14, text.length > 3 ? C.gold : C.teal, 0]]) [...text].forEach((ch, i) => { g.save(); g.setTransform(u, 0, 0, -u, (0.6 + i * 4.9 + dx) * u, cv.height - (1.1 - dy) * u); g.transform(1, 0, 0.16, 1, 0, 0); g.fillStyle = col; strokeGlyph(g, ch, grow); g.restore(); });
  }
  const MAPZ = [-36, 44];
  function drawMapBase() {
    const cv = document.createElement('canvas'); cv.width = 660; cv.height = 190; const g = cv.getContext('2d'), W = cv.width, Hh = cv.height;
    const mx = (x) => 12 + (x - PAGE.x0) / (PAGE.x1 - PAGE.x0) * (W - 24), mz = (z) => 10 + (z - MAPZ[0]) / (MAPZ[1] - MAPZ[0]) * (Hh - 20);
    hud.mx = mx; hud.mz = mz;
    g.fillStyle = '#ead2cf'; g.fillRect(0, 0, W, Hh);
    const band = (f0, f1, col) => { g.fillStyle = col; g.beginPath(); for (let x = PAGE.x0; x <= PAGE.x1; x += 4) g.lineTo(mx(x), mz(f0(x))); for (let x = PAGE.x1; x >= PAGE.x0; x -= 4) g.lineTo(mx(x), mz(f1(x))); g.closePath(); g.fill(); };
    band((x) => roadZ(x) + 5, (x) => boardZ(x), '#a9d3b6'); band((x) => boardZ(x), (x) => shoreZ(x), '#f6c4ae'); band((x) => shoreZ(x), () => MAPZ[1] + 4, '#58b9b6');
    const line = (f, col, wd, dash = []) => { g.strokeStyle = col; g.lineWidth = wd; g.setLineDash(dash); g.lineJoin = 'round'; g.beginPath(); for (let x = PAGE.x0; x <= PAGE.x1; x += 4) g.lineTo(mx(x), mz(f(x))); g.stroke(); g.setLineDash([]); };
    line(roadZ, '#5d5080', 13); line((x) => roadZ(x) - 1.3, '#fbe6b8', 1.6, [7, 6]); line(boardZ, '#c08d5e', 7);
    g.fillStyle = '#c08d5e'; for (const px of [PIER.x, PIER.x - 17]) g.fillRect(mx(px) - 3.5, mz(boardZ(px)), 7, mz(boardZ(px) + 19) - mz(boardZ(px)));
    g.fillStyle = 'rgba(42,33,70,0.2)'; for (let x = PAGE.x0 + 8; x < 104; x += 19) g.fillRect(mx(x - 6), mz(-34), mx(12) - mx(0), mz(-24) - mz(-34));
    const mark = (x, z, col, kind) => { g.save(); g.translate(mx(x), mz(z)); g.fillStyle = col; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); if (kind === 'sq') g.rect(-7, -7, 14, 14); else if (kind === 'di') { g.moveTo(0, -10); g.lineTo(9, 0); g.lineTo(0, 10); g.lineTo(-9, 0); g.closePath(); } else g.arc(0, 0, 7.5, 0, 7); g.stroke(); g.fill(); g.restore(); };
    hud.mark = mark;
    mark(STORE.x, STORE.z - 4, C.gold, 'sq'); mark(PIER.x, boardZ(PIER.x) + 12, C.turq, 'di'); mark(geo.SPOT.marisol.at[0], geo.SPOT.marisol.at[1], C.coral, 'dot');
    const sheet = X.sheet(); if (sheet) { g.globalAlpha = 0.35; g.globalCompositeOperation = 'multiply'; g.fillStyle = g.createPattern(sheet, 'repeat'); g.fillRect(0, 0, W, Hh); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    hud.base = cv;
  }
  function drawMap(t) {
    const cv = hud.map; if (!cv || !hud.base) return; const g = cv.getContext('2d'), c = conv(), [px, pz] = c.on ? centre(c) : [hp.x, hp.z];
    g.drawImage(hud.base, 0, 0);
    police.forEach((p) => { if (p.on) hud.mark(p.x, p.z, Math.floor(t * 4) % 2 ? C.pink : C.turq, 'dot'); });
    g.save(); g.translate(hud.mx(px), hud.mz(pz)); g.fillStyle = C.cream; g.strokeStyle = C.navy; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 9.5, 0, 7); g.stroke(); g.fill(); g.fillStyle = C.pink; g.beginPath(); g.arc(0, 0, 5, 0, 7); g.fill(); g.restore();
  }
  function showRadio() {
    const cv = hud.radioCv; if (!cv) return; const g = cv.getContext('2d'), name = STATIONS[S.station], u = 30;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 112, 112); g.setTransform(u, 0, 0, -u, 56, 62); g.lineCap = 'round';
    const col = [C.coral, C.teal, C.gold, C.navy][S.station]; g.fillStyle = col; g.strokeStyle = col;
    if (name) { g.save(); g.translate(0, S.station === 1 ? -0.1 : 0.1); X.ICON[['sun', 'palm', 'star'][S.station]](g); g.restore(); g.lineWidth = 0.13; for (const r of [1.35, 1.65]) { g.beginPath(); g.arc(0, 0.1, r, -0.5, 0.5); g.stroke(); g.beginPath(); g.arc(0, 0.1, r, Math.PI - 0.5, Math.PI + 0.5); g.stroke(); } }
    else { g.lineWidth = 0.26; g.beginPath(); g.arc(0, 0.1, 1.1, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-0.78, -0.68); g.lineTo(0.78, 0.88); g.stroke(); }
    S.radioT = 1.5; hud.radio.classList.add('on'); SFX.flap({ size: 0.4, up: true });
  }
  function nextStation() {
    if (!conv().on) return false;
    for (let k = 0; k < 4; k++) { S.station = (S.station + 1) % 4; const n = STATIONS[S.station]; if (!n || SFX.hasMusic(n)) break; }
    showRadio(); return true;
  }
  function hudStep(t, dt) {
    if (!hud.el) return;
    const play = !X.INTRO.on; if (play !== hud.play) { hud.play = play; document.body.classList.toggle('play', play); }
    const key = S.stars + '|' + S.cash; if (key !== S.hud) { S.hud = key; hud.stars.forEach((el, i) => el.classList.toggle('on', i < S.stars)); drawCash(); }
    hud.el.classList.toggle('talk', X.talk.busy());
    if (hud.bump > 0 && (hud.bump -= dt) <= 0) hud.cash.classList.remove('bump');
    if (S.radioT > 0 && (S.radioT -= dt) <= 0) hud.radio.classList.remove('on');
    if (hud.n++ % 5 === 0) drawMap(t);
  }

  function build() { buildStore(); buildTraffic(); buildPeds(); buildGun(); }
  function reset() {
    for (const t of traffic) { if (t.taken) release(t, false); t.x = t.x0; t.v = t.vmax; t.duck = 0; t.stuck = 0; restoreDriver(t); t.node.scale.y = 1; }
    for (const p of police) { p.on = false; p.node.visible = false; }
    for (const p of PROPS) p.down = 0;
    for (const v of people) { v.upT = 0; v.barkAt = -99; if (v.id === 'officer') { v.handle.reset(0); v.handle.group.visible = false; } }
    Object.assign(S, { cash: 20, stars: 0, calm: 0, gun: Q.has('gun'), shades: false, station: 0, radioT: 0, inside: false, view: 0, bust: null, bustT: 0, menace: [], fireStar: -9, job: 0, bigT: 0, big: null, boxT: 0, hud: '' });
    toggleGun(false); store.open = 0; store.v = 0; for (const it of store.items) { it.up = false; it.h.reset(0); }
    big.el?.classList.remove('on'); big.wipe?.classList.remove('on', 'out'); hud.radio?.classList.remove('on');
    if (hp) placePeds();
  }
  function start() {
    hook = window.__papercraft; hp = hook.heroPos;
    hud.el = document.getElementById('hud');
    if (hud.el) { hud.stars = [...document.querySelectorAll('#stars svg')]; hud.cash = document.getElementById('cash'); hud.cashCv = hud.cash.querySelector('canvas'); hud.map = document.querySelector('#map canvas'); hud.radio = document.getElementById('radio'); hud.radioCv = hud.radio.querySelector('canvas'); drawMapBase(); }
    big.el = document.getElementById('big'); big.cv = big.el?.querySelector('canvas'); big.bits = document.getElementById('bits'); big.wipe = document.getElementById('wipe');
    for (let i = 1; i <= 4; i++) SFX.loadClip('shout' + i, `media/shout_${i}.mp3`);
    for (let i = 1; i <= 2; i++) SFX.loadClip('mega' + i, `media/megaphone_${i}.mp3`);
    SFX.loadMusic('radio2', 'media/radio2.mp3'); SFX.loadMusic('radio3', 'media/radio3.mp3');
    store.sign.userData.setGlow?.(2.3);
    addEventListener('pointermove', (e) => { gun.px = e.clientX; gun.py = e.clientY; });
    H.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('keydown', (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || X.INTRO.on || DEMO || S.bust) return;
      if (e.code === 'KeyF') toggleGun();
      else if (e.code === 'Space') { if (S.drawn) { fire(); e.preventDefault(); } }
      else if (e.code === 'KeyR') nextStation();
      else if (e.code === 'KeyH') honk();
    });
    placePeds();
  }
  function step(t, dt) {
    S.t = t;
    trafficStep(t, dt); policeStep(t, dt); pedStep(t, dt); storeStep(t, dt); gunStep(dt); bustStep(dt); jobStep(dt); hudStep(t, dt);
  }
  const api = { S, geo, build, start, step, reset, prop, collide, use, fire, toggleGun, honk, nextStation, addStar, bust, scare, tryJack, peds, police, traffic, store, gulls, PROPS,
    hold: () => !!S.bust, music: (c) => { const n = STATIONS[S.station]; return n ? { [n]: c.t > 0.9 ? 0.36 : 0 } : {}; },
    click: () => (S.drawn ? (fire(), true) : false),
    view: () => ({ w: S.view, pos: [STORE.x, 20, STORE.z + 15.5], look: [STORE.x, 2.4, STORE.z - 4.6] }),
    state: () => ({ cash: S.cash, stars: S.stars, gun: S.gun, drawn: S.drawn, shades: S.shades, inside: S.inside, open: +store.open.toFixed(2), station: STATIONS[S.station], bust: S.bust ? S.bust.stage : null, busts: S.busts, shots: S.shots, jacks: S.jacks, hits: S.hits, job: S.job, calm: +S.calm.toFixed(1), bustT: +S.bustT.toFixed(2), police: police.filter((p) => p.on).map((p) => [+p.x.toFixed(1), +p.v.toFixed(1)]), peds: peds.filter((p) => p.live && p.root.visible).length, modes: peds.map((p) => p.mode[0]).join(''), traffic: traffic.filter((k) => k.node.visible && !k.taken).length, cars: CARS.length, down: PROPS.filter((p) => p.down > 0).length, gulls: gulls.filter((g) => g.t >= 0).length }) };
  return api;
}
