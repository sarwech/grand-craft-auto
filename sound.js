import { PaperSound } from 'papercraft/lib/paper-sound.js';

export function createSound({ seed = 7, birds = true } = {}) {
  const sfx = new PaperSound({ volume: 0.5, spacing: 0.42, spacingJitter: 0.15, groupWindow: 0.35 });
  const stats = { steps: 0, flaps: 0, flapsAsked: 0, chirps: 0, gusts: 0, duck: 1, muted: false };
  let hissT = 0, idleCar = false, eng = null, rev = 0;
  const tracks = {};
  let amb = null, analyser = null, duckTo = 1, nextChirp = 6, nextGust = 9, foot = 0, lastStepAt = 0, rs = seed >>> 0;
  const rnd = () => { rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0; return rs / 4294967296; };
  const BASE = () => 0.855 * 2 * sfx.volume;

  function unlock() {
    const ctx = sfx.unlock();
    if (amb || !ctx) return;
    amb = ctx.createGain(); amb.gain.value = 1;
    analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
    amb.connect(sfx.chain.master); sfx.chain.master.connect(analyser);
    for (const m of Object.values(tracks)) { m.gain = ctx.createGain(); m.gain.gain.value = 0; m.gain.connect(sfx.chain.master); }
  }
  function loadMusic(name, url) {
    if (tracks[name]) return;
    tracks[name] = { buf: null, gain: null, level: 0, want: 0, nextAt: 0, decoding: false, raw: fetch(url).then((r) => r.arrayBuffer()).catch(() => null) };
  }
  function playMusic(dt, m) {
    const ctx = sfx.ctx; if (!ctx || !m.gain || ctx.state !== 'running') return;
    if (!m.buf) { if (!m.decoding) { m.decoding = true; m.raw.then((a) => a && ctx.decodeAudioData(a)).then((b) => { if (b) m.buf = b; }).catch(() => {}); } return; }
    const X = 2.5, now = ctx.currentTime;
    if ((m.want > 0 || m.nextAt > 0) && now > m.nextAt - 0.3) {
      const t = Math.max(now + 0.05, m.nextAt), src = ctx.createBufferSource(), g = ctx.createGain(), first = m.nextAt === 0, len = m.buf.duration;
      src.buffer = m.buf; g.gain.setValueAtTime(first ? 1 : 0, t); if (!first) g.gain.linearRampToValueAtTime(1, t + X);
      g.gain.setValueAtTime(1, t + len - X); g.gain.linearRampToValueAtTime(0, t + len);
      src.connect(g); g.connect(m.gain); src.start(t); m.nextAt = t + len - X;
    }
    m.level += (m.want - m.level) * (1 - Math.exp(-dt / 0.7)); m.gain.gain.value = m.level;
  }
  function engine(on) {
    const ctx = sfx.ctx; if (!ctx || !amb) return;
    if (on && !eng) {
      const t = ctx.currentTime, o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), chop = ctx.createOscillator(), chopG = ctx.createGain(), trem = ctx.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; o1.frequency.value = 46; o2.frequency.value = 23; lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 1.2; g.gain.value = 0;
      chop.type = 'square'; chop.frequency.value = 13; chopG.gain.value = 0.5; trem.gain.value = 0.5; chop.connect(chopG); chopG.connect(trem.gain);
      o1.connect(lp); o2.connect(lp); lp.connect(trem); trem.connect(g); g.connect(amb); o1.start(t); o2.start(t); chop.start(t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.02, t + 0.05);
      chopG.gain.setValueAtTime(0.5, t + 0.55); chopG.gain.linearRampToValueAtTime(0.06, t + 0.7); trem.gain.setValueAtTime(0.5, t + 0.55); trem.gain.linearRampToValueAtTime(0.94, t + 0.7); chop.frequency.setValueAtTime(13, t + 0.55); chop.frequency.linearRampToValueAtTime(24, t + 0.7);
      eng = { o1, o2, lp, g, chop, born: t }; rev = 0;
    } else if (!on && eng) {
      const t = ctx.currentTime, e = eng; eng = null;
      e.g.gain.cancelScheduledValues(t); e.g.gain.setTargetAtTime(0, t, 0.12); e.o1.frequency.setTargetAtTime(24, t, 0.2); e.o2.frequency.setTargetAtTime(12, t, 0.2);
      for (const o of [e.o1, e.o2, e.chop]) o.stop(t + 0.9);
    }
  }
  function chirp() {
    const ctx = sfx.ctx; if (!ctx || ctx.state !== 'running' || stats.muted) return;
    const t0 = ctx.currentTime + 0.02, notes = 2 + Math.floor(rnd() * 3), base = 2600 + rnd() * 1700, pan = ctx.createStereoPanner(); pan.pan.value = rnd() * 1.4 - 0.7; pan.connect(amb);
    for (let i = 0; i < notes; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = t0 + i * (0.09 + rnd() * 0.06), f = base * (0.9 + rnd() * 0.3), len = 0.05 + rnd() * 0.06;
      o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (rnd() < 0.5 ? 1.25 : 0.8), t + len);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.012 + rnd() * 0.008, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0004, t + len);
      o.connect(g); g.connect(pan); o.start(t); o.stop(t + len + 0.02);
    }
    stats.chirps++;
  }
  function gust() {
    const ctx = sfx.ctx; if (!ctx || ctx.state !== 'running' || stats.muted) return;
    const len = 3 + rnd() * 2.5, n = Math.ceil(len * ctx.sampleRate), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < n; i++) { b = b * 0.985 + (rnd() * 2 - 1) * 0.015; d[i] = b * 6; }
    const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime + 0.02;
    src.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 420 + rnd() * 260;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + len * 0.45); g.gain.linearRampToValueAtTime(0, t + len);
    src.connect(lp); lp.connect(g); g.connect(amb); src.start(t);
    stats.gusts++;
  }
  return {
    stats, unlock,
    flap(a) { const o = typeof a === 'number' ? { size: a, up: true } : a; stats.flapsAsked++; if (sfx.flap(o)) stats.flaps++; },
    walked(dist, surface) {
      if (dist < lastStepAt) lastStepAt = dist;
      if (dist - lastStepAt < 1.55) return;
      lastStepAt = dist; foot ^= 1;
      if (sfx.step({ surface, foot })) stats.steps++;
    },
    update(dt, speaking) {
      const ctx = sfx.ctx; if (!ctx || !amb) return;
      const want = stats.muted ? 0 : speaking ? 0.16 : 1;
      if (want !== duckTo) { duckTo = want; sfx.chain.master.gain.setTargetAtTime(BASE() * want, ctx.currentTime, want < 1 ? 0.12 : 0.6); }
      stats.duck += (want - stats.duck) * (1 - Math.exp(-dt / (want < 1 ? 0.12 : 0.6)));
      if (birds && (nextChirp -= dt) <= 0) { nextChirp = 4 + rnd() * 8; if (!speaking) chirp(); }
      if ((nextGust -= dt) <= 0) { nextGust = 11 + rnd() * 12; if (!speaking) gust(); }
    },
    wave(gain = 0.05) {
      const ctx = sfx.ctx; if (!ctx || ctx.state !== 'running' || stats.muted || !amb) return;
      const len = 2.6 + rnd() * 0.8, n = Math.ceil(len * ctx.sampleRate), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      let b = 0; for (let i = 0; i < n; i++) { b = b * 0.96 + (rnd() * 2 - 1) * 0.04; d[i] = b * 3; }
      const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime + 0.02;
      src.buffer = buf; lp.type = 'lowpass'; lp.frequency.setValueAtTime(380, t); lp.frequency.linearRampToValueAtTime(1100, t + len * 0.55); lp.frequency.linearRampToValueAtTime(420, t + len);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + len * 0.55); g.gain.linearRampToValueAtTime(0, t + len);
      src.connect(lp); lp.connect(g); g.connect(amb); src.start(t); stats.waves = (stats.waves || 0) + 1;
    },
    gull() {
      const ctx = sfx.ctx; if (!ctx || ctx.state !== 'running' || stats.muted || !amb) return;
      const t0 = ctx.currentTime + 0.02;
      for (let i = 0; i < 2 + Math.floor(rnd() * 2); i++) {
        const o = ctx.createOscillator(), g = ctx.createGain(), t = t0 + i * 0.34, f = 1250 + rnd() * 250;
        o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 1.18, t + 0.07); o.frequency.exponentialRampToValueAtTime(f * 0.72, t + 0.27);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.014, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0004, t + 0.28);
        o.connect(g); g.connect(amb); o.start(t); o.stop(t + 0.32);
      }
      stats.gulls = (stats.gulls || 0) + 1;
    },
    motor(dt, speed, steer, throttle = false) {
      const ctx = sfx.ctx; if (!ctx || ctx.state !== 'running' || stats.muted || !amb) return;
      const sp = Math.abs(speed);
      if (eng) {
        const t = ctx.currentTime, age = t - eng.born, kick = age < 0.55 ? 0 : Math.max(0, 1 - (age - 0.55) / 0.7) * 0.55;
        rev += ((throttle ? 1 : 0) - rev) * (1 - Math.exp(-dt / (throttle ? 0.25 : 0.5)));
        const f = age < 0.55 ? 34 + age * 20 : 46 + sp * 7.5 + rev * 22 + kick * 60;
        eng.o1.frequency.setTargetAtTime(f, t, 0.05); eng.o2.frequency.setTargetAtTime(f / 2, t, 0.05);
        eng.lp.frequency.setTargetAtTime(240 + sp * 55 + rev * 420 + kick * 500, t, 0.06);
        if (age > 0.6) eng.g.gain.setTargetAtTime(0.01 + rev * 0.009 + Math.min(0.004, sp * 0.0004), t, 0.08);
        eng.chop.frequency.setTargetAtTime(age < 0.55 ? 13 : 22 + sp * 3.5 + rev * 8, t, 0.06);
      }
      hissT -= dt;
      if (hissT <= 0 && sp > 6 && Math.abs(steer) > 0.5) {
        hissT = 0.5; const n = Math.ceil(0.3 * ctx.sampleRate), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * (1 - i / n);
        const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.7; g.gain.value = 0.012; src.connect(bp); bp.connect(g); g.connect(amb); src.start(); stats.hisses = (stats.hisses || 0) + 1;
      }
    },
    setIdle(on) { idleCar = on; engine(on); },
    loadMusic, music(dt, levels) { for (const [name, m] of Object.entries(tracks)) { m.want = levels[name] || 0; playMusic(dt, m); } }, musicState: () => Object.fromEntries(Object.entries(tracks).map(([k, m]) => [k, { loaded: !!m.buf, level: +m.level.toFixed(3) }])),
    thump() { stats.thumps = (stats.thumps || 0) + 1; sfx.flap({ size: 1, up: false }); },
    toggleMute() { stats.muted = !stats.muted; return stats.muted; },
    level() {
      if (!analyser) return null;
      const a = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(a);
      let s = 0, pk = 0; for (const v of a) { s += v * v; pk = Math.max(pk, Math.abs(v)); }
      return { rmsDb: +(10 * Math.log10(s / a.length + 1e-12)).toFixed(1), peakDb: +(20 * Math.log10(pk + 1e-6)).toFixed(1), masterGain: +sfx.chain.master.gain.value.toFixed(3), state: sfx.ctx.state };
    },
  };
}
