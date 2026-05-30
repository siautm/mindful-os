import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { clipSm } from "./styles";

interface RecordViewerPagerProps {
  pageIndex: number;
  totalPages: number;
  pageLabels: string[];
  onPageChange: (index: number) => void;
  onAddVisual: () => void;
  canAddVisual: boolean;
}

export function RecordViewerPager({
  pageIndex,
  totalPages,
  pageLabels,
  onPageChange,
  onAddVisual,
  canAddVisual,
}: RecordViewerPagerProps) {
  return (
    <div className="shrink-0 border-t border-cyan-500/20 px-4 py-3 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pageIndex <= 0}
          onClick={() => onPageChange(pageIndex - 1)}
          className="p-1.5 border border-slate-700 text-cyan-400 disabled:opacity-30"
          style={{ clipPath: clipSm }}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-mono text-slate-400 tabular-nums">
          {pageIndex + 1} / {totalPages}
        </span>
        <button
          type="button"
          disabled={pageIndex >= totalPages - 1}
          onClick={() => onPageChange(pageIndex + 1)}
          className="p-1.5 border border-slate-700 text-cyan-400 disabled:opacity-30"
          style={{ clipPath: clipSm }}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1 max-w-[55%] justify-end">
        {pageLabels.map((label, i) => (
          <button
            key={`${label}-${i}`}
            type="button"
            onClick={() => onPageChange(i)}
            className={`px-2 py-0.5 text-[8px] font-mono tracking-wider border transition-colors ${
              i === pageIndex
                ? "bg-cyan-600/35 border-cyan-400/50 text-cyan-100"
                : "border-slate-800 text-slate-600 hover:text-cyan-400"
            }`}
            style={{ clipPath: clipSm }}
          >
            {label}
          </button>
        ))}
      </div>

      {canAddVisual && (
        <button
          type="button"
          onClick={onAddVisual}
          className="flex items-center gap-1 px-3 py-1.5 text-[9px] font-mono tracking-wider border border-teal-500/40 text-teal-300 hover:bg-teal-950/50"
          style={{ clipPath: clipSm }}
        >
          <Plus className="w-3.5 h-3.5" />
          ADD VISUAL
        </button>
      )}
    </div>
  );
}
