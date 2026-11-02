"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConditionStamp, ThemeBadge } from "@/components/ui/ThemeBadge";
import { formatINR, formatNumber } from "@/lib/money";
import type { LegoSet, Theme } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { GainChip, SetCover, SoldStamp } from "./SetBits";

export function SetTable({ sets, theme }: { sets: LegoSet[]; theme: (id: string) => Theme }) {
  const router = useRouter();
  return (
    <div className="panel overflow-hidden">
      <div className="scroll-comic overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <caption className="sr-only">Sets in your vault</caption>
          <thead>
            <tr className="border-b-[3px] border-ink bg-yellow">
              {["Set", "Theme", "Pieces", "Paid", "Est. value", "Gain / loss", "Bought", "Condition"].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`mono-meta px-3 py-3 ${i >= 2 && i <= 5 ? "text-right" : ""} ${i === 6 ? "hidden lg:table-cell" : ""} ${i === 1 ? "hidden md:table-cell" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sets.map((s, i) => {
              const t = theme(s.themeId);
              return (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 20) * 0.02 }}
                  onClick={() => router.push(`/set?id=${s.id}`)}
                  className="cursor-pointer border-b-2 border-ink/15 transition-colors last:border-b-0 hover:bg-yellow/30"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <SetCover set={s} theme={t} size="thumb" className="h-11 w-11 shrink-0 rounded-lg border-2 border-ink" />
                      <div className="min-w-0">
                        <Link href={`/set?id=${s.id}`} className="line-clamp-1 font-display font-extrabold leading-tight hover:underline" onClick={(e) => e.stopPropagation()}>
                          {s.name}
                        </Link>
                        <p className="mono-meta text-ink/55">
                          {s.setNumber ? `#${s.setNumber}` : "—"} {s.status === "sold" && <SoldStamp className="ml-1 scale-75" />}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2.5 md:table-cell">
                    <ThemeBadge theme={t} size="sm" />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-sm tabular-nums">{formatNumber(s.pieces)}</td>
                  <td className="px-3 py-2.5 text-right font-display font-extrabold tabular-nums">{formatINR(s.purchasePrice)}</td>
                  <td className="px-3 py-2.5 text-right font-display font-bold tabular-nums">{formatINR(s.marketValue)}</td>
                  <td className="px-3 py-2.5 text-right">{s.status === "owned" ? <GainChip set={s} size="sm" /> : <span className="text-ink/40">—</span>}</td>
                  <td className="hidden px-3 py-2.5 font-mono text-xs lg:table-cell">{formatDate(s.purchaseDate)}</td>
                  <td className="px-3 py-2.5">
                    <ConditionStamp condition={s.condition} size="sm" />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
