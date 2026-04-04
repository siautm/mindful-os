import type { NoiseType } from "./whiteNoise";

/**
 * Local looping videos in `public/live-wallpaper/` (served at `/live-wallpaper/…`).
 */
function wallpaperUrl(file: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}live-wallpaper/${file}`;
}

/** Pick a clip yourself, or keep wallpaper in sync with ambient sound. */
export const FOCUS_WALLPAPER_MATCH_SOUND = "match" as const;

export const FOCUS_LIVE_WALLPAPER_OPTIONS = [
  {
    id: "grass-wind",
    file: "field-grass-in-the-wind.1920x1080.mp4",
    labelEn: "Grass in the wind",
    labelZh: "风中草地",
    fallbackNoise: "wind" as const,
  },
  {
    id: "water-lilies",
    file: "yellow-water-lilies.3840x2160.mp4",
    labelEn: "Water lilies",
    labelZh: "睡莲池塘",
    fallbackNoise: "pink" as const,
  },
  {
    id: "sunset-rain",
    file: "blurred-sunset-while-raining.3840x2160.mp4",
    labelEn: "Sunset in the rain",
    labelZh: "雨中暮色",
    fallbackNoise: "brown" as const,
  },
  {
    id: "rainy-pine",
    file: "rainy-pine-forest.1920x1080.mp4",
    labelEn: "Rainy pine forest",
    labelZh: "雨中松林",
    fallbackNoise: "rain" as const,
  },
  {
    id: "mountain-rain",
    file: "mountain-rain-landscape.3840x2160.mp4",
    labelEn: "Mountain rain",
    labelZh: "山间雨景",
    fallbackNoise: "thunderstorm" as const,
  },
  {
    id: "waves",
    file: "wave-symphony.1920x1080.mp4",
    labelEn: "Ocean waves",
    labelZh: "海浪",
    fallbackNoise: "ocean" as const,
  },
  {
    id: "river",
    file: "river-flowing.3840x2160.mp4",
    labelEn: "Flowing river",
    labelZh: "河流",
    fallbackNoise: "waterfall" as const,
  },
  {
    id: "rainy-forest",
    file: "rainy-forest.3840x2160.mp4",
    labelEn: "Rainy forest",
    labelZh: "雨林",
    fallbackNoise: "forest" as const,
  },
  {
    id: "mc-farm",
    file: "minecraft-sunset-farm.3840x2160.mp4",
    labelEn: "Sunset farm (blocky)",
    labelZh: "方块日落农场",
    fallbackNoise: "cafe" as const,
  },
  {
    id: "mc-nature",
    file: "nature-in-minecraft.3840x2160.mp4",
    labelEn: "Calm blocky nature",
    labelZh: "方块自然",
    fallbackNoise: "library" as const,
  },
  {
    id: "mc-campfire",
    file: "minecraft-snowy-campfire.3840x2160.mp4",
    labelEn: "Snowy campfire",
    labelZh: "雪夜篝火",
    fallbackNoise: "fireplace" as const,
  },
  {
    id: "mc-aurora",
    file: "minecraft-northern-light.3840x2160.mp4",
    labelEn: "Northern lights",
    labelZh: "极光夜空",
    fallbackNoise: "crickets" as const,
  },
  {
    id: "railway",
    file: "abandoned-railway-station.1920x1080.mp4",
    labelEn: "Abandoned railway",
    labelZh: "旧车站",
    fallbackNoise: "train" as const,
  },
] as const;

export type FocusWallpaperId = (typeof FOCUS_LIVE_WALLPAPER_OPTIONS)[number]["id"];

export type FocusWallpaperChoice = typeof FOCUS_WALLPAPER_MATCH_SOUND | FocusWallpaperId;

const OPTION_BY_ID = Object.fromEntries(
  FOCUS_LIVE_WALLPAPER_OPTIONS.map((o) => [o.id, o])
) as Record<FocusWallpaperId, (typeof FOCUS_LIVE_WALLPAPER_OPTIONS)[number]>;

export function normalizeFocusWallpaperChoice(raw: unknown): FocusWallpaperChoice {
  if (raw === FOCUS_WALLPAPER_MATCH_SOUND) return FOCUS_WALLPAPER_MATCH_SOUND;
  if (typeof raw === "string" && raw in OPTION_BY_ID) return raw as FocusWallpaperId;
  return FOCUS_WALLPAPER_MATCH_SOUND;
}

export function resolveFocusWallpaperSrc(
  choice: FocusWallpaperChoice,
  noiseType: NoiseType
): string | null {
  if (choice === FOCUS_WALLPAPER_MATCH_SOUND) {
    return FOCUS_WALLPAPER_VIDEO[noiseType];
  }
  const opt = OPTION_BY_ID[choice];
  return opt ? wallpaperUrl(opt.file) : FOCUS_WALLPAPER_VIDEO[noiseType];
}

/** Gradient fallback uses the mood tied to the clip (or current sound in match mode). */
export function resolveFocusWallpaperFallbackNoise(
  choice: FocusWallpaperChoice,
  noiseType: NoiseType
): NoiseType {
  if (choice === FOCUS_WALLPAPER_MATCH_SOUND) return noiseType;
  return OPTION_BY_ID[choice]?.fallbackNoise ?? noiseType;
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
