"use client";

import { ChevronDown, Crown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Delta, SetCover } from "@/components/sets/SetBits";
import { Starburst } from "@/components/ui/Decor";
import { ThemeDot } from "@/components/ui/ThemeBadge";
import { ThemeIcon } from "@/components/ui/ThemeIcon";
import { type BoardMode, type BoardRow, itemsLabel, type ThemeSlice, type TimelineGroup } from "@/lib/calc";
import { compactINR, formatINR, formatPct } from "@/lib/money";
import type { LegoSet, Theme } from "@/lib/types";
import { dropLand } from "@/lib/motion";
import type { Pulse } from "@/lib/ui";
import { StudRow } from "@/components/ui/Panel";
import { clamp, cn, formatDate, monthLabel, pluralise, textOn } from "@/lib/utils";

/* ───────────── Theme breakdown: bars you can open to see the sets behind them ───────────── */

export function ThemeBreakdown({
  slices,
  theme,
  focus,
  onFocus,
  selected,
  onSelect,
  pulse,
}: {
  slices: ThemeSlice[];
  theme: (id: string) => Theme;
  focus: string | null;
  onFocus: (id: string | null) => void;
  selected: string | null;
  onSelect: (id: string | null) => void;
  pulse: Pulse | null;
}) {
  const max = Math.max(1, ...slices.map((s) => s.spent));
  const fresh = pulse && Date.now() - pulse.at < 15_000 ? pulse : null;
  return (
    <ul className="space-y-2.5">
      {slices.map((s, i) => {
        const t = theme(s.themeId);
        const open = selected === s.themeId;
        const flash = fresh?.themeIds.includes(s.themeId) ? fresh : null;
        const flashing = !!flash;
        return (
          <motion.li
            key={s.themeId}
            layout="position"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 26 }}
            className={cn("rounded-xl border-[2.5px] border-ink bg-paper transition-shadow", (open || focus === s.themeId) && "shadow-comic-sm")}
            onMouseEnter={() => onFocus(s.themeId)}
            onMouseLeave={() => onFocus(null)}
          >
            <button
              type="button"
              onClick={() => onSelect(open ? null : s.themeId)}
              aria-expanded={open}
              className="relative flex w-full items-center gap-3 overflow-hidden rounded-[10px] px-3 py-2.5 text-left"
            >
              {flashing && (
                <motion.span
                  className="absolute inset-0 bg-yellow"
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 2.4, ease: "easeOut" }}
                  aria-hidden
                />
              )}
              <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border-[2.5px] border-ink" style={{ background: t.color, color: textOn(t.color) }}>
                <ThemeIcon icon={t.icon} size={17} />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-display font-extrabold">{t.name}</span>
                  <span className="shrink-0 font-display font-extrabold tabular-nums">{formatINR(s.spent)}</span>
                </span>
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="relative h-3 flex-1 overflow-hidden rounded-full border-2 border-ink bg-cream">
                    <motion.span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ background: t.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.spent / max) * 100}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.1 + i * 0.04 }}
                    />
                  </span>
                  <span className="mono-meta w-24 shrink-0 text-right text-[0.62rem] text-ink/60">
                    {formatPct(s.share * 100)} · {itemsLabel(s.count, s.figs)}
                  </span>
                </span>
              </span>
              {flash && flash.delta !== 0 && (
                <motion.span
                  className={cn("absolute right-10 top-0 rounded-full border-2 border-ink px-1.5 text-[0.7rem] font-extrabold", flash.delta > 0 ? "bg-mint" : "bg-pink")}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: [10, -2, -2, -8], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 3, times: [0, 0.15, 0.8, 1] }}
                >
                  {formatINR(flash.delta, { signed: true })}
                </motion.span>
              )}
              <ChevronDown size={18} strokeWidth={3} className={cn("relative shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 32 }}
                  className="overflow-hidden"
                >
                  <SetMiniList sets={[...s.sets].sort((a, b) => (b.purchasePrice ?? -1) - (a.purchasePrice ?? -1))} theme={theme} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        );
      })}
    </ul>
  );
}

