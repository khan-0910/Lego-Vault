"use client";

import { Check, Download, LayoutGrid, List, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useEffect, useMemo, useState } from "react";
import { FilterBar, Popover } from "@/components/sets/Filters";
import { SetCard } from "@/components/sets/SetCard";
import { SetTable } from "@/components/sets/SetTable";
import { PageHeader } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/States";
import { computeStats, DEFAULT_FILTERS, filterSets, SORT_LABELS, sortSets } from "@/lib/calc";
import { download, setsToCSV } from "@/lib/csv";
import { buildDemo } from "@/lib/demo";
import { useThemes } from "@/lib/hooks";
import { formatINR } from "@/lib/money";
import { useVault } from "@/lib/store";
import type { CardField, SetFilters, SortKey } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { cn, pluralise, todayISO } from "@/lib/utils";

const FIELD_LABELS: Record<CardField, string> = {
  pieces: "Piece count",
  price: "Price paid",
  value: "Estimated value",
  gain: "Gain / loss",
  condition: "Condition stamp",
  date: "Purchase date",
};

export default function CollectionPage() {
  return (
    <Suspense>
      <Collection />
    </Suspense>
  );
}

function Collection() {
  const params = useSearchParams();
  const sets = useVault((s) => s.sets);
  const prefs = useVault((s) => s.prefs);
  const setPrefs = useVault((s) => s.setPrefs);
  const loadDemo = useVault((s) => s.loadDemo);
  const openAdd = useUI((s) => s.openAdd);
  const { themes, byId, get } = useThemes();

  const themeParam = params.get("theme");
  const [filters, setFilters] = useState<SetFilters>(() => ({ ...DEFAULT_FILTERS, themeIds: themeParam ? [themeParam] : [], q: params.get("q") ?? "" }));
  useEffect(() => {
    if (themeParam) setFilters((f) => ({ ...f, themeIds: [themeParam] }));
  }, [themeParam]);

  const q = useDeferredValue(filters.q);
  const visible = useMemo(() => sortSets(filterSets(sets, { ...filters, q }, byId), prefs.sort), [sets, filters, q, byId, prefs.sort]);
  const stats = useMemo(() => computeStats(visible), [visible]);
  const topId = stats.topByValue?.id;

  if (sets.length === 0) {
    return (
      <>
        <PageHeader kicker="The vault" title="Your collection" accent="#FFD447"
        build="house"
        fig={{ torso: "#4062FF", legs: "#FFD447", print: "brick", hat: "hair", hatColor: "#8A5A2B" }} />
        <div className="panel">
          <EmptyState art="vault" title="The vault is empty" body="Add your first set. Name and theme are all you need; the rest can wait.">
            <button type="button" className="btn btn-red" onClick={() => openAdd()}>
              <Plus size={18} strokeWidth={3} /> Add a set
            </button>
            <button type="button" className="btn" onClick={() => loadDemo(buildDemo())}>
              Load demo data
            </button>
          </EmptyState>
        </div>
      </>
    );
  }

  return (
    <div>
      <PageHeader
        kicker="The vault"
        title="Your collection"
        accent="#FFD447"
        build="house"
        fig={{ torso: "#4062FF", legs: "#FFD447", print: "brick", hat: "hair", hatColor: "#8A5A2B" }}
        subtitle="Search by name or set number, filter by theme, condition, date or price, and sort however you like"
        actions={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => download(`brickvault-sets-${todayISO()}.csv`, setsToCSV(visible, byId), "text/csv;charset=utf-8")}
              disabled={!visible.length}
            >
              <Download size={18} strokeWidth={2.8} /> Export these
            </button>
            <button type="button" className="btn btn-red" onClick={() => openAdd()}>
              <Plus size={18} strokeWidth={3} /> Add set
            </button>
          </>
        }
      />

      <div className="panel z-30 mb-6 space-y-3 lg:sticky lg:top-[84px] px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search size={18} strokeWidth={2.8} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
            <label htmlFor="vault-search" className="sr-only">
              Search sets
            </label>
            <input
              id="vault-search"
              type="search"
              className="input pl-10 pr-10"
              placeholder="Search name, set number, seller or notes…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
            {filters.q && (
              <button type="button" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md hover:bg-ink/10" onClick={() => setFilters((f) => ({ ...f, q: "" }))} aria-label="Clear search">
                <X size={16} strokeWidth={3} />
              </button>
            )}
          </div>
          <label htmlFor="vault-sort" className="sr-only">
            Sort sets
          </label>
          <select id="vault-sort" className="input w-auto min-w-0 py-2 text-sm font-semibold" value={prefs.sort} onChange={(e) => setPrefs({ sort: e.target.value as SortKey })}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
          <div role="radiogroup" aria-label="View" className="flex rounded-xl border-[2.5px] border-ink bg-paper p-0.5">
            {(
              [
                ["grid", LayoutGrid, "Grid view"],
                ["list", List, "List view"],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={prefs.view === v}
                aria-label={label}
                onClick={() => setPrefs({ view: v })}
                className={cn("grid h-9 w-10 place-items-center rounded-lg transition-colors", prefs.view === v && "bg-ink text-paper")}
              >
                <Icon size={18} strokeWidth={2.6} />
              </button>
            ))}
          </div>
          {prefs.view === "grid" && (
            <Popover label="Card" align="right">
              <p className="mono-meta mb-2 flex items-center gap-1.5 text-ink/60">
                <SlidersHorizontal size={13} strokeWidth={3} aria-hidden /> Show on cards
              </p>
              <ul className="space-y-1" role="group" aria-label="Card details">
                {(Object.keys(FIELD_LABELS) as CardField[]).map((f) => {
                  const on = prefs.cardFields.includes(f);
                  return (
                    <li key={f}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => setPrefs({ cardFields: on ? prefs.cardFields.filter((x) => x !== f) : [...prefs.cardFields, f] })}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left font-semibold hover:bg-yellow/40"
                      >
                        <span className={cn("grid h-5 w-5 place-items-center rounded border-2 border-ink", on && "bg-ink text-paper")} aria-hidden>
                          {on && <Check size={12} strokeWidth={4} />}
                        </span>
                        {FIELD_LABELS[f]}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Popover>
          )}
        </div>
        <FilterBar filters={filters} onChange={setFilters} themes={themes} showPrice />
      </div>

      <p className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1" aria-live="polite">
        <span className="font-display text-xl font-extrabold">{pluralise(visible.length, "set")}</span>
        <span className="mono-meta text-ink/65">{formatINR(stats.totalSpent)} spent</span>
        <span className="mono-meta text-ink/65">{formatINR(stats.estValue)} est. value</span>
        <span className="mono-meta text-ink/65">{pluralise(stats.totalPieces, "piece")}</span>
      </p>

      {visible.length === 0 ? (
        <div className="panel">
          <EmptyState art="search" title="Nothing matches" body={filters.q ? `No set matches “${filters.q}” with these filters.` : "No sets fit these filters."}>
            <button type="button" className="btn btn-yellow" onClick={() => setFilters(DEFAULT_FILTERS)}>
              Clear search and filters
            </button>
          </EmptyState>
        </div>
      ) : prefs.view === "grid" ? (
        <LayoutGroup>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {visible.map((s, i) => (
                <SetCard key={s.id} set={s} theme={get(s.themeId)} fields={prefs.cardFields} index={i} badge={s.id === topId && visible.length > 2 ? "TOP VALUE!" : undefined} />
              ))}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      ) : (
        <SetTable sets={visible} theme={get} />
      )}
    </div>
  );
}
