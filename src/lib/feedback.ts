import { getSettings } from "./storage";

let ctx: AudioContext | null = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
function knock(freq: number, dur: number, gain: number, delay = 0) {
  const c = ac();
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 5);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 4;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(c.currentTime + delay);
}
function tone(freq: number, delay: number, dur: number, gain = 0.12) {
  const c = ac(); const t = c.currentTime + delay;
  const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = freq;
  const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
}

export type Fx = "move" | "capture" | "check" | "win" | "lose" | "draw";
export function feedback(kind: Fx) {
  const s = getSettings();
  if (s.sound) {
    try {
      if (kind === "move") knock(900, 0.09, 1.4);
      if (kind === "capture") { knock(500, 0.12, 1.8); knock(1100, 0.06, 0.8, 0.04); }
      if (kind === "check") { knock(900, 0.09, 1.4); tone(880, 0.05, 0.18); tone(1175, 0.15, 0.25); }
      if (kind === "win") [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.5, 0.14));
      if (kind === "lose") [392, 330, 262].forEach((f, i) => tone(f, i * 0.18, 0.5, 0.12));
      if (kind === "draw") [523, 523].forEach((f, i) => tone(f, i * 0.2, 0.35, 0.1));
    } catch { /* audio unavailable */ }
  }
  if (s.haptics && "vibrate" in navigator) {
    const p = { move: 12, capture: [18, 30, 18], check: [25, 40, 25], win: [40, 60, 40, 60, 80], lose: 120, draw: [30, 50, 30] }[kind];
    try { navigator.vibrate(p); } catch { /* ignore */ }
  }
}

export async function celebrate() {
  const confetti = (await import("canvas-confetti")).default;
  const colors = ["#f0c46a", "#e7a63a", "#fff3d6", "#5aa9d6"];
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors });
  setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 }, colors }), 250);
  setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 }, colors }), 400);
}
