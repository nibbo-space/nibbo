export function playAchievementUnlockSound(): void {
  if (typeof window === "undefined") return;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;

  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.11;
  master.connect(ctx.destination);

  const tone = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.32, t0 + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.04);
  };

  tone(523.25, 0, 0.16);
  tone(659.25, 0.1, 0.18);
  tone(783.99, 0.22, 0.26);
  tone(1046.5, 0.34, 0.32);

  window.setTimeout(() => {
    try {
      ctx.close();
    } catch {}
  }, 900);

  void ctx.resume().catch(() => {});
}
