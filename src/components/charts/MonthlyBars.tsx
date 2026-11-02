"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { type MonthBucket, niceMax } from "@/lib/calc";
import { compactINR, formatINR } from "@/lib/money";
import { cn, monthLabel, pluralise } from "@/lib/utils";

/** Monthly spend as LEGO-brick columns (with studs). Click a month to see what was bought. */
export function MonthlyBars({
  buckets,
  mode,
  selected,
  onSelect,
}: {
  buckets: MonthBucket[];
  mode: "monthly" | "cumulative";
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const pick = (b: MonthBucket) => (mode === "monthly" ? b.spent : b.cumulative);
  const max = niceMax(Math.max(1, ...buckets.map(pick)));
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  const dense = buckets.length > 18;

  return (
    <div className="flex gap-2">
      <div className="relative h-60 w-12 shrink-0 self-start select-none" aria-hidden>
        {ticks.map((t) => (
          <span key={t} className="mono-meta absolute right-0 -translate-y-1/2 text-[0.6rem] text-ink/55" style={{ top: `${(1 - t) * 100}%` }}>
            {compactINR(max * t)}
          </span>
        ))}
      </div>
      <div className="scroll-comic min-w-0 flex-1 overflow-x-auto pb-1">
        <div className={cn("relative", dense && "min-w-[640px]")}>
          <div className="relative h-60 border-b-[3px] border-l-[3px] border-ink">
            {ticks.slice(0, -1).map((t) => (
              <span key={t} className="absolute inset-x-0 border-t-2 border-dashed border-ink/15" style={{ top: `${(1 - t) * 100}%` }} aria-hidden />
            ))}
            <ul className="absolute inset-0 flex items-end gap-[3%] px-[2%]" role="list" aria-label={mode === "monthly" ? "Spending per month" : "Running total of spending"}>
              {buckets.map((b, i) => {
                const v = pick(b);
                const h = (v / max) * 100;
                const on = selected === b.key;
                const hot = hover === b.key;
                return (
                  <li key={b.key} className="relative flex h-full flex-1 items-end justify-center">
                    <AnimatePresence>
                      {hot && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, transition: { duration: 0.08 } }}
                          className="pointer-events-none absolute z-10 w-max -translate-x-1/2 rounded-lg border-[2.5px] border-ink bg-paper px-2.5 py-1.5 text-center shadow-comic-sm"
                          style={{ bottom: `calc(${Math.max(h, 2)}% + 14px)`, left: "50%" }}
                        >
                          <p className="mono-meta text-[0.6rem] text-ink/60">{monthLabel(b.key, true)}</p>
                          <p className="font-display text-sm font-extrabold">{formatINR(v)}</p>
                          {mode === "monthly" && <p className="text-[0.7rem] font-semibold">{pluralise(b.count, "set")}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <button
                      type="button"
                      onClick={() => onSelect(on ? null : b.key)}
                      onMouseEnter={() => setHover(b.key)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(b.key)}
                      onBlur={() => setHover(null)}
                      aria-pressed={on}
                      aria-label={`${monthLabel(b.key, true)}: ${formatINR(v)}${mode === "monthly" ? `, ${pluralise(b.count, "set")}` : " total so far"}`}
                      className="group relative flex h-full w-full max-w-12 items-end justify-center"
                    >
                      <motion.span
                        className="relative block w-full rounded-t-[5px] border-[2.5px] border-ink"
                        style={{
                          background: on ? "#FFD447" : mode === "monthly" ? "#FF5C6C" : "#4062FF",
                          boxShadow: v > 0 ? "3px 0 0 0 #2A1F45" : undefined,
                        }}
                        initial={{ height: 0 }}
                        animate={{ height: v > 0 ? `${Math.max(h, 1.5)}%` : "3px" }}
                        transition={{ type: "spring", stiffness: 170, damping: 20, delay: i * 0.025 }}
                      >
                        {v > 0 && (
                          <>
                            <span className="absolute -top-[9px] left-[18%] h-[7px] w-[24%] rounded-t-[3px] border-[2.5px] border-b-0 border-ink" style={{ background: "inherit" }} />
                            <span className="absolute -top-[9px] right-[18%] h-[7px] w-[24%] rounded-t-[3px] border-[2.5px] border-b-0 border-ink" style={{ background: "inherit" }} />
                            <span className="halftone-light absolute inset-0" />
                          </>
                        )}
                      </motion.span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex gap-[3%] px-[2%] pt-1.5" aria-hidden>
            {buckets.map((b, i) => {
              const showYear = i === 0 || b.key.endsWith("-01");
              return (
                <span key={b.key} className={cn("mono-meta flex-1 text-center text-[0.6rem] leading-tight", selected === b.key && "font-extrabold")}>
                  {dense && i % 2 === 1 && !showYear ? "" : monthLabel(b.key)}
                  {showYear && <span className="block text-ink/50">{b.key.slice(0, 4)}</span>}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
