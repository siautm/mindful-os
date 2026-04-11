import type { NoiseType } from "./whiteNoise";

/**
 * Local looping videos in `public/wallpaper/` (served at `/wallpaper/…`).
 */
function wallpaperUrl(file: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}wallpaper/${file}`;
}

/** Pick a clip yourself, or keep wallpaper in sync with ambient sound. */
export const FOCUS_WALLPAPER_MATCH_SOUND = "match" as const;

export const FOCUS_LIVE_WALLPAPER_OPTIONS = [
  {
    id: "aquarium",
    file: "aquarium.mp4",
    labelEn: "Aquarium",
    labelZh: "水族馆",
    fallbackNoise: "ocean" as const,
  },
  {
    id: "beach",
    file: "beach.mp4",
    labelEn: "Beach",
    labelZh: "海滩",
    fallbackNoise: "pink" as const,
  },
  {
    id: "cherry-grove",
    file: "cherry-grove.mp4",
    labelEn: "Cherry grove",
    labelZh: "樱花林",
    fallbackNoise: "forest" as const,
  },
  {
    id: "deserts",
    file: "deserts.mp4",
    labelEn: "Desert",
    labelZh: "沙漠",
    fallbackNoise: "brown" as const,
  },
  {
    id: "falling-snow",
    file: "falling-snow.mp4",
    labelEn: "Falling snow",
    labelZh: "飘雪",
    fallbackNoise: "white" as const,
  },
  {
    id: "farm-morning",
    file: "farm-morning.mp4",
    labelEn: "Farm morning",
    labelZh: "农场清晨",
    fallbackNoise: "wind" as const,
  },
  {
    id: "fireplace",
    file: "fireplace.mp4",
    labelEn: "Fireplace",
    labelZh: "壁炉",
    fallbackNoise: "fireplace" as const,
  },
  {
    id: "glowing-caves",
    file: "glowing-caves.mp4",
    labelEn: "Glowing caves",
    labelZh: "荧光洞穴",
    fallbackNoise: "library" as const,
  },
  {
    id: "rainy-swamp",
    file: "rainy-swamp.mp4",
    labelEn: "Rainy swamp",
    labelZh: "雨中的沼泽",
    fallbackNoise: "rain" as const,
  },
  {
    id: "mc-farm",
    file: "minecraft-sunset-farm.3840x2160.mp4",
    labelEn: "Sunset farm (blocky)",
    labelZh: "方块日落农场",
    fallbackNoise: "cafe" as const,
  },
  {
    id: "mc-campfire",
    file: "minecraft-snowy-campfire.3840x2160.mp4",
    labelEn: "Snowy campfire (blocky)",
    labelZh: "方块雪夜篝火",
    fallbackNoise: "fireplace" as const,
  },
  {
    id: "mc-aurora",
    file: "minecraft-northern-light.3840x2160.mp4",
    labelEn: "Northern lights (blocky)",
    labelZh: "方块极光",
    fallbackNoise: "crickets" as const,
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
  white: wallpaperUrl("falling-snow.mp4"),
  pink: wallpaperUrl("beach.mp4"),
  brown: wallpaperUrl("deserts.mp4"),
  rain: wallpaperUrl("rainy-swamp.mp4"),
  thunderstorm: wallpaperUrl("rainy-swamp.mp4"),
  ocean: wallpaperUrl("aquarium.mp4"),
  waterfall: wallpaperUrl("rainy-swamp.mp4"),
  forest: wallpaperUrl("cherry-grove.mp4"),
  cafe: wallpaperUrl("minecraft-sunset-farm.3840x2160.mp4"),
  library: wallpaperUrl("glowing-caves.mp4"),
  fireplace: wallpaperUrl("fireplace.mp4"),
  crickets: wallpaperUrl("minecraft-northern-light.3840x2160.mp4"),
  train: wallpaperUrl("deserts.mp4"),
  wind: wallpaperUrl("farm-morning.mp4"),
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
