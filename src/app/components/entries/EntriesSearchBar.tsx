import { motion, AnimatePresence } from "motion/react";
import { Search, X } from "lucide-react";
import { clipSm } from "./styles";

interface EntriesSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  matchCount: number;
  totalCount: number;
}

export function EntriesSearchBar({ value, onChange, matchCount, totalCount }: EntriesSearchBarProps) {
  const focused = value.length > 0;
  const searching = value.trim().length > 0;

  return (
    <div className="relative mb-4 group/search">
      <motion.div
        className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-10"
        animate={{ scale: searching ? 1.08 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <Search className={`w-4 h-4 transition-colors duration-300 ${searching ? "text-teal-500" : "text-slate-400"}`} />
        <div className="w-px h-4 bg-teal-400/25" />
      </motion.div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="SEARCH RECORDS..."
        className="w-full pl-14 pr-24 py-3.5 border border-slate-200/90 bg-white/70 backdrop-blur-sm focus:outline-none focus:border-teal-400 focus:bg-white focus:shadow-[0_0_28px_rgba(20,184,166,0.14)] transition-all duration-300 font-mono text-sm placeholder:text-slate-400 text-slate-800"
        style={{ clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)" }}
      />

      {/* Scan sweep on focus / typing */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden rounded-sm"
        style={{ clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)" }}
      >
        <motion.div
          className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-teal-400/25 to-transparent"
          initial={{ left: "-6rem" }}
          animate={searching ? { left: ["-6rem", "100%"] } : { left: "-6rem" }}
          transition={searching ? { duration: 1.2, repeat: Infinity, ease: "linear", repeatDelay: 0.8 } : {}}
        />
      </motion.div>

      <motion.div
        className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-teal-500 via-teal-300 to-transparent pointer-events-none"
        initial={false}
        animate={{ width: focused ? "100%" : "5rem" }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />

      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
        <AnimatePresence mode="wait">
          {searching && (
            <motion.span
              key="count"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="text-[10px] font-mono text-teal-700 bg-teal-50 border border-teal-200/80 px-2 py-0.5 tabular-nums"
              style={{ clipPath: clipSm }}
            >
              {matchCount}/{totalCount}
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {value && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => onChange("")}
              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
