import type { BubbleData } from "../../../lib/visualPages";

/** Match container aspect ratio so lines align with nodes */
const VW = 100;
const VH = 60;
const CX = VW / 2;
const CY = VH / 2;

/** Center pill radii (viewBox units) */
const CENTER_RX = 22;
const CENTER_RY = 9;

/** Child node half-size for edge-to-edge spokes */
const CHILD_HW = 7;
const CHILD_HH = 5;

function orbitPosition(index: number, total: number) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const orbitRx = 32;
  const orbitRy = 22;
  return {
    x: CX + Math.cos(angle) * orbitRx,
    y: CY + Math.sin(angle) * orbitRy,
  };
}

function ellipseRadiusAlong(ux: number, uy: number) {
  return 1 / Math.sqrt((ux * ux) / (CENTER_RX * CENTER_RX) + (uy * uy) / (CENTER_RY * CENTER_RY));
}

function rectRadiusAlong(ux: number, uy: number, hw: number, hh: number) {
  const ax = Math.abs(ux) || 0.001;
  const ay = Math.abs(uy) || 0.001;
  return Math.min(hw / ax, hh / ay);
}

/** Spoke from center ellipse edge to child box edge (toward center). */
function spokeEndpoints(tx: number, ty: number) {
  const dx = tx - CX;
  const dy = ty - CY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  const fromR = ellipseRadiusAlong(ux, uy);
  const toR = rectRadiusAlong(ux, uy, CHILD_HW, CHILD_HH);

  return {
    x1: CX + ux * fromR,
    y1: CY + uy * fromR,
    x2: tx - ux * toR,
    y2: ty - uy * toR,
  };
}

function wrapLabel(text: string, maxLen = 14): string[] {
  if (text.length <= maxLen) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxLen && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

export function BubbleMapLayout({ data, className = "" }: { data: BubbleData; className?: string }) {
  const { center, items } = data;
  if (!items.length) return null;

  const nodes = items.map((item, i) => ({
    item,
    ...orbitPosition(i, items.length),
  }));

  const centerLines = wrapLabel(center);

  return (
    <svg
      className={`w-full max-w-md text-cyan-400/80 ${className}`}
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Bubble map: ${center}`}
    >
      {nodes.map(({ item, x, y }) => {
        const { x1, y1, x2, y2 } = spokeEndpoints(x, y);
        return (
          <line
            key={`spoke-${item.id}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        );
      })}

      <ellipse
        cx={CX}
        cy={CY}
        rx={CENTER_RX}
        ry={CENTER_RY}
        fill="rgba(8, 47, 73, 0.85)"
        stroke="currentColor"
        strokeWidth="0.8"
        className="text-cyan-400"
      />
      {centerLines.map((line, i) => (
        <text
          key={`c-${i}`}
          x={CX}
          y={CY + (i - (centerLines.length - 1) / 2) * 4.5}
          fill="#e0f2fe"
          fontSize="4.2"
          fontFamily="ui-monospace, monospace"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {line}
        </text>
      ))}

      {nodes.map(({ item, x, y }) => (
        <g key={item.id}>
          <rect
            x={x - CHILD_HW}
            y={y - CHILD_HH}
            width={CHILD_HW * 2}
            height={CHILD_HH * 2}
            rx={1.5}
            fill="rgba(15, 23, 42, 0.95)"
            stroke="currentColor"
            strokeWidth="0.65"
            className="text-teal-400/90"
          />
          <text
            x={x}
            y={y}
            fill="#ccfbf1"
            fontSize="4.5"
            fontFamily="ui-monospace, monospace"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {item.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
