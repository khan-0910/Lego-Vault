"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Minibuild } from "@/components/lego/Minibuild";
import { Minifig } from "@/components/lego/Minifig";
import { popIn } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ChartArt, EmptyVaultArt, NoResultsArt, PhotoArt, WishArt } from "./Illustrations";

const ART = { vault: EmptyVaultArt, search: NoResultsArt, wish: WishArt, photos: PhotoArt, chart: ChartArt };

export function EmptyState({
  art,
  title,
  body,
  children,
  className,
  compact,
}: {
  art: keyof typeof ART;
  title: string;
  body?: ReactNode;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const Art = ART[art];
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={popIn(0, 0.6)}
      className={cn("flex flex-col items-center text-center", compact ? "gap-3 py-6" : "gap-4 py-10", className)}
    >
      <div className="relative">
        <motion.div initial={{ rotate: -10, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={popIn(0.1, 0.6)}>
          <Art className={compact ? "h-28 w-auto" : "h-40 w-auto sm:h-44"} />
        </motion.div>
        <motion.div
          className="absolute -bottom-1 -right-12 sm:-right-16"
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={popIn(0.5, 0.6)}
        >
          <Minifig mood="wow" torso="#4062FF" legs="#2A1F45" print="stripe" hat="cap" hatColor="#FFD447" className={compact ? "h-20 w-12" : "h-28 w-[4.5rem]"} />
        </motion.div>
      </div>
      <h3 className={cn("font-display tracking-tight", compact ? "text-xl" : "text-2xl sm:text-3xl")}>{title}</h3>
      {body && <p className="max-w-md text-[0.98rem] leading-relaxed text-ink/75">{body}</p>}
      {children && <div className="mt-1 flex flex-wrap justify-center gap-3">{children}</div>}
    </motion.div>
  );
}

/** A minifig supervising a tower that builds itself. Used while the vault loads from storage. */
export function BrickLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5" role="status" aria-live="polite">
      <div className="flex items-end gap-2">
        <Minibuild name="tower" className="h-32 w-auto" loop />
        <Minifig wave className="h-28 w-[4.5rem]" print="rupee" torso="#FF5C6C" />
      </div>
      <p className="mono-meta">{label}</p>
    </div>
  );
}

export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return (
    <div className="panel mx-auto max-w-lg bg-pink p-6 text-center">
      <p className="sfx mb-2 text-4xl">OOF!</p>
      <h2 className="font-display text-2xl font-extrabold">{title}</h2>
      <p className="mt-2 text-ink/80">{body}</p>
      {onRetry && (
        <button type="button" className="btn btn-yellow mt-4" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
