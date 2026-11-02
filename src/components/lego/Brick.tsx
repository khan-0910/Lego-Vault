/*
 * Original 3/4-view toy brick drawings in the comic ink style.
 * Oblique projection: depth runs up and to the right.
 */

export const U = 22;
const DEPTH_X = 0.5;
const DEPTH_Y = 0.36;
const INK = "#2A1F45";

export type BrickKind = "brick" | "plate" | "round";

export interface BrickSpec {
  cols?: number;
  rows?: number;
  kind?: BrickKind;
  color: string;
}

/** Mix a hex colour toward white (amt > 0) or black (amt < 0). */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255];
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const [r, g, b] = ch.map((c) => Math.round(c + (target - c) * p));
  return `rgb(${r},${g},${b})`;
}

export function geometry({ cols = 2, rows = 1, kind = "brick" }: Omit<BrickSpec, "color">) {
  const W = cols * U;
  const D = rows * U;
  const dx = D * DEPTH_X;
  const dz = D * DEPTH_Y;
  const H = kind === "plate" ? U * 0.42 : U * 1.15;
  const s = U * 0.3;
  return { W, D, dx, dz, H, s, cols, rows };
}

/** Bounding box of a brick drawn at the origin (top-back edge at y = 0). */
export function brickBox(spec: Omit<BrickSpec, "color">) {
  const g = geometry(spec);
  return { x0: -2, y0: -g.s - 6, x1: g.W + g.dx + 2, y1: g.dz + g.H + 2 };
}

function Stud({ cx, cy, r, h, color }: { cx: number; cy: number; r: number; h: number; color: string }) {
  const ry = r * 0.42;
  return (
    <g>
      <path
        d={`M${cx - r} ${cy} L${cx - r} ${cy - h} A${r} ${ry} 0 0 1 ${cx + r} ${cy - h} L${cx + r} ${cy} A${r} ${ry} 0 0 1 ${cx - r} ${cy} Z`}
        fill={shade(color, -0.12)}
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <ellipse cx={cx} cy={cy - h} rx={r} ry={ry} fill={shade(color, 0.28)} stroke={INK} strokeWidth="2.2" />
    </g>
  );
}

/** A brick as an SVG <g>, so builds can stack several inside one drawing. */
export function BrickShape({ cols = 2, rows = 1, kind = "brick", color, x = 0, y = 0 }: BrickSpec & { x?: number; y?: number }) {
  const g = geometry({ cols, rows, kind });
  const { W, dx, dz, H, s } = g;

  if (kind === "round") {
    const cx = dx / 2 + U / 2;
    const cy = dz / 2;
    const r = U * 0.48;
    return (
      <g transform={`translate(${x} ${y})`}>
        <Stud cx={cx} cy={cy + H} r={r} h={H} color={color} />
        <Stud cx={cx} cy={cy} r={U * 0.3} h={s} color={color} />
        <path d={`M${cx - r + 5} ${cy + 8} v${H - 10}`} stroke="#FFFAF4" strokeWidth="2.6" strokeLinecap="round" opacity=".8" />
      </g>
    );
  }

  const studs: Array<{ cx: number; cy: number; k: string }> = [];
  for (let j = rows - 1; j >= 0; j--) {
    for (let i = 0; i < cols; i++) {
      studs.push({ cx: (i + 0.5) * U + (j + 0.5) * U * DEPTH_X, cy: dz - (j + 0.5) * U * DEPTH_Y, k: `${i}-${j}` });
    }
  }

  return (
    <g transform={`translate(${x} ${y})`} strokeLinejoin="round">
      <polygon points={`${W},${dz} ${W + dx},0 ${W + dx},${H} ${W},${dz + H}`} fill={shade(color, -0.25)} stroke={INK} strokeWidth="2.4" />
      <polygon points={`0,${dz} ${W},${dz} ${W + dx},0 ${dx},0`} fill={shade(color, 0.18)} stroke={INK} strokeWidth="2.4" />
      <polygon points={`0,${dz} ${W},${dz} ${W},${dz + H} 0,${dz + H}`} fill={color} stroke={INK} strokeWidth="2.4" />
      <path d={`M5 ${dz + 5} v${Math.max(2, H - 12)}`} stroke="#FFFAF4" strokeWidth="2.6" strokeLinecap="round" opacity=".75" />
      {studs.map((st) => (
        <Stud key={st.k} cx={st.cx} cy={st.cy} r={U * 0.3} h={s} color={color} />
      ))}
    </g>
  );
}

/** Stand-alone brick picture. */
export function BrickSvg({ size = 64, className, ...spec }: BrickSpec & { size?: number; className?: string }) {
  const b = brickBox(spec);
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  return (
    <svg viewBox={`${b.x0} ${b.y0} ${w} ${h}`} width={size} height={(size * h) / w} className={className} aria-hidden>
      <BrickShape {...spec} />
    </svg>
  );
}
