import { useMemo } from "react";
import { Check, Pencil, Trash2, ZoomIn } from "lucide-react";
import { type VisualPage, type VisualType } from "../../lib/visualPages";
import { VisualPageEditor } from "./visual/VisualPageEditor";
import { VisualPageView } from "./visual/VisualPageView";
import { VisualTypePicker } from "./visual/VisualTypePicker";
import { clipSm } from "./styles";

const fieldText = "text-slate-200 placeholder:text-slate-500";

const actionBtn =
  "px-3 py-1.5 text-[10px] font-mono tracking-wider transition-colors";

interface RecordBackPanelProps {
  visual: VisualPage | null;
  isLocked: boolean;
  isEditing: boolean;
  onPickType: (type: VisualType) => void;
  onVisualChange: (page: VisualPage) => void;
  onRemoveVisual: () => void;
  onEdit: () => void;
  onDoneEdit: () => void;
  onZoom: () => void;
}

export function RecordBackPanel({
  visual,
  isLocked,
  isEditing,
  onPickType,
  onVisualChange,
  onRemoveVisual,
  onEdit,
  onDoneEdit,
  onZoom,
}: RecordBackPanelProps) {
  const diagramTitle = visual?.diagramTitle ?? "";
  const hasContent = Boolean(visual?.sourceText.trim());
  const canZoom = Boolean(visual && hasContent && !isEditing);

  const displayDiagramTitle = useMemo(
    () => diagramTitle.trim() || "Diagram center title",
    [diagramTitle]
  );

  if (!visual) {
    return (
      <div className="flex flex-col min-h-[280px]">
        {isLocked ? (
          <p className="text-xs font-mono text-slate-500">No diagram on this record.</p>
        ) : (
          <VisualTypePicker onPick={onPickType} onCancel={() => {}} hideCancel />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 min-h-[280px]">
      <input
        type="text"
        value={diagramTitle}
        onChange={(e) => onVisualChange({ ...visual, diagramTitle: e.target.value })}
        disabled={isLocked}
        placeholder="Center title…"
        aria-label="Diagram center title"
        className={`w-full px-0 py-1 text-sm font-mono bg-transparent border-0 border-b border-slate-700 focus:outline-none focus:border-cyan-500/50 ${fieldText}`}
      />

      {isEditing ? (
        <VisualPageEditor
          page={visual}
          diagramTitle={displayDiagramTitle}
          isLocked={isLocked}
          onChange={onVisualChange}
          embedded
        />
      ) : (
        <div className="flex-1 overflow-auto min-h-[220px] py-2">
          <VisualPageView page={visual} diagramTitle={displayDiagramTitle} isLocked={isLocked} embedded />
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-slate-800/60">
        {isEditing ? (
          !isLocked && (
            <button
              type="button"
              onClick={onDoneEdit}
              className={`${actionBtn} flex items-center gap-1.5 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-950/40`}
              style={{ clipPath: clipSm }}
            >
              <Check className="w-3.5 h-3.5" />
              DONE
            </button>
          )
        ) : (
          <>
            {!isLocked && (
              <button
                type="button"
                onClick={onEdit}
                className={`${actionBtn} flex items-center gap-1.5 text-cyan-200 border border-cyan-500/35 hover:bg-cyan-950/40`}
                style={{ clipPath: clipSm }}
              >
                <Pencil className="w-3.5 h-3.5" />
                EDIT
              </button>
            )}
            {canZoom && (
              <button
                type="button"
                onClick={onZoom}
                className={`${actionBtn} flex items-center gap-1.5 text-cyan-200/90 border border-cyan-500/25 hover:bg-cyan-950/30`}
                style={{ clipPath: clipSm }}
              >
                <ZoomIn className="w-3.5 h-3.5" />
                ZOOM
              </button>
            )}
            {!isLocked && (
              <button
                type="button"
                onClick={onRemoveVisual}
                className={`${actionBtn} flex items-center gap-1.5 text-red-400/90 border-0 hover:text-red-300`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                REMOVE
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
