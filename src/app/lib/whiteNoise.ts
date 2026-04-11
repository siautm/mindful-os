// White Noise & Ambient Sound Player
// Loads real previews from backend route /api/sounds (Freesound-powered).
// Falls back to short procedural loops only if the backend/API fetch fails.

import { fetchFreesoundBufferForNoiseType } from "./freesoundAudio";
import { fetchLocalFocusMusicBuffer } from "./focusMusic";

/** Ambient keys used by Freesound API, procedural fallback, wallpaper mood, and `music/<core>.*` filenames. */
export const CORE_NOISE_TYPES = [
  "white",
  "pink",
  "brown",
  "rain",
  "thunderstorm",
  "ocean",
  "waterfall",
  "forest",
  "cafe",
  "library",
  "fireplace",
  "crickets",
  "train",
  "wind",
] as const;

export type CoreNoiseType = (typeof CORE_NOISE_TYPES)[number];

export type LocalNoiseType = `local-${CoreNoiseType}`;

export type NoiseType = "none" | CoreNoiseType | LocalNoiseType;

const CORE_SET = new Set<string>(CORE_NOISE_TYPES);

export function stripToCoreNoiseType(type: NoiseType): CoreNoiseType | "none" {
  if (type === "none") return "none";
  if (type.startsWith("local-")) {
    const core = type.slice(6);
    return CORE_SET.has(core) ? (core as CoreNoiseType) : "none";
  }
  return CORE_SET.has(type) ? (type as CoreNoiseType) : "none";
}

export function isLocalNoiseVariant(type: NoiseType): boolean {
  return type.startsWith("local-");
}

/** Accepts persisted `mindful_focus_noise_type` and unknown strings. */
export function parseStoredNoiseType(raw: string): NoiseType {
  if (raw === "none") return "none";
  if (CORE_SET.has(raw)) return raw as CoreNoiseType;
  if (raw.startsWith("local-") && CORE_SET.has(raw.slice(6))) return raw as LocalNoiseType;
  return "none";
}

const LOCAL_FILE_HINT = "music/<type>.mp3…；若无文件则用在线预览 / 合成";

const CORE_UI: Record<CoreNoiseType, { label: string; emoji: string; description: string }> = {
  white: { label: "White Noise", emoji: "📻", description: "Static sound" },
  pink: { label: "Pink Noise", emoji: "🌸", description: "Balanced smooth" },
  brown: { label: "Brown Noise", emoji: "🟤", description: "Deep & warm" },
  rain: { label: "Rain on Window", emoji: "🌧️", description: "Soft & cozy" },
  thunderstorm: { label: "Distant Thunder", emoji: "⛈️", description: "Calming rumble" },
  ocean: { label: "Ocean Waves", emoji: "🌊", description: "Rhythmic & peaceful" },
  waterfall: { label: "Waterfall", emoji: "💧", description: "Steady natural" },
  forest: { label: "Forest Wind", emoji: "🌲", description: "Leaves rustling" },
  cafe: { label: "Cafe Ambience", emoji: "☕", description: "Light chatter" },
  library: { label: "Library Quiet", emoji: "📖", description: "Subtle movement" },
  fireplace: { label: "Fireplace Crackle", emoji: "🔥", description: "Warm & cozy" },
  crickets: { label: "Night Crickets", emoji: "🦗", description: "Evening peace" },
  train: { label: "Train Ride", emoji: "🚆", description: "Gentle motion" },
  wind: { label: "Soft Wind", emoji: "💨", description: "Gentle breeze" },
};

export const noiseCategories: Record<
  string,
  readonly { value: NoiseType; label: string; emoji: string; description?: string }[]
