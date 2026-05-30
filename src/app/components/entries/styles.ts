/** Sci-fi HUD clip paths (from reference design). */
export const clipSm = "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)";
export const clipMd = "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)";
export const clipLg =
  "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)";
export const clipXl =
  "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)";

/** Locked record: amber border accent only (no red fill). */
export const locked = {
  cardBg: "bg-white/85",
  cardBorder: "border-amber-400/55 group-hover:border-amber-500/80",
  tracer: "from-amber-400",
  corner: "bg-amber-400/8 group-hover:bg-amber-400/15",
  tag: "bg-amber-500/10 text-amber-800 border-amber-400/40",
  title: "text-gray-900",
  badge: "border border-amber-400/50 text-amber-700 bg-amber-50/80",
} as const;

export const active = {
  cardBg: "bg-white/80",
  cardBorder: "border-gray-200/50 group-hover:border-cyan-400/50",
  tracer: "from-cyan-400",
  corner: "bg-cyan-400/10 group-hover:bg-cyan-400/20",
  tag: "bg-cyan-500/10 text-cyan-700 border-cyan-400/30",
  title: "text-gray-900",
} as const;
