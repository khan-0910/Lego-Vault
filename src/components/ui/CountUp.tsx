"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { formatINR, formatNumber } from "@/lib/money";

/** Last value each counter showed, so revisiting a page animates only the change. */
const memory = new Map<string, number>();

export function CountUp({
  value,
  money = false,
  format = money ? (n) => formatINR(n) : (n) => formatNumber(n),
  memoryKey,
  duration = 1.3,
  className,
  onRise,
}: {
  value: number;
  /** Value is paise: format as ₹ and tick in whole rupees while animating. */
  money?: boolean;
  format?: (n: number) => string;
  memoryKey?: string;
  duration?: number;
  className?: string;
  /** Called when the number goes up compared to the last time it was shown. */
  onRise?: (delta: number) => void;
}) {
  const reduce = useReducedMotion();
  const remembered = memoryKey ? memory.get(memoryKey) : undefined;
  const mv = useMotionValue(reduce ? value : (remembered ?? 0));
  const target = useRef(value);
  target.current = value;
  const step = money ? 100 : 1;
  const text = useTransform(mv, (v) => format(v === target.current ? v : Math.round(v / step) * step));
  const lastTarget = useRef<number | null>(remembered ?? null);
  const onRiseRef = useRef(onRise);
  onRiseRef.current = onRise;

  useEffect(() => {
    if (memoryKey) memory.set(memoryKey, value);
    const prev = lastTarget.current;
    lastTarget.current = value;
    if (prev != null && value > prev) onRiseRef.current?.(value - prev);
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, reduce, duration, memoryKey, mv]);

  return (
    <span className={className}>
      <span className="sr-only">{format(value)}</span>
      <motion.span aria-hidden className="tabular-nums">
        {text}
      </motion.span>
    </span>
  );
}
