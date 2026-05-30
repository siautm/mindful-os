import { useMemo, useState } from "react";
import { Pencil, Trash2, ZoomIn } from "lucide-react";
import {
  VISUAL_TYPE_LABELS,
  type VisualPage,
  type VisualType,
} from "../../lib/visualPages";
import { VisualPageEditor } from "./visual/VisualPageEditor";
import { VisualPageView } from "./visual/VisualPageView";
import { VisualTypePicker } from "./visual/VisualTypePicker";
import { clipSm } from "./styles";

const fieldText = "text-slate-200 placeholder:text-slate-500";

interface RecordBackPanelProps {
  recordTitle: string;
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
  recordTitle,
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

  return (
    <div className="flex flex-col min-h-[min(60vh,520px)]">
      <p className="text-[10px] font-mono text-slate-500 tracking-widest mb-1">RECORD</p>
      <h2 className="text-xl font-semibold text-cyan-100 mb-4 truncate">{recordTitle}</h2>

      {!visual ? (
        <div className="flex-1 flex flex-col">
          <p className="text-[10px] font-mono text-cyan-600 tracking-widest mb-3">SELECT DIAGRAM TYPE</p>
          {isLocked ? (
            <p className="text-xs font-mono text-slate-500">No diagram on this record.</p>
          ) : (
            <VisualTypePicker onPick={onPickType} onCancel={() => {}} hideCancel />
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 space-y-2">
            <label className="text-[10px] font-mono text-slate-500 tracking-widest">
              DIAGRAM CENTER TITLE
            </label>
            <input
              type="text"
              value={diagramTitle}
              onChange={(e) => onVisualChange({ ...visual, diagramTitle: e.target.value })}
              disabled={isLocked}
              placeholder="Center / root label for this map…"
              className={`w-full px-3 py-2 text-sm font-mono border border-cyan-500/30 bg-slate-950/50 focus:outline-none focus:border-cyan-400 ${fieldText}`}
              style={{ clipPath: clipSm }}
            />
            <p className="text-[9px] font-mono text-slate-600">
              Type: {VISUAL_TYPE_LABELS[visual.type]} — not the record card title
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
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
            {!isLocked && !isEditing && (
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

          <div className="flex-1 min-h-0 border border-cyan-500/20 bg-slate-950/40 overflow-hidden" style={{ clipPath: clipSm }}>
            {isEditing ? (
              <div className="p-4 h-full overflow-auto">
                <VisualPageEditor
                  page={visual}
                  diagramTitle={displayDiagramTitle}
                  isLocked={isLocked}
                  onChange={onVisualChange}
                  onDone={onDoneEdit}
                />
              </div>
            ) : (
              <VisualPageView
                page={visual}
                diagramTitle={displayDiagramTitle}
                isLocked={isLocked}
                onEdit={onEdit}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
