"use client";

import { BadgeIndianRupee, CalendarRange, ChartPie, Crown, ScrollText, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { GainMeter, Leaderboard, PurchaseTimeline, SetMiniList, StatTile, ThemeBreakdown } from "@/components/charts/Boards";
import { MonthlyBars } from "@/components/charts/MonthlyBars";
import { type DonutSlice, ThemeDonut } from "@/components/charts/ThemeDonut";
import { FilterBar } from "@/components/sets/Filters";
import { Delta } from "@/components/sets/SetBits";
import { CountUp } from "@/components/ui/CountUp";
import { Segmented } from "@/components/ui/Fields";
import { Starburst } from "@/components/ui/Decor";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/States";
import {
  type BoardMode,
  computeRealised,
  computeStats,
  itemsLabel,
  DEFAULT_FILTERS,
  filterSets,
  leaderboard,
  type MonthRange,
  monthlySeries,
  purchaseTimeline,
} from "@/lib/calc";
import { useThemes } from "@/lib/hooks";
import { formatINR, formatNumber, formatPct } from "@/lib/money";
import { useVault } from "@/lib/store";
import type { SetFilters } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { monthLabel, pluralise } from "@/lib/utils";

export default function ValuePage() {
  return (
    <Suspense>
      <ValueTracker />
    </Suspense>
  );
}

function ValueTracker() {
  const params = useSearchParams();
  const sets = useVault((s) => s.sets);
  const openAdd = useUI((s) => s.openAdd);
  const pulse = useUI((s) => s.pulse);
  const { themes, byId, get } = useThemes();

  const [filters, setFilters] = useState<SetFilters>(() => {
    const t = params.get("theme");
    return { ...DEFAULT_FILTERS, themeIds: t ? [t] : [] };
  });
  const scoped = useMemo(() => filterSets(sets, filters, byId), [sets, filters, byId]);
  const stats = useMemo(() => computeStats(scoped), [scoped]);
  const sold = useMemo(() => computeRealised(filterSets(sets, { ...filters, status: "sold" }, byId)), [sets, filters, byId]);

  const [range, setRange] = useState<MonthRange>("12m");
  const [mode, setMode] = useState<"monthly" | "cumulative">("monthly");
  const months = useMemo(() => monthlySeries(scoped, range), [scoped, range]);
  const [month, setMonth] = useState<string | null>(null);
  const monthSets = months.find((m) => m.key === month)?.sets ?? [];

  const [focusTheme, setFocusTheme] = useState<string | null>(null);
  const [openTheme, setOpenTheme] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardMode>("paid");
  const rows = useMemo(() => leaderboard(scoped, board), [scoped, board]);
  const timeline = useMemo(() => purchaseTimeline(scoped), [scoped]);
  const [burst, setBurst] = useState(0);

  const slices: DonutSlice[] = useMemo(() => {
    const spent = stats.byTheme.filter((t) => t.spent > 0);
    const top = spent.slice(0, 7).map((t) => ({ id: t.themeId, label: get(t.themeId).name, value: t.spent, color: get(t.themeId).color }));
    const rest = spent.slice(7).reduce((s, t) => s + t.spent, 0);
    return rest > 0 ? [...top, { id: "__other", label: "Other themes", value: rest, color: "#EFE4F5" }] : top;
  }, [stats.byTheme, get]);

  const undated = scoped.filter((s) => s.purchasePrice != null && !s.purchaseDate).length;
  const topTheme = stats.topTheme ? get(stats.topTheme.themeId) : null;

  if (sets.length === 0) {
    return (
      <>
        <PageHeader kicker="Value tracker" title="The money panel" accent="#7BF1C8"
        build="tower"
        fig={{ torso: "#FFD447", legs: "#2A1F45", print: "rupee", hat: "cap", hatColor: "#FF5C6C" }} />
        <div className="panel">
          <EmptyState art="chart" title="No numbers yet" body="Add a set with a purchase price and this panel lights up with totals, theme spending and a monthly chart.">
            <button type="button" className="btn btn-red" onClick={() => openAdd()}>
              Add a set
            </button>
          </EmptyState>
        </div>
      </>
    );
  }

  return (
    <div>
      <PageHeader
        kicker="Value tracker"
        title="The money panel"
        accent="#7BF1C8"
        build="tower"
        fig={{ torso: "#FFD447", legs: "#2A1F45", print: "rupee", hat: "cap", hatColor: "#FF5C6C" }}
        subtitle={
          <>
            <strong>Spent</strong> is what you paid. <strong>Estimated value</strong> is what you think your sets are worth now. They are kept separate everywhere.
          </>
        }
      />

      <div className="panel z-30 mb-8 px-3 lg:sticky lg:top-[84px] py-3 sm:px-4">
        <FilterBar filters={filters} onChange={setFilters} themes={themes} />
        <p className="mono-meta mt-2 text-ink/60" aria-live="polite">
          Showing {pluralise(scoped.length, "set")} of {formatNumber(sets.length)}
        </p>
      </div>

      {scoped.length === 0 ? (
        <div className="panel">
          <EmptyState art="search" title="Nothing matches" body="No sets fit these filters. Loosen them to see your numbers again.">
            <button type="button" className="btn btn-yellow" onClick={() => setFilters(DEFAULT_FILTERS)}>
              Clear filters
            </button>
          </EmptyState>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Big spend counter */}
          <motion.section
            aria-labelledby="spent-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="panel relative overflow-hidden bg-yellow p-5 sm:p-7 lg:col-span-7"
          >
            <div className="speedlines pointer-events-none absolute -inset-[50%]" aria-hidden />
            <div className="relative">
              <h2 id="spent-title" className="label-tab bg-paper">
                <BadgeIndianRupee size={14} strokeWidth={3} aria-hidden /> Total spent
              </h2>
              <br />
              <div className="relative mt-4 inline-block">
                <CountUp
                  value={stats.totalSpent}
                  money
                  memoryKey={`value-spent-${filters.status}`}
                  onRise={() => setBurst((b) => b + 1)}
                  className="misprint block font-display text-[2.7rem] font-extrabold leading-none tracking-tight sm:text-7xl xl:text-[5.2rem]"
                />
                <AnimatePresence>
                  {burst > 0 && (
                    <motion.span
                      key={burst}
                      className="pointer-events-none absolute -right-8 -top-12"
                      initial={{ scale: 0, rotate: -40 }}
                      animate={{ scale: [0, 1.25, 1, 1, 0], rotate: [-40, 0, 0, 0, 10] }}
                      transition={{ duration: 2.6, times: [0, 0.15, 0.25, 0.85, 1] }}
                      aria-hidden
                    >
                      <Starburst className="h-24 w-24" fill="#FF5C6C">
                        <span className="sfx block -rotate-12 text-lg">KA-CHING!</span>
                      </Starburst>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <p className="mt-2 font-semibold">
                {stats.pricedCount < stats.count ? `${pluralise(stats.pricedCount, "set")} with a price. ${pluralise(stats.count - stats.pricedCount, "set")} without one ${stats.count - stats.pricedCount === 1 ? "adds" : "add"} ₹0.` : `Every one of ${itemsLabel(stats.count, stats.figCount)} priced.`}
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  stats.figCount ? ["Sets · figs", `${formatNumber(stats.setCount)} · ${formatNumber(stats.figCount)}`] : ["Sets", formatNumber(stats.count)],
                  ["Pieces", formatNumber(stats.totalPieces)],
                  ["Avg / set", formatINR(stats.avgPrice)],
                  ["Per piece", formatINR(stats.pricePerPiece)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border-[2.5px] border-ink bg-paper px-3 py-2">
                    <dt className="mono-meta text-[0.62rem] text-ink/60">{k}</dt>
                    <dd className="font-display text-xl font-extrabold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </motion.section>

          {/* Value vs spend */}
          <motion.section
            aria-labelledby="worth-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.08 }}
            className="panel bg-paper p-5 lg:col-span-5"
          >
            <h2 id="worth-title" className="label-tab bg-mint">
              Estimated value
            </h2>
            <CountUp value={stats.estValue} money memoryKey={`value-est-${filters.status}`} className="mt-4 block font-display text-4xl font-extrabold tracking-tight sm:text-5xl" />
            <p className="mt-1 text-sm text-ink/70">Sum of your estimates on {pluralise(stats.valuedCount, "set")}.</p>
            <div className="mt-4">
              <GainMeter pct={stats.returnPct} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border-[2.5px] border-ink bg-cream px-3 py-2.5">
              <div>
                <p className="mono-meta text-[0.62rem] text-ink/60">Unrealised gain / loss</p>
                {stats.unrealised != null ? <Delta delta={stats.unrealised} pct={stats.returnPct} showLabel /> : <p className="font-semibold">Add estimates to see this</p>}
              </div>
              <div className="text-right">
                <p className="mono-meta text-[0.62rem] text-ink/60">Return</p>
                <p className="font-display text-xl font-extrabold">{formatPct(stats.returnPct, { signed: true })}</p>
              </div>
            </div>
            <p className="mt-3 text-[0.75rem] leading-snug text-ink/60">
              Based on {pluralise(stats.plCount, "set")} that have both a price and an estimate: {formatINR(stats.plBasis)} paid vs {formatINR(stats.plValue)} estimated. Estimates are user-entered, not verified market prices.
            </p>
          </motion.section>

          {/* Records */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-12">
            <StatTile label="Highest-priced set" tone="#FFFAF4" icon={<Trophy size={13} strokeWidth={3} aria-hidden />} sub={stats.topByPrice?.name ?? "No prices yet"}>
              {formatINR(stats.topByPrice?.purchasePrice ?? null)}
            </StatTile>
            <StatTile label="Most expensive theme" tone="#FFFAF4" delay={0.05} icon={<Crown size={13} strokeWidth={3} aria-hidden />} sub={topTheme ? `${topTheme.name} · ${formatPct((stats.topTheme?.share ?? 0) * 100)} of spend` : "No prices yet"}>
              {formatINR(stats.topTheme?.spent ?? null)}
            </StatTile>
          </div>

          {/* Spending by theme */}
          <Panel label="Spending by theme" labelTone="#FF9FD0" labelIcon={<ChartPie size={14} strokeWidth={3} aria-hidden />} className="lg:col-span-12">
            {slices.length === 0 ? (
              <EmptyState compact art="chart" title="No prices in this view" body="Add purchase prices to see how your spending splits across themes." />
            ) : (
              <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,300px)_1fr]">
                <div className="md:sticky md:top-48">
                  <ThemeDonut
                    slices={slices}
                    focus={focusTheme}
                    onFocus={setFocusTheme}
                    selected={openTheme}
                    onSelect={(id) => setOpenTheme(id === "__other" ? null : id)}
                  />
                  <p className="mt-3 text-center text-sm text-ink/65">Hover a slice to compare. Click it, or a row, to see the sets and what you paid.</p>
                </div>
                <ThemeBreakdown slices={stats.byTheme} theme={get} focus={focusTheme} onFocus={setFocusTheme} selected={openTheme} onSelect={setOpenTheme} pulse={pulse} />
              </div>
            )}
          </Panel>

          {/* Monthly spending */}
          <Panel
            label="Monthly spending"
            labelTone="#62D2FF"
            labelIcon={<CalendarRange size={14} strokeWidth={3} aria-hidden />}
            className="lg:col-span-12"
            action={
              <div className="flex flex-wrap justify-end gap-2">
                <Segmented
                  label="Chart mode"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "monthly", label: "Per month" },
                    { value: "cumulative", label: "Running total" },
                  ]}
                />
                <Segmented
                  label="Range"
                  value={range}
                  onChange={(r) => {
                    setRange(r);
                    setMonth(null);
                  }}
                  options={[
                    { value: "12m", label: "12M" },
                    { value: "24m", label: "24M" },
                    { value: "all", label: "All" },
                  ]}
                />
              </div>
            }
          >
            <MonthlyBars buckets={months} mode={mode} selected={month} onSelect={setMonth} />
            <AnimatePresence mode="wait" initial={false}>
              {month ? (
                <motion.div key={month} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 rounded-xl border-[2.5px] border-ink bg-cream">
                  <div className="flex items-center justify-between gap-3 px-3 pt-3">
                    <h3 className="font-display text-lg font-extrabold uppercase">{monthLabel(month, true)}</h3>
                    <span className="font-display font-extrabold">{formatINR(monthSets.reduce((s, x) => s + (x.purchasePrice ?? 0), 0))}</span>
                  </div>
                  {monthSets.length ? <SetMiniList sets={monthSets} theme={get} className="mt-2" /> : <p className="px-3 pb-3 pt-1 text-sm text-ink/70">Nothing bought this month</p>}
                </motion.div>
              ) : (
                <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 text-sm text-ink/65">
                  Click a month to list the sets you bought in it.
                  {undated > 0 && ` ${pluralise(undated, "priced set")} without a purchase date ${undated === 1 ? "is" : "are"} not on this chart.`}
                </motion.p>
              )}
            </AnimatePresence>
          </Panel>

          {/* Leaderboard */}
          <Panel
            label="Leaderboard"
            labelTone="#FFD447"
            labelIcon={<Trophy size={14} strokeWidth={3} aria-hidden />}
            className="lg:col-span-6"
            action={
              <Segmented
                label="Rank sets by"
                value={board}
                onChange={setBoard}
                options={[
                  { value: "paid", label: "Paid" },
                  { value: "value", label: "Worth" },
                  { value: "gain", label: "Gain" },
                ]}
              />
            }
          >
            {rows.length ? (
              <Leaderboard rows={rows} mode={board} theme={get} />
            ) : (
              <EmptyState compact art="chart" title={board === "paid" ? "No prices yet" : "No estimates yet"} body={board === "gain" ? "Gain needs both a price and an estimate on a set." : "Add amounts to rank your sets."} />
            )}
          </Panel>

          {/* Timeline */}
          <Panel label="Purchase history" labelTone="#7BF1C8" labelIcon={<ScrollText size={14} strokeWidth={3} aria-hidden />} className="lg:col-span-6">
            {timeline.length ? <PurchaseTimeline groups={timeline} theme={get} /> : <EmptyState compact art="chart" title="No dated purchases" body="Add purchase dates to build your timeline." />}
          </Panel>

          {/* Realised */}
          {sold.count > 0 && (
            <Panel label="Sold sets" labelTone="#FF5C6C" className="lg:col-span-12">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="mono-meta text-ink/60">Sold</p>
                  <p className="font-display text-3xl font-extrabold">{pluralise(sold.count, "set")}</p>
                </div>
                <div>
                  <p className="mono-meta text-ink/60">Sale proceeds</p>
                  <p className="font-display text-3xl font-extrabold">{formatINR(sold.proceeds)}</p>
                </div>
                <div>
                  <p className="mono-meta text-ink/60">Realised gain / loss</p>
                  {sold.realised != null ? (
                    <p className={`font-display text-3xl font-extrabold ${sold.realised >= 0 ? "gain" : "loss"}`}>{formatINR(sold.realised, { signed: true })}</p>
                  ) : (
                    <p className="font-semibold">Needs sale and purchase prices</p>
                  )}
                </div>
              </div>
              {filters.status === "owned" && <p className="mt-3 text-sm text-ink/65">Sold sets are not in the totals above. Switch the filter to “Sold” or “All” to include them.</p>}
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
