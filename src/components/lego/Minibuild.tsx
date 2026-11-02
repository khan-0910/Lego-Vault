"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { onTwos } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { brickBox, BrickShape, type BrickSpec, geometry, U } from "./Brick";

/*
 * Tiny builds that snap themselves together, one brick at a time.
 * Every piece is two studs deep so stacking is just "move up by height".
 */

type Piece = BrickSpec & { x: number };

const B = geometry({ kind: "brick" }).H;
const P = geometry({ kind: "plate" }).H;

/** Stack pieces bottom-up; each one sits on the previous. */
function stack(pieces: Array<Piece & { gap?: number }>) {
  let y = 0;
  return pieces.map((p, i) => {
    if (i > 0) y -= geometry(p).H;
    return { ...p, y };
  });
}

const BUILDS = {
  tree: stack([
    { cols: 1, rows: 2, color: "#8A5A2B", x: U },
    { cols: 3, rows: 2, kind: "plate", color: "#2FCB8A", x: 0 },
    { cols: 3, rows: 2, color: "#2FCB8A", x: 0 },
    { cols: 2, rows: 2, color: "#7BF1C8", x: U / 2 },
    { cols: 1, rows: 2, color: "#2FCB8A", x: U },
  ]),
  house: stack([
    { cols: 4, rows: 2, kind: "plate", color: "#2FCB8A", x: 0 },
    { cols: 4, rows: 2, color: "#FF5C6C", x: 0 },
    { cols: 4, rows: 2, color: "#FFD447", x: 0 },
    { cols: 4, rows: 2, kind: "plate", color: "#4062FF", x: 0 },
    { cols: 3, rows: 2, color: "#4062FF", x: U / 2 },
    { cols: 2, rows: 2, color: "#4062FF", x: U },
  ]),
  rocket: stack([
    { cols: 3, rows: 2, kind: "plate", color: "#FF5C6C", x: 0 },
    { cols: 2, rows: 2, color: "#FFFAF4", x: U / 2 },
    { cols: 2, rows: 2, color: "#4062FF", x: U / 2 },
    { cols: 2, rows: 2, color: "#FFFAF4", x: U / 2 },
    { cols: 1, rows: 2, color: "#FF5C6C", x: U },
    { cols: 1, rows: 2, kind: "plate", color: "#FFD447", x: U },
  ]),
  tower: stack([
    { cols: 2, rows: 2, color: "#A77BFF", x: 0 },
    { cols: 2, rows: 2, color: "#FF9FD0", x: 0 },
    { cols: 2, rows: 2, color: "#62D2FF", x: 0 },
    { cols: 2, rows: 2, color: "#FFD447", x: 0 },
  ]),
} as const;

export type BuildName = keyof typeof BUILDS;

export function Minibuild({
  name,
  className,
  delay = 0,
  loop = false,
  inView = false,
}: {
  name: BuildName;
  className?: string;
  delay?: number;
  loop?: boolean;
  /** Start building when scrolled into view instead of on mount. */
  inView?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);
  const seen = useInView(ref, { once: true, margin: "-40px" });
  const go = !inView || seen;
  const pieces = BUILDS[name];
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pieces) {
    const b = brickBox(p);
    x0 = Math.min(x0, p.x + b.x0);
    y0 = Math.min(y0, p.y + b.y0);
    x1 = Math.max(x1, p.x + b.x1);
    y1 = Math.max(y1, p.y + b.y1);
  }
  const pad = 6;
  const dropFrom = -(y1 - y0) - 40;
  return (
    <svg ref={ref} viewBox={`${x0 - pad} ${y0 - pad - 30} ${x1 - x0 + pad * 2} ${y1 - y0 + pad * 2 + 30}`} className={cn("overflow-visible", className)} aria-hidden>
      <ellipse cx={(x0 + x1) / 2} cy={y1 + 2} rx={(x1 - x0) / 2} ry="6" fill="#2A1F45" opacity=".15" />
      {pieces.map((p, i) => (
        <motion.g
          key={i}
          initial={reduce ? false : { y: dropFrom, opacity: 0 }}
          animate={go ? { y: 0, opacity: 1 } : undefined}
          transition={{
            duration: 0.55,
            delay: delay + i * 0.28,
            ease: onTwos(7),
            ...(loop ? { repeat: Infinity, repeatDelay: pieces.length * 0.28 + 2.5, repeatType: "loop" as const } : {}),
          }}
        >
          <BrickShape {...p} />
        </motion.g>
      ))}
    </svg>
  );
}

export { B as BRICK_H, P as PLATE_H };
