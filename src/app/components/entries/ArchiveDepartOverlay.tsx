import { motion } from "motion/react";

/** Brief HUD wipe when leaving main app for /entries */
export function ArchiveDepartOverlay() {
  return (
    <motion.div
      className="fixed inset-0 z-[200] pointer-events-none bg-slate-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 via-transparent to-teal-500/10" />
      <motion.div
        className="absolute left-0 right-0 top-1/2 h-px bg-cyan-400/60"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-mono text-cyan-400/80 tracking-[0.35em]">
        ARCHIVE LINK ESTABLISHED
      </p>
    </motion.div>
  );
}
