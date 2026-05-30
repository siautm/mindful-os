/** Sci-fi HUD clip paths */
export const clipSm = "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)";
export const clipMd = "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)";
export const clipLg =
  "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)";
export const clipXl =
  "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)";

/** Locked: cold metal seal — slate / silver only (no violet, no zinc) */
export const locked = {
  cardBg: "bg-gradient-to-br from-slate-900 via-slate-800/80 to-slate-900",
  cardBorder: "border-slate-500/55 group-hover:border-slate-400/70",
  tracer: "from-slate-400",
  corner: "bg-slate-400/12 group-hover:bg-slate-400/20",
  tag: "bg-slate-800/90 text-slate-300 border-slate-600/50",
  title: "text-slate-100",
  badge:
    "border border-slate-500/60 text-slate-200 bg-slate-800/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
  id: "text-slate-400",
  lockBtn: "bg-slate-600/25 hover:bg-slate-500/35 text-slate-300",
  chevron: "text-slate-400",
  bars: "bg-slate-400/35 group-hover:bg-slate-400/55",
  thumbFrame: "border-slate-600/45 bg-slate-800/70",
  thumbIcon: "text-slate-500/90",
  modalBorder: "border-slate-500/50",
  headerBorder: "border-slate-600/30 bg-gradient-to-r from-slate-800/55 to-transparent",
  accentBar: "bg-slate-400",
  accentText: "text-slate-500",
  accentLabel: "text-slate-400/85",
  inputDisabled: "border-slate-600/40 bg-slate-900/50",
  inputDisabledValue: "border-slate-600/35 bg-slate-950/40",
  lockHover: "hover:bg-slate-600/20 text-slate-300",
  innerHover: "group-hover:border-slate-500/35",
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
  thumbFrame: "border-cyan-500/25 bg-cyan-950/35",
  thumbIcon: "text-cyan-500/45",
  innerHover: "group-hover:border-cyan-400/25",
} as const;

export const BLAST_OPEN_MS = 820;
export const BLAST_CLOSE_MS = 580;
