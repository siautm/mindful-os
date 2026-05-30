import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import type { EntriesSortMode } from "../../lib/entriesSort";
import { clipSm } from "./styles";
import { getArchiveSoundsEnabled, setArchiveSoundsEnabled } from "./archiveSounds";
import { useState } from "react";

interface EntriesToolbarProps {
  sortMode: EntriesSortMode;
  onSortChange: (mode: EntriesSortMode) => void;
  bulkMode: boolean;
  onBulkModeChange: (on: boolean) => void;
  page: number;
  pageCount: number;
  totalFiltered: number;
  onPageChange: (page: number) => void;
}

const SORT_OPTIONS: { value: EntriesSortMode; label: string }[] = [
  { value: "updated", label: "UPDATED" },
  { value: "created", label: "CREATED" },
  { value: "title", label: "TITLE A–Z" },
];

export function EntriesToolbar({
  sortMode,
  onSortChange,
  bulkMode,
  onBulkModeChange,
  page,
  pageCount,
  totalFiltered,
  onPageChange,
}: EntriesToolbarProps) {
  const [soundsOn, setSoundsOn] = useState(getArchiveSoundsEnabled);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[9px] font-mono text-slate-500 tracking-widest">SORT</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSortChange(opt.value)}
            className={`px-2.5 py-1 text-[9px] font-mono tracking-wider border transition-colors ${
              sortMode === opt.value
                ? "bg-cyan-600/30 border-cyan-400/60 text-cyan-200"
                : "border-slate-700 text-slate-500 hover:border-cyan-500/40"
            }`}
            style={{ clipPath: clipSm }}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onBulkModeChange(!bulkMode)}
          className={`px-2.5 py-1 text-[9px] font-mono tracking-wider border transition-colors ${
            bulkMode
              ? "bg-teal-600/25 border-teal-400/50 text-teal-200"
              : "border-slate-700 text-slate-500 hover:border-cyan-500/40"
          }`}
          style={{ clipPath: clipSm }}
        >
          {bulkMode ? "BULK ON" : "BULK SELECT"}
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !soundsOn;
            setSoundsOn(next);
            setArchiveSoundsEnabled(next);
          }}
          className="p-1.5 border border-slate-700 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/40"
          style={{ clipPath: clipSm }}
          aria-label={soundsOn ? "Disable archive sounds" : "Enable archive sounds"}
          title="Blast door sounds"
        >
          {soundsOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      </div>

      {totalFiltered > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 border border-slate-700 disabled:opacity-30 text-cyan-400"
            style={{ clipPath: clipSm }}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-slate-400 tabular-nums">
            {page + 1} / {pageCount} · {totalFiltered}
          </span>
          <button
            type="button"
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 border border-slate-700 disabled:opacity-30 text-cyan-400"
            style={{ clipPath: clipSm }}
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
