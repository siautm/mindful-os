import type { NoiseType } from "./whiteNoise";

/**
 * Mixkit stock video clip IDs → fullscreen loop in focus view.
 * License: https://mixkit.co/license/#videoFree (free for commercial & personal use).
 * Stream URL pattern documented by Mixkit player: /videos/{id}/{id}-720.mp4
 */
export const FOCUS_WALLPAPER_MIXKIT_ID: Record<NoiseType, number | null> = {
  none: null,
  white: 106, // water ripples — abstract, neutral
  pink: 1751, // rain in fountain — soft motion
  brown: 570, // water among rocks — deep, warm tones
  rain: 2846, // rain on window
  thunderstorm: 4422, // night storm sky
  ocean: 1164, // gentle waves
  waterfall: 2213, // forest waterfall
  forest: 6890, // tropical forest rain
  cafe: 4809, // office / collaborative space (café chatter vibe)
  library: 3148, // calm abstract loop (ID verified 200; swap via PR if you prefer another clip)
  fireplace: 5101, // warm fire / embers-style loop (Mixkit ID)
  crickets: 3149, // night / low-light loop
  train: 3152, // urban motion / travel feel
  wind: 118, // cloudy sky time-lapse
};

export function mixkitVideoUrl(id: number): string {
  return `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`;
}

export function mixkitPosterUrl(id: number): string {
  return `https://assets.mixkit.co/videos/${id}/${id}-thumb-720-0.jpg`;
}

/** CSS-only fallback if video fails to load (network/CORS) — not the old “aurora” orbs. */
export const FOCUS_WALLPAPER_FALLBACK: Record<
  NoiseType,
  { base: string; a: string; b: string; speed: number }
> = {
  none: { base: "bg-slate-950", a: "bg-slate-600/25", b: "bg-indigo-900/20", speed: 30 },
  white: { base: "bg-zinc-950", a: "bg-zinc-400/20", b: "bg-slate-300/15", speed: 12 },
  pink: { base: "bg-rose-950", a: "bg-pink-500/20", b: "bg-fuchsia-600/15", speed: 18 },
  brown: { base: "bg-stone-950", a: "bg-amber-900/25", b: "bg-orange-950/30", speed: 22 },
  rain: { base: "bg-slate-950", a: "bg-blue-600/25", b: "bg-cyan-900/20", speed: 14 },
  thunderstorm: { base: "bg-indigo-950", a: "bg-violet-900/30", b: "bg-slate-900/40", speed: 20 },
  ocean: { base: "bg-blue-950", a: "bg-cyan-500/25", b: "bg-teal-900/25", speed: 24 },
  waterfall: { base: "bg-emerald-950", a: "bg-teal-600/25", b: "bg-cyan-800/20", speed: 16 },
  forest: { base: "bg-green-950", a: "bg-emerald-700/25", b: "bg-lime-900/15", speed: 26 },
  cafe: { base: "bg-amber-950", a: "bg-amber-600/20", b: "bg-orange-900/25", speed: 18 },
  library: { base: "bg-amber-950", a: "bg-amber-800/20", b: "bg-stone-800/30", speed: 32 },
  fireplace: { base: "bg-red-950", a: "bg-orange-600/30", b: "bg-amber-500/25", speed: 10 },
  crickets: { base: "bg-indigo-950", a: "bg-violet-800/20", b: "bg-blue-950/40", speed: 28 },
  train: { base: "bg-neutral-950", a: "bg-slate-600/25", b: "bg-zinc-700/20", speed: 14 },
  wind: { base: "bg-sky-950", a: "bg-slate-400/20", b: "bg-blue-900/25", speed: 22 },
};
