import type { BubbleData } from "../../../lib/visualPages";

const itemBox =
  "text-[10px] font-mono px-2 py-1 border border-teal-500/45 bg-slate-900/90 text-teal-100 max-w-[100px] text-center";

export function BubbleMapLayout({ data, className = "" }: { data: BubbleData; className?: string }) {
  const { center, items } = data;
  if (!items.length) return null;

  const cx = 50;
  const cy = 50;

  const bubbles = items.map((item, i) => {
    const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
    const rx = 38 + (i % 3) * 3;
    const ry = 36 + (i % 2) * 2;
    return {
      item,
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    };
  });

  return (
    <div className={`relative w-full min-h-[220px] min-w-[280px] ${className}`} style={{ aspectRatio: "5/3" }}>
      <svg
        className="absolute inset-0 w-full h-full text-cyan-400/75 pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {bubbles.map(({ item, x, y }) => (
          <line
            key={`line-${item.id}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="currentColor"
            strokeWidth="0.6"
            strokeLinecap="round"
          />
        ))}
      </svg>

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-4 py-2.5 rounded-full border-2 border-cyan-400/60 bg-cyan-950/70 text-cyan-100 font-semibold text-xs sm:text-sm text-center max-w-[42%] leading-tight"
      >
        {center}
      </div>

      {bubbles.map(({ item, x, y }) => (
        <div
          key={item.id}
          className={`absolute z-[1] ${itemBox}`}
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
