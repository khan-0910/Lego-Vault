"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import type { PointerEvent, Ref } from "react";
import { ConditionStamp, ThemeBadge, ThemeDot } from "@/components/ui/ThemeBadge";
import { formatINR, formatNumber } from "@/lib/money";
import type { CardField, LegoSet, Theme } from "@/lib/types";
import { StudRow } from "@/components/ui/Panel";
import { dropLand } from "@/lib/motion";
import { cn, formatDate } from "@/lib/utils";
import { GainChip, SetCover, SoldStamp } from "./SetBits";

export function SetCard({
  set,
  theme,
  fields,
  index = 0,
  badge,
  ref,
}: {
  set: LegoSet;
  theme: Theme;
  fields: CardField[];
  index?: number;
  badge?: string;
  ref?: Ref<HTMLElement>;
}) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [5, -5]), { stiffness: 300, damping: 20 });
  const ry = useSpring(useTransform(px, [0, 1], [-6, 6]), { stiffness: 300, damping: 20 });
  const land = dropLand(0.1 + (index % 4) * 0.1, -80);
  const has = (f: CardField) => fields.includes(f);

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.article
      ref={ref}
      layout={!reduce}
      initial={land.initial}
      whileInView={land.animate}
      viewport={{ once: true, margin: "-30px" }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ ...land.transition, layout: { type: "spring", stiffness: 380, damping: 30 } }}
      style={{ perspective: 900, originY: 1 }}
      className="group"
    >
      <motion.div className="relative mt-3" style={{ rotateX: rx, rotateY: ry }} onPointerMove={onMove} onPointerLeave={onLeave}>
        <StudRow className="left-6 z-10 hover-bounce transition-transform group-hover:-translate-y-2" count={4} color={theme.color} />
        <Link
          href={`/set?id=${set.id}`}
          className={cn(
            "panel block overflow-hidden hover-bounce transition-[transform,box-shadow] hover:-translate-y-2 hover:-rotate-1 hover:shadow-comic-lg focus-visible:-translate-y-1.5",
            set.status === "sold" && "opacity-80 saturate-50",
          )}
        >
          <div className="relative aspect-[4/3] border-b-[3px] border-ink">
            <SetCover set={set} theme={theme} className="h-full w-full" imgClassName="transition-transform duration-500 group-hover:scale-105" />
            <ThemeBadge theme={theme} size="sm" className="absolute left-2.5 top-2.5 max-w-[65%] shadow-comic-sm" />
            {has("condition") && (
              <ConditionStamp condition={set.condition} size="sm" className="absolute right-2.5 top-2.5 rotate-3 shadow-comic-sm transition-transform duration-200 group-hover:rotate-[-4deg] group-hover:scale-110" />
            )}
            {set.status === "sold" && <SoldStamp className="absolute bottom-3 left-1/2 -translate-x-1/2 text-lg" />}
            {badge && (
              <span className="sfx absolute -bottom-3 right-3 rotate-[-6deg] text-xl" aria-label={badge}>
                {badge}
              </span>
            )}
          </div>
          <div className="space-y-2.5 p-3.5">
            <div>
              <p className="mono-meta flex items-center gap-1.5 text-ink/60">
                <ThemeDot theme={theme} className="h-2.5 w-2.5" />
                {set.setNumber ? `#${set.setNumber}` : "No set number"}
                {has("pieces") && set.pieces != null && <span>· {formatNumber(set.pieces)} pcs</span>}
              </p>
              <h3 className="mt-1 line-clamp-2 font-heading text-[1.12rem] font-extrabold leading-[1.15] tracking-tight">{set.name}</h3>
            </div>
            {(has("price") || has("value")) && (
              <dl className="grid grid-cols-2 gap-2">
                {has("price") && (
                  <div className="rounded-lg border-2 border-ink bg-cream px-2 py-1.5">
                    <dt className="mono-meta text-[0.62rem] text-ink/60">Paid</dt>
                    <dd className="font-display text-[1.02rem] font-extrabold tabular-nums">{formatINR(set.purchasePrice, { fallback: "Not set" })}</dd>
                  </div>
                )}
                {has("value") && (
                  <div className="rounded-lg border-2 border-ink bg-cream px-2 py-1.5">
                    <dt className="mono-meta text-[0.62rem] text-ink/60">{set.status === "sold" ? "Sold for" : "Est. value"}</dt>
                    <dd className="font-display text-[1.02rem] font-extrabold tabular-nums">
                      {formatINR(set.status === "sold" ? set.salePrice : set.marketValue, { fallback: "No estimate" })}
                    </dd>
                  </div>
                )}
              </dl>
            )}
            {(has("gain") || has("date")) && (
              <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
                {has("gain") && set.status === "owned" ? <GainChip set={set} size="sm" /> : <span />}
                {has("date") && <span className="mono-meta text-ink/55">{formatDate(set.purchaseDate, "Undated")}</span>}
              </div>
            )}
          </div>
        </Link>
      </motion.div>
    </motion.article>
  );
}