/** Compact list of sets with what was paid. Used when a chart element is opened. */
export function SetMiniList({ sets, theme, className }: { sets: LegoSet[]; theme: (id: string) => Theme; className?: string }) {
  return (
    <ul className={cn("divide-y-2 divide-dashed divide-ink/20 border-t-2 border-dashed border-ink/30 px-3 py-1", className)}>
      {sets.map((s) => {
        const t = theme(s.themeId);
        return (
          <li key={s.id}>
            <Link href={`/set?id=${s.id}`} className="flex items-center gap-3 rounded-md py-2 hover:bg-yellow/30">
              <SetCover set={s} theme={t} size="thumb" className="h-9 w-9 shrink-0 rounded-md border-2 border-ink" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-bold leading-tight">{s.name}</span>
                <span className="mono-meta text-[0.6rem] text-ink/55">
                  {s.setNumber ? `#${s.setNumber} · ` : ""}
                  {formatDate(s.purchaseDate, "undated")}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-display text-sm font-extrabold tabular-nums">{formatINR(s.purchasePrice, { fallback: "No price" })}</span>
                {s.marketValue != null && <span className="mono-meta block text-[0.6rem] text-ink/55">est. {compactINR(s.marketValue)}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────────── Leaderboard ───────────── */

export function Leaderboard({ rows, mode, theme }: { rows: BoardRow[]; mode: BoardMode; theme: (id: string) => Theme }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.amount)));
  return (
    <ol className="space-y-2">
      <AnimatePresence mode="popLayout" initial={false}>
        {rows.map((r, i) => {
          const t = theme(r.set.themeId);
          return (
            <motion.li
              key={`${mode}-${r.set.id}`}
              layout
              initial={{ opacity: 0, x: 24, rotate: 1 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 360, damping: 28, delay: i * 0.035 }}
            >
              <Link href={`/set?id=${r.set.id}`} className="group flex items-center gap-3 rounded-xl border-[2.5px] border-ink bg-paper px-2.5 py-2 transition-transform hover:-translate-y-0.5 hover:shadow-comic-sm">
                {i === 0 ? (
                  <Starburst className="h-11 w-11 shrink-0" points={10} depth={0.75}>
                    <Crown size={16} strokeWidth={3} aria-label="Number 1" />
                  </Starburst>
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-[2.5px] border-ink bg-cream font-display font-extrabold">{i + 1}</span>
                )}
                <SetCover set={r.set} theme={t} size="thumb" className="h-10 w-10 shrink-0 rounded-lg border-2 border-ink" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 font-bold leading-tight group-hover:underline">{r.set.name}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <ThemeDot theme={t} className="h-2.5 w-2.5" />
                    <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                      <motion.span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: mode === "gain" ? (r.amount >= 0 ? "#12784A" : "#D93A55") : t.color === "#FFFAF4" ? "#2A1F45" : t.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(Math.abs(r.amount) / max) * 100}%` }}
                        transition={{ type: "spring", stiffness: 140, damping: 22, delay: 0.1 + i * 0.04 }}
                      />
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {mode === "gain" ? (
                    <Delta delta={r.amount} pct={r.pct} size="sm" showLabel />
                  ) : (
                    <span className="font-display font-extrabold tabular-nums">{formatINR(r.amount)}</span>
                  )}
                </span>
              </Link>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}

/* ───────────── Purchase timeline ───────────── */

export function PurchaseTimeline({ groups, theme, limit = 6 }: { groups: TimelineGroup[]; theme: (id: string) => Theme; limit?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? groups : groups.slice(0, limit);
  return (
    <div>
      <ol className="relative ml-3 border-l-[3px] border-ink pl-6">
        {shown.map((g, gi) => (
          <li key={g.key} className="relative pb-5 last:pb-1">
            <motion.span
              className="absolute -left-[39px] top-0 grid h-7 w-7 place-items-center rounded-full border-[3px] border-ink bg-yellow font-display text-[0.62rem] font-extrabold"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 500, damping: 18, delay: gi * 0.04 }}
              aria-hidden
            >
              {g.sets.length}
            </motion.span>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h3 className="font-display text-lg font-extrabold uppercase leading-none">{monthLabel(g.key, true)}</h3>
              <span className="mono-meta text-ink/60">{formatINR(g.total)}</span>
            </div>
            <ul className="space-y-1.5">
              {g.sets.map((s, i) => {
                const t = theme(s.themeId);
                return (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, x: 18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link href={`/set?id=${s.id}`} className="flex items-center gap-2.5 rounded-lg border-2 border-ink/0 px-2 py-1.5 hover:border-ink hover:bg-paper">
                      <span className="mono-meta w-11 shrink-0 text-[0.62rem] text-ink/55">{formatDate(s.purchaseDate).split(" ").slice(0, 2).join(" ")}</span>
                      <ThemeDot theme={t} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.name}</span>
                      <span className="shrink-0 font-display text-sm font-extrabold tabular-nums">{formatINR(s.purchasePrice, { fallback: "—" })}</span>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
      {groups.length > limit && (
        <button type="button" className="btn btn-sm mt-2" onClick={() => setAll((a) => !a)}>
          {all ? "Show less" : `Show all ${groups.length} months`}
        </button>
      )}
    </div>
  );
}

/* ───────────── Gain meter ───────────── */

/** Half-dial from −50% to +50%. The number and the word say it too, not just the needle. */
export function GainMeter({ pct }: { pct: number | null }) {
  const v = pct == null ? 0 : clamp(pct, -50, 50);
  const angle = (v / 50) * 90;
  const word = pct == null ? "No data" : pct > 0.05 ? "Gain" : pct < -0.05 ? "Loss" : "Flat";
  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg viewBox="0 0 220 128" className="w-full overflow-visible" aria-hidden>
        <path d="M18 112 A92 92 0 0 1 110 20" fill="none" stroke="#2A1F45" strokeWidth="26" transform="translate(4 4)" />
        <path d="M110 20 A92 92 0 0 1 202 112" fill="none" stroke="#2A1F45" strokeWidth="26" transform="translate(4 4)" />
        <path d="M18 112 A92 92 0 0 1 110 20" fill="none" stroke="#FF9FD0" strokeWidth="20" />
        <path d="M110 20 A92 92 0 0 1 202 112" fill="none" stroke="#7BF1C8" strokeWidth="20" />
        <path d="M18 112 A92 92 0 0 1 202 112" fill="none" stroke="#2A1F45" strokeWidth="3" />
        {[-90, -45, 0, 45, 90].map((a) => (
          <line key={a} x1="110" y1="30" x2="110" y2="42" stroke="#2A1F45" strokeWidth="3" transform={`rotate(${a} 110 112)`} />
        ))}
        <text x="22" y="128" fontSize="11" fontFamily="var(--font-jetbrains)" fontWeight="700" fill="#2A1F45">−50%</text>
        <text x="178" y="128" fontSize="11" fontFamily="var(--font-jetbrains)" fontWeight="700" fill="#2A1F45">+50%</text>
        <g transform="translate(110 112)">
          {/* invisible circle centres the group's box on the pivot, so rotation spins around it */}
          <motion.g initial={{ rotate: -90 }} animate={{ rotate: angle }} transition={{ type: "spring", stiffness: 80, damping: 9 }}>
            <circle r="80" fill="none" />
            <path d="M-4 0 L0 -78 L4 0 Z" fill="#2A1F45" />
          </motion.g>
        </g>
        <circle cx="110" cy="112" r="11" fill="#FFD447" stroke="#2A1F45" strokeWidth="3" />
      </svg>
      <p className="sr-only">
        {word}: {formatPct(pct, { signed: true })}
      </p>
      <p className={cn("mt-1 text-center font-display text-sm font-extrabold uppercase tracking-widest", word === "Gain" ? "gain" : word === "Loss" ? "loss" : "text-ink/60")} aria-hidden>
        {word}
      </p>
    </div>
  );
}

export function StatTile({
  label,
  children,
  sub,
  tone = "#FFFAF4",
  className,
  delay = 0,
  icon,
}: {
  label: string;
  children: ReactNode;
  sub?: ReactNode;
  tone?: string;
  className?: string;
  delay?: number;
  icon?: ReactNode;
}) {
  return (
    <motion.div
      {...dropLand(0.3 + delay, -70)}
      whileHover={{ y: -6, rotate: -1.2, transition: { type: "spring", stiffness: 420, damping: 11 } }}
      className={cn("panel relative mt-3 px-4 pb-3.5 pt-3", className)}
      style={{ background: tone, originY: 1 }}
    >
      <StudRow className="right-4" count={3} color={tone} />
      <div className="halftone-fade pointer-events-none absolute inset-0 rounded-[13px] opacity-60" aria-hidden />
      <div className="relative">
        <p className="mono-meta flex items-center gap-1.5 text-ink/70">
          {icon}
          {label}
        </p>
        <div className="mt-1.5 font-display text-[1.65rem] font-extrabold leading-none tracking-tight sm:text-3xl">{children}</div>
        {sub && <div className="mt-1.5 text-[0.8rem] font-medium leading-snug text-ink/70">{sub}</div>}
      </div>
    </motion.div>
  );
}

