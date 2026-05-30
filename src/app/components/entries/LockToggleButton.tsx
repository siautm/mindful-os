import { AnimatePresence, motion } from "motion/react";
import { Lock, LockOpen } from "lucide-react";
import { clipSm } from "./styles";

interface LockToggleButtonProps {
  isLocked: boolean;
  className: string;
  iconClassName?: string;
  onClick: (e: React.MouseEvent) => void;
}

/** Animated lock / unlock control for cards and viewer. */
export function LockToggleButton({
  isLocked,
  className,
  iconClassName = "w-3.5 h-3.5",
  onClick,
}: LockToggleButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
      style={{ clipPath: clipSm }}
      whileTap={{ scale: 0.88 }}
      aria-label={isLocked ? "Unlock record" : "Lock record"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isLocked ? "locked" : "unlocked"}
          className="relative z-10 inline-flex items-center justify-center"
          initial={{ opacity: 0, rotate: -48, scale: 0.45 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 48, scale: 0.45 }}
          transition={{ type: "spring", stiffness: 520, damping: 26 }}
        >
          {isLocked ? <Lock className={iconClassName} /> : <LockOpen className={iconClassName} />}
        </motion.span>
      </AnimatePresence>
      <motion.span
        className="absolute inset-0 border border-slate-300/50 pointer-events-none"
        initial={false}
        animate={
          isLocked
            ? { opacity: [0.7, 0], scale: [0.85, 1.35] }
            : { opacity: [0.5, 0], scale: [1, 1.25] }
        }
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={{ clipPath: clipSm }}
      />
    </motion.button>
  );
}
