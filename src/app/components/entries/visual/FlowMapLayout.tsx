const COLS = 6;
const NODE_W = 48;
const NODE_H = 30;
const GAP_X = 18;
const GAP_Y = 32;

const box =
  "inline-flex items-center justify-center min-w-[2.25rem] h-[1.85rem] px-1.5 text-[10px] font-mono border border-cyan-500/50 bg-slate-900/85 text-cyan-100 text-center";

function layoutNodes(count: number) {
  const rows = Math.ceil(count / COLS);
  const positions: { x: number; y: number }[] = [];

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / COLS);
    const colInRow = i % COLS;
    const colsInRow = Math.min(COLS, count - row * COLS);
    const reversed = row % 2 === 1;
    const col = reversed ? colsInRow - 1 - colInRow : colInRow;
    positions.push({
      x: col * (NODE_W + GAP_X) + NODE_W / 2,
      y: row * (NODE_H + GAP_Y) + NODE_H / 2,
    });
  }

  const width = COLS * (NODE_W + GAP_X) - GAP_X + NODE_W;
  const height = rows * (NODE_H + GAP_Y) - GAP_Y + NODE_H;

  return { positions, width, height };
}

function connectorPath(positions: { x: number; y: number }[]): string {
  if (positions.length < 2) return "";
  return positions.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

interface FlowMapLayoutProps {
  nodes: { id: string; label: string }[];
  className?: string;
}

export function FlowMapLayout({ nodes, className = "" }: FlowMapLayoutProps) {
  if (!nodes.length) return null;

  const { positions, width, height } = layoutNodes(nodes.length);
  const pathD = connectorPath(positions);

  return (
    <div className={`inline-block p-2 ${className}`}>
      <div className="relative" style={{ width, height }}>
        <svg
          className="absolute inset-0 overflow-visible text-cyan-400/80 pointer-events-none"
          width={width}
          height={height}
          aria-hidden
        >
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {positions.map((p, i) => {
            if (i === 0) return null;
            const prev = positions[i - 1];
            const sameRow = Math.floor(i / COLS) === Math.floor((i - 1) / COLS);
            if (!sameRow) return null;
            const mx = (prev.x + p.x) / 2;
            const my = (prev.y + p.y) / 2;
            const reversed = Math.floor(i / COLS) % 2 === 1;
            return (
              <text
                key={`arr-${i}`}
                x={mx}
                y={my}
                fill="currentColor"
                fontSize="10"
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono select-none"
              >
                {reversed ? "←" : "→"}
              </text>
            );
          })}
          {positions.map((p, i) => {
            if (i === 0) return null;
            const prev = positions[i - 1];
            const sameRow = Math.floor(i / COLS) === Math.floor((i - 1) / COLS);
            if (sameRow) return null;
            const midY = (prev.y + p.y) / 2;
            return (
              <text
                key={`down-${i}`}
                x={prev.x}
                y={midY}
                fill="currentColor"
                fontSize="10"
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono select-none"
              >
                ↓
              </text>
            );
          })}
        </svg>

        {nodes.map((node, i) => (
          <div
            key={node.id}
            className={`absolute ${box}`}
            style={{
              left: positions[i].x - NODE_W / 2,
              top: positions[i].y - NODE_H / 2,
              width: NODE_W,
              height: NODE_H,
            }}
          >
            {node.label}
          </div>
        ))}
      </div>
    </div>
  );
}
