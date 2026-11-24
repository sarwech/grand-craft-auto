import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { makeCard, hinge, cardClips } from 'papercraft/lib/paperkit-3d.js';
import { PaperSound } from 'papercraft/lib/paper-sound.js';
import { setGrade } from './screen.js';

const WIN_W = 4.7, WIN_H = WIN_W * 16 / 9, MAT_SIDE = 0.3, MAT_TOP = 0.34, MAT_FOOT = 0.78, MAT_Y = 0.1;
const MAT_W = WIN_W + 2 * MAT_SIDE, MAT_H = WIN_H + MAT_TOP + MAT_FOOT, BACK_W = MAT_W + 0.32, BACK_H = MAT_Y + MAT_H + 0.08, CREST = 0.95;
const WIN_Y0 = MAT_Y + MAT_FOOT, WIN_CY = WIN_Y0 + WIN_H / 2;
const LEAN = 0.5, STRUT_AT = 6.2, STRUT_L = 6.4;
export const CARD = { w: BACK_W, h: BACK_H + CREST, lean: LEAN };

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }';
const FRAG = `
uniform sampler2D map; uniform vec3 uGrade; uniform vec3 uTint; varying vec2 vUv;
vec3 toLinear( vec3 c ) { return mix( c / 12.92, pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) ), step( 0.04045, c ) ); }
void main() {
  vec3 d = clamp( texture2D( map, vUv ).rgb, 0.0, 1.0 );
  vec2 e = min( vUv, 1.0 - vUv );
  d *= 1.0 - 0.16 * ( 1.0 - smoothstep( 0.0, 0.014, e.x ) ) - 0.16 * ( 1.0 - smoothstep( 0.0, 0.008, e.y ) );
  vec3 s = clamp( ( d - 0.42 ) / uGrade.y + 0.42, 0.0, 1.0 );
  vec3 a = toLinear( s );
  float l = dot( a, vec3( 0.2126, 0.7152, 0.0722 ) );
  a = clamp( vec3( l ) + ( a - vec3( l ) ) / uGrade.z, 0.0, 1.0 );
  vec3 k = 2.51 - 2.43 * a, b = 0.03 - 0.59 * a;
  vec3 x = ( - b + sqrt( b * b + 0.56 * k * a ) ) / ( 2.0 * k );
  gl_FragColor = vec4( x / ( uGrade.x * uTint ), 1.0 );
}`;

