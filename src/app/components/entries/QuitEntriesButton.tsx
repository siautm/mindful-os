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
      className="fixed z-[45] flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 text-teal-200 border border-teal-500/35 backdrop-blur-md shadow-lg hover:bg-slate-900 hover:border-teal-400/60 hover:text-white transition-colors font-mono text-[11px] tracking-widest disabled:opacity-50"
      style={{
        clipPath: clipSm,
        top: "max(1rem, env(safe-area-inset-top))",
        left: "max(1rem, env(safe-area-inset-left))",
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 28 }}
    >
      <LogOut className="w-4 h-4" />
      QUIT
    </motion.button>
  );
}
