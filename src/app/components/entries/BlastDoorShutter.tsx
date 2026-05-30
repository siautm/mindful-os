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
  const [seam, setSeam] = useState<"hidden" | "unlock" | "lock">("hidden");
  const [shake, setShake] = useState(false);
  /** Doors visually open (off-screen); overlay must stay mounted for close animation */
  const [doorsParted, setDoorsParted] = useState(false);

  useEffect(() => {
    const wasOpen = prevOpen.current;
    prevOpen.current = isOpen;

    if (isOpen && !wasOpen) {
      setSeam("hidden");
      setDoorsParted(false);
      const tPart = window.setTimeout(() => {
        setDoorsParted(true);
        setSeam("hidden");
      }, BLAST_OPEN_MS);
      const tDone = window.setTimeout(() => onOpenComplete?.(), BLAST_OPEN_MS + 80);
      return () => {
        window.clearTimeout(tPart);
        window.clearTimeout(tDone);
      };
    }

    if (!isOpen && wasOpen) {
      setSeam("lock");
      setShake(true);
      setDoorsParted(false);
      const tDone = window.setTimeout(() => {
        setShake(false);
        onCloseComplete?.();
      }, BLAST_CLOSE_MS + 80);
      return () => window.clearTimeout(tDone);
    }

    return undefined;
  }, [isOpen, onOpenComplete, onCloseComplete]);

  const leftX = doorsParted ? "-100%" : "0%";
  const rightX = doorsParted ? "100%" : "0%";
  const doorTransition = doorsParted
    ? `transform ${BLAST_OPEN_MS}ms cubic-bezier(0.77, 0, 0.175, 1)`
    : `transform ${BLAST_CLOSE_MS}ms cubic-bezier(0.6, -0.28, 0.735, 0.045)`;

  const blocksPointer = !doorsParted;

  return (
    <motion.div
      className="fixed inset-0 z-[100]"
      style={{ pointerEvents: blocksPointer ? "auto" : "none" }}
      animate={shake ? { x: [0, -5, 5, -4, 4, -2, 0] } : { x: 0 }}
      transition={{ duration: 0.35 }}
    >
      {seam === "lock" && !doorsParted && (
        <div className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2 z-30 bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.9)] transition-opacity duration-150" />
      )}

      <div className="absolute inset-0 flex overflow-hidden">
        <div
          className="h-full w-1/2 will-change-transform"
          style={{ transform: `translateX(${leftX})`, transition: doorTransition }}
        >
          <DoorPanel side="left" />
        </div>
        <div
          className="h-full w-1/2 will-change-transform"
          style={{ transform: `translateX(${rightX})`, transition: doorTransition }}
        >
          <DoorPanel side="right" />
        </div>
      </div>
    </motion.div>
  );
}
