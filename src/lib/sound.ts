let audioContext: AudioContext | null = null;

function context(): AudioContext {
  audioContext ??= new AudioContext();
  return audioContext;
}

export function playTinyChime(variant = 0): void {
  const ctx = context();
  const now = ctx.currentTime;
  const notes = variant % 2 === 0 ? [523.25, 659.25, 783.99] : [659.25, 587.33, 880];

  notes.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = index === 2 ? 'sine' : 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now + index * 0.055);
    gain.gain.linearRampToValueAtTime(0.055, now + index * 0.055 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.055 + 0.2);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(now + index * 0.055);
    oscillator.stop(now + index * 0.055 + 0.22);
  });
}
