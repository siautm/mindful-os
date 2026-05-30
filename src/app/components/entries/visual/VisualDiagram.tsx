import type { ParsedVisual } from "../../../lib/visualPages";
import { BraceMapLayout } from "./BraceMapLayout";

const box =
  "px-2 py-1.5 text-[10px] sm:text-xs font-mono border border-cyan-500/40 bg-slate-900/80 text-cyan-100 text-center max-w-[140px]";

export function VisualDiagram({ parsed, className = "" }: { parsed: ParsedVisual; className?: string }) {
  if (parsed.type === "flowmap") {
    const { nodes } = parsed.data;
    if (!nodes.length) {
      return <EmptyDiagram className={className} />;
    }
    return (
      <div className={`flex flex-wrap items-center justify-center gap-2 p-4 ${className}`}>
        {nodes.map((node, i) => (
          <div key={node.id} className="flex items-center gap-2">
            <div className={box}>{node.label}</div>
            {i < nodes.length - 1 && <span className="text-cyan-500 font-mono text-lg">→</span>}
          </div>
        ))}
      </div>
    );
  }

  if (parsed.type === "bubblemap") {
    const { center, items } = parsed.data;
    if (!items.length) {
      return <EmptyDiagram className={className} message="Add numbered lines around the title" />;
    }
    return (
      <div className={`relative min-h-[220px] p-6 flex items-center justify-center ${className}`}>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-4 py-3 rounded-full border-2 border-cyan-400/60 bg-cyan-950/60 text-cyan-100 font-semibold text-sm text-center max-w-[160px]">
          {center}
        </div>
        {items.map((item, i) => {
          const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
          const rx = 42 + (i % 3) * 4;
          const x = 50 + Math.cos(angle) * rx;
          const y = 50 + Math.sin(angle) * rx;
          return (
            <div
              key={item.id}
              className="absolute text-[10px] font-mono px-2 py-1 border border-teal-500/35 bg-slate-900/90 text-teal-100 max-w-[100px] text-center"
              style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
            >
              {item.label}
            </div>
          );
        })}
      </div>
    );
  }

  if (parsed.type === "bracemap") {
    const { topic, sections } = parsed.data;
    if (!sections.some((s) => s.items.length > 0)) {
      return <EmptyDiagram className={className} message="Add # chapters and numbered points" />;
    }
    return <BraceMapLayout data={{ topic, sections }} className={className} />;
  }

  return <TreeMapDiagram data={parsed.data} className={className} />;
}

function TreeMapDiagram({
  data,
  className,
}: {
  data: import("../../../lib/visualPages").TreeData;
  className?: string;
}) {
  const { root, groups } = data;
  const hasContent = groups.some((g) => g.items.length > 0);
  if (!hasContent && groups.length <= 1) {
    return <EmptyDiagram className={className} message="Add # categories and numbered items" />;
  }

  return (
    <div className={`p-6 w-full max-w-4xl mx-auto ${className}`}>
      <div className="flex flex-col items-center">
        <div className={`${box} font-semibold text-sm mb-0`}>{root}</div>
        <div className="w-px h-5 bg-cyan-500/50" />
        <div className="relative w-full flex justify-center">
          <div className="absolute top-0 left-[12%] right-[12%] h-px bg-cyan-500/40" />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-6 mt-1">
        {groups.map((g) => (
          <div key={g.id} className="flex flex-col items-center min-w-[100px] max-w-[200px] flex-1">
            <div className="w-px h-4 bg-cyan-500/40 shrink-0" />
            <div className="px-2 py-1 text-[10px] font-mono text-teal-200 border border-teal-500/40 bg-teal-950/40 text-center tracking-wider w-full">
              {g.title}
            </div>
            <div className="w-px h-3 bg-cyan-500/30" />
            <ul className="w-full space-y-1 pt-1">
              {g.items.length === 0 ? (
                <li className="text-[9px] font-mono text-slate-600 text-center">—</li>
              ) : (
                g.items.map((it) => (
                  <li
                    key={it.id}
                    className="text-[10px] font-mono text-slate-300 text-center px-2 py-1 border border-slate-700/50 bg-slate-900/50"
                  >
                    {it.label}
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyDiagram({ className, message = "Enter numbered lines to generate diagram" }: { className?: string; message?: string }) {
  return (
    <div className={`flex items-center justify-center min-h-[180px] text-slate-500 text-xs font-mono ${className}`}>
      {message}
    </div>
  );
}
