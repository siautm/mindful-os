import type { ReactNode } from "react";
import type { BraceData, BraceNode, BraceSection } from "../../../lib/visualPages";

const ROW_GAP = 10;
const LEAF_ROW_H = 36;
const BRANCH_ROW_H = 44;
const CONNECT_W = 32;

const strokeW = 1.75;
const lineColor = "currentColor";

const cellBase =
  "inline-flex items-center justify-center font-mono text-cyan-100 border border-cyan-500/60 bg-slate-900/90 text-center leading-tight shrink-0";

function TopicCell({ children }: { children: ReactNode }) {
  return (
    <div className={`${cellBase} text-xs sm:text-sm font-semibold min-w-[2.75rem] min-h-[2.75rem] max-w-[120px] px-2`}>
      {children}
    </div>
  );
}

function ChapterCell({ children }: { children: ReactNode }) {
  return (
    <div className={`${cellBase} text-[10px] sm:text-xs min-h-[2.5rem] px-3 py-1.5 min-w-[5rem] max-w-[150px]`}>
      {children}
    </div>
  );
}

function ItemCell({ children }: { children: ReactNode }) {
  return (
    <div className={`${cellBase} text-[10px] min-w-[2.35rem] min-h-[2.35rem] max-w-[96px] px-1.5`}>{children}</div>
  );
}

function LeafBar({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-mono text-slate-200 px-2.5 py-1 min-w-[5rem] max-w-[200px] border border-cyan-500/25 bg-cyan-950/30 text-left shrink-0">
      {children}
    </div>
  );
}

