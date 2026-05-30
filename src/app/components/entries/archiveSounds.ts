const STORAGE_KEY = "mindful_archive_sounds";

let audioCtx: AudioContext | null = null;

export function getArchiveSoundsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setArchiveSoundsEnabled(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function ctx(): AudioContext | null {
  if (!getArchiveSoundsEnabled()) return null;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(frequency: number, duration: number, type: OscillatorType = "sine", gain = 0.08) {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

export function playDoorOpenSound() {
  tone(120, 0.12, "square", 0.04);
  window.setTimeout(() => tone(220, 0.18, "sine", 0.06), 60);
}

export function playDoorCloseSound() {
  tone(180, 0.08, "square", 0.05);
  window.setTimeout(() => tone(90, 0.22, "triangle", 0.07), 40);
}