const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const rrect = (x, y, w, h, k, n = 5) => {
  const p = [], q = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI / 2) * i / n; p.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k]); } };
  q(x + w - k, y + k, -Math.PI / 2); q(x + w - k, y + h - k, 0); q(x + k, y + h - k, Math.PI / 2); q(x + k, y + k, Math.PI);
  return p;
};
export function createTalk(H, { people, cards = false, outro = [], cream = '#f6ecd6', onBlend = null, onGoal = null, sfx = null, hold = null, locked = null, onKey = null, demoPlan = null, viewFrom = null, camHold = null, onUse = null, onClick = null }) {
  const THREE = H.THREE, Q = new URLSearchParams(location.search);
  const SYNC = Q.has('capture'), DEMO = Q.has('demo'), NOSTART = SYNC || Q.has('nostart');
  const sound = sfx || new PaperSound({ volume: 0.9 });
  const loader = new THREE.TextureLoader();
  const maxAniso = H.renderer.capabilities.getMaxAnisotropy();
  const raw = (t) => { t.colorSpace = THREE.NoColorSpace; t.anisotropy = maxAniso; return t; };

  function buildCard(v) {
    const g = new THREE.Group(), half = BACK_W / 2;
    const top = [];
    for (let i = 0; i <= 18; i++) { const a = Math.PI * i / 18; top.push([Math.cos(a) * 1.25, BACK_H - 0.12 + Math.sin(a) * (CREST + 0.12)]); }
    const backPts = [[-half, 0], [half, 0], [half, BACK_H], ...top, [-half, BACK_H]];
    const backing = makeCard(backPts, { paper: H.paper, thickness: 0.1, edgeWidth: 0.09, pxPerUnit: 56, seed: v.seed, back: 'kraft', paint: (P) => {
      P.gradient(P2.shade(v.accent, 0.1), P2.shade(v.accent, -0.12), 0.4); P.felt(0.7);
      P.marks('stripe', { color: P2.shade(v.accent, -0.3), alpha: 0.22, size: 0.035 });
      P.layer((gg) => { gg.beginPath(); gg.arc(0, BACK_H + 0.08, 0.72, 0, 7); gg.fill(); }, cream, { depth: 0.9 });
      P.parts((gg, inkOf) => { gg.save(); gg.translate(0, BACK_H + 0.08); v.icon(gg, inkOf); gg.restore(); }, { depth: 0.6 });
      P.innerShade(P2.shade(v.accent, -0.6), { alpha: 0.3, blurPx: 10 });
    } });
    backing.name = `${v.id} card back`;
    const matPts = [[-MAT_W / 2, MAT_Y], [MAT_W / 2, MAT_Y], [MAT_W / 2, MAT_Y + MAT_H], [-MAT_W / 2, MAT_Y + MAT_H]];
    const hole = rrect(-WIN_W / 2, WIN_Y0, WIN_W, WIN_H, 0.16).reverse();
    const mat = makeCard(matPts, { paper: H.paper, thickness: 0.06, edgeWidth: 0.07, pxPerUnit: 64, seed: v.seed + 3, back: false, folds: [], holes: [hole], paint: (P) => {
      P.gradient('#fbf3e1', '#eadfc8', 0.35); P.felt(0.5);
      P.draw((gg) => {
        gg.strokeStyle = P2.rgba(v.accent, 0.8); gg.lineWidth = 0.035; gg.beginPath();
        rrect(-WIN_W / 2 - 0.1, WIN_Y0 - 0.1, WIN_W + 0.2, WIN_H + 0.2, 0.22).forEach(([x, y], i) => (i ? gg.lineTo(x, y) : gg.moveTo(x, y))); gg.closePath(); gg.stroke();
      });
      P.layer((gg) => { for (const sx of [-1.4, -0.7, 0, 0.7, 1.4]) { gg.beginPath(); gg.arc(sx, MAT_Y + 0.38, 0.12, 0, 7); gg.fill(); } }, v.accent, { depth: 0.5 });
    } });
    mat.position.z = 0.16; mat.name = `${v.id} card mat`;
    const mater = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { map: { value: null }, uGrade: { value: new THREE.Vector3(0.82, 1.18, 0.96) }, uTint: { value: new THREE.Vector3(1.03, 0.985, 0.98) } } });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(WIN_W + 0.16, (WIN_W + 0.16) * 16 / 9), mater);
    screen.position.set(0, WIN_CY, 0.09); screen.name = `${v.id} screen`;
    const strutPivot = new THREE.Group(); strutPivot.position.set(0, STRUT_AT, -0.11);
    const strut = makeCard([[-0.55, -STRUT_L], [0.55, -STRUT_L], [0.7, 0], [-0.7, 0]], { paper: H.paper, thickness: 0.08, edgeWidth: 0.07, pxPerUnit: 40, seed: v.seed + 5, back: 'mirror', folds: ['top'],
      paint: (P) => { P.gradient('#c9a47c', '#b08a62', 0.2); P.felt(0.8); P.marks('hatch', { color: '#8a6644', alpha: 0.3, size: 0.05, angle: 0.02 }); } });
    strut.name = `${v.id} card strut`; strutPivot.add(strut);
    g.add(backing, screen, mat, strutPivot);
    const open = LEAN + Math.acos(Math.min(1, STRUT_AT * Math.cos(LEAN) / STRUT_L)) - 0.03;
    g.userData.follow = (p) => { strutPivot.rotation.x = open * smooth((p - 0.25) / 0.7); };
    const h = hinge(g, { at: new THREE.Vector3(v.card.x, 0.07, v.card.z), yaw: v.card.yaw, open: 0, size: 0.85, rest: -LEAN });
    H.scene.add(h.group);
    return { h, screen, mater };
  }

  const media = new Map();
  const clipMedia = (clip) => {
    if (!media.has(clip.video)) {
      const el = document.createElement('video'); el.preload = 'auto'; el.playsInline = true; el.setAttribute('playsinline', '');
      const tex = raw(new THREE.VideoTexture(el)); tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
      const m = { el, tex, missing: false };
      fetch(clip.video).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(r.status)))).then((blob) => { el.src = URL.createObjectURL(blob); el.load(); }).catch(() => { m.missing = true; });
      el.addEventListener('error', () => { m.missing = true; });
      media.set(clip.video, m);
    }
    return media.get(clip.video);
  };
  const show = (v, tex) => { if (v.head) v.head.show(tex); else v.mater.uniforms.map.value = tex; };
  const idleTex = (v) => (v.head && v.head.eyes ? v.head.eyes.tex : v.posterTex);

  const still = { update() {}, set() {}, reset() {}, p: 0 };
  for (const v of people) {
    if (cards) Object.assign(v, buildCard(v)); else Object.assign(v, { h: still, mater: v.doll.userData.head.mater, screen: v.doll.userData.head.face });
    v.head = cards ? null : v.doll.userData.head; v.posterTex = raw(loader.load(v.poster)); if (v.head) v.head.posterTex = v.posterTex;
    v.greeted = false; v.heard = (v.replies || []).map(() => false); v.afterI = 0; v.stage = 'intro';
    for (const c of [v.greet, ...(v.replies || []), ...(v.after || [])]) if (c) clipMedia(c);
    v.clip = v.greet; v.m = clipMedia(v.greet); show(v, idleTex(v));
    const c = Math.cos(v.card.yaw), s = Math.sin(v.card.yaw), mid = WIN_CY, back = mid * Math.sin(LEAN);
    v.centre = cards ? new THREE.Vector3(v.card.x - s * back, mid * Math.cos(LEAN), v.card.z - c * back) : new THREE.Vector3(v.at[0], v.doll.userData.headY * v.scale + (v.lift || 0), v.at[1] + 0.1);
    v.yaw0 = v.handle.group.rotation.y;
  }

  const ui = { start: document.getElementById('start'), prompt: document.getElementById('prompt'), caption: document.getElementById('caption') };
  let entered = NOSTART, active = null, phase = 'idle', tPhase = 0, tPlay = 0, blocked = false, near = null, simT = 0;
  let w = 0, hook = null, goal = null, pending = null, stuckT = 0, lastD = 0, kicked = false;
  const ovPos = new THREE.Vector3(), ovLook = new THREE.Vector3(), ovFocus = new THREE.Vector3(), basePos = new THREE.Vector3(), wrote = new THREE.Vector3(NaN, 0, 0), look = new THREE.Vector3();
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  let poseLive = false;

  const duration = (v) => (v.m.missing ? 3.5 : Number.isFinite(v.m.el.duration) && v.m.el.duration > 0 ? v.m.el.duration : 14);
  let line = null;
  const say = (v, t = 0) => {
    const cues = v && v.clip.cues && v.clip.cues.length ? v.clip.cues : null;
    let text = '';
    if (cues) { for (const c of cues) if (c.t <= t + 0.02) text = c.text; else break; } else if (v) text = v.clip.caption || '';
    if (text === line) return;
    line = text;
    ui.caption.classList.toggle('cue', !!cues);
    if (!text) { ui.caption.classList.remove('on'); return; }
    ui.caption.textContent = text;
    ui.caption.classList.remove('on'); void ui.caption.offsetWidth; ui.caption.classList.add('on');
  };
  const TRIM = 0.06;
  const reach = (v) => (cards ? 5.2 : Math.max(6.2, v.hail || 0));
  const stats = { recoveries: 0, hails: 0, primed: 0 };
  let stall = 0, lastT = -1, watchT = 0, waitT = 0;
  const rewind = (el) => { if (el.readyState > 0) el.currentTime = 0; };
  const tryPlay = (el) => { const p = el.play(); if (p && p.catch) p.then(() => { blocked = false; }).catch(() => { blocked = true; }); };

  const tags = document.getElementById('replies'), tagEls = tags ? [...tags.children] : [];
  let sel = 0, pressT = -1, pressI = 0;
  const showTags = (v) => {
    if (!tags) return;
    tags.classList.toggle('on', !!v);
    if (v) tagEls.forEach((el, i) => { el.textContent = v.replies[i]?.label || ''; el.classList.toggle('heard', !!v.heard[i]); el.classList.toggle('sel', i === sel); el.classList.remove('press'); el.style.display = v.replies[i] ? '' : 'none'; });
  };
  function startClip(v, clip, stage) {
    v.clip = clip; v.stage = stage; v.m = clipMedia(clip);
    const el = v.m.el; v.m.priming = null; v.m.primed = true; el.muted = false; el.volume = 1;
    stall = 0; lastT = -1; watchT = 0; waitT = 0;
    if (!v.m.missing) { if (!el.paused) el.pause(); rewind(el); } else show(v, idleTex(v));
  }
  function open(v) {
    if (!v || (active === v && phase !== 'closing')) return false;
    if (active) finish(active);
    active = v; phase = 'rising'; tPhase = 0; tPlay = 0;
    const first = !v.greeted || !(v.after && v.after.length);
    startClip(v, first ? v.greet : v.after[v.afterI++ % v.after.length], 'intro'); v.rearm = false;
    show(v, idleTex(v));
    v.h.set(1, 0); sound.flap({ size: 0.9, up: true });
    if (goal) onGoal?.(null);
    goal = null; pending = null; hook?.steer(null);
    if (!cards && hook && !DEMO && !(camHold && camHold()) && Math.abs(hook.heroPos.x - v.at[0]) < 4.8 && hook.heroPos.z > v.at[1] - 1.5) { goal = v.spot; stuckT = 0; }
    return true;
  }
  function choose(i) {
    const v = active;
    if (!v || phase !== 'choosing' || !v.replies[i]) return false;
    v.heard[i] = true; showTags(null);
    startClip(v, v.replies[i], 'reply'); phase = 'playing'; tPlay = 0; tPhase = 0; say(v, 0);
    if (!SYNC && !v.m.missing) tryPlay(v.m.el);
    return true;
  }
  function press(i) { if (phase !== 'choosing' || pressT >= 0 || !active.replies[i]) return; sel = i; pressI = i; pressT = 0; tagEls.forEach((el, k) => { el.classList.toggle('sel', k === i); el.classList.toggle('press', k === i); }); }
  function close() {
    if (!active || phase === 'closing') return;
    phase = 'closing'; tPhase = 0; pressT = -1; active.h.set(0, 0); sound.flap({ size: 0.9, up: false }); active.m.el.pause(); say(null); showTags(null);
  }
  function finish(v) {
    v.h.set(0, 0); v.m.el.pause(); if (!v.m.missing) rewind(v.m.el);
    show(v, idleTex(v)); say(null); showTags(null); pressT = -1;
    if (active === v) { active = null; phase = 'idle'; }
  }

  function poseFor(v, out, lookOut, push) {
    if (!cards) {
      const d = 10.6 - 0.6 * push, p = 17 * Math.PI / 180;
      lookOut.set(v.centre.x, v.centre.y - 0.3, v.centre.z + 0.75);
      out.set(lookOut.x, lookOut.y + Math.sin(p) * d, lookOut.z + Math.cos(p) * d);
      return;
    }
    const dist = 35 - 1.8 * push, yaw = v.card.yaw * 0.5 + v.side * 0.03, pit = 40 * Math.PI / 180;
    lookOut.set(v.centre.x + v.side * 1.5, v.centre.y - 0.25, v.centre.z);
    out.set(lookOut.x + Math.sin(yaw) * Math.cos(pit) * dist, lookOut.y + Math.sin(pit) * dist, lookOut.z + Math.cos(yaw) * Math.cos(pit) * dist);
  }

  const DEMO_STEPS = !DEMO ? [] : demoPlan || [
    { wait: 1.9 }, { walk: people[0].route }, { converse: 0, pick: 0 },
    { walk: people[1].route }, { converse: 1, pick: 1 },
    { walk: people[2].route }, { converse: 2, pick: 0 },
    { walk: outro }, { wait: 60 },
  ];
  let demoI = 0, demoT = 0, way = null;
  let wayT = 0;

  function step(time, dt) {
    simT = time;
    for (const v of people) {
      v.h.update(dt);
      const talking = active === v && phase === 'playing';
      v.doll.userData.idle(time + v.seed, talking, active === v && phase === 'choosing'); { const eye = H.camera.position, closeUp = active === v && w > 0.3 && !(camHold && camHold());
        const want = closeUp ? Math.atan2(eye.x - v.at[0], eye.z - v.at[1]) : (camHold && camHold() && hook ? Math.atan2(hook.heroPos.x - v.at[0], hook.heroPos.z - v.at[1]) : 0);
        let dy = want - (v.viewYaw ?? want); dy = Math.atan2(Math.sin(dy), Math.cos(dy)); v.viewYaw = (v.viewYaw ?? want) + dy * (1 - Math.exp(-dt * 7));
        v.doll.userData.faceCamera?.(v.handle.group.rotation.y, v.viewYaw); }
      if (hook) {
        const dx = hook.heroPos.x - v.at[0], dz = hook.heroPos.z - v.at[1], d = Math.hypot(dx, dz);
        let want = v.yaw0;
        if (d < 8) { let a = Math.atan2(dx, dz) - v.yaw0; a = Math.atan2(Math.sin(a), Math.cos(a)); const lim = cards ? 1.1 : 0.4; want = v.yaw0 + Math.max(-lim, Math.min(lim, a)); }
        const g = v.handle.group; g.rotation.y += (want - g.rotation.y) * (1 - Math.exp(-dt * 5));
        v.dist = d;
      }
    }
    if (!hook || !entered) return;
    near = null;
    let hailed = null;
    for (const v of people) { if (v.rearm === false && v.dist > (v.hail || 8.5) + 1) v.rearm = true; if (v.handle.p < 0.9) continue; if (v.dist < reach(v) && (!near || v.dist < near.dist)) near = v; if (!v.greeted && v.rearm !== false && v.dist < (v.hail || 8.5) && (!hailed || v.dist < hailed.dist)) hailed = v; }

    if (hook && !cards) {
      let watch = null;
      for (const v of people) if (v.dist < 12.5 && (!watch || v.dist < watch.dist)) watch = v;
      for (const v of people) v.head.eyes?.update(dt, time + v.seed, v === watch && active !== v ? [hook.heroPos.x - v.at[0], hook.heroPos.z - v.at[1]] : null, active === v ? (phase === 'choosing' ? 'camera' : 'rest') : v.eyes);
    }
    if (!active && hailed && !(hold && hold())) { open(hailed); stats.hails++; }
    if (active) {
      tPhase += dt;
      const v = active, el = v.m.el;
      if (v.dist > (cards ? 7.5 : (v.hail || 8.5) + 7) && phase !== 'closing') close();
      else if (phase === 'rising' && tPhase >= 0.95) {
        phase = 'playing'; tPlay = 0; say(v, 0);
        if (!SYNC && !v.m.missing) { rewind(el); tryPlay(el); }
      } else if (phase === 'playing') {
        const waiting = !SYNC && !v.m.missing && (el.readyState < 2 || (el.currentTime === 0 && el.paused));
        if (!waiting) tPlay += dt; else if ((waitT += dt) > 6) { v.m.missing = true; show(v, idleTex(v)); }
        if (!SYNC && !v.m.missing) {
          watchT += dt;
          if (el.currentTime !== lastT) { lastT = el.currentTime; stall = 0; } else stall += dt;
          if (watchT > 0.4 && !el.ended && (el.paused || el.muted || el.volume === 0 || stall > 0.4)) { watchT = 0; stall = 0; el.muted = false; el.volume = 1; stats.recoveries++; tryPlay(el); }
        }
        say(v, SYNC || v.m.missing ? tPlay : el.currentTime);
        if (!v.m.missing && el.readyState >= 2 && v.mater.uniforms.map.value !== v.m.tex) show(v, v.m.tex);
        if (SYNC && !v.m.missing) { const t = Math.min(tPlay, duration(v) - TRIM); if (Math.abs(el.currentTime - t) > 0.039) el.currentTime = t; }
        const over = SYNC || v.m.missing ? tPlay >= duration(v) - TRIM : (el.ended || el.currentTime >= duration(v) - TRIM || tPlay > duration(v) + 2.5);
        if (over) {
          if (v.clip === v.greet) v.greeted = true;
          if (v.stage === 'intro' && !cards && v.replies && v.replies.length) { phase = 'choosing'; tPhase = 0; sel = v.heard[0] && !v.heard[1] ? 1 : 0; pressT = -1; el.pause(); show(v, idleTex(v)); say(null); showTags(v); }
          else close();
        }
      } else if (phase === 'choosing' && pressT >= 0) { pressT += dt; if (pressT >= 0.38) { pressT = -1; choose(pressI); } }
      else if (phase === 'closing' && tPhase >= 0.9) finish(v);
    }
    const target = active && phase !== 'closing' ? 1 : 0;
    w += Math.sign(target - w) * Math.min(Math.abs(target - w), dt / (target ? 1.15 : 1.3));
    if (active) {
      poseFor(active, tmp, tmp2, Math.min(1, tPlay / 13));
      if (!poseLive) { ovPos.copy(tmp); ovLook.copy(tmp2); ovFocus.copy(active.centre); poseLive = true; }
      else { const k = 1 - Math.exp(-dt * 3.2); ovPos.lerp(tmp, k); ovLook.lerp(tmp2, k); ovFocus.lerp(active.centre, k); }
    } else if (w <= 0) poseLive = false;

    if (DEMO && demoI < DEMO_STEPS.length) {
      const s = DEMO_STEPS[demoI]; demoT += dt;
      const next = () => { demoI++; demoT = 0; way = null; };
      if (s.wait != null) { if (demoT >= s.wait) next(); }
      else if (s.walk) {
        if (!way) way = s.walk.slice();
        const [tx, tz] = way[0], dx = tx - hook.heroPos.x, dz = tz - hook.heroPos.z;
        wayT += dt;
        if (Math.hypot(dx, dz) < 0.6 || wayT > 6) { way.shift(); wayT = 0; if (!way.length) { hook.steer(null); next(); } }
        else hook.steer(dx, dz);
      } else if (s.until) { if (s.until(demoT, dt)) next(); }
      else if (s.converse != null) {
        const v = people[s.converse];
        if (!s.begun) { if (active === v || (v.greeted && v.heard.some(Boolean))) s.begun = true; else if (demoT > 1.5 && !active) open(v); }
        else if (active === v && phase === 'choosing' && tPhase > 1.6 && pressT < 0) press(s.pick);
        else if (active !== v || phase === 'closing') { s.begun = false; next(); }
      }
    } else if (goal) {
      const dx = goal[0] - hook.heroPos.x, dz = goal[1] - hook.heroPos.z, d = Math.hypot(dx, dz);
      stuckT = Math.abs(d - lastD) < 0.004 ? stuckT + dt : 0; lastD = d;
      if (d < 0.4 || stuckT > 0.5) { hook.steer(null); goal = null; onGoal?.(null); if (pending && pending.dist < reach(pending)) open(pending); pending = null; }
      else hook.steer(dx, dz);
    }
  }
  function reset() {
    for (const v of people) { v.h.reset(0); if (!v.m.priming) v.m.el.pause(); show(v, idleTex(v)); v.handle.group.rotation.y = v.yaw0; v.greeted = false; v.rearm = true; v.heard = v.heard.map(() => false); v.afterI = 0; }
    for (const st of DEMO_STEPS) st.begun = false; showTags(null); pressT = -1;
    active = null; phase = 'idle'; w = 0; poseLive = false; goal = null; pending = null; demoI = 0; demoT = 0; way = null; say(null);
  }

  const screenOf = (p, rect) => { tmp.copy(p).project(H.camera); return [rect.left + (tmp.x * 0.5 + 0.5) * rect.width, rect.top + (0.5 - tmp.y * 0.5) * rect.height, tmp.z]; };
  function drawUi() {
    const rect = H.renderer.domElement.getBoundingClientRect();
    const cueV = entered && near && !(active === near && phase !== 'closing') && !DEMO && !(hold && hold()), show = cueV || (entered && !DEMO && !active && api.cue);
    ui.prompt.classList.toggle('on', !!show);
    if (show) {
      const [x, y] = cueV ? screenOf(tmp2.set(near.at[0], near.height + 0.5 + (near.lift || 0), near.at[1]), rect) : screenOf(tmp2.set(...api.cue), rect);
      ui.prompt.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%) rotate(-3deg)`;
    }
  }

  function attach() {
    hook = window.__papercraft;
    const post = hook.post, cam = H.camera, o = post.o, base = { falloff: o.falloff, falloffTint: o.falloffTint, focusBand: o.focusBand };
    for (const v of people) { v.mater.uniforms.uGrade.value.set(o.exposure, o.contrast, o.saturation); v.mater.uniforms.uTint.value.set(...o.tint); }
    setGrade(o);
    const render = post.render.bind(post);
    post.render = (time) => {
      const e = camHold && camHold() ? 0 : smooth(w);
      if (e > 0) {
        if (!cam.position.equals(wrote)) basePos.copy(cam.position);
        cam.position.lerpVectors(basePos, ovPos, e); look.copy(H.target).lerp(ovLook, e); cam.lookAt(look); cam.updateMatrixWorld(); wrote.copy(cam.position);
        post.focus.lerp(ovFocus, e);
      }
      if (e <= 0 && !cards) { let nv = null; for (const v of people) if (v.handle.p > 0.9 && v.dist < 20 && (!nv || v.dist < nv.dist)) nv = v; if (nv) post.focus.lerp(tmp2.set(nv.at[0], 3.2, nv.at[1]), 0.55 * smooth((20 - nv.dist) / 8)); }
      o.falloff = base.falloff * (1 - e); o.falloffTint = base.falloffTint * (1 - e); o.focusBand = base.focusBand + (0.46 - base.focusBand) * e;
      if (SYNC && active && !active.m.missing && active.m.el.readyState >= 2) active.m.tex.needsUpdate = true;
      onBlend?.(e);
      drawUi();
      render(time);
    };
    H.onStep(step); H.onRestart(reset);
    const cvs = H.renderer.domElement;
    const primeAll = () => {
      for (const m of media.values()) {
        const el = m.el;
        if (m.primed || m.missing || !el.src || (active && active.m === m)) continue;
        m.primed = true; stats.primed++;
        const token = {}; m.priming = token; el.muted = true;
        const p = el.play();
        const done = (ok) => { if (m.priming !== token) return; m.priming = null; if (ok) { el.pause(); el.currentTime = 0; } el.muted = false; };
        if (p && p.then) p.then(() => done(true)).catch(() => done(false)); else done(true);
      }
    };
    const kick = () => {
      sound.unlock();
      if (!kicked) { kicked = true; dispatchEvent(new KeyboardEvent('keydown', { code: 'F20' })); }
      if (blocked && active && phase === 'playing') tryPlay(active.m.el);
      if (entered) primeAll();
    };
    const enter = () => {
      if (entered) return;
      entered = true; ui.start?.classList.add('gone'); kick();
      hook.restart(); primeAll();
    };
    if (NOSTART) ui.start?.remove(); else ui.start.addEventListener('click', enter);

    const ray = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
    function click(cx, cy) {
      const rect = cvs.getBoundingClientRect();
      let pick = null, best = rect.height * 0.07;
      for (const v of people) { const [x, y] = screenOf(tmp2.set(v.at[0], v.height * 0.55, v.at[1]), rect), d = Math.hypot(x - cx, y - cy); if (d < best) { best = d; pick = v; } }
      if (pick) {
        if (pick.dist < reach(pick)) open(pick);
        else { if (active) close(); goal = pick.spot; pending = pick; stuckT = 0; onGoal?.(goal); }
        return;
      }
      ray.setFromCamera({ x: (cx - rect.left) / rect.width * 2 - 1, y: 1 - (cy - rect.top) / rect.height * 2 }, cam);
      if (ray.ray.intersectPlane(ground, hit) && onClick && onClick(hit.x, hit.z)) return;
      if (ray.ray.intersectPlane(ground, hit)) { goal = [hit.x, hit.z]; pending = null; stuckT = 0; onGoal?.(goal); }
    }
    const ptr = document.getElementById('pointer');
    if (ptr && !DEMO && !SYNC) {
      document.body.classList.add('paper-pointer');
      addEventListener('pointermove', (ev) => {
        if (ev.pointerType !== 'mouse') { ptr.style.display = 'none'; return; }
        const rect = cvs.getBoundingClientRect();
        let hot = !!(ev.target && ev.target.closest && ev.target.closest('#replies button'));
        if (!hot && entered && ev.target === cvs) for (const v of people) { if (v.handle.p < 0.9 || v.dist > reach(v)) continue; const [x, y] = screenOf(tmp2.set(v.at[0], v.height * 0.55, v.at[1]), rect); if (Math.hypot(x - ev.clientX, y - ev.clientY) < rect.height * 0.07) hot = true; }
        ptr.style.display = 'block'; ptr.classList.toggle('hot', hot); ptr.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px)`;
      });
      document.addEventListener('pointerleave', () => { ptr.style.display = 'none'; });
    } else if (DEMO) document.body.classList.add('no-pointer');
    if (DEMO || SYNC) document.body.classList.add('quiet');
    let down = null;
    addEventListener('pointerdown', (ev) => { if (ev.target !== cvs) return; ev.stopPropagation(); if (!entered || DEMO || (locked && locked())) return; down = [ev.clientX, ev.clientY]; kick(); }, true);
    addEventListener('pointerup', (ev) => { if (!down) return; const d = Math.hypot(ev.clientX - down[0], ev.clientY - down[1]); down = null; if (d < 12) click(ev.clientX, ev.clientY); }, true);
    addEventListener('keydown', (ev) => {
      if (ev.code === 'F20') return;
      if (!entered) { ev.stopPropagation(); enter(); return; }
      kick();
      if (locked && locked()) { ev.stopPropagation(); onKey?.(ev.code); return; }
      if (ev.code === 'Escape') { close(); return; }
      if (DEMO) { ev.stopPropagation(); return; }
      if (phase === 'choosing') {
        const n = { Digit1: 0, Numpad1: 0, Digit2: 1, Numpad2: 1 }[ev.code];
        if (n != null) { press(n); ev.stopPropagation(); return; }
        if (ev.code === 'ArrowLeft' || ev.code === 'KeyA' || ev.code === 'ArrowRight' || ev.code === 'KeyD') { sel = ev.code === 'ArrowLeft' || ev.code === 'KeyA' ? 0 : 1; tagEls.forEach((el, k) => el.classList.toggle('sel', k === sel)); ev.stopPropagation(); return; }
        if (ev.code === 'Enter' || ev.code === 'Space') { press(sel); ev.stopPropagation(); return; }
      }
      if ((ev.code === 'KeyE' || ev.code === 'Enter') && onUse && onUse(near)) { ev.stopPropagation(); return; }
      if (ev.code === 'KeyE' || ev.code === 'Enter') { if (near) open(near); ev.stopPropagation(); return; }
      if (ev.code === 'KeyM') { sfx?.toggleMute(); return; }
      if (/^(Key[WASD]|Arrow)/.test(ev.code) && goal) { goal = null; pending = null; hook.steer(null); onGoal?.(null); }
    }, true);

    tagEls.forEach((el, i) => el.addEventListener('click', () => { kick(); if (!DEMO) press(i); }));
    window.__town = {
      cards, people, choose, press, talk: (id) => open(people.find((v) => v.id === id)), close, enter,
      state: () => ({ active: active?.id || null, phase, w: +w.toFixed(3), tPlay: +tPlay.toFixed(2), blocked, stats, near: near?.id || null, greeted: people.map((v) => v.greeted), heard: people.map((v) => v.heard), sel, entered, demo: DEMO ? demoI : null, simT: +simT.toFixed(2),
        video: active ? { t: +active.m.el.currentTime.toFixed(2), paused: active.m.el.paused, ended: active.m.el.ended, muted: active.m.el.muted, volume: active.m.el.volume, line, src: active.clip.video, stage: active.stage, missing: active.m.missing, ready: active.m.el.readyState, dur: active.m.el.duration, audioBytes: active.m.el.webkitAudioDecodedByteCount ?? null, videoFrames: active.m.el.webkitDecodedFrameCount ?? null } : null }),
      clips: () => people.map((v) => ({ id: v.id, clips: cardClips(v.handle.group) })),
      screenRect: (id) => {
        const v = people.find((q) => q.id === id), rect = cvs.getBoundingClientRect(); v.screen.updateWorldMatrix(true, false);
        const hw = cards ? WIN_W / 2 - 0.12 : 0.25, hh = cards ? WIN_H / 2 - 0.12 : 0.25;
        return [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map(([x, y]) => { const [sx, sy] = screenOf(tmp2.set(x, y, 0).applyMatrix4(v.screen.matrixWorld), rect); return [sx, sy]; });
      },
    };
  }
  const api = { cue: null };
  return Object.assign(api, { attach, people, close: () => close(), setW: (v) => { w = v; }, speaking: () => !!active && phase === 'playing', busy: () => !!active, active: () => active, phase: () => phase, open: (v, cut) => { const ok = open(v); if (ok && cut) { w = 1; poseLive = false; } return ok; }, demo: DEMO, sync: SYNC });
}