/** Curved lines from one parent (left) to N children stacked vertically (right). */
function VerticalTreeLines({
  childCount,
  height,
  width = CONNECT_W,
}: {
  childCount: number;
  height: number;
  width?: number;
}) {
  if (childCount <= 0) return null;
  const h = Math.max(height, 40);
  const parentY = h / 2;

  const childYs =
    childCount === 1
      ? [h / 2]
      : Array.from({ length: childCount }, (_, i) => {
          const rowH = (h - (childCount - 1) * ROW_GAP) / childCount;
          return rowH / 2 + i * (rowH + ROW_GAP);
        });

  return (
    <svg
      className="shrink-0 text-cyan-400/80"
      width={width}
      height={h}
      viewBox={`0 0 ${width} ${h}`}
      fill="none"
      aria-hidden
    >
      {childYs.map((cy, i) => (
        <path
          key={i}
          d={`M 0 ${parentY} C ${width * 0.42} ${parentY}, ${width * 0.58} ${cy}, ${width} ${cy}`}
          stroke={lineColor}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/** Lines from chapter to a horizontal row of item cells. */
function HorizontalTreeLines({ childCount, height = BRANCH_ROW_H }: { childCount: number; height?: number }) {
  if (childCount <= 0) return null;
  const h = height;
  const midY = h / 2;
  const w = CONNECT_W;

  const spread = childCount === 1 ? 0 : Math.min(12, (childCount - 1) * 4);
  const childYs =
    childCount === 1
      ? [midY]
      : Array.from({ length: childCount }, (_, i) => {
          const t = i / (childCount - 1);
          return midY - spread / 2 + t * spread;
        });

  return (
    <svg className="shrink-0 text-cyan-400/80" width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden>
      {childYs.map((cy, i) => (
        <path
          key={i}
          d={`M 0 ${midY} C ${w * 0.42} ${parentYForFan(midY, cy)}, ${w * 0.58} ${cy}, ${w} ${midY}`}
          stroke={lineColor}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function parentYForFan(midY: number, childY: number): number {
  return midY + (midY - childY) * 0.15;
}

function measureBranch(node: BraceNode): number {
  if (!node.children.length) return BRANCH_ROW_H;
  const allLeaves = node.children.every((c) => !c.children.length);
  if (allLeaves && node.children.length > 0) {
    return Math.max(BRANCH_ROW_H, node.children.length * LEAF_ROW_H + (node.children.length - 1) * 4);
  }
  return (
    node.children.reduce((sum, c) => sum + measureBranch(c), 0) +
    (node.children.length - 1) * ROW_GAP
  );
}

function ChapterPointsRow({ title, items }: { title: string; items: BraceNode[] }) {
  return (
    <div className="flex items-center min-h-[2.75rem]">
      <ChapterCell>{title}</ChapterCell>
      <HorizontalTreeLines childCount={items.length} />
      <div className="flex items-center gap-1.5 flex-wrap">
        {items.map((it) => (
          <ItemCell key={it.id}>{it.label}</ItemCell>
        ))}
      </div>
    </div>
  );
}

function BraceBranch({ node, depth }: { node: BraceNode; depth: number }) {
  if (!node.children.length) {
    return depth <= 1 ? <ChapterCell>{node.label}</ChapterCell> : <ItemCell>{node.label}</ItemCell>;
  }

  const allLeaves = node.children.every((c) => !c.children.length);

  if (allLeaves && depth === 1) {
    return <ChapterPointsRow title={node.label} items={node.children} />;
  }

  if (allLeaves && depth >= 2) {
    const h = Math.max(node.children.length * LEAF_ROW_H + (node.children.length - 1) * 4, 44);
    return (
      <div className="flex items-center">
        <ChapterCell>{node.label}</ChapterCell>
        <VerticalTreeLines childCount={node.children.length} height={h} width={28} />
        <div className="flex flex-col justify-center gap-1">
          {node.children.map((c) => (
            <LeafBar key={c.id}>{c.label}</LeafBar>
          ))}
        </div>
      </div>
    );
  }

  const colH = measureBranch(node);
  return (
    <div className="flex items-center">
      <ChapterCell>{node.label}</ChapterCell>
      <VerticalTreeLines childCount={node.children.length} height={colH} width={depth >= 2 ? 28 : CONNECT_W} />
      <div className="flex flex-col justify-center" style={{ gap: ROW_GAP }}>
        {node.children.map((child) =>
          child.children.length ? (
            <BraceBranch key={child.id} node={child} depth={depth + 1} />
          ) : (
            <div key={child.id} className="flex items-center min-h-[2.35rem]">
              <ItemCell>{child.label}</ItemCell>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function SectionRow({ section }: { section: BraceSection }) {
  const { title, items } = section;
  if (!items.length) {
    return (
      <div className="flex items-center min-h-[2.75rem]">
        <ChapterCell>{title}</ChapterCell>
      </div>
    );
  }

  const allFlat = items.every((it) => !it.children.length);
  if (allFlat) {
    return <ChapterPointsRow title={title} items={items} />;
  }

  const branch: BraceNode = { id: section.id, label: title, children: items };
  return <BraceBranch node={branch} depth={1} />;
}

export function BraceMapLayout({ data, className = "" }: { data: BraceData; className?: string }) {
  const { topic, sections } = data;

  if (!sections.length) return null;

  const columnH =
    sections.reduce((sum, sec) => {
      const rowH = sec.items.every((i) => !i.children.length)
        ? BRANCH_ROW_H
        : measureBranch({ id: sec.id, label: sec.title, children: sec.items });
      return sum + rowH;
    }, 0) +
    Math.max(0, sections.length - 1) * ROW_GAP;

  return (
    <div className={`flex items-center justify-center p-6 w-full overflow-x-auto ${className}`}>
      <div className="flex items-center">
        <div className="flex items-center shrink-0" style={{ minHeight: columnH }}>
          <TopicCell>{topic}</TopicCell>
        </div>

        <VerticalTreeLines childCount={sections.length} height={columnH} />

        <div className="flex flex-col justify-center" style={{ gap: ROW_GAP }}>
          {sections.map((sec) => (
            <SectionRow key={sec.id} section={sec} />
          ))}
        </div>
      </div>
    </div>
  );
}
