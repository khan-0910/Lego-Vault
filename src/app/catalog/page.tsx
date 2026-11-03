"use client";

import { Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useMemo, useState } from "react";
import { CatalogCard, useOwnedKeys } from "@/components/catalog/CatalogCard";
import { PageHeader } from "@/components/ui/Panel";
import { BrickLoader, EmptyState, ErrorState } from "@/components/ui/States";
import { Segmented } from "@/components/ui/Fields";
import {
  type Catalog,
  type CatalogQuery,
  type CatalogSort,
  DEFAULT_FIG_QUERY,
  DEFAULT_QUERY,
  type FigCatalog,
  type FigQuery,
  searchCatalog,
  searchFigs,
  setKey,
  useCatalog,
  useFigs,
  useHighlights,
} from "@/lib/catalog";
import { formatNumber } from "@/lib/money";
import { popIn } from "@/lib/motion";
import { cn, formatDate, pluralise } from "@/lib/utils";

const PAGE = 48;
const SORTS: Array<{ value: CatalogSort; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "pieces", label: "Most pieces" },
  { value: "name", label: "A to Z" },
];

export default function CatalogPage() {
  return (
    <Suspense>
      <CatalogView />
    </Suspense>
  );
}

type Tab = "sets" | "minifigs";

function CatalogView() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "minifigs" ? "minifigs" : "sets");
  const sets = useCatalog(tab === "sets");
  const figs = useFigs(tab === "minifigs");
  const { data: highlights } = useHighlights();
  const thisYear = highlights?.thisYear ?? new Date().getFullYear();
  const current = tab === "sets" ? sets : figs;

  const switchTab = (t: Tab) => {
    setTab(t);
    // Keep the tab in the address so a refresh or shared link opens the same list.
    window.history.replaceState(null, "", t === "sets" ? window.location.pathname : `${window.location.pathname}?tab=minifigs`);
  };

  return (
    <div>
      <PageHeader
        key={tab}
        kicker="Catalog"
        title={tab === "sets" ? "Every set ever" : "Every minifig ever"}
        accent={tab === "sets" ? "#62D2FF" : "#A77BFF"}
        build="tower"
        fig={{ torso: tab === "sets" ? "#62D2FF" : "#A77BFF", legs: "#2A1F45", print: "star", mood: "wow", hat: "cap", hatColor: "#FF5C6C" }}
        subtitle={
          <>
            {tab === "sets"
              ? `Every LEGO set from 1949 to the ones that are not out yet${sets.data ? `, ${formatNumber(sets.data.sets.length)} in all` : ""}.`
              : `Every LEGO minifigure${figs.data ? `, ${formatNumber(figs.data.figs.length)} of them` : ""}, with the sets each one comes in.`}{" "}
            Refreshed every night, so new ones show up on their own.
            {highlights && <span className="mt-1 block text-sm text-ink/60">Last updated {formatDate(highlights.updatedAt)}. Data and pictures from Rebrickable.</span>}
          </>
        }
      />
      <Segmented<Tab>
        label="Catalog"
        className="mb-5"
        value={tab}
        onChange={switchTab}
        options={[
          { value: "sets", label: "Sets" },
          { value: "minifigs", label: "Minifigures" },
        ]}
      />
      {current.error ? (
        <div className="panel">
          <ErrorState title="The catalog did not load" body="Check your connection and try again. Running locally? Run npm run catalog once to download it." onRetry={current.retry} />
        </div>
      ) : tab === "sets" ? (
        sets.data ? <Browser catalog={sets.data} thisYear={thisYear} /> : <BrickLoader label="Unboxing every set ever made…" />
      ) : figs.data ? (
        <FigBrowser figs={figs.data} thisYear={thisYear} />
      ) : (
        <BrickLoader label="Lining up every minifigure…" />
      )}
    </div>
  );
}

const FIG_SORTS: Array<{ value: FigQuery["sort"]; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "A to Z" },
];

