import type { ParsedVisual } from "../../../lib/visualPages";

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
    return (
      <div className={`flex flex-col sm:flex-row gap-4 p-4 items-stretch min-h-[200px] ${className}`}>
        <div className="flex items-center justify-center sm:w-1/4">
          <div className="px-3 py-2 border border-cyan-400/50 bg-cyan-950/50 text-cyan-100 font-semibold text-sm text-center">
            {topic}
          </div>
        </div>
        <div className="hidden sm:block w-px bg-cyan-500/30 self-stretch" />
        <div className="flex-1 space-y-3">
          {sections.map((sec) => (
            <div key={sec.id} className="border-l-2 border-cyan-500/40 pl-3">
              <div className="text-[11px] font-mono text-cyan-400 mb-1.5 tracking-wider">{sec.title}</div>
              <ul className="space-y-1">
                {sec.items.map((it) => (
                  <li key={it.id} className="text-[10px] font-mono text-slate-300">
                    · {it.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { root, groups } = parsed.data;
  const total = groups.reduce((a, g) => a + Math.max(g.items.length, 1), 0);
  let offset = 0;
  return (
    <div className={`p-4 ${className}`}>
      <div className="text-center text-xs font-mono text-cyan-400 mb-3 tracking-widest">{root}</div>
      <div className="flex h-36 sm:h-44 border border-cyan-500/30 overflow-hidden" style={{ clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}>
        {groups.map((g) => {
          const weight = Math.max(g.items.length, 1);
          const pct = (weight / total) * 100;
          const hue = 180 + offset * 25;
          offset += weight;
          return (
            <div
              key={g.id}
              className="flex flex-col border-r border-slate-800/80 last:border-r-0 min-w-0"
              style={{ width: `${pct}%`, backgroundColor: `hsla(${hue}, 45%, 22%, 0.95)` }}
            >
              <div className="text-[9px] font-mono text-cyan-200/90 p-1.5 truncate border-b border-black/20">
                {g.title}
              </div>
              <div className="flex-1 p-1 overflow-hidden">
                {g.items.map((it) => (
                  <div key={it.id} className="text-[8px] font-mono text-slate-300 truncate py-0.5">
                    {it.label}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
