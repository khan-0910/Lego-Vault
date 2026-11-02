"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { motion } from "motion/react";
import { themeSurface } from "@/components/ui/ThemeBadge";
import { ThemeIcon } from "@/components/ui/ThemeIcon";
import { gainOf } from "@/lib/calc";
import { usePhotoURL } from "@/lib/hooks";
import { formatINR, formatPct } from "@/lib/money";
import type { LegoSet, Paise, Theme } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Illustrated stand-in when a set has no photo: theme colours, print pattern, set number. */
export function SetArt({ set, theme, size = "card", className }: { set: LegoSet; theme: Theme; size?: "thumb" | "card" | "hero"; className?: string }) {
  const surface = themeSurface(theme, size === "hero" ? 1.4 : size === "thumb" ? 0.6 : 1);
  return (
    <div className={cn("relative grid h-full w-full place-items-center overflow-hidden", className)} style={surface} aria-hidden>
      <ThemeIcon
        icon={theme.icon}
        className={cn("absolute opacity-25", size === "thumb" ? "-right-1 -top-1 h-8 w-8" : size === "hero" ? "-right-8 -top-8 h-64 w-64" : "-right-4 -top-4 h-28 w-28")}
        strokeWidth={2}
      />
      {size !== "thumb" ? (
        <div className="relative flex flex-col items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-3 w-6 rounded-t-md border-[3px] border-b-0 border-ink" style={{ background: "currentColor", opacity: 0.85 }} />
            <span className="h-3 w-6 rounded-t-md border-[3px] border-b-0 border-ink" style={{ background: "currentColor", opacity: 0.85 }} />
          </div>
          <span
            className={cn(
              "-mt-2 rounded-lg border-[3px] border-ink bg-paper px-3 py-1 font-display font-extrabold tracking-tight text-ink shadow-comic-sm",
              size === "hero" ? "text-5xl" : "text-2xl",
            )}
          >
            {set.setNumber || "????"}
          </span>
        </div>
      ) : (
        <ThemeIcon icon={theme.icon} size={18} className="relative" />
      )}
    </div>
  );
}

export function SetCover({ set, theme, size = "card", className, imgClassName }: { set: LegoSet; theme: Theme; size?: "thumb" | "card" | "hero"; className?: string; imgClassName?: string }) {
  const url = usePhotoURL(set.photoIds[0]);
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob: URLs from IndexedDB
        <motion.img
          src={url}
          alt={`Photo of ${set.name}`}
          className={cn("h-full w-full object-cover", imgClassName)}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        />
      ) : (
        <SetArt set={set} theme={theme} size={size} />
      )}
    </div>
  );
}

/** Gain/loss read-out. Arrow + sign + words, so it never relies on colour alone. */
export function GainChip({ set, className, size = "md" }: { set: LegoSet; className?: string; size?: "sm" | "md" }) {
  const g = gainOf(set);
  if (!g) return null;
  return <Delta delta={g.delta} pct={g.pct} className={className} size={size} />;
}

export function Delta({ delta, pct, className, size = "md", showLabel = false }: { delta: Paise; pct: number | null; className?: string; size?: "sm" | "md"; showLabel?: boolean }) {
  const up = delta > 0;
  const flat = delta === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border-2 border-ink font-bold tabular-nums leading-none",
        size === "sm" ? "px-1.5 py-0.5 text-[0.7rem]" : "px-2 py-1 text-xs",
        flat ? "bg-paper" : up ? "bg-mint" : "bg-pink",
        className,
      )}
      title={flat ? "No change" : up ? "Estimated gain" : "Estimated loss"}
    >
      <Icon size={size === "sm" ? 12 : 14} strokeWidth={3} aria-hidden />
      {showLabel && <span className="sr-only">{flat ? "No change" : up ? "Gain of" : "Loss of"}</span>}
      {formatINR(delta, { signed: true })}
      {pct != null && <span className="opacity-70">({formatPct(pct, { signed: true })})</span>}
    </span>
  );
}

export function SoldStamp({ className }: { className?: string }) {
  return (
    <span className={cn("inline-block rotate-[-8deg] rounded-md border-[3px] border-red-deep bg-paper/90 px-2 py-0.5 font-display text-sm font-extrabold uppercase tracking-widest text-red-deep", className)}>
      Sold
    </span>
  );
}
