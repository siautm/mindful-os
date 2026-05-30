import { motion } from "motion/react";
import { Lock } from "lucide-react";
import type { KnowledgeEntry } from "../../lib/entryTypes";
import { active, clipLg, locked } from "./styles";

interface RecordCardProps {
  entry: KnowledgeEntry;
  onClick: () => void;
}

export function RecordCard({ entry, onClick }: RecordCardProps) {
  const isLocked = entry.isPinned;
  const theme = isLocked ? locked : active;

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`relative backdrop-blur-sm cursor-pointer group overflow-hidden w-full max-w-sm mx-auto border ${theme.cardBg} ${theme.cardBorder}`}
      style={{ clipPath: clipLg }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      <div className="absolute inset-0 opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r ${theme.tracer} via-transparent to-transparent`} />
        <div className={`absolute top-0 right-0 w-px h-full bg-gradient-to-b ${theme.tracer} via-transparent to-transparent`} />
        <div className={`absolute bottom-0 right-0 w-full h-px bg-gradient-to-l ${theme.tracer} via-transparent to-transparent`} />
        <div className={`absolute bottom-0 left-0 w-px h-full bg-gradient-to-t ${theme.tracer} via-transparent to-transparent`} />
      </div>

      <div
        className={`absolute top-0 right-0 w-16 h-16 ${theme.corner} transition-colors pointer-events-none`}
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
      />

      {isLocked && (
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono tracking-wider ${locked.badge}`}
            style={{ clipPath: "polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)" }}
          >
            <Lock className="w-3 h-3" />
            LOCKED
          </div>
        </div>
      )}

      <div className="relative p-5 min-h-[7rem] flex flex-col justify-between" style={{ clipPath: clipLg }}>
        <h3 className={`font-semibold text-base tracking-tight ${theme.title} line-clamp-3 pr-16`}>
          {entry.title}
        </h3>

        {entry.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider border ${theme.tag}`}
                style={{ clipPath: "polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[10px] font-mono text-gray-400/80 tracking-wider">NO TAGS</p>
        )}
      </div>
    </motion.div>
  );
}
