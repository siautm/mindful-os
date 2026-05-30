import { motion } from "motion/react";

export function ScanAnimation() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
      <div className="relative p-12">
        <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-cyan-400" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-cyan-400" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-cyan-400" />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-cyan-400 text-sm font-mono mb-6 text-center tracking-widest flex items-center justify-center gap-2"
        >
          <div
            className="w-2 h-2 bg-cyan-400 animate-pulse"
            style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
          />
          SCANNING RECORD
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              >
                .
              </motion.span>
            ))}
          </div>
        </motion.div>

        <div className="relative w-80">
          <div
            className="h-1 bg-cyan-900/30 overflow-hidden"
            style={{ clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)" }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(34,211,238,0.8)]"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
