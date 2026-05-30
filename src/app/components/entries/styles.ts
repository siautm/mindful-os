/** Sci-fi HUD clip paths */
export const clipSm = "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)";
export const clipMd = "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)";
export const clipLg =
  "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)";
export const clipXl =
  "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)";

/** Locked: violet “sealed” accent — cool, fits midnight archive (not warm amber) */
export const locked = {
  cardBg: "bg-slate-900/90",
  cardBorder: "border-violet-400/50 group-hover:border-violet-300/70",
  tracer: "from-violet-400",
  corner: "bg-violet-500/12 group-hover:bg-violet-500/20",
  tag: "bg-violet-950/50 text-violet-200/90 border-violet-500/40",
  title: "text-slate-100",
  badge: "border border-violet-400/55 text-violet-200 bg-violet-950/80",
  id: "text-violet-400/90",
  lockBtn: "bg-violet-500/20 hover:bg-violet-500/30 text-violet-300",
  chevron: "text-violet-400",
  bars: "bg-violet-400/35 group-hover:bg-violet-400/60",
} as const;

export const active = {
  cardBg: "bg-slate-900/85",
  cardBorder: "border-cyan-500/25 group-hover:border-cyan-400/55",
  tracer: "from-cyan-400",
  corner: "bg-cyan-400/10 group-hover:bg-cyan-400/18",
  tag: "bg-cyan-950/40 text-cyan-200 border-cyan-500/35",
  title: "text-slate-100",
  badge: "",
  id: "text-cyan-400",
  lockBtn: "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400",
  chevron: "text-cyan-500",
  bars: "bg-cyan-400/30 group-hover:bg-cyan-400/60",
} as const;

export const BLAST_OPEN_MS = 820;
export const BLAST_CLOSE_MS = 580;