function FigBrowser({ figs, thisYear }: { figs: FigCatalog; thisYear: number }) {
  const params = useSearchParams();
  const [query, setQuery] = useState<FigQuery>(() => ({ ...DEFAULT_FIG_QUERY, q: params.get("q") ?? "" }));
  const [shown, setShown] = useState(PAGE);
  const q = useDeferredValue(query.q);
  const results = useMemo(() => searchFigs(figs.figs, { ...query, q }), [figs, query, q]);
  const { owned, wished } = useOwnedKeys();
  const update = (patch: Partial<FigQuery>) => {
    setQuery((s) => ({ ...s, ...patch }));
    setShown(PAGE);
  };
  const filtered = query.theme != null || query.year != null || query.q !== "";

  return (
    <div className="space-y-6">
      <Timeline years={figs.years} selected={query.year} thisYear={thisYear} noun="minifig" onPick={(year) => update({ year: query.year === year ? null : year })} />

      <section aria-label="Search minifigures" className="panel space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <span className="sr-only">Search by name, number, theme or set</span>
            <Search size={18} strokeWidth={2.8} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
            <input
              className="input pl-10 font-semibold"
              type="search"
              value={query.q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="Try Darth Vader, Spaceman or 10305"
              autoComplete="off"
            />
          </label>
          <label>
            <span className="sr-only">Theme</span>
            <select className="input font-semibold" value={query.theme ?? ""} onChange={(e) => update({ theme: e.target.value || null })}>
              <option value="">All themes ({figs.themes.length})</option>
              {figs.themes.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({formatNumber(t.count)})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort</span>
            <select className="input font-semibold" value={query.sort} onChange={(e) => update({ sort: e.target.value as FigQuery["sort"] })}>
              {FIG_SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {query.year != null && (
            <button type="button" className="chip" aria-pressed onClick={() => update({ year: null })}>
              {query.year} <X size={14} strokeWidth={3} aria-label="clear year" />
            </button>
          )}
          {filtered && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => update(DEFAULT_FIG_QUERY)}>
              Clear all
            </button>
          )}
          <p className="mono-meta ml-auto text-ink/60" aria-live="polite">
            {pluralise(results.length, "minifig")}
          </p>
        </div>
      </section>

      {results.length === 0 ? (
        <div className="panel">
          <EmptyState art="search" title="No minifigures match" body="Try fewer words or another theme. A set number finds the figures that come in it." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {results.slice(0, shown).map((f, i) => (
              <CatalogCard key={f.num} kind="minifig" set={f} index={i} owned={owned.has(setKey(f.num))} wished={wished.has(setKey(f.num))} thisYear={thisYear} />
            ))}
          </div>
          {shown < results.length && (
            <div className="flex justify-center">
              <button type="button" className="btn btn-yellow" onClick={() => setShown((n) => n + PAGE * 2)}>
                Show more ({formatNumber(results.length - shown)} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Browser({ catalog, thisYear }: { catalog: Catalog; thisYear: number }) {
  const params = useSearchParams();
  const [query, setQuery] = useState<CatalogQuery>(() => ({ ...DEFAULT_QUERY, q: params.get("q") ?? "", upcoming: params.get("upcoming") === "1" }));
  const [shown, setShown] = useState(PAGE);
  const q = useDeferredValue(query.q);
  const results = useMemo(() => searchCatalog(catalog.sets, { ...query, q }, thisYear), [catalog, query, q, thisYear]);
  const { owned, wished } = useOwnedKeys();
  const update = (patch: Partial<CatalogQuery>) => {
    setQuery((s) => ({ ...s, ...patch }));
    setShown(PAGE);
  };
  const filtered = query.theme != null || query.year != null || query.upcoming || query.extras || query.q !== "";

  return (
    <div className="space-y-6">
      <Timeline years={catalog.years} selected={query.year} thisYear={thisYear} onPick={(year) => update({ year: query.year === year ? null : year, upcoming: false })} />

      <section aria-label="Search the catalog" className="panel space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <span className="sr-only">Search by name, number or theme</span>
            <Search size={18} strokeWidth={2.8} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
            <input
              className="input pl-10 font-semibold"
              type="search"
              value={query.q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="Try 10305, Millennium Falcon or Hogwarts"
              autoComplete="off"
            />
          </label>
          <label>
            <span className="sr-only">Theme</span>
            <select className="input font-semibold" value={query.theme ?? ""} onChange={(e) => update({ theme: e.target.value || null })}>
              <option value="">All themes ({catalog.themes.length})</option>
              {catalog.themes.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({formatNumber(t.count)})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort</span>
            <select className="input font-semibold" value={query.sort} onChange={(e) => update({ sort: e.target.value as CatalogSort })}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="chip" aria-pressed={query.upcoming} onClick={() => update({ upcoming: !query.upcoming, year: null })}>
            Coming soon
          </button>
          <button type="button" className="chip" aria-pressed={query.extras} onClick={() => update({ extras: !query.extras })}>
            Include books and gear
          </button>
          {query.year != null && (
            <button type="button" className="chip" aria-pressed onClick={() => update({ year: null })}>
              {query.year} <X size={14} strokeWidth={3} aria-label="clear year" />
            </button>
          )}
          {filtered && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => update(DEFAULT_QUERY)}>
              Clear all
            </button>
          )}
          <p className="mono-meta ml-auto text-ink/60" aria-live="polite">
            {pluralise(results.length, "set")}
          </p>
        </div>
      </section>

      {results.length === 0 ? (
        <div className="panel">
          <EmptyState art="search" title="No sets match" body="Try fewer words, another theme, or switch on books and gear." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {results.slice(0, shown).map((s, i) => (
              <CatalogCard key={s.num} set={s} index={i} owned={owned.has(setKey(s.num))} wished={wished.has(setKey(s.num))} thisYear={thisYear} />
            ))}
          </div>
          {shown < results.length && (
            <div className="flex justify-center">
              <button type="button" className="btn btn-yellow" onClick={() => setShown((n) => n + PAGE * 2)}>
                Show more ({formatNumber(results.length - shown)} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** One bar per year, 1949 to next year. Tap a bar to see that year's sets. */
function Timeline({
  years,
  selected,
  thisYear,
  onPick,
  noun = "set",
}: {
  years: Catalog["years"];
  selected: number | null;
  thisYear: number;
  onPick: (year: number) => void;
  noun?: string;
}) {
  const max = Math.max(1, ...years.map((y) => y.count));
  return (
    <section aria-label="Sets per year" className="panel overflow-hidden p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-extrabold uppercase">Brick timeline</h2>
        <p className="mono-meta text-ink/60">{noun === "set" ? "Sets" : "New minifigs"} per year · tap a year</p>
      </div>
      <div className="flex h-28 items-end gap-px sm:gap-[2px]">
        {years.map((y, i) => {
          const on = selected === y.year;
          const future = y.year > thisYear;
          return (
            <motion.button
              key={y.year}
              type="button"
              onClick={() => onPick(y.year)}
              aria-pressed={on}
              aria-label={`${y.year}: ${pluralise(y.count, noun)}`}
              title={`${y.year}: ${pluralise(y.count, noun)}`}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={popIn(0.2 + i * 0.008, 0.5)}
              style={{ height: `${Math.max(4, (y.count / max) * 100)}%`, originY: 1 }}
              className={cn(
                "min-w-0 flex-1 rounded-t-[3px] border-[1.5px] border-ink transition-colors hover:bg-yellow",
                on ? "bg-red" : future ? "bg-pink [background-image:repeating-linear-gradient(-45deg,transparent_0_3px,rgb(42_31_69/.25)_3px_5px)]" : y.year % 10 === 0 ? "bg-blue" : "bg-sky",
              )}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[0.68rem] font-bold text-ink/60">
        <span>{years[0]?.year}</span>
        <span>{Math.round(((years[0]?.year ?? 1950) + (years.at(-1)?.year ?? 2026)) / 2)}</span>
        <span>{years.at(-1)?.year}</span>
      </div>
    </section>
  );
}