> = {
  "Basic Noise": [
    { value: "none", label: "None (Silent)", emoji: "🔇" },
    { value: "white", label: CORE_UI.white.label, emoji: CORE_UI.white.emoji, description: CORE_UI.white.description },
    { value: "pink", label: CORE_UI.pink.label, emoji: CORE_UI.pink.emoji, description: CORE_UI.pink.description },
    { value: "brown", label: CORE_UI.brown.label, emoji: CORE_UI.brown.emoji, description: CORE_UI.brown.description },
  ],
  "Relaxing & Sleep 🌧️": [
    { value: "rain", label: CORE_UI.rain.label, emoji: CORE_UI.rain.emoji, description: CORE_UI.rain.description },
    { value: "thunderstorm", label: CORE_UI.thunderstorm.label, emoji: CORE_UI.thunderstorm.emoji, description: CORE_UI.thunderstorm.description },
    { value: "ocean", label: CORE_UI.ocean.label, emoji: CORE_UI.ocean.emoji, description: CORE_UI.ocean.description },
    { value: "waterfall", label: CORE_UI.waterfall.label, emoji: CORE_UI.waterfall.emoji, description: CORE_UI.waterfall.description },
    { value: "forest", label: CORE_UI.forest.label, emoji: CORE_UI.forest.emoji, description: CORE_UI.forest.description },
  ],
  "Focus & Study 📚": [
    { value: "cafe", label: CORE_UI.cafe.label, emoji: CORE_UI.cafe.emoji, description: CORE_UI.cafe.description },
    { value: "library", label: CORE_UI.library.label, emoji: CORE_UI.library.emoji, description: CORE_UI.library.description },
  ],
  "Cozy & Healing 🌙": [
    { value: "fireplace", label: CORE_UI.fireplace.label, emoji: CORE_UI.fireplace.emoji, description: CORE_UI.fireplace.description },
    { value: "crickets", label: CORE_UI.crickets.label, emoji: CORE_UI.crickets.emoji, description: CORE_UI.crickets.description },
    { value: "train", label: CORE_UI.train.label, emoji: CORE_UI.train.emoji, description: CORE_UI.train.description },
    { value: "wind", label: CORE_UI.wind.label, emoji: CORE_UI.wind.emoji, description: CORE_UI.wind.description },
  ],
  "Local music (music/)": CORE_NOISE_TYPES.map((core) => {
    const ui = CORE_UI[core];
    return {
      value: `local-${core}` as NoiseType,
      label: `${ui.label}（本地）`,
      emoji: ui.emoji,
      description: LOCAL_FILE_HINT,
    };
  }),
};

class WhiteNoisePlayer {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private currentType: NoiseType = "none";
  private isPlaying = false;
  private bufferCache: Map<NoiseType, AudioBuffer> = new Map();
  /** Bumps when stopping or starting new playback, so in-flight loads do not attach old buffers. */
  private playRequestId = 0;
  private visibilityResumeAttached = false;

