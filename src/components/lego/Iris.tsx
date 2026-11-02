"use client";

import { motion } from "motion/react";
import { type CSSProperties, useLayoutEffect, useState } from "react";
import { Minifig } from "./Minifig";

/*
 * Page transition: a wall of bricks covers the screen and an old-cartoon
 * iris opens in the middle, where a minifig fades in and waves. Then the
 * bricks tumble away, nearest the hole first, as the iris swings open.
 */

const COLORS = ["#FF5C6C", "#FFD447", "#4062FF", "#7BF1C8", "#FF9FD0", "#A77BFF", "#FF9548", "#62D2FF"];
const BW = 104;
const BH = 52;
const HOLD_R = 120;
const IRIS = 1.55; // seconds for the whole iris move
const FALL_AT = 700; // ms when the bricks start to drop
const DONE = 2000; // ms until the overlay unmounts

function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

interface WallBrick {
  k: string;
  left: number;
  top: number;
  z: number;
  color: string;
  delay: number;
  x: number;
  rot: number;
}

export function Iris() {
  const [wall, setWall] = useState<{ bricks: WallBrick[]; full: number } | null>(null);
  const [done, setDone] = useState(false);

  useLayoutEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cols = Math.ceil(w / BW) + 2;
    const rows = Math.ceil(h / BH) + 1;
    const cx = w / 2;
    const cy = h / 2;
    const far = Math.hypot(cx, cy);
    const bricks: WallBrick[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seed = r * 97 + c * 13;
        const left = c * BW - (r % 2 ? BW / 2 : BW);
        const top = r * BH;
        const dx = left + BW / 2 - cx;
        const dist = Math.hypot(dx, top + BH / 2 - cy) / far;
        bricks.push({
          k: `${r}-${c}`,
          left,
          top,
          z: rows - r,
          color: COLORS[Math.floor(rand(seed) * COLORS.length)],
          delay: FALL_AT + dist * 480 + rand(seed + 3) * 110,
          x: dx * (0.25 + rand(seed + 5) * 0.35),
          rot: (dx >= 0 ? 1 : -1) * (30 + rand(seed + 7) * 90),
        });
      }
    }
    setWall({ bricks, full: far + 60 });
    const t = setTimeout(() => setDone(true), DONE);
    return () => clearTimeout(t);
  }, []);

  if (done || !wall) return null;

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
      aria-hidden
      initial={{ "--r": "0px" } as never}
      animate={{ "--r": ["0px", `${HOLD_R}px`, `${HOLD_R}px`, `${wall.full}px`] } as never}
      transition={{ duration: IRIS, times: [0, 0.2, 0.45, 1], ease: ["backOut", "linear", "easeIn"] }}
    >
      <div className="iris-mask absolute inset-0">
        {wall.bricks.map((b) => (
          <span
            key={b.k}
            className="wall-brick"
            style={
              {
                left: b.left,
                top: b.top,
                width: BW,
                height: BH,
                zIndex: b.z,
                background: b.color,
                animationDelay: `${b.delay}ms`,
                "--x": `${b.x}px`,
                "--rot": `${b.rot}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="iris-ring" />
      <motion.div
        className="absolute left-1/2 top-1/2 h-40 w-24 -translate-x-1/2 -translate-y-1/2"
        initial={{ y: 90, scaleY: 0.6, opacity: 0 }}
        animate={{ y: [90, -6, 0, 0, 30], scaleY: [0.6, 1.12, 1, 1, 0.9], opacity: [0, 1, 1, 1, 0] }}
        transition={{ duration: IRIS, times: [0, 0.24, 0.34, 0.5, 0.64], ease: "easeOut" }}
        style={{ originY: 1 }}
      >
        <Minifig wave bob={false} mood="grin" print="brick" torso="#FF5C6C" legs="#4062FF" hat="cap" hatColor="#FFD447" className="h-full w-full" />
      </motion.div>
    </motion.div>
  );
}
