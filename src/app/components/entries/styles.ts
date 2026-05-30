/** Sci-fi HUD clip paths */
export const clipSm = "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)";
export const clipMd = "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)";
export const clipLg =
  "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)";
export const clipXl =
  "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)";

/** Teal + slate palette (closer to MindOS, less neon cyan) */
export const locked = {
  cardBg: "bg-white",
  cardBorder: "border-amber-400/60 group-hover:border-amber-500/90",
  tracer: "from-amber-400",
  corner: "bg-amber-400/10 group-hover:bg-amber-400/18",
  tag: "bg-amber-50 text-amber-900 border-amber-300/50",
  title: "text-slate-900",
  badge: "border border-amber-400/60 text-amber-800 bg-amber-50/90",
  accent: "teal",
} as const;

export const active = {
  cardBg: "bg-white",
  cardBorder: "border-slate-200/80 group-hover:border-teal-400/70",
  tracer: "from-teal-400",
  corner: "bg-teal-400/10 group-hover:bg-teal-400/18",
  tag: "bg-teal-50 text-teal-800 border-teal-200/80",
  title: "text-slate-900",
  accent: "teal",
} as const;
