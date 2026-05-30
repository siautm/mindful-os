import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { clipMd } from "./styles";

interface CreateRecordButtonProps {
  onClick: () => void;
}

export function CreateRecordButton({ onClick }: CreateRecordButtonProps) {
  return (
    <div className="fixed bottom-8 right-8 z-40 pb-[env(safe-area-inset-bottom)]">
      <motion.button
        type="button"
        onClick={onClick}
        className="relative w-16 h-16 bg-teal-600 text-white shadow-lg shadow-teal-500/25 hover:bg-teal-500 flex items-center justify-center group overflow-hidden"
        style={{ clipPath: clipMd }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-300 to-transparent" />
          <div className="absolute top-0 right-0 w-0.5 h-full bg-gradient-to-b from-cyan-300 to-transparent" />
          <div className="absolute bottom-0 right-0 w-full h-0.5 bg-gradient-to-l from-cyan-300 to-transparent" />
          <div className="absolute bottom-0 left-0 w-0.5 h-full bg-gradient-to-t from-cyan-300 to-transparent" />
        </div>
        <Plus className="w-8 h-8 relative z-10" />
        <motion.div
          className="absolute inset-0 bg-cyan-400"
          animate={{ opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute -top-14 right-0 bg-gray-900/90 text-white text-[10px] px-3 py-2 font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
          style={{ clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)" }}
        >
          CREATE NEW RECORD
        </motion.div>
      </motion.button>
    </div>
  );
}
