import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BLAST_CLOSE_MS, BLAST_OPEN_MS } from "./styles";

interface BlastDoorShutterProps {
  isOpen: boolean;
  onOpenComplete?: () => void;
  onCloseComplete?: () => void;
}

function DoorPanel({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <div className="absolute inset-0">
      <div
        className={`absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${
          isLeft ? "border-r border-cyan-500/35" : "border-l border-cyan-500/35"
        }`}
      >
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              ${isLeft ? "135deg" : "-135deg"},
              transparent,
              transparent 10px,
              rgba(34, 211, 238, 0.45) 10px,
              rgba(34, 211, 238, 0.45) 12px
            )`,
          }}
        />
        <div className="absolute top-10 left-5 right-5 font-mono text-[9px] text-cyan-500/45 tracking-[0.25em]">
          <div>SECTOR-{isLeft ? "AX" : "BX"} · BLAST {isLeft ? "L-01" : "R-01"}</div>
          <div className="mt-2 h-px bg-gradient-to-r from-cyan-500/40 to-transparent" />
        </div>
        <div className="absolute bottom-16 left-5 font-mono text-[8px] text-slate-600 tracking-[0.35em]">
          MINDOS ARCHIVE
        </div>
      </div>
    </div>
  );
}

export function BlastDoorShutter({ isOpen, onOpenComplete, onCloseComplete }: BlastDoorShutterProps) {
  const prevOpen = useRef(isOpen);
  const [seam, setSeam] = useState<"standby" | "unlock" | "open" | "lock">("standby");
  const [shake, setShake] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const wasOpen = prevOpen.current;
    prevOpen.current = isOpen;

    if (isOpen && !wasOpen) {
      setHidden(false);
      setSeam("unlock");
      const tUnlock = window.setTimeout(() => setSeam("open"), 100);
      const tDone = window.setTimeout(() => {
        setHidden(true);
        onOpenComplete?.();
      }, BLAST_OPEN_MS + 50);
      return () => {
        window.clearTimeout(tUnlock);
        window.clearTimeout(tDone);
      };
    }

    if (!isOpen && wasOpen) {
      setHidden(false);
      setSeam("lock");
      setShake(true);
      const tDone = window.setTimeout(() => {
        setShake(false);
        onCloseComplete?.();
      }, BLAST_CLOSE_MS);
      return () => window.clearTimeout(tDone);
    }

    return undefined;
  }, [isOpen, onOpenComplete, onCloseComplete]);

  if (hidden) return null;

  const leftX = isOpen ? "-100%" : "0%";
  const rightX = isOpen ? "100%" : "0%";
  const doorTransition = isOpen
    ? `transform ${BLAST_OPEN_MS}ms cubic-bezier(0.77, 0, 0.175, 1)`
    : `transform ${BLAST_CLOSE_MS}ms cubic-bezier(0.6, -0.28, 0.735, 0.045)`;

  return (
    <motion.div
      className="fixed inset-0 z-[100]"
      animate={shake ? { x: [0, -4, 4, -3, 3, -1, 0] } : { x: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div
        className={`absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2 z-30 transition-colors duration-200 ${
          seam === "unlock"
            ? "bg-cyan-400 shadow-[0_0_24px_rgba(34,211,238,1)]"
            : seam === "lock"
              ? "bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.9)]"
              : "bg-orange-600/90 shadow-[0_0_10px_rgba(234,88,12,0.6)]"
        }`}
      />

      <div className="absolute inset-0 flex overflow-hidden">
        <div className="h-full w-1/2" style={{ transform: `translateX(${leftX})`, transition: doorTransition }}>
          <DoorPanel side="left" />
        </div>
        <div className="h-full w-1/2" style={{ transform: `translateX(${rightX})`, transition: doorTransition }}>
          <DoorPanel side="right" />
        </div>
      </div>
    </motion.div>
  );
}
