import { useMemo } from "react";
import { Pencil } from "lucide-react";
import { parseVisualInput, VISUAL_TYPE_LABELS, type VisualPage } from "../../../lib/visualPages";
import { VisualDiagram } from "./VisualDiagram";
import { clipSm } from "../styles";

interface VisualPageViewProps {
  page: VisualPage;
  diagramTitle: string;
  isLocked: boolean;
  onEdit: () => void;
}

export function VisualPageView({ page, diagramTitle, isLocked, onEdit }: VisualPageViewProps) {
  const center = diagramTitle.trim() || "Untitled";
  const parsed = useMemo(
    () => parseVisualInput(page.type, page.sourceText, center),
    [page.type, page.sourceText, center]
  );

  const isEmpty = !page.sourceText.trim();

  return (
    <div className="flex flex-col h-full min-h-[min(60vh,480px)]">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-[10px] font-mono text-cyan-500 tracking-widest">
          {VISUAL_TYPE_LABELS[page.type]}
        </span>
        {!isLocked && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wider border border-cyan-500/40 text-cyan-200 hover:bg-cyan-950/50"
            style={{ clipPath: clipSm }}
          >
            <Pencil className="w-3.5 h-3.5" />
            EDIT
          </button>
        )}
      </div>

      <div
        className="flex-1 flex items-center justify-center border border-cyan-500/20 bg-slate-950/50 overflow-auto min-h-[280px]"
        style={{ clipPath: clipSm }}
      >
        {isEmpty ? (
          <div className="text-center p-8 space-y-3">
            <p className="text-slate-500 text-xs font-mono">No diagram yet</p>
            {!isLocked && (
              <button
                type="button"
                onClick={onEdit}
                className="px-4 py-2 text-[10px] font-mono tracking-wider border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40"
                style={{ clipPath: clipSm }}
              >
                ADD CONTENT
              </button>
            )}
          </div>
        ) : (
          <VisualDiagram parsed={parsed} className="w-full" />
        )}
      </div>
    </div>
  );
}
