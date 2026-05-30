import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X } from "lucide-react";
import { clipSm } from "./styles";

interface EntriesSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  matchCount: number;
  totalCount: number;
  /** Trigger shake + flash when true */
  noResults: boolean;
}

export function EntriesSearchBar({
  value,
  onChange,
  matchCount,
  totalCount,
  noResults,
}: EntriesSearchBarProps) {
  const searching = value.trim().length > 0;
  const prevNoResults = useRef(false);
  const shakeKey = useRef(0);

  useEffect(() => {
    if (noResults && !prevNoResults.current) {
      shakeKey.current += 1;
    }
    prevNoResults.current = noResults;
  }, [noResults]);

  return (
    <div className="relative mb-2">
      <motion.div
        key={shakeKey.current}
        className="relative group/search"
        initial={false}
        animate={
          noResults
            ? {
                x: [0, -6, 6, -4, 4, -2, 2, 0],
                borderColor: [
                  "rgba(34, 211, 238, 0.35)",
                  "rgba(249, 115, 22, 1)",
                  "rgba(239, 68, 68, 0.9)",
                  "rgba(249, 115, 22, 1)",
                  "rgba(239, 68, 68, 0.8)",
                  "rgba(249, 115, 22, 0.7)",
                  "rgba(34, 211, 238, 0.4)",
                ],
              }
            : { x: 0 }
        }
        transition={
          noResults
            ? { x: { duration: 0.38 }, borderColor: { duration: 0.9 } }
            : { duration: 0.2 }
        }
        style={{ clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)" }}
      >
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-10">
          <motion.div animate={{ color: noResults ? "#f97316" : "#22d3ee" }} transition={{ duration: 0.15 }}>
            <Search className="w-4 h-4" />
          </motion.div>
          <div className="w-px h-4 bg-cyan-500/25" />
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="SEARCH RECORDS..."
          className={`w-full pl-14 pr-24 py-3.5 border bg-slate-900/60 backdrop-blur-sm focus:outline-none font-mono text-sm text-slate-100 placeholder:text-slate-500 transition-shadow duration-300 ${
            noResults
              ? "border-orange-500/80 shadow-[0_0_20px_rgba(249,115,22,0.25)]"
              : "border-cyan-500/30 focus:border-cyan-400 focus:shadow-[0_0_24px_rgba(34,211,238,0.15)]"
          }`}
          style={{ clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)" }}
        />

        {!noResults && searching && (
          <motion.div
            className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent pointer-events-none"
            animate={{ left: ["-5rem", "100%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
          />
        )}

        <motion.div
          className={`absolute bottom-0 left-0 h-[2px] pointer-events-none ${
            noResults
              ? "bg-gradient-to-r from-orange-500 via-red-500 to-transparent"
              : "bg-gradient-to-r from-cyan-400 via-teal-400 to-transparent"
          }`}
          initial={false}
          animate={{ width: value ? "100%" : "5rem" }}
          transition={{ duration: 0.35 }}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
          {searching && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 tabular-nums border ${
                noResults
                  ? "text-orange-300 bg-orange-950/60 border-orange-500/50"
                  : "text-cyan-300 bg-cyan-950/50 border-cyan-500/40"
              }`}
              style={{ clipPath: clipSm }}
            >
              {matchCount}/{totalCount}
            </span>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {noResults && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-[10px] font-mono text-orange-400/90 tracking-widest pl-1"
          >
            [ SYSTEM ERROR: NO DATA FOUND IN SECTOR ]
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
