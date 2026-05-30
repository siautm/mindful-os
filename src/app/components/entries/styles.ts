/** Sci-fi HUD clip paths */
export const clipSm = "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)";
export const clipMd = "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)";
export const clipLg =
  "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)";
export const clipXl =
  "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)";

/** B · Midnight Archive — slate-950 + cyan/teal accents */
export const midnight = {
  pageBg: "bg-slate-950",
  panel: "bg-slate-900/80 border-cyan-500/20",
  text: "text-slate-100",
  textMuted: "text-slate-400",
  accent: "cyan",
  accentTeal: "teal",
} as const;

/** Locked: amber border only on dark card */
export const locked = {
  cardBg: "bg-slate-900/90",
  cardBorder: "border-amber-500/55 group-hover:border-amber-400/80",
  tracer: "from-amber-400",
  corner: "bg-amber-500/10 group-hover:bg-amber-500/15",
  tag: "bg-amber-950/50 text-amber-200 border-amber-500/40",
  title: "text-slate-100",
  badge: "border border-amber-500/60 text-amber-300 bg-amber-950/80",
  metaKey: "text-amber-500/70",
  metaVal: "text-slate-300",
  id: "text-amber-500",
} as const;

export const active = {
  cardBg: "bg-slate-900/85",
  cardBorder: "border-cyan-500/25 group-hover:border-cyan-400/55",
  tracer: "from-cyan-400",
  corner: "bg-cyan-400/10 group-hover:bg-cyan-400/18",
  tag: "bg-cyan-950/40 text-cyan-200 border-cyan-500/35",
  title: "text-slate-100",
  badge: "",
  metaKey: "text-cyan-500/80",
  metaVal: "text-slate-300",
  id: "text-cyan-400",
} as const;

export const BLAST_OPEN_MS = 820;
export const BLAST_CLOSE_MS = 520;