  private getAudioContext(): AudioContext | null {
    if (!this.audioContext && typeof window !== "undefined") {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error("Failed to create AudioContext:", error);
        return null;
      }
    }
    return this.audioContext;
  }

  /** Keeps looping ambient going after tab focus / AudioContext suspend. */
  private attachVisibilityResume(ctx: AudioContext): void {
    if (this.visibilityResumeAttached || typeof document === "undefined") return;
    this.visibilityResumeAttached = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.isPlaying && ctx.state === "suspended") {
        void ctx.resume().catch(() => {});
      }
    });
  }

  private generateRain(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    
    let hiss = 0;
    for (let i = 0; i < bufferSize; i++) {
      hiss = hiss * 0.98 + (Math.random() * 2 - 1) * 0.02;
      let sample = hiss * 0.3;
      
      if (Math.random() > 0.992) {
        const dropIntensity = Math.random() * 0.8 + 0.2;
        sample += (Math.random() - 0.5) * dropIntensity;
      }
      
      data[i] = sample;
    }
    return data;
  }

  private generateThunderstorm(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    
    let brownBase = 0;
    let rumblePhase = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      
      brownBase = brownBase * 0.97 + (Math.random() * 2 - 1) * 0.03;
      let sample = brownBase * 0.4;
      
      if (Math.random() > 0.985) {
        sample += (Math.random() - 0.5) * 0.9;
      }
      
      rumblePhase += 0.05;
      if (Math.sin(rumblePhase) > 0.95) {
        const rumble = Math.sin(2 * Math.PI * 60 * t) * 0.3 * Math.exp(-((i % (sampleRate * 2)) / sampleRate));
        sample += rumble;
      }
      
      data[i] = sample;
    }
    return data;
  }

  private generateOcean(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      
      const waveCycle1 = Math.sin(2 * Math.PI * 0.15 * t);
      const waveCycle2 = Math.sin(2 * Math.PI * 0.11 * t + 1.5);
      
      const waveEnvelope = Math.max(0, waveCycle1);
      const waveNoise = (Math.random() * 2 - 1) * waveEnvelope * 0.4;
      const retreatNoise = (Math.random() * 2 - 1) * (1 - waveEnvelope) * 0.15;
      
      data[i] = waveCycle1 * 0.3 + waveCycle2 * 0.2 + waveNoise + retreatNoise;
    }
    return data;
  }

  private generateWaterfall(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    
    let rushBase = 0;
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      
      rushBase = rushBase * 0.85 + (Math.random() * 2 - 1) * 0.15;
      const flowVariation = Math.sin(2 * Math.PI * 0.3 * t) * 0.2;
      
      data[i] = (rushBase + flowVariation) * 0.7;
    }
    return data;
  }

  private generateForest(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    
    let windBase = 0;
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      
      windBase = windBase * 0.995 + (Math.random() * 2 - 1) * 0.005;
      
      const gustCycle = Math.sin(2 * Math.PI * 0.08 * t);
      const gust = windBase * gustCycle * 0.3;
      
      let rustle = 0;
      if (Math.random() > 0.996) {
        rustle = (Math.random() - 0.5) * 0.4;
      }
      
      data[i] = (windBase * 0.4 + gust + rustle);
    }
    return data;
  }

  private generateCafe(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    
    let murmurBase = 0;
    let chatterPhase = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      
      murmurBase = murmurBase * 0.98 + (Math.random() * 2 - 1) * 0.02;
      
      chatterPhase += 0.1;
      const chatterLevel = (Math.sin(chatterPhase) + 1) * 0.5;
      
      let sample = murmurBase * 0.3 * chatterLevel;
      
      if (Math.random() > 0.9992) {
        const clinkFreq = 800 + Math.random() * 1200;
        const clinkDecay = Math.exp(-((i % 500) / 100));
        sample += Math.sin(2 * Math.PI * clinkFreq * t) * 0.3 * clinkDecay;
      }
      
      if (Math.random() > 0.9997) {
        sample += (Math.random() - 0.5) * 0.2;
      }
      
      data[i] = sample;
    }
    return data;
  }

  private generateLibrary(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    
    for (let i = 0; i < bufferSize; i++) {
      let sample = (Math.random() * 2 - 1) * 0.05;
      
      if (Math.random() > 0.9995) {
        sample += (Math.random() - 0.5) * 0.15;
      }
      
      if (Math.random() > 0.9998) {
        sample += (Math.random() - 0.5) * 0.1;
      }
      
      data[i] = sample;
    }
    return data;
  }

  private generateFireplace(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    
    let fireBase = 0;
    let crackleEnergy = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      fireBase = fireBase * 0.95 + (Math.random() * 2 - 1) * 0.05;
      let sample = fireBase * 0.25;
      
      if (Math.random() > 0.993) {
        crackleEnergy = Math.random() * 0.8;
      }
      crackleEnergy *= 0.95;
      
      if (crackleEnergy > 0.1) {
        const crackle = (Math.random() * 2 - 1) * crackleEnergy;
        sample += crackle;
      }
      
      data[i] = sample;
    }
    return data;
  }

  private generateCrickets(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    
    const cricket1Phase = { pos: 0, rate: 4.2, freq: 4500 };
    const cricket2Phase = { pos: 0, rate: 3.8, freq: 4200 };
    const cricket3Phase = { pos: 0, rate: 5.1, freq: 4800 };
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      let sample = 0;
      
      cricket1Phase.pos += cricket1Phase.rate / sampleRate;
      if (Math.sin(2 * Math.PI * cricket1Phase.pos) > 0.7) {
        sample += Math.sin(2 * Math.PI * cricket1Phase.freq * t) * 0.15;
      }
      
      cricket2Phase.pos += cricket2Phase.rate / sampleRate;
      if (Math.sin(2 * Math.PI * cricket2Phase.pos + 1) > 0.7) {
        sample += Math.sin(2 * Math.PI * cricket2Phase.freq * t) * 0.12;
      }
      
      cricket3Phase.pos += cricket3Phase.rate / sampleRate;
      if (Math.sin(2 * Math.PI * cricket3Phase.pos + 2) > 0.7) {
        sample += Math.sin(2 * Math.PI * cricket3Phase.freq * t) * 0.1;
      }
      
      sample += (Math.random() * 2 - 1) * 0.03;
      
      data[i] = sample;
    }
    return data;
  }

  private generateTrain(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    
    let rumble = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      
      rumble = rumble * 0.92 + (Math.random() * 2 - 1) * 0.08;
      const engineHum = Math.sin(2 * Math.PI * 55 * t) * 0.2;
      
      let sample = rumble * 0.3 + engineHum;
      
      const clickRate = 2.5;
      const clickCycle = Math.sin(2 * Math.PI * clickRate * t);
      if (clickCycle > 0.95) {
        const click = (Math.random() - 0.5) * 0.3;
        sample += click;
      }
      
      data[i] = sample;
    }
    return data;
  }

  private generateWind(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    
    let windBase = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      
      windBase = windBase * 0.997 + (Math.random() * 2 - 1) * 0.003;
      
      const gustCycle1 = Math.sin(2 * Math.PI * 0.1 * t);
      const gustCycle2 = Math.sin(2 * Math.PI * 0.07 * t + 2);
      const gustIntensity = (gustCycle1 + gustCycle2) * 0.25;
      
      data[i] = windBase * 0.5 + gustIntensity;
    }
    return data;
  }

  private generateWhiteNoise(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return data;
  }

  private generatePinkNoise(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return data;
  }

  private generateBrownNoise(sampleRate: number, duration: number): Float32Array {
    const bufferSize = sampleRate * duration;
    const data = new Float32Array(bufferSize);
    let lastOut = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
    return data;
  }

  private createNoiseBufferCore(core: CoreNoiseType): AudioBuffer | null {
    const ctx = this.getAudioContext();
    if (!ctx) return null;

    if (this.bufferCache.has(core)) {
      return this.bufferCache.get(core)!;
    }

    const duration = 4;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const channelData = buffer.getChannelData(0);
    let generatedData: Float32Array;

    switch (core) {
      case "white":
        generatedData = this.generateWhiteNoise(sampleRate, duration);
        break;
      case "pink":
        generatedData = this.generatePinkNoise(sampleRate, duration);
        break;
      case "brown":
        generatedData = this.generateBrownNoise(sampleRate, duration);
        break;
      case "rain":
        generatedData = this.generateRain(sampleRate, duration);
        break;
      case "thunderstorm":
        generatedData = this.generateThunderstorm(sampleRate, duration);
        break;
      case "ocean":
        generatedData = this.generateOcean(sampleRate, duration);
        break;
      case "waterfall":
        generatedData = this.generateWaterfall(sampleRate, duration);
        break;
      case "forest":
        generatedData = this.generateForest(sampleRate, duration);
        break;
      case "cafe":
        generatedData = this.generateCafe(sampleRate, duration);
        break;
      case "library":
        generatedData = this.generateLibrary(sampleRate, duration);
        break;
      case "fireplace":
        generatedData = this.generateFireplace(sampleRate, duration);
        break;
      case "crickets":
        generatedData = this.generateCrickets(sampleRate, duration);
        break;
      case "train":
        generatedData = this.generateTrain(sampleRate, duration);
        break;
      case "wind":
        generatedData = this.generateWind(sampleRate, duration);
        break;
      default:
        return null;
    }

    channelData.set(generatedData);
    this.bufferCache.set(core, buffer);

    return buffer;
  }

  async play(type: NoiseType = "white", volume: number = 0.3) {
    if (type === "none") {
      this.stop();
      return;
    }

    if (this.isPlaying && this.currentType === type) {
      this.setVolume(volume);
      return;
    }

    const ctx = this.getAudioContext();
    if (!ctx) {
      console.error("AudioContext not available");
      return;
    }

    const myId = ++this.playRequestId;
    this.cleanupNodes();
    this.isPlaying = false;
    this.currentType = "none";

    const core = stripToCoreNoiseType(type);
    if (core === "none") {
      return;
    }

    const localFirst = isLocalNoiseVariant(type);

    try {
      if (ctx.state === "suspended") {
        ctx.resume().catch(err => console.error("Failed to resume AudioContext:", err));
      }

      let buffer: AudioBuffer | null = null;

      if (localFirst) {
        if (this.bufferCache.has(type)) {
          buffer = this.bufferCache.get(type)!;
        } else {
          buffer = await fetchLocalFocusMusicBuffer(ctx, core, undefined);
          if (myId !== this.playRequestId) return;
          if (buffer) {
            this.bufferCache.set(type, buffer);
          }
        }
      }

      if (!buffer) {
        if (this.bufferCache.has(core)) {
          buffer = this.bufferCache.get(core)!;
        } else {
          buffer = await fetchFreesoundBufferForNoiseType(ctx, core, undefined);
          if (myId !== this.playRequestId) return;
          if (buffer) {
            this.bufferCache.set(core, buffer);
          }
        }
      }

      if (!buffer) {
        buffer = this.createNoiseBufferCore(core);
      }

      if (myId !== this.playRequestId) return;

      if (!buffer) {
        console.error(`Failed to create buffer for type: ${type}`);
        return;
      }

      this.sourceNode = ctx.createBufferSource();
      this.sourceNode.buffer = buffer;
      this.sourceNode.loop = true;
      const dur = buffer.duration;
      if (dur > 0 && Number.isFinite(dur)) {
        this.sourceNode.loopStart = 0;
        this.sourceNode.loopEnd = dur;
      }

      this.gainNode = ctx.createGain();
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));

      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(ctx.destination);

      this.attachVisibilityResume(ctx);

      this.sourceNode.start(0);
      this.isPlaying = true;
      this.currentType = type;

    } catch (error) {
      console.error("Error playing noise:", error);
      this.cleanupNodes();
    }
  }

  private cleanupNodes() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {
        // Already stopped
      }
      try {
        this.sourceNode.disconnect();
      } catch (e) {
        // Already disconnected
      }
      this.sourceNode = null;
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (e) {
        // Already disconnected
      }
      this.gainNode = null;
    }
  }

  stop() {
    this.playRequestId++;
    this.cleanupNodes();
    this.isPlaying = false;
    this.currentType = "none";
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentType(): NoiseType {
    return this.currentType;
  }
}

// Singleton instance
let whiteNoisePlayerInstance: WhiteNoisePlayer | null = null;

export function getWhiteNoisePlayer(): WhiteNoisePlayer {
  if (!whiteNoisePlayerInstance) {
    whiteNoisePlayerInstance = new WhiteNoisePlayer();
  }
  return whiteNoisePlayerInstance;
}
