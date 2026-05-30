import { useMemo } from "react";
import { Pencil, Trash2, ZoomIn } from "lucide-react";
import { VISUAL_TYPE_LABELS, type VisualPage, type VisualType } from "../../lib/visualPages";
import { VisualPageEditor } from "./visual/VisualPageEditor";
import { VisualPageView } from "./visual/VisualPageView";
import { VisualTypePicker } from "./visual/VisualTypePicker";
import { clipSm } from "./styles";

const fieldText = "text-slate-200 placeholder:text-slate-500";

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
      <div className="flex flex-col min-h-[320px]">
        {isLocked ? (
          <p className="text-xs font-mono text-slate-500">No diagram on this record.</p>
        ) : (
          <VisualTypePicker onPick={onPickType} onCancel={() => {}} hideCancel />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 min-h-[320px]">
      <div>
        <label className="text-[10px] font-mono text-slate-500 tracking-widest block mb-1.5">
          CENTER TITLE
        </label>
        <input
          type="text"
          value={diagramTitle}
          onChange={(e) => onVisualChange({ ...visual, diagramTitle: e.target.value })}
          disabled={isLocked}
          placeholder="Center / root label…"
          className={`w-full px-3 py-2 text-sm font-mono border border-cyan-500/25 bg-slate-950/50 focus:outline-none focus:border-cyan-400 ${fieldText}`}
          style={{ clipPath: clipSm }}
        />
      </div>

      <div className="flex flex-col flex-1 min-h-0 border border-cyan-500/25 bg-slate-950/40">
        <div className="px-3 py-2 border-b border-cyan-500/20 bg-slate-950/60">
          <span className="text-[10px] font-mono text-cyan-500/90 tracking-widest leading-none">
            {VISUAL_TYPE_LABELS[visual.type]}
          </span>
        </div>

        <div className="flex-1 overflow-auto min-h-[260px] p-4">
          {isEditing ? (
            <VisualPageEditor
              page={visual}
              diagramTitle={displayDiagramTitle}
              isLocked={isLocked}
              onChange={onVisualChange}
              onDone={onDoneEdit}
              embedded
            />
          ) : (
            <VisualPageView
              page={visual}
              diagramTitle={displayDiagramTitle}
              isLocked={isLocked}
              embedded
            />
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="flex flex-wrap gap-2 justify-end pt-1">
          {!isLocked && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border border-cyan-500/40 text-cyan-200 hover:bg-cyan-950/50"
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border border-cyan-500/40 text-cyan-200 hover:bg-cyan-950/50"
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border border-red-500/30 text-red-400 hover:bg-red-950/40"
              style={{ clipPath: clipSm }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              REMOVE
            </button>
          )}
        </div>
      )}
    </div>
  );
}
