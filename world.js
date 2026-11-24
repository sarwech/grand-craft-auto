export function foldOut(H, { sfx = null, reach = 18, dist = null, startUp = () => false, hold = () => false } = {}) {
  const hook = window.__papercraft, hero = H.hero;
  let fresh = true, clock = 0;
  const d0 = dist || ((h, p) => Math.hypot(h.x - p.x, h.z - p.z));
  const flat = () => { for (const h of H.hinges) { h.onStart = (hh) => sfx?.flap(hh.size); if (h === hero || startUp(h)) { h.reset(1); h.up = true; h.upAt = -9; continue; } h.reset(0); h.up = false; } };
  H.onRestart(() => { fresh = true; });
  H.onStep((t) => {
    clock = t;
    if (fresh) { flat(); fresh = false; }
    if (hold()) return;
    const p = hook.heroPos;
    for (const h of H.hinges) {
      if (h.up) continue;
      const d = d0(h, p);
      if (d < reach) { h.up = true; h.upAt = clock; h.set(1, Math.max(0, d - 5) * 0.05 + Math.round(h.jit * 60) * 0.06); }
    }
  });
  return {
    revealAll() { fresh = false; for (const h of H.hinges) { h.reset(1); h.up = true; h.upAt = -9; } },
    risen: () => H.hinges.filter((h) => h.up).length, total: () => H.hinges.length,
    settleCheck() {
      let risen = 0; const off = [];
      for (const h of H.hinges) { if (!h.up || h === hero || h.rocks || clock - (h.upAt ?? -9) < 3) continue; risen++; const a = Math.abs(h.pivot.rotation.x) * 180 / Math.PI; if (a > 3.5 || h.p < 0.985) off.push([+h.x.toFixed(1), +h.z.toFixed(1), +a.toFixed(1), +h.p.toFixed(2)]); }
      return { settled: risen, offPose: off.length, worst: off.sort((a, b) => b[2] - a[2]).slice(0, 5) };
    },
  };
}

export function nearestOn(pts, x, z) { let bi = 0, bd = 1e9; pts.forEach(([lx, lz], i) => { const d = Math.hypot(x - lx, z - lz); if (d < bd) { bd = d; bi = i; } }); return [bi, bd]; }

export function offLane(lane, x, z, min, inside = () => false) {
  for (let k = 0; k < 14 && lane.dist(x, z) < min && !inside(x, z); k++) { const [bi, bd] = nearestOn(lane.pts, x, z), [lx, lz] = lane.pts[bi], n = bd || 1; x += (x - lx) / n * 0.6 + (bd ? 0 : 0.6); z += (z - lz) / n * 0.6; }
  return [x, z];
}

export function laneCheck(lane, solids, half, skip = () => false) {
  let pts = 0, hits = 0; const bad = [];
  for (const [lx, lz] of lane.pts) { if (skip(lx, lz)) continue; pts++; for (const [x, z, r] of solids) if (Math.hypot(x - lx, z - lz) < r + half) { hits++; bad.push([+x.toFixed(1), +z.toFixed(1), r]); } }
  return { lanePoints: pts, solids: solids.length, overlaps: hits, bad: bad.slice(0, 6) };
}

export function flight(H, keys) {
  const THREE = H.THREE, pos = new THREE.Vector3(), look = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const sm = (t) => t * t * (3 - 2 * t);
  const api = { weight: 0, t: 0, focusBand: 0.8, pos, look, fov: 26, custom: null, extra: null,
    at(t) {
      if (api.custom && api.custom(t, api)) return;
      let i = 0; while (i < keys.length - 2 && t > keys[i + 1].t) i++;
      const k0 = keys[i], k1 = keys[i + 1], u = sm(Math.min(1, Math.max(0, (t - k0.t) / (k1.t - k0.t))));
      pos.lerpVectors(a.set(...k0.pos), b.set(...k1.pos), u); look.lerpVectors(a.set(...k0.look), b.set(...k1.look), u); api.fov = (k0.fov ?? 26) + ((k1.fov ?? 26) - (k0.fov ?? 26)) * u;
    },
    attach() {
      const post = window.__papercraft.post, cam = H.camera, render = post.render.bind(post), blur0 = post.o.maxBlur, fov0 = cam.fov;
      const setFov = (f) => { if (Math.abs(cam.fov - f) > 0.01) { cam.fov = f; cam.updateProjectionMatrix(); } };
      post.render = (time) => {
        if (api.weight > 0) { api.at(api.t); setFov(api.fov); cam.position.copy(pos); cam.lookAt(look); cam.updateMatrixWorld(); post.focus.copy(api.focus || look); post.o.focusBand = api.focusBand; post.o.maxBlur = blur0 * 0.55; }
        else { setFov(fov0); post.o.maxBlur = blur0; if (api.extra) api.extra(cam, post); }
        render(time);
      };
    } };
  return api;
}

export function pageEdges(H, { x0, x1, desk = '#1f6f80', paperMaterial }) {
  const THREE = H.THREE, FAR = 900;
  const slab = (xa, xb, mat, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(xb - xa, 2 * FAR), mat); m.rotation.x = -Math.PI / 2; m.position.set((xa + xb) / 2, y, 0); m.receiveShadow = true; H.scene.add(m); };
  const dark = paperMaterial({ color: desk, map: H.paper.map });
  slab(x1, FAR, dark, 0.03); slab(-FAR, x0, dark, 0.03);
  ['#f8ecda', '#ead9c2', '#d9c6ac', '#c6b196'].forEach((c, i) => { const mat = paperMaterial({ color: c, map: H.paper.map }), a = i * 0.45, y = 0.07 - i * 0.008; slab(x1 + a, x1 + a + 0.45, mat, y); slab(x0 - a - 0.45, x0 - a, mat, y); });
  const shade = new THREE.MeshBasicMaterial({ color: '#0c2630', transparent: true, opacity: 0.4, depthWrite: false });
  slab(x1 + 1.8, x1 + 4.6, shade, 0.045); slab(x0 - 4.6, x0 - 1.8, shade, 0.045);
}
