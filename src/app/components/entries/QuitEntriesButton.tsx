import { motion } from "motion/react";
import { LogOut } from "lucide-react";
import { clipSm } from "./styles";

interface QuitEntriesButtonProps {
  onQuit: () => void;
  disabled?: boolean;
}

export function QuitEntriesButton({ onQuit, disabled }: QuitEntriesButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onQuit}
      disabled={disabled}
      className="fixed z-[45] flex items-center gap-2 px-4 py-2.5 bg-slate-950/95 text-cyan-300 border border-cyan-500/40 backdrop-blur-md shadow-lg shadow-cyan-950/50 hover:border-cyan-400/70 hover:text-white transition-colors font-mono text-[11px] tracking-widest disabled:opacity-40"
      style={{
        clipPath: clipSm,
        top: "max(1rem, env(safe-area-inset-top))",
        left: "max(1rem, env(safe-area-inset-left))",
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.9, type: "spring", stiffness: 400, damping: 28 }}
    >
      <LogOut className="w-4 h-4" />
      QUIT
    </motion.button>
  );
}
