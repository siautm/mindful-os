import { motion } from "motion/react";
import type { FocusAmbientPreset } from "../lib/storage";

const PRESET_STYLES: Record<
  FocusAmbientPreset,
  { base: string; blobs: [string, string, string]; mesh: string }
> = {
  aurora: {
    base: "from-slate-950 via-teal-950 to-emerald-950",
    blobs: [
      "bg-teal-500/25 blur-[100px]",
      "bg-cyan-400/20 blur-[120px]",
      "bg-violet-600/20 blur-[90px]",
    ],
    mesh: "from-transparent via-teal-500/10 to-transparent",
  },
  ocean: {
    base: "from-slate-950 via-blue-950 to-cyan-950",
    blobs: [
      "bg-sky-500/30 blur-[110px]",
      "bg-blue-600/25 blur-[100px]",
      "bg-cyan-300/15 blur-[130px]",
    ],
    mesh: "from-transparent via-sky-400/10 to-transparent",
  },
  lavender: {
    base: "from-slate-950 via-violet-950 to-fuchsia-950",
    blobs: [
      "bg-violet-500/25 blur-[100px]",
      "bg-fuchsia-500/20 blur-[110px]",
      "bg-indigo-400/15 blur-[95px]",
    ],
    mesh: "from-transparent via-violet-400/10 to-transparent",
  },
  dawn: {
    base: "from-slate-950 via-rose-950 to-amber-950",
    blobs: [
      "bg-rose-400/20 blur-[105px]",
      "bg-amber-400/18 blur-[115px]",
      "bg-orange-500/15 blur-[85px]",
    ],
    mesh: "from-transparent via-rose-300/10 to-transparent",
  },
};

interface FocusAmbientBackgroundProps {
  preset: FocusAmbientPreset;
}

/**
 * Soft, slow-moving gradients and light orbs — no external video/CDN; easy on the eyes for long focus sessions.
 */
export function FocusAmbientBackground({ preset }: FocusAmbientBackgroundProps) {
  const cfg = PRESET_STYLES[preset];

  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${cfg.base}`}>
      <div
        className={`absolute inset-0 opacity-40 bg-gradient-to-tr ${cfg.mesh}`}
        aria-hidden
      />

      {[
        { className: cfg.blobs[0], x: "10%", y: "20%", dur: 22, dx: [0, 8, -5, 0], dy: [0, -12, 6, 0] },
        { className: cfg.blobs[1], x: "60%", y: "55%", dur: 28, dx: [0, -10, 6, 0], dy: [0, 8, -10, 0] },
        { className: cfg.blobs[2], x: "35%", y: "75%", dur: 25, dx: [0, 12, -8, 0], dy: [0, -6, 10, 0] },
      ].map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${b.className}`}
          style={{
            width: "min(55vw, 420px)",
            height: "min(55vw, 420px)",
            left: b.x,
            top: b.y,
            translateX: "-50%",
            translateY: "-50%",
          }}
          animate={{ x: b.dx, y: b.dy }}
          transition={{
            duration: b.dur,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.45)_100%)]"
        aria-hidden
      />
    </div>
  );
}

export const FOCUS_AMBIENT_LABELS: Record<FocusAmbientPreset, string> = {
  aurora: "Aurora calm",
  ocean: "Ocean depth",
  lavender: "Lavender mist",
  dawn: "Soft dawn",
};
