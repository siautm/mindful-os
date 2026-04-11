import type { NoiseType } from "./whiteNoise";

const EXTENSIONS = ["mp3", "ogg", "m4a", "opus", "wav", "webm"] as const;

/**
 * Loads optional local focus tracks from `public/music/` or repo-root `music/` (dev/build via Vite plugin).
 * File names match ambient keys, e.g. `rain.mp3`, `ocean.m4a`.
 */
export async function fetchLocalFocusMusicBuffer(
  ctx: AudioContext,
  type: NoiseType,
  signal?: AbortSignal
): Promise<AudioBuffer | null> {
  if (type === "none") return null;
  const base = import.meta.env.BASE_URL;
  for (const ext of EXTENSIONS) {
    const url = `${base}music/${type}.${ext}`;
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) continue;
      const arr = await res.arrayBuffer();
      if (arr.byteLength === 0) continue;
      return await ctx.decodeAudioData(arr.slice(0));
    } catch {
      continue;
    }
  }
  return null;
}
