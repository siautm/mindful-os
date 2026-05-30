import { AnimatePresence, motion } from "motion/react";
import { Lock, LockOpen } from "lucide-react";
import { clipSm } from "./styles";

interface LockToggleButtonProps {
  isLocked: boolean;
  className: string;
  iconClassName?: string;
  onClick: (e: React.MouseEvent) => void;
}

/** Fast lock / unlock control */
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
      whileTap={{ scale: 0.92 }}
      aria-label={isLocked ? "Unlock record" : "Lock record"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isLocked ? "locked" : "unlocked"}
          className="relative z-10 inline-flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.75 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.75 }}
          transition={{ duration: 0.1 }}
        >
          {isLocked ? <Lock className={iconClassName} /> : <LockOpen className={iconClassName} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
