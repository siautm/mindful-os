import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { LogOut } from "lucide-react";
import { clipSm } from "./styles";

export function QuitEntriesButton() {
  const navigate = useNavigate();

  return (
    <motion.button
      type="button"
      onClick={() => navigate("/")}
      className="fixed top-4 left-4 z-[45] flex items-center gap-2 px-4 py-2.5 bg-gray-900/85 text-cyan-300 border border-cyan-400/40 backdrop-blur-md shadow-lg hover:bg-gray-900 hover:border-cyan-400/70 hover:text-white transition-colors font-mono text-[11px] tracking-widest"
      style={{ clipPath: clipSm, top: "max(1rem, env(safe-area-inset-top))", left: "max(1rem, env(safe-area-inset-left))" }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 }}
    >
      <LogOut className="w-4 h-4" />
      QUIT
    </motion.button>
  );
}
