"use client";

import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";
import { BrickSvg, type BrickKind } from "./Brick";

/*
 * Loose bricks drifting behind the page. Each floats with a stepped,
 * stop-motion bob (CSS) and shifts with scroll and pointer for depth.
 */

interface Floater {
  left: string;
  top: string;
  size: number;
  depth: number;
  cols: number;
  rows: number;
  kind: BrickKind;
  color: string;
  rot: number;
  delay: number;
  mobile?: boolean;
}

const FLOATERS: Floater[] = [
  { left: "-1.5%", top: "16%", size: 74, depth: 0.5, cols: 2, rows: 2, kind: "brick", color: "#FF5C6C", rot: -18, delay: 0, mobile: true },
  { left: "94%", top: "12%", size: 58, depth: 0.8, cols: 1, rows: 1, kind: "round", color: "#FFD447", rot: 12, delay: -1.2 },
  { left: "93%", top: "44%", size: 92, depth: 0.35, cols: 4, rows: 2, kind: "plate", color: "#4062FF", rot: 20, delay: -2.4, mobile: true },
  { left: "-2%", top: "62%", size: 56, depth: 0.9, cols: 1, rows: 2, kind: "brick", color: "#7BF1C8", rot: 28, delay: -0.6 },
  { left: "52%", top: "93%", size: 64, depth: 0.6, cols: 2, rows: 1, kind: "brick", color: "#A77BFF", rot: -10, delay: -3.1 },
  { left: "78%", top: "90%", size: 46, depth: 1, cols: 1, rows: 1, kind: "brick", color: "#FF9FD0", rot: -30, delay: -1.8 },
  { left: "18%", top: "94%", size: 70, depth: 0.45, cols: 3, rows: 2, kind: "plate", color: "#FFD447", rot: 8, delay: -2.9 },
  { left: "96%", top: "74%", size: 50, depth: 0.7, cols: 2, rows: 2, kind: "brick", color: "#2FCB8A", rot: -22, delay: -0.3, mobile: true },
  { left: "1%", top: "88%", size: 42, depth: 0.9, cols: 1, rows: 1, kind: "round", color: "#FF5C6C", rot: 0, delay: -2.1 },
];

function Floating({ f, i }: { f: Floater; i: number }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, (v) => -v * f.depth * 0.35);
  return (
    <motion.div className={`absolute ${f.mobile ? "" : "hidden md:block"}`} style={{ left: f.left, top: f.top, y }}>
      <div className="animate-brick-float" style={{ ["--r" as string]: `${f.rot}deg`, animationDelay: `${f.delay}s`, animationDuration: `${6 + (i % 4)}s` }}>
        <BrickSvg cols={f.cols} rows={f.rows} kind={f.kind} color={f.color} size={f.size} />
      </div>
    </motion.div>
  );
}

export function FloatingBricks() {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 40, damping: 14 });
  const sy = useSpring(py, { stiffness: 40, damping: 14 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      px.set((e.clientX / window.innerWidth - 0.5) * -24);
      py.set((e.clientY / window.innerHeight - 0.5) * -18);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, px, py]);

  return (
    <motion.div className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden opacity-80" style={{ x: sx, y: sy }} aria-hidden>
      {FLOATERS.map((f, i) => (
        <Floating key={i} f={f} i={i} />
      ))}
    </motion.div>
  );
}
