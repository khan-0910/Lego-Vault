"use client";

import { Check, Gift, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { BrickSvg } from "@/components/lego/Brick";
import { StudRow } from "@/components/ui/Panel";
import { type HighlightSet, setImage, setKey, vaultThemeName } from "@/lib/catalog";
import { formatNumber } from "@/lib/money";
import { dropLand } from "@/lib/motion";
import { useVault } from "@/lib/store";
import { toast, useUI } from "@/lib/ui";
import type { ItemKind } from "@/lib/types";
import { cn, normalise } from "@/lib/utils";

const TONES = ["#FFD447", "#62D2FF", "#FF9FD0", "#7BF1C8", "#A77BFF", "#FF9548"];
const toneFor = (s: string) => TONES[[...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TONES.length];

/** Box art from Rebrickable, or a brick stand-in when there is no picture yet (common for upcoming sets). */
export function CatalogImage({ num, name, className }: { num: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const tone = toneFor(num);
  return (
    <div className={cn("relative grid place-items-center overflow-hidden", className)} style={{ background: failed ? tone : "#FFFAF4" }}>
      {failed ? (
        <BrickSvg size={84} cols={3} rows={2} color="#FFFAF4" className="animate-fig-bob" />
      ) : (
        // Third-party images: no Next image optimiser on a static export.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={setImage(num)} alt={name} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" />
      )}
    </div>
  );
}

/** Which catalog numbers are already in the vault or on the wishlist. */
export function useOwnedKeys() {
  const sets = useVault((s) => s.sets);
  const wishlist = useVault((s) => s.wishlist);
  return useMemo(
    () => ({
      owned: new Set(sets.filter((s) => s.status === "owned" && s.setNumber).map((s) => setKey(s.setNumber))),
      wished: new Set(wishlist.filter((w) => w.setNumber).map((w) => setKey(w.setNumber))),
    }),
    [sets, wishlist],
  );
}

export function useCatalogActions() {
  const openAdd = useUI((s) => s.openAdd);
  return {
    add: (s: HighlightSet, kind: ItemKind = "set") => openAdd({ kind, name: s.name, setNumber: s.num, themeName: vaultThemeName(s.theme), pieces: s.pieces || null }),
    wish: (s: HighlightSet, kind: ItemKind = "set") => {
      const store = useVault.getState();
      const themeName = normalise(vaultThemeName(s.theme));
      store.addWish({
        name: s.name,
        setNumber: s.num,
        themeId: store.themes.find((t) => normalise(t.name) === themeName)?.id ?? null,
        targetPrice: null,
        priority: 2,
        link: `https://rebrickable.com/${kind === "minifig" ? "minifigs" : "sets"}/${s.num}/`,
        notes: "",
      });
      toast({ kind: "success", title: "On the wishlist", body: `${s.name} is waiting for you. Add a target price any time.`, link: { label: "Open wishlist", href: "/wishlist" } });
    },
  };
}

export function CatalogCard({
  set,
  index = 0,
  owned,
  wished,
  thisYear,
  kind = "set",
}: {
  set: HighlightSet & { sets?: string[] };
  index?: number;
  owned: boolean;
  wished: boolean;
  thisYear: number;
  kind?: ItemKind;
}) {
  const { add, wish } = useCatalogActions();
  const land = dropLand(0.05 + (index % 6) * 0.06, -60);
  const upcoming = set.year > thisYear;
  const fig = kind === "minifig";
  return (
    <motion.article initial={land.initial} whileInView={land.animate} viewport={{ once: true, margin: "-20px" }} transition={land.transition} style={{ originY: 1 }} className="group relative mt-3">
      <StudRow className="left-5 z-10" count={3} color={toneFor(set.num)} />
      <div className="panel hover-bounce flex h-full flex-col overflow-hidden transition-[transform,box-shadow] hover:-translate-y-1.5 hover:-rotate-1 hover:shadow-comic-lg">
        <div className="relative aspect-[4/3] border-b-[3px] border-ink">
          <CatalogImage num={set.num} name={set.name} className="h-full w-full" />
          {set.year > 0 && (
            <span className={cn("absolute left-2 top-2 rounded-md border-2 border-ink px-1.5 py-0.5 font-mono text-[0.68rem] font-extrabold", upcoming ? "bg-red text-paper" : "bg-yellow")}>
              {upcoming ? `COMING ${set.year}` : set.year}
            </span>
          )}
          {(owned || wished) && (
            <span className={cn("absolute right-2 top-2 -rotate-6 rounded-md border-2 border-ink px-1.5 py-0.5 font-mono text-[0.66rem] font-extrabold shadow-comic-sm", owned ? "bg-mint" : "bg-pink")}>
              {owned ? "IN VAULT" : "WISHED"}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <p className="mono-meta text-[0.62rem] text-ink/60">
            {set.num} · {set.theme}
          </p>
          <h3 className="line-clamp-2 font-display text-[1.02rem] font-extrabold leading-tight">{set.name}</h3>
          <p className="text-sm text-ink/70">
            {fig ? (set.sets?.length ? `In ${set.sets.length === 1 ? "1 set" : `${set.sets.length} sets`}` : "Not in any set") : set.pieces ? `${formatNumber(set.pieces)} pieces` : "Pieces not announced"}
          </p>
          <div className="mt-auto flex gap-2 pt-2">
            <button type="button" className="btn btn-sm btn-red flex-1" onClick={() => add(set, kind)} aria-label={`Add ${set.name} to the vault`}>
              {owned ? <Check size={15} strokeWidth={3} /> : <Plus size={15} strokeWidth={3} />} {owned ? "Add again" : "Add"}
            </button>
            <button type="button" className="btn btn-sm btn-icon bg-pink" onClick={() => wish(set, kind)} disabled={wished} aria-label={wished ? `${set.name} is on your wishlist` : `Add ${set.name} to the wishlist`} title={wished ? "On your wishlist" : "Add to wishlist"}>
              <Gift size={16} strokeWidth={2.8} />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
