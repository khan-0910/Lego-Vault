"use client";

import { motion } from "motion/react";
import { compactINR, formatINR, formatPct } from "@/lib/money";

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  color: string;
}

const CX = 120;
const R_OUT = 104;
const R_IN = 60;

function sector(r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => `${(CX + r * Math.cos(a)).toFixed(2)} ${(CX + r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`;
}

/** Hand-built donut so it can wear the comic outline + offset shadow look. */
export function ThemeDonut({
  slices,
  focus,
  onFocus,
  selected,
  onSelect,
  centerLabel = "Spent",
}: {
  slices: DonutSlice[];
  focus: string | null;
  onFocus: (id: string | null) => void;
  selected: string | null;
  onSelect: (id: string | null) => void;
  centerLabel?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  let angle = -Math.PI / 2;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const sweep = (s.value / total) * Math.PI * 2;
      const a0 = angle;
      angle += sweep;
      const a1 = angle;
      const mid = (a0 + a1) / 2;
      // A single full slice can't be drawn as one arc; split it in two.
      const d = sweep >= Math.PI * 2 - 1e-6 ? `${sector(R_IN, R_OUT, a0, a0 + Math.PI)} ${sector(R_IN, R_OUT, a0 + Math.PI, a1 - 1e-4)}` : sector(R_IN, R_OUT, a0, a1);
      return { ...s, d, mid, pct: (s.value / total) * 100 };
    });

  const active = arcs.find((a) => a.id === (focus ?? selected));

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px]">
      <motion.svg
        viewBox="0 0 250 250"
        className="h-full w-full overflow-visible"
        initial={{ rotate: -100, scale: 0.6, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
        role="group"
        aria-label="Spending by theme"
      >
        <defs>
          <pattern id="donut-dots" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="3.5" cy="3.5" r="1.1" fill="#2A1F45" opacity=".22" />
          </pattern>
        </defs>
        <g transform="translate(6 6)">
          {arcs.map((a) => (
            <path key={a.id} d={a.d} fill="#2A1F45" />
          ))}
        </g>
        {arcs.map((a) => {
          const lifted = a.id === focus || a.id === selected;
          const dim = (focus || selected) && !lifted;
          return (
            <motion.g
              key={a.id}
              animate={{ x: lifted ? Math.cos(a.mid) * 9 : 0, y: lifted ? Math.sin(a.mid) * 9 : 0, opacity: dim ? 0.4 : 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              role="button"
              tabIndex={0}
              aria-pressed={selected === a.id}
              aria-label={`${a.label}: ${formatINR(a.value)}, ${formatPct(a.pct)} of spending`}
              onMouseEnter={() => onFocus(a.id)}
              onMouseLeave={() => onFocus(null)}
              onFocus={() => onFocus(a.id)}
              onBlur={() => onFocus(null)}
              onClick={() => onSelect(selected === a.id ? null : a.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(selected === a.id ? null : a.id);
                }
              }}
              className="cursor-pointer outline-none [&:focus-visible>path:first-child]:stroke-blue"
            >
              <path d={a.d} fill={a.color} stroke="#2A1F45" strokeWidth="3" strokeLinejoin="round" />
              <path d={a.d} fill="url(#donut-dots)" pointerEvents="none" />
            </motion.g>
          );
        })}
        <circle cx={CX} cy={CX} r={R_IN - 10} fill="#FFFAF4" stroke="#2A1F45" strokeWidth="3" />
      </motion.svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div className="max-w-[42%]">
          <p className="mono-meta truncate text-[0.62rem] text-ink/60">{active ? active.label : centerLabel}</p>
          <p className="font-display text-xl font-extrabold leading-tight">{compactINR(active ? active.value : total)}</p>
          {active && <p className="mono-meta text-[0.62rem]">{formatPct(active.pct)}</p>}
        </div>
      </div>
    </div>
  );
}
