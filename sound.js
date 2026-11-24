import { PaperSound } from 'papercraft/lib/paper-sound.js';

export function createSound({ seed = 7, birds = true } = {}) {
  const sfx = new PaperSound({ volume: 0.5, spacing: 0.42, spacingJitter: 0.15, groupWindow: 0.35 });
  const stats = { steps: 0, flaps: 0, flapsAsked: 0, chirps: 0, gusts: 0, duck: 1, muted: false };
  let putT = 0, hissT = 0, idleCar = false;
  let amb = null, analyser = null, duckTo = 1, nextChirp = 6, nextGust = 9, foot = 0, lastStepAt = 0, rs = seed >>> 0;
  const rnd = () => { rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0; return rs / 4294967296; };
  const BASE = () => 0.855 * 2 * sfx.volume;

  function unlock() {
    const ctx = sfx.unlock();
    if (amb || !ctx) return;
    amb = ctx.createGain(); amb.gain.value = 1;
    analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
    amb.connect(sfx.chain.master); sfx.chain.master.connect(analyser);
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
    motor(dt, speed, steer) {
      const ctx = sfx.ctx; if (!ctx || ctx.state !== 'running' || stats.muted || !amb) return;
      const sp = Math.abs(speed);
      putT -= dt * (3.5 + sp * 0.9);
      if (putT <= 0 && (sp > 0.3 || idleCar)) {
        putT = 1; const t = ctx.currentTime + 0.01, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        o.type = 'triangle'; o.frequency.setValueAtTime(58 + sp * 3 + rnd() * 6, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.07);
        lp.type = 'lowpass'; lp.frequency.value = 320; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.045 + Math.min(0.03, sp * 0.003), t + 0.008); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
        o.connect(lp); lp.connect(g); g.connect(amb); o.start(t); o.stop(t + 0.11); stats.putts = (stats.putts || 0) + 1;
      }
      hissT -= dt;
      if (hissT <= 0 && sp > 6 && Math.abs(steer) > 0.5) {
        hissT = 0.5; const n = Math.ceil(0.3 * ctx.sampleRate), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * (1 - i / n);
        const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.7; g.gain.value = 0.012; src.connect(bp); bp.connect(g); g.connect(amb); src.start(); stats.hisses = (stats.hisses || 0) + 1;
      }
    },
    setIdle(on) { idleCar = on; },
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
