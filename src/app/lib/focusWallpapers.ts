import type { NoiseType } from "./whiteNoise";

/**
 * Local looping videos in `public/live-wallpaper/` (served at `/live-wallpaper/…`).
 * Each ambient sound maps to a clip from your bundled library.
 */
function wallpaperUrl(file: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}live-wallpaper/${file}`;
}

export const FOCUS_WALLPAPER_VIDEO: Record<NoiseType, string | null> = {
  none: null,
  white: wallpaperUrl("field-grass-in-the-wind.1920x1080.mp4"),
  pink: wallpaperUrl("yellow-water-lilies.3840x2160.mp4"),
  brown: wallpaperUrl("blurred-sunset-while-raining.3840x2160.mp4"),
  rain: wallpaperUrl("rainy-pine-forest.1920x1080.mp4"),
  thunderstorm: wallpaperUrl("mountain-rain-landscape.3840x2160.mp4"),
  ocean: wallpaperUrl("wave-symphony.1920x1080.mp4"),
  waterfall: wallpaperUrl("river-flowing.3840x2160.mp4"),
  forest: wallpaperUrl("rainy-forest.3840x2160.mp4"),
  cafe: wallpaperUrl("minecraft-sunset-farm.3840x2160.mp4"),
  library: wallpaperUrl("nature-in-minecraft.3840x2160.mp4"),
  fireplace: wallpaperUrl("minecraft-snowy-campfire.3840x2160.mp4"),
  crickets: wallpaperUrl("minecraft-northern-light.3840x2160.mp4"),
  train: wallpaperUrl("abandoned-railway-station.1920x1080.mp4"),
  wind: wallpaperUrl("field-grass-in-the-wind.1920x1080.mp4"),
};

/** CSS-only fallback if video fails to load. */
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
